import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import {
  createManualPayment,
  createPeriodPayment,
  createWorkLogPayment,
  getEmpleados,
  getPayments,
  getUnidadLabel,
  getWorkLogQuantity,
  getWorkLogs,
  type Empleado,
  type Payment,
  type WorkLog,
} from '../../lib/store/nomina'
import { useOperationCatalog } from '../../lib/operationCatalog/useOperationCatalog'

const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value)

export function NominaPagosPage() {
  const { catalog } = useOperationCatalog()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [logsModalOpen, setLogsModalOpen] = useState(false)
  const [periodForm, setPeriodForm] = useState({ employeeId: '', startDate: '', endDate: '', date: new Date().toISOString().slice(0, 10), note: '' })
  const [manualForm, setManualForm] = useState({ employeeId: '', date: new Date().toISOString().slice(0, 10), amount: 0, note: '' })
  const [logsForm, setLogsForm] = useState({ employeeId: '', date: new Date().toISOString().slice(0, 10), note: '', selectedIds: [] as string[] })

  const refreshState = async () => {
    const [loadedEmployees, loadedPayments, loadedWorkLogs] = await Promise.all([getEmpleados(), getPayments(), getWorkLogs()])
    setEmpleados(loadedEmployees)
    setPayments(loadedPayments)
    setWorkLogs(loadedWorkLogs)
  }

  useEffect(() => {
    void (async () => {
      try {
        await refreshState()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar pagos.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const ranchesById = useMemo(() => Object.fromEntries(catalog.ranches.map((item) => [item.id, item.name])), [catalog.ranches])
  const employeeName = (employeeId: string) => empleados.find((item) => item.id === employeeId)?.nombreCompleto ?? 'Empleado'
  const openWorkLogs = useMemo(() => workLogs.filter((log) => log.status === 'OPEN'), [workLogs])

  const openRangeTotal = useMemo(() => {
    if (!periodForm.employeeId || !periodForm.startDate || !periodForm.endDate) return { amount: 0, count: 0 }
    const selected = openWorkLogs.filter((log) => log.employeeId === periodForm.employeeId && log.date >= periodForm.startDate && log.date <= periodForm.endDate)
    return { amount: selected.reduce((sum, log) => sum + log.amount, 0), count: selected.length }
  }, [openWorkLogs, periodForm])

  const availableLogsForAutofill = useMemo(() => {
    if (!logsForm.employeeId) return openWorkLogs
    return openWorkLogs.filter((log) => log.employeeId === logsForm.employeeId)
  }, [logsForm.employeeId, openWorkLogs])

  const selectedLogs = useMemo(() => availableLogsForAutofill.filter((log) => logsForm.selectedIds.includes(log.id)), [availableLogsForAutofill, logsForm.selectedIds])

  const selectedSummary = useMemo(() => {
    if (!selectedLogs.length) {
      return {
        employeeId: logsForm.employeeId,
        period: '—',
        ranches: '—',
        concepts: '—',
        quantity: 0,
        unitCost: '—',
        total: 0,
      }
    }

    const dates = [...selectedLogs].map((log) => log.date).sort((a, b) => a.localeCompare(b))
    const ranches = Array.from(new Set(selectedLogs.map((log) => (log.ranchId ? (ranchesById[log.ranchId] ?? log.ranchId) : 'Sin rancho')))).join(', ')
    const concepts = Array.from(new Set(selectedLogs.map((log) => log.activity))).join(', ')
    const quantities = selectedLogs.reduce((sum, log) => sum + getWorkLogQuantity(log), 0)
    const uniqueRates = Array.from(new Set(selectedLogs.map((log) => log.rateUsed.toFixed(2))))
    const unitCost = uniqueRates.length === 1 ? formatCurrency(Number(uniqueRates[0])) : 'Mixto'

    return {
      employeeId: selectedLogs[0].employeeId,
      period: dates.length === 1 ? dates[0] : `${dates[0]} · ${dates.at(-1)}`,
      ranches,
      concepts,
      quantity: quantities,
      unitCost,
      total: selectedLogs.reduce((sum, log) => sum + log.amount, 0),
    }
  }, [logsForm.employeeId, ranchesById, selectedLogs])

  const summary = useMemo(() => ({
    total: payments.reduce((sum, payment) => sum + payment.amount, 0),
    period: payments.filter((payment) => payment.type === 'PERIODO').length,
    manual: payments.filter((payment) => payment.type === 'MANUAL').length,
    fromLogs: payments.filter((payment) => payment.type === 'REGISTROS').length,
    logsPaid: workLogs.filter((log) => log.status === 'PAID').length,
  }), [payments, workLogs])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Pagos</h1>
          <p className="text-sm text-gray-500">Prioriza pagos desde registros de trabajo; el flujo manual sigue disponible por compatibilidad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setManualModalOpen(true)}>Pago manual</Button>
          <Button variant="secondary" onClick={() => setPeriodModalOpen(true)}>Pago por periodo</Button>
          <Button onClick={() => setLogsModalOpen(true)}>Pago desde registros</Button>
        </div>
      </div>

      {toast ? <Toast variant="success">{toast}</Toast> : null}
      {error ? <Toast variant="error">{error}</Toast> : null}

      <div className="grid gap-4 md:grid-cols-5">
        <Card><p className="text-sm text-gray-500">Total pagado</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.total)}</p></Card>
        <Card><p className="text-sm text-gray-500">Pagos desde registros</p><p className="mt-2 text-2xl font-semibold">{summary.fromLogs}</p></Card>
        <Card><p className="text-sm text-gray-500">Pagos por periodo</p><p className="mt-2 text-2xl font-semibold">{summary.period}</p></Card>
        <Card><p className="text-sm text-gray-500">Pagos manuales</p><p className="mt-2 text-2xl font-semibold">{summary.manual}</p></Card>
        <Card><p className="text-sm text-gray-500">Registros marcados PAID</p><p className="mt-2 text-2xl font-semibold">{summary.logsPaid}</p></Card>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando pagos...</p>
        ) : (
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
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.note ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <Modal open={logsModalOpen} title="Crear pago desde registros" onClose={() => setLogsModalOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Empleado</label>
              <select className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={logsForm.employeeId} onChange={(event) => setLogsForm((prev) => ({ ...prev, employeeId: event.target.value, selectedIds: [] }))}>
                <option value="">Todos los empleados</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>{empleado.nombreCompleto}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm">Fecha de pago</label>
              <Input className="mt-2" type="date" value={logsForm.date} onChange={(event) => setLogsForm((prev) => ({ ...prev, date: event.target.value }))} />
            </div>
          </div>

          <div className="max-h-64 overflow-auto rounded-2xl border border-[#E5E7EB]">
            <Table>
              <thead>
                <tr>
                  <TableHead></TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Rancho</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo unitario</TableHead>
                  <TableHead>Total</TableHead>
                </tr>
              </thead>
              <tbody>
                {availableLogsForAutofill.map((log) => {
                  const checked = logsForm.selectedIds.includes(log.id)
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setLogsForm((prev) => ({
                              ...prev,
                              selectedIds: event.target.checked ? [...prev.selectedIds, log.id] : prev.selectedIds.filter((id) => id !== log.id),
                            }))
                          }}
                        />
                      </TableCell>
                      <TableCell>{log.date}</TableCell>
                      <TableCell>{log.ranchId ? ranchesById[log.ranchId] ?? log.ranchId : '—'}</TableCell>
                      <TableCell>{log.activity}</TableCell>
                      <TableCell>{getUnidadLabel(log.paymentUnit)}</TableCell>
                      <TableCell>{getWorkLogQuantity(log)}</TableCell>
                      <TableCell>{formatCurrency(log.rateUsed)}</TableCell>
                      <TableCell>{formatCurrency(log.amount)}</TableCell>
                    </TableRow>
                  )
                })}
              </tbody>
            </Table>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4 text-sm">
            <p className="font-medium text-gray-900">Autofill desde registros seleccionados</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <p><span className="text-gray-500">Empleado:</span> {selectedSummary.employeeId ? employeeName(selectedSummary.employeeId) : '—'}</p>
              <p><span className="text-gray-500">Fecha / periodo:</span> {selectedSummary.period}</p>
              <p><span className="text-gray-500">Rancho:</span> {selectedSummary.ranches}</p>
              <p><span className="text-gray-500">Concepto / tarea:</span> {selectedSummary.concepts}</p>
              <p><span className="text-gray-500">Cantidad:</span> {selectedSummary.quantity}</p>
              <p><span className="text-gray-500">Costo unitario:</span> {selectedSummary.unitCost}</p>
            </div>
            <p className="mt-3 text-xl font-semibold text-gray-900">Total pagado: {formatCurrency(selectedSummary.total)}</p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setLogsModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                try {
                  const result = await createWorkLogPayment({
                    date: logsForm.date,
                    employeeId: logsForm.employeeId || undefined,
                    workLogIds: logsForm.selectedIds,
                    note: logsForm.note || undefined,
                  })
                  setPayments(result.payments)
                  setWorkLogs(result.workLogs)
                  setLogsModalOpen(false)
                  setLogsForm({ employeeId: '', date: new Date().toISOString().slice(0, 10), note: '', selectedIds: [] })
                  setToast('Pago creado desde registros')
                  window.setTimeout(() => setToast(''), 2500)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'No se pudo crear el pago desde registros.')
                }
              }}
            >
              Confirmar pago
            </Button>
          </div>
        </div>
      </Modal>

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
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4">
            <p className="text-sm text-gray-500">Se liquidarán {openRangeTotal.count} registros OPEN.</p>
            <p className="text-xl font-semibold">{formatCurrency(openRangeTotal.amount)}</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPeriodModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                try {
                  await createPeriodPayment({ employeeId: periodForm.employeeId, date: periodForm.date, startDate: periodForm.startDate, endDate: periodForm.endDate, note: periodForm.note || undefined })
                  await refreshState()
                  setPeriodModalOpen(false)
                  setToast('Pago por periodo creado')
                  window.setTimeout(() => setToast(''), 2500)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'No se pudo crear pago.')
                }
              }}
            >
              Confirmar pago
            </Button>
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
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setManualModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                try {
                  setPayments(await createManualPayment({ employeeId: manualForm.employeeId, date: manualForm.date, amount: manualForm.amount, note: manualForm.note || undefined }))
                  setManualModalOpen(false)
                  setToast('Pago manual creado')
                  window.setTimeout(() => setToast(''), 2500)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'No se pudo crear pago manual.')
                }
              }}
            >
              Guardar pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
