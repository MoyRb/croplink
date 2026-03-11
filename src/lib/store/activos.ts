import { supabase } from '../supabaseClient'

export type ActivoTipo = 'Vehículo' | 'Herramienta' | 'Equipo' | 'Consumible'
export type ActivoUbicacion = 'Bodega' | 'Rancho' | 'Taller' | 'Otro'
export type ActivoEstado = 'Activo' | 'En reparación' | 'Fuera de servicio' | 'Dado de baja'

export type Activo = {
  id: string
  tipo: ActivoTipo
  nombre: string
  categoria: string
  codigo?: string
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
  operationId?: string
  ranchId?: string
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
  notas?: string
  createdAt: string
}

export type ActivoFilters = {
  tipo?: ActivoTipo | 'Todos'
  estado?: ActivoEstado | 'Todos'
  ubicacion?: ActivoUbicacion | 'Todos'
  search?: string
}

type AssetRow = {
  id: string
  name: string
  type: ActivoTipo
  category: string
  code: string | null
  brand: string | null
  model: string | null
  serial_vin: string | null
  plate: string | null
  location: string | null
  location_detail: string | null
  responsible: string | null
  status: ActivoEstado
  purchase_date: string | null
  purchase_cost: number | null
  notes: string | null
  operation_id: string | null
  ranch_id: string | null
  created_at: string
  updated_at: string
}

type MaintenanceRow = {
  id: string
  asset_id: string
  maintenance_date: string
  type: MantenimientoTipo
  description: string
  provider: string | null
  cost: number
  status: MantenimientoEstatus
  odometer: number | null
  next_service_date: string | null
  attachment_name: string | null
  attachment_mime_type: string | null
  attachment_size_bytes: number | null
  attachment_url: string | null
  notes: string | null
  created_at: string
}

const getOrganizationId = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user?.id) {
    throw new Error('No hay sesión activa.')
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', authData.user.id)
    .single<{ organization_id: string | null }>()

  if (error || !data?.organization_id) {
    throw new Error(error?.message || 'No hay organización asociada al usuario.')
  }

  return data.organization_id
}

const mapAsset = (row: AssetRow): Activo => ({
  id: row.id,
  tipo: row.type,
  nombre: row.name,
  categoria: row.category,
  codigo: row.code ?? undefined,
  marca: row.brand ?? undefined,
  modelo: row.model ?? undefined,
  serieVIN: row.serial_vin ?? undefined,
  placa: row.plate ?? undefined,
  ubicacion: (row.location as ActivoUbicacion | null) ?? 'Otro',
  ubicacionDetalle: row.location_detail ?? undefined,
  responsable: row.responsible ?? undefined,
  estado: row.status,
  fechaCompra: row.purchase_date ?? undefined,
  costoCompra: row.purchase_cost ?? undefined,
  notas: row.notes ?? undefined,
  operationId: row.operation_id ?? undefined,
  ranchId: row.ranch_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapMaintenance = (row: MaintenanceRow): Mantenimiento => ({
  id: row.id,
  activoId: row.asset_id,
  tipo: row.type,
  fecha: row.maintenance_date,
  proximoServicio: row.next_service_date ?? undefined,
  odometro: row.odometer ?? undefined,
  descripcion: row.description,
  proveedor: row.provider ?? undefined,
  costo: Number(row.cost),
  estatus: row.status,
  adjunto: row.attachment_name
    ? {
        name: row.attachment_name,
        size: Number(row.attachment_size_bytes ?? 0),
        type: row.attachment_mime_type ?? 'application/octet-stream',
        localUrl: row.attachment_url ?? undefined,
      }
    : undefined,
  notas: row.notes ?? undefined,
  createdAt: row.created_at,
})

export const listActivos = async (filters: ActivoFilters = {}) => {
  let query = supabase
    .from('assets')
    .select(
      'id, name, type, category, code, brand, model, serial_vin, plate, location, location_detail, responsible, status, purchase_date, purchase_cost, notes, operation_id, ranch_id, created_at, updated_at',
    )
    .order('created_at', { ascending: false })

  if (filters.tipo && filters.tipo !== 'Todos') query = query.eq('type', filters.tipo)
  if (filters.estado && filters.estado !== 'Todos') query = query.eq('status', filters.estado)
  if (filters.ubicacion && filters.ubicacion !== 'Todos') query = query.eq('location', filters.ubicacion)

  const search = filters.search?.trim()
  if (search) {
    const token = search.replaceAll(',', ' ').trim()
    query = query.or(`name.ilike.%${token}%,plate.ilike.%${token}%,serial_vin.ilike.%${token}%,code.ilike.%${token}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return ((data as AssetRow[] | null) ?? []).map(mapAsset)
}

export const getActivo = async (id: string) => {
  const { data, error } = await supabase
    .from('assets')
    .select(
      'id, name, type, category, code, brand, model, serial_vin, plate, location, location_detail, responsible, status, purchase_date, purchase_cost, notes, operation_id, ranch_id, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle<AssetRow>()

  if (error) throw new Error(error.message)
  return data ? mapAsset(data) : null
}

export const addActivo = async (data: Omit<Activo, 'id' | 'createdAt' | 'updatedAt'>) => {
  const organizationId = await getOrganizationId()
  const { data: created, error } = await supabase
    .from('assets')
    .insert({
      organization_id: organizationId,
      name: data.nombre,
      type: data.tipo,
      category: data.categoria,
      code: data.codigo ?? null,
      brand: data.marca ?? null,
      model: data.modelo ?? null,
      serial_vin: data.serieVIN ?? null,
      plate: data.placa ?? null,
      location: data.ubicacion,
      location_detail: data.ubicacionDetalle ?? null,
      responsible: data.responsable ?? null,
      status: data.estado,
      purchase_date: data.fechaCompra ?? null,
      purchase_cost: data.costoCompra ?? null,
      notes: data.notas ?? null,
      operation_id: data.operationId ?? null,
      ranch_id: data.ranchId ?? null,
    })
    .select(
      'id, name, type, category, code, brand, model, serial_vin, plate, location, location_detail, responsible, status, purchase_date, purchase_cost, notes, operation_id, ranch_id, created_at, updated_at',
    )
    .single<AssetRow>()

  if (error || !created) throw new Error(error?.message || 'No se pudo crear el activo.')
  return mapAsset(created)
}

export const updateActivo = async (id: string, updates: Partial<Activo>) => {
  const payload = {
    name: updates.nombre,
    type: updates.tipo,
    category: updates.categoria,
    code: updates.codigo,
    brand: updates.marca,
    model: updates.modelo,
    serial_vin: updates.serieVIN,
    plate: updates.placa,
    location: updates.ubicacion,
    location_detail: updates.ubicacionDetalle,
    responsible: updates.responsable,
    status: updates.estado,
    purchase_date: updates.fechaCompra,
    purchase_cost: updates.costoCompra,
    notes: updates.notas,
    operation_id: updates.operationId,
    ranch_id: updates.ranchId,
  }

  const { data, error } = await supabase
    .from('assets')
    .update(payload)
    .eq('id', id)
    .select(
      'id, name, type, category, code, brand, model, serial_vin, plate, location, location_detail, responsible, status, purchase_date, purchase_cost, notes, operation_id, ranch_id, created_at, updated_at',
    )
    .maybeSingle<AssetRow>()

  if (error) throw new Error(error.message)
  return data ? mapAsset(data) : null
}

export const deleteActivo = async (id: string) => updateActivo(id, { estado: 'Dado de baja' })

export const listMantenimientos = async (activoId: string) => {
  const { data, error } = await supabase
    .from('asset_maintenance_records')
    .select(
      'id, asset_id, maintenance_date, type, description, provider, cost, status, odometer, next_service_date, attachment_name, attachment_mime_type, attachment_size_bytes, attachment_url, notes, created_at',
    )
    .eq('asset_id', activoId)
    .order('maintenance_date', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data as MaintenanceRow[] | null) ?? []).map(mapMaintenance)
}

export const getAllMantenimientos = async () => {
  const { data, error } = await supabase
    .from('asset_maintenance_records')
    .select(
      'id, asset_id, maintenance_date, type, description, provider, cost, status, odometer, next_service_date, attachment_name, attachment_mime_type, attachment_size_bytes, attachment_url, notes, created_at',
    )
    .order('maintenance_date', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data as MaintenanceRow[] | null) ?? []).map(mapMaintenance)
}

export const addMantenimiento = async (data: Omit<Mantenimiento, 'id' | 'createdAt'>) => {
  const organizationId = await getOrganizationId()

  const { data: created, error } = await supabase
    .from('asset_maintenance_records')
    .insert({
      organization_id: organizationId,
      asset_id: data.activoId,
      maintenance_date: data.fecha,
      type: data.tipo,
      description: data.descripcion,
      provider: data.proveedor ?? null,
      cost: data.costo,
      status: data.estatus,
      odometer: data.odometro ?? null,
      next_service_date: data.proximoServicio ?? null,
      attachment_name: data.adjunto?.name ?? null,
      attachment_mime_type: data.adjunto?.type ?? null,
      attachment_size_bytes: data.adjunto?.size ?? null,
      attachment_url: data.adjunto?.localUrl ?? null,
      notes: data.notas ?? null,
    })
    .select(
      'id, asset_id, maintenance_date, type, description, provider, cost, status, odometer, next_service_date, attachment_name, attachment_mime_type, attachment_size_bytes, attachment_url, notes, created_at',
    )
    .single<MaintenanceRow>()

  if (error || !created) throw new Error(error?.message || 'No se pudo crear el mantenimiento.')
  return mapMaintenance(created)
}

export const updateMantenimiento = async (id: string, updates: Partial<Mantenimiento>) => {
  const payload = {
    maintenance_date: updates.fecha,
    type: updates.tipo,
    description: updates.descripcion,
    provider: updates.proveedor,
    cost: updates.costo,
    status: updates.estatus,
    odometer: updates.odometro,
    next_service_date: updates.proximoServicio,
    attachment_name: updates.adjunto?.name,
    attachment_mime_type: updates.adjunto?.type,
    attachment_size_bytes: updates.adjunto?.size,
    attachment_url: updates.adjunto?.localUrl,
    notes: updates.notas,
  }

  const { data, error } = await supabase
    .from('asset_maintenance_records')
    .update(payload)
    .eq('id', id)
    .select(
      'id, asset_id, maintenance_date, type, description, provider, cost, status, odometer, next_service_date, attachment_name, attachment_mime_type, attachment_size_bytes, attachment_url, notes, created_at',
    )
    .maybeSingle<MaintenanceRow>()

  if (error) throw new Error(error.message)
  return data ? mapMaintenance(data) : null
}

export const markMantenimientoRealizado = async (id: string) =>
  updateMantenimiento(id, {
    estatus: 'Realizado',
    fecha: new Date().toISOString().slice(0, 10),
  })
