export type RecommendationMode = 'FOLIAR_DRENCH' | 'VIA_RIEGO'

export type RecomendacionProducto = {
  producto: string
  ingredienteActivo: string
  dosis: string
  gasto: string
  gastoTotal: string
  sector: string
}

export type RecomendacionViaRiegoFila = {
  sector: string
  valvula: string
  superficie: string
  productos: string[]
}

export type Recomendacion = {
  id: string
  modo: RecommendationMode
  titulo: string
  huerta: string
  superficie: string
  solicita: string
  modoAplicacion: string
  justificacion: string
  fechaRecomendacion: string
  semana: string
  equipoAplicacion: string
  operario: string
  fechaAplicacion: string
  phMezcla: string
  horaInicio: string
  horaTermino: string
  comentarios: string
  productos: RecomendacionProducto[]
  dosisPorHa: string[]
  riegoFilas: RecomendacionViaRiegoFila[]
  createdAt: string
}

const STORAGE_KEY = 'croplink:recomendaciones'

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

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `REC-${crypto.randomUUID()}`
  }

  return `REC-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const getRecomendaciones = () => readStorage<Recomendacion[]>(STORAGE_KEY, [])

export const getRecomendacionById = (id: string) => getRecomendaciones().find((item) => item.id === id)

export const createRecomendacion = (payload: Omit<Recomendacion, 'id' | 'createdAt'>) => {
  const recomendaciones = getRecomendaciones()
  const recomendacion: Recomendacion = {
    ...payload,
    id: createId(),
    createdAt: new Date().toISOString(),
  }

  const updated = [recomendacion, ...recomendaciones]
  writeStorage(STORAGE_KEY, updated)
  return recomendacion
}
