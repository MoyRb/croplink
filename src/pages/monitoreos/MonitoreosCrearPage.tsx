import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ETAPAS_FENOLOGICAS, METEO_OPTIONS, type SessionConfig } from '../../lib/monitoreo'
import { useOperationContext } from '../../lib/store/operationContext'

type ThresholdRule = {
  id: string
  metric: string
  min?: number | null
  max?: number | null
  unit?: string | null
}

type MonitoringSessionPayload = {
  rancho: string
  cultivo: string
  sector: string
  tunel?: string
  valvula?: string
  superficie?: number
  condiciones: {
    humedad?: number
    temperatura?: number
    clima?: SessionConfig['condicionMeteorologica']
  }
  etapa: SessionConfig['etapaFenologica']
  muestreo: {
    puntosPorSector: number
    plantasPorPunto: number
    metrosMuestreados: number
  }
  tipo: 'desarrollo' | 'nutricion'
  umbrales: ThresholdRule[]
  startedAt: string
}

const mockRanches = ['Rancho Norte', 'Rancho Sur']
const mockCultivos = ['Tomate', 'Pepino', 'Pimiento']

const getUuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`)

const parseNullableNumber = (value: string) => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function MonitoreosCrearPage() {
  const navigate = useNavigate()
  const { operationContext, ranches, cropSeasons, sectors, tunnels, valves } = useOperationContext()

  const [config, setConfig] = useState<SessionConfig>({
    rancho: operationContext.ranch?.name || '',
    cultivo: operationContext.cropSeason?.name || '',
    sector: operationContext.sector?.name || '',
    tunnel: operationContext.tunnel?.name || undefined,
    valve: operationContext.valve?.name || undefined,
    condicionMeteorologica: 'Soleado',
    etapaFenologica: 'vegetativa',
    puntosPorSector: 8,
    plantasPorPunto: 3,
    metrosMuestreados: 1,
    tipoMonitoreo: 'DESARROLLO',
    sistemaProduccion: 'HIDROPONICO',
    umbrales: [],
  })

  const [thresholdRules, setThresholdRules] = useState<ThresholdRule[]>([])
  const [metric, setMetric] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [unit, setUnit] = useState('')
  const [formError, setFormError] = useState('')

  const availableRanches = useMemo(
    () => (ranches.length > 0 ? ranches.map((item) => item.name) : mockRanches),
    [ranches],
  )

  const handleAddThreshold = () => {
    const normalizedMetric = metric.trim()
    if (!normalizedMetric) {
      setFormError('La métrica de umbral es obligatoria.')
      return
    }

    const parsedMin = parseNullableNumber(min)
    const parsedMax = parseNullableNumber(max)

    setThresholdRules((prev) => {
      const existingIndex = prev.findIndex(
        (rule) => rule.metric.toLowerCase() === normalizedMetric.toLowerCase(),
      )

      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          metric: normalizedMetric,
          min: parsedMin,
          max: parsedMax,
          unit: unit.trim() || null,
        }
        return updated
      }

      return [
        ...prev,
        {
          id: getUuid(),
          metric: normalizedMetric,
          min: parsedMin,
          max: parsedMax,
          unit: unit.trim() || null,
        },
      ]
    })

    setMetric('')
    setMin('')
    setMax('')
    setUnit('')
    setFormError('')
  }

  const handleRemoveThreshold = (id: string) => {
    setThresholdRules((prev) => prev.filter((rule) => rule.id !== id))
  }

  const handleIniciarMonitoreo = () => {
    if (!config.rancho.trim() || !config.cultivo.trim() || !config.sector.trim() || !config.etapaFenologica) {
      setFormError('Completa rancho, cultivo, sector y etapa para iniciar el monitoreo.')
      return
    }

    if (config.puntosPorSector <= 0 || config.plantasPorPunto <= 0) {
      setFormError('Puntos por sector y plantas por punto deben ser mayores a 0.')
      return
    }

    const payload: MonitoringSessionPayload = {
      rancho: config.rancho,
      cultivo: config.cultivo,
      sector: config.sector,
      tunel: config.tunnel,
      valvula: config.valve,
      superficie: config.superficie,
      condiciones: {
        humedad: config.humedadRelativa,
        temperatura: config.temperatura,
        clima: config.condicionMeteorologica,
      },
      etapa: config.etapaFenologica,
      muestreo: {
        puntosPorSector: config.puntosPorSector,
        plantasPorPunto: config.plantasPorPunto,
        metrosMuestreados: config.metrosMuestreados,
      },
      tipo: config.tipoMonitoreo === 'DESARROLLO' ? 'desarrollo' : 'nutricion',
      umbrales: thresholdRules,
      startedAt: new Date().toISOString(),
    }

    const sessionId = getUuid()
    localStorage.setItem(`monitoreo_session_${sessionId}`, JSON.stringify(payload))
    localStorage.setItem('monitoreo_session_active', sessionId)
    setFormError('')
    navigate(`/monitoreos/iniciar/${sessionId}`)
  }

  const muestraTotal = config.puntosPorSector * config.plantasPorPunto

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configurar monitoreo</h1>
        <p className="text-sm text-gray-500">Define contexto, muestreo, umbrales y tipo de monitoreo.</p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Contexto</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.rancho}
            onChange={(event) => setConfig((prev) => ({ ...prev, rancho: event.target.value }))}
          >
            <option value="">Rancho</option>
            {availableRanches.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.cultivo}
            onChange={(event) => setConfig((prev) => ({ ...prev, cultivo: event.target.value }))}
          >
            <option value="">Cultivo</option>
            {(cropSeasons.length > 0 ? cropSeasons.map((item) => item.name) : mockCultivos).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="Superficie"
            value={config.superficie ?? ''}
            onChange={(event) => setConfig((prev) => ({ ...prev, superficie: Number(event.target.value) }))}
          />
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.sector}
            onChange={(event) => setConfig((prev) => ({ ...prev, sector: event.target.value }))}
          >
            <option value="">Sector</option>
            {(sectors.length > 0 ? sectors.map((item) => item.name) : ['Sector 1']).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.tunnel ?? ''}
            onChange={(event) => setConfig((prev) => ({ ...prev, tunnel: event.target.value || undefined }))}
          >
            <option value="">Túnel (opcional)</option>
            {tunnels.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.valve ?? ''}
            onChange={(event) => setConfig((prev) => ({ ...prev, valve: event.target.value || undefined }))}
          >
            <option value="">Válvula (opcional)</option>
            {valves.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Condiciones ambientales</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            type="number"
            placeholder="Humedad relativa (%)"
            value={config.humedadRelativa ?? ''}
            onChange={(event) => setConfig((prev) => ({ ...prev, humedadRelativa: Number(event.target.value) }))}
          />
          <Input
            type="number"
            placeholder="Temperatura (°C)"
            value={config.temperatura ?? ''}
            onChange={(event) => setConfig((prev) => ({ ...prev, temperatura: Number(event.target.value) }))}
          />
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.condicionMeteorologica}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, condicionMeteorologica: event.target.value as SessionConfig['condicionMeteorologica'] }))
            }
          >
            {METEO_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {ETAPAS_FENOLOGICAS.map((etapa) => (
            <button
              key={etapa.value}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                config.etapaFenologica === etapa.value
                  ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                  : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setConfig((prev) => ({ ...prev, etapaFenologica: etapa.value }))}
            >
              {etapa.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Muestreo y tipo</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="puntos-por-sector">
              Puntos por sector
            </label>
            <Input
              id="puntos-por-sector"
              type="number"
              min={1}
              step={1}
              value={config.puntosPorSector}
              onChange={(event) => setConfig((prev) => ({ ...prev, puntosPorSector: Number(event.target.value) || 1 }))}
            />
            <p className="text-xs text-gray-500">Cantidad de puntos de evaluación dentro del sector.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="plantas-por-punto">
              Plantas por punto
            </label>
            <Input
              id="plantas-por-punto"
              type="number"
              min={1}
              step={1}
              value={config.plantasPorPunto}
              onChange={(event) => setConfig((prev) => ({ ...prev, plantasPorPunto: Number(event.target.value) || 1 }))}
            />
            <p className="text-xs text-gray-500">Número de plantas que revisarás en cada punto.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="metros-muestreados">
              Metros muestreados (m)
            </label>
            <Input
              id="metros-muestreados"
              type="number"
              min={0.5}
              step={0.5}
              value={config.metrosMuestreados}
              onChange={(event) => setConfig((prev) => ({ ...prev, metrosMuestreados: Number(event.target.value) || 1 }))}
            />
            <p className="text-xs text-gray-500">Longitud del tramo evaluado por punto.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Muestra total: {config.puntosPorSector} × {config.plantasPorPunto} = {muestraTotal} plantas
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={config.tipoMonitoreo === 'DESARROLLO' ? 'primary' : 'secondary'}
            onClick={() => setConfig((prev) => ({ ...prev, tipoMonitoreo: 'DESARROLLO' }))}
          >
            Desarrollo
          </Button>
          <Button
            type="button"
            variant={config.tipoMonitoreo === 'NUTRICION' ? 'primary' : 'secondary'}
            onClick={() => setConfig((prev) => ({ ...prev, tipoMonitoreo: 'NUTRICION' }))}
          >
            Nutrición
          </Button>
          {config.tipoMonitoreo === 'NUTRICION' ? (
            <select
              className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
              value={config.sistemaProduccion}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, sistemaProduccion: event.target.value as 'HIDROPONICO' | 'SUELO' }))
              }
            >
              <option value="HIDROPONICO">Hidropónico</option>
              <option value="SUELO">Suelo</option>
            </select>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Umbrales</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <Input placeholder="Métrica" value={metric} onChange={(event) => setMetric(event.target.value)} />
          <Input placeholder="Min" type="number" value={min} onChange={(event) => setMin(event.target.value)} />
          <Input placeholder="Max" type="number" value={max} onChange={(event) => setMax(event.target.value)} />
          <Input placeholder="Unidad (opcional)" value={unit} onChange={(event) => setUnit(event.target.value)} />
          <Button type="button" onClick={handleAddThreshold}>
            Agregar regla
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {thresholdRules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
              <Badge>{`${rule.metric} [${rule.min ?? '-'}, ${rule.max ?? '-'}]${rule.unit ? ` ${rule.unit}` : ''}`}</Badge>
              <button
                type="button"
                className="text-xs font-semibold text-red-600"
                onClick={() => handleRemoveThreshold(rule.id)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-2">
        <div className="flex justify-end">
          <Button type="button" onClick={handleIniciarMonitoreo}>
            Iniciar monitoreo
          </Button>
        </div>
        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
      </div>
    </div>
  )
}
