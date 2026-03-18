import { supabase } from '../supabaseClient'
import type { Crop, Operation, OperationCatalog, Ranch, RanchCropSeason, Season, Sector, Tunnel, Valve } from './types'

type DbOperation = { id: string; name: string; description: string | null; created_at: string }
type DbRanch = { id: string; operation_id: string; name: string; description: string | null; location: string | null; surface_ha: number | null; created_at: string }
type DbSector = { id: string; ranch_id: string; name: string; description: string | null; code: string | null; surface_ha: number | null; number: number | null; tunnel_count: number | null }
type DbTunnel = { id: string; sector_id: string; name: string; description: string | null; code: string | null; number: number | null }
type DbValve = { id: string; sector_id: string; tunnel_id: string | null; name: string; description: string | null; code: string | null; number: number | null }
type DbCrop = { id: string; name: string; description: string | null }
type DbSeason = { id: string; label: string; description: string | null; start_date: string; end_date: string }
type DbRanchCropSeason = { id: string; ranch_id: string; crop_id: string; season_id: string; variety: string | null }

const requireText = (value: string, message: string) => {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(message)
  return trimmed
}

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message)
}

export async function getCatalogFromSupabase(organizationId: string): Promise<OperationCatalog> {
  const [operationsResult, ranchesResult, sectorsResult, tunnelsResult, valvesResult, cropsResult, seasonsResult, ranchCropSeasonsResult] = await Promise.all([
    supabase.from('operations').select('id, name, description, created_at').eq('organization_id', organizationId).order('name', { ascending: true }),
    supabase.from('ranches').select('id, operation_id, name, location, description, surface_ha, created_at').eq('organization_id', organizationId).order('name', { ascending: true }),
    supabase.from('sectors').select('id, ranch_id, name, code, description, surface_ha, number, tunnel_count').eq('organization_id', organizationId).order('number', { ascending: true, nullsFirst: false }),
    supabase.from('tunnels').select('id, sector_id, name, code, description, number').eq('organization_id', organizationId).order('number', { ascending: true, nullsFirst: false }),
    supabase.from('valves').select('id, sector_id, tunnel_id, name, code, description, number').eq('organization_id', organizationId).order('number', { ascending: true, nullsFirst: false }),
    supabase.from('crops').select('id, name, description').eq('organization_id', organizationId).order('name', { ascending: true }),
    supabase.from('seasons').select('id, label, start_date, end_date, description').eq('organization_id', organizationId).order('start_date', { ascending: false }),
    supabase.from('ranch_crop_seasons').select('id, ranch_id, crop_id, season_id, variety').eq('organization_id', organizationId),
  ])

  throwIfError(operationsResult.error)
  throwIfError(ranchesResult.error)
  throwIfError(sectorsResult.error)
  throwIfError(tunnelsResult.error)
  throwIfError(valvesResult.error)
  throwIfError(cropsResult.error)
  throwIfError(seasonsResult.error)
  throwIfError(ranchCropSeasonsResult.error)

  return {
    operations: ((operationsResult.data ?? []) as DbOperation[]).map((item): Operation => ({ id: item.id, name: item.name, description: item.description ?? undefined, createdAt: item.created_at })),
    ranches: ((ranchesResult.data ?? []) as DbRanch[]).map((item): Ranch => ({
      id: item.id,
      operationId: item.operation_id,
      name: item.name,
      description: item.description ?? undefined,
      location: item.location ?? undefined,
      surfaceHa: item.surface_ha ?? null,
      createdAt: item.created_at,
    })),
    sectors: ((sectorsResult.data ?? []) as DbSector[]).map((item): Sector => ({
      id: item.id,
      ranchId: item.ranch_id,
      name: item.name,
      description: item.description ?? undefined,
      code: item.code ?? undefined,
      areaHa: item.surface_ha ?? null,
      number: item.number ?? null,
      tunnelCount: item.tunnel_count ?? null,
    })),
    tunnels: ((tunnelsResult.data ?? []) as DbTunnel[]).map((item): Tunnel => ({ id: item.id, sectorId: item.sector_id, name: item.name, description: item.description ?? undefined, code: item.code ?? undefined, number: item.number ?? null })),
    valves: ((valvesResult.data ?? []) as DbValve[]).map((item): Valve => ({
      id: item.id,
      sectorId: item.sector_id,
      tunnelId: item.tunnel_id ?? undefined,
      name: item.name,
      description: item.description ?? undefined,
      code: item.code ?? undefined,
      number: item.number ?? null,
    })),
    crops: ((cropsResult.data ?? []) as DbCrop[]).map((item): Crop => ({ id: item.id, name: item.name, description: item.description ?? undefined })),
    seasons: ((seasonsResult.data ?? []) as DbSeason[]).map((item): Season => ({
      id: item.id,
      name: item.label,
      description: item.description ?? undefined,
      startDate: item.start_date,
      endDate: item.end_date,
    })),
    ranchCropSeasons: ((ranchCropSeasonsResult.data ?? []) as DbRanchCropSeason[]).map((item): RanchCropSeason => ({
      id: item.id,
      ranchId: item.ranch_id,
      cropId: item.crop_id,
      seasonId: item.season_id,
      variety: item.variety ?? undefined,
    })),
  }
}

export async function upsertOperationSupabase(organizationId: string, payload: Omit<Operation, 'createdAt'>) {
  const name = requireText(payload.name, 'El nombre de la operación es requerido.')
  const upsertPayload = { id: payload.id || undefined, organization_id: organizationId, name, description: payload.description?.trim() || null }
  const { error } = await supabase.from('operations').upsert(upsertPayload)
  throwIfError(error)
}

export async function deleteOperationSupabase(id: string) { const { error } = await supabase.from('operations').delete().eq('id', id); throwIfError(error) }

export async function upsertRanchSupabase(organizationId: string, payload: Omit<Ranch, 'createdAt'>) {
  const name = requireText(payload.name, 'El nombre del rancho es requerido.')
  if (!payload.operationId) throw new Error('Selecciona una operación.')
  const upsertPayload = {
    id: payload.id || undefined,
    organization_id: organizationId,
    operation_id: payload.operationId,
    name,
    location: payload.location?.trim() || null,
    description: payload.description?.trim() || null,
    surface_ha: payload.surfaceHa ?? null,
  }
  const { error } = await supabase.from('ranches').upsert(upsertPayload)
  throwIfError(error)
}

export async function deleteRanchSupabase(id: string) { const { error } = await supabase.from('ranches').delete().eq('id', id); throwIfError(error) }

export async function upsertSectorSupabase(organizationId: string, payload: Sector) {
  if (!payload.ranchId) throw new Error('Selecciona un rancho.')
  const num = payload.number
  if (num == null || !Number.isInteger(num) || num <= 0) throw new Error('El número de sector es requerido y debe ser un entero positivo.')
  const name = `Sector ${num}`
  const { error } = await supabase.from('sectors').upsert({
    id: payload.id || undefined,
    organization_id: organizationId,
    ranch_id: payload.ranchId,
    number: num,
    name,
    description: payload.description?.trim() || null,
    surface_ha: payload.areaHa ?? null,
    tunnel_count: payload.tunnelCount ?? null,
  })
  throwIfError(error)
}

export async function deleteSectorSupabase(id: string) { const { error } = await supabase.from('sectors').delete().eq('id', id); throwIfError(error) }

export async function upsertTunnelSupabase(organizationId: string, payload: Tunnel) {
  if (!payload.sectorId) throw new Error('Selecciona un sector.')
  const num = payload.number
  if (num == null || !Number.isInteger(num) || num <= 0) throw new Error('El número de túnel es requerido y debe ser un entero positivo.')
  const name = `Túnel ${num}`
  const { error } = await supabase.from('tunnels').upsert({ id: payload.id || undefined, organization_id: organizationId, sector_id: payload.sectorId, number: num, name, description: payload.description?.trim() || null })
  throwIfError(error)
}

export async function deleteTunnelSupabase(id: string) { const { error } = await supabase.from('tunnels').delete().eq('id', id); throwIfError(error) }

export async function bulkInsertTunnelsSupabase(
  organizationId: string,
  sectorId: string,
  fromNumber: number,
  toNumber: number,
  description?: string,
): Promise<{ created: number; skipped: number }> {
  const { data: existing, error: fetchError } = await supabase
    .from('tunnels')
    .select('number')
    .eq('organization_id', organizationId)
    .eq('sector_id', sectorId)
  throwIfError(fetchError)

  const existingNumbers = new Set(
    (existing ?? []).map((row: { number: number | null }) => row.number).filter((n): n is number => n != null),
  )

  const rows = []
  for (let n = fromNumber; n <= toNumber; n++) {
    if (!existingNumbers.has(n)) {
      rows.push({ organization_id: organizationId, sector_id: sectorId, number: n, name: `Túnel ${n}`, description: description?.trim() || null })
    }
  }

  const skipped = toNumber - fromNumber + 1 - rows.length
  if (rows.length > 0) {
    const { error } = await supabase.from('tunnels').insert(rows)
    throwIfError(error)
  }

  return { created: rows.length, skipped }
}

export async function upsertValveSupabase(organizationId: string, payload: Valve) {
  if (!payload.sectorId) throw new Error('Selecciona un sector.')
  const num = payload.number
  if (num == null || !Number.isInteger(num) || num <= 0) throw new Error('El número de válvula es requerido y debe ser un entero positivo.')
  const name = `Válvula ${num}`
  const { error } = await supabase
    .from('valves')
    .upsert({ id: payload.id || undefined, organization_id: organizationId, sector_id: payload.sectorId, tunnel_id: payload.tunnelId || null, number: num, name, description: payload.description?.trim() || null })
  throwIfError(error)
}

export async function deleteValveSupabase(id: string) { const { error } = await supabase.from('valves').delete().eq('id', id); throwIfError(error) }

export async function upsertCropSupabase(organizationId: string, payload: Crop) {
  const name = requireText(payload.name, 'El nombre del cultivo es requerido.')
  const { error } = await supabase.from('crops').upsert({ id: payload.id || undefined, organization_id: organizationId, name, description: payload.description?.trim() || null })
  throwIfError(error)
}

export async function deleteCropSupabase(id: string) { const { error } = await supabase.from('crops').delete().eq('id', id); throwIfError(error) }

export async function upsertSeasonSupabase(organizationId: string, payload: Season) {
  const label = requireText(payload.name, 'El nombre de la temporada es requerido.')
  if (!payload.startDate || !payload.endDate) throw new Error('Selecciona fecha de inicio y fin.')
  const { error } = await supabase.from('seasons').upsert({
    id: payload.id || undefined,
    organization_id: organizationId,
    label,
    start_date: payload.startDate,
    end_date: payload.endDate,
    description: payload.description?.trim() || null,
  })
  throwIfError(error)
}

export async function deleteSeasonSupabase(id: string) { const { error } = await supabase.from('seasons').delete().eq('id', id); throwIfError(error) }

export async function upsertRanchCropSeasonSupabase(organizationId: string, payload: RanchCropSeason) {
  if (!payload.ranchId) throw new Error('Selecciona un rancho.')
  if (!payload.cropId) throw new Error('Selecciona un cultivo.')
  if (!payload.seasonId) throw new Error('Selecciona una temporada.')
  const { error } = await supabase.from('ranch_crop_seasons').upsert({
    id: payload.id || undefined,
    organization_id: organizationId,
    ranch_id: payload.ranchId,
    crop_id: payload.cropId,
    season_id: payload.seasonId,
    variety: payload.variety?.trim() || null,
  })
  throwIfError(error)
}

export async function deleteRanchCropSeasonSupabase(id: string) {
  const { error } = await supabase.from('ranch_crop_seasons').delete().eq('id', id)
  throwIfError(error)
}
