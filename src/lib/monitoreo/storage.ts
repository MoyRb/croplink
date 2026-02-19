import type {
  MonitoringPoint,
  MonitoringSector,
  MonitoringSession,
  PlantCapture,
  SessionConfig,
} from './types'

const STORAGE_KEY = 'croplink:monitoring:sessions'

const buildPlants = (count: number): PlantCapture[] =>
  Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    name: `Planta ${index + 1}`,
    metrics: {},
    hallazgos: [],
  }))

const buildPoints = (count: number, plantasPorPunto: number, metrosMuestreados: number): MonitoringPoint[] =>
  Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    name: `Punto ${index + 1}`,
    metrosMuestreados,
    conteoEnMetros: 0,
    plantas: buildPlants(plantasPorPunto),
  }))

const buildSector = (name: string, config: SessionConfig): MonitoringSector => ({
  id: crypto.randomUUID(),
  name,
  tunnel: config.tunnel,
  valve: config.valve,
  points: buildPoints(config.puntosPorSector, config.plantasPorPunto, config.metrosMuestreados),
})

export const getSessions = (): MonitoringSession[] => {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as MonitoringSession[]
  } catch {
    return []
  }
}

const saveSessions = (sessions: MonitoringSession[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export const createSession = (config: SessionConfig): MonitoringSession => {
  const now = new Date().toISOString()
  const session: MonitoringSession = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'IN_PROGRESS',
    config,
    sectors: [buildSector(config.sector || 'Sector 1', config)],
  }

  const sessions = getSessions()
  saveSessions([session, ...sessions])
  return session
}

export const getSessionById = (id: string) => getSessions().find((session) => session.id === id)

export const updateSession = (id: string, updater: (session: MonitoringSession) => MonitoringSession) => {
  const sessions = getSessions()
  const next = sessions.map((session) => {
    if (session.id !== id) return session
    const updated = updater(session)
    return { ...updated, updatedAt: new Date().toISOString() }
  })
  saveSessions(next)
  return next.find((session) => session.id === id)
}

export const addSectorToSession = (id: string) =>
  updateSession(id, (session) => {
    const newSectorName = `Sector ${session.sectors.length + 1}`
    return {
      ...session,
      sectors: [...session.sectors, buildSector(newSectorName, session.config)],
    }
  })

export { STORAGE_KEY as MONITOREO_STORAGE_KEY }
