-- 0011_assets.sql
-- Assets + maintenance records with org-scoped RLS

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  operation_id uuid REFERENCES public.operations(id) ON DELETE SET NULL,
  ranch_id uuid REFERENCES public.ranches(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL,
  category text NOT NULL DEFAULT 'Sin categoría',
  code text,
  status text NOT NULL DEFAULT 'Activo',
  purchase_date date,
  purchase_cost numeric(12,2),
  brand text,
  model text,
  serial_vin text,
  plate text,
  location text,
  location_detail text,
  responsible text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_purchase_cost_check CHECK (purchase_cost IS NULL OR purchase_cost >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_org_code_unique
  ON public.assets (organization_id, code)
  WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON public.assets (organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_operation_id ON public.assets (operation_id);
CREATE INDEX IF NOT EXISTS idx_assets_ranch_id ON public.assets (ranch_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets (status);

CREATE TABLE IF NOT EXISTS public.asset_maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  maintenance_date date NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  provider text,
  status text NOT NULL DEFAULT 'Programado',
  odometer numeric(12,2),
  next_service_date date,
  attachment_name text,
  attachment_mime_type text,
  attachment_size_bytes bigint,
  attachment_url text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_maintenance_cost_check CHECK (cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_organization_id
  ON public.asset_maintenance_records (organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset_id
  ON public.asset_maintenance_records (asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_date
  ON public.asset_maintenance_records (maintenance_date DESC);

DROP TRIGGER IF EXISTS trg_set_updated_at_assets ON public.assets;
CREATE TRIGGER trg_set_updated_at_assets
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_asset_maintenance_records ON public.asset_maintenance_records;
CREATE TRIGGER trg_set_updated_at_asset_maintenance_records
BEFORE UPDATE ON public.asset_maintenance_records
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance_records ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'assets',
      'asset_maintenance_records'
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
