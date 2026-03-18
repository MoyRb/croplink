import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import {
  calcAverageDensity,
  calcDensity,
  collectThresholdViolations,
  getSamplingSubjectLabel,
  getSessionById,
  type MonitoringSession,
} from '../../lib/monitoreo'

export function MonitoreosResumenPage() {
  const { id = '' } = useParams()
  const [session, setSession] = useState<MonitoringSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getSessionById(id)
        if (!cancelled) setSession(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (id) void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const violations = useMemo(() => (session ? collectThresholdViolations(session) : []), [session])
  const avgDensity = session ? calcAverageDensity(session) : 0

  if (loading) return <Card><p className="text-sm text-gray-500">Cargando resumen...</p></Card>
  if (error && !session) return <Card><p className="text-sm text-red-600">{error}</p></Card>
  if (!session) return <Navigate to="/monitoreos/lista" replace />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Resumen de monitoreo</h1>
        <p className="text-sm text-gray-500">Estado: {session.status}</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold text-gray-900">Contexto</h2>
        <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
          <p>Qué se muestrea: {getSamplingSubjectLabel(session.config.queMuestrear)}</p>
          <p>Fecha de monitoreo: {session.config.fechaMonitoreo}</p>
          <p>Rancho: {session.config.rancho}</p>
          <p>Cultivo: {session.config.cultivo}</p>
          <p>Sector base: {session.config.sector || 'N/A'}</p>
          <p>Etapa: {session.config.etapaFenologica}</p>
          <p>Condición ambiental: {session.config.condicionMeteorologica}</p>
          <p>Humedad relativa: {session.config.humedadRelativa ?? 'N/A'}</p>
          <p>Temperatura: {session.config.temperatura ?? 'N/A'}</p>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Densidad promedio</p>
          <p className="text-3xl font-semibold text-gray-900">{avgDensity.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Variables configuradas</p>
          <p className="text-3xl font-semibold text-gray-900">{session.config.tablaMuestreo.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Umbrales fuera de rango</p>
          <p className="text-3xl font-semibold text-gray-900">{violations.length}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold text-gray-900">Tabla base de muestreo</h2>
        {session.config.tablaMuestreo.length === 0 ? (
          <p className="text-sm text-gray-500">No hay variables configuradas para este monitoreo.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {session.config.tablaMuestreo.map((row) => (
              <Badge key={row.key}>{`${row.label}${row.unit ? ` · ${row.unit}` : ''}`}</Badge>
            ))}
          </div>
        )}
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
    </div>
  )
}
