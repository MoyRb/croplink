-- 0016_structure_ranch_surface_sector_tunnels_and_variety.sql
-- Persist ranch surface in app catalog, tunnel count at sector level, and optional variety per ranch crop season.

ALTER TABLE public.sectors
  ADD COLUMN IF NOT EXISTS tunnel_count int;

ALTER TABLE public.ranch_crop_seasons
  ADD COLUMN IF NOT EXISTS variety text;
