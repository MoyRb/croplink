export type MonitoringType = 'DESARROLLO' | 'NUTRICION'

export type SamplingSubject = 'PLAGAS' | 'ENFERMEDADES' | 'INSECTOS_BENEFICOS' | 'DESARROLLO' | 'NUTRICION'

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
  unit?: string | null
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

export type MetricTemplate = {
  key: string
  label: string
  unit?: string | null
  type?: 'number' | 'text' | 'select'
  options?: string[]
  required?: boolean
}

export type SamplingTableRow = MetricTemplate & {
  category: SamplingSubject
}

export type SessionConfig = {
  fechaMonitoreo: string
  queMuestrear: SamplingSubject
  rancho: string
  ranchoId?: string
  cultivo: string
  cultivoId?: string
  superficie?: number
  sector: string
  sectorId?: string
  tunnel?: string
  tunnelId?: string
  valve?: string
  valveId?: string
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
  tablaMuestreo: SamplingTableRow[]
}

export type MonitoringSession = {
  id: string
  createdAt: string
  updatedAt: string
  status: SessionStatus
  config: SessionConfig
  sectors: MonitoringSector[]
}
