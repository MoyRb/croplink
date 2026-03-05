import { supabase } from '../supabaseClient'
import type { Hallazgo, MonitoringPoint, MonitoringSector, MonitoringSession, SessionConfig } from './types'

type ProfileOrgRow = { organization_id: string | null }

type MonitoringSessionRow = {
  id: string
  status: 'in_progress' | 'paused' | 'completed'
  monitoring_type: 'desarrollo' | 'nutricion'
  production_system: 'hidroponico' | 'suelo' | null
  weather_condition: string | null
  phenological_stage: string | null
  config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type MonitoringSectorRow = {
  id: string
  session_id: string
  name_snapshot: string | null
  tunnel_snapshot: string | null
  valve_snapshot: string | null
  sort_order: number
}

type MonitoringPointRow = {
  id: string
  monitoring_sector_id: string
  point_index: number
  metros_muestreados: number | null
  conteo_en_metros: number | null
}

type MonitoringPlantRow = {
  id: string
  monitoring_point_id: string
  plant_index: number
  metrics: Record<string, unknown> | null
}

type MonitoringFindingRow = {
  id: string
  monitoring_plant_id: string
  tipo: string
  descripcion: string | null
  pc: number | null
  severity: string | null
  photos: string[] | null
}

const createUuid = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

const mapStatusFromDb = (status: MonitoringSessionRow['status']): MonitoringSession['status'] => {
  if (status === 'paused') return 'PAUSED'
  if (status === 'completed') return 'COMPLETED'
  return 'IN_PROGRESS'
}

const mapStatusToDb = (status: MonitoringSession['status']) =>
  status === 'PAUSED' ? 'paused' : status === 'COMPLETED' ? 'completed' : 'in_progress'

const getCurrentUserAndOrganization = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error(authError?.message || 'No hay un usuario autenticado.')

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', authData.user.id)
    .single<ProfileOrgRow>()

  if (profileError || !profileData?.organization_id) {
    throw new Error(profileError?.message || 'No hay organización asociada al usuario.')
  }

  return { organizationId: profileData.organization_id }
}

const normalizeConfig = (session: MonitoringSessionRow): SessionConfig => {
  const raw = session.config ?? {}
  const config = (raw.config as Partial<SessionConfig> | undefined) ?? (raw as Partial<SessionConfig>)

  return {
    rancho: (config.rancho as string) || '',
    cultivo: (config.cultivo as string) || '',
    superficie: typeof config.superficie === 'number' ? config.superficie : undefined,
    sector: (config.sector as string) || '',
    tunnel: (config.tunnel as string) || undefined,
    valve: (config.valve as string) || undefined,
    humedadRelativa: typeof config.humedadRelativa === 'number' ? config.humedadRelativa : undefined,
    temperatura: typeof config.temperatura === 'number' ? config.temperatura : undefined,
    condicionMeteorologica: (session.weather_condition as SessionConfig['condicionMeteorologica']) || 'Soleado',
    etapaFenologica: (session.phenological_stage as SessionConfig['etapaFenologica']) || 'vegetativa',
    puntosPorSector: Number(config.puntosPorSector) || 1,
    plantasPorPunto: Number(config.plantasPorPunto) || 1,
    metrosMuestreados: Number(config.metrosMuestreados) || 1,
    tipoMonitoreo: session.monitoring_type === 'nutricion' ? 'NUTRICION' : 'DESARROLLO',
    sistemaProduccion:
      session.production_system === 'suelo'
        ? 'SUELO'
        : session.production_system === 'hidroponico'
          ? 'HIDROPONICO'
          : undefined,
    umbrales: Array.isArray(config.umbrales) ? (config.umbrales as SessionConfig['umbrales']) : [],
  }
}

const mapRowsToSession = (
  session: MonitoringSessionRow,
  sectors: MonitoringSectorRow[],
  points: MonitoringPointRow[],
  plants: MonitoringPlantRow[],
  findings: MonitoringFindingRow[],
): MonitoringSession => {
  const sessionSectors: MonitoringSector[] = sectors
    .filter((sector) => sector.session_id === session.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((sector) => {
      const sectorPoints: MonitoringPoint[] = points
        .filter((point) => point.monitoring_sector_id === sector.id)
        .sort((a, b) => a.point_index - b.point_index)
        .map((point) => ({
          id: point.id,
          name: `Punto ${point.point_index}`,
          metrosMuestreados: Number(point.metros_muestreados) || 0,
          conteoEnMetros: Number(point.conteo_en_metros) || 0,
          plantas: plants
            .filter((plant) => plant.monitoring_point_id === point.id)
            .sort((a, b) => a.plant_index - b.plant_index)
            .map((plant) => ({
              id: plant.id,
              name: `Planta ${plant.plant_index}`,
              metrics: (plant.metrics as Record<string, number | string>) || {},
              hallazgos: findings
                .filter((finding) => finding.monitoring_plant_id === plant.id)
                .map(
                  (finding): Hallazgo => ({
                    id: finding.id,
                    tipo: finding.tipo as Hallazgo['tipo'],
                    descripcion: finding.descripcion || '',
                    pc: finding.pc ?? undefined,
                    severidad: (finding.severity as Hallazgo['severidad']) || undefined,
                    fotos: Array.isArray(finding.photos) ? finding.photos : [],
                  }),
                ),
            })),
        }))

      return {
        id: sector.id,
        name: sector.name_snapshot || `Sector ${sector.sort_order + 1}`,
        tunnel: sector.tunnel_snapshot || undefined,
        valve: sector.valve_snapshot || undefined,
        points: sectorPoints,
      }
    })

  return {
    id: session.id,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    status: mapStatusFromDb(session.status),
    config: normalizeConfig(session),
    sectors: sessionSectors,
  }
}

const buildFromConfig = (config: SessionConfig): MonitoringSession => {
  const now = new Date().toISOString()
  return {
    id: createUuid(),
    createdAt: now,
    updatedAt: now,
    status: 'IN_PROGRESS',
    config,
    sectors: [
      {
        id: createUuid(),
        name: config.sector || 'Sector 1',
        tunnel: config.tunnel,
        valve: config.valve,
        points: Array.from({ length: config.puntosPorSector }, (_, pIndex) => ({
          id: createUuid(),
          name: `Punto ${pIndex + 1}`,
          metrosMuestreados: config.metrosMuestreados,
          conteoEnMetros: 0,
          plantas: Array.from({ length: config.plantasPorPunto }, (_, plIndex) => ({
            id: createUuid(),
            name: `Planta ${plIndex + 1}`,
            metrics: {},
            hallazgos: [],
          })),
        })),
      },
    ],
  }
}

export const getSessions = async (): Promise<MonitoringSession[]> => {
  const { organizationId } = await getCurrentUserAndOrganization()
  const { data: sessionRows, error } = await supabase
    .from('monitoring_sessions')
    .select('id, status, monitoring_type, production_system, weather_condition, phenological_stage, config, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const sessions = (sessionRows ?? []) as MonitoringSessionRow[]
  if (sessions.length === 0) return []

  const sessionIds = sessions.map((session) => session.id)
  const [{ data: sectorsData, error: sectorsError }, { data: pointsData, error: pointsError }, { data: plantsData, error: plantsError }, { data: findingsData, error: findingsError }] = await Promise.all([
    supabase.from('monitoring_sectors').select('id, session_id, name_snapshot, tunnel_snapshot, valve_snapshot, sort_order').in('session_id', sessionIds),
    supabase.from('monitoring_points').select('id, monitoring_sector_id, point_index, metros_muestreados, conteo_en_metros').in('session_id', sessionIds),
    supabase.from('monitoring_plants').select('id, monitoring_point_id, plant_index, metrics').in('session_id', sessionIds),
    supabase.from('monitoring_findings').select('id, monitoring_plant_id, tipo, descripcion, pc, severity, photos').in('session_id', sessionIds),
  ])

  if (sectorsError || pointsError || plantsError || findingsError) {
    throw new Error(sectorsError?.message || pointsError?.message || plantsError?.message || findingsError?.message)
  }

  return sessions.map((session) =>
    mapRowsToSession(
      session,
      (sectorsData ?? []) as MonitoringSectorRow[],
      (pointsData ?? []) as MonitoringPointRow[],
      (plantsData ?? []) as MonitoringPlantRow[],
      (findingsData ?? []) as MonitoringFindingRow[],
    ),
  )
}

export const getSessionById = async (id: string) => {
  const sessions = await getSessions()
  return sessions.find((session) => session.id === id) ?? null
}

const persistSessionTree = async (organizationId: string, session: MonitoringSession) => {
  const { error: delFindingsError } = await supabase.from('monitoring_findings').delete().eq('session_id', session.id)
  if (delFindingsError) throw new Error(delFindingsError.message)
  const { error: delPlantsError } = await supabase.from('monitoring_plants').delete().eq('session_id', session.id)
  if (delPlantsError) throw new Error(delPlantsError.message)
  const { error: delPointsError } = await supabase.from('monitoring_points').delete().eq('session_id', session.id)
  if (delPointsError) throw new Error(delPointsError.message)
  const { error: delSectorsError } = await supabase.from('monitoring_sectors').delete().eq('session_id', session.id)
  if (delSectorsError) throw new Error(delSectorsError.message)

  const sectorRows = session.sectors.map((sector, index) => ({
    id: sector.id,
    organization_id: organizationId,
    session_id: session.id,
    name_snapshot: sector.name,
    tunnel_snapshot: sector.tunnel ?? null,
    valve_snapshot: sector.valve ?? null,
    sort_order: index,
  }))
  const { error: sectorInsertError } = await supabase.from('monitoring_sectors').insert(sectorRows)
  if (sectorInsertError) throw new Error(sectorInsertError.message)

  const pointRows = session.sectors.flatMap((sector) =>
    sector.points.map((point, index) => ({
      id: point.id,
      organization_id: organizationId,
      session_id: session.id,
      monitoring_sector_id: sector.id,
      point_index: index + 1,
      metros_muestreados: point.metrosMuestreados,
      conteo_en_metros: point.conteoEnMetros,
      density: point.metrosMuestreados > 0 ? point.conteoEnMetros / point.metrosMuestreados : null,
    })),
  )
  if (pointRows.length > 0) {
    const { error: pointInsertError } = await supabase.from('monitoring_points').insert(pointRows)
    if (pointInsertError) throw new Error(pointInsertError.message)
  }

  const plantRows = session.sectors.flatMap((sector) =>
    sector.points.flatMap((point) =>
      point.plantas.map((plant, index) => ({
        id: plant.id,
        organization_id: organizationId,
        session_id: session.id,
        monitoring_point_id: point.id,
        plant_index: index + 1,
        metrics: plant.metrics,
      })),
    ),
  )
  if (plantRows.length > 0) {
    const { error: plantInsertError } = await supabase.from('monitoring_plants').insert(plantRows)
    if (plantInsertError) throw new Error(plantInsertError.message)
  }

  const findingRows = session.sectors.flatMap((sector) =>
    sector.points.flatMap((point) =>
      point.plantas.flatMap((plant) =>
        plant.hallazgos.map((finding) => ({
          id: finding.id,
          organization_id: organizationId,
          session_id: session.id,
          monitoring_plant_id: plant.id,
          tipo: finding.tipo,
          descripcion: finding.descripcion || null,
          pc: finding.pc ?? null,
          severity: finding.severidad ?? null,
          photos: finding.fotos,
        })),
      ),
    ),
  )

  if (findingRows.length > 0) {
    const { error: findingInsertError } = await supabase.from('monitoring_findings').insert(findingRows)
    if (findingInsertError) throw new Error(findingInsertError.message)
  }
}

export const createSession = async (config: SessionConfig): Promise<MonitoringSession> => {
  const { organizationId } = await getCurrentUserAndOrganization()
  const session = buildFromConfig(config)

  const { error } = await supabase.from('monitoring_sessions').insert({
    id: session.id,
    organization_id: organizationId,
    status: 'in_progress',
    monitoring_type: config.tipoMonitoreo === 'NUTRICION' ? 'nutricion' : 'desarrollo',
    production_system:
      config.sistemaProduccion === 'SUELO' ? 'suelo' : config.sistemaProduccion === 'HIDROPONICO' ? 'hidroponico' : null,
    weather_condition: config.condicionMeteorologica,
    phenological_stage: config.etapaFenologica,
    config,
  })
  if (error) throw new Error(error.message)

  await persistSessionTree(organizationId, session)
  return session
}

export const updateSession = async (id: string, updater: (session: MonitoringSession) => MonitoringSession) => {
  const { organizationId } = await getCurrentUserAndOrganization()
  const current = await getSessionById(id)
  if (!current) return null
  const next = { ...updater(current), updatedAt: new Date().toISOString() }

  const { error: updateError } = await supabase
    .from('monitoring_sessions')
    .update({
      status: mapStatusToDb(next.status),
      monitoring_type: next.config.tipoMonitoreo === 'NUTRICION' ? 'nutricion' : 'desarrollo',
      production_system:
        next.config.sistemaProduccion === 'SUELO'
          ? 'suelo'
          : next.config.sistemaProduccion === 'HIDROPONICO'
            ? 'hidroponico'
            : null,
      weather_condition: next.config.condicionMeteorologica,
      phenological_stage: next.config.etapaFenologica,
      config: next.config,
    })
    .eq('id', id)
  if (updateError) throw new Error(updateError.message)

  await persistSessionTree(organizationId, next)
  return next
}

export const addSectorToSession = (id: string) =>
  updateSession(id, (session) => {
    const newSectorName = `Sector ${session.sectors.length + 1}`
    const newSector: MonitoringSector = {
      id: createUuid(),
      name: newSectorName,
      tunnel: session.config.tunnel,
      valve: session.config.valve,
      points: Array.from({ length: session.config.puntosPorSector }, (_, index) => ({
        id: createUuid(),
        name: `Punto ${index + 1}`,
        metrosMuestreados: session.config.metrosMuestreados,
        conteoEnMetros: 0,
        plantas: Array.from({ length: session.config.plantasPorPunto }, (_, plantIndex) => ({
          id: createUuid(),
          name: `Planta ${plantIndex + 1}`,
          metrics: {},
          hallazgos: [],
        })),
      })),
    }

    return { ...session, sectors: [...session.sectors, newSector] }
  })
