-- 0018_harvest_yield_records.sql
-- Refocus harvests as ranch yield records with header metadata + detail rows.

ALTER TABLE public.harvests
  ADD COLUMN IF NOT EXISTS ranch_crop_season_id uuid REFERENCES public.ranch_crop_seasons(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS agronomic_management text;

CREATE INDEX IF NOT EXISTS idx_harvests_ranch_crop_season_id
  ON public.harvests (ranch_crop_season_id);

CREATE TABLE IF NOT EXISTS public.harvest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  harvest_id uuid NOT NULL REFERENCES public.harvests(id) ON DELETE CASCADE,
  package text NOT NULL,
  boxes numeric NOT NULL DEFAULT 0,
  rejects numeric NOT NULL DEFAULT 0,
  process_kg numeric NOT NULL DEFAULT 0,
  process_yield numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT harvest_entries_boxes_check CHECK (boxes >= 0),
  CONSTRAINT harvest_entries_rejects_check CHECK (rejects >= 0),
  CONSTRAINT harvest_entries_process_kg_check CHECK (process_kg >= 0),
  CONSTRAINT harvest_entries_process_yield_check CHECK (process_yield >= 0)
);

CREATE INDEX IF NOT EXISTS idx_harvest_entries_organization_id
  ON public.harvest_entries (organization_id);
CREATE INDEX IF NOT EXISTS idx_harvest_entries_harvest_id
  ON public.harvest_entries (harvest_id);

DROP TRIGGER IF EXISTS trg_set_updated_at_harvest_entries ON public.harvest_entries;
CREATE TRIGGER trg_set_updated_at_harvest_entries
BEFORE UPDATE ON public.harvest_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.harvest_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'harvest_entries' AND policyname = 'harvest_entries_select_org'
  ) THEN
    CREATE POLICY harvest_entries_select_org
      ON public.harvest_entries
      FOR SELECT
      TO authenticated
      USING (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'harvest_entries' AND policyname = 'harvest_entries_insert_org'
  ) THEN
    CREATE POLICY harvest_entries_insert_org
      ON public.harvest_entries
      FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'harvest_entries' AND policyname = 'harvest_entries_update_org'
  ) THEN
    CREATE POLICY harvest_entries_update_org
      ON public.harvest_entries
      FOR UPDATE
      TO authenticated
      USING (organization_id = public.current_org_id())
      WITH CHECK (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'harvest_entries' AND policyname = 'harvest_entries_delete_org'
  ) THEN
    CREATE POLICY harvest_entries_delete_org
      ON public.harvest_entries
      FOR DELETE
      TO authenticated
      USING (organization_id = public.current_org_id());
  END IF;
END
$$;
