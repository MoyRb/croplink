import { useEffect, useMemo, useRef, useState } from 'react'

import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import {
  calcAverageDensity,
  getSamplingSubjectLabel,
  getSessions,
  type MonitoringSession,
  type SamplingSubject,
  type SamplingTableRow,
} from '../../lib/monitoreo'

type MetricOption = {
  value: string
  label: string
}

type DetailItem = {
  label: string
  value: string
}

type SessionDetail = {
  id: string
  createdAt: string
  rancho: string
  etapa: string
  categoryLabel: string
  metricLabel: string
  metricValue: number
  sectorNames: string[]
  totalPoints: number
  totalPlantas: number
  measurements: DetailItem[]
}

type ChartPoint = {
  id: string
  createdAt: string
  value: number
  min: number | null
  max: number | null
  detailTitle: string
  detailSubtitle: string
  sessions: SessionDetail[]
}

type ChartPointGeom = ChartPoint & { x: number; y: number }

type ChartDefinition = {
  id: string
  title: string
  description: string
  metricLabel: string
  color: string
  emptyMessage: string
  points: ChartPoint[]
}

const CATEGORY_ORDER: SamplingSubject[] = [
  'PLAGAS',
  'ENFERMEDADES',
  'INSECTOS_BENEFICOS',
  'DESARROLLO',
  'NUTRICION',
]

const CHART_COLORS: Record<'GENERAL' | SamplingSubject, string> = {
  GENERAL: '#0B6B2A',
  PLAGAS: '#DC2626',
  ENFERMEDADES: '#7C3AED',
  INSECTOS_BENEFICOS: '#0EA5E9',
  DESARROLLO: '#2563EB',
  NUTRICION: '#D97706',
}

const STATUS_LABELS: Record<MonitoringSession['status'], string> = {
  IN_PROGRESS: 'En progreso',
  PAUSED: 'Pausado',
  COMPLETED: 'Completado',
}

const PRIORITY_METRICS = [
  'individuos_encontrados',
  'individuos_beneficos',
  'plantas_afectadas_pct',
  'hojas_afectadas_pct',
  'severidad_pct',
]

const formatMetricLabel = (key: string) =>
  key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const toDateKey = (value: string) => value.slice(0, 10)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)

const formatValueWithUnit = (value: number, unit?: string | null) => `${formatNumber(value)}${unit ? ` ${unit}` : ''}`

const getMetricCandidates = (metric: string): string[] => {
  if (metric === 'ph') return ['ph', 'ph_solucion', 'ph_suelo']
  if (metric === 'diametro_fruto_mm') return ['diametro_fruto_mm', 'diametro_fruto_cm']
  return [metric]
}

const getRowValues = (session: MonitoringSession, row: Pick<SamplingTableRow, 'key'>) => {
  const candidates = getMetricCandidates(row.key)

  return session.sectors.flatMap((sector) =>
    sector.points.flatMap((point) =>
      point.plantas.flatMap((plant) =>
        candidates
          .map((candidate) => plant.metrics[candidate])
          .filter((value): value is number | string => value !== undefined && value !== null && `${value}`.trim().length > 0),
      ),
    ),
  )
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

const sortRowsByPriority = (rows: SamplingTableRow[], metric: string) => {
  const priorityEntries: Array<[string, number]> = [[metric, -2], ...PRIORITY_METRICS.map((key, index) => [key, index] as [string, number])]
  const metricPriority = new Map<string, number>(priorityEntries)

  return [...rows].sort((a, b) => {
    const aPriority = metricPriority.get(a.key) ?? 100
    const bPriority = metricPriority.get(b.key) ?? 100
    if (aPriority !== bPriority) return aPriority - bPriority
    return a.label.localeCompare(b.label)
  })
}

const summarizeMeasurement = (session: MonitoringSession, row: SamplingTableRow): DetailItem | null => {
  const values = getRowValues(session, row)
  if (values.length === 0) return null

  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  if (numericValues.length > 0) {
    const average = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
    return { label: row.label, value: formatValueWithUnit(average, row.unit) }
  }

  const uniqueText = Array.from(new Set(values.map((value) => `${value}`.trim()).filter(Boolean)))
  if (uniqueText.length === 0) return null

  return {
    label: row.label,
    value: uniqueText.slice(0, 3).join(', '),
  }
}

const buildSessionDetail = (session: MonitoringSession, category: SamplingSubject, metric: string, metricLabel: string, metricValue: number): SessionDetail => {
  const categoryRows = session.config.tablaMuestreo.filter((row) => row.category === category)
  const prioritizedRows = sortRowsByPriority(categoryRows, metric)
  const measurements = prioritizedRows
    .map((row) => summarizeMeasurement(session, row))
    .filter((row): row is DetailItem => row !== null)
    .slice(0, 5)

  return {
    id: session.id,
    createdAt: session.createdAt,
    rancho: session.config.rancho,
    etapa: session.config.etapaFenologica,
    categoryLabel: getSamplingSubjectLabel(category),
    metricLabel,
    metricValue,
    sectorNames: session.sectors.map((sector) => sector.name),
    totalPoints: session.sectors.reduce((sum, sector) => sum + sector.points.length, 0),
    totalPlantas: session.sectors.reduce(
      (sum, sector) => sum + sector.points.reduce((pointsSum, point) => pointsSum + point.plantas.length, 0),
      0,
    ),
    measurements,
  }
}

const getChartTrendLabel = (points: ChartPoint[], metricLabel: string) => {
  if (points.length < 2) return `Aún no hay suficientes mediciones para comparar la tendencia de ${metricLabel.toLowerCase()}.`

  const first = points[0].value
  const last = points[points.length - 1].value
  const delta = last - first

  if (Math.abs(delta) < 0.01) {
    return `${metricLabel} se mantiene estable en el periodo seleccionado.`
  }

  const direction = delta > 0 ? 'subió' : 'bajó'
  return `${metricLabel} ${direction} ${formatNumber(Math.abs(delta))} contra la primera medición visible.`
}

const buildChartGeometry = (chartPoints: ChartPoint[]) => {
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

  const points: ChartPointGeom[] = chartPoints.map((point) => ({
    ...point,
    x: x(new Date(point.createdAt).getTime()),
    y: y(point.value),
  }))

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')

  const minValues = points.filter((point): point is ChartPointGeom & { min: number } => point.min !== null)
  const maxValues = points.filter((point): point is ChartPointGeom & { max: number } => point.max !== null)

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
}

type MonitoringChartCardProps = {
  chart: ChartDefinition
}

function MonitoringChartCard({ chart }: MonitoringChartCardProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ data: ChartPointGeom; cx: number; cy: number } | null>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const chartGeometry = useMemo(() => buildChartGeometry(chart.points), [chart.points])

  const handlePointHover = (point: ChartPointGeom, clientX: number, clientY: number) => {
    if (!chartWrapperRef.current) return
    const rect = chartWrapperRef.current.getBoundingClientRect()
    setHoveredPoint({ data: point, cx: clientX - rect.left, cy: clientY - rect.top })
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{chart.title}</h2>
          <p className="text-sm text-gray-500">{chart.description}</p>
        </div>
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {getChartTrendLabel(chart.points, chart.metricLabel)}
        </span>
      </div>

      {!chartGeometry ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          {chart.emptyMessage}
        </div>
      ) : (
        <div ref={chartWrapperRef} className="relative">
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

              <path d={chartGeometry.linePath} fill="none" stroke={chart.color} strokeWidth={2.5} />

              {chartGeometry.minPath ? (
                <path d={chartGeometry.minPath} fill="none" stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2} />
              ) : null}

              {chartGeometry.maxPath ? (
                <path d={chartGeometry.maxPath} fill="none" stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2} />
              ) : null}

              {chartGeometry.points.map((point) => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={5}
                    fill={hoveredPoint?.data.id === point.id ? '#065F20' : chart.color}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(event) => handlePointHover(point, event.clientX, event.clientY)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onTouchStart={(event) => {
                      event.preventDefault()
                      const touch = event.touches[0]
                      if (hoveredPoint?.data.id === point.id) {
                        setHoveredPoint(null)
                      } else {
                        handlePointHover(point, touch.clientX, touch.clientY)
                      }
                    }}
                  />
                  <text x={point.x} y={chartGeometry.height - 12} fontSize="11" textAnchor="middle" fill="#64748B">
                    {new Date(point.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {hoveredPoint ? (
            <div
              style={{
                position: 'absolute',
                left: hoveredPoint.cx,
                top: hoveredPoint.cy,
                transform: 'translate(-50%, calc(-100% - 12px))',
                zIndex: 10,
              }}
              className="max-h-[360px] min-w-[260px] max-w-[360px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg"
            >
              <p className="font-semibold text-gray-900">{hoveredPoint.data.detailTitle}</p>
              <p className="mt-0.5 text-gray-600">{hoveredPoint.data.detailSubtitle}</p>
              <p className="mt-1.5 font-semibold" style={{ color: chart.color }}>
                {chart.metricLabel}: {formatNumber(hoveredPoint.data.value)}
              </p>

              <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                {hoveredPoint.data.sessions.map((session) => (
                  <div key={session.id} className="rounded-xl bg-gray-50 p-2 text-gray-600">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{formatDateTime(session.createdAt)}</p>
                        <p>{session.rancho || 'Rancho no disponible'} · {session.etapa}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{session.categoryLabel}</p>
                        <p>{session.metricLabel}: {formatNumber(session.metricValue)}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-gray-500">
                      {session.totalPoints} puntos · {session.totalPlantas} plantas
                    </p>
                    {session.sectorNames.length > 0 ? (
                      <p className="mt-1 text-gray-500">Sectores: {session.sectorNames.join(', ')}</p>
                    ) : null}
                    {session.measurements.length > 0 ? (
                      <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                        <p className="font-medium text-gray-700">Qué se midió</p>
                        {session.measurements.map((measurement) => (
                          <p key={`${session.id}-${measurement.label}`}>
                            <span className="font-medium text-gray-800">{measurement.label}:</span> {measurement.value}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}

export function MonitoreosGraficasPage() {
  const [sessions, setSessions] = useState<MonitoringSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [metric, setMetric] = useState('densidad_promedio')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getSessions()
        if (!cancelled) setSessions(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las gráficas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const metricOptions = useMemo<MetricOption[]>(() => {
    const dynamic = sessions
      .flatMap((session) => session.config.tablaMuestreo)
      .filter((row) => !row.key.startsWith('raiz_'))
      .map((row) => ({ value: row.key, label: row.label }))

    const unique = Array.from(
      new Map([{ value: 'densidad_promedio', label: 'Densidad promedio' }, ...dynamic].map((item) => [item.value, item])).values(),
    )
    return unique.length > 0 ? unique : [{ value: 'densidad_promedio', label: 'Densidad promedio' }]
  }, [sessions])

  useEffect(() => {
    if (!metricOptions.some((option) => option.value === metric)) {
      setMetric(metricOptions[0]?.value ?? 'densidad_promedio')
    }
  }, [metric, metricOptions])

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

  const metricLabel = metricOptions.find((option) => option.value === metric)?.label ?? formatMetricLabel(metric)

  const charts = useMemo<ChartDefinition[]>(() => {
    const categoryCharts = CATEGORY_ORDER.map<ChartDefinition>((category) => {
      const points = filteredSessions
        .filter((session) => session.config.queMuestrear === category)
        .map((session) => {
          const value = getSessionMetricValue(session, metric)
          if (value === null) return null

          const threshold = session.config.umbrales.find((item) => item.metric === metric)
          const detail = buildSessionDetail(session, category, metric, metricLabel, value)

          return {
            id: session.id,
            createdAt: session.createdAt,
            value,
            min: threshold?.min ?? null,
            max: threshold?.max ?? null,
            detailTitle: formatDateTime(session.createdAt),
            detailSubtitle: `${detail.rancho || 'Rancho no disponible'} · ${detail.etapa}`,
            sessions: [detail],
          }
        })
        .filter((point): point is ChartPoint => point !== null)

      return {
        id: category,
        title: getSamplingSubjectLabel(category),
        description: `Tendencia temporal real de ${getSamplingSubjectLabel(category).toLowerCase()} usando la métrica seleccionada.`,
        metricLabel,
        color: CHART_COLORS[category],
        emptyMessage: `No hay datos reales de ${getSamplingSubjectLabel(category).toLowerCase()} para la métrica y rango seleccionados.`,
        points,
      }
    })

    const generalSessions = filteredSessions
      .map((session) => {
        const value = getSessionMetricValue(session, metric)
        if (value === null) return null

        return {
          session,
          value,
          category: session.config.queMuestrear,
        }
      })
      .filter(
        (item): item is { session: MonitoringSession; value: number; category: SamplingSubject } => item !== null,
      )

    const groupedByDate = new Map<string, { createdAt: string; values: number[]; sessions: SessionDetail[] }>()

    generalSessions.forEach(({ session, value, category }) => {
      const dateKey = toDateKey(session.createdAt)
      const entry = groupedByDate.get(dateKey) ?? {
        createdAt: session.createdAt,
        values: [],
        sessions: [],
      }

      entry.createdAt = entry.createdAt < session.createdAt ? entry.createdAt : session.createdAt
      entry.values.push(value)
      entry.sessions.push(buildSessionDetail(session, category, metric, metricLabel, value))
      groupedByDate.set(dateKey, entry)
    })

    const generalPoints = Array.from(groupedByDate.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateKey, entry]) => {
        const average = entry.values.reduce((sum, value) => sum + value, 0) / entry.values.length
        return {
          id: `general-${dateKey}`,
          createdAt: entry.createdAt,
          value: average,
          min: null,
          max: null,
          detailTitle: formatDate(entry.createdAt),
          detailSubtitle: `${entry.sessions.length} monitoreo(s) consolidados en la fecha`,
          sessions: entry.sessions.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        }
      })

    return [
      {
        id: 'GENERAL',
        title: 'General / consolidada',
        description: 'Consolidado diario: promedio de la métrica seleccionada entre todas las sesiones reales del día.',
        metricLabel,
        color: CHART_COLORS.GENERAL,
        emptyMessage: 'No hay datos reales para consolidar en el rango seleccionado.',
        points: generalPoints,
      },
      ...categoryCharts,
    ]
  }, [filteredSessions, metric, metricLabel])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Monitoreos · Gráficas</h1>
        <p className="text-sm text-gray-500">Datos cargados desde Supabase con sesiones de monitoreo reales por organización.</p>
      </div>

      {loading ? <Card><p className="text-sm text-gray-500">Cargando sesiones...</p></Card> : null}
      {error ? <Card><p className="text-sm text-red-600">{error}</p></Card> : null}

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
              {metricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-gray-500">
          La gráfica general consolida por fecha usando el promedio de la métrica seleccionada entre las sesiones reales del mismo día.
        </p>
      </Card>

      <div className="space-y-4">
        {charts.map((chart) => (
          <MonitoringChartCard key={chart.id} chart={chart} />
        ))}
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Sesiones filtradas</h2>
        {filteredSessions.length === 0 ? (
          <p className="text-sm text-gray-500">No hay sesiones en el rango seleccionado.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
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
                  <TableCell>{getSamplingSubjectLabel(session.config.queMuestrear)}</TableCell>
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
