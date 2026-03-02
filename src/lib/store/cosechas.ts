import { addWorkLogsBatch, resolveTarifaActividad, type WorkLog } from './nomina'

export type CuadrillaEntry = {
  empleadoId: string
  unidades: number
}

export type Cosecha = {
  id: string
  fecha: string
  ranchoId: string
  ranchoNombre: string
  cultivo: string
  temporada: string
  sectorId: string
  sectorNombre: string
  unidad: string
  cantidadTotal: number
  actividad: string
  tarifa: number
  totalPagado: number
  costoUnitario: number
  cuadrilla: CuadrillaEntry[]
  workLogIds: string[]
  createdAt: string
}

const STORAGE_KEY = 'croplink:cosechas'

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const readStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  return safeParse(window.localStorage.getItem(key), fallback)
}

const writeStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const getCosechas = () => readStorage<Cosecha[]>(STORAGE_KEY, [])

export const getCosechaById = (id: string) => getCosechas().find((item) => item.id === id)

export const createCosecha = (payload: {
  fecha: string
  ranchoId: string
  ranchoNombre: string
  cultivo: string
  temporada: string
  sectorId: string
  sectorNombre: string
  unidad: string
  cantidadTotal: number
  actividad: string
  cuadrilla: CuadrillaEntry[]
}) => {
  const tarifaItem = resolveTarifaActividad({
    actividad: payload.actividad,
    rancho: payload.ranchoId,
    cultivo: payload.cultivo,
    temporada: payload.temporada,
  })
  const tarifa = tarifaItem?.tarifa ?? 0
  const totalPagado = payload.cuadrilla.reduce((sum, row) => sum + row.unidades * tarifa, 0)
  const costoUnitario = payload.cantidadTotal > 0 ? totalPagado / payload.cantidadTotal : 0

  const createdAt = new Date().toISOString()
  const workLogPayloads: Omit<WorkLog, 'id' | 'createdAt' | 'status' | 'amount' | 'paymentId'>[] = payload.cuadrilla
    .filter((row) => row.unidades > 0)
    .map((row) => ({
      date: payload.fecha,
      employeeId: row.empleadoId,
      ranchId: payload.ranchoId,
      activity: payload.actividad,
      payType: 'POR_UNIDAD',
      units: row.unidades,
      rateUsed: tarifa,
      notes: `Cosecha ${payload.cultivo} ${payload.temporada}`,
    }))

  const { createdLogs } = addWorkLogsBatch(workLogPayloads)

  const newEntry: Cosecha = {
    id: createId('COS'),
    fecha: payload.fecha,
    ranchoId: payload.ranchoId,
    ranchoNombre: payload.ranchoNombre,
    cultivo: payload.cultivo,
    temporada: payload.temporada,
    sectorId: payload.sectorId,
    sectorNombre: payload.sectorNombre,
    unidad: payload.unidad,
    cantidadTotal: payload.cantidadTotal,
    actividad: payload.actividad,
    tarifa,
    totalPagado,
    costoUnitario,
    cuadrilla: payload.cuadrilla,
    workLogIds: createdLogs.map((log) => log.id),
    createdAt,
  }

  const cosechas = getCosechas()
  const updated = [newEntry, ...cosechas]
  writeStorage(STORAGE_KEY, updated)
  return { cosecha: newEntry, cosechas: updated }
}
