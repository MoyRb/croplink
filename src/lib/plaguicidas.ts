import useCases from '../data/plaguicidas/use_cases.json'

export type PlaguicidaUseCase = {
  id: string
  crop: string
  target_type: 'Plaga' | 'Enfermedad'
  target_common: string
  target_common_norm: string
  commercial_name: string
  active_ingredient: string
  resistance_class: string
  safety_interval: string
  reentry_period: string
  dose: string
  market: 'MX' | 'USA'
}

export type PlaguicidasSearchParams = {
  crop?: string
  type?: PlaguicidaUseCase['target_type']
  search?: string
  limit?: number
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const dataset = useCases as PlaguicidaUseCase[]

export const getPlaguicidasCrops = () => {
  const crops = Array.from(new Set(dataset.map((item) => item.crop)))
  return crops.sort((a, b) => a.localeCompare(b, 'es'))
}

export const searchPlaguicidas = ({ crop, type, search, limit = 20 }: PlaguicidasSearchParams) => {
  const normalizedSearch = search ? normalizeText(search) : ''

  const results = dataset.filter((item) => {
    if (crop && item.crop !== crop) return false
    if (type && item.target_type !== type) return false

    if (normalizedSearch) {
      const targetNormalized = item.target_common_norm || normalizeText(item.target_common)
      const targetFallback = normalizeText(item.target_common)
      return (
        targetNormalized.includes(normalizedSearch) ||
        targetFallback.includes(normalizedSearch)
      )
    }

    return true
  })

  return results.slice(0, limit)
}
