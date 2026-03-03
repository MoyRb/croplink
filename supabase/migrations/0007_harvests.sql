-- 0007_harvests.sql
-- Harvests schema with org-scoped RLS

CREATE TABLE IF NOT EXISTS public.harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  date date NOT NULL,
  ranch_id uuid REFERENCES public.ranches(id) ON DELETE RESTRICT,
  crop_id uuid REFERENCES public.crops(id) ON DELETE RESTRICT,
  season_id uuid REFERENCES public.seasons(id) ON DELETE RESTRICT,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE RESTRICT,
  unit text NOT NULL,
  total_quantity numeric NOT NULL,
  activity text NOT NULL,
  rate_used numeric NOT NULL,
  total_paid numeric NOT NULL,
  unit_cost numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT harvests_unit_check CHECK (unit IN ('kg', 'caja', 'charola', 'cubeta'))
);

CREATE TABLE IF NOT EXISTS public.harvest_crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  harvest_id uuid NOT NULL REFERENCES public.harvests(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  units numeric NOT NULL,
  rate_used numeric NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.harvest_work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  harvest_id uuid NOT NULL REFERENCES public.harvests(id) ON DELETE CASCADE,
  work_log_id uuid NOT NULL REFERENCES public.work_logs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'harvest_crews_org_harvest_employee_key'
  ) THEN
    ALTER TABLE public.harvest_crews
      ADD CONSTRAINT harvest_crews_org_harvest_employee_key
      UNIQUE (organization_id, harvest_id, employee_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'harvest_work_logs_org_harvest_work_log_key'
  ) THEN
    ALTER TABLE public.harvest_work_logs
      ADD CONSTRAINT harvest_work_logs_org_harvest_work_log_key
      UNIQUE (organization_id, harvest_id, work_log_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_harvests ON public.harvests;
CREATE TRIGGER trg_set_updated_at_harvests
BEFORE UPDATE ON public.harvests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_harvest_crews ON public.harvest_crews;
CREATE TRIGGER trg_set_updated_at_harvest_crews
BEFORE UPDATE ON public.harvest_crews
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_harvests_organization_id
  ON public.harvests (organization_id);
CREATE INDEX IF NOT EXISTS idx_harvests_date
  ON public.harvests (date);
CREATE INDEX IF NOT EXISTS idx_harvests_ranch_id
  ON public.harvests (ranch_id);

CREATE INDEX IF NOT EXISTS idx_harvest_crews_organization_id
  ON public.harvest_crews (organization_id);
CREATE INDEX IF NOT EXISTS idx_harvest_crews_harvest_id
  ON public.harvest_crews (harvest_id);
CREATE INDEX IF NOT EXISTS idx_harvest_crews_employee_id
  ON public.harvest_crews (employee_id);

CREATE INDEX IF NOT EXISTS idx_harvest_work_logs_organization_id
  ON public.harvest_work_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_harvest_work_logs_harvest_id
  ON public.harvest_work_logs (harvest_id);
CREATE INDEX IF NOT EXISTS idx_harvest_work_logs_work_log_id
  ON public.harvest_work_logs (work_log_id);

ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_work_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'harvests',
      'harvest_crews',
      'harvest_work_logs'
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
