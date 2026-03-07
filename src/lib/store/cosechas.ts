import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../supabaseClient'

export type CuadrillaEntry = {
  empleadoId: string
  empleadoNombre?: string
  unidades: number
  rateUsed: number
  amount: number
  workLogId?: string
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
  unidad: string
  cantidadTotal: number
  actividad: string
  tarifa: number
  totalPagado: number
  costoUnitario: number
  notes?: string
  cuadrilla: CuadrillaEntry[]
  workLogIds: string[]
  createdAt: string
  updatedAt: string
}

export type HarvestEmployee = { id: string; nombreCompleto: string }
export type HarvestActivity = { actividad: string; unidad: string }

export type CreateCosechaPayload = {
  fecha: string
  ranchoId: string
  cropId: string
  seasonId: string
  sectorId: string
  unidad: string
  cantidadTotal: number
  actividad: string
  notes?: string
  cuadrilla: Array<{ empleadoId: string; unidades: number }>
}

export type UpdateCosechaPayload = {
  id: string
  fecha: string
  unidad: string
  cantidadTotal: number
  actividad: string
  notes?: string
}

type ProfileOrgRow = { organization_id: string | null }

type HarvestRow = {
  id: string
  date: string
  ranch_id: string
  crop_id: string
  season_id: string
  sector_id: string
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

type ActivityRateRow = {
  activity: string
  unit: string
  rate: number
  ranch_id: string | null
  crop_id: string | null
  season_id: string | null
}

const fromMaybeArray = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
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

  const cuadrilla = (row.harvest_crews ?? []).map((crew) => ({
    empleadoId: crew.employee_id,
    empleadoNombre: fromMaybeArray(crew.employees)?.full_name ?? undefined,
    unidades: Number(crew.units ?? 0),
    rateUsed: Number(crew.rate_used ?? 0),
    amount: Number(crew.amount ?? 0),
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
    sectorId: row.sector_id,
    sectorNombre: sector?.name ?? 'Sector',
    unidad: row.unit,
    cantidadTotal: Number(row.total_quantity ?? 0),
    actividad: row.activity,
    tarifa: Number(row.rate_used ?? 0),
    totalPagado: Number(row.total_paid ?? 0),
    costoUnitario: Number(row.unit_cost ?? 0),
    notes: row.notes ?? undefined,
    cuadrilla,
    workLogIds: (row.harvest_work_logs ?? []).map((item) => item.work_log_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const resolveTarifaActividad = async (params: {
  organizationId: string
  actividad: string
  ranchoId: string
  cropId: string
  seasonId: string
}) => {
  const { data, error } = await supabase
    .from('activity_rates')
    .select('activity, unit, rate, ranch_id, crop_id, season_id')
    .eq('organization_id', params.organizationId)
    .ilike('activity', params.actividad)

  if (error) throw new Error(error.message)
  const matches = ((data ?? []) as ActivityRateRow[]).filter((rate) => {
    if (rate.ranch_id && rate.ranch_id !== params.ranchoId) return false
    if (rate.crop_id && rate.crop_id !== params.cropId) return false
    if (rate.season_id && rate.season_id !== params.seasonId) return false
    return true
  })

  if (matches.length === 0) {
    throw new Error('No existe tarifa de actividad para el contexto seleccionado.')
  }

  const score = (rate: ActivityRateRow) => (rate.ranch_id ? 4 : 0) + (rate.crop_id ? 2 : 0) + (rate.season_id ? 1 : 0)

  return [...matches].sort((a, b) => score(b) - score(a))[0]
}

export async function listCosechas() {
  const { data, error } = await supabase
    .from('harvests')
    .select(
      `
      id,
      date,
      ranch_id,
      crop_id,
      season_id,
      sector_id,
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
      harvest_crews (employee_id, units, rate_used, amount, employees:employee_id (full_name)),
      harvest_work_logs (work_log_id)
      `,
    )
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (((data as unknown) as HarvestRow[] | null) ?? []).map(mapHarvest)
}

export async function getCosechaById(id: string) {
  const { data, error } = await supabase
    .from('harvests')
    .select(
      `
      id,
      date,
      ranch_id,
      crop_id,
      season_id,
      sector_id,
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
      harvest_crews (employee_id, units, rate_used, amount, employees:employee_id (full_name)),
      harvest_work_logs (work_log_id)
      `,
    )
    .eq('id', id)
    .single<HarvestRow>()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return mapHarvest(data)
}

export async function createCosecha(payload: CreateCosechaPayload) {
  const { organizationId } = await getCurrentUserAndOrganization()
  const activityRate = await resolveTarifaActividad({
    organizationId,
    actividad: payload.actividad,
    ranchoId: payload.ranchoId,
    cropId: payload.cropId,
    seasonId: payload.seasonId,
  })

  const tarifa = Number(activityRate.rate ?? 0)
  const totalPagado = payload.cuadrilla.reduce((sum, row) => sum + row.unidades * tarifa, 0)
  const costoUnitario = payload.cantidadTotal > 0 ? totalPagado / payload.cantidadTotal : 0

  const { data: createdHarvest, error: harvestError } = await supabase
    .from('harvests')
    .insert({
      organization_id: organizationId,
      date: payload.fecha,
      ranch_id: payload.ranchoId,
      crop_id: payload.cropId,
      season_id: payload.seasonId,
      sector_id: payload.sectorId,
      unit: payload.unidad,
      total_quantity: payload.cantidadTotal,
      activity: payload.actividad,
      rate_used: tarifa,
      total_paid: totalPagado,
      unit_cost: costoUnitario,
      notes: payload.notes?.trim() || null,
    })
    .select('id')
    .single<{ id: string }>()

  if (harvestError || !createdHarvest) throw new Error(harvestError?.message || 'No se pudo crear la cosecha.')

  const crewRows = payload.cuadrilla.map((row) => ({
    organization_id: organizationId,
    harvest_id: createdHarvest.id,
    employee_id: row.empleadoId,
    units: row.unidades,
    rate_used: tarifa,
    amount: row.unidades * tarifa,
  }))

  const workLogRows = payload.cuadrilla.map((row) => ({
    organization_id: organizationId,
    employee_id: row.empleadoId,
    date: payload.fecha,
    ranch_id: payload.ranchoId,
    activity: payload.actividad,
    pay_type: 'por_unidad',
    units: row.unidades,
    rate_used: tarifa,
    amount: row.unidades * tarifa,
    notes: payload.notes?.trim() || null,
  }))

  const { data: workLogs, error: workLogsError } = await supabase
    .from('work_logs')
    .insert(workLogRows)
    .select('id, employee_id')

  if (workLogsError) throw new Error(workLogsError.message)

  const { error: crewsError } = await supabase.from('harvest_crews').insert(crewRows)
  if (crewsError) throw new Error(crewsError.message)

  const harvestWorkLogsRows = (workLogs ?? []).map((item) => ({
    organization_id: organizationId,
    harvest_id: createdHarvest.id,
    work_log_id: item.id,
  }))

  if (harvestWorkLogsRows.length > 0) {
    const { error: linksError } = await supabase.from('harvest_work_logs').insert(harvestWorkLogsRows)
    if (linksError) throw new Error(linksError.message)
  }

  return createdHarvest.id
}

export async function updateCosecha(payload: UpdateCosechaPayload) {
  const { data: current, error: currentError } = await supabase
    .from('harvests')
    .select('total_paid')
    .eq('id', payload.id)
    .single<{ total_paid: number }>()

  if (currentError || !current) throw new Error(currentError?.message || 'No se pudo obtener la cosecha actual.')

  const unitCost = payload.cantidadTotal > 0 ? Number(current.total_paid) / payload.cantidadTotal : 0

  const { error } = await supabase
    .from('harvests')
    .update({
      date: payload.fecha,
      unit: payload.unidad,
      total_quantity: payload.cantidadTotal,
      activity: payload.actividad,
      unit_cost: unitCost,
      notes: payload.notes?.trim() || null,
    })
    .eq('id', payload.id)

  if (error) throw new Error(error.message)
}

export async function listHarvestEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data ?? []) as Array<{ id: string; full_name: string | null }>).map((item) => ({
    id: item.id,
    nombreCompleto: item.full_name ?? 'Empleado',
  }))
}

export async function listHarvestActivities() {
  const { organizationId } = await getCurrentUserAndOrganization()
  const { data, error } = await supabase
    .from('activity_rates')
    .select('activity, unit')
    .eq('organization_id', organizationId)
    .order('activity', { ascending: true })

  if (error) throw new Error(error.message)

  const map = new Map<string, HarvestActivity>()
  ;((data ?? []) as Array<{ activity: string; unit: string }>).forEach((item) => {
    if (!map.has(item.activity)) map.set(item.activity, { actividad: item.activity, unidad: item.unit })
  })

  return Array.from(map.values())
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
