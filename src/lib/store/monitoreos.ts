import { useEffect, useMemo, useState } from 'react'

export type CondicionMeteorologica = 'Soleado' | 'Nublado' | 'Lluvia' | 'Viento' | 'Mixto'

export type EtapaFenologica = 'Vegetativa' | 'Floración' | 'Fructificación' | 'Cosecha' | 'Poda'

export type TipoSector = 'Túnel' | 'Campo abierto'

export type TipoEvaluacion = 'Plantas' | 'CCT'

export type HallazgoCategoria =
  | 'Plaga'
  | 'Enfermedad'
  | 'Insectos benéficos'
  | 'Desarrollo'
  | 'Nutrición'
  | 'PC'

export type Hallazgo = {
  categoria: HallazgoCategoria
  tipoEvaluacion: TipoEvaluacion
}

export type Punto = {
  index: number
  densidadPlantas: number
  hallazgos: Hallazgo[]
  notas?: string
}

export type Monitoreo = {
  id: string
  createdAt: string
  rancho: string
  cultivo: string
  humedadRelativa: number
  temperatura: number
  condicionMeteorologica: CondicionMeteorologica
  etapaFenologica: EtapaFenologica
  numSector: number
  numValvula: number
  tipoSector: TipoSector
  umbralPC: number
  puntos: Punto[]
}

export type PuntoDraft = Omit<Punto, 'densidadPlantas'> & {
  densidadPlantas: string
}

export type MonitoreoDraft = Omit<Monitoreo, 'puntos'> & {
  puntos: PuntoDraft[]
}

export type NuevoMonitoreo = Omit<Monitoreo, 'id' | 'createdAt'> & {
  id?: string
  createdAt?: string
}

const STORAGE_KEY = 'croplink.monitoreos'
const DRAFT_KEY = 'croplink.monitoreos.draft'

const buildPuntos = (densidades: number[], hallazgos: Hallazgo[][] = []): Punto[] =>
  densidades.map((densidad, index) => ({
    index: index + 1,
    densidadPlantas: densidad,
    hallazgos: hallazgos[index] ?? [],
    notas: index % 2 === 0 ? 'Revisión sin observaciones mayores.' : 'Zona con variación ligera.',
  }))

const monitoreosIniciales: Monitoreo[] = [
  {
    id: 'MON-1001',
    createdAt: '2024-07-12T09:10:00.000Z',
    rancho: 'La Esperanza',
    cultivo: 'Tomate Saladette',
    humedadRelativa: 62,
    temperatura: 27,
    condicionMeteorologica: 'Soleado',
    etapaFenologica: 'Vegetativa',
    numSector: 3,
    numValvula: 12,
    tipoSector: 'Túnel',
    umbralPC: 7.5,
    puntos: buildPuntos([7, 6.8, 7.2, 7.1, 7.4, 7.6, 7.3, 7.5], [
      [{ categoria: 'Plaga', tipoEvaluacion: 'Plantas' }],
      [{ categoria: 'Insectos benéficos', tipoEvaluacion: 'Plantas' }],
      [{ categoria: 'Nutrición', tipoEvaluacion: 'CCT' }],
      [{ categoria: 'Desarrollo', tipoEvaluacion: 'Plantas' }],
      [{ categoria: 'Enfermedad', tipoEvaluacion: 'Plantas' }],
    ]),
  },
  {
    id: 'MON-1002',
    createdAt: '2024-07-15T13:40:00.000Z',
    rancho: 'San Miguel',
    cultivo: 'Pimiento Morrón',
    humedadRelativa: 68,
    temperatura: 24,
    condicionMeteorologica: 'Nublado',
    etapaFenologica: 'Fructificación',
    numSector: 1,
    numValvula: 4,
    tipoSector: 'Campo abierto',
    umbralPC: 6.2,
    puntos: buildPuntos([5.8, 6, 6.1, 6.4, 5.9, 6.3, 6.2, 6.1], [
      [{ categoria: 'Nutrición', tipoEvaluacion: 'CCT' }],
      [{ categoria: 'Plaga', tipoEvaluacion: 'Plantas' }],
      [{ categoria: 'Enfermedad', tipoEvaluacion: 'Plantas' }],
      [{ categoria: 'Desarrollo', tipoEvaluacion: 'Plantas' }],
    ]),
  },
]

const getStoredMonitoreos = () => {
  if (typeof window === 'undefined') {
    return monitoreosIniciales
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return monitoreosIniciales
  }

  try {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Monitoreo[]
    }
  } catch {
    return monitoreosIniciales
  }

  return monitoreosIniciales
}

const getStoredDraft = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(DRAFT_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as MonitoreoDraft
  } catch {
    return null
  }
}

export const getNextMonitoreoId = (monitoreos: Monitoreo[]) => {
  const max = monitoreos.reduce((acc, monitoreo) => {
    const numeric = Number(monitoreo.id.replace(/\D/g, ''))
    return Number.isNaN(numeric) ? acc : Math.max(acc, numeric)
  }, 1000)

  return `MON-${String(max + 1).padStart(4, '0')}`
}

export const getPromedioDensidad = (puntos: Punto[]) => {
  if (puntos.length === 0) return 0
  const total = puntos.reduce((acc, punto) => acc + punto.densidadPlantas, 0)
  return total / puntos.length
}

export const getEstadoPC = (promedio: number, umbral: number) =>
  promedio >= umbral ? 'Arriba del umbral' : 'Debajo del umbral'

export function useMonitoreosStore() {
  const [monitoreos, setMonitoreos] = useState<Monitoreo[]>(() => getStoredMonitoreos())
  const [draft, setDraft] = useState<MonitoreoDraft | null>(() => getStoredDraft())

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(monitoreos))
  }, [monitoreos])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (draft) {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } else {
      window.localStorage.removeItem(DRAFT_KEY)
    }
  }, [draft])

  const stats = useMemo(() => {
    const total = monitoreos.length
    const arribaUmbral = monitoreos.filter((monitoreo) => {
      const promedio = getPromedioDensidad(monitoreo.puntos)
      return promedio >= monitoreo.umbralPC
    }).length
    return { total, arribaUmbral }
  }, [monitoreos])

  const addMonitoreo = (data: NuevoMonitoreo) => {
    setMonitoreos((prev) => {
      const nuevo: Monitoreo = {
        id: data.id ?? getNextMonitoreoId(prev),
        createdAt: data.createdAt ?? new Date().toISOString(),
        rancho: data.rancho,
        cultivo: data.cultivo,
        humedadRelativa: data.humedadRelativa,
        temperatura: data.temperatura,
        condicionMeteorologica: data.condicionMeteorologica,
        etapaFenologica: data.etapaFenologica,
        numSector: data.numSector,
        numValvula: data.numValvula,
        tipoSector: data.tipoSector,
        umbralPC: data.umbralPC,
        puntos: data.puntos,
      }

      return [nuevo, ...prev]
    })
  }

  return {
    monitoreos,
    draft,
    stats,
    addMonitoreo,
    saveDraft: setDraft,
    clearDraft: () => setDraft(null),
  }
}
