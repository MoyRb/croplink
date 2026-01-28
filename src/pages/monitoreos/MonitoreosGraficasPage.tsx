import { useMemo } from 'react'

import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { getPromedioDensidad, useMonitoreosStore } from '../../lib/store/monitoreos'

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)

export function MonitoreosGraficasPage() {
  const { monitoreos } = useMonitoreosStore()

  const stats = useMemo(() => {
    const total = monitoreos.length
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const totalUltimos7Dias = monitoreos.filter(
      (monitoreo) => new Date(monitoreo.createdAt) >= sevenDaysAgo,
    ).length

    const promedioDensidad =
      total === 0
        ? 0
        : monitoreos.reduce((acc, monitoreo) => acc + getPromedioDensidad(monitoreo.puntos), 0) /
          total

    const totalHallazgos = monitoreos.reduce((acc, monitoreo) => acc + monitoreo.hallazgos.length, 0)

    return { total, totalUltimos7Dias, promedioDensidad, totalHallazgos }
  }, [monitoreos])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Gráficas de monitoreo</h1>
        <p className="text-sm text-gray-500">KPIs iniciales con base en la bitácora local.</p>
      </div>

      {monitoreos.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">
            Aún no hay monitoreos guardados. Regresa cuando captures información para ver indicadores.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Monitoreos últimos 7 días</h2>
                <Badge className="bg-[#DBFAE6] text-[#0B6B2A]">KPI</Badge>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{stats.totalUltimos7Dias}</p>
              <p className="text-sm text-gray-500">Basado en registros recientes.</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Promedio densidad</h2>
                <Badge className="bg-gray-100 text-gray-700">Promedio</Badge>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{formatNumber(stats.promedioDensidad)}</p>
              <p className="text-sm text-gray-500">Promedio general de puntos evaluados.</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Hallazgos registrados</h2>
                <Badge className="bg-amber-100 text-amber-700">Total</Badge>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{stats.totalHallazgos}</p>
              <p className="text-sm text-gray-500">Sumatoria de hallazgos en monitoreos.</p>
            </div>
          </Card>

          <Card className="lg:col-span-3">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Próximas gráficas</h2>
              <p className="text-sm text-gray-500">
                Aquí se incorporarán gráficas de tendencias de densidad, distribución de hallazgos y
                comparativos por cultivo. Por ahora, revisa los KPIs para monitorear el desempeño.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
