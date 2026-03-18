export { SEASON, loadProducts, loadTargets, loadUseCases } from './dataset'
export { normalizeText } from './normalize'
export { parseDoseLabel, resolveCatalogDoseFromUseCase, resolveCatalogProductByName } from './resolver'
export { buildIndex, getRecommendations, searchTargets } from './search'
export type {
  RecommendationsParams,
  SearchIndex,
  SearchTargetsParams,
} from './search'
export type { CatalogDoseResolution, CatalogProductMatch, DoseResolutionStrategy } from './resolver'
export type { Product, Target, UseCase } from './types'
