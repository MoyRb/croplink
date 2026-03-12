-- 0014_employees_homoclave_nss.sql
-- Add homoclave (RFC suffix) and NSS (Número de Seguro Social) to employees.
-- NSS stored as text to preserve leading zeros.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS homoclave text,
  ADD COLUMN IF NOT EXISTS nss text;
