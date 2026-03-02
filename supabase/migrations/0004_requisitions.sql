-- 0004_requisitions.sql
-- Requisitions and application executions schema with org-scoped RLS

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'requisition_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.requisition_status AS ENUM (
      'pending',
      'in_review',
      'in_comparative',
      'approved',
      'rejected',
      'completed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'requisition_item_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.requisition_item_type AS ENUM ('agroquimico', 'insumo_general', 'benefico');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'application_mode'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.application_mode AS ENUM ('foliar_drench', 'via_riego');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'application_execution_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.application_execution_status AS ENUM ('draft', 'posted_out', 'closed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  folio text,
  status public.requisition_status NOT NULL DEFAULT 'pending',
  cost_center text,
  priority text,
  requested_date date,
  notes text,
  operation_id uuid REFERENCES public.operations(id) ON DELETE RESTRICT,
  ranch_id uuid REFERENCES public.ranches(id) ON DELETE RESTRICT,
  ranch_crop_season_id uuid REFERENCES public.ranch_crop_seasons(id) ON DELETE RESTRICT,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE RESTRICT,
  tunnel_id uuid REFERENCES public.tunnels(id) ON DELETE RESTRICT,
  valve_id uuid REFERENCES public.valves(id) ON DELETE RESTRICT,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.requisition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  requisition_id uuid NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  item_type public.requisition_item_type NOT NULL,
  product_id uuid,
  commercial_name text,
  active_ingredient text,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.requisition_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  requisition_id uuid NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.application_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  requisition_id uuid REFERENCES public.requisitions(id) ON DELETE SET NULL,
  mode public.application_mode NOT NULL,
  status public.application_execution_status NOT NULL DEFAULT 'draft',
  header jsonb NOT NULL DEFAULT '{}'::jsonb,
  posted_out_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.application_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  execution_id uuid NOT NULL REFERENCES public.application_executions(id) ON DELETE CASCADE,
  requisition_item_id uuid REFERENCES public.requisition_items(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit text,
  dosis_por_tanque numeric,
  gasto_lt_ha numeric,
  dosis_por_ha numeric,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.application_irrigation_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  execution_id uuid NOT NULL REFERENCES public.application_executions(id) ON DELETE CASCADE,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  valve_id uuid REFERENCES public.valves(id) ON DELETE SET NULL,
  surface numeric,
  sort_order integer
);

DROP TRIGGER IF EXISTS trg_set_updated_at_requisitions ON public.requisitions;
CREATE TRIGGER trg_set_updated_at_requisitions
BEFORE UPDATE ON public.requisitions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_requisition_items ON public.requisition_items;
CREATE TRIGGER trg_set_updated_at_requisition_items
BEFORE UPDATE ON public.requisition_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_application_executions ON public.application_executions;
CREATE TRIGGER trg_set_updated_at_application_executions
BEFORE UPDATE ON public.application_executions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_requisitions_organization_id
  ON public.requisitions (organization_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status
  ON public.requisitions (status);
CREATE INDEX IF NOT EXISTS idx_requisitions_requested_date
  ON public.requisitions (requested_date);
CREATE INDEX IF NOT EXISTS idx_requisitions_operation_id
  ON public.requisitions (operation_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_ranch_id
  ON public.requisitions (ranch_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_ranch_crop_season_id
  ON public.requisitions (ranch_crop_season_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_sector_id
  ON public.requisitions (sector_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_tunnel_id
  ON public.requisitions (tunnel_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_valve_id
  ON public.requisitions (valve_id);

CREATE INDEX IF NOT EXISTS idx_requisition_items_organization_id
  ON public.requisition_items (organization_id);
CREATE INDEX IF NOT EXISTS idx_requisition_items_requisition_id
  ON public.requisition_items (requisition_id);

CREATE INDEX IF NOT EXISTS idx_requisition_attachments_organization_id
  ON public.requisition_attachments (organization_id);
CREATE INDEX IF NOT EXISTS idx_requisition_attachments_requisition_id
  ON public.requisition_attachments (requisition_id);

CREATE INDEX IF NOT EXISTS idx_application_executions_organization_id
  ON public.application_executions (organization_id);
CREATE INDEX IF NOT EXISTS idx_application_executions_requisition_id
  ON public.application_executions (requisition_id);
CREATE INDEX IF NOT EXISTS idx_application_executions_status
  ON public.application_executions (status);
CREATE INDEX IF NOT EXISTS idx_application_executions_mode
  ON public.application_executions (mode);

CREATE INDEX IF NOT EXISTS idx_application_lines_organization_id
  ON public.application_lines (organization_id);
CREATE INDEX IF NOT EXISTS idx_application_lines_execution_id
  ON public.application_lines (execution_id);
CREATE INDEX IF NOT EXISTS idx_application_lines_requisition_item_id
  ON public.application_lines (requisition_item_id);

CREATE INDEX IF NOT EXISTS idx_application_irrigation_rows_organization_id
  ON public.application_irrigation_rows (organization_id);
CREATE INDEX IF NOT EXISTS idx_application_irrigation_rows_execution_id
  ON public.application_irrigation_rows (execution_id);

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_irrigation_rows ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'requisitions',
      'requisition_items',
      'requisition_attachments',
      'application_executions',
      'application_lines',
      'application_irrigation_rows'
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
