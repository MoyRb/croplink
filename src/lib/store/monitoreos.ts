import { useEffect, useMemo, useState } from 'react'

export type CondicionMeteorologica = 'Soleado' | 'Nublado' | 'Lluvia' | 'Viento' | 'Otro'

export type EtapaFenologica = 'Vegetativa' | 'Floración' | 'Fructificación' | 'Cosecha' | 'Poda'

export type HallazgoTipo =
  | 'Plaga'
  | 'Enfermedad'
  | 'Insectos benéficos'
  | 'Desarrollo'
  | 'Nutrición'

export type HallazgoSeveridad = 'Baja' | 'Media' | 'Alta'

export type Hallazgo = {
  tipo: HallazgoTipo
  nota: string
  severidad: HallazgoSeveridad
}

export type Punto = {
  index: number
  conteoPorMetroLineal: number
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
  umbralPC: number | null
  umbralPROM: number | null
  puntos: Punto[]
  hallazgos: Hallazgo[]
}

export type PuntoDraft = Omit<Punto, 'conteoPorMetroLineal'> & {
  conteoPorMetroLineal: string
}

export type MonitoreoDraft = Omit<
  Monitoreo,
  'puntos' |
    'humedadRelativa' |
    'temperatura' |
    'numSector' |
    'numValvula' |
    'umbralPC' |
    'umbralPROM'
> & {
  puntos: PuntoDraft[]
  humedadRelativa: string
  temperatura: string
  numSector: string
  numValvula: string
  umbralPC: string
  umbralPROM: string
}

export type NuevoMonitoreo = Omit<Monitoreo, 'id' | 'createdAt'> & {
  id?: string
  createdAt?: string
}

const STORAGE_KEY = 'croplink.monitoreos'
const DRAFT_KEY = 'croplink.monitoreos.draft'

const buildPuntos = (conteos: number[]): Punto[] =>
  conteos.map((conteo, index) => ({
    index: index + 1,
    conteoPorMetroLineal: conteo,
  }))

const monitoreosIniciales: Monitoreo[] = [
  {
    id: 'MON-2001',
    createdAt: '2024-08-18T09:10:00.000Z',
    rancho: 'La Esperanza',
    cultivo: 'Tomate Saladette',
    humedadRelativa: 62,
    temperatura: 27,
    condicionMeteorologica: 'Soleado',
    etapaFenologica: 'Vegetativa',
    numSector: 3,
    numValvula: 12,
    umbralPC: 7.5,
    umbralPROM: 6.8,
    puntos: buildPuntos([7, 6.8, 7.2, 7.1, 7.4, 7.6, 7.3, 7.5]),
    hallazgos: [
      { tipo: 'Plaga', nota: 'Revisión con presencia leve en hilera 4.', severidad: 'Media' },
      { tipo: 'Nutrición', nota: 'Falta de uniformidad en hojas nuevas.', severidad: 'Baja' },
    ],
  },
  {
    id: 'MON-2002',
    createdAt: '2024-08-21T13:40:00.000Z',
    rancho: 'San Miguel',
    cultivo: 'Pimiento Morrón',
    humedadRelativa: 68,
    temperatura: 24,
    condicionMeteorologica: 'Nublado',
    etapaFenologica: 'Fructificación',
    numSector: 1,
    numValvula: 4,
    umbralPC: null,
    umbralPROM: null,
    puntos: buildPuntos([5.8, 6, 6.1, 6.4, 5.9, 6.3, 6.2, 6.1]),
    hallazgos: [
      { tipo: 'Insectos benéficos', nota: 'Alta presencia de crisopas.', severidad: 'Baja' },
      { tipo: 'Desarrollo', nota: 'Desfase ligero entre líneas.', severidad: 'Media' },
    ],
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
  const total = puntos.reduce((acc, punto) => acc + punto.conteoPorMetroLineal, 0)
  return total / puntos.length
}

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
    const promedioGeneral =
      total === 0
        ? 0
        : monitoreos.reduce((acc, monitoreo) => acc + getPromedioDensidad(monitoreo.puntos), 0) /
          total
    return { total, promedioGeneral }
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
        umbralPC: data.umbralPC,
        umbralPROM: data.umbralPROM,
        puntos: data.puntos,
        hallazgos: data.hallazgos,
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
