import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Toast } from '../../components/ui/Toast'
import { getEmpleados, getPayments, getWorkLogs } from '../../lib/store/nomina'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value)

export function NominaReportesPage() {
  const [toastVisible, setToastVisible] = useState(false)
  const empleados = getEmpleados()
  const payments = getPayments()
  const workLogs = getWorkLogs()

  const resumen = useMemo(() => {
    const totalPagado = payments.reduce((acc, payment) => acc + payment.amount, 0)
    const promedioPago = payments.length ? totalPagado / payments.length : 0
    const topEmpleados = [...empleados]
      .map((empleado) => ({
        empleado: empleado.nombreCompleto,
        total: payments
          .filter((payment) => payment.employeeId === empleado.id)
          .reduce((sum, payment) => sum + payment.amount, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
    const openLogs = workLogs.filter((item) => item.status === 'OPEN').length
    return { totalPagado, promedioPago, topEmpleados, openLogs }
  }, [empleados, payments, workLogs])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Reportes</h1>
          <p className="text-sm text-gray-500">Indicadores rápidos de pagos variables y pendientes.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setToastVisible(true)
            window.setTimeout(() => setToastVisible(false), 2500)
          }}
        >
          Exportar
        </Button>
      </div>

      {toastVisible ? <Toast>Próximamente</Toast> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="text-sm text-gray-500">Total pagado</div>
          <div className="mt-3 text-2xl font-semibold text-gray-900">{formatCurrency(resumen.totalPagado)}</div>
          <p className="mt-2 text-xs text-gray-400">Incluye pagos manuales y por periodo</p>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Promedio por pago</div>
          <div className="mt-3 text-2xl font-semibold text-gray-900">{formatCurrency(resumen.promedioPago)}</div>
          <p className="mt-2 text-xs text-gray-400">{payments.length} pagos registrados</p>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Registros OPEN</div>
          <div className="mt-3 text-2xl font-semibold text-gray-900">{resumen.openLogs}</div>
          <p className="mt-2 text-xs text-gray-400">Pendientes por liquidar</p>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Top 3 empleados</div>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            {resumen.topEmpleados.length ? (
              resumen.topEmpleados.map((item) => (
                <div key={item.empleado} className="flex items-center justify-between">
                  <span>{item.empleado}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(item.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">Sin datos suficientes.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
