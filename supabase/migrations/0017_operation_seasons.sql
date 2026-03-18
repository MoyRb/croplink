-- 0017_operation_seasons.sql
-- Associate a planned season directly to an operation while keeping org isolation.

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS operation_id uuid REFERENCES public.operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seasons_operation_id ON public.seasons (operation_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_org_operation_unique
  ON public.seasons (organization_id, operation_id)
  WHERE operation_id IS NOT NULL;
