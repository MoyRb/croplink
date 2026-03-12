import { useEffect, useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import {
  addEmpleado,
  getEmpleados,
  toggleEmpleadoActivo,
  updateEmpleado,
  type Empleado,
  type PayScheme,
  type TipoPago,
} from '../../lib/store/nomina'

const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)

const initialForm = {
  nombreCompleto: '', puesto: '', tipoPago: 'Diario' as TipoPago, salarioBase: 0, paySchemeDefault: 'DIARIO' as PayScheme,
  dailyRate: 0, taskRate: 0, unitRate: 0, activo: true, fechaAlta: new Date().toISOString().slice(0, 10), notas: '',
  homoclave: '', nss: '',
}

export function NominaEmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Empleado | null>(null)
  const [formData, setFormData] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      setEmpleados(await getEmpleados())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar empleados.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const filteredEmpleados = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return empleados
    return empleados.filter((e) => e.nombreCompleto.toLowerCase().includes(normalized) || e.puesto.toLowerCase().includes(normalized))
  }, [empleados, search])

  const openModal = (empleado?: Empleado) => {
    if (empleado) {
      setEditing(empleado)
      setFormData({ nombreCompleto: empleado.nombreCompleto, puesto: empleado.puesto, tipoPago: empleado.tipoPago, salarioBase: empleado.salarioBase, paySchemeDefault: empleado.paySchemeDefault, dailyRate: empleado.dailyRate ?? 0, taskRate: empleado.taskRate ?? 0, unitRate: empleado.unitRate ?? 0, activo: empleado.activo, fechaAlta: empleado.fechaAlta, notas: empleado.notas ?? '', homoclave: empleado.homoclave ?? '', nss: empleado.nss ?? '' })
    } else { setEditing(null); setFormData(initialForm) }
    setFormError(''); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nombreCompleto.trim() || !formData.puesto.trim()) return setFormError('Nombre y puesto son obligatorios.')
    if (formData.salarioBase <= 0) return setFormError('El salario base debe ser mayor a cero.')
    if (!formData.fechaAlta) return setFormError('Selecciona una fecha de alta.')
    const homoclaveNorm = formData.homoclave.trim().toUpperCase()
    if (homoclaveNorm && !/^[A-Z0-9]{3}$/.test(homoclaveNorm)) return setFormError('La homoclave debe tener exactamente 3 caracteres alfanuméricos.')
    setSaving(true); setFormError('')
    const payload = { ...formData, dailyRate: formData.dailyRate > 0 ? formData.dailyRate : undefined, taskRate: formData.taskRate > 0 ? formData.taskRate : undefined, unitRate: formData.unitRate > 0 ? formData.unitRate : undefined, notas: formData.notas?.trim() ? formData.notas : undefined, homoclave: homoclaveNorm || undefined, nss: formData.nss.trim() || undefined }
    try {
      setEmpleados(editing ? await updateEmpleado({ ...editing, ...payload }) : await addEmpleado(payload))
      setToastVisible(true); window.setTimeout(() => setToastVisible(false), 2500); setModalOpen(false)
    } catch (err) { setFormError(err instanceof Error ? err.message : 'No se pudo guardar.') } finally { setSaving(false) }
  }

  const handleToggle = async (id: string) => {
    try { setSaving(true); setEmpleados(await toggleEmpleadoActivo(id)) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo actualizar.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">{/* existing jsx */}
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold text-gray-900">Nómina · Empleados</h1><p className="text-sm text-gray-500">Administra el personal y su esquema de pago.</p></div><Button onClick={() => openModal()}>Nuevo empleado</Button></div>
    {toastVisible ? <Toast variant="success">Cambios guardados</Toast> : null}
    {error ? <Toast variant="error">{error}</Toast> : null}
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-900">Empleados activos</h2><p className="text-sm text-gray-500">Consulta puestos y tarifas por esquema.</p></div><Input className="w-full max-w-xs" placeholder="Buscar por nombre o puesto" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div className="mt-4">{loading ? <p className="text-sm text-gray-500">Cargando empleados...</p> : filteredEmpleados.length === 0 ? <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F5F5F5] p-8 text-center"><p className="text-sm text-gray-500">No hay empleados registrados. Crea el primero para comenzar.</p><Button className="mt-4" onClick={() => openModal()}>Crear empleado</Button></div> : <Table><thead><tr><TableHead>Nombre</TableHead><TableHead>Puesto</TableHead><TableHead>Esquema default</TableHead><TableHead>Tarifa día</TableHead><TableHead>Tarifa tarea</TableHead><TableHead>Tarifa unidad</TableHead><TableHead>Activo</TableHead><TableHead>Acciones</TableHead></tr></thead><tbody>{filteredEmpleados.map((empleado) => <TableRow key={empleado.id}><TableCell className="font-medium text-gray-900">{empleado.nombreCompleto}</TableCell><TableCell>{empleado.puesto}</TableCell><TableCell>{empleado.paySchemeDefault}</TableCell><TableCell>{empleado.dailyRate ? formatCurrency(empleado.dailyRate) : '—'}</TableCell><TableCell>{empleado.taskRate ? formatCurrency(empleado.taskRate) : '—'}</TableCell><TableCell>{empleado.unitRate ? formatCurrency(empleado.unitRate) : '—'}</TableCell><TableCell><button onClick={() => void handleToggle(empleado.id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${empleado.activo ? 'bg-[#DBFAE6] text-[#0B6B2A]' : 'bg-gray-100 text-gray-500'}`}>{empleado.activo ? 'Activo' : 'Inactivo'}</button></TableCell><TableCell><Button variant="ghost" onClick={() => openModal(empleado)}>Editar</Button></TableCell></TableRow>)}</tbody></Table>}</div></Card>
    <Modal open={modalOpen} title={editing ? 'Editar empleado' : 'Nuevo empleado'} onClose={() => setModalOpen(false)}>
      <div className="space-y-4">{formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
        {/* same fields */}
        <div className="grid gap-4 md:grid-cols-2"><div><label className="text-sm font-medium text-gray-700">Nombre completo</label><Input className="mt-2" value={formData.nombreCompleto} onChange={(event) => setFormData({ ...formData, nombreCompleto: event.target.value })} /></div><div><label className="text-sm font-medium text-gray-700">Puesto</label><Input className="mt-2" value={formData.puesto} onChange={(event) => setFormData({ ...formData, puesto: event.target.value })} /></div><div><label className="text-sm font-medium text-gray-700">Tipo de pago histórico</label><select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800" value={formData.tipoPago} onChange={(event) => setFormData({ ...formData, tipoPago: event.target.value as TipoPago })}><option value="Diario">Diario</option><option value="Semanal">Semanal</option></select></div><div><label className="text-sm font-medium text-gray-700">Salario base</label><Input className="mt-2" type="number" min={0} value={formData.salarioBase} onChange={(event) => setFormData({ ...formData, salarioBase: Number(event.target.value) })} /></div><div><label className="text-sm font-medium text-gray-700">Esquema de pago default</label><select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800" value={formData.paySchemeDefault} onChange={(event) => setFormData({ ...formData, paySchemeDefault: event.target.value as PayScheme })}><option value="DIARIO">DIARIO</option><option value="POR_TAREA">POR_TAREA</option><option value="POR_UNIDAD">POR_UNIDAD</option></select></div><div><label className="text-sm font-medium text-gray-700">Fecha de alta</label><Input className="mt-2" type="date" value={formData.fechaAlta} onChange={(event) => setFormData({ ...formData, fechaAlta: event.target.value })} /></div><div><label className="text-sm font-medium text-gray-700">Tarifa diaria (opcional)</label><Input className="mt-2" type="number" min={0} value={formData.dailyRate} onChange={(event) => setFormData({ ...formData, dailyRate: Number(event.target.value) })} /></div><div><label className="text-sm font-medium text-gray-700">Tarifa por tarea (opcional)</label><Input className="mt-2" type="number" min={0} value={formData.taskRate} onChange={(event) => setFormData({ ...formData, taskRate: Number(event.target.value) })} /></div><div><label className="text-sm font-medium text-gray-700">Tarifa por unidad (opcional)</label><Input className="mt-2" type="number" min={0} value={formData.unitRate} onChange={(event) => setFormData({ ...formData, unitRate: Number(event.target.value) })} /></div><div className="flex items-center gap-3"><input type="checkbox" checked={formData.activo} onChange={(event) => setFormData({ ...formData, activo: event.target.checked })} className="h-4 w-4" /><span className="text-sm text-gray-700">Empleado activo</span></div><div><label className="text-sm font-medium text-gray-700">Homoclave (RFC) <span className="text-gray-400 font-normal">opcional</span></label><Input className="mt-2" maxLength={3} placeholder="A1B" value={formData.homoclave} onChange={(event) => setFormData({ ...formData, homoclave: event.target.value.toUpperCase() })} /></div><div><label className="text-sm font-medium text-gray-700">NSS <span className="text-gray-400 font-normal">opcional</span></label><Input className="mt-2" maxLength={11} placeholder="12345678901" value={formData.nss} onChange={(event) => setFormData({ ...formData, nss: event.target.value.replace(/\D/g, '') })} /></div></div>
        <div><label className="text-sm font-medium text-gray-700">Notas</label><textarea className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800" rows={3} value={formData.notas} onChange={(event) => setFormData({ ...formData, notas: event.target.value })} /></div>
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}</Button></div>
      </div>
    </Modal>
  </div>
}
