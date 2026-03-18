import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { useOperationCatalog } from '../../lib/operationCatalog/useOperationCatalog'
import {
  addTarifaActividad,
  deleteTarifaActividad,
  getActiveTasaUnidades,
  getTarifasActividad,
  getUnidadLabel,
  type TarifaActividad,
  type TasaUnidadActiva,
  updateTarifaActividad,
} from '../../lib/store/nomina'

const UNIDADES: TasaUnidadActiva[] = getActiveTasaUnidades()
const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value)
const initialForm = { actividad: '', unidad: 'dia' as TasaUnidadActiva, tarifa: 0, cultivo: '', rancho: '', temporada: '' }

export function NominaTabuladorPage() {
  const { catalog } = useOperationCatalog()
  const [tarifas, setTarifas] = useState<TarifaActividad[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TarifaActividad | null>(null)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const lookups = useMemo(() => ({
    ranches: Object.fromEntries(catalog.ranches.map((item) => [item.id, item.name])),
    crops: Object.fromEntries(catalog.crops.map((item) => [item.id, item.name])),
    seasons: Object.fromEntries(catalog.seasons.map((item) => [item.id, item.name])),
  }), [catalog])

  const load = async () => {
    try {
      setLoading(true)
      setTarifas(await getTarifasActividad())
      setGlobalError('')
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Error al cargar tabulador.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleSave = async () => {
    if (!form.actividad.trim()) {
      setError('La actividad es obligatoria.')
      return
    }

    if (form.tarifa <= 0) {
      setError('La tarifa debe ser mayor a cero.')
      return
    }

    setSaving(true)

    try {
      const payload: Omit<TarifaActividad, 'id' | 'createdAt'> = {
        actividad: form.actividad.trim(),
        unidad: form.unidad,
        tarifa: Number(form.tarifa),
        cultivo: form.cultivo || undefined,
        rancho: form.rancho || undefined,
        temporada: form.temporada || undefined,
      }

      setTarifas(editing ? await updateTarifaActividad({ ...editing, ...payload }) : await addTarifaActividad(payload))
      setModalOpen(false)
      setEditing(null)
      setForm(initialForm)
      setError('')
      setToast('Tarifa guardada')
      window.setTimeout(() => setToast(''), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Tabulador</h1>
          <p className="text-sm text-gray-500">Tarifas por actividad y unidad de pago propias de Nómina.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(initialForm); setModalOpen(true) }}>Nueva tarifa</Button>
      </div>

      {toast ? <Toast variant="success">{toast}</Toast> : null}
      {globalError ? <Toast variant="error">{globalError}</Toast> : null}

      <Card>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando tabulador...</p>
        ) : (
          <>
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
                    <TableCell>{getUnidadLabel(item.unidad)}</TableCell>
                    <TableCell>{formatCurrency(item.tarifa)}</TableCell>
                    <TableCell>{item.cultivo ? lookups.crops[item.cultivo] ?? item.cultivo : '—'}</TableCell>
                    <TableCell>{item.rancho ? lookups.ranches[item.rancho] ?? item.rancho : '—'}</TableCell>
                    <TableCell>{item.temporada ? lookups.seasons[item.temporada] ?? item.temporada : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditing(item)
                            setForm({
                              actividad: item.actividad,
                              unidad: UNIDADES.includes(item.unidad as TasaUnidadActiva) ? (item.unidad as TasaUnidadActiva) : 'dia',
                              tarifa: item.tarifa,
                              cultivo: item.cultivo ?? '',
                              rancho: item.rancho ?? '',
                              temporada: item.temporada ?? '',
                            })
                            setModalOpen(true)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            setTarifas(await deleteTarifaActividad(item.id))
                            setToast('Tarifa eliminada')
                            window.setTimeout(() => setToast(''), 2500)
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Card>

      <Modal open={modalOpen} title={editing ? 'Editar tarifa' : 'Nueva tarifa'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm">Actividad / concepto</label>
              <Input className="mt-2" value={form.actividad} onChange={(event) => setForm((prev) => ({ ...prev, actividad: event.target.value }))} />
            </div>

            <div>
              <label className="text-sm">Unidad</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.unidad} onChange={(event) => setForm((prev) => ({ ...prev, unidad: event.target.value as TasaUnidadActiva }))}>
                {UNIDADES.map((unidad) => (
                  <option key={unidad} value={unidad}>{getUnidadLabel(unidad)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm">Tarifa</label>
              <Input className="mt-2" type="number" min={0} value={form.tarifa} onChange={(event) => setForm((prev) => ({ ...prev, tarifa: Number(event.target.value) }))} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
