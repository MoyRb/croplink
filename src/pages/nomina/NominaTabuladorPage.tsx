import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { getCatalog } from '../../lib/operationCatalog/repo'
import {
  addTarifaActividad,
  deleteTarifaActividad,
  getTarifasActividad,
  type TarifaActividad,
  type TasaUnidad,
  updateTarifaActividad,
} from '../../lib/store/nomina'

const UNIDADES: TasaUnidad[] = ['dia', 'caja', 'kg', 'planta', 'surco', 'ha']

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value)

const initialForm = {
  actividad: '',
  unidad: 'dia' as TasaUnidad,
  tarifa: 0,
  cultivo: '',
  rancho: '',
  temporada: '',
}

export function NominaTabuladorPage() {
  const [catalog] = useState(() => getCatalog())
  const [tarifas, setTarifas] = useState(() => getTarifasActividad())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TarifaActividad | null>(null)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const lookups = useMemo(
    () => ({
      ranches: Object.fromEntries(catalog.ranches.map((item) => [item.id, item.name])),
      crops: Object.fromEntries(catalog.crops.map((item) => [item.id, item.name])),
      seasons: Object.fromEntries(catalog.seasons.map((item) => [item.id, item.name])),
    }),
    [catalog],
  )

  const resetForm = () => {
    setForm(initialForm)
    setError('')
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (tarifa: TarifaActividad) => {
    setEditing(tarifa)
    setForm({
      actividad: tarifa.actividad,
      unidad: tarifa.unidad,
      tarifa: tarifa.tarifa,
      cultivo: tarifa.cultivo ?? '',
      rancho: tarifa.rancho ?? '',
      temporada: tarifa.temporada ?? '',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.actividad.trim()) {
      setError('La actividad es obligatoria.')
      return
    }
    if (form.tarifa <= 0) {
      setError('La tarifa debe ser mayor a cero.')
      return
    }

    const payload = {
      actividad: form.actividad.trim(),
      unidad: form.unidad,
      tarifa: Number(form.tarifa),
      cultivo: form.cultivo || undefined,
      rancho: form.rancho || undefined,
      temporada: form.temporada || undefined,
    }

    if (editing) {
      setTarifas(updateTarifaActividad({ ...editing, ...payload }))
    } else {
      setTarifas(addTarifaActividad(payload))
    }

    setModalOpen(false)
    resetForm()
    setToast('Tarifa guardada')
    window.setTimeout(() => setToast(''), 2500)
  }

  const handleDelete = (id: string) => {
    setTarifas(deleteTarifaActividad(id))
    setToast('Tarifa eliminada')
    window.setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Tabulador</h1>
          <p className="text-sm text-gray-500">Tarifas por actividad y contexto operativo.</p>
        </div>
        <Button onClick={openCreate}>Nueva tarifa</Button>
      </div>

      {toast ? <Toast variant="success">{toast}</Toast> : null}

      <Card>
        <Table>
          <thead>
            <tr>
              <TableHead>Actividad</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Tarifa</TableHead>
              <TableHead>Cultivo</TableHead>
              <TableHead>Rancho</TableHead>
              <TableHead>Temporada</TableHead>
              <TableHead>Acciones</TableHead>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-gray-900">{item.actividad}</TableCell>
                <TableCell>{item.unidad}</TableCell>
                <TableCell>{formatCurrency(item.tarifa)}</TableCell>
                <TableCell>{item.cultivo ? lookups.crops[item.cultivo] ?? item.cultivo : '—'}</TableCell>
                <TableCell>{item.rancho ? lookups.ranches[item.rancho] ?? item.rancho : '—'}</TableCell>
                <TableCell>{item.temporada ? lookups.seasons[item.temporada] ?? item.temporada : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => openEdit(item)}>Editar</Button>
                    <Button variant="secondary" onClick={() => handleDelete(item.id)}>Eliminar</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={modalOpen} title={editing ? 'Editar tarifa' : 'Nueva tarifa'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm">Actividad</label>
              <Input className="mt-2" value={form.actividad} onChange={(event) => setForm((prev) => ({ ...prev, actividad: event.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Unidad</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.unidad} onChange={(event) => setForm((prev) => ({ ...prev, unidad: event.target.value as TasaUnidad }))}>
                {UNIDADES.map((unidad) => (
                  <option key={unidad} value={unidad}>{unidad}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Tarifa</label>
              <Input className="mt-2" type="number" min={0} value={form.tarifa} onChange={(event) => setForm((prev) => ({ ...prev, tarifa: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="text-sm">Cultivo (opcional)</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.cultivo} onChange={(event) => setForm((prev) => ({ ...prev, cultivo: event.target.value }))}>
                <option value="">Todos</option>
                {catalog.crops.map((crop) => (
                  <option key={crop.id} value={crop.id}>{crop.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Rancho (opcional)</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.rancho} onChange={(event) => setForm((prev) => ({ ...prev, rancho: event.target.value }))}>
                <option value="">Todos</option>
                {catalog.ranches.map((ranch) => (
                  <option key={ranch.id} value={ranch.id}>{ranch.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Temporada (opcional)</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.temporada} onChange={(event) => setForm((prev) => ({ ...prev, temporada: event.target.value }))}>
                <option value="">Todas</option>
                {catalog.seasons.map((season) => (
                  <option key={season.id} value={season.id}>{season.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
