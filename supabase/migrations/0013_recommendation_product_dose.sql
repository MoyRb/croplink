-- 0013_recommendation_product_dose.sql
-- Add dose_per_ha and dose_unit to recommendation_products for area-based consumption calculations

ALTER TABLE public.recommendation_products
  ADD COLUMN IF NOT EXISTS dose_per_ha numeric(12,4),
  ADD COLUMN IF NOT EXISTS dose_unit text;
