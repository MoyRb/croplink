-- 0015_sector_tunnel_valve_numbers.sql
-- Add sequential number field to sectors, tunnels, and valves.
-- name is kept and auto-generated as "Sector N" / "Túnel N" / "Válvula N" on upsert.
-- number is nullable to preserve existing rows; required in UI for new records.

ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS number int;
ALTER TABLE public.tunnels ADD COLUMN IF NOT EXISTS number int;
ALTER TABLE public.valves  ADD COLUMN IF NOT EXISTS number int;

-- Unique sector number per ranch
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sectors_ranch_number_key') THEN
    ALTER TABLE public.sectors ADD CONSTRAINT sectors_ranch_number_key UNIQUE (ranch_id, number);
  END IF;
END $$;

-- Unique tunnel number per sector
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tunnels_sector_number_key') THEN
    ALTER TABLE public.tunnels ADD CONSTRAINT tunnels_sector_number_key UNIQUE (sector_id, number);
  END IF;
END $$;

-- Unique valve number per sector
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valves_sector_number_key') THEN
    ALTER TABLE public.valves ADD CONSTRAINT valves_sector_number_key UNIQUE (sector_id, number);
  END IF;
END $$;
