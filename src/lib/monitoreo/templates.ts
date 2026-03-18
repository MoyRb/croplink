import type {
  EtapaFenologica,
  MetricTemplate,
  SamplingSubject,
  SamplingTableRow,
  SessionConfig,
  SistemaProduccion,
} from './types'

export const ETAPAS_FENOLOGICAS: { value: EtapaFenologica; label: string }[] = [
  { value: 'vegetativa', label: 'Vegetativa' },
  { value: 'floracion', label: 'Floración' },
  { value: 'fructificacion', label: 'Fructificación' },
  { value: 'cosecha', label: 'Cosecha' },
  { value: 'poda', label: 'Poda' },
]

export const METEO_OPTIONS = ['Soleado', 'Nublado', 'Lluvia', 'Viento', 'Otro'] as const

export const HALLAZGO_OPTIONS = [
  'Plaga',
  'Enfermedad',
  'Insectos benéficos',
  'Desarrollo',
  'Nutrición',
] as const

export const WHAT_TO_SAMPLE_OPTIONS: { value: SamplingSubject; label: string; description: string }[] = [
  { value: 'PLAGAS', label: 'Plagas', description: 'Presencia, incidencia y presión de plaga.' },
  { value: 'ENFERMEDADES', label: 'Enfermedades', description: 'Incidencia, severidad y tejido afectado.' },
  { value: 'INSECTOS_BENEFICOS', label: 'Insectos benéficos', description: 'Población útil y balance biológico.' },
  { value: 'DESARROLLO', label: 'Desarrollo', description: 'Crecimiento vegetativo o productivo.' },
  { value: 'NUTRICION', label: 'Nutrición', description: 'Variables nutricionales y de solución/suelo.' },
]

const subjectToMonitoringType = (subject: SamplingSubject): SessionConfig['tipoMonitoreo'] =>
  subject === 'NUTRICION' ? 'NUTRICION' : 'DESARROLLO'

export const getMonitoringTypeFromSubject = subjectToMonitoringType

const makeMetric = (
  category: SamplingSubject,
  key: string,
  label: string,
  options?: Partial<MetricTemplate>,
): SamplingTableRow => ({
  category,
  key,
  label,
  unit: options?.unit ?? null,
  type: options?.type,
  options: options?.options,
  required: options?.required,
})

type CropFamily = 'FRAMBUESA' | 'ZARZAMORA' | 'FRESA' | 'ARANDANO' | 'OTRO'

const normalizeCropFamily = (cultivo: string): CropFamily => {
  const normalized = cultivo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()

  if (normalized.includes('FRAMBUESA')) return 'FRAMBUESA'
  if (normalized.includes('ZARZAMORA')) return 'ZARZAMORA'
  if (normalized.includes('FRESA')) return 'FRESA'
  if (normalized.includes('ARANDANO')) return 'ARANDANO'
  return 'OTRO'
}

const COMMON_BY_SUBJECT: Record<SamplingSubject, SamplingTableRow[]> = {
  PLAGAS: [
    makeMetric('PLAGAS', 'individuos_encontrados', 'Individuos encontrados', { unit: 'individuos', required: true }),
    makeMetric('PLAGAS', 'plantas_afectadas_pct', 'Plantas afectadas', { unit: '%', required: true }),
    makeMetric('PLAGAS', 'hojas_afectadas_pct', 'Hojas afectadas', { unit: '%', required: true }),
    makeMetric('PLAGAS', 'presion_plaga', 'Presión de plaga', {
      type: 'select',
      options: ['Baja', 'Media', 'Alta'],
      required: true,
    }),
  ],
  ENFERMEDADES: [
    makeMetric('ENFERMEDADES', 'plantas_afectadas_pct', 'Plantas afectadas', { unit: '%', required: true }),
    makeMetric('ENFERMEDADES', 'hojas_afectadas_pct', 'Hojas afectadas', { unit: '%', required: true }),
    makeMetric('ENFERMEDADES', 'severidad_pct', 'Severidad', { unit: '%', required: true }),
    makeMetric('ENFERMEDADES', 'tejido_afectado', 'Tejido afectado', { type: 'text' }),
  ],
  INSECTOS_BENEFICOS: [
    makeMetric('INSECTOS_BENEFICOS', 'individuos_beneficos', 'Individuos benéficos encontrados', {
      unit: 'individuos',
      required: true,
    }),
    makeMetric('INSECTOS_BENEFICOS', 'relacion_benefico_plaga', 'Relación benéfico/plaga', {
      unit: 'ratio',
    }),
    makeMetric('INSECTOS_BENEFICOS', 'actividad_benefica', 'Actividad observada', {
      type: 'select',
      options: ['Baja', 'Media', 'Alta'],
    }),
  ],
  DESARROLLO: [],
  NUTRICION: [],
}

const DESARROLLO_BY_STAGE: Record<EtapaFenologica, SamplingTableRow[]> = {
  vegetativa: [
    makeMetric('DESARROLLO', 'longitud_cm', 'Longitud de brote', { unit: 'cm', required: true }),
    makeMetric('DESARROLLO', 'diametro_tallo_mm', 'Diámetro de tallo', { unit: 'mm', required: true }),
    makeMetric('DESARROLLO', 'brotes_activos', 'Brotes activos', { unit: 'brotes' }),
  ],
  floracion: [
    makeMetric('DESARROLLO', 'longitud_cm', 'Longitud de brote', { unit: 'cm', required: true }),
    makeMetric('DESARROLLO', 'racimos_florales', 'Racimos florales', { unit: 'racimos', required: true }),
    makeMetric('DESARROLLO', 'floracion_pct', 'Floración', { unit: '%', required: true }),
  ],
  fructificacion: [
    makeMetric('DESARROLLO', 'frutos_cuajados', 'Frutos cuajados', { unit: 'frutos', required: true }),
    makeMetric('DESARROLLO', 'peso_fruto_g', 'Peso de fruto', { unit: 'g', required: true }),
    makeMetric('DESARROLLO', 'diametro_fruto_cm', 'Diámetro de fruto', { unit: 'cm', required: true }),
  ],
  cosecha: [
    makeMetric('DESARROLLO', 'frutos_cosechables', 'Frutos cosechables', { unit: 'frutos', required: true }),
    makeMetric('DESARROLLO', 'peso_fruto_g', 'Peso de fruto', { unit: 'g', required: true }),
    makeMetric('DESARROLLO', 'solidos_solubles_brix', 'Sólidos solubles', { unit: '°Bx' }),
  ],
  poda: [
    makeMetric('DESARROLLO', 'cortes_realizados', 'Cortes realizados', { unit: 'cortes', required: true }),
    makeMetric('DESARROLLO', 'longitud_cm', 'Longitud de brote remanente', { unit: 'cm' }),
    makeMetric('DESARROLLO', 'notas_poda', 'Notas de poda', { type: 'text' }),
  ],
}

const NUTRICION_BASE: SamplingTableRow[] = [
  makeMetric('NUTRICION', 'brix', 'Brix', { unit: '°Bx', required: true }),
  makeMetric('NUTRICION', 'ph', 'pH', { required: true }),
]

const NUTRICION_BY_SISTEMA: Record<SistemaProduccion, SamplingTableRow[]> = {
  HIDROPONICO: [
    makeMetric('NUTRICION', 'ec', 'Conductividad eléctrica', { unit: 'mS/cm', required: true }),
    makeMetric('NUTRICION', 'ppm', 'PPM', { unit: 'ppm', required: true }),
    makeMetric('NUTRICION', 'temperatura_solucion', 'Temperatura de solución', { unit: '°C' }),
  ],
  SUELO: [
    makeMetric('NUTRICION', 'ce_suelo', 'CE de suelo', { unit: 'dS/m', required: true }),
    makeMetric('NUTRICION', 'humedad_suelo_pct', 'Humedad de suelo', { unit: '%', required: true }),
    makeMetric('NUTRICION', 'temperatura_suelo', 'Temperatura de suelo', { unit: '°C' }),
  ],
}

const CROP_ADDITIONS: Partial<Record<CropFamily, Partial<Record<SamplingSubject, SamplingTableRow[]>>>> = {
  FRAMBUESA: {
    DESARROLLO: [makeMetric('DESARROLLO', 'canas_productivas', 'Cañas productivas', { unit: 'cañas' })],
    NUTRICION: [makeMetric('NUTRICION', 'firmeza_fruto', 'Firmeza de fruto', { unit: 'g/mm' })],
  },
  ZARZAMORA: {
    DESARROLLO: [makeMetric('DESARROLLO', 'longitud_lateral_cm', 'Longitud de lateral', { unit: 'cm' })],
    PLAGAS: [makeMetric('PLAGAS', 'brotes_danados_pct', 'Brotes dañados', { unit: '%' })],
  },
  FRESA: {
    DESARROLLO: [makeMetric('DESARROLLO', 'diametro_corona_mm', 'Diámetro de corona', { unit: 'mm' })],
    NUTRICION: [makeMetric('NUTRICION', 'clorosis_pct', 'Clorosis observada', { unit: '%' })],
  },
  ARANDANO: {
    DESARROLLO: [makeMetric('DESARROLLO', 'brotacion_pct', 'Brotación', { unit: '%' })],
    ENFERMEDADES: [makeMetric('ENFERMEDADES', 'frutos_afectados_pct', 'Frutos afectados', { unit: '%' })],
  },
}

export const buildSamplingTable = (config: Pick<SessionConfig, 'cultivo' | 'etapaFenologica' | 'queMuestrear' | 'sistemaProduccion'>): SamplingTableRow[] => {
  const cropFamily = normalizeCropFamily(config.cultivo)
  const cropExtras = CROP_ADDITIONS[cropFamily]?.[config.queMuestrear] ?? []

  if (config.queMuestrear === 'DESARROLLO') {
    return [...DESARROLLO_BY_STAGE[config.etapaFenologica], ...cropExtras]
  }

  if (config.queMuestrear === 'NUTRICION') {
    const sistema = config.sistemaProduccion ?? 'HIDROPONICO'
    return [...NUTRICION_BASE, ...NUTRICION_BY_SISTEMA[sistema], ...cropExtras]
  }

  return [...COMMON_BY_SUBJECT[config.queMuestrear], ...cropExtras]
}

export const getSamplingMetricTemplates = (config: Pick<SessionConfig, 'cultivo' | 'etapaFenologica' | 'queMuestrear' | 'sistemaProduccion' | 'tablaMuestreo'>): MetricTemplate[] => {
  const rows = config.tablaMuestreo.length > 0 ? config.tablaMuestreo : buildSamplingTable(config)
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    unit: row.unit,
    type: row.type,
    options: row.options,
    required: row.required,
  }))
}

export const getHallazgoTypeFromSubject = (subject: SamplingSubject) => {
  if (subject === 'PLAGAS') return 'Plaga'
  if (subject === 'ENFERMEDADES') return 'Enfermedad'
  if (subject === 'INSECTOS_BENEFICOS') return 'Insectos benéficos'
  if (subject === 'NUTRICION') return 'Nutrición'
  return 'Desarrollo'
}

export const getSamplingSubjectLabel = (subject: SamplingSubject) =>
  WHAT_TO_SAMPLE_OPTIONS.find((option) => option.value === subject)?.label ?? subject
