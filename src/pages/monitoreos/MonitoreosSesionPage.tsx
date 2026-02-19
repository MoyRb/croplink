import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import {
  DESARROLLO_TEMPLATES,
  NUTRICION_BASE,
  NUTRICION_BY_SISTEMA,
  addSectorToSession,
  calcDensity,
  evaluateThreshold,
  findThreshold,
  getSessionById,
  type HallazgoTipo,
  type MetricTemplate,
  updateSession,
} from '../../lib/monitoreo'

export function MonitoreosSesionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [activeSector, setActiveSector] = useState(0)
  const [activePoint, setActivePoint] = useState(0)
  const [activePlant, setActivePlant] = useState(0)
  const [sessionState, setSessionState] = useState(() => getSessionById(id) ?? null)

  const session = sessionState
  if (!session) return <Navigate to="/monitoreos/lista" replace />

  const templates: MetricTemplate[] =
    session.config.tipoMonitoreo === 'DESARROLLO'
      ? DESARROLLO_TEMPLATES[session.config.etapaFenologica]
      : [...NUTRICION_BASE, ...NUTRICION_BY_SISTEMA[session.config.sistemaProduccion ?? 'HIDROPONICO']]

  const persistSession = (updater: Parameters<typeof updateSession>[1]) => {
    const updated = updateSession(session.id, updater)
    if (updated) setSessionState(updated)
  }

  const sector = session.sectors[activeSector]
  const point = sector.points[activePoint]
  const plant = point.plantas[activePlant]

  const saveMetric = (key: string, rawValue: string) => {
    persistSession((draft) => {
      const next = structuredClone(draft)
      const metricTemplate = templates.find((template) => template.key === key)
      const value = metricTemplate?.type === 'text' ? rawValue : Number(rawValue)
      next.sectors[activeSector].points[activePoint].plantas[activePlant].metrics[key] = value
      return next
    })
  }

  const savePointField = (field: 'conteoEnMetros' | 'metrosMuestreados', value: number) => {
    persistSession((draft) => {
      const next = structuredClone(draft)
      next.sectors[activeSector].points[activePoint][field] = value
      return next
    })
  }

  const addHallazgo = () => {
    persistSession((draft) => {
      const next = structuredClone(draft)
      next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos.push({
        id: crypto.randomUUID(),
        tipo: 'Plaga',
        descripcion: '',
        fotos: [],
      })
      return next
    })
  }

  const setStatus = (status: 'PAUSED' | 'COMPLETED') => {
    persistSession((draft) => ({ ...draft, status }))
    navigate(status === 'COMPLETED' ? `/monitoreos/resumen/${session.id}` : '/monitoreos/lista')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sesión de monitoreo</h1>
          <p className="text-sm text-gray-500">
            {session.config.rancho} · {session.config.cultivo} · {session.config.tipoMonitoreo}
          </p>
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
          {point.plantas.map((item, index) => (
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
          <Input
            type="number"
            value={point.conteoEnMetros}
            onChange={(event) => savePointField('conteoEnMetros', Number(event.target.value))}
            placeholder="Conteo en metros"
          />
          <Input
            type="number"
            value={point.metrosMuestreados}
            onChange={(event) => savePointField('metrosMuestreados', Number(event.target.value) || 1)}
            placeholder="Metros muestreados"
          />
          <div className="rounded-2xl border border-[#E5E7EB] px-4 py-2 text-sm">
            Densidad del punto: <strong>{calcDensity(point.conteoEnMetros, point.metrosMuestreados).toFixed(2)}</strong>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">{plant.name}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => {
            const threshold = findThreshold(template.key, session.config.umbrales)
            const value = plant.metrics[template.key]
            const numericValue = Number(value)
            const status =
              threshold && !Number.isNaN(numericValue) ? evaluateThreshold(numericValue, threshold) : 'ok'
            const highlight =
              status === 'ok'
                ? ''
                : status === 'above'
                  ? 'border-red-300 bg-red-50'
                  : 'border-amber-300 bg-amber-50'

            return (
              <div key={template.key} className={`rounded-2xl border p-3 ${highlight}`}>
                <label className="mb-1 block text-xs font-semibold text-gray-600">{template.label}</label>
                <Input
                  type={template.type === 'text' ? 'text' : 'number'}
                  value={value?.toString() ?? ''}
                  onChange={(event) => saveMetric(template.key, event.target.value)}
                />
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Hallazgos</h2>
          <Button variant="secondary" onClick={addHallazgo}>
            Agregar hallazgo
          </Button>
        </div>
        {plant.hallazgos.length === 0 ? <p className="text-sm text-gray-500">Sin hallazgos.</p> : null}
        {plant.hallazgos.map((hallazgo, hallazgoIndex) => (
          <div key={hallazgo.id} className="grid gap-2 rounded-2xl border border-[#E5E7EB] p-3 md:grid-cols-4">
            <select
              className="rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
              value={hallazgo.tipo}
              onChange={(event) => {
                const tipo = event.target.value as HallazgoTipo
                persistSession((draft) => {
                  const next = structuredClone(draft)
                  next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[hallazgoIndex].tipo = tipo
                  if (tipo !== 'Plaga' && tipo !== 'Enfermedad') {
                    delete next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[hallazgoIndex].pc
                  }
                  return next
                })
              }}
            >
              <option>Plaga</option>
              <option>Enfermedad</option>
              <option>Insectos benéficos</option>
              <option>Desarrollo</option>
              <option>Nutrición</option>
            </select>
            <Input
              placeholder="Descripción"
              value={hallazgo.descripcion}
              onChange={(event) => {
                persistSession((draft) => {
                  const next = structuredClone(draft)
                  next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[
                    hallazgoIndex
                  ].descripcion = event.target.value
                  return next
                })
              }}
            />
            {(hallazgo.tipo === 'Plaga' || hallazgo.tipo === 'Enfermedad') && (
              <Input
                type="number"
                placeholder="PC (%)"
                value={hallazgo.pc ?? ''}
                onChange={(event) => {
                  persistSession((draft) => {
                    const next = structuredClone(draft)
                    next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[hallazgoIndex].pc =
                      Number(event.target.value)
                    return next
                  })
                }}
              />
            )}
            <div className="grid gap-2">
              <select
                className="rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
                value={hallazgo.severidad ?? ''}
                onChange={(event) => {
                  persistSession((draft) => {
                    const next = structuredClone(draft)
                    next.sectors[activeSector].points[activePoint].plantas[activePlant].hallazgos[hallazgoIndex].severidad =
                      event.target.value ? (event.target.value as 'baja' | 'media' | 'alta') : undefined
                    return next
                  })
                }}
              >
                <option value="">Severidad</option>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
              <p className="text-xs text-gray-500">Fotos: placeholder (sin subida).</p>
            </div>
          </div>
        ))}
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => setStatus('PAUSED')}>
          Pausar monitoreo
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const updated = addSectorToSession(session.id)
            if (updated) {
              setSessionState(updated)
              setActiveSector(updated.sectors.length - 1)
              setActivePoint(0)
              setActivePlant(0)
            }
          }}
        >
          Siguiente sector
        </Button>
        <Button onClick={() => setStatus('COMPLETED')}>Terminar monitoreo</Button>
      </div>
    </div>
  )
}
