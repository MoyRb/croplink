import { useCallback, useEffect, useState } from 'react'

import { calculateProcessPercentage, calculateTotalProcessPercentage } from '../cosechas/processMetrics'
import { supabase } from '../supabaseClient'

export type CuadrillaEntry = {
  empleadoId: string
  empleadoNombre?: string
  unidades: number
  rateUsed: number
  amount: number
  workLogId?: string
}

export type HarvestDetailEntry = {
  id?: string
  empaque: string
  cajas: number
  rechazos: number
  kgProceso: number
  rendimiento: number
}

export type Cosecha = {
  id: string
  fecha: string
  ranchoId: string
  ranchoNombre: string
  cropId: string
  cultivo: string
  seasonId: string
  temporada: string
  sectorId: string
  sectorNombre: string
  ranchCropSeasonId?: string
  variedad: string
  manejoAgronomico: string
  unidad: string
  cantidadTotal: number
  actividad: string
  tarifa: number
  totalPagado: number
  costoUnitario: number
  notes?: string
  detalle: HarvestDetailEntry[]
  totalCajas: number
  totalRechazos: number
  totalKgProceso: number
  promedioRendimiento: number
  cuadrilla: CuadrillaEntry[]
  workLogIds: string[]
  createdAt: string
  updatedAt: string
}

export type CreateCosechaPayload = {
  fecha: string
  ranchoId: string
  cropId: string
  seasonId: string
  sectorId?: string
  ranchCropSeasonId?: string
  manejoAgronomico: string
  notes?: string
  detalle: HarvestDetailEntry[]
}

export type UpdateCosechaPayload = {
  id: string
  fecha: string
  ranchoId: string
  cropId: string
  seasonId: string
  sectorId?: string
  ranchCropSeasonId?: string
  manejoAgronomico: string
  notes?: string
  detalle: HarvestDetailEntry[]
}

type ProfileOrgRow = { organization_id: string | null }

type HarvestRow = {
  id: string
  date: string
  ranch_id: string
  crop_id: string
  season_id: string
  sector_id: string | null
  ranch_crop_season_id: string | null
  agronomic_management: string | null
  unit: string
  total_quantity: number
  activity: string
  rate_used: number
  total_paid: number
  unit_cost: number
  notes: string | null
  created_at: string
  updated_at: string
  ranches: { id: string; name: string } | { id: string; name: string }[] | null
  crops: { id: string; name: string } | { id: string; name: string }[] | null
  seasons: { id: string; label: string } | { id: string; label: string }[] | null
  sectors: { id: string; name: string } | { id: string; name: string }[] | null
  ranch_crop_seasons: { id: string; variety: string | null } | { id: string; variety: string | null }[] | null
  harvest_entries:
    | Array<{
        id: string
        package: string | null
        boxes: number | null
        rejects: number | null
        process_kg: number | null
        process_yield: number | null
      }>
    | null
  harvest_crews:
    | Array<{
        employee_id: string
        units: number
        rate_used: number
        amount: number
        employees: { full_name: string | null } | { full_name: string | null }[] | null
      }>
    | null
  harvest_work_logs: Array<{ work_log_id: string }> | null
}

const fromMaybeArray = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const normalizeNumber = (value: number | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const emptyStringFallback = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

const sanitizeHarvestDetail = (entry: HarvestDetailEntry): HarvestDetailEntry => ({
  id: entry.id,
  empaque: entry.empaque.trim(),
  cajas: Math.max(Number(entry.cajas) || 0, 0),
  rechazos: Math.max(Number(entry.rechazos) || 0, 0),
  kgProceso: Math.max(Number(entry.kgProceso) || 0, 0),
  rendimiento: 0,
})

const summarizeHarvestDetail = (detalle: HarvestDetailEntry[]) => {
  const sanitized = detalle.map((entry) => {
    const normalized = sanitizeHarvestDetail(entry)
    return {
      ...normalized,
      rendimiento: calculateProcessPercentage(normalized),
    }
  })
  const totalCajas = sanitized.reduce((sum, row) => sum + row.cajas, 0)
  const totalRechazos = sanitized.reduce((sum, row) => sum + row.rechazos, 0)
  const totalKgProceso = sanitized.reduce((sum, row) => sum + row.kgProceso, 0)
  const promedioRendimiento = calculateTotalProcessPercentage(sanitized)

  return {
    detalle: sanitized,
    totalCajas,
    totalRechazos,
    totalKgProceso,
    promedioRendimiento,
  }
}

const getCurrentUserAndOrganization = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    throw new Error(authError?.message || 'No hay un usuario autenticado.')
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', authData.user.id)
    .single<ProfileOrgRow>()

  if (profileError || !profileData?.organization_id) {
    throw new Error(profileError?.message || 'No hay organización asociada al usuario.')
  }

  return {
    organizationId: profileData.organization_id,
  }
}

const mapHarvest = (row: HarvestRow): Cosecha => {
  const ranch = fromMaybeArray(row.ranches)
  const crop = fromMaybeArray(row.crops)
  const season = fromMaybeArray(row.seasons)
  const sector = fromMaybeArray(row.sectors)
  const ranchCropSeason = fromMaybeArray(row.ranch_crop_seasons)

  const detalle = (row.harvest_entries ?? []).map((entry) => ({
    id: entry.id,
    empaque: emptyStringFallback(entry.package, ''),
    cajas: normalizeNumber(entry.boxes),
    rechazos: normalizeNumber(entry.rejects),
    kgProceso: normalizeNumber(entry.process_kg),
    rendimiento: normalizeNumber(entry.process_yield),
  }))

  const resumen = summarizeHarvestDetail(detalle)

  const cuadrilla = (row.harvest_crews ?? []).map((crew) => ({
    empleadoId: crew.employee_id,
    empleadoNombre: fromMaybeArray(crew.employees)?.full_name ?? undefined,
    unidades: normalizeNumber(crew.units),
    rateUsed: normalizeNumber(crew.rate_used),
    amount: normalizeNumber(crew.amount),
  }))

  return {
    id: row.id,
    fecha: row.date,
    ranchoId: row.ranch_id,
    ranchoNombre: ranch?.name ?? 'Rancho',
    cropId: row.crop_id,
    cultivo: crop?.name ?? 'Cultivo',
    seasonId: row.season_id,
    temporada: season?.label ?? 'Temporada',
    sectorId: row.sector_id ?? '',
    sectorNombre: sector?.name ?? 'Sin sector',
    ranchCropSeasonId: row.ranch_crop_season_id ?? undefined,
    variedad: emptyStringFallback(ranchCropSeason?.variety, 'Sin variedad'),
    manejoAgronomico: emptyStringFallback(row.agronomic_management, 'Sin manejo agronómico'),
    unidad: row.unit,
    cantidadTotal: normalizeNumber(row.total_quantity),
    actividad: row.activity,
    tarifa: normalizeNumber(row.rate_used),
    totalPagado: normalizeNumber(row.total_paid),
    costoUnitario: normalizeNumber(row.unit_cost),
    notes: row.notes ?? undefined,
    detalle: resumen.detalle,
    totalCajas: resumen.totalCajas,
    totalRechazos: resumen.totalRechazos,
    totalKgProceso: resumen.totalKgProceso,
    promedioRendimiento: resumen.promedioRendimiento,
    cuadrilla,
    workLogIds: (row.harvest_work_logs ?? []).map((item) => item.work_log_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const harvestSelect = `
  id,
  date,
  ranch_id,
  crop_id,
  season_id,
  sector_id,
  ranch_crop_season_id,
  agronomic_management,
  unit,
  total_quantity,
  activity,
  rate_used,
  total_paid,
  unit_cost,
  notes,
  created_at,
  updated_at,
  ranches:ranch_id (id, name),
  crops:crop_id (id, name),
  seasons:season_id (id, label),
  sectors:sector_id (id, name),
  ranch_crop_seasons:ranch_crop_season_id (id, variety),
  harvest_entries (id, package, boxes, rejects, process_kg, process_yield),
  harvest_crews (employee_id, units, rate_used, amount, employees:employee_id (full_name)),
  harvest_work_logs (work_log_id)
`

export async function listCosechas() {
  const { organizationId } = await getCurrentUserAndOrganization()
  const { data, error } = await supabase
    .from('harvests')
    .select(harvestSelect)
    .eq('organization_id', organizationId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (((data as unknown) as HarvestRow[] | null) ?? []).map(mapHarvest)
}

export async function getCosechaById(id: string) {
  const { organizationId } = await getCurrentUserAndOrganization()
  const { data, error } = await supabase
    .from('harvests')
    .select(harvestSelect)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single<HarvestRow>()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return mapHarvest(data)
}

const buildHarvestPayload = (organizationId: string, payload: CreateCosechaPayload | UpdateCosechaPayload) => {
  const resumen = summarizeHarvestDetail(payload.detalle)

  return {
    harvest: {
      organization_id: organizationId,
      date: payload.fecha,
      ranch_id: payload.ranchoId,
      crop_id: payload.cropId,
      season_id: payload.seasonId,
      sector_id: payload.sectorId || null,
      ranch_crop_season_id: payload.ranchCropSeasonId || null,
      agronomic_management: payload.manejoAgronomico.trim(),
      unit: 'caja',
      total_quantity: resumen.totalCajas,
      activity: 'registro_rendimiento',
      rate_used: 0,
      total_paid: 0,
      unit_cost: 0,
      notes: payload.notes?.trim() || null,
    },
    resumen,
  }
}

export async function createCosecha(payload: CreateCosechaPayload) {
  const { organizationId } = await getCurrentUserAndOrganization()
  const { harvest, resumen } = buildHarvestPayload(organizationId, payload)

  const { data: createdHarvest, error: harvestError } = await supabase
    .from('harvests')
    .insert(harvest)
    .select('id')
    .single<{ id: string }>()

  if (harvestError || !createdHarvest) throw new Error(harvestError?.message || 'No se pudo crear la cosecha.')

  if (resumen.detalle.length > 0) {
    const detailRows = resumen.detalle.map((row) => ({
      organization_id: organizationId,
      harvest_id: createdHarvest.id,
      package: row.empaque,
      boxes: row.cajas,
      rejects: row.rechazos,
      process_kg: row.kgProceso,
      process_yield: row.rendimiento,
    }))

    const { error: detailError } = await supabase.from('harvest_entries').insert(detailRows)
    if (detailError) throw new Error(detailError.message)
  }

  return createdHarvest.id
}

export async function updateCosecha(payload: UpdateCosechaPayload) {
  const { organizationId } = await getCurrentUserAndOrganization()
  const { harvest, resumen } = buildHarvestPayload(organizationId, payload)

  const { error } = await supabase
    .from('harvests')
    .update(harvest)
    .eq('organization_id', organizationId)
    .eq('id', payload.id)

  if (error) throw new Error(error.message)

  const { error: deleteError } = await supabase
    .from('harvest_entries')
    .delete()
    .eq('organization_id', organizationId)
    .eq('harvest_id', payload.id)

  if (deleteError) throw new Error(deleteError.message)

  if (resumen.detalle.length > 0) {
    const detailRows = resumen.detalle.map((row) => ({
      organization_id: organizationId,
      harvest_id: payload.id,
      package: row.empaque,
      boxes: row.cajas,
      rejects: row.rechazos,
      process_kg: row.kgProceso,
      process_yield: row.rendimiento,
    }))

    const { error: detailError } = await supabase.from('harvest_entries').insert(detailRows)
    if (detailError) throw new Error(detailError.message)
  }
}

export function useCosechasStore() {
  const [cosechas, setCosechas] = useState<Cosecha[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshCosechas = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const rows = await listCosechas()
      setCosechas(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar cosechas.')
      setCosechas([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCosechas()
  }, [refreshCosechas])

  const saveNewCosecha = useCallback(
    async (payload: CreateCosechaPayload) => {
      setIsSaving(true)
      setError(null)
      try {
        const id = await createCosecha(payload)
        await refreshCosechas()
        return id
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo guardar la cosecha.'
        setError(message)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [refreshCosechas],
  )

  const saveCosechaChanges = useCallback(
    async (payload: UpdateCosechaPayload) => {
      setIsSaving(true)
      setError(null)
      try {
        await updateCosecha(payload)
        await refreshCosechas()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo actualizar la cosecha.'
        setError(message)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [refreshCosechas],
  )

  return {
    cosechas,
    isLoading,
    isSaving,
    error,
    refreshCosechas,
    saveNewCosecha,
    saveCosechaChanges,
  }
}
