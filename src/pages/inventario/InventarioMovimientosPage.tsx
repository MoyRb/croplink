import { useMemo, useState } from 'react'

import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { getInventoryItems, getInventoryMovements } from '../../lib/store/inventory'

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function InventarioMovimientosPage() {
  const [refTypeFilter, setRefTypeFilter] = useState('')
  const [refIdFilter, setRefIdFilter] = useState('')

  const itemsById = useMemo(() => {
    const map = new Map<string, string>()
    getInventoryItems().forEach((item) => {
      map.set(item.id, `${item.nombre} (${item.sku})`)
    })
    return map
  }, [])

  const movements = useMemo(() => {
    return getInventoryMovements()
      .filter((movement) => (refTypeFilter ? movement.refType === refTypeFilter : true))
      .filter((movement) => {
        if (!refIdFilter.trim()) return true
        return movement.refId.toLowerCase().includes(refIdFilter.trim().toLowerCase())
      })
  }, [refIdFilter, refTypeFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Inventario · Movimientos</h1>
        <p className="text-sm text-gray-500">Historial de entradas, salidas, devoluciones y merma.</p>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            Tipo de referencia
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2"
              value={refTypeFilter}
              onChange={(event) => setRefTypeFilter(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="REQUISICION">Requisición</option>
              <option value="EJECUCION">Ejecución</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
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
                <th className="px-2 py-2">Producto</th>
                <th className="px-2 py-2">Cantidad</th>
                <th className="px-2 py-2">Ref</th>
                <th className="px-2 py-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-b border-gray-100">
                  <td className="px-2 py-2">{formatDate(movement.date)}</td>
                  <td className="px-2 py-2 font-semibold">{movement.type}</td>
                  <td className="px-2 py-2">{itemsById.get(movement.itemId) ?? movement.itemId}</td>
                  <td className="px-2 py-2">{movement.qty} {movement.unit}</td>
                  <td className="px-2 py-2">{movement.refType} · {movement.refId}</td>
                  <td className="px-2 py-2">{movement.notes ?? '—'}</td>
                </tr>
              ))}
              {movements.length === 0 ? (
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
