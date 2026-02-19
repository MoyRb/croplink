import { Navigate, useParams } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import {
  calcAverageDensity,
  calcDensity,
  collectThresholdViolations,
  getSessionById,
} from '../../lib/monitoreo'

export function MonitoreosResumenPage() {
  const { id = '' } = useParams()
  const session = getSessionById(id)

  if (!session) return <Navigate to="/monitoreos/lista" replace />

  const violations = collectThresholdViolations(session)
  const avgDensity = calcAverageDensity(session)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Resumen de monitoreo</h1>
        <p className="text-sm text-gray-500">Estado: {session.status}</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold text-gray-900">Contexto</h2>
        <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
          <p>Rancho: {session.config.rancho}</p>
          <p>Cultivo: {session.config.cultivo}</p>
          <p>Sector base: {session.config.sector}</p>
          <p>Etapa: {session.config.etapaFenologica}</p>
          <p>Tipo: {session.config.tipoMonitoreo}</p>
          <p>Sistema: {session.config.sistemaProduccion ?? 'N/A'}</p>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-gray-500">Densidad promedio</p>
        <p className="text-3xl font-semibold text-gray-900">{avgDensity.toFixed(2)}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold text-gray-900">Densidad por punto</h2>
        {session.sectors.map((sector) => (
          <div key={sector.id} className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">{sector.name}</p>
            {sector.points.map((point) => (
              <div key={point.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-2 text-sm">
                <span>{point.name}</span>
                <span>{calcDensity(point.conteoEnMetros, point.metrosMuestreados).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold text-gray-900">Métricas por planta</h2>
        {session.sectors.map((sector) => (
          <details key={sector.id} className="rounded-xl border border-[#E5E7EB] p-3">
            <summary className="cursor-pointer font-medium">{sector.name}</summary>
            <div className="mt-2 space-y-2">
              {sector.points.map((point) => (
                <details key={point.id} className="rounded-lg bg-gray-50 p-2">
                  <summary className="cursor-pointer text-sm font-medium">{point.name}</summary>
                  <div className="space-y-2 pt-2">
                    {point.plantas.map((planta) => (
                      <div key={planta.id} className="rounded-lg border border-[#E5E7EB] p-2 text-sm">
                        <p className="font-semibold">{planta.name}</p>
                        <pre className="overflow-auto text-xs">{JSON.stringify(planta.metrics, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold text-gray-900">Indicadores de umbrales</h2>
        <p className="text-sm text-gray-500">Fuera de rango: {violations.length}</p>
        {violations.map((violation, index) => (
          <div key={`${violation.scope}-${index}`} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-2 text-sm">
            <span>
              {violation.metric} · {violation.scope}
            </span>
            <Badge className={violation.reason === 'above' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
              {violation.value}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  )
}
