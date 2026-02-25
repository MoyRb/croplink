import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { getCatalog } from '../../lib/operationCatalog/repo'
import {
  addWorkLog,
  computeWorkLogAmount,
  deleteWorkLog,
  getEmployeeRateByPayType,
  getEmpleados,
  getWorkLogs,
  updateWorkLog,
  type PayScheme,
  type WorkLog,
} from '../../lib/store/nomina'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value)

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  employeeId: '',
  ranchId: '',
  activity: '',
  payType: 'DIARIO' as PayScheme,
  units: 0,
  rateUsed: 0,
  notes: '',
}

export function NominaRegistrosPage() {
  const [logs, setLogs] = useState(() => getWorkLogs())
  const [empleados] = useState(() => getEmpleados())
  const [catalog] = useState(() => getCatalog())
  const [filters, setFilters] = useState({ employeeId: '', date: '', ranchId: '', status: '' as '' | 'OPEN' | 'PAID' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkLog | null>(null)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const empleadosById = useMemo(() => Object.fromEntries(empleados.map((item) => [item.id, item])), [empleados])

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (filters.employeeId && log.employeeId !== filters.employeeId) return false
        if (filters.date && log.date !== filters.date) return false
        if (filters.ranchId && log.ranchId !== filters.ranchId) return false
        if (filters.status && log.status !== filters.status) return false
        return true
      }),
    [filters, logs],
  )

  const totals = useMemo(() => {
    const periodTotal = filteredLogs.reduce((sum, log) => sum + log.amount, 0)
    const byDate = filteredLogs.reduce<Record<string, number>>((acc, log) => {
      acc[log.date] = (acc[log.date] ?? 0) + log.amount
      return acc
    }, {})
    const topDay = Object.entries(byDate).sort((a, b) => b[1] - a[1])[0]
    return { periodTotal, topDay }
  }, [filteredLogs])

  const resetForm = () => {
    setForm(initialForm)
    setEditing(null)
    setError('')
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (log: WorkLog) => {
    setEditing(log)
    setForm({
      date: log.date,
      employeeId: log.employeeId,
      ranchId: log.ranchId ?? '',
      activity: log.activity,
      payType: log.payType,
      units: log.units ?? 0,
      rateUsed: log.rateUsed,
      notes: log.notes ?? '',
    })
    setError('')
    setModalOpen(true)
  }

  const handleEmployeeChange = (employeeId: string, payType: PayScheme) => {
    const employee = empleadosById[employeeId]
    setForm((prev) => ({
      ...prev,
      employeeId,
      rateUsed: employee ? getEmployeeRateByPayType(employee, payType) : prev.rateUsed,
    }))
  }

  const handlePayTypeChange = (payType: PayScheme) => {
    const employee = empleadosById[form.employeeId]
    setForm((prev) => ({
      ...prev,
      payType,
      rateUsed: employee ? getEmployeeRateByPayType(employee, payType) : prev.rateUsed,
    }))
  }

  const handleSave = () => {
    if (!form.employeeId || !form.activity.trim() || !form.date) {
      setError('Empleado, fecha y actividad son obligatorios.')
      return
    }
    if (form.rateUsed <= 0) {
      setError('La tarifa usada debe ser mayor a cero.')
      return
    }
    if (form.payType === 'POR_UNIDAD' && form.units <= 0) {
      setError('Captura unidades mayores a cero para pago por unidad.')
      return
    }

    if (editing) {
      setLogs(
        updateWorkLog({
          ...editing,
          ...form,
          ranchId: form.ranchId || undefined,
          units: form.payType === 'POR_UNIDAD' ? form.units : undefined,
          notes: form.notes.trim() || undefined,
          amount: computeWorkLogAmount(form.payType, form.rateUsed, form.units),
        }),
      )
    } else {
      setLogs(
        addWorkLog({
          ...form,
          ranchId: form.ranchId || undefined,
          units: form.payType === 'POR_UNIDAD' ? form.units : undefined,
          notes: form.notes.trim() || undefined,
        }),
      )
    }

    setToast('Registro guardado')
    window.setTimeout(() => setToast(''), 2500)
    setModalOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    setLogs(deleteWorkLog(id))
    setToast('Registro eliminado')
    window.setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Registros de trabajo</h1>
          <p className="text-sm text-gray-500">Captura y controla pagos variables por trabajo.</p>
        </div>
        <Button onClick={openCreate}>Nuevo registro</Button>
      </div>

      {toast ? <Toast variant="success">{toast}</Toast> : null}

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
            value={filters.employeeId}
            onChange={(event) => setFilters((prev) => ({ ...prev, employeeId: event.target.value }))}
          >
            <option value="">Empleado (todos)</option>
            {empleados.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>{empleado.nombreCompleto}</option>
            ))}
          </select>
          <Input type="date" value={filters.date} onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))} />
          <select
            className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
            value={filters.ranchId}
            onChange={(event) => setFilters((prev) => ({ ...prev, ranchId: event.target.value }))}
          >
            <option value="">Rancho (todos)</option>
            {catalog.ranches.map((ranch) => (
              <option key={ranch.id} value={ranch.id}>{ranch.name}</option>
            ))}
          </select>
          <select
            className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as '' | 'OPEN' | 'PAID' }))}
          >
            <option value="">Estatus (todos)</option>
            <option value="OPEN">OPEN</option>
            <option value="PAID">PAID</option>
          </select>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4">
            <p className="text-xs text-gray-500">Total del periodo filtrado</p>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(totals.periodTotal)}</p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4">
            <p className="text-xs text-gray-500">Total por día (máximo)</p>
            <p className="text-xl font-semibold text-gray-900">
              {totals.topDay ? `${totals.topDay[0]} · ${formatCurrency(totals.topDay[1])}` : 'Sin datos'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Tarifa</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead>Acciones</TableHead>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.date}</TableCell>
                  <TableCell>{empleadosById[log.employeeId]?.nombreCompleto ?? 'Empleado'}</TableCell>
                  <TableCell>{catalog.ranches.find((item) => item.id === log.ranchId)?.name ?? '—'}</TableCell>
                  <TableCell>{log.activity}</TableCell>
                  <TableCell>{log.payType}</TableCell>
                  <TableCell>{log.units ?? '—'}</TableCell>
                  <TableCell>{formatCurrency(log.rateUsed)}</TableCell>
                  <TableCell className="font-semibold text-gray-900">{formatCurrency(log.amount)}</TableCell>
                  <TableCell>{log.status}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => openEdit(log)} disabled={log.status === 'PAID'}>Editar</Button>
                      <Button variant="secondary" onClick={() => handleDelete(log.id)} disabled={log.status === 'PAID'}>Eliminar</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Modal open={modalOpen} title={editing ? 'Editar registro' : 'Nuevo registro'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Fecha</label>
              <Input className="mt-2" type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Empleado</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.employeeId} onChange={(event) => handleEmployeeChange(event.target.value, form.payType)}>
                <option value="">Selecciona empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>{empleado.nombreCompleto}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Rancho (opcional)</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.ranchId} onChange={(event) => setForm((prev) => ({ ...prev, ranchId: event.target.value }))}>
                <option value="">Sin rancho</option>
                {catalog.ranches.map((ranch) => (
                  <option key={ranch.id} value={ranch.id}>{ranch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Tipo de pago</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.payType} onChange={(event) => handlePayTypeChange(event.target.value as PayScheme)}>
                <option value="DIARIO">DIARIO</option>
                <option value="POR_TAREA">POR_TAREA</option>
                <option value="POR_UNIDAD">POR_UNIDAD</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Actividad</label>
              <Input className="mt-2" value={form.activity} onChange={(event) => setForm((prev) => ({ ...prev, activity: event.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Tarifa usada</label>
              <Input className="mt-2" type="number" min={0} value={form.rateUsed} onChange={(event) => setForm((prev) => ({ ...prev, rateUsed: Number(event.target.value) }))} />
            </div>
            {form.payType === 'POR_UNIDAD' ? (
              <div>
                <label className="text-sm">Unidades</label>
                <Input className="mt-2" type="number" min={0} value={form.units} onChange={(event) => setForm((prev) => ({ ...prev, units: Number(event.target.value) }))} />
              </div>
            ) : null}
            <div className="md:col-span-2">
              <label className="text-sm">Notas</label>
              <textarea
                className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4">
            <p className="text-xs text-gray-500">Monto calculado</p>
            <p className="text-lg font-semibold">{formatCurrency(computeWorkLogAmount(form.payType, form.rateUsed, form.units))}</p>
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
