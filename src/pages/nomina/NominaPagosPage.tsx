import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import {
  createManualPayment,
  createPeriodPayment,
  getEmpleados,
  getPayments,
  getWorkLogs,
  type Payment,
} from '../../lib/store/nomina'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value)

export function NominaPagosPage() {
  const [empleados] = useState(() => getEmpleados())
  const [payments, setPayments] = useState<Payment[]>(() => getPayments())
  const [workLogs, setWorkLogs] = useState(() => getWorkLogs())
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [periodForm, setPeriodForm] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  })
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    note: '',
  })

  const openRangeTotal = useMemo(() => {
    if (!periodForm.employeeId || !periodForm.startDate || !periodForm.endDate) return { amount: 0, count: 0 }
    const selected = workLogs.filter(
      (log) =>
        log.employeeId === periodForm.employeeId &&
        log.status === 'OPEN' &&
        log.date >= periodForm.startDate &&
        log.date <= periodForm.endDate,
    )
    return { amount: selected.reduce((sum, log) => sum + log.amount, 0), count: selected.length }
  }, [periodForm.employeeId, periodForm.endDate, periodForm.startDate, workLogs])

  const summary = useMemo(() => {
    const total = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const period = payments.filter((payment) => payment.type === 'PERIODO').length
    const manual = payments.filter((payment) => payment.type === 'MANUAL').length
    const logsPaid = workLogs.filter((log) => log.status === 'PAID').length
    return { total, period, manual, logsPaid }
  }, [payments, workLogs])

  const employeeName = (employeeId: string) =>
    empleados.find((item) => item.id === employeeId)?.nombreCompleto ?? 'Empleado'

  const refreshState = () => {
    setPayments(getPayments())
    setWorkLogs(getWorkLogs())
  }

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }

  const handleCreatePeriodPayment = () => {
    setError('')
    if (!periodForm.employeeId || !periodForm.startDate || !periodForm.endDate || !periodForm.date) {
      setError('Selecciona empleado y rango de fechas.')
      return
    }
    if (periodForm.startDate > periodForm.endDate) {
      setError('La fecha inicial debe ser menor o igual a la fecha final.')
      return
    }
    if (openRangeTotal.count === 0) {
      setError('No hay registros OPEN para ese periodo.')
      return
    }

    createPeriodPayment({
      employeeId: periodForm.employeeId,
      date: periodForm.date,
      startDate: periodForm.startDate,
      endDate: periodForm.endDate,
      note: periodForm.note.trim() || undefined,
    })
    refreshState()
    setPeriodModalOpen(false)
    setPeriodForm({ employeeId: '', startDate: '', endDate: '', date: new Date().toISOString().slice(0, 10), note: '' })
    notify('Pago por periodo creado')
  }

  const handleCreateManualPayment = () => {
    setError('')
    if (!manualForm.employeeId || !manualForm.date || manualForm.amount <= 0) {
      setError('Completa empleado, fecha y monto válido.')
      return
    }

    createManualPayment({
      employeeId: manualForm.employeeId,
      date: manualForm.date,
      amount: manualForm.amount,
      note: manualForm.note.trim() || undefined,
    })
    refreshState()
    setManualModalOpen(false)
    setManualForm({ employeeId: '', date: new Date().toISOString().slice(0, 10), amount: 0, note: '' })
    notify('Pago manual creado')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Pagos</h1>
          <p className="text-sm text-gray-500">Liquida periodos de trabajo o registra pagos manuales.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setManualModalOpen(true)}>Pago manual</Button>
          <Button onClick={() => setPeriodModalOpen(true)}>Pago por periodo</Button>
        </div>
      </div>

      {toast ? <Toast variant="success">{toast}</Toast> : null}
      {error ? <Toast variant="error">{error}</Toast> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-gray-500">Total pagado</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.total)}</p></Card>
        <Card><p className="text-sm text-gray-500">Pagos por periodo</p><p className="mt-2 text-2xl font-semibold">{summary.period}</p></Card>
        <Card><p className="text-sm text-gray-500">Pagos manuales</p><p className="mt-2 text-2xl font-semibold">{summary.manual}</p></Card>
        <Card><p className="text-sm text-gray-500">Registros marcados PAID</p><p className="mt-2 text-2xl font-semibold">{summary.logsPaid}</p></Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Historial</h2>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Registros ligados</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Nota</TableHead>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{employeeName(payment.employeeId)}</TableCell>
                  <TableCell>{payment.type}</TableCell>
                  <TableCell>{payment.startDate && payment.endDate ? `${payment.startDate} · ${payment.endDate}` : '—'}</TableCell>
                  <TableCell>{payment.linkedWorkLogIds.length || '—'}</TableCell>
                  <TableCell className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{payment.note ?? '—'}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Modal open={periodModalOpen} title="Crear pago por periodo" onClose={() => setPeriodModalOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Empleado</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={periodForm.employeeId} onChange={(event) => setPeriodForm((prev) => ({ ...prev, employeeId: event.target.value }))}>
                <option value="">Selecciona empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>{empleado.nombreCompleto}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Fecha de pago</label>
              <Input className="mt-2" type="date" value={periodForm.date} onChange={(event) => setPeriodForm((prev) => ({ ...prev, date: event.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Inicio</label>
              <Input className="mt-2" type="date" value={periodForm.startDate} onChange={(event) => setPeriodForm((prev) => ({ ...prev, startDate: event.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Fin</label>
              <Input className="mt-2" type="date" value={periodForm.endDate} onChange={(event) => setPeriodForm((prev) => ({ ...prev, endDate: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Nota (opcional)</label>
              <textarea className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm" rows={3} value={periodForm.note} onChange={(event) => setPeriodForm((prev) => ({ ...prev, note: event.target.value }))} />
            </div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4">
            <p className="text-sm text-gray-500">Se liquidarán {openRangeTotal.count} registros OPEN.</p>
            <p className="text-xl font-semibold">{formatCurrency(openRangeTotal.amount)}</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPeriodModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePeriodPayment}>Confirmar pago</Button>
          </div>
        </div>
      </Modal>

      <Modal open={manualModalOpen} title="Registrar pago manual" onClose={() => setManualModalOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Empleado</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={manualForm.employeeId} onChange={(event) => setManualForm((prev) => ({ ...prev, employeeId: event.target.value }))}>
                <option value="">Selecciona empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>{empleado.nombreCompleto}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Fecha</label>
              <Input className="mt-2" type="date" value={manualForm.date} onChange={(event) => setManualForm((prev) => ({ ...prev, date: event.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Monto</label>
              <Input className="mt-2" type="number" min={0} value={manualForm.amount} onChange={(event) => setManualForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Nota</label>
              <textarea className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm" rows={3} value={manualForm.note} onChange={(event) => setManualForm((prev) => ({ ...prev, note: event.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setManualModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateManualPayment}>Guardar pago</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
