DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum enum
    JOIN pg_type type ON type.oid = enum.enumtypid
    WHERE type.typname = 'payment_type'
      AND enum.enumlabel = 'work_logs'
  ) THEN
    ALTER TYPE public.payment_type ADD VALUE 'work_logs';
  END IF;
END
$$;

ALTER TABLE public.activity_rates
  DROP CONSTRAINT IF EXISTS activity_rates_unit_check;

ALTER TABLE public.activity_rates
  ADD CONSTRAINT activity_rates_unit_check
  CHECK (unit IN ('dia', 'caja', 'kg', 'tunel', 'surco', 'hr extra', 'tambo', 'metro lineal', 'planta', 'ha'));

ALTER TABLE public.work_logs
  ADD COLUMN IF NOT EXISTS unit text;

UPDATE public.work_logs
SET unit = 'dia'
WHERE unit IS NULL
  AND pay_type = 'diario';

ALTER TABLE public.work_logs
  DROP CONSTRAINT IF EXISTS work_logs_unit_check;

ALTER TABLE public.work_logs
  ADD CONSTRAINT work_logs_unit_check
  CHECK (
    unit IS NULL OR unit IN ('dia', 'caja', 'kg', 'tunel', 'surco', 'hr extra', 'tambo', 'metro lineal', 'planta', 'ha')
  );
