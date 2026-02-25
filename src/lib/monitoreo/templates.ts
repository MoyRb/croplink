import type { EtapaFenologica, MetricTemplate, SistemaProduccion } from './types'

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

export const DESARROLLO_TEMPLATES: Record<EtapaFenologica, MetricTemplate[]> = {
  vegetativa: [
    { key: 'longitud_cm', label: 'Longitud (cm)', required: true },
    { key: 'diametro_tallo_mm', label: 'Diámetro tallo (mm)', required: true },
  ],
  floracion: [
    { key: 'longitud_cm', label: 'Longitud (cm)', required: true },
    { key: 'diametro_tallo_mm', label: 'Diámetro tallo (mm)', required: true },
  ],
  fructificacion: [
    { key: 'peso_fruto_g', label: 'Peso fruto (g)', required: true },
    { key: 'diametro_fruto_cm', label: 'Diámetro fruto (cm)', required: true },
  ],
  cosecha: [
    { key: 'peso_fruto_g', label: 'Peso fruto (g)', required: true },
    { key: 'diametro_fruto_cm', label: 'Diámetro fruto (cm)', required: true },
  ],
  poda: [
    { key: 'longitud_cm', label: 'Longitud (cm)', required: true },
    { key: 'notas', label: 'Notas', type: 'text' },
  ],
}


const ROOT_METRICS: MetricTemplate[] = [
  { key: 'raiz_longitud_cm', label: 'Longitud de raíz (cm)', required: true },
  { key: 'raiz_diametro_mm', label: 'Diámetro de raíz (mm)' },
  {
    key: 'raiz_color',
    label: 'Color de raíz',
    type: 'select',
    options: ['Blanco', 'Crema', 'Café', 'Negro'],
  },
  {
    key: 'raiz_vigor',
    label: 'Vigor de raíz',
    type: 'select',
    options: ['Bajo', 'Medio', 'Alto'],
  },
]

export const shouldShowRootMetrics = (
  tipoMonitoreo: 'DESARROLLO' | 'NUTRICION',
  etapaFenologica: EtapaFenologica,
) => tipoMonitoreo === 'DESARROLLO' && etapaFenologica !== 'cosecha'

export const getRootMetricsTemplates = (
  tipoMonitoreo: 'DESARROLLO' | 'NUTRICION',
  etapaFenologica: EtapaFenologica,
): MetricTemplate[] => (shouldShowRootMetrics(tipoMonitoreo, etapaFenologica) ? ROOT_METRICS : [])

export const NUTRICION_BASE: MetricTemplate[] = [{ key: 'brix', label: 'Brix', required: true }]

export const NUTRICION_BY_SISTEMA: Record<SistemaProduccion, MetricTemplate[]> = {
  HIDROPONICO: [
    { key: 'ph_solucion', label: 'pH solución', required: true },
    { key: 'ec', label: 'EC', required: true },
    { key: 'ppm', label: 'PPM', required: true },
    { key: 'notas', label: 'Notas', type: 'text' },
  ],
  SUELO: [
    { key: 'ph_suelo', label: 'pH suelo', required: true },
    { key: 'ce_suelo', label: 'CE suelo', required: true },
    { key: 'humedad_suelo', label: 'Humedad suelo (%)', required: true },
    { key: 'notas', label: 'Notas', type: 'text' },
  ],
}
