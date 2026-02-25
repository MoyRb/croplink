import { useMemo, useState } from 'react'

import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { calcAverageDensity, getSessions } from '../../lib/monitoreo'
import { getApplicationExecutions, getApplicationLines } from '../../lib/store/applicationExecutions'

const ALL_OPTION = '__all__'

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

const toMetricLabel = (metric: string) =>
  metric
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())

const getSessionMetricValue = (session: ReturnType<typeof getSessions>[number], metric: string) => {
  if (metric === 'densidad_promedio') return calcAverageDensity(session)

  const values = session.sectors.flatMap((sector) =>
    sector.points.flatMap((point) =>
      point.plantas
        .map((plant) => Number(plant.metrics[metric]))
        .filter((value) => Number.isFinite(value)),
    ),
  )

  if (values.length === 0) return null
  const sum = values.reduce((acc, value) => acc + value, 0)
  return sum / values.length
}

type ChartPoint = {
  id: string
  createdAt: string
  dayKey: string
  value: number
  thresholdMin: number | null
  thresholdMax: number | null
}

export function MonitoreosGraficasPage() {
  const [filters, setFilters] = useState({
    operacion: ALL_OPTION,
    rancho: ALL_OPTION,
    cultivo: ALL_OPTION,
    temporada: ALL_OPTION,
    sector: ALL_OPTION,
    fechaInicio: '',
    fechaFin: '',
    metric: 'densidad_promedio',
  })

  const sessions = useMemo(() => getSessions(), [])
  const completedExecutions = useMemo(
    () => getApplicationExecutions().filter((execution) => execution.status === 'COMPLETED'),
    [],
  )
  const applicationLines = useMemo(() => getApplicationLines(), [])

  const options = useMemo(() => {
    const operaciones = Array.from(
      new Set(
        completedExecutions
          .map((execution) => execution.context.operacion)
          .filter((value) => value.trim().length > 0),
      ),
    )
    const ranchos = Array.from(
      new Set([
        ...sessions.map((session) => session.config.rancho),
        ...completedExecutions.map((execution) => execution.context.rancho),
      ]),
    )
    const cultivos = Array.from(
      new Set([
        ...sessions.map((session) => session.config.cultivo),
        ...completedExecutions.map((execution) => execution.context.cultivo),
      ]),
    )
    const temporadas = Array.from(
      new Set(
        completedExecutions
          .map((execution) => execution.context.temporada)
          .filter((value) => value.trim().length > 0),
      ),
    )
    const sectores = Array.from(
      new Set([
        ...sessions.map((session) => session.config.sector),
        ...completedExecutions.map((execution) => execution.context.sector),
      ]),
    )

    return {
      operaciones: operaciones.sort(),
      ranchos: ranchos.filter(Boolean).sort(),
      cultivos: cultivos.filter(Boolean).sort(),
      temporadas: temporadas.sort(),
      sectores: sectores.filter(Boolean).sort(),
    }
  }, [completedExecutions, sessions])

  const executionsByDay = useMemo(() => {
    const byDay = new Map<
      string,
      {
        executionId: string
        fechaAplicacion: string
        products: { nombre: string; unit: string; dosisPorTanque: number; dosisPorHa: number }[]
      }[]
    >()

    const executionLineMap = new Map(
      applicationLines.map((line) => [line.executionId, line] as const),
    )

    completedExecutions
      .filter((execution) => {
        const executionDate = execution.headerFields.fechaAplicacion || execution.createdAt
        const dateKey = toDateKey(executionDate)
        if (filters.operacion !== ALL_OPTION && execution.context.operacion !== filters.operacion) return false
        if (filters.rancho !== ALL_OPTION && execution.context.rancho !== filters.rancho) return false
        if (filters.cultivo !== ALL_OPTION && execution.context.cultivo !== filters.cultivo) return false
        if (filters.temporada !== ALL_OPTION && execution.context.temporada !== filters.temporada) return false
        if (filters.sector !== ALL_OPTION && execution.context.sector !== filters.sector) return false
        if (filters.fechaInicio && dateKey < filters.fechaInicio) return false
        if (filters.fechaFin && dateKey > filters.fechaFin) return false
        return true
      })
      .forEach((execution) => {
        const executionDate = execution.headerFields.fechaAplicacion || execution.createdAt
        const dateKey = toDateKey(executionDate)
        const existing = byDay.get(dateKey) ?? []

        const lines = applicationLines
          .filter((line) => line.executionId === execution.id)
          .map((line) => ({
            nombre: line.productName,
            unit: line.unit,
            dosisPorTanque: line.dosisPorTanque,
            dosisPorHa: line.dosisPorHa,
          }))

        const fallbackLine = executionLineMap.get(execution.id)
        existing.push({
          executionId: execution.id,
          fechaAplicacion: executionDate,
          products:
            lines.length > 0
              ? lines
              : fallbackLine
                ? [
                    {
                      nombre: fallbackLine.productName,
                      unit: fallbackLine.unit,
                      dosisPorTanque: fallbackLine.dosisPorTanque,
                      dosisPorHa: fallbackLine.dosisPorHa,
                    },
                  ]
                : [],
        })

        byDay.set(dateKey, existing)
      })

    return byDay
  }, [applicationLines, completedExecutions, filters])

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        const dayKey = toDateKey(session.createdAt)
        if (filters.rancho !== ALL_OPTION && session.config.rancho !== filters.rancho) return false
        if (filters.cultivo !== ALL_OPTION && session.config.cultivo !== filters.cultivo) return false
        if (filters.sector !== ALL_OPTION && session.config.sector !== filters.sector) return false
        if (filters.fechaInicio && dayKey < filters.fechaInicio) return false
        if (filters.fechaFin && dayKey > filters.fechaFin) return false
        return true
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [filters, sessions])

  const chartPoints = useMemo<ChartPoint[]>(() => {
    return filteredSessions
      .map((session) => {
        const value = getSessionMetricValue(session, filters.metric)
        if (value === null) return null
        const threshold = session.config.umbrales.find((rule) => rule.metric === filters.metric)

        return {
          id: session.id,
          createdAt: session.createdAt,
          dayKey: toDateKey(session.createdAt),
          value,
          thresholdMin: threshold?.min ?? null,
          thresholdMax: threshold?.max ?? null,
        }
      })
      .filter((point): point is ChartPoint => point !== null)
  }, [filteredSessions, filters.metric])

  const metricOptions = useMemo(() => {
    const keys = new Set<string>(['densidad_promedio'])

    sessions.forEach((session) => {
      session.config.umbrales.forEach((threshold) => keys.add(threshold.metric))
      session.sectors.forEach((sector) => {
        sector.points.forEach((point) => {
          point.plantas.forEach((planta) => {
            Object.keys(planta.metrics).forEach((metricKey) => keys.add(metricKey))
          })
        })
      })
    })

    return Array.from(keys).sort((a, b) => a.localeCompare(b))
  }, [sessions])

  const selectedMetricLabel = toMetricLabel(filters.metric)

  const productsRows = useMemo(() => {
    const rows = completedExecutions
      .filter((execution) => {
        const executionDate = execution.headerFields.fechaAplicacion || execution.createdAt
        const dayKey = toDateKey(executionDate)
        if (filters.operacion !== ALL_OPTION && execution.context.operacion !== filters.operacion) return false
        if (filters.rancho !== ALL_OPTION && execution.context.rancho !== filters.rancho) return false
        if (filters.cultivo !== ALL_OPTION && execution.context.cultivo !== filters.cultivo) return false
        if (filters.temporada !== ALL_OPTION && execution.context.temporada !== filters.temporada) return false
        if (filters.sector !== ALL_OPTION && execution.context.sector !== filters.sector) return false
        if (filters.fechaInicio && dayKey < filters.fechaInicio) return false
        if (filters.fechaFin && dayKey > filters.fechaFin) return false
        return true
      })
      .flatMap((execution) => {
        const executionDate = execution.headerFields.fechaAplicacion || execution.createdAt
        const lines = applicationLines.filter((line) => line.executionId === execution.id)

        return lines.map((line) => ({
          executionId: execution.id,
          fechaAplicacion: executionDate,
          operacion: execution.context.operacion,
          rancho: execution.context.rancho,
          cultivo: execution.context.cultivo,
          temporada: execution.context.temporada,
          sector: execution.context.sector,
          producto: line.productName,
          dosisPorTanque: line.dosisPorTanque,
          dosisPorHa: line.dosisPorHa,
          unit: line.unit,
        }))
      })

    return rows.sort((a, b) => b.fechaAplicacion.localeCompare(a.fechaAplicacion))
  }, [applicationLines, completedExecutions, filters])

  const chartGeometry = useMemo(() => {
    const width = 900
    const height = 320
    const padding = { top: 20, right: 32, bottom: 42, left: 52 }

    if (chartPoints.length === 0) return null

    const pointsTimestamps = chartPoints.map((point) => new Date(point.createdAt).getTime())
    const executionTimestamps = Array.from(executionsByDay.entries()).map(([dayKey]) =>
      new Date(`${dayKey}T00:00:00`).getTime(),
    )

    const minTs = Math.min(...pointsTimestamps, ...executionTimestamps)
    const maxTs = Math.max(...pointsTimestamps, ...executionTimestamps)

    const values = chartPoints.flatMap((point) =>
      [point.value, point.thresholdMin, point.thresholdMax].filter((value): value is number => value !== null),
    )

    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const yRange = maxValue - minValue || 1

    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom

    const x = (timestamp: number) => {
      if (minTs === maxTs) return padding.left + innerWidth / 2
      return padding.left + ((timestamp - minTs) / (maxTs - minTs)) * innerWidth
    }

    const y = (value: number) => padding.top + ((maxValue - value) / yRange) * innerHeight

    return {
      width,
      height,
      padding,
      x,
      y,
      yMin: minValue,
      yMax: maxValue,
      linePath: chartPoints
        .map((point, index) => {
          const prefix = index === 0 ? 'M' : 'L'
          return `${prefix}${x(new Date(point.createdAt).getTime())},${y(point.value)}`
        })
        .join(' '),
      points: chartPoints.map((point) => ({
        ...point,
        x: x(new Date(point.createdAt).getTime()),
        y: y(point.value),
        yMinThreshold: point.thresholdMin === null ? null : y(point.thresholdMin),
        yMaxThreshold: point.thresholdMax === null ? null : y(point.thresholdMax),
        applications: executionsByDay.get(point.dayKey) ?? [],
      })),
      executionMarkers: Array.from(executionsByDay.entries()).map(([dayKey, executions]) => ({
        dayKey,
        x: x(new Date(`${dayKey}T00:00:00`).getTime()),
        executions,
      })),
    }
  }, [chartPoints, executionsByDay])

  const hasData = chartPoints.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Gráficas de monitoreo</h1>
        <p className="text-sm text-gray-500">
          Serie temporal basada en <code>monitoreo_sessions</code> y ejecuciones COMPLETED de aplicación.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Filtros</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-gray-600">
            Operación
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
              value={filters.operacion}
              onChange={(event) => setFilters((prev) => ({ ...prev, operacion: event.target.value }))}
            >
              <option value={ALL_OPTION}>Todas</option>
              {options.operaciones.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-600">
            Rancho
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
              value={filters.rancho}
              onChange={(event) => setFilters((prev) => ({ ...prev, rancho: event.target.value }))}
            >
              <option value={ALL_OPTION}>Todos</option>
              {options.ranchos.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-600">
            Cultivo
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
              value={filters.cultivo}
              onChange={(event) => setFilters((prev) => ({ ...prev, cultivo: event.target.value }))}
            >
              <option value={ALL_OPTION}>Todos</option>
              {options.cultivos.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-600">
            Temporada
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
              value={filters.temporada}
              onChange={(event) => setFilters((prev) => ({ ...prev, temporada: event.target.value }))}
            >
              <option value={ALL_OPTION}>Todas</option>
              {options.temporadas.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-600">
            Sector
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
              value={filters.sector}
              onChange={(event) => setFilters((prev) => ({ ...prev, sector: event.target.value }))}
            >
              <option value={ALL_OPTION}>Todos</option>
              {options.sectores.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-600">
            Fecha inicio
            <Input
              type="date"
              value={filters.fechaInicio}
              onChange={(event) => setFilters((prev) => ({ ...prev, fechaInicio: event.target.value }))}
            />
          </label>

          <label className="text-sm text-gray-600">
            Fecha fin
            <Input
              type="date"
              value={filters.fechaFin}
              onChange={(event) => setFilters((prev) => ({ ...prev, fechaFin: event.target.value }))}
            />
          </label>

          <label className="text-sm text-gray-600">
            Métrica
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
              value={filters.metric}
              onChange={(event) => setFilters((prev) => ({ ...prev, metric: event.target.value }))}
            >
              {metricOptions.map((option) => (
                <option key={option} value={option}>
                  {toMetricLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Serie temporal: {selectedMetricLabel}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Badge className="bg-[#DBFAE6] text-[#0B6B2A]">Monitoreo</Badge>
            <Badge className="bg-blue-100 text-blue-700">Aplicación</Badge>
          </div>
        </div>

        {!hasData || !chartGeometry ? (
          <p className="text-sm text-gray-500">
            Sin datos para la métrica y filtros seleccionados. Ajusta el rango o captura más monitoreos.
          </p>
        ) : (
          <div className="space-y-4">
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

                {chartGeometry.points.map((point) => (
                  <g key={point.id}>
                    {point.yMinThreshold !== null ? (
                      <line
                        x1={point.x}
                        y1={point.yMinThreshold}
                        x2={point.x}
                        y2={point.y}
                        stroke="#F59E0B"
                        strokeDasharray="4 4"
                        opacity={0.7}
                      />
                    ) : null}
                    {point.yMaxThreshold !== null ? (
                      <line
                        x1={point.x}
                        y1={point.yMaxThreshold}
                        x2={point.x}
                        y2={point.y}
                        stroke="#EF4444"
                        strokeDasharray="4 4"
                        opacity={0.7}
                      />
                    ) : null}
                    <circle cx={point.x} cy={point.y} r={4.5} fill="#0B6B2A">
                      <title>
                        {`${formatDate(point.createdAt)}\n${selectedMetricLabel}: ${formatNumber(point.value)}${
                          point.applications.length > 0
                            ? `\nAplicaciones: ${point.applications
                                .flatMap((item) =>
                                  item.products.map(
                                    (product) => `${product.nombre} (${product.dosisPorHa} /ha, ${product.dosisPorTanque} por tanque)`,
                                  ),
                                )
                                .join(', ')}`
                            : ''
                        }`}
                      </title>
                    </circle>
                    <text x={point.x} y={chartGeometry.height - 12} fontSize="11" textAnchor="middle" fill="#64748B">
                      {new Date(point.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </text>
                  </g>
                ))}

                {chartGeometry.executionMarkers.map((marker) => (
                  <g key={marker.dayKey}>
                    <line
                      x1={marker.x}
                      y1={chartGeometry.padding.top}
                      x2={marker.x}
                      y2={chartGeometry.height - chartGeometry.padding.bottom}
                      stroke="#2563EB"
                      strokeDasharray="2 6"
                      opacity={0.65}
                    />
                    <circle cx={marker.x} cy={chartGeometry.padding.top + 6} r={3.5} fill="#2563EB">
                      <title>
                        {`${formatDate(marker.executions[0]?.fechaAplicacion ?? marker.dayKey)}\n${marker.executions
                          .flatMap((execution) =>
                            execution.products.map(
                              (product) => `${product.nombre} - ${product.dosisPorHa} /ha - ${product.dosisPorTanque} por tanque`,
                            ),
                          )
                          .join('\n')}`}
                      </title>
                    </circle>
                  </g>
                ))}

                <text
                  x={18}
                  y={chartGeometry.padding.top + 6}
                  transform={`rotate(-90 18 ${chartGeometry.padding.top + 6})`}
                  fontSize="12"
                  fill="#64748B"
                >
                  {selectedMetricLabel}
                </text>
              </svg>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-gray-50 p-3 text-xs text-gray-600">
              <p>
                Umbral mínimo/máximo: líneas punteadas por sesión cuando la métrica tiene regla configurada.
              </p>
              <p>
                Eventos de aplicación: líneas verticales azules (ejecuciones COMPLETED) con tooltip de productos y
                dosis.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Productos aplicados</h2>
        {productsRows.length === 0 ? (
          <p className="text-sm text-gray-500">Sin productos aplicados para los filtros seleccionados.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Dosis por ha</TableHead>
                <TableHead>Dosis por tanque</TableHead>
                <TableHead>Contexto</TableHead>
              </tr>
            </thead>
            <tbody>
              {productsRows.map((row) => (
                <TableRow key={`${row.executionId}-${row.producto}`}>
                  <TableCell>{formatDate(row.fechaAplicacion)}</TableCell>
                  <TableCell className="font-medium text-gray-900">{row.producto}</TableCell>
                  <TableCell>
                    {formatNumber(row.dosisPorHa)} {row.unit}/ha
                  </TableCell>
                  <TableCell>
                    {formatNumber(row.dosisPorTanque)} {row.unit}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {row.operacion || '—'} · {row.rancho || '—'} · {row.cultivo || '—'} · {row.temporada || '—'} ·{' '}
                    {row.sector || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
