import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { useOperationCatalog } from '../../lib/operationCatalog/useOperationCatalog'
import { addWorkLog, computeWorkLogAmount, deleteWorkLog, getEmployeeRateByPayType, getEmpleados, getWorkLogs, resolveTarifaActividad, updateWorkLog, type Empleado, type PayScheme, type WorkLog } from '../../lib/store/nomina'

const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value)
const unidadToPayType = (unidad?: string): PayScheme => (!unidad ? 'POR_UNIDAD' : unidad === 'dia' ? 'DIARIO' : 'POR_UNIDAD')
const initialForm = { date: new Date().toISOString().slice(0, 10), employeeId: '', ranchId: '', activity: '', payType: 'DIARIO' as PayScheme, units: 0, rateUsed: 0, notes: '' }

export function NominaRegistrosPage() {
  const { catalog } = useOperationCatalog()
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [errorGlobal, setErrorGlobal] = useState('')
  const filters = { employeeId: '', date: '', ranchId: '', status: '' as '' | 'OPEN' | 'PAID' }
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkLog | null>(null)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => { void (async () => { try { setLoading(true); const [l, e] = await Promise.all([getWorkLogs(), getEmpleados()]); setLogs(l); setEmpleados(e) } catch (err) { setErrorGlobal(err instanceof Error ? err.message : 'Error al cargar registros.') } finally { setLoading(false) } })() }, [])
  const empleadosById = useMemo(() => Object.fromEntries(empleados.map((item) => [item.id, item])), [empleados])
  const filteredLogs = useMemo(() => logs.filter((log) => (!filters.employeeId || log.employeeId === filters.employeeId) && (!filters.date || log.date === filters.date) && (!filters.ranchId || log.ranchId === filters.ranchId) && (!filters.status || log.status === filters.status)), [filters, logs])

  const handleActivityChange = async (activity: string) => {
    const tarifa = await resolveTarifaActividad({ actividad: activity, rancho: form.ranchId || undefined })
    setForm((prev) => ({ ...prev, activity, payType: tarifa ? unidadToPayType(tarifa.unidad) : prev.payType, rateUsed: tarifa ? tarifa.tarifa : prev.rateUsed }))
  }

  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold text-gray-900">Nómina · Registros</h1><p className="text-sm text-gray-500">Captura trabajo diario por empleado y actividad.</p></div><Button onClick={() => { setEditing(null); setForm(initialForm); setModalOpen(true) }}>Nuevo registro</Button></div>
    {toast ? <Toast variant="success">{toast}</Toast> : null}{errorGlobal ? <Toast variant="error">{errorGlobal}</Toast> : null}
    <Card>{loading ? <p className="text-sm text-gray-500">Cargando registros...</p> : <div className="mt-4"><Table><thead><tr><TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Rancho</TableHead><TableHead>Actividad</TableHead><TableHead>Tipo</TableHead><TableHead>Unidades</TableHead><TableHead>Tarifa</TableHead><TableHead>Monto</TableHead><TableHead>Estatus</TableHead><TableHead>Acciones</TableHead></tr></thead><tbody>{filteredLogs.map((log) => <TableRow key={log.id}><TableCell>{log.date}</TableCell><TableCell>{empleadosById[log.employeeId]?.nombreCompleto ?? 'Empleado'}</TableCell><TableCell>{catalog.ranches.find((r) => r.id === log.ranchId)?.name ?? '—'}</TableCell><TableCell>{log.activity}</TableCell><TableCell>{log.payType}</TableCell><TableCell>{log.units ?? '—'}</TableCell><TableCell>{formatCurrency(log.rateUsed)}</TableCell><TableCell>{formatCurrency(log.amount)}</TableCell><TableCell>{log.status}</TableCell><TableCell><div className="flex gap-2"><Button variant="ghost" onClick={() => { setEditing(log); setForm({ date: log.date, employeeId: log.employeeId, ranchId: log.ranchId ?? '', activity: log.activity, payType: log.payType, units: log.units ?? 0, rateUsed: log.rateUsed, notes: log.notes ?? '' }); setModalOpen(true) }} disabled={log.status === 'PAID'}>Editar</Button><Button variant="secondary" onClick={async () => { setLogs(await deleteWorkLog(log.id)); setToast('Registro eliminado'); window.setTimeout(() => setToast(''), 2500) }} disabled={log.status === 'PAID'}>Eliminar</Button></div></TableCell></TableRow>)}</tbody></Table></div>}</Card>
    <Modal open={modalOpen} title={editing ? 'Editar registro' : 'Nuevo registro'} onClose={() => setModalOpen(false)}><div className="space-y-4">{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}<div className="grid gap-4 md:grid-cols-2"><div><label className="text-sm">Fecha</label><Input className="mt-2" type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} /></div><div><label className="text-sm">Empleado</label><select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.employeeId} onChange={(event) => { const e = empleadosById[event.target.value]; const pt = form.payType; setForm((prev) => ({ ...prev, employeeId: event.target.value, rateUsed: e ? getEmployeeRateByPayType(e, pt) : prev.rateUsed })) }}><option value="">Selecciona empleado</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombreCompleto}</option>)}</select></div><div className="md:col-span-2"><label className="text-sm">Actividad</label><Input className="mt-2" value={form.activity} onChange={(e) => void handleActivityChange(e.target.value)} /></div><div><label className="text-sm">Tipo</label><select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.payType} onChange={(event) => setForm((prev) => ({ ...prev, payType: event.target.value as PayScheme }))}><option value="DIARIO">DIARIO</option><option value="POR_TAREA">POR_TAREA</option><option value="POR_UNIDAD">POR_UNIDAD</option></select></div><div><label className="text-sm">Tarifa</label><Input className="mt-2" type="number" min={0} value={form.rateUsed} onChange={(e) => setForm((p) => ({ ...p, rateUsed: Number(e.target.value) }))} /></div>{form.payType === 'POR_UNIDAD' ? <div><label className="text-sm">Unidades</label><Input className="mt-2" type="number" min={0} value={form.units} onChange={(e) => setForm((p) => ({ ...p, units: Number(e.target.value) }))} /></div> : null}</div><div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={async () => { if (!form.employeeId || !form.activity.trim() || !form.date || form.rateUsed <= 0) return setError('Completa los campos obligatorios.'); if (form.payType === 'POR_UNIDAD' && form.units <= 0) return setError('Captura unidades válidas.'); const payload = { ...form, ranchId: form.ranchId || undefined, units: form.payType === 'POR_UNIDAD' ? form.units : undefined, notes: form.notes.trim() || undefined }; setLogs(editing ? await updateWorkLog({ ...editing, ...payload, amount: computeWorkLogAmount(form.payType, form.rateUsed, form.units) }) : await addWorkLog(payload)); setModalOpen(false); setToast('Registro guardado'); window.setTimeout(() => setToast(''), 2500) }}>Guardar</Button></div></div></Modal>
  </div>
}
