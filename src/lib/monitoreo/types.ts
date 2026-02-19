export type MonitoringType = 'DESARROLLO' | 'NUTRICION'

export type SessionStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'

export type EtapaFenologica = 'vegetativa' | 'floracion' | 'fructificacion' | 'cosecha' | 'poda'

export type CondicionMeteorologica = 'Soleado' | 'Nublado' | 'Lluvia' | 'Viento' | 'Otro'

export type SistemaProduccion = 'HIDROPONICO' | 'SUELO'

export type HallazgoTipo = 'Plaga' | 'Enfermedad' | 'Insectos benéficos' | 'Desarrollo' | 'Nutrición'

export type HallazgoSeveridad = 'baja' | 'media' | 'alta'

export type ThresholdRule = {
  id: string
  metric: string
  min?: number
  max?: number
}

export type Hallazgo = {
  id: string
  tipo: HallazgoTipo
  descripcion: string
  pc?: number
  severidad?: HallazgoSeveridad
  fotos: string[]
}

export type PlantCapture = {
  id: string
  name: string
  metrics: Record<string, number | string>
  hallazgos: Hallazgo[]
}

export type MonitoringPoint = {
  id: string
  name: string
  metrosMuestreados: number
  conteoEnMetros: number
  plantas: PlantCapture[]
}

export type MonitoringSector = {
  id: string
  name: string
  tunnel?: string
  valve?: string
  points: MonitoringPoint[]
}

export type SessionConfig = {
  rancho: string
  cultivo: string
  superficie?: number
  sector: string
  tunnel?: string
  valve?: string
  humedadRelativa?: number
  temperatura?: number
  condicionMeteorologica: CondicionMeteorologica
  etapaFenologica: EtapaFenologica
  puntosPorSector: number
  plantasPorPunto: number
  metrosMuestreados: number
  tipoMonitoreo: MonitoringType
  sistemaProduccion?: SistemaProduccion
  umbrales: ThresholdRule[]
}

export type MonitoringSession = {
  id: string
  createdAt: string
  updatedAt: string
  status: SessionStatus
  config: SessionConfig
  sectors: MonitoringSector[]
}

export type MetricTemplate = {
  key: string
  label: string
  type?: 'number' | 'text'
  required?: boolean
}
