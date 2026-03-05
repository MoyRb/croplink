-- 0012_payroll_entries.sql
-- Persist payroll period calculation entries

CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  days_worked numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  gross_total numeric NOT NULL DEFAULT 0,
  net_total numeric NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'transferencia',
  reference text,
  paid_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_entries_unique_period_employee UNIQUE (payroll_period_id, employee_id)
);

DROP TRIGGER IF EXISTS trg_set_updated_at_payroll_entries ON public.payroll_entries;
CREATE TRIGGER trg_set_updated_at_payroll_entries
BEFORE UPDATE ON public.payroll_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payroll_entries_organization_id ON public.payroll_entries (organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period_id ON public.payroll_entries (payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee_id ON public.payroll_entries (employee_id);

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_entries' AND policyname = 'payroll_entries_select_org'
  ) THEN
    CREATE POLICY payroll_entries_select_org
      ON public.payroll_entries FOR SELECT TO authenticated
      USING (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_entries' AND policyname = 'payroll_entries_insert_org'
  ) THEN
    CREATE POLICY payroll_entries_insert_org
      ON public.payroll_entries FOR INSERT TO authenticated
      WITH CHECK (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_entries' AND policyname = 'payroll_entries_update_org'
  ) THEN
    CREATE POLICY payroll_entries_update_org
      ON public.payroll_entries FOR UPDATE TO authenticated
      USING (organization_id = public.current_org_id())
      WITH CHECK (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_entries' AND policyname = 'payroll_entries_delete_org'
  ) THEN
    CREATE POLICY payroll_entries_delete_org
      ON public.payroll_entries FOR DELETE TO authenticated
      USING (organization_id = public.current_org_id());
  END IF;
END
$$;
