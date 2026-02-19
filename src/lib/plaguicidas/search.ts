import { normalizeText } from './normalize'
import type { Target, UseCase } from './types'

export type SearchIndex = {
  useCases: UseCase[]
  targets: Target[]
}

export type SearchTargetsParams = {
  crop?: string
  targetType?: string
  q?: string
}

export type RecommendationsParams = {
  crop: string
  targetType: string
  targetCommonNorm: string
  market?: string
  category?: string
}

let activeIndex: SearchIndex | null = null

const hasValue = (value: unknown): number => (normalizeText(value) ? 0 : 1)

const splitCrops = (cropField: string): string[] =>
  cropField
    .split(',')
    .map((crop) => normalizeText(crop))
    .filter(Boolean)

const matchesCrop = (cropField: string, selectedCrop?: string): boolean => {
  if (!selectedCrop) return true
  const normalizedCrop = normalizeText(selectedCrop)
  return splitCrops(cropField).includes(normalizedCrop)
}

const isAllFilter = (value?: string): boolean => {
  const normalized = normalizeText(value)
  return !normalized || normalized === 'todos' || normalized === 'todas'
}

const sortRecommendations = (a: UseCase, b: UseCase): number => {
  const byResistanceClass = hasValue(a.resistance_class) - hasValue(b.resistance_class)
  if (byResistanceClass !== 0) return byResistanceClass

  const bySafetyInterval = hasValue(a.safety_interval) - hasValue(b.safety_interval)
  if (bySafetyInterval !== 0) return bySafetyInterval

  return normalizeText(a.commercial_name).localeCompare(normalizeText(b.commercial_name), 'es')
}

export const buildIndex = (useCases: UseCase[], targets: Target[]): SearchIndex => {
  const index: SearchIndex = { useCases, targets }
  activeIndex = index
  return index
}

const resolveIndex = (index?: SearchIndex): SearchIndex => {
  const resolved = index ?? activeIndex
  if (!resolved) {
    throw new Error('Índice no inicializado. Ejecuta buildIndex(useCases, targets) primero.')
  }

  return resolved
}

export const searchTargets = (params: SearchTargetsParams, index?: SearchIndex): Target[] => {
  const resolvedIndex = resolveIndex(index)
  const query = normalizeText(params.q ?? '')
  const normalizedType = normalizeText(params.targetType)
  const unique = new Map<string, Target>()

  for (const candidate of resolvedIndex.targets) {
    if (!matchesCrop(candidate.crop, params.crop)) continue
    if (normalizedType && normalizeText(candidate.target_type) !== normalizedType) continue

    const norm = normalizeText(candidate.target_common_norm)
    const common = normalizeText(candidate.target_common)
    if (query && !norm.includes(query) && !common.includes(query)) {
      continue
    }

    if (!unique.has(norm)) {
      unique.set(norm, candidate)
    }

    if (unique.size >= 10) {
      break
    }
  }

  return Array.from(unique.values())
}

export const getRecommendations = (params: RecommendationsParams, index?: SearchIndex): UseCase[] => {
  const resolvedIndex = resolveIndex(index)
  const normalizedTargetType = normalizeText(params.targetType)
  const normalizedTargetCommonNorm = normalizeText(params.targetCommonNorm)
  const normalizedMarket = normalizeText(params.market)
  const normalizedCategory = normalizeText(params.category)

  const recommendations = resolvedIndex.useCases.filter((useCase) => {
    if (!matchesCrop(useCase.crop, params.crop)) return false
    if (normalizeText(useCase.target_type) !== normalizedTargetType) return false
    if (normalizeText(useCase.target_common_norm) !== normalizedTargetCommonNorm) return false

    if (!isAllFilter(params.market) && normalizeText(useCase.market) !== normalizedMarket) return false
    if (!isAllFilter(params.category) && normalizeText(useCase.category) !== normalizedCategory) return false

    return true
  })

  return recommendations.sort(sortRecommendations).slice(0, 50)
}
