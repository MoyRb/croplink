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

const demoActivos: Activo[] = []

const demoMantenimientos: Mantenimiento[] = []

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
  if (!hasActivos && !hasMantenimientos) return
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
