-- 0008_recommendations_calendar.sql
-- Recommendations and calendar schema with org-scoped RLS

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'recommendation_mode'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.recommendation_mode AS ENUM ('foliar_drench', 'via_riego');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'recommendation_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.recommendation_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'calendar_event_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.calendar_event_type AS ENUM ('recommendation', 'execution', 'harvest', 'beneficos');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  mode public.recommendation_mode NOT NULL,
  status public.recommendation_status NOT NULL DEFAULT 'draft',
  title text,
  ranch_id uuid REFERENCES public.ranches(id) ON DELETE RESTRICT,
  ranch_crop_season_id uuid REFERENCES public.ranch_crop_seasons(id) ON DELETE RESTRICT,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE RESTRICT,
  tunnel_id uuid REFERENCES public.tunnels(id) ON DELETE RESTRICT,
  valve_id uuid REFERENCES public.valves(id) ON DELETE RESTRICT,
  solicita text,
  modo_aplicacion text,
  justificacion text,
  fecha_recomendacion date,
  semana integer,
  equipo_aplicacion text,
  operario text,
  fecha_aplicacion date,
  ph_mezcla numeric,
  hora_inicio time,
  hora_fin time,
  comentarios text,
  superficie numeric,
  header_extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendation_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  active_ingredient text,
  dosis jsonb NOT NULL DEFAULT '{}'::jsonb,
  gasto jsonb NOT NULL DEFAULT '{}'::jsonb,
  gasto_total jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.recommendation_irrigation_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE RESTRICT,
  valve_id uuid REFERENCES public.valves(id) ON DELETE RESTRICT,
  surface numeric,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.recommendation_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  export_type text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_exports_type_check CHECK (export_type IN ('xlsx'))
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  event_type public.calendar_event_type NOT NULL,
  ref_id uuid NOT NULL,
  start_at timestamptz,
  end_at timestamptz,
  title text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_set_updated_at_recommendations ON public.recommendations;
CREATE TRIGGER trg_set_updated_at_recommendations
BEFORE UPDATE ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_recommendations_org_created_at
  ON public.recommendations (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_status
  ON public.recommendations (status);
CREATE INDEX IF NOT EXISTS idx_recommendation_products_recommendation_id
  ON public.recommendation_products (recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_irrigation_rows_recommendation_id
  ON public.recommendation_irrigation_rows (recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_exports_org_created_at
  ON public.recommendation_exports (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_created_at
  ON public.calendar_events (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_ref_id_event_type
  ON public.calendar_events (ref_id, event_type);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_irrigation_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'recommendations',
      'recommendation_products',
      'recommendation_irrigation_rows',
      'recommendation_exports',
      'calendar_events'
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
