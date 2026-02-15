import { normalizeText } from './normalize'
import type { Target, UseCase } from './types'

export type SearchIndex = {
  useCases: UseCase[]
  targets: Target[]
  crops: Map<string, UseCase[]>
  targetTypes: Map<string, UseCase[]>
  targetCommonNorms: Map<string, UseCase[]>
  targetsByCrop: Map<string, Target[]>
  targetsByType: Map<string, Target[]>
  targetsByNorm: Map<string, Target[]>
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

const getMapArray = <T>(map: Map<string, T[]>, key: string): T[] => map.get(key) ?? []

const pushMapValue = <T>(map: Map<string, T[]>, key: string, value: T): void => {
  const current = map.get(key)
  if (current) {
    current.push(value)
    return
  }

  map.set(key, [value])
}

const hasValue = (value: string): number => (value.trim() ? 0 : 1)

const sortRecommendations = (a: UseCase, b: UseCase): number => {
  const byResistanceClass = hasValue(a.resistance_class) - hasValue(b.resistance_class)
  if (byResistanceClass !== 0) return byResistanceClass

  const bySafetyInterval = hasValue(a.safety_interval) - hasValue(b.safety_interval)
  if (bySafetyInterval !== 0) return bySafetyInterval

  return a.commercial_name.localeCompare(b.commercial_name, 'es')
}

export const buildIndex = (useCases: UseCase[], targets: Target[]): SearchIndex => {
  const index: SearchIndex = {
    useCases,
    targets,
    crops: new Map<string, UseCase[]>(),
    targetTypes: new Map<string, UseCase[]>(),
    targetCommonNorms: new Map<string, UseCase[]>(),
    targetsByCrop: new Map<string, Target[]>(),
    targetsByType: new Map<string, Target[]>(),
    targetsByNorm: new Map<string, Target[]>(),
  }

  for (const useCase of useCases) {
    pushMapValue(index.crops, normalizeText(useCase.crop), useCase)
    pushMapValue(index.targetTypes, normalizeText(useCase.target_type), useCase)
    pushMapValue(index.targetCommonNorms, normalizeText(useCase.target_common_norm), useCase)
  }

  for (const target of targets) {
    pushMapValue(index.targetsByCrop, normalizeText(target.crop), target)
    pushMapValue(index.targetsByType, normalizeText(target.target_type), target)
    pushMapValue(index.targetsByNorm, normalizeText(target.target_common_norm), target)
  }

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

const filterTargets = (params: SearchTargetsParams, index: SearchIndex): Target[] => {
  let candidates = index.targets

  if (params.crop) {
    candidates = getMapArray(index.targetsByCrop, normalizeText(params.crop))
  }

  if (params.targetType) {
    const byType = getMapArray(index.targetsByType, normalizeText(params.targetType))
    const byTypeSet = new Set(byType)
    candidates = candidates.filter((item) => byTypeSet.has(item))
  }

  return candidates
}

export const searchTargets = (params: SearchTargetsParams, index?: SearchIndex): Target[] => {
  const resolvedIndex = resolveIndex(index)
  const candidates = filterTargets(params, resolvedIndex)
  const query = normalizeText(params.q ?? '')
  const unique = new Map<string, Target>()

  for (const candidate of candidates) {
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

  const byCrop = getMapArray(resolvedIndex.crops, normalizeText(params.crop))
  const byType = new Set(getMapArray(resolvedIndex.targetTypes, normalizeText(params.targetType)))
  const byNorm = new Set(
    getMapArray(resolvedIndex.targetCommonNorms, normalizeText(params.targetCommonNorm)),
  )

  const recommendations = byCrop.filter((useCase) => {
    if (!byType.has(useCase) || !byNorm.has(useCase)) {
      return false
    }

    if (params.market && useCase.market !== params.market) {
      return false
    }

    if (params.category && useCase.category !== params.category) {
      return false
    }

    return true
  })

  return recommendations.sort(sortRecommendations).slice(0, 50)
}
