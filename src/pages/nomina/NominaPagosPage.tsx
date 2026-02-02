import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import {
  calculatePagoTotals,
  getEmpleados,
  getPagosByPeriodo,
  getPeriodos,
  upsertPago,
  type Empleado,
  type MetodoPago,
  type PeriodoNomina,
  type RegistroPago,
} from '../../lib/store/nomina'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

const emptyForm = {
  diasTrabajados: 0,
  horasExtra: 0,
  bono: 0,
  descuento: 0,
  metodoPago: 'Transferencia' as MetodoPago,
  referencia: '',
  notas: '',
}

export function NominaPagosPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const periodos = getPeriodos()
  const empleados = getEmpleados()
  const [selectedPago, setSelectedPago] = useState<RegistroPago | null>(null)
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [toastMessage, setToastMessage] = useState('')

  const selectedPeriodoId = searchParams.get('periodo') ?? periodos[0]?.id ?? ''
  const selectedPeriodo = periodos.find((periodo) => periodo.id === selectedPeriodoId) ?? null
  const pagos = selectedPeriodoId ? getPagosByPeriodo(selectedPeriodoId) : []

  const empleadosById = useMemo(
    () =>
      empleados.reduce<Record<string, Empleado>>((acc, empleado) => {
        acc[empleado.id] = empleado
        return acc
      }, {}),
    [empleados],
  )

  const summary = useMemo(() => {
    const totalBruto = pagos.reduce((acc, pago) => acc + pago.totalBruto, 0)
    const totalNeto = pagos.reduce((acc, pago) => acc + pago.totalNeto, 0)
    const pagados = pagos.filter((pago) => pago.pagadoEn).length
    const pendientes = pagos.length - pagados
    return { totalBruto, totalNeto, pagados, pendientes }
  }, [pagos])

  const handlePeriodoChange = (periodoId: string) => {
    setSearchParams(periodoId ? { periodo: periodoId } : {})
  }

  const openEdit = (pago: RegistroPago) => {
    const empleado = empleadosById[pago.empleadoId]
    setSelectedPago(pago)
    setSelectedEmpleado(empleado ?? null)
    setFormData({
      diasTrabajados: pago.diasTrabajados,
      horasExtra: pago.horasExtra,
      bono: pago.bono,
      descuento: pago.descuento,
      metodoPago: pago.metodoPago,
      referencia: pago.referencia ?? '',
      notas: pago.notas ?? '',
    })
  }

  const handleSave = () => {
    if (!selectedPago || !selectedEmpleado) return
    const totals = calculatePagoTotals(
      selectedEmpleado.tipoPago,
      selectedEmpleado.salarioBase,
      formData.diasTrabajados,
      formData.horasExtra,
      formData.bono,
      formData.descuento,
    )
    const updated: RegistroPago = {
      ...selectedPago,
      diasTrabajados: formData.diasTrabajados,
      horasExtra: formData.horasExtra,
      bono: formData.bono,
      descuento: formData.descuento,
      totalBruto: totals.totalBruto,
      totalNeto: totals.totalNeto,
      metodoPago: formData.metodoPago,
      referencia: formData.referencia || undefined,
      notas: formData.notas || undefined,
    }
    upsertPago(updated)
    setSelectedPago(null)
    setSelectedEmpleado(null)
    setToastMessage('Pago actualizado')
    window.setTimeout(() => setToastMessage(''), 2500)
  }

  const handleMarkPaid = (pago: RegistroPago) => {
    const updated = {
      ...pago,
      pagadoEn: new Date().toISOString().slice(0, 10),
    }
    upsertPago(updated)
    setToastMessage('Pago marcado como pagado')
    window.setTimeout(() => setToastMessage(''), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Pagos</h1>
          <p className="text-sm text-gray-500">Control de pagos por periodo.</p>
        </div>
        <div className="min-w-[220px]">
          <select
            className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
            value={selectedPeriodoId}
            onChange={(event) => handlePeriodoChange(event.target.value)}
          >
            {periodos.length === 0 ? <option value="">Sin periodos</option> : null}
            {periodos.map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {toastMessage ? <Toast variant="success">{toastMessage}</Toast> : null}

      {!selectedPeriodo ? (
        <Card>
          <div className="text-center text-sm text-gray-500">
            No hay periodos disponibles. Crea un periodo para continuar.
          </div>
          <Button className="mt-4" onClick={() => navigate('/nomina/periodos')}>
            Crear periodo
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Total bruto', value: formatCurrency(summary.totalBruto) },
              { label: 'Total neto', value: formatCurrency(summary.totalNeto) },
              { label: 'Pagados', value: String(summary.pagados) },
              { label: 'Pendientes', value: String(summary.pendientes) },
            ].map((item) => (
              <Card key={item.label}>
                <div className="text-sm text-gray-500">{item.label}</div>
                <div className="mt-3 text-2xl font-semibold text-gray-900">{item.value}</div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detalle de pagos</h2>
                <p className="text-sm text-gray-500">
                  {selectedPeriodo.nombre} · {selectedPeriodo.fechaInicio} - {selectedPeriodo.fechaFin}
                </p>
              </div>
            </div>
            <div className="mt-4">
              {pagos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F5F5F5] p-8 text-center">
                  <p className="text-sm text-gray-500">
                    No hay pagos calculados para este periodo.
                  </p>
                  <Button className="mt-4" onClick={() => navigate('/nomina/periodos')}>
                    Ir a periodos
                  </Button>
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Hrs extra</TableHead>
                      <TableHead>Bono</TableHead>
                      <TableHead>Descuento</TableHead>
                      <TableHead>Neto</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead>Acciones</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((pago) => {
                      const empleado = empleadosById[pago.empleadoId]
                      const isPaid = Boolean(pago.pagadoEn)
                      return (
                        <TableRow key={pago.id}>
                          <TableCell className="font-medium text-gray-900">
                            {empleado?.nombreCompleto ?? 'Empleado'}
                          </TableCell>
                          <TableCell>{pago.diasTrabajados}</TableCell>
                          <TableCell>{pago.horasExtra}</TableCell>
                          <TableCell>{formatCurrency(pago.bono)}</TableCell>
                          <TableCell>{formatCurrency(pago.descuento)}</TableCell>
                          <TableCell className="font-semibold text-gray-900">
                            {formatCurrency(pago.totalNeto)}
                          </TableCell>
                          <TableCell>
                            <Badge className={isPaid ? 'bg-emerald-100 text-emerald-700' : ''}>
                              {isPaid ? 'Pagado' : 'Pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="ghost" onClick={() => openEdit(pago)}>
                                Editar
                              </Button>
                              {!isPaid ? (
                                <Button variant="secondary" onClick={() => handleMarkPaid(pago)}>
                                  Marcar pagado
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </div>
          </Card>
        </>
      )}

      <Modal
        open={Boolean(selectedPago)}
        title="Editar pago"
        onClose={() => {
          setSelectedPago(null)
          setSelectedEmpleado(null)
        }}
      >
        {selectedPago && selectedEmpleado ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4 text-sm text-gray-600">
              {selectedEmpleado.nombreCompleto} · {selectedEmpleado.puesto} · Pago{' '}
              {selectedEmpleado.tipoPago.toLowerCase()}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Días trabajados</label>
                <input
                  className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                  type="number"
                  min={0}
                  value={formData.diasTrabajados}
                  onChange={(event) =>
                    setFormData({ ...formData, diasTrabajados: Number(event.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Horas extra</label>
                <input
                  className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                  type="number"
                  min={0}
                  value={formData.horasExtra}
                  onChange={(event) =>
                    setFormData({ ...formData, horasExtra: Number(event.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Bono</label>
                <input
                  className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                  type="number"
                  min={0}
                  value={formData.bono}
                  onChange={(event) =>
                    setFormData({ ...formData, bono: Number(event.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descuento</label>
                <input
                  className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                  type="number"
                  min={0}
                  value={formData.descuento}
                  onChange={(event) =>
                    setFormData({ ...formData, descuento: Number(event.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Método de pago</label>
                <select
                  className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                  value={formData.metodoPago}
                  onChange={(event) =>
                    setFormData({ ...formData, metodoPago: event.target.value as MetodoPago })
                  }
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Referencia</label>
                <input
                  className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                  value={formData.referencia}
                  onChange={(event) => setFormData({ ...formData, referencia: event.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Notas</label>
              <textarea
                className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                rows={3}
                value={formData.notas}
                onChange={(event) => setFormData({ ...formData, notas: event.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedPago(null)
                  setSelectedEmpleado(null)
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar cambios</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
