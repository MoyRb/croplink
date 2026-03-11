import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { getCosechaById, updateCosecha, type Cosecha } from '../../lib/store/cosechas'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value)

export function CosechasDetallePage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()

  const [cosecha, setCosecha] = useState<Cosecha | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    fecha: '',
    actividad: '',
    unidad: '',
    cantidadTotal: 0,
    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const found = await getCosechaById(id)
        setCosecha(found)
        if (found) {
          setForm({
            fecha: found.fecha,
            actividad: found.actividad,
            unidad: found.unidad,
            cantidadTotal: found.cantidadTotal,
            notes: found.notes ?? '',
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la cosecha.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

  const pagoTotalVisible = useMemo(() => {
    if (!cosecha) return 0
    return cosecha.cuadrilla.reduce((sum, row) => sum + row.amount, 0)
  }, [cosecha])

  const handleSave = async () => {
    if (!cosecha) return
    if (!form.fecha || !form.actividad || !form.unidad || form.cantidadTotal <= 0) {
      setError('Completa fecha, actividad, unidad y cantidad total válida.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateCosecha({
        id: cosecha.id,
        fecha: form.fecha,
        actividad: form.actividad,
        unidad: form.unidad,
        cantidadTotal: Number(form.cantidadTotal),
        notes: form.notes,
      })

      const refreshed = await getCosechaById(cosecha.id)
      setCosecha(refreshed)
      if (refreshed) {
        setForm({
          fecha: refreshed.fecha,
          actividad: refreshed.actividad,
          unidad: refreshed.unidad,
          cantidadTotal: refreshed.cantidadTotal,
          notes: refreshed.notes ?? '',
        })
      }
      setIsEditing(false)
      setToast('Cosecha actualizada correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la cosecha.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-gray-600">Cargando cosecha...</p>
      </Card>
    )
  }

  if (!cosecha) {
    return (
      <Card>
        <p className="text-sm text-gray-600">No encontramos la cosecha solicitada.</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4">
          <Button onClick={() => navigate('/cosechas/lista')}>Volver</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error ? <Toast variant="error">{error}</Toast> : null}
      {toast ? <Toast variant="success">{toast}</Toast> : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cosecha {cosecha.id}</h1>
          <p className="text-sm text-gray-500">{cosecha.fecha} · {cosecha.ranchoNombre} · {cosecha.sectorNombre}</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? <Button variant="secondary" onClick={() => setIsEditing(true)}>Editar</Button> : null}
          <Button variant="ghost" onClick={() => navigate('/cosechas/lista')}>Volver a lista</Button>
        </div>
      </div>

      <Card>
        {isEditing ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="date" value={form.fecha} onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))} />
            <Input placeholder="Actividad" value={form.actividad} onChange={(event) => setForm((prev) => ({ ...prev, actividad: event.target.value }))} />
            <Input placeholder="Unidad" value={form.unidad} onChange={(event) => setForm((prev) => ({ ...prev, unidad: event.target.value }))} />
            <Input type="number" min={0} step="any" placeholder="Cantidad total" value={form.cantidadTotal || ''} onChange={(event) => setForm((prev) => ({ ...prev, cantidadTotal: Number(event.target.value) }))} />
            <Input className="md:col-span-2" placeholder="Notas" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <p><span className="text-gray-500">Actividad:</span> {cosecha.actividad}</p>
            <p><span className="text-gray-500">Cultivo/Temporada:</span> {cosecha.cultivo} / {cosecha.temporada}</p>
            <p><span className="text-gray-500">Cantidad total:</span> {cosecha.cantidadTotal} {cosecha.unidad}</p>
            <p><span className="text-gray-500">Tarifa:</span> {formatCurrency(cosecha.tarifa)}</p>
            <p><span className="text-gray-500">Total pagado:</span> {formatCurrency(cosecha.totalPagado || pagoTotalVisible)}</p>
            <p><span className="text-gray-500">Costo unitario:</span> {formatCurrency(cosecha.costoUnitario)}</p>
            <p className="md:col-span-3"><span className="text-gray-500">Notas:</span> {cosecha.notes || 'Sin notas.'}</p>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Cuadrilla (work_logs generados)</h2>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Empleado</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Pago estimado</TableHead>
              </tr>
            </thead>
            <tbody>
              {cosecha.cuadrilla.map((row) => (
                <TableRow key={row.workLogId ?? row.empleadoId}>
                  <TableCell>{row.empleadoNombre ?? row.empleadoId}</TableCell>
                  <TableCell>{row.unidades}</TableCell>
                  <TableCell>{formatCurrency(row.amount || row.unidades * cosecha.tarifa)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
