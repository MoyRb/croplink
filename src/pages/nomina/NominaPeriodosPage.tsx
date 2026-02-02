import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import {
  addPeriodo,
  calculatePagoTotals,
  getEmpleados,
  getPagosByPeriodo,
  getPeriodos,
  updatePeriodoStatus,
  upsertPago,
  type Empleado,
  type PeriodoNomina,
  type PeriodoNominaStatus,
  type RegistroPago,
} from '../../lib/store/nomina'

const statusStyles: Record<PeriodoNominaStatus, string> = {
  Borrador: 'bg-gray-100 text-gray-600',
  Calculado: 'bg-blue-100 text-blue-700',
  Pagado: 'bg-emerald-100 text-emerald-700',
}

const initialForm = {
  nombre: '',
  fechaInicio: '',
  fechaFin: '',
}

const createPagoBase = (periodoId: string, empleado: Empleado, existing?: RegistroPago) => {
  const diasDefault = empleado.tipoPago === 'Diario' ? 6 : 1
  const diasTrabajados = existing?.diasTrabajados ?? diasDefault
  const horasExtra = existing?.horasExtra ?? 0
  const bono = existing?.bono ?? 0
  const descuento = existing?.descuento ?? 0
  const totals = calculatePagoTotals(
    empleado.tipoPago,
    empleado.salarioBase,
    diasTrabajados,
    horasExtra,
    bono,
    descuento,
  )

  return {
    id: existing?.id ?? `PAG-${periodoId}-${empleado.id}`,
    periodoId,
    empleadoId: empleado.id,
    diasTrabajados,
    horasExtra,
    bono,
    descuento,
    totalBruto: totals.totalBruto,
    totalNeto: totals.totalNeto,
    metodoPago: existing?.metodoPago ?? 'Transferencia',
    referencia: existing?.referencia,
    pagadoEn: existing?.pagadoEn,
    notas: existing?.notas,
  }
}

export function NominaPeriodosPage() {
  const navigate = useNavigate()
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>(() => getPeriodos())
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const sortedPeriodos = useMemo(
    () =>
      [...periodos].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [periodos],
  )

  const handleSave = () => {
    if (!formData.nombre.trim()) {
      setFormError('El nombre del periodo es obligatorio.')
      return
    }
    if (!formData.fechaInicio || !formData.fechaFin) {
      setFormError('Selecciona un rango de fechas.')
      return
    }
    if (new Date(formData.fechaInicio) > new Date(formData.fechaFin)) {
      setFormError('La fecha de inicio debe ser anterior a la fecha fin.')
      return
    }

    const updated = addPeriodo({
      nombre: formData.nombre,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin,
    })
    setPeriodos(updated)
    setModalOpen(false)
    setFormData(initialForm)
    setFormError('')
    setToastMessage('Periodo creado')
    window.setTimeout(() => setToastMessage(''), 2500)
  }

  const handleCalcular = (periodo: PeriodoNomina) => {
    const empleados = getEmpleados().filter((empleado) => empleado.activo)
    const pagos = getPagosByPeriodo(periodo.id)
    empleados.forEach((empleado) => {
      const existing = pagos.find((pago) => pago.empleadoId === empleado.id)
      const base = createPagoBase(periodo.id, empleado, existing)
      upsertPago(base)
    })
    setPeriodos(updatePeriodoStatus(periodo.id, 'Calculado'))
    setToastMessage('Periodo calculado')
    window.setTimeout(() => setToastMessage(''), 2500)
  }

  const handleMarkPaid = (periodo: PeriodoNomina) => {
    setPeriodos(updatePeriodoStatus(periodo.id, 'Pagado'))
    setToastMessage('Periodo marcado como pagado')
    window.setTimeout(() => setToastMessage(''), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Periodos</h1>
          <p className="text-sm text-gray-500">Define ciclos de pago y estatus.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Nuevo periodo</Button>
      </div>

      {toastMessage ? <Toast variant="success">{toastMessage}</Toast> : null}

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Historial de periodos</h2>
            <p className="text-sm text-gray-500">Gestiona cálculos y pagos.</p>
          </div>
        </div>

        <div className="mt-4">
          {sortedPeriodos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F5F5F5] p-8 text-center">
              <p className="text-sm text-gray-500">Aún no has creado periodos de nómina.</p>
              <Button className="mt-4" onClick={() => setModalOpen(true)}>
                Crear periodo
              </Button>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rango fechas</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {sortedPeriodos.map((periodo) => (
                  <TableRow
                    key={periodo.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/nomina/pagos?periodo=${periodo.id}`)}
                  >
                    <TableCell className="font-medium text-gray-900">{periodo.nombre}</TableCell>
                    <TableCell>
                      {periodo.fechaInicio} · {periodo.fechaFin}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[periodo.estatus]}>{periodo.estatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleCalcular(periodo)
                          }}
                        >
                          Calcular
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleMarkPaid(periodo)
                          }}
                        >
                          Marcar como pagado
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      <Modal open={modalOpen} title="Nuevo periodo" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
          <div>
            <label className="text-sm font-medium text-gray-700">Nombre</label>
            <Input
              className="mt-2"
              placeholder="Semana 03 - 2026"
              value={formData.nombre}
              onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
              <Input
                className="mt-2"
                type="date"
                value={formData.fechaInicio}
                onChange={(event) => setFormData({ ...formData, fechaInicio: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha fin</label>
              <Input
                className="mt-2"
                type="date"
                value={formData.fechaFin}
                onChange={(event) => setFormData({ ...formData, fechaFin: event.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
