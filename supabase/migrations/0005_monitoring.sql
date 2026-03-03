-- 0005_monitoring.sql
-- Monitoring sessions schema with org-scoped RLS

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'monitoring_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.monitoring_type AS ENUM ('desarrollo', 'nutricion');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'monitoring_session_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.monitoring_session_status AS ENUM ('in_progress', 'paused', 'completed');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'production_system'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.production_system AS ENUM ('hidroponico', 'suelo');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.monitoring_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  status public.monitoring_session_status NOT NULL DEFAULT 'in_progress',
  monitoring_type public.monitoring_type NOT NULL,
  production_system public.production_system,
  ranch_id uuid REFERENCES public.ranches(id) ON DELETE RESTRICT,
  ranch_crop_season_id uuid REFERENCES public.ranch_crop_seasons(id) ON DELETE RESTRICT,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE RESTRICT,
  tunnel_id uuid REFERENCES public.tunnels(id) ON DELETE RESTRICT,
  valve_id uuid REFERENCES public.valves(id) ON DELETE RESTRICT,
  weather_condition text,
  phenological_stage text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monitoring_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL REFERENCES public.monitoring_sessions(id) ON DELETE CASCADE,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  name_snapshot text,
  tunnel_snapshot text,
  valve_snapshot text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monitoring_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL REFERENCES public.monitoring_sessions(id) ON DELETE CASCADE,
  monitoring_sector_id uuid NOT NULL REFERENCES public.monitoring_sectors(id) ON DELETE CASCADE,
  point_index integer NOT NULL,
  metros_muestreados numeric,
  conteo_en_metros numeric,
  density numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monitoring_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL REFERENCES public.monitoring_sessions(id) ON DELETE CASCADE,
  monitoring_point_id uuid NOT NULL REFERENCES public.monitoring_points(id) ON DELETE CASCADE,
  plant_index integer NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monitoring_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL REFERENCES public.monitoring_sessions(id) ON DELETE CASCADE,
  monitoring_plant_id uuid NOT NULL REFERENCES public.monitoring_plants(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descripcion text,
  pc numeric,
  severity text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_set_updated_at_monitoring_sessions ON public.monitoring_sessions;
CREATE TRIGGER trg_set_updated_at_monitoring_sessions
BEFORE UPDATE ON public.monitoring_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_monitoring_sectors ON public.monitoring_sectors;
CREATE TRIGGER trg_set_updated_at_monitoring_sectors
BEFORE UPDATE ON public.monitoring_sectors
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_monitoring_points ON public.monitoring_points;
CREATE TRIGGER trg_set_updated_at_monitoring_points
BEFORE UPDATE ON public.monitoring_points
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_monitoring_plants ON public.monitoring_plants;
CREATE TRIGGER trg_set_updated_at_monitoring_plants
BEFORE UPDATE ON public.monitoring_plants
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_monitoring_findings ON public.monitoring_findings;
CREATE TRIGGER trg_set_updated_at_monitoring_findings
BEFORE UPDATE ON public.monitoring_findings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_organization_id
  ON public.monitoring_sessions (organization_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_sectors_organization_id
  ON public.monitoring_sectors (organization_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sectors_session_id
  ON public.monitoring_sectors (session_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_points_organization_id
  ON public.monitoring_points (organization_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_points_session_id
  ON public.monitoring_points (session_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_points_monitoring_sector_id
  ON public.monitoring_points (monitoring_sector_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_plants_organization_id
  ON public.monitoring_plants (organization_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_plants_session_id
  ON public.monitoring_plants (session_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_plants_monitoring_point_id
  ON public.monitoring_plants (monitoring_point_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_findings_organization_id
  ON public.monitoring_findings (organization_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_findings_session_id
  ON public.monitoring_findings (session_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_findings_monitoring_plant_id
  ON public.monitoring_findings (monitoring_plant_id);

ALTER TABLE public.monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_findings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'monitoring_sessions',
      'monitoring_sectors',
      'monitoring_points',
      'monitoring_plants',
      'monitoring_findings'
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
