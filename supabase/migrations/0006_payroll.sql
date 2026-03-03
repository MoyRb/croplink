-- 0006_payroll.sql
-- Payroll schema with org-scoped RLS

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'pay_scheme'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.pay_scheme AS ENUM ('diario', 'por_tarea', 'por_unidad');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'work_log_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.work_log_status AS ENUM ('open', 'paid');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'payment_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payment_type AS ENUM ('period', 'manual');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'payment_method'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payment_method AS ENUM ('efectivo', 'transferencia');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'payroll_period_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payroll_period_status AS ENUM ('draft', 'calculated', 'paid');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  position text,
  pay_scheme_default public.pay_scheme NOT NULL,
  daily_rate numeric,
  task_rate numeric,
  unit_rate numeric,
  is_active boolean NOT NULL DEFAULT true,
  hire_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  activity text NOT NULL,
  unit text NOT NULL,
  rate numeric NOT NULL,
  ranch_id uuid REFERENCES public.ranches(id) ON DELETE RESTRICT,
  crop_id uuid REFERENCES public.crops(id) ON DELETE RESTRICT,
  season_id uuid REFERENCES public.seasons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_rates_unit_check CHECK (unit IN ('dia', 'caja', 'kg', 'planta', 'surco', 'ha'))
);

CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.payroll_period_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_periods_date_range_check CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  type public.payment_type NOT NULL,
  date date NOT NULL,
  start_date date,
  end_date date,
  amount numeric NOT NULL,
  method public.payment_method,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_date_range_check CHECK (
    start_date IS NULL OR end_date IS NULL OR end_date >= start_date
  )
);

CREATE TABLE IF NOT EXISTS public.work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  date date NOT NULL,
  ranch_id uuid REFERENCES public.ranches(id) ON DELETE RESTRICT,
  activity text NOT NULL,
  pay_type public.pay_scheme NOT NULL,
  units numeric,
  rate_used numeric NOT NULL,
  amount numeric NOT NULL,
  status public.work_log_status NOT NULL DEFAULT 'open',
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  work_log_id uuid NOT NULL REFERENCES public.work_logs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_work_logs_org_payment_work_log_key'
  ) THEN
    ALTER TABLE public.payment_work_logs
      ADD CONSTRAINT payment_work_logs_org_payment_work_log_key
      UNIQUE (organization_id, payment_id, work_log_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_employees ON public.employees;
CREATE TRIGGER trg_set_updated_at_employees
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_activity_rates ON public.activity_rates;
CREATE TRIGGER trg_set_updated_at_activity_rates
BEFORE UPDATE ON public.activity_rates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_payroll_periods ON public.payroll_periods;
CREATE TRIGGER trg_set_updated_at_payroll_periods
BEFORE UPDATE ON public.payroll_periods
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_payments ON public.payments;
CREATE TRIGGER trg_set_updated_at_payments
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_work_logs ON public.work_logs;
CREATE TRIGGER trg_set_updated_at_work_logs
BEFORE UPDATE ON public.work_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_employees_organization_id
  ON public.employees (organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active
  ON public.employees (is_active);

CREATE INDEX IF NOT EXISTS idx_activity_rates_organization_id
  ON public.activity_rates (organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_rates_activity
  ON public.activity_rates (activity);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_organization_id
  ON public.payroll_periods (organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status
  ON public.payroll_periods (status);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates
  ON public.payroll_periods (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payments_organization_id
  ON public.payments (organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_employee_id
  ON public.payments (employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date
  ON public.payments (date);
CREATE INDEX IF NOT EXISTS idx_payments_type
  ON public.payments (type);

CREATE INDEX IF NOT EXISTS idx_work_logs_organization_id
  ON public.work_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_employee_id
  ON public.work_logs (employee_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date
  ON public.work_logs (date);
CREATE INDEX IF NOT EXISTS idx_work_logs_status
  ON public.work_logs (status);
CREATE INDEX IF NOT EXISTS idx_work_logs_employee_date_status
  ON public.work_logs (employee_id, date, status);
CREATE INDEX IF NOT EXISTS idx_work_logs_payment_id
  ON public.work_logs (payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_work_logs_organization_id
  ON public.payment_work_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_work_logs_payment_id
  ON public.payment_work_logs (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_work_logs_work_log_id
  ON public.payment_work_logs (work_log_id);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_work_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'employees',
      'activity_rates',
      'payroll_periods',
      'payments',
      'work_logs',
      'payment_work_logs'
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
