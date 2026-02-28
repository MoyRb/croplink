import type { MonitoringSession, ThresholdRule } from './types'

export const calcDensity = (conteoEnMetros: number, metrosMuestreados: number) => {
  if (!metrosMuestreados || metrosMuestreados <= 0) return 0
  return conteoEnMetros / metrosMuestreados
}

export const calcAverageDensity = (session: MonitoringSession) => {
  const densities = session.sectors.flatMap((sector) =>
    sector.points.map((point) => calcDensity(point.conteoEnMetros, point.metrosMuestreados)),
  )

  if (densities.length === 0) return 0
  return densities.reduce((acc, value) => acc + value, 0) / densities.length
}

export const evaluateThreshold = (value: number, threshold: ThresholdRule) => {
  if (threshold.min !== undefined && value < threshold.min) return 'below'
  if (threshold.max !== undefined && value > threshold.max) return 'above'
  return 'ok'
}

export const findThreshold = (metric: string, rules: ThresholdRule[]) =>
  rules.find((rule) => rule.metric === metric)

export type ThresholdViolation = {
  metric: string
  value: number
  scope: string
  reason: 'below' | 'above'
}

export const collectThresholdViolations = (session: MonitoringSession): ThresholdViolation[] => {
  const violations: ThresholdViolation[] = []

  session.sectors.forEach((sector) => {
    sector.points.forEach((point) => {
      const density = calcDensity(point.conteoEnMetros, point.metrosMuestreados)
      const densityRule = findThreshold('densidad_punto', session.config.umbrales)
      if (densityRule) {
        const result = evaluateThreshold(density, densityRule)
        if (result !== 'ok') {
          violations.push({
            metric: 'densidad_punto',
            value: density,
            scope: `${sector.name} / ${point.name}`,
            reason: result,
          })
        }
      }

      point.plantas.forEach((planta) => {
        Object.entries(planta.metrics).forEach(([metric, raw]) => {
          const value = Number(raw)
          if (Number.isNaN(value)) return
          const rule = findThreshold(metric, session.config.umbrales)
          if (!rule) return
          const result = evaluateThreshold(value, rule)
          if (result !== 'ok') {
            violations.push({
              metric,
              value,
              scope: `${sector.name} / ${point.name} / ${planta.name}`,
              reason: result,
            })
          }
        })
      })
    })
  })

  return violations
}



export const calcAverageRootWhitePct = (session: MonitoringSession) => {
  const values = session.sectors.flatMap((sector) =>
    sector.points.flatMap((point) =>
      point.plantas
        .map((planta) => Number(planta.metrics.raiz_blanca_pct))
        .filter((value) => Number.isFinite(value)),
    ),
  )

  if (values.length === 0) return null
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

export const calcAverageRootLength = (session: MonitoringSession) => {
  const values = session.sectors.flatMap((sector) =>
    sector.points.flatMap((point) =>
      point.plantas
        .map((planta) => Number(planta.metrics.raiz_longitud_cm))
        .filter((value) => Number.isFinite(value)),
    ),
  )

  if (values.length === 0) return null
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

export const countRootVigor = (session: MonitoringSession) => {
  const counts: Record<string, number> = {}

  session.sectors.forEach((sector) => {
    sector.points.forEach((point) => {
      point.plantas.forEach((planta) => {
        const vigor = planta.metrics.raiz_vigor
        if (typeof vigor !== 'string' || !vigor.trim()) return
        counts[vigor] = (counts[vigor] ?? 0) + 1
      })
    })
  })

  return counts
}
