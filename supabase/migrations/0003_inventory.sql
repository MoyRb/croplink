-- 0003_inventory.sql
-- Inventory schema with org-scoped RLS and stock sync triggers

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inventory_movement_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.inventory_movement_type AS ENUM ('in', 'out', 'adjust', 'return', 'waste');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inventory_ref_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.inventory_ref_type AS ENUM ('requisition', 'execution', 'adjustment', 'manual');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  sku text NOT NULL,
  name text NOT NULL,
  category text,
  unit text NOT NULL,
  stock_current numeric NOT NULL DEFAULT 0,
  stock_minimum numeric NOT NULL DEFAULT 0,
  location text,
  suggested_supplier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_items_org_sku_key'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT inventory_items_org_sku_key UNIQUE (organization_id, sku);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.inventory_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  lot_code text NOT NULL,
  expiration_date date,
  current_qty numeric NOT NULL DEFAULT 0
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_lots_org_item_lot_key'
  ) THEN
    ALTER TABLE public.inventory_lots
      ADD CONSTRAINT inventory_lots_org_item_lot_key
      UNIQUE (organization_id, inventory_item_id, lot_code);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  inventory_lot_id uuid REFERENCES public.inventory_lots(id) ON DELETE RESTRICT,
  movement_type public.inventory_movement_type NOT NULL,
  qty numeric NOT NULL,
  unit text NOT NULL,
  movement_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  ref_type public.inventory_ref_type,
  ref_id uuid,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.inventory_signed_qty(
  p_movement_type public.inventory_movement_type,
  p_qty numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_movement_type
    WHEN 'in'::public.inventory_movement_type THEN p_qty
    WHEN 'return'::public.inventory_movement_type THEN p_qty
    WHEN 'out'::public.inventory_movement_type THEN -p_qty
    WHEN 'waste'::public.inventory_movement_type THEN -p_qty
    WHEN 'adjust'::public.inventory_movement_type THEN p_qty
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_signed_qty numeric;
BEGIN
  v_signed_qty := public.inventory_signed_qty(NEW.movement_type, NEW.qty);

  UPDATE public.inventory_items
  SET stock_current = COALESCE(stock_current, 0) + v_signed_qty,
      updated_at = now()
  WHERE id = NEW.inventory_item_id
    AND organization_id = NEW.organization_id;

  IF NEW.inventory_lot_id IS NOT NULL THEN
    UPDATE public.inventory_lots
    SET current_qty = COALESCE(current_qty, 0) + v_signed_qty
    WHERE id = NEW.inventory_lot_id
      AND organization_id = NEW.organization_id
      AND inventory_item_id = NEW.inventory_item_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_inventory_items ON public.inventory_items;
CREATE TRIGGER trg_set_updated_at_inventory_items
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_inventory_movements ON public.inventory_movements;
CREATE TRIGGER trg_set_updated_at_inventory_movements
BEFORE UPDATE ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_apply_inventory_movement ON public.inventory_movements;
CREATE TRIGGER trg_apply_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.apply_inventory_movement();

CREATE INDEX IF NOT EXISTS idx_inventory_items_organization_id
  ON public.inventory_items (organization_id);

CREATE INDEX IF NOT EXISTS idx_inventory_lots_organization_id
  ON public.inventory_lots (organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_inventory_item_id
  ON public.inventory_lots (inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_organization_id
  ON public.inventory_movements (organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_item_id
  ON public.inventory_movements (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_lot_id
  ON public.inventory_movements (inventory_lot_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref_type_ref_id
  ON public.inventory_movements (ref_type, ref_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'inventory_items',
      'inventory_lots',
      'inventory_movements'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_select_org'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (organization_id = public.current_org_id())',
        t || '_select_org', t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_insert_org'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id())',
        t || '_insert_org', t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_update_org'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id())',
        t || '_update_org', t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_delete_org'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (organization_id = public.current_org_id())',
        t || '_delete_org', t
      );
    END IF;
  END LOOP;
END
$$;
