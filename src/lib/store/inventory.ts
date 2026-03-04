import { supabase } from '../supabaseClient'

export type InventoryMovementType = 'IN' | 'OUT' | 'ADJUST' | 'RETURN' | 'WASTE'
export type InventoryRefType = 'REQUISICION' | 'EJECUCION' | 'AJUSTE'

export type InventoryItem = {
  id: string
  sku: string
  nombre: string
  categoria: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  ubicacion: string
  proveedor_sugerido?: string
  lot_id?: string
  expiration_date?: string
}

export type InventoryMovement = {
  id: string
  date: string
  type: InventoryMovementType
  itemId: string
  qty: number
  unit: string
  notes?: string
  refType?: InventoryRefType
  refId?: string
  lot_id?: string
  expiration_date?: string
}

type InventoryItemDb = {
  id: string
  sku: string
  name: string
  category: string | null
  unit: string
  stock_current: number
  stock_minimum: number
  location: string | null
  suggested_supplier: string | null
}

type InventoryMovementDb = {
  id: string
  movement_date: string
  movement_type: 'in' | 'out' | 'adjust' | 'return' | 'waste'
  inventory_item_id: string
  qty: number
  unit: string
  notes: string | null
  ref_type: 'requisicion' | 'ejecucion' | 'ajuste' | null
  ref_id: string | null
}

const movementTypeFromDb: Record<InventoryMovementDb['movement_type'], InventoryMovementType> = {
  in: 'IN',
  out: 'OUT',
  adjust: 'ADJUST',
  return: 'RETURN',
  waste: 'WASTE',
}

const movementTypeToDb: Record<InventoryMovementType, InventoryMovementDb['movement_type']> = {
  IN: 'in',
  OUT: 'out',
  ADJUST: 'adjust',
  RETURN: 'return',
  WASTE: 'waste',
}

const refTypeToDb = (value?: InventoryRefType) => {
  if (!value) return null
  return value.toLowerCase() as 'requisicion' | 'ejecucion' | 'ajuste'
}

const refTypeFromDb = (value: InventoryMovementDb['ref_type']): InventoryRefType | undefined => {
  if (!value) return undefined
  return value.toUpperCase() as InventoryRefType
}

const mapItem = (row: InventoryItemDb): InventoryItem => ({
  id: row.id,
  sku: row.sku,
  nombre: row.name,
  categoria: row.category ?? 'General',
  unidad: row.unit,
  stock_actual: Number(row.stock_current ?? 0),
  stock_minimo: Number(row.stock_minimum ?? 0),
  ubicacion: row.location ?? 'Sin ubicación',
  proveedor_sugerido: row.suggested_supplier ?? undefined,
})

const mapMovement = (row: InventoryMovementDb): InventoryMovement => ({
  id: row.id,
  date: row.movement_date,
  type: movementTypeFromDb[row.movement_type],
  itemId: row.inventory_item_id,
  qty: Number(row.qty),
  unit: row.unit,
  notes: row.notes ?? undefined,
  refType: refTypeFromDb(row.ref_type),
  refId: row.ref_id ?? undefined,
})

const getOrganizationId = async () => {
  const { data, error } = await supabase.from('profiles').select('organization_id').single<{ organization_id: string | null }>()
  if (error || !data?.organization_id) {
    throw new Error(error?.message || 'No hay organización asociada al usuario.')
  }
  return data.organization_id
}

export const getInventoryItems = async () => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, sku, name, category, unit, stock_current, stock_minimum, location, suggested_supplier')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error cargando inventario:', error)
    return [] as InventoryItem[]
  }

  return ((data as InventoryItemDb[] | null) ?? []).map(mapItem)
}

export const getInventoryMovements = async () => {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('id, movement_date, movement_type, inventory_item_id, qty, unit, notes, ref_type, ref_id')
    .order('movement_date', { ascending: false })

  if (error) {
    console.error('Error cargando movimientos de inventario:', error)
    return [] as InventoryMovement[]
  }

  return ((data as InventoryMovementDb[] | null) ?? []).map(mapMovement)
}

export const createInventoryItem = async (
  input: Omit<InventoryItem, 'id' | 'stock_actual'> & { stock_actual?: number },
) => {
  const organizationId = await getOrganizationId()
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      organization_id: organizationId,
      sku: input.sku,
      name: input.nombre,
      category: input.categoria,
      unit: input.unidad,
      stock_current: input.stock_actual ?? 0,
      stock_minimum: input.stock_minimo,
      location: input.ubicacion,
      suggested_supplier: input.proveedor_sugerido ?? null,
    })
    .select('id, sku, name, category, unit, stock_current, stock_minimum, location, suggested_supplier')
    .single<InventoryItemDb>()

  if (error || !data) throw new Error(error?.message || 'No se pudo crear el insumo.')
  return mapItem(data)
}

export const updateInventoryItem = async (itemId: string, changes: Partial<Omit<InventoryItem, 'id'>>) => {
  const payload = {
    sku: changes.sku,
    name: changes.nombre,
    category: changes.categoria,
    unit: changes.unidad,
    stock_minimum: changes.stock_minimo,
    location: changes.ubicacion,
    suggested_supplier: changes.proveedor_sugerido,
  }

  const { error } = await supabase.from('inventory_items').update(payload).eq('id', itemId)
  if (error) throw new Error(error.message)
}

export const deleteInventoryItem = async (itemId: string) => {
  const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}

export const ensureInventoryItem = async (
  input: Pick<InventoryItem, 'sku' | 'nombre' | 'unidad'> &
    Partial<Pick<InventoryItem, 'categoria' | 'ubicacion' | 'stock_minimo' | 'proveedor_sugerido'>>,
) => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, sku, name, category, unit, stock_current, stock_minimum, location, suggested_supplier')
    .eq('sku', input.sku)
    .maybeSingle<InventoryItemDb>()

  if (error) throw new Error(error.message)
  if (data) return mapItem(data)

  return createInventoryItem({
    sku: input.sku,
    nombre: input.nombre,
    unidad: input.unidad,
    categoria: input.categoria ?? 'General',
    stock_minimo: input.stock_minimo ?? 0,
    ubicacion: input.ubicacion ?? 'Sin ubicación',
    proveedor_sugerido: input.proveedor_sugerido,
  })
}

export const registerInventoryMovement = async (movementInput: Omit<InventoryMovement, 'id'>) => {
  const organizationId = await getOrganizationId()
  const { data, error } = await supabase
    .from('inventory_movements')
    .insert({
      organization_id: organizationId,
      inventory_item_id: movementInput.itemId,
      movement_date: movementInput.date,
      movement_type: movementTypeToDb[movementInput.type],
      qty: Number(movementInput.qty.toFixed(4)),
      unit: movementInput.unit,
      notes: movementInput.notes ?? null,
      ref_type: refTypeToDb(movementInput.refType),
      ref_id: movementInput.refId ?? null,
      inventory_lot_id: movementInput.lot_id ?? null,
    })
    .select('id, movement_date, movement_type, inventory_item_id, qty, unit, notes, ref_type, ref_id')
    .single<InventoryMovementDb>()

  if (error || !data) throw new Error(error?.message || 'No se pudo registrar el movimiento.')
  return mapMovement(data)
}
