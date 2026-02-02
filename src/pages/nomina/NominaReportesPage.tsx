import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Toast } from '../../components/ui/Toast'
import { getEmpleados, getPagosByPeriodo, getPeriodos } from '../../lib/store/nomina'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

export function NominaReportesPage() {
  const [toastVisible, setToastVisible] = useState(false)
  const periodos = getPeriodos()
  const empleados = getEmpleados()

  const lastPeriodo = useMemo(() => {
    return [...periodos].sort(
      (a, b) => new Date(b.fechaFin).getTime() - new Date(a.fechaFin).getTime(),
    )[0]
  }, [periodos])

  const pagos = lastPeriodo ? getPagosByPeriodo(lastPeriodo.id) : []

  const resumen = useMemo(() => {
    if (!pagos.length) {
      return {
        totalPagado: 0,
        promedioNeto: 0,
        topEmpleados: [],
      }
    }
    const totalPagado = pagos.reduce((acc, pago) => acc + (pago.pagadoEn ? pago.totalNeto : 0), 0)
    const promedioNeto = pagos.reduce((acc, pago) => acc + pago.totalNeto, 0) / pagos.length
    const topEmpleados = [...pagos]
      .sort((a, b) => b.totalNeto - a.totalNeto)
      .slice(0, 3)
      .map((pago) => ({
        empleado: empleados.find((emp) => emp.id === pago.empleadoId)?.nombreCompleto ?? 'Empleado',
        totalNeto: pago.totalNeto,
      }))
    return { totalPagado, promedioNeto, topEmpleados }
  }, [empleados, pagos])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Reportes</h1>
          <p className="text-sm text-gray-500">Indicadores rápidos de pagos y desempeño.</p>
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

      {!lastPeriodo ? (
        <Card>
          <p className="text-sm text-gray-500">
            Crea un periodo de nómina para visualizar reportes.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="text-sm text-gray-500">Total pagado (último periodo)</div>
              <div className="mt-3 text-2xl font-semibold text-gray-900">
                {formatCurrency(resumen.totalPagado)}
              </div>
              <p className="mt-2 text-xs text-gray-400">{lastPeriodo.nombre}</p>
            </Card>
            <Card>
              <div className="text-sm text-gray-500">Promedio neto por empleado</div>
              <div className="mt-3 text-2xl font-semibold text-gray-900">
                {formatCurrency(resumen.promedioNeto)}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {pagos.length ? `${pagos.length} pagos calculados` : 'Sin pagos registrados'}
              </p>
            </Card>
            <Card>
              <div className="text-sm text-gray-500">Top 3 empleados (neto)</div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                {resumen.topEmpleados.length ? (
                  resumen.topEmpleados.map((item) => (
                    <div key={item.empleado} className="flex items-center justify-between">
                      <span>{item.empleado}</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(item.totalNeto)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">Sin datos suficientes.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
