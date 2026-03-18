import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import {
  addSectorToSession,
  calcDensity,
  evaluateThreshold,
  findThreshold,
  getHallazgoTypeFromSubject,
  getSamplingMetricTemplates,
  getSamplingSubjectLabel,
  getSessionById,
  updatePlantMetrics,
  updatePointMeasurements,
  type HallazgoTipo,
  type MetricTemplate,
  type MonitoringSession,
  updateSession,
} from '../../lib/monitoreo'

export function MonitoreosSesionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [activeSector, setActiveSector] = useState(0)
  const [activePoint, setActivePoint] = useState(0)
  const [activePlant, setActivePlant] = useState(0)
  const [sessionState, setSessionState] = useState<MonitoringSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isSavingRef = useRef(false)
  const pendingUpdaterRef = useRef<Parameters<typeof updateSession>[1] | null>(null)
  const metricDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingMetricRef = useRef<{ plantId: string; metrics: Record<string, number | string> } | null>(null)
  const pointDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPointRef = useRef<{ pointId: string; metros: number; conteo: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const session = await getSessionById(id)
        if (!cancelled) setSessionState(session)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la sesión.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (id) void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const session = sessionState

  const templates: MetricTemplate[] = useMemo(() => {
    if (!session) return []
    return getSamplingMetricTemplates(session.config)
  }, [session])

  const persistSession = async (updater: Parameters<typeof updateSession>[1]) => {
    if (!session) return

    if (isSavingRef.current) {
      // Queue only the latest updater; discard any previously queued one
      pendingUpdaterRef.current = updater
      return
    }

    isSavingRef.current = true
    setSaving(true)
    try {
      const updated = await updateSession(session.id, updater)
      if (updated) setSessionState(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la sesión.')
    } finally {
      isSavingRef.current = false
      setSaving(false)
      // Run the last queued updater, if any
      const pending = pendingUpdaterRef.current
      if (pending) {
        pendingUpdaterRef.current = null
        void persistSession(pending)
      }
    }
  }

  if (loading) return <Card><p className="text-sm text-gray-500">Cargando sesión...</p></Card>
  if (error && !session) return <Card><p className="text-sm text-red-600">{error}</p></Card>
  if (!session) return <Navigate to="/monitoreos/lista" replace />

  const sector = session.sectors[activeSector] ?? session.sectors[0]
  if (!sector) return <Card><p className="text-sm text-gray-500">Sin sectores en esta sesión.</p></Card>
  const point = sector.points[activePoint] ?? sector.points[0]
  if (!point) return <Card><p className="text-sm text-gray-500">Sin puntos en este sector.</p></Card>
  const plant = point.plantas[activePlant] ?? point.plantas[0]
  if (!plant) return <Card><p className="text-sm text-gray-500">Sin plantas en este punto.</p></Card>

  const saveMetric = (key: string, rawValue: string, templatePool: MetricTemplate[] = templates) => {
    const metricTemplate = templatePool.find((t) => t.key === key)
    const isText = metricTemplate?.type === 'text' || metricTemplate?.type === 'select'

    let value: number | string
    if (isText) {
      value = rawValue
    } else {
      if (rawValue === '') {
        // Clear numeric metric — remove from map
        setSessionState((prev) => {
          if (!prev) return prev
          const next = structuredClone(prev)
          const s = next.sectors[Math.min(activeSector, next.sectors.length - 1)]
          const p = s?.points[Math.min(activePoint, (s?.points.length ?? 1) - 1)]
          const pl = p?.plantas[Math.min(activePlant, (p?.plantas.length ?? 1) - 1)]
          if (pl) delete pl.metrics[key]
          return next
        })
        return
      }
      const parsed = Number(rawValue)
      if (Number.isNaN(parsed)) return
      value = Math.max(0, parsed)
    }

    // 1. Optimistic local update
    setSessionState((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      const s = next.sectors[Math.min(activeSector, next.sectors.length - 1)]
      const p = s?.points[Math.min(activePoint, (s?.points.length ?? 1) - 1)]
      const pl = p?.plantas[Math.min(activePlant, (p?.plantas.length ?? 1) - 1)]
      if (pl) pl.metrics[key] = value
      return next
    })

    // 2. Accumulate pending metrics for this plant
    const currentPending = pendingMetricRef.current?.plantId === plant.id ? pendingMetricRef.current.metrics : { ...plant.metrics }
    pendingMetricRef.current = { plantId: plant.id, metrics: { ...currentPending, [key]: value } }

    // 3. Debounced targeted save (600ms)
    if (metricDebounceRef.current) clearTimeout(metricDebounceRef.current)
    metricDebounceRef.current = setTimeout(async () => {
      const pending = pendingMetricRef.current
      if (!pending) return
      pendingMetricRef.current = null
      setSaving(true)
      try {
        await updatePlantMetrics(pending.plantId, pending.metrics)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar la métrica.')
      } finally {
        setSaving(false)
      }
    }, 600)
  }

  const savePointField = (field: 'conteoEnMetros' | 'metrosMuestreados', value: number) => {
    const safeValue = Math.max(0, Number.isNaN(value) ? 0 : value)

    // 1. Optimistic local update
    setSessionState((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      const s = next.sectors[Math.min(activeSector, next.sectors.length - 1)]
      const p = s?.points[Math.min(activePoint, (s?.points.length ?? 1) - 1)]
      if (p) p[field] = safeValue
      return next
    })

    // 2. Accumulate pending point state
    const prev = pendingPointRef.current?.pointId === point.id ? pendingPointRef.current : { pointId: point.id, metros: point.metrosMuestreados, conteo: point.conteoEnMetros }
    pendingPointRef.current = {
      pointId: point.id,
      metros: field === 'metrosMuestreados' ? safeValue : prev.metros,
      conteo: field === 'conteoEnMetros' ? safeValue : prev.conteo,
    }

    // 3. Debounced targeted save (600ms)
    if (pointDebounceRef.current) clearTimeout(pointDebounceRef.current)
    pointDebounceRef.current = setTimeout(async () => {
      const pending = pendingPointRef.current
      if (!pending) return
      pendingPointRef.current = null
      setSaving(true)
      try {
        await updatePointMeasurements(pending.pointId, pending.metros, pending.conteo)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el punto.')
      } finally {
        setSaving(false)
      }
    }, 600)
  }

  const addHallazgo = () => {
    void persistSession((draft) => {
      const next = structuredClone(draft)
      next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos.push({
        id: crypto.randomUUID(),
        tipo: getHallazgoTypeFromSubject(next.config.queMuestrear),
        descripcion: '',
        fotos: [],
      })
      return next
    })
  }

  const setStatus = async (status: 'PAUSED' | 'COMPLETED') => {
    await persistSession((draft) => ({ ...draft, status }))
    navigate(status === 'COMPLETED' ? `/monitoreos/resumen/${session.id}` : '/monitoreos/lista')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sesión de monitoreo</h1>
          <p className="text-sm text-gray-500">
            {session.config.rancho} · {session.config.cultivo} · {getSamplingSubjectLabel(session.config.queMuestrear)}
          </p>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {saving ? <p className="text-xs text-gray-500">Guardando…</p> : null}
        </div>
        <Badge>{session.status}</Badge>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {session.sectors.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSector(index)
                setActivePoint(0)
                setActivePlant(0)
              }}
              className={`rounded-full px-3 py-1 text-xs ${
                index === activeSector ? 'bg-[#DBFAE6] text-[#0B6B2A]' : 'bg-gray-100'
              }`}
            >
              {item.name}
            </button>
          ))}
          <Button variant="ghost" onClick={() => void addSectorToSession(session.id).then((next) => next && setSessionState(next))}>
            + Sector
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {sector.points.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                setActivePoint(index)
                setActivePlant(0)
              }}
              className={`rounded-full px-3 py-1 text-xs ${
                index === activePoint ? 'bg-[#DBFAE6] text-[#0B6B2A]' : 'bg-gray-100'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(point?.plantas ?? []).map((item, index) => (
            <button
              key={item.id}
              onClick={() => setActivePlant(index)}
              className={`rounded-full px-3 py-1 text-xs ${
                index === activePlant ? 'bg-[#DBFAE6] text-[#0B6B2A]' : 'bg-gray-100'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Captura de punto</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input type="number" min={0} step={0.01} value={point.metrosMuestreados} onChange={(event) => savePointField('metrosMuestreados', Number(event.target.value))} />
          <Input type="number" min={0} step={1} value={point.conteoEnMetros} onChange={(event) => savePointField('conteoEnMetros', Number(event.target.value))} />
          <Input type="text" value={calcDensity(point.conteoEnMetros, point.metrosMuestreados).toFixed(2)} readOnly />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Métricas</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const threshold = findThreshold(template.key, session.config.umbrales)
            const value = plant.metrics[template.key]
            const numericValue = Number(value)
            const status = threshold && !Number.isNaN(numericValue) ? evaluateThreshold(numericValue, threshold) : 'ok'
            const highlight = status === 'ok' ? '' : status === 'above' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'

            return (
              <div key={template.key} className={`rounded-2xl border p-3 ${highlight}`}>
                <label className="mb-1 block text-xs font-semibold text-gray-600">{template.label}</label>
                {template.type === 'select' ? (
                  <select className="w-full rounded-full border border-[#E5E7EB] px-4 py-2 text-sm" value={value?.toString() ?? ''} onChange={(event) => saveMetric(template.key, event.target.value)}>
                    <option value="">Selecciona una opción</option>
                    {(template.options ?? []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <Input type={template.type === 'text' ? 'text' : 'number'} min={template.type !== 'text' ? 0 : undefined} step={template.type !== 'text' ? 0.01 : undefined} value={value?.toString() ?? ''} onChange={(event) => saveMetric(template.key, event.target.value, templates)} />
                )}
              </div>
            )
          })}
        </div>
      </Card>



      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Hallazgos</h2>
          <Button variant="secondary" onClick={addHallazgo}>Agregar hallazgo</Button>
        </div>
        {plant.hallazgos.length === 0 ? <p className="text-sm text-gray-500">Sin hallazgos.</p> : null}
        {plant.hallazgos.map((hallazgo, hallazgoIndex) => (
          <div key={hallazgo.id} className="grid gap-2 rounded-2xl border border-[#E5E7EB] p-3 md:grid-cols-4">
            <select className="rounded-full border border-[#E5E7EB] px-3 py-2 text-sm" value={hallazgo.tipo} onChange={(event) => {
              const tipo = event.target.value as HallazgoTipo
              void persistSession((draft) => {
                const next = structuredClone(draft)
                next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[hallazgoIndex].tipo = tipo
                if (tipo !== 'Plaga' && tipo !== 'Enfermedad') delete next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[hallazgoIndex].pc
                return next
              })
            }}>
              <option>Plaga</option>
              <option>Enfermedad</option>
              <option>Insectos benéficos</option>
              <option>Desarrollo</option>
              <option>Nutrición</option>
            </select>
            <Input placeholder="Descripción" value={hallazgo.descripcion} onChange={(event) => {
              void persistSession((draft) => {
                const next = structuredClone(draft)
                next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[hallazgoIndex].descripcion = event.target.value
                return next
              })
            }} />
            {(hallazgo.tipo === 'Plaga' || hallazgo.tipo === 'Enfermedad') && (
              <Input type="number" placeholder="PC (%)" value={hallazgo.pc ?? ''} onChange={(event) => {
                void persistSession((draft) => {
                  const next = structuredClone(draft)
                  next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[hallazgoIndex].pc = event.target.value === '' ? undefined : Number(event.target.value)
                  return next
                })
              }} />
            )}
          </div>
        ))}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => void setStatus('PAUSED')}>Pausar monitoreo</Button>
        <Button onClick={() => void setStatus('COMPLETED')}>Terminar monitoreo</Button>
      </div>
    </div>
  )
}
