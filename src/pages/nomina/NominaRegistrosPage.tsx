import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { useOperationCatalog } from '../../lib/operationCatalog/useOperationCatalog'
import {
  addWorkLog,
  computeWorkLogAmount,
  deleteWorkLog,
  getActiveTasaUnidades,
  getEmployeeRateByPayType,
  getEmpleados,
  getPaySchemeByUnidad,
  getUnidadLabel,
  getWorkLogQuantity,
  getWorkLogs,
  resolveTarifaActividad,
  updateWorkLog,
  type Empleado,
  type TasaUnidadActiva,
  type WorkLog,
} from '../../lib/store/nomina'

const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value)
const ACTIVE_UNITS = getActiveTasaUnidades()
const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  employeeId: '',
  ranchId: '',
  activity: '',
  paymentUnit: 'dia' as TasaUnidadActiva,
  quantity: 1,
  rateUsed: 0,
  notes: '',
}

export function NominaRegistrosPage() {
  const { catalog } = useOperationCatalog()
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [errorGlobal, setErrorGlobal] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkLog | null>(null)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        const [loadedLogs, loadedEmployees] = await Promise.all([getWorkLogs(), getEmpleados()])
        setLogs(loadedLogs)
        setEmpleados(loadedEmployees)
      } catch (err) {
        setErrorGlobal(err instanceof Error ? err.message : 'Error al cargar registros.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const empleadosById = useMemo(() => Object.fromEntries(empleados.map((item) => [item.id, item])), [empleados])
  const ranchesById = useMemo(() => Object.fromEntries(catalog.ranches.map((item) => [item.id, item.name])), [catalog.ranches])
  const currentTotal = useMemo(() => computeWorkLogAmount(form.quantity, form.rateUsed), [form.quantity, form.rateUsed])

  const hydrateSuggestedRate = async (nextForm: typeof form) => {
    const tarifa = await resolveTarifaActividad({
      actividad: nextForm.activity,
      unidad: nextForm.paymentUnit,
      rancho: nextForm.ranchId || undefined,
    })

    if (tarifa) {
      setForm((prev) => ({
        ...prev,
        ...nextForm,
        rateUsed: tarifa.tarifa,
      }))
      return
    }

    const employee = empleadosById[nextForm.employeeId]
    setForm((prev) => ({
      ...prev,
      ...nextForm,
      rateUsed: employee ? getEmployeeRateByPayType(employee, getPaySchemeByUnidad(nextForm.paymentUnit)) : prev.rateUsed,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Registros</h1>
          <p className="text-sm text-gray-500">Registra destajo o trabajo diario por empleado; esta es la base para Pagos.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(initialForm); setError(''); setModalOpen(true) }}>Nuevo registro</Button>
      </div>

      {toast ? <Toast variant="success">{toast}</Toast> : null}
      {errorGlobal ? <Toast variant="error">{errorGlobal}</Toast> : null}

      <Card>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando registros...</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4 text-sm text-gray-600">
              Captura primero el personal, después el concepto/unidad/cantidad y finalmente genera el pago desde estos registros.
            </div>
            <Table>
              <thead>
                <tr>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Rancho</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo unitario</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.date}</TableCell>
                    <TableCell>{empleadosById[log.employeeId]?.nombreCompleto ?? 'Empleado'}</TableCell>
                    <TableCell>{log.ranchId ? ranchesById[log.ranchId] ?? log.ranchId : '—'}</TableCell>
                    <TableCell>{log.activity}</TableCell>
                    <TableCell>{getUnidadLabel(log.paymentUnit)}</TableCell>
                    <TableCell>{getWorkLogQuantity(log)}</TableCell>
                    <TableCell>{formatCurrency(log.rateUsed)}</TableCell>
                    <TableCell>{formatCurrency(log.amount)}</TableCell>
                    <TableCell>{log.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditing(log)
                            setForm({
                              date: log.date,
                              employeeId: log.employeeId,
                              ranchId: log.ranchId ?? '',
                              activity: log.activity,
                              paymentUnit: ACTIVE_UNITS.includes((log.paymentUnit ?? 'dia') as TasaUnidadActiva) ? (log.paymentUnit as TasaUnidadActiva) : 'dia',
                              quantity: getWorkLogQuantity(log),
                              rateUsed: log.rateUsed,
                              notes: log.notes ?? '',
                            })
                            setError('')
                            setModalOpen(true)
                          }}
                          disabled={log.status === 'PAID'}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            setLogs(await deleteWorkLog(log.id))
                            setToast('Registro eliminado')
                            window.setTimeout(() => setToast(''), 2500)
                          }}
                          disabled={log.status === 'PAID'}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} title={editing ? 'Editar registro de trabajo' : 'Nuevo registro de trabajo'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Fecha</label>
              <Input className="mt-2" type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
            </div>

            <div>
              <label className="text-sm">Empleado</label>
              <select
                className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.employeeId}
                onChange={(event) => {
                  const nextForm = { ...form, employeeId: event.target.value }
                  void hydrateSuggestedRate(nextForm)
                }}
              >
                <option value="">Selecciona empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>{empleado.nombreCompleto}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm">Rancho</label>
              <select
                className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.ranchId}
                onChange={(event) => {
                  const nextForm = { ...form, ranchId: event.target.value }
                  void hydrateSuggestedRate(nextForm)
                }}
              >
                <option value="">Sin rancho específico</option>
                {catalog.ranches.map((ranch) => (
                  <option key={ranch.id} value={ranch.id}>{ranch.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm">Unidad de pago</label>
              <select
                className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.paymentUnit}
                onChange={(event) => {
                  const nextForm = { ...form, paymentUnit: event.target.value as TasaUnidadActiva }
                  void hydrateSuggestedRate(nextForm)
                }}
              >
                {ACTIVE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>{getUnidadLabel(unit)}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm">Concepto / tarea</label>
              <Input
                className="mt-2"
                value={form.activity}
                onChange={(event) => {
                  const nextForm = { ...form, activity: event.target.value }
                  void hydrateSuggestedRate(nextForm)
                }}
              />
            </div>

            <div>
              <label className="text-sm">Cantidad</label>
              <Input className="mt-2" type="number" min={0} step="any" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))} />
            </div>

            <div>
              <label className="text-sm">Costo unitario</label>
              <Input className="mt-2" type="number" min={0} step="any" value={form.rateUsed} onChange={(event) => setForm((prev) => ({ ...prev, rateUsed: Number(event.target.value) }))} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4">
            <p className="text-sm text-gray-500">Total calculado</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(currentTotal)}</p>
            <p className="mt-2 text-xs text-gray-500">Se calcula como cantidad × costo unitario.</p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!form.employeeId || !form.activity.trim() || !form.date || !form.paymentUnit) {
                  setError('Completa fecha, empleado, concepto y unidad.')
                  return
                }

                if (form.quantity <= 0 || form.rateUsed <= 0) {
                  setError('Captura cantidad y costo unitario válidos.')
                  return
                }

                const payload = {
                  date: form.date,
                  employeeId: form.employeeId,
                  ranchId: form.ranchId || undefined,
                  activity: form.activity.trim(),
                  payType: getPaySchemeByUnidad(form.paymentUnit),
                  paymentUnit: form.paymentUnit,
                  quantity: form.quantity,
                  units: form.quantity,
                  rateUsed: form.rateUsed,
                  notes: form.notes.trim() || undefined,
                }

                setLogs(editing
                  ? await updateWorkLog({ ...editing, ...payload, amount: computeWorkLogAmount(form.quantity, form.rateUsed) })
                  : await addWorkLog(payload))
                setModalOpen(false)
                setEditing(null)
                setForm(initialForm)
                setError('')
                setToast('Registro guardado')
                window.setTimeout(() => setToast(''), 2500)
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
