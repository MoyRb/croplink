import { useMemo } from 'react'

import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useMonitoreosStore, type HallazgoCategoria } from '../../lib/store/monitoreos'

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)

export function MonitoreosGraficasPage() {
  const { monitoreos } = useMonitoreosStore()

  const promediosPorCultivo = useMemo(() => {
    const data = new Map<string, { total: number; count: number }>()
    monitoreos.forEach((monitoreo) => {
      const promedio = monitoreo.puntos.reduce((acc, punto) => acc + punto.densidadPlantas, 0) /
        monitoreo.puntos.length
      const current = data.get(monitoreo.cultivo) ?? { total: 0, count: 0 }
      data.set(monitoreo.cultivo, { total: current.total + promedio, count: current.count + 1 })
    })

    return Array.from(data.entries()).map(([cultivo, value]) => ({
      cultivo,
      promedio: value.total / value.count,
    }))
  }, [monitoreos])

  const hallazgosPorCategoria = useMemo(() => {
    const counts: Record<HallazgoCategoria, number> = {
      Plaga: 0,
      Enfermedad: 0,
      'Insectos benéficos': 0,
      Desarrollo: 0,
      Nutrición: 0,
      PC: 0,
    }

    monitoreos.forEach((monitoreo) => {
      monitoreo.puntos.forEach((punto) => {
        punto.hallazgos.forEach((hallazgo) => {
          counts[hallazgo.categoria] += 1
        })
      })
    })

    return Object.entries(counts).map(([categoria, total]) => ({
      categoria: categoria as HallazgoCategoria,
      total,
    }))
  }, [monitoreos])

  const maxPromedio = Math.max(1, ...promediosPorCultivo.map((item) => item.promedio))
  const maxHallazgos = Math.max(1, ...hallazgosPorCategoria.map((item) => item.total))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Gráficas de monitoreo</h1>
        <p className="text-sm text-gray-500">Métricas agregadas basadas en la bitácora local.</p>
      </div>

      {monitoreos.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">Aún no hay monitoreos guardados para graficar.</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Promedio por cultivo</h2>
                  <p className="text-sm text-gray-500">Promedio de densidad en monitoreos.</p>
                </div>
                <Badge className="bg-[#DBFAE6] text-[#0B6B2A]">{promediosPorCultivo.length} cultivos</Badge>
              </div>
              <div className="space-y-3">
                {promediosPorCultivo.map((item) => (
                  <div key={item.cultivo} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.cultivo}</span>
                      <span className="text-gray-500">{formatNumber(item.promedio)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#00C050]"
                        style={{ width: `${Math.round((item.promedio / maxPromedio) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Hallazgos por categoría</h2>
                  <p className="text-sm text-gray-500">Conteo total en puntos evaluados.</p>
                </div>
                <Badge className="bg-gray-100 text-gray-700">{hallazgosPorCategoria.length} categorías</Badge>
              </div>
              <div className="space-y-3">
                {hallazgosPorCategoria.map((item) => (
                  <div key={item.categoria} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.categoria}</span>
                      <span className="text-gray-500">{item.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#00C050]"
                        style={{ width: `${Math.round((item.total / maxHallazgos) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
