export { SEASON, loadProducts, loadTargets, loadUseCases } from './dataset'
export { normalizeText } from './normalize'
export { buildIndex, getRecommendations, searchTargets } from './search'
export type {
  RecommendationsParams,
  SearchIndex,
  SearchTargetsParams,
} from './search'
export type { Product, Target, UseCase } from './types'
