export type InventoryMovementType = 'IN' | 'OUT' | 'RETURN' | 'WASTE'
export type InventoryRefType = 'REQUISICION' | 'EJECUCION' | 'AJUSTE'

export type InventoryItem = {
  id: string
  sku: string
  nombre: string
  unidad: string
  stock_actual: number
  stock_minimo: number
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
  refType: InventoryRefType
  refId: string
  notes?: string
  lot_id?: string
  expiration_date?: string
}

const INVENTORY_ITEMS_KEY = 'inventory_items'
const INVENTORY_MOVEMENTS_KEY = 'inventory_movements'

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

export const ensureInventoryItem = (input: Pick<InventoryItem, 'sku' | 'nombre' | 'unidad'>) => {
  const items = getInventoryItems()
  const existing = items.find((item) => item.sku === input.sku)
  if (existing) return existing

  const created: InventoryItem = {
    id: createId('inv-item'),
    sku: input.sku,
    nombre: input.nombre,
    unidad: input.unidad,
    stock_actual: 0,
    stock_minimo: 0,
  }

  saveInventoryItems([created, ...items])
  return created
}

const movementDelta = (type: InventoryMovementType, qty: number) => {
  if (type === 'IN' || type === 'RETURN') return qty
  return -qty
}

export const registerInventoryMovement = (movementInput: Omit<InventoryMovement, 'id'>) => {
  const movement: InventoryMovement = {
    ...movementInput,
    id: createId('inv-mov'),
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
