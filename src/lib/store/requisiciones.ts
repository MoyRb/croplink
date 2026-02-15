import { useEffect, useMemo, useState } from 'react'

export type RequisicionEstado =
  | 'Pendiente'
  | 'En revisión'
  | 'En comparativa'
  | 'Aprobada'
  | 'Rechazada'
  | 'Completada'

export type RequisicionAdjunto = {
  nombre: string
  tamano: string
  url?: string
}

export type RequisicionItemMetadata = {
  crop: string
  target_type: 'Plaga' | 'Enfermedad'
  target_common: string
  target_common_norm: string
  market: 'MX' | 'USA' | 'Todos'
  resistance_class?: string
  chemical_group?: string
  safety_interval?: string
  reentry_period?: string
  interval_between_applications?: string
  max_applications?: string
  registration?: string
  observations?: string
  sheet?: string
}

export type RequisicionItem = {
  id: string
  product_id: string
  commercial_name: string
  active_ingredient: string
  quantity: number
  unit: string
  notes?: string
  metadata: RequisicionItemMetadata
}

export type Requisicion = {
  id: string
  producto: string
  cantidad: number
  unidad: 'kg' | 'L' | 'pza'
  centroCosto: 'Operaciones' | 'Compras' | 'Mantenimiento' | 'Campo'
  prioridad: 'Baja' | 'Media' | 'Alta'
  notas?: string
  estado: RequisicionEstado
  total: number
  fecha: string
  adjunto?: RequisicionAdjunto
  items?: RequisicionItem[]
}

export type NuevaRequisicion = Omit<Requisicion, 'id' | 'estado' | 'fecha' | 'total'> & {
  total?: number
  fecha?: string
  estado?: RequisicionEstado
}

const STORAGE_KEY = 'croplink.requisiciones'

const requisicionesIniciales: Requisicion[] = [
  {
    id: 'REQ-2042',
    producto: 'Fertilizante NPK 20-10-10',
    cantidad: 25,
    unidad: 'kg',
    centroCosto: 'Operaciones',
    prioridad: 'Alta',
    notas: 'Entrega requerida antes del cierre de mes.',
    estado: 'En revisión',
    total: 4800,
    fecha: '2024-06-02',
    adjunto: {
      nombre: 'Ficha-tecnica-npk.pdf',
      tamano: '1.2 MB',
      url: '/docs/ficha-tecnica-npk.pdf',
    },
  },
  {
    id: 'REQ-2043',
    producto: 'Lubricante hidráulico ISO 68',
    cantidad: 40,
    unidad: 'L',
    centroCosto: 'Mantenimiento',
    prioridad: 'Media',
    notas: 'Reponer stock para cuadrillas nocturnas.',
    estado: 'En comparativa',
    total: 9200,
    fecha: '2024-06-04',
  },
  {
    id: 'REQ-2044',
    producto: 'Sacos de semillas certificadas',
    cantidad: 120,
    unidad: 'pza',
    centroCosto: 'Compras',
    prioridad: 'Alta',
    notas: 'Coordinar con proveedor homologado.',
    estado: 'Aprobada',
    total: 12000,
    fecha: '2024-06-06',
    adjunto: {
      nombre: 'Semillas-certificadas.pdf',
      tamano: '860 KB',
      url: '/docs/semillas-certificadas.pdf',
    },
  },
  {
    id: 'REQ-2045',
    producto: 'Tubería PVC 2"',
    cantidad: 80,
    unidad: 'pza',
    centroCosto: 'Campo',
    prioridad: 'Media',
    notas: 'Reforzar líneas secundarias de riego.',
    estado: 'Pendiente',
    total: 6400,
    fecha: '2024-06-08',
  },
  {
    id: 'REQ-2046',
    producto: 'Herbicida selectivo post-emergente',
    cantidad: 18,
    unidad: 'L',
    centroCosto: 'Operaciones',
    prioridad: 'Alta',
    notas: 'Aplicación programada para la próxima semana.',
    estado: 'Rechazada',
    total: 5700,
    fecha: '2024-06-09',
  },
  {
    id: 'REQ-2047',
    producto: 'Kit de sensores de humedad',
    cantidad: 6,
    unidad: 'pza',
    centroCosto: 'Mantenimiento',
    prioridad: 'Baja',
    notas: 'Finalizar instalación en lote norte.',
    estado: 'Completada',
    total: 3100,
    fecha: '2024-06-01',
  },
]

const getStoredRequisiciones = () => {
  if (typeof window === 'undefined') {
    return requisicionesIniciales
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return requisicionesIniciales
  }

  try {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Requisicion[]
    }
  } catch {
    return requisicionesIniciales
  }

  return requisicionesIniciales
}

const getNextRequisicionId = (requisiciones: Requisicion[]) => {
  const max = requisiciones.reduce((acc, requisicion) => {
    const numeric = Number(requisicion.id.replace(/\D/g, ''))
    return Number.isNaN(numeric) ? acc : Math.max(acc, numeric)
  }, 2000)

  return `REQ-${String(max + 1).padStart(4, '0')}`
}

export function useRequisicionesStore() {
  const [requisiciones, setRequisiciones] = useState<Requisicion[]>(() => getStoredRequisiciones())

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requisiciones))
  }, [requisiciones])

  const stats = useMemo(() => {
    const pendientes = requisiciones.filter((requisicion) => requisicion.estado === 'Pendiente').length
    const enRevision = requisiciones.filter((requisicion) => requisicion.estado === 'En revisión').length
    const comparativa = requisiciones.filter((requisicion) => requisicion.estado === 'En comparativa').length
    return { pendientes, enRevision, comparativa }
  }, [requisiciones])

  const addRequisicion = (data: NuevaRequisicion) => {
    setRequisiciones((prev) => {
      const nueva: Requisicion = {
        id: getNextRequisicionId(prev),
        producto: data.producto,
        cantidad: data.cantidad,
        unidad: data.unidad,
        centroCosto: data.centroCosto,
        prioridad: data.prioridad,
        notas: data.notas,
        estado: data.estado ?? 'Pendiente',
        total: data.total ?? 0,
        fecha: data.fecha ?? new Date().toISOString().slice(0, 10),
        adjunto: data.adjunto,
        items: data.items ?? [],
      }

      return [nueva, ...prev]
    })
  }

  return {
    requisiciones,
    stats,
    addRequisicion,
  }
}
