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

const INVENTORY_ITEMS_KEY = 'croplink:inventory:items'
const INVENTORY_MOVEMENTS_KEY = 'croplink:inventory:movements'

const parseArray = <T>(value: string | null): T[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

const getStoredArray = <T>(key: string) => {
  if (typeof window === 'undefined') return [] as T[]
  return parseArray<T>(window.localStorage.getItem(key))
}

const setStoredArray = <T>(key: string, value: T[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const getInventoryItems = () => getStoredArray<InventoryItem>(INVENTORY_ITEMS_KEY)
export const getInventoryMovements = () => getStoredArray<InventoryMovement>(INVENTORY_MOVEMENTS_KEY)

const saveInventoryItems = (items: InventoryItem[]) => setStoredArray(INVENTORY_ITEMS_KEY, items)
const saveInventoryMovements = (movements: InventoryMovement[]) => setStoredArray(INVENTORY_MOVEMENTS_KEY, movements)

export const createInventoryItem = (
  input: Omit<InventoryItem, 'id' | 'stock_actual'> & { stock_actual?: number },
) => {
  const items = getInventoryItems()
  const created: InventoryItem = {
    ...input,
    id: createId('inv-item'),
    stock_actual: Number((input.stock_actual ?? 0).toFixed(4)),
    categoria: input.categoria.trim() || 'General',
    ubicacion: input.ubicacion.trim() || 'Sin ubicación',
  }

  saveInventoryItems([created, ...items])
  return created
}

export const updateInventoryItem = (itemId: string, changes: Partial<Omit<InventoryItem, 'id'>>) => {
  const items = getInventoryItems()
  const next = items.map((item) => (item.id === itemId ? { ...item, ...changes } : item))
  saveInventoryItems(next)
}

export const deleteInventoryItem = (itemId: string) => {
  const items = getInventoryItems()
  const next = items.filter((item) => item.id !== itemId)
  saveInventoryItems(next)
}

export const ensureInventoryItem = (
  input: Pick<InventoryItem, 'sku' | 'nombre' | 'unidad'> &
    Partial<Pick<InventoryItem, 'categoria' | 'ubicacion' | 'stock_minimo' | 'proveedor_sugerido'>>,
) => {
  const items = getInventoryItems()
  const existing = items.find((item) => item.sku === input.sku)
  if (existing) return existing

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

const movementDelta = (type: InventoryMovementType, qty: number) => {
  if (type === 'IN' || type === 'RETURN') return qty
  if (type === 'ADJUST') return qty
  return -qty
}

export const registerInventoryMovement = (movementInput: Omit<InventoryMovement, 'id'>) => {
  const movement: InventoryMovement = {
    ...movementInput,
    id: createId('inv-mov'),
    qty: Number(movementInput.qty.toFixed(4)),
  }

  const items = getInventoryItems()
  const movements = getInventoryMovements()

  const nextItems = items.map((item) => {
    if (item.id !== movement.itemId) return item

    const nextStock = item.stock_actual + movementDelta(movement.type, movement.qty)
    return {
      ...item,
      stock_actual: Number(nextStock.toFixed(4)),
    }
  })

  saveInventoryItems(nextItems)
  saveInventoryMovements([movement, ...movements])

  return movement
}
