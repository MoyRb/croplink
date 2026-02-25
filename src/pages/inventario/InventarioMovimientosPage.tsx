import { type FormEvent, useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import {
  getInventoryItems,
  getInventoryMovements,
  registerInventoryMovement,
  type InventoryMovementType,
} from '../../lib/store/inventory'

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

const movementTypes: InventoryMovementType[] = ['IN', 'OUT', 'ADJUST', 'RETURN', 'WASTE']

export function InventarioMovimientosPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [refTypeFilter, setRefTypeFilter] = useState('')
  const [refIdFilter, setRefIdFilter] = useState('')

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [type, setType] = useState<InventoryMovementType>('IN')
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')
  const [refType, setRefType] = useState('')
  const [refId, setRefId] = useState('')

  const [items, setItems] = useState(() => getInventoryItems())
  const [movements, setMovements] = useState(() => getInventoryMovements())

  const refresh = () => {
    setItems(getInventoryItems())
    setMovements(getInventoryMovements())
  }

  const itemsById = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach((item) => {
      map.set(item.id, `${item.nombre} (${item.sku})`)
    })
    return map
  }, [items])

  const filteredMovements = useMemo(() => {
    return movements
      .filter((movement) => (typeFilter ? movement.type === typeFilter : true))
      .filter((movement) => (refTypeFilter ? movement.refType === refTypeFilter : true))
      .filter((movement) => {
        if (!refIdFilter.trim()) return true
        return (movement.refId ?? '').toLowerCase().includes(refIdFilter.trim().toLowerCase())
      })
  }, [movements, refIdFilter, refTypeFilter, typeFilter])

  const handleCreateMovement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const selectedItem = items.find((item) => item.id === itemId)
    const qtyNumber = Number(qty)
    if (!selectedItem || !qtyNumber) return

    registerInventoryMovement({
      date: new Date(date).toISOString(),
      type,
      itemId,
      qty: qtyNumber,
      unit: unit.trim() || selectedItem.unidad,
      notes: notes.trim() || undefined,
      refType: refType ? (refType as 'REQUISICION' | 'EJECUCION' | 'AJUSTE') : undefined,
      refId: refId.trim() || undefined,
    })

    setQty('')
    setNotes('')
    setRefId('')
    refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Inventario · Movimientos</h1>
        <p className="text-sm text-gray-500">Registra entradas, salidas, ajustes, devoluciones y merma.</p>
      </div>

      <Card>
        <form onSubmit={handleCreateMovement} className="space-y-3">
          <p className="text-sm font-medium text-gray-800">Nuevo movimiento</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">Fecha
              <Input className="mt-1" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} required />
            </label>
            <label className="text-sm">Tipo
              <select className="mt-1 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2" value={type} onChange={(event) => setType(event.target.value as InventoryMovementType)}>
                {movementTypes.map((movementType) => (
                  <option key={movementType} value={movementType}>{movementType}</option>
                ))}
              </select>
            </label>
            <label className="text-sm lg:col-span-2">Insumo
              <select className="mt-1 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2" value={itemId} onChange={(event) => {
                const nextId = event.target.value
                setItemId(nextId)
                const item = items.find((candidate) => candidate.id === nextId)
                if (item) setUnit(item.unidad)
              }} required>
                <option value="">Seleccionar insumo</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre} ({item.sku})</option>
                ))}
              </select>
            </label>
            <label className="text-sm">Cantidad
              <Input className="mt-1" type="number" min={0.0001} step="0.01" value={qty} onChange={(event) => setQty(event.target.value)} required />
            </label>
            <label className="text-sm">Unidad
              <Input className="mt-1" value={unit} onChange={(event) => setUnit(event.target.value)} required />
            </label>
            <label className="text-sm">Ref Type
              <select className="mt-1 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2" value={refType} onChange={(event) => setRefType(event.target.value)}>
                <option value="">Sin referencia</option>
                <option value="REQUISICION">REQUISICION</option>
                <option value="EJECUCION">EJECUCION</option>
                <option value="AJUSTE">AJUSTE</option>
              </select>
            </label>
            <label className="text-sm">Ref ID
              <Input className="mt-1" value={refId} onChange={(event) => setRefId(event.target.value)} placeholder="REQ-2044" />
            </label>
            <div className="md:col-span-2 lg:col-span-4">
              <label className="text-sm">Notas
                <Input className="mt-1" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observaciones" />
              </label>
            </div>
          </div>
          <Button type="submit">Registrar movimiento</Button>
        </form>
      </Card>

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            Tipo movimiento
            <select className="mt-1 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">Todos</option>
              {movementTypes.map((movementType) => (
                <option key={movementType} value={movementType}>{movementType}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Tipo de referencia
            <select className="mt-1 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2" value={refTypeFilter} onChange={(event) => setRefTypeFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="REQUISICION">Requisición</option>
              <option value="EJECUCION">Ejecución</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </label>
          <label className="text-sm">
            Referencia (ID)
            <Input value={refIdFilter} onChange={(event) => setRefIdFilter(event.target.value)} placeholder="REQ-2044 o exec-..." />
          </label>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Insumo</th>
                <th className="px-2 py-2">Cantidad</th>
                <th className="px-2 py-2">Ref</th>
                <th className="px-2 py-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="border-b border-gray-100">
                  <td className="px-2 py-2">{formatDate(movement.date)}</td>
                  <td className="px-2 py-2 font-semibold">{movement.type}</td>
                  <td className="px-2 py-2">{itemsById.get(movement.itemId) ?? movement.itemId}</td>
                  <td className="px-2 py-2">{movement.qty} {movement.unit}</td>
                  <td className="px-2 py-2">{movement.refType && movement.refId ? `${movement.refType} · ${movement.refId}` : '—'}</td>
                  <td className="px-2 py-2">{movement.notes ?? '—'}</td>
                </tr>
              ))}
              {filteredMovements.length === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-sm text-gray-500" colSpan={6}>Sin movimientos para los filtros seleccionados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
