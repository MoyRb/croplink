import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import {
  ETAPAS_FENOLOGICAS,
  METEO_OPTIONS,
  WHAT_TO_SAMPLE_OPTIONS,
  buildSamplingTable,
  createSession,
  getMonitoringTypeFromSubject,
  getSamplingSubjectLabel,
  type SamplingTableRow,
  type SessionConfig,
} from '../../lib/monitoreo'
import { useOperationContext } from '../../lib/store/operationContext'

type ThresholdRule = {
  id: string
  metric: string
  min?: number
  max?: number
  unit?: string | null
}

const getUuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`)

const parseNullableNumber = (value: string) => {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const today = new Date().toISOString().slice(0, 10)

export function MonitoreosCrearPage() {
  const navigate = useNavigate()
  const { operationContext, ranches, cropSeasons, sectors, tunnels, valves } = useOperationContext()

  const [config, setConfig] = useState<SessionConfig>({
    fechaMonitoreo: today,
    queMuestrear: 'PLAGAS',
    rancho: operationContext.ranch?.name || '',
    ranchoId: operationContext.ranch?.id,
    cultivo: operationContext.cropSeason?.name || '',
    cultivoId: operationContext.cropSeason?.id,
    sector: operationContext.sector?.name || '',
    sectorId: operationContext.sector?.id,
    tunnel: operationContext.tunnel?.name || undefined,
    tunnelId: operationContext.tunnel?.id,
    valve: operationContext.valve?.name || undefined,
    valveId: operationContext.valve?.id,
    condicionMeteorologica: 'Soleado',
    etapaFenologica: 'vegetativa',
    puntosPorSector: 8,
    plantasPorPunto: 3,
    metrosMuestreados: 1,
    tipoMonitoreo: 'DESARROLLO',
    sistemaProduccion: 'HIDROPONICO',
    umbrales: [],
    tablaMuestreo: [],
  })

  const [thresholdRules, setThresholdRules] = useState<ThresholdRule[]>([])
  const [metric, setMetric] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [unit, setUnit] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      rancho: operationContext.ranch?.name || prev.rancho,
      ranchoId: operationContext.ranch?.id ?? prev.ranchoId,
      cultivo: operationContext.cropSeason?.name || prev.cultivo,
      cultivoId: operationContext.cropSeason?.id ?? prev.cultivoId,
      sector: operationContext.sector?.name || prev.sector,
      sectorId: operationContext.sector?.id ?? prev.sectorId,
      tunnel: operationContext.tunnel?.name || prev.tunnel,
      tunnelId: operationContext.tunnel?.id ?? prev.tunnelId,
      valve: operationContext.valve?.name || prev.valve,
      valveId: operationContext.valve?.id ?? prev.valveId,
    }))
  }, [operationContext.cropSeason, operationContext.ranch, operationContext.sector, operationContext.tunnel, operationContext.valve])

  const samplingTable = useMemo<SamplingTableRow[]>(() => {
    return buildSamplingTable({
      cultivo: config.cultivo,
      etapaFenologica: config.etapaFenologica,
      queMuestrear: config.queMuestrear,
      sistemaProduccion: config.sistemaProduccion,
    })
  }, [config.cultivo, config.etapaFenologica, config.queMuestrear, config.sistemaProduccion])

  const handleAddThreshold = () => {
    const normalizedMetric = metric.trim()
    if (!normalizedMetric) {
      setFormError('La métrica de umbral es obligatoria.')
      return
    }

    const parsedMin = parseNullableNumber(min)
    const parsedMax = parseNullableNumber(max)

    if (parsedMin === undefined && parsedMax === undefined) {
      setFormError('Captura al menos un valor mínimo o máximo.')
      return
    }

    if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
      setFormError('El valor mínimo no puede ser mayor al máximo.')
      return
    }

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

  const handleSelectRanch = (ranchId: string) => {
    const selected = ranches.find((item) => item.id === ranchId)
    setConfig((prev) => ({
      ...prev,
      ranchoId: ranchId || undefined,
      rancho: selected?.name ?? '',
      cultivoId: undefined,
      cultivo: '',
      sectorId: undefined,
      sector: '',
      tunnelId: undefined,
      tunnel: undefined,
      valveId: undefined,
      valve: undefined,
    }))
  }

  const handleSelectCropSeason = (cropSeasonId: string) => {
    const selected = cropSeasons.find((item) => item.id === cropSeasonId)
    setConfig((prev) => ({
      ...prev,
      cultivoId: cropSeasonId || undefined,
      cultivo: selected?.name ?? '',
    }))
  }

  const handleSelectSector = (sectorId: string) => {
    const selected = sectors.find((item) => item.id === sectorId)
    setConfig((prev) => ({
      ...prev,
      sectorId: sectorId || undefined,
      sector: selected?.name ?? '',
      tunnelId: undefined,
      tunnel: undefined,
      valveId: undefined,
      valve: undefined,
    }))
  }

  const handleSelectTunnel = (tunnelId: string) => {
    const selected = tunnels.find((item) => item.id === tunnelId)
    setConfig((prev) => ({
      ...prev,
      tunnelId: tunnelId || undefined,
      tunnel: selected?.name ?? undefined,
      valveId: undefined,
      valve: undefined,
    }))
  }

  const handleSelectValve = (valveId: string) => {
    const selected = valves.find((item) => item.id === valveId)
    setConfig((prev) => ({
      ...prev,
      valveId: valveId || undefined,
      valve: selected?.name ?? undefined,
    }))
  }

  const handleIniciarMonitoreo = async () => {
    if (!config.fechaMonitoreo || !config.rancho.trim() || !config.cultivo.trim() || !config.etapaFenologica) {
      setFormError('Completa fecha, rancho, cultivo y etapa para iniciar el monitoreo.')
      return
    }

    if (config.puntosPorSector <= 0 || config.plantasPorPunto <= 0) {
      setFormError('Puntos por sector y plantas por punto deben ser mayores a 0.')
      return
    }

    if (samplingTable.length === 0) {
      setFormError('No se pudo preparar la tabla de muestreo para el contexto seleccionado.')
      return
    }

    setSaving(true)
    try {
      const created = await createSession({
        ...config,
        tipoMonitoreo: getMonitoringTypeFromSubject(config.queMuestrear),
        umbrales: thresholdRules,
        tablaMuestreo: samplingTable,
      })
      setFormError('')
      navigate(`/monitoreos/sesion/${created.id}`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo iniciar el monitoreo.')
    } finally {
      setSaving(false)
    }
  }

  const muestraTotal = config.puntosPorSector * config.plantasPorPunto

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configurar monitoreo</h1>
        <p className="text-sm text-gray-500">Define el contexto del monitoreo, los umbrales y la tabla base de muestreo.</p>
      </div>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold text-gray-900">1) Contexto del monitoreo</h2>
          <p className="text-sm text-gray-500">Selecciona explícitamente qué se va a muestrear y en qué condiciones se levantará el monitoreo.</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Qué se va a muestrear</p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {WHAT_TO_SAMPLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  config.queMuestrear === option.value
                    ? 'border-[#0B6B2A] bg-[#DBFAE6] text-[#0B6B2A]'
                    : 'border-[#E5E7EB] bg-white text-gray-700'
                }`}
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    queMuestrear: option.value,
                    tipoMonitoreo: getMonitoringTypeFromSubject(option.value),
                  }))
                }
              >
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-xs opacity-80">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input
            type="date"
            value={config.fechaMonitoreo}
            onChange={(event) => setConfig((prev) => ({ ...prev, fechaMonitoreo: event.target.value }))}
          />
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.ranchoId ?? ''}
            onChange={(event) => handleSelectRanch(event.target.value)}
          >
            <option value="">Rancho</option>
            {ranches.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.cultivoId ?? ''}
            onChange={(event) => handleSelectCropSeason(event.target.value)}
          >
            <option value="">Cultivo</option>
            {cropSeasons.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.sectorId ?? ''}
            onChange={(event) => handleSelectSector(event.target.value)}
          >
            <option value="">Sector base (opcional)</option>
            {sectors.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.tunnelId ?? ''}
            onChange={(event) => handleSelectTunnel(event.target.value)}
          >
            <option value="">Túnel (opcional)</option>
            {tunnels.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
            value={config.valveId ?? ''}
            onChange={(event) => handleSelectValve(event.target.value)}
          >
            <option value="">Válvula (opcional)</option>
            {valves.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="Humedad relativa (%)"
            value={config.humedadRelativa ?? ''}
            onChange={(event) => setConfig((prev) => ({ ...prev, humedadRelativa: Number(event.target.value) || undefined }))}
          />
          <Input
            type="number"
            placeholder="Temperatura (°C)"
            value={config.temperatura ?? ''}
            onChange={(event) => setConfig((prev) => ({ ...prev, temperatura: Number(event.target.value) || undefined }))}
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

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Etapa de la planta</p>
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
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold text-gray-900">2) Umbrales</h2>
          <p className="text-sm text-gray-500">Reglas genéricas por métrica para evaluar rangos mínimos y máximos.</p>
        </div>
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
          {thresholdRules.length === 0 ? <p className="text-sm text-gray-500">Aún no agregas reglas.</p> : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold text-gray-900">3) Tabla de muestreo</h2>
          <p className="text-sm text-gray-500">La tabla base se prepara con el cultivo, la etapa y el enfoque seleccionado.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
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
          </div>
          {config.queMuestrear === 'NUTRICION' ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="sistema-produccion">
                Sistema de producción
              </label>
              <select
                id="sistema-produccion"
                className="w-full rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"
                value={config.sistemaProduccion}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, sistemaProduccion: event.target.value as 'HIDROPONICO' | 'SUELO' }))
                }
              >
                <option value="HIDROPONICO">Hidropónico</option>
                <option value="SUELO">Suelo</option>
              </select>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <Badge>{getSamplingSubjectLabel(config.queMuestrear)}</Badge>
          <span>Muestra total: {config.puntosPorSector} × {config.plantasPorPunto} = {muestraTotal} plantas</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB]">
          <div className="grid grid-cols-[1.4fr_1fr_0.9fr] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Variable</span>
            <span>Unidad</span>
            <span>Captura</span>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {samplingTable.map((row) => (
              <div key={row.key} className="grid grid-cols-[1.4fr_1fr_0.9fr] px-4 py-3 text-sm text-gray-700">
                <span>{row.label}</span>
                <span>{row.unit || '—'}</span>
                <span>{row.type === 'text' ? 'Texto' : row.type === 'select' ? 'Selección' : 'Numérico'}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <div className="flex justify-end">
          <Button type="button" onClick={() => void handleIniciarMonitoreo()} disabled={saving}>
            {saving ? 'Guardando…' : 'Iniciar monitoreo'}
          </Button>
        </div>
        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
      </div>
    </div>
  )
}
