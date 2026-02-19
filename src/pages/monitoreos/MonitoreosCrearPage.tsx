import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ETAPAS_FENOLOGICAS, METEO_OPTIONS, createSession, type SessionConfig } from '../../lib/monitoreo'
import { useOperationContext } from '../../lib/store/operationContext'

const mockRanches = ['Rancho Norte', 'Rancho Sur']
const mockCultivos = ['Tomate', 'Pepino', 'Pimiento']

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

  const [metric, setMetric] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')

  const availableRanches = useMemo(
    () => (ranches.length > 0 ? ranches.map((item) => item.name) : mockRanches),
    [ranches],
  )

  const handleAddThreshold = () => {
    if (!metric.trim()) return
    setConfig((prev) => ({
      ...prev,
      umbrales: [
        ...prev.umbrales,
        {
          id: crypto.randomUUID(),
          metric: metric.trim(),
          min: min ? Number(min) : undefined,
          max: max ? Number(max) : undefined,
        },
      ],
    }))
    setMetric('')
    setMin('')
    setMax('')
  }

  const handleStart = () => {
    const session = createSession(config)
    navigate(`/monitoreos/sesion/${session.id}`)
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
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Métrica" value={metric} onChange={(event) => setMetric(event.target.value)} />
          <Input placeholder="Min" type="number" value={min} onChange={(event) => setMin(event.target.value)} />
          <Input placeholder="Max" type="number" value={max} onChange={(event) => setMax(event.target.value)} />
          <Button type="button" onClick={handleAddThreshold}>
            Agregar regla
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.umbrales.map((rule) => (
            <Badge key={rule.id}>{`${rule.metric} [${rule.min ?? '-'}, ${rule.max ?? '-'}]`}</Badge>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleStart} disabled={!config.rancho || !config.cultivo || !config.sector}>
          Iniciar monitoreo
        </Button>
      </div>
    </div>
  )
}
