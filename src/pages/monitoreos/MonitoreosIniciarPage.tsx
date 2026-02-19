import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'

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
    clima?: string
  }
  etapa: string
  muestreo: {
    puntosPorSector: number
    plantasPorPunto: number
    metrosMuestreados: number
  }
  tipo: 'desarrollo' | 'nutricion'
  umbrales: ThresholdRule[]
  startedAt: string
}

const metricDefaults: Record<'desarrollo' | 'nutricion', string[]> = {
  desarrollo: ['longitud_cm', 'diametro_tallo_mm', 'peso_g', 'diametro_fruto_mm'],
  nutricion: ['ph', 'ec_ms_cm', 'brix', 'humedad_pct', 'temperatura_c'],
}

const getPlantKey = (point: number, plant: number) => `p${point}-pl${plant}`

export function MonitoreosIniciarPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [selectedPoint, setSelectedPoint] = useState(1)
  const [selectedPlant, setSelectedPlant] = useState(1)
  const [plantMeasurements, setPlantMeasurements] = useState<Record<string, Record<string, string>>>({})

  const session = useMemo(() => {
    if (!sessionId) return null
    const raw = localStorage.getItem(`monitoreo_session_${sessionId}`)
    if (!raw) return null

    try {
      return JSON.parse(raw) as MonitoringSessionPayload
    } catch {
      return null
    }
  }, [sessionId])

  const points = useMemo(
    () =>
      Array.from({ length: session?.muestreo.puntosPorSector ?? 0 }, (_, index) => ({
        id: index + 1,
        label: `Punto ${index + 1}`,
      })),
    [session],
  )

  const plants = useMemo(
    () =>
      Array.from({ length: session?.muestreo.plantasPorPunto ?? 0 }, (_, index) => ({
        id: index + 1,
        label: `Planta ${index + 1}`,
      })),
    [session],
  )

  const activeMetrics = useMemo(() => {
    if (!session) return []

    const defaults = metricDefaults[session.tipo]
    const thresholdMetrics = session.umbrales.map((rule) => rule.metric.trim()).filter(Boolean)
    const merged = [...thresholdMetrics, ...defaults]

    return Array.from(new Set(merged))
  }, [session])

  if (!sessionId || !session) {
    return (
      <Card className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-900">Sesión no encontrada</h1>
        <p className="text-sm text-gray-600">
          No se encontró la sesión de monitoreo solicitada. Crea una nueva para comenzar.
        </p>
        <div>
          <Button type="button" onClick={() => navigate('/monitoreos/crear')}>
            Volver a crear
          </Button>
        </div>
      </Card>
    )
  }

  const selectedPlantKey = getPlantKey(selectedPoint, selectedPlant)
  const selectedValues = plantMeasurements[selectedPlantKey] ?? {}
  const muestraTotal = session.muestreo.puntosPorSector * session.muestreo.plantasPorPunto

  const setMetricValue = (metric: string, value: string) => {
    setPlantMeasurements((prev) => ({
      ...prev,
      [selectedPlantKey]: {
        ...(prev[selectedPlantKey] ?? {}),
        [metric]: value,
      },
    }))
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Monitoreo en progreso</h1>
        <p className="text-sm text-gray-600">
          Rancho: <span className="font-medium">{session.rancho}</span> · Cultivo:{' '}
          <span className="font-medium">{session.cultivo}</span> · Etapa:{' '}
          <span className="font-medium">{session.etapa}</span>
        </p>
        <p className="text-sm text-gray-600">
          Tipo: <span className="font-medium capitalize">{session.tipo}</span> · Muestra total:{' '}
          <span className="font-medium">{muestraTotal}</span>
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Paso 1: Selecciona punto</h2>
        <div className="flex flex-wrap gap-2">
          {points.map((point) => (
            <Button
              key={point.id}
              type="button"
              variant={selectedPoint === point.id ? 'primary' : 'secondary'}
              onClick={() => {
                setSelectedPoint(point.id)
                setSelectedPlant(1)
              }}
            >
              {point.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Paso 2: Selecciona planta</h2>
        <div className="flex flex-wrap gap-2">
          {plants.map((plant) => (
            <Button
              key={plant.id}
              type="button"
              variant={selectedPlant === plant.id ? 'primary' : 'secondary'}
              onClick={() => setSelectedPlant(plant.id)}
            >
              {plant.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900">Paso 3: Captura de métricas (placeholder)</h2>
        <p className="text-sm text-gray-600">
          Punto {selectedPoint}, planta {selectedPlant}. Estas mediciones se guardan solo en estado local (MVP).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {activeMetrics.map((metric) => (
            <Input
              key={metric}
              placeholder={metric}
              value={selectedValues[metric] ?? ''}
              onChange={(event) => setMetricValue(metric, event.target.value)}
            />
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Link to="/monitoreos/crear" className="text-sm font-semibold text-[#0B6B2A]">
          Editar configuración
        </Link>
      </div>
    </div>
  )
}
