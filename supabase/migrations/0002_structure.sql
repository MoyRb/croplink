-- 0002_structure.sql
-- Operational structure schema with org-scoped RLS

CREATE TABLE IF NOT EXISTS public.operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ranches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  operation_id uuid NOT NULL REFERENCES public.operations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  location text,
  description text,
  surface_ha numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ranch_id uuid NOT NULL REFERENCES public.ranches(id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text,
  description text,
  surface_ha numeric(12,2)
);

CREATE TABLE IF NOT EXISTS public.tunnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  sector_id uuid NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text,
  description text
);

CREATE TABLE IF NOT EXISTS public.valves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  sector_id uuid NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  tunnel_id uuid REFERENCES public.tunnels(id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text,
  description text
);

CREATE TABLE IF NOT EXISTS public.crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  CONSTRAINT seasons_date_range_check CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.ranch_crop_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ranch_id uuid NOT NULL REFERENCES public.ranches(id) ON DELETE RESTRICT,
  crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE RESTRICT,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ranch_crop_seasons_org_ranch_crop_season_key'
  ) THEN
    ALTER TABLE public.ranch_crop_seasons
      ADD CONSTRAINT ranch_crop_seasons_org_ranch_crop_season_key
      UNIQUE (organization_id, ranch_id, crop_id, season_id);
  END IF;
END
$$;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_set_updated_at_operations ON public.operations;
CREATE TRIGGER trg_set_updated_at_operations
BEFORE UPDATE ON public.operations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_ranches ON public.ranches;
CREATE TRIGGER trg_set_updated_at_ranches
BEFORE UPDATE ON public.ranches
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Indexes: organization_id and principal FKs
CREATE INDEX IF NOT EXISTS idx_operations_organization_id ON public.operations (organization_id);

CREATE INDEX IF NOT EXISTS idx_ranches_organization_id ON public.ranches (organization_id);
CREATE INDEX IF NOT EXISTS idx_ranches_operation_id ON public.ranches (operation_id);

CREATE INDEX IF NOT EXISTS idx_sectors_organization_id ON public.sectors (organization_id);
CREATE INDEX IF NOT EXISTS idx_sectors_ranch_id ON public.sectors (ranch_id);

CREATE INDEX IF NOT EXISTS idx_tunnels_organization_id ON public.tunnels (organization_id);
CREATE INDEX IF NOT EXISTS idx_tunnels_sector_id ON public.tunnels (sector_id);

CREATE INDEX IF NOT EXISTS idx_valves_organization_id ON public.valves (organization_id);
CREATE INDEX IF NOT EXISTS idx_valves_sector_id ON public.valves (sector_id);
CREATE INDEX IF NOT EXISTS idx_valves_tunnel_id ON public.valves (tunnel_id);

CREATE INDEX IF NOT EXISTS idx_crops_organization_id ON public.crops (organization_id);

CREATE INDEX IF NOT EXISTS idx_seasons_organization_id ON public.seasons (organization_id);

CREATE INDEX IF NOT EXISTS idx_ranch_crop_seasons_organization_id ON public.ranch_crop_seasons (organization_id);
CREATE INDEX IF NOT EXISTS idx_ranch_crop_seasons_ranch_id ON public.ranch_crop_seasons (ranch_id);
CREATE INDEX IF NOT EXISTS idx_ranch_crop_seasons_crop_id ON public.ranch_crop_seasons (crop_id);
CREATE INDEX IF NOT EXISTS idx_ranch_crop_seasons_season_id ON public.ranch_crop_seasons (season_id);

ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tunnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranch_crop_seasons ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'operations',
      'ranches',
      'sectors',
      'tunnels',
      'valves',
      'crops',
      'seasons',
      'ranch_crop_seasons'
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
