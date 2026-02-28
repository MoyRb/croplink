import { useMemo, useState } from 'react'

import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { calcAverageDensity, getSessions, type MonitoringSession } from '../../lib/monitoreo'

type MetricOption = {
  value: string
  label: string
}

type ChartPoint = {
  id: string
  createdAt: string
  value: number
  min: number | null
  max: number | null
}

const METRIC_OPTIONS: MetricOption[] = [
  { value: 'densidad_promedio', label: 'Densidad promedio' },
  { value: 'brix', label: 'Brix' },
  { value: 'ph', label: 'pH' },
  { value: 'longitud_cm', label: 'Longitud (cm)' },
  { value: 'diametro_tallo_mm', label: 'Diámetro tallo (mm)' },
  { value: 'diametro_fruto_mm', label: 'Diámetro fruto (mm)' },
  { value: 'peso_fruto_g', label: 'Peso fruto (g)' },
  { value: 'raiz_longitud_cm', label: 'Raíz longitud (cm)' },
]

const STATUS_LABELS: Record<MonitoringSession['status'], string> = {
  IN_PROGRESS: 'En progreso',
  PAUSED: 'Pausado',
  COMPLETED: 'Completado',
}

const toDateKey = (value: string) => value.slice(0, 10)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)

const getMetricCandidates = (metric: string): string[] => {
  if (metric === 'ph') return ['ph', 'ph_solucion', 'ph_suelo']
  if (metric === 'diametro_fruto_mm') return ['diametro_fruto_mm', 'diametro_fruto_cm']
  return [metric]
}

const getSessionMetricValue = (session: MonitoringSession, metric: string): number | null => {
  if (metric === 'densidad_promedio') return calcAverageDensity(session)

  const candidates = getMetricCandidates(metric)

  const values = session.sectors.flatMap((sector) =>
    sector.points.flatMap((point) =>
      point.plantas.flatMap((plant) =>
        candidates
          .map((candidate) => Number(plant.metrics[candidate]))
          .filter((value) => Number.isFinite(value)),
      ),
    ),
  )

  if (values.length === 0) return null

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  if (metric === 'diametro_fruto_mm' && candidates.includes('diametro_fruto_cm')) {
    const hasMm = session.sectors.some((sector) =>
      sector.points.some((point) => point.plantas.some((plant) => Number.isFinite(Number(plant.metrics.diametro_fruto_mm)))),
    )

    if (!hasMm) return average * 10
  }

  return average
}

export function MonitoreosGraficasPage() {
  const [sessions] = useState<MonitoringSession[]>(() => getSessions())
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [metric, setMetric] = useState('densidad_promedio')

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        const dayKey = toDateKey(session.createdAt)
        if (fechaInicio && dayKey < fechaInicio) return false
        if (fechaFin && dayKey > fechaFin) return false
        return true
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [fechaFin, fechaInicio, sessions])

  const chartPoints = useMemo<ChartPoint[]>(() => {
    return filteredSessions
      .map((session) => {
        const value = getSessionMetricValue(session, metric)
        if (value === null) return null

        const threshold = session.config.umbrales.find((item) => item.metric === metric)

        return {
          id: session.id,
          createdAt: session.createdAt,
          value,
          min: threshold?.min ?? null,
          max: threshold?.max ?? null,
        }
      })
      .filter((point): point is ChartPoint => point !== null)
  }, [filteredSessions, metric])

  const chartGeometry = useMemo(() => {
    if (chartPoints.length === 0) return null

    const width = 900
    const height = 280
    const padding = { top: 20, right: 20, bottom: 40, left: 52 }

    const timestamps = chartPoints.map((point) => new Date(point.createdAt).getTime())
    const minTs = Math.min(...timestamps)
    const maxTs = Math.max(...timestamps)

    const values = chartPoints.flatMap((point) => [point.value, point.min, point.max].filter((item): item is number => item !== null))
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)

    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom
    const yRange = maxValue - minValue || 1

    const x = (timestamp: number) => {
      if (minTs === maxTs) return padding.left + innerWidth / 2
      return padding.left + ((timestamp - minTs) / (maxTs - minTs)) * innerWidth
    }

    const y = (value: number) => padding.top + ((maxValue - value) / yRange) * innerHeight

    const points = chartPoints.map((point) => ({
      ...point,
      x: x(new Date(point.createdAt).getTime()),
      y: y(point.value),
    }))

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
      .join(' ')

    const minValues = points.filter((point): point is typeof point & { min: number } => point.min !== null)
    const maxValues = points.filter((point): point is typeof point & { max: number } => point.max !== null)

    const minPath = minValues.length > 0 ? minValues.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${y(point.min)}`).join(' ') : null
    const maxPath = maxValues.length > 0 ? maxValues.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${y(point.max)}`).join(' ') : null

    return {
      width,
      height,
      padding,
      points,
      linePath,
      minPath,
      maxPath,
    }
  }, [chartPoints])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Monitoreos · Gráficas</h1>
        <p className="text-sm text-gray-500">Datos cargados desde localStorage usando sesiones de monitoreo.</p>
      </div>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Filtros</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-gray-600">
            Fecha inicio
            <Input type="date" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} />
          </label>

          <label className="text-sm text-gray-600">
            Fecha fin
            <Input type="date" value={fechaFin} onChange={(event) => setFechaFin(event.target.value)} />
          </label>

          <label className="text-sm text-gray-600">
            Métrica
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
            >
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Gráfico de línea</h2>

        {!chartGeometry ? (
          <p className="text-sm text-gray-500">Sin datos para los filtros seleccionados.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`} className="min-w-[760px]">
              <line
                x1={chartGeometry.padding.left}
                y1={chartGeometry.height - chartGeometry.padding.bottom}
                x2={chartGeometry.width - chartGeometry.padding.right}
                y2={chartGeometry.height - chartGeometry.padding.bottom}
                stroke="#CBD5E1"
              />
              <line
                x1={chartGeometry.padding.left}
                y1={chartGeometry.padding.top}
                x2={chartGeometry.padding.left}
                y2={chartGeometry.height - chartGeometry.padding.bottom}
                stroke="#CBD5E1"
              />

              <path d={chartGeometry.linePath} fill="none" stroke="#0B6B2A" strokeWidth={2.5} />

              {chartGeometry.minPath ? (
                <path d={chartGeometry.minPath} fill="none" stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2} />
              ) : null}

              {chartGeometry.maxPath ? (
                <path d={chartGeometry.maxPath} fill="none" stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2} />
              ) : null}

              {chartGeometry.points.map((point) => (
                <g key={point.id}>
                  <circle cx={point.x} cy={point.y} r={4} fill="#0B6B2A">
                    <title>{`${formatDate(point.createdAt)} · ${formatNumber(point.value)}`}</title>
                  </circle>
                  <text x={point.x} y={chartGeometry.height - 12} fontSize="11" textAnchor="middle" fill="#64748B">
                    {new Date(point.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Sesiones filtradas</h2>
        {filteredSessions.length === 0 ? (
          <p className="text-sm text-gray-500">No hay sesiones en el rango seleccionado.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Cultivo</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{formatDate(session.createdAt)}</TableCell>
                  <TableCell>{session.config.rancho || '—'}</TableCell>
                  <TableCell>{session.config.cultivo || '—'}</TableCell>
                  <TableCell className="capitalize">{session.config.etapaFenologica}</TableCell>
                  <TableCell>{STATUS_LABELS[session.status]}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
