import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import { useRequisicionesStore, type NuevaRequisicion, type RequisicionItem } from '../../lib/store/requisiciones'
import { useOperationContext } from '../../lib/store/operationContext'

const centrosCosto = ['Operaciones', 'Compras', 'Mantenimiento', 'Campo'] as const
const prioridades = ['Baja', 'Media', 'Alta'] as const

const selectStyles =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

type ItemRow = {
  rowId: string
  name: string
  quantity: string
  unit: string
  notes: string
}

const makeEmptyRow = (): ItemRow => ({
  rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  quantity: '',
  unit: 'kg',
  notes: '',
})

export function RequisicionesCrearPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addRequisicion } = useRequisicionesStore()
  const { operationContext } = useOperationContext()

  const prefillData = (location.state?.prefill as Partial<NuevaRequisicion> | undefined) ?? undefined

  const [centroCosto, setCentroCosto] = useState<(typeof centrosCosto)[number]>(
    prefillData?.centroCosto ?? 'Operaciones',
  )
  const [prioridad, setPrioridad] = useState<(typeof prioridades)[number]>(prefillData?.prioridad ?? 'Media')
  const [notas, setNotas] = useState(prefillData?.notas ?? '')

  const [itemRows, setItemRows] = useState<ItemRow[]>(() => {
    const prefillItems = (location.state?.prefill as Partial<NuevaRequisicion> | undefined)?.items
    if (prefillItems && prefillItems.length > 0) {
      return prefillItems.map((item) => ({
        rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.commercial_name ?? '',
        quantity: String(item.quantity),
        unit: item.unit || 'kg',
        notes: item.notes ?? '',
      }))
    }
    return [makeEmptyRow()]
  })

  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [missingRanchToast, setMissingRanchToast] = useState(false)
  const [validationError, setValidationError] = useState('')

  const updateRow = (rowId: string, changes: Partial<ItemRow>) =>
    setItemRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...changes } : r)))

  const removeRow = (rowId: string) =>
    setItemRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    setValidationError('')

    if (!operationContext.ranch) {
      setMissingRanchToast(true)
      setTimeout(() => setMissingRanchToast(false), 2500)
      return
    }

    // Validate items
    for (const row of itemRows) {
      if (!row.name.trim()) {
        setValidationError('Todos los productos deben tener nombre.')
        return
      }
      const qty = Number(row.quantity)
      if (!row.quantity.trim() || isNaN(qty) || qty <= 0) {
        setValidationError('Todos los productos deben tener cantidad mayor a 0.')
        return
      }
    }
    if (itemRows.length === 0) {
      setValidationError('Agrega al menos un producto.')
      return
    }

    const items: RequisicionItem[] = itemRows.map((row, idx) => ({
      id: `${row.rowId}-${idx}`,
      tipo: 'INSUMO_GENERAL',
      product_id: '',
      commercial_name: row.name.trim(),
      quantity: Number(row.quantity),
      unit: row.unit.trim() || 'pza',
      notes: row.notes.trim() || undefined,
    }))

    setIsSubmitting(true)
    try {
      await addRequisicion({
        producto: items[0]?.commercial_name ?? '',
        cantidad: items[0] ? Number(itemRows[0].quantity) : 1,
        unidad: (items[0]?.unit as 'kg' | 'L' | 'pza') ?? 'pza',
        centroCosto,
        prioridad,
        notas: notas.trim() || undefined,
        items,
        operationContext,
      })
      navigate('/requisiciones/lista', { state: { toast: 'created' } })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar la requisición.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva requisición</h1>
          <p className="text-sm text-gray-500">Completa los datos y agrega los productos solicitados.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/requisiciones/lista')}>
          Cancelar
        </Button>
      </div>

      {missingRanchToast ? <Toast variant="error">Selecciona un rancho en el contexto operativo.</Toast> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Datos generales</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Centro de costo</label>
              <select className={selectStyles} value={centroCosto} onChange={(e) => setCentroCosto(e.target.value as typeof centroCosto)}>
                {centrosCosto.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prioridad</label>
              <select className={selectStyles} value={prioridad} onChange={(e) => setPrioridad(e.target.value as typeof prioridad)}>
                {prioridades.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Notas generales</label>
              <Input placeholder="Observaciones adicionales..." value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </div>
          {operationContext.ranch ? (
            <p className="mt-3 text-xs text-gray-500">
              Rancho: <span className="font-medium text-gray-700">{operationContext.ranch.name}</span>
              {operationContext.cropSeason ? ` · ${operationContext.cropSeason.name}` : ''}
            </p>
          ) : (
            <p className="mt-3 text-xs text-amber-600">
              No hay rancho seleccionado. Selecciónalo en el contexto operativo antes de guardar.
            </p>
          )}
        </Card>

        {/* Items */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Productos solicitados</h2>
            <Button type="button" variant="secondary" onClick={() => setItemRows((prev) => [...prev, makeEmptyRow()])}>
              + Agregar producto
            </Button>
          </div>

          {validationError ? <p className="mb-3 text-sm text-red-600">{validationError}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left text-xs text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Producto / Servicio</th>
                  <th className="pb-2 pr-3 font-medium">Cantidad</th>
                  <th className="pb-2 pr-3 font-medium">Unidad</th>
                  <th className="pb-2 pr-3 font-medium">Notas</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {itemRows.map((row) => (
                  <tr key={row.rowId} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="py-2 pr-3">
                      <Input
                        placeholder="Nombre del producto"
                        className="min-w-[180px]"
                        value={row.name}
                        onChange={(e) => updateRow(row.rowId, { name: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className="w-24"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.rowId, { quantity: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        placeholder="kg, L, pza..."
                        className="w-24"
                        value={row.unit}
                        onChange={(e) => updateRow(row.rowId, { unit: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        placeholder="Opcional"
                        className="min-w-[140px]"
                        value={row.notes}
                        onChange={(e) => updateRow(row.rowId, { notes: e.target.value })}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="rounded-full px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        disabled={itemRows.length === 1}
                        onClick={() => removeRow(row.rowId)}
                        aria-label="Eliminar item"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/requisiciones/lista')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar requisición'}
          </Button>
        </div>
      </form>
    </div>
  )
}
