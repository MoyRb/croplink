export type ActivoTipo = 'Vehículo' | 'Herramienta' | 'Equipo' | 'Consumible'

export type ActivoUbicacion = 'Bodega' | 'Rancho' | 'Taller' | 'Otro'

export type ActivoEstado = 'Activo' | 'En reparación' | 'Fuera de servicio' | 'Dado de baja'

export type Activo = {
  id: string
  tipo: ActivoTipo
  nombre: string
  categoria: string
  marca?: string
  modelo?: string
  serieVIN?: string
  placa?: string
  ubicacion: ActivoUbicacion
  ubicacionDetalle?: string
  responsable?: string
  estado: ActivoEstado
  fechaCompra?: string
  costoCompra?: number
  notas?: string
  createdAt: string
  updatedAt: string
}

export type MantenimientoTipo = 'Preventivo' | 'Correctivo'

export type MantenimientoEstatus = 'Programado' | 'Realizado' | 'Cancelado'

export type MantenimientoAdjunto = {
  name: string
  size: number
  type: string
  localUrl?: string
}

export type Mantenimiento = {
  id: string
  activoId: string
  tipo: MantenimientoTipo
  fecha: string
  proximoServicio?: string
  odometro?: number
  descripcion: string
  proveedor?: string
  costo: number
  estatus: MantenimientoEstatus
  adjunto?: MantenimientoAdjunto
  createdAt: string
}

export type ActivoFilters = {
  tipo?: ActivoTipo | 'Todos'
  estado?: ActivoEstado | 'Todos'
  ubicacion?: ActivoUbicacion | 'Todos'
  search?: string
}

const STORAGE_KEYS = {
  activos: 'croplink:activos',
  mantenimientos: 'croplink:mantenimientos',
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const nowIso = () => new Date().toISOString()

const demoActivos: Activo[] = [
  {
    id: 'ACT-1001',
    tipo: 'Vehículo',
    nombre: 'Camioneta Hilux 2021',
    categoria: 'Pickup',
    marca: 'Toyota',
    modelo: 'Hilux',
    serieVIN: 'JTEBK3FJ9K5123456',
    placa: 'CPX-4123',
    ubicacion: 'Rancho',
    ubicacionDetalle: 'Rancho El Roble',
    responsable: 'Miguel Álvarez',
    estado: 'Activo',
    fechaCompra: '2021-04-18',
    costoCompra: 620000,
    notas: 'Asignada a logística de campo.',
    createdAt: '2024-07-02T10:15:00.000Z',
    updatedAt: '2024-08-10T15:40:00.000Z',
  },
  {
    id: 'ACT-1002',
    tipo: 'Vehículo',
    nombre: 'Camioneta NP300 2020',
    categoria: 'Pickup',
    marca: 'Nissan',
    modelo: 'NP300',
    serieVIN: '3N6CM0KN9LK123789',
    placa: 'RAN-9087',
    ubicacion: 'Taller',
    ubicacionDetalle: 'Taller Central',
    responsable: 'Carlos Figueroa',
    estado: 'En reparación',
    fechaCompra: '2020-09-05',
    costoCompra: 540000,
    notas: 'Pendiente cambio de suspensión.',
    createdAt: '2024-07-05T09:30:00.000Z',
    updatedAt: '2024-08-22T11:10:00.000Z',
  },
  {
    id: 'ACT-1003',
    tipo: 'Herramienta',
    nombre: 'Taladro inalámbrico',
    categoria: 'Eléctrico',
    marca: 'Bosch',
    modelo: 'GSB 180',
    serieVIN: 'BOS-991827',
    ubicacion: 'Bodega',
    ubicacionDetalle: 'Bodega Central',
    responsable: 'Lucía Méndez',
    estado: 'Activo',
    fechaCompra: '2023-02-14',
    costoCompra: 3800,
    notas: 'Equipo compartido con cuadrilla A.',
    createdAt: '2024-07-08T12:00:00.000Z',
    updatedAt: '2024-08-14T09:20:00.000Z',
  },
  {
    id: 'ACT-1004',
    tipo: 'Equipo',
    nombre: 'Bomba de riego 7.5HP',
    categoria: 'Riego',
    marca: 'Honda',
    modelo: 'WB30',
    serieVIN: 'HON-447128',
    ubicacion: 'Rancho',
    ubicacionDetalle: 'Rancho San Miguel',
    responsable: 'José Castillo',
    estado: 'Activo',
    fechaCompra: '2022-06-10',
    costoCompra: 28500,
    notas: 'Programar revisión mensual.',
    createdAt: '2024-07-12T08:45:00.000Z',
    updatedAt: '2024-08-18T07:30:00.000Z',
  },
  {
    id: 'ACT-1005',
    tipo: 'Consumible',
    nombre: 'Cable wiro galvanizado',
    categoria: 'Fierros/Wiros',
    ubicacion: 'Bodega',
    ubicacionDetalle: 'Bodega Norte',
    responsable: 'Ana Torres',
    estado: 'Activo',
    fechaCompra: '2024-03-01',
    costoCompra: 9500,
    notas: 'Stock para líneas de conducción.',
    createdAt: '2024-07-15T14:20:00.000Z',
    updatedAt: '2024-08-20T09:10:00.000Z',
  },
]

const demoMantenimientos: Mantenimiento[] = [
  {
    id: 'MAT-2001',
    activoId: 'ACT-1001',
    tipo: 'Preventivo',
    fecha: '2024-08-05',
    proximoServicio: '2024-11-05',
    odometro: 45210,
    descripcion: 'Cambio de aceite y revisión general.',
    proveedor: 'Taller Rivera',
    costo: 3200,
    estatus: 'Realizado',
    createdAt: '2024-08-05T12:00:00.000Z',
  },
  {
    id: 'MAT-2002',
    activoId: 'ACT-1001',
    tipo: 'Correctivo',
    fecha: '2024-08-20',
    odometro: 45890,
    descripcion: 'Reparación de llanta trasera.',
    proveedor: 'Llantera San José',
    costo: 950,
    estatus: 'Realizado',
    createdAt: '2024-08-20T15:30:00.000Z',
  },
  {
    id: 'MAT-2003',
    activoId: 'ACT-1002',
    tipo: 'Correctivo',
    fecha: '2024-09-01',
    proximoServicio: '2024-10-15',
    odometro: 61200,
    descripcion: 'Suspensión y alineación pendiente.',
    proveedor: 'Taller Central',
    costo: 7800,
    estatus: 'Programado',
    createdAt: '2024-09-01T09:40:00.000Z',
  },
  {
    id: 'MAT-2004',
    activoId: 'ACT-1003',
    tipo: 'Preventivo',
    fecha: '2024-07-25',
    descripcion: 'Lubricación y calibración de torque.',
    proveedor: 'Servicio Técnico Delta',
    costo: 450,
    estatus: 'Realizado',
    createdAt: '2024-07-25T11:15:00.000Z',
  },
  {
    id: 'MAT-2005',
    activoId: 'ACT-1004',
    tipo: 'Preventivo',
    fecha: '2024-08-12',
    proximoServicio: '2024-09-12',
    descripcion: 'Limpieza de filtros y revisión de caudal.',
    proveedor: 'Agro Servicios del Pacífico',
    costo: 1200,
    estatus: 'Programado',
    createdAt: '2024-08-12T08:10:00.000Z',
  },
  {
    id: 'MAT-2006',
    activoId: 'ACT-1005',
    tipo: 'Correctivo',
    fecha: '2024-08-18',
    descripcion: 'Reemplazo de rollos dañados.',
    proveedor: 'Suministros La Estrella',
    costo: 1800,
    estatus: 'Realizado',
    createdAt: '2024-08-18T10:25:00.000Z',
  },
]

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const ensureSeedData = () => {
  if (typeof window === 'undefined') return
  const hasActivos = window.localStorage.getItem(STORAGE_KEYS.activos)
  const hasMantenimientos = window.localStorage.getItem(STORAGE_KEYS.mantenimientos)
  if (!hasActivos && !hasMantenimientos) {
    window.localStorage.setItem(STORAGE_KEYS.activos, JSON.stringify(demoActivos))
    window.localStorage.setItem(STORAGE_KEYS.mantenimientos, JSON.stringify(demoMantenimientos))
  }
}

const readStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  ensureSeedData()
  return safeParse(window.localStorage.getItem(key), fallback)
}

const writeStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const getActivosData = () => readStorage<Activo[]>(STORAGE_KEYS.activos, demoActivos)

const getMantenimientosData = () =>
  readStorage<Mantenimiento[]>(STORAGE_KEYS.mantenimientos, demoMantenimientos)

export const listActivos = (filters: ActivoFilters = {}) => {
  const activos = getActivosData()
  const search = filters.search?.trim().toLowerCase() ?? ''
  return activos.filter((activo) => {
    const matchesTipo = !filters.tipo || filters.tipo === 'Todos' || activo.tipo === filters.tipo
    const matchesEstado =
      !filters.estado || filters.estado === 'Todos' || activo.estado === filters.estado
    const matchesUbicacion =
      !filters.ubicacion ||
      filters.ubicacion === 'Todos' ||
      activo.ubicacion === filters.ubicacion
    const matchesSearch =
      !search ||
      activo.nombre.toLowerCase().includes(search) ||
      activo.placa?.toLowerCase().includes(search) ||
      activo.serieVIN?.toLowerCase().includes(search)
    return Boolean(matchesTipo && matchesEstado && matchesUbicacion && matchesSearch)
  })
}

export const getActivo = (id: string) => getActivosData().find((activo) => activo.id === id)

export const addActivo = (data: Omit<Activo, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
  const activos = getActivosData()
  const timestamp = nowIso()
  const nuevo: Activo = {
    ...data,
    id: data.id ?? createId('ACT'),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const updated = [nuevo, ...activos]
  writeStorage(STORAGE_KEYS.activos, updated)
  return nuevo
}

export const updateActivo = (id: string, updates: Partial<Activo>) => {
  const activos = getActivosData()
  let updatedActivo: Activo | null = null
  const updated = activos.map((activo) => {
    if (activo.id !== id) return activo
    updatedActivo = { ...activo, ...updates, updatedAt: nowIso() }
    return updatedActivo
  })
  writeStorage(STORAGE_KEYS.activos, updated)
  return updatedActivo
}

export const deleteActivo = (id: string) => updateActivo(id, { estado: 'Dado de baja' })

export const listMantenimientos = (activoId: string) => {
  const mantenimientos = getMantenimientosData()
  return mantenimientos
    .filter((item) => item.activoId === activoId)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

export const getAllMantenimientos = () => getMantenimientosData()

export const addMantenimiento = (
  data: Omit<Mantenimiento, 'id' | 'createdAt'> & { id?: string },
) => {
  const mantenimientos = getMantenimientosData()
  const nuevo: Mantenimiento = {
    ...data,
    id: data.id ?? createId('MAT'),
    createdAt: nowIso(),
  }
  const updated = [nuevo, ...mantenimientos]
  writeStorage(STORAGE_KEYS.mantenimientos, updated)
  return nuevo
}

export const updateMantenimiento = (id: string, updates: Partial<Mantenimiento>) => {
  const mantenimientos = getMantenimientosData()
  let updatedMantenimiento: Mantenimiento | null = null
  const updated = mantenimientos.map((mantenimiento) => {
    if (mantenimiento.id !== id) return mantenimiento
    updatedMantenimiento = { ...mantenimiento, ...updates }
    return updatedMantenimiento
  })
  writeStorage(STORAGE_KEYS.mantenimientos, updated)
  return updatedMantenimiento
}

export const markMantenimientoRealizado = (id: string) =>
  updateMantenimiento(id, { estatus: 'Realizado', fecha: new Date().toISOString().slice(0, 10) })
