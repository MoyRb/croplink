import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { addPeriodo, calculatePagoTotals, getEmpleados, getPagosByPeriodo, getPeriodos, updatePeriodoStatus, upsertPago, type Empleado, type PeriodoNomina, type PeriodoNominaStatus, type RegistroPago } from '../../lib/store/nomina'

const statusStyles: Record<PeriodoNominaStatus, string> = { Borrador: 'bg-gray-100 text-gray-600', Calculado: 'bg-blue-100 text-blue-700', Pagado: 'bg-emerald-100 text-emerald-700' }
const initialForm = { nombre: '', fechaInicio: '', fechaFin: '' }

const createPagoBase = (periodoId: string, empleado: Empleado, existing?: RegistroPago): RegistroPago => {
  const diasTrabajados = existing?.diasTrabajados ?? (empleado.tipoPago === 'Diario' ? 6 : 1)
  const horasExtra = existing?.horasExtra ?? 0
  const bono = existing?.bono ?? 0
  const descuento = existing?.descuento ?? 0
  const totals = calculatePagoTotals(empleado.tipoPago, empleado.salarioBase, diasTrabajados, horasExtra, bono, descuento)
  return { id: existing?.id ?? `PAG-${periodoId}-${empleado.id}`, periodoId, empleadoId: empleado.id, diasTrabajados, horasExtra, bono, descuento, totalBruto: totals.totalBruto, totalNeto: totals.totalNeto, metodoPago: existing?.metodoPago ?? 'Transferencia', referencia: existing?.referencia, pagadoEn: existing?.pagadoEn, notas: existing?.notas }
}

export function NominaPeriodosPage() {
  const navigate = useNavigate()
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const sortedPeriodos = useMemo(() => [...periodos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [periodos])

  const load = async () => { try { setLoading(true); setPeriodos(await getPeriodos()); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar periodos.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])

  const handleSave = async () => {
    if (!formData.nombre.trim()) return setFormError('El nombre del periodo es obligatorio.')
    if (!formData.fechaInicio || !formData.fechaFin) return setFormError('Selecciona un rango de fechas.')
    if (new Date(formData.fechaInicio) > new Date(formData.fechaFin)) return setFormError('La fecha de inicio debe ser anterior a la fecha fin.')
    try { setSaving(true); setPeriodos(await addPeriodo(formData)); setModalOpen(false); setFormData(initialForm); setToastMessage('Periodo creado'); window.setTimeout(() => setToastMessage(''), 2500) }
    catch (e) { setFormError(e instanceof Error ? e.message : 'No se pudo crear el periodo.') }
    finally { setSaving(false) }
  }

  const handleCalcular = async (periodo: PeriodoNomina) => {
    try {
      setSaving(true)
      const empleados = (await getEmpleados()).filter((e) => e.activo)
      const pagos = await getPagosByPeriodo(periodo.id)
      await Promise.all(empleados.map((empleado) => upsertPago(createPagoBase(periodo.id, empleado, pagos.find((p) => p.empleadoId === empleado.id)))))
      setPeriodos(await updatePeriodoStatus(periodo.id, 'Calculado'))
      setToastMessage('Periodo calculado'); window.setTimeout(() => setToastMessage(''), 2500)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo calcular el periodo.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold text-gray-900">Nómina · Periodos</h1><p className="text-sm text-gray-500">Define ciclos de pago y estatus.</p></div><Button onClick={() => setModalOpen(true)}>Nuevo periodo</Button></div>
    {toastMessage ? <Toast variant="success">{toastMessage}</Toast> : null}{error ? <Toast variant="error">{error}</Toast> : null}
    <Card><div className="mt-4">{loading ? <p className="text-sm text-gray-500">Cargando periodos...</p> : sortedPeriodos.length === 0 ? <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F5F5F5] p-8 text-center"><p className="text-sm text-gray-500">Aún no has creado periodos de nómina.</p><Button className="mt-4" onClick={() => setModalOpen(true)}>Crear periodo</Button></div> : <Table><thead><tr><TableHead>Nombre</TableHead><TableHead>Rango fechas</TableHead><TableHead>Estatus</TableHead><TableHead>Acciones</TableHead></tr></thead><tbody>{sortedPeriodos.map((periodo) => <TableRow key={periodo.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/nomina/pagos?periodo=${periodo.id}`)}><TableCell className="font-medium text-gray-900">{periodo.nombre}</TableCell><TableCell>{periodo.fechaInicio} · {periodo.fechaFin}</TableCell><TableCell><Badge className={statusStyles[periodo.estatus]}>{periodo.estatus}</Badge></TableCell><TableCell><div className="flex gap-2"><Button variant="secondary" onClick={(e) => { e.stopPropagation(); void handleCalcular(periodo) }} disabled={saving}>Calcular</Button><Button variant="ghost" onClick={async (e) => { e.stopPropagation(); setPeriodos(await updatePeriodoStatus(periodo.id, 'Pagado')) }}>Marcar como pagado</Button></div></TableCell></TableRow>)}</tbody></Table>}</div></Card>
    <Modal open={modalOpen} title="Nuevo periodo" onClose={() => setModalOpen(false)}><div className="space-y-4">{formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}<div><label className="text-sm font-medium text-gray-700">Nombre</label><Input className="mt-2" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></div><div className="grid gap-4 md:grid-cols-2"><div><label className="text-sm">Fecha inicio</label><Input className="mt-2" type="date" value={formData.fechaInicio} onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })} /></div><div><label className="text-sm">Fecha fin</label><Input className="mt-2" type="date" value={formData.fechaFin} onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })} /></div></div><div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></div></div></Modal>
  </div>
}
