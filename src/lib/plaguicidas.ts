import productsUrl from '../data/plaguicidas/products.json?url'
import targetsUrl from '../data/plaguicidas/targets.json?url'
import useCasesUrl from '../data/plaguicidas/use_cases.json?url'

export type PlaguicidaTargetType = 'Plaga' | 'Enfermedad'
export type PlaguicidaMarketFilter = 'MX' | 'USA' | 'Todos'

export type PlaguicidaTarget = {
  target_common_norm: string
  target_type: string
  target_common: string
  target_scientific?: string
  crop: string
  category?: string
}

export type PlaguicidaProduct = {
  product_id: string
  commercial_name: string
  active_ingredient?: string
  concentration?: string
  company?: string
  resistance_class?: string
  chemical_group?: string
}

export type PlaguicidaUseCase = {
  id: string
  product_id?: string
  crop: string
  target_type: PlaguicidaTargetType
  target_common: string
  target_common_norm: string
  commercial_name: string
  active_ingredient: string
  resistance_class?: string
  chemical_group?: string
  safety_interval?: string
  reentry_period?: string
  dose?: string
  market: 'MX' | 'USA'
  interval_between_applications?: string
  max_applications?: string
  registration?: string
  observations?: string
  sheet?: string
  category?: string
}

type PlaguicidasData = {
  products: PlaguicidaProduct[]
  targets: PlaguicidaTarget[]
  useCases: PlaguicidaUseCase[]
}

export type SearchTargetsParams = {
  crop?: string
  targetType?: PlaguicidaTargetType
  q: string
}

export type SearchRecommendationsParams = {
  crop: string
  targetType: PlaguicidaTargetType
  targetCommonNorm: string
  market?: PlaguicidaMarketFilter
  category?: string
  limit?: number
}

const normalizeText = (input: unknown) =>
  String(input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()

const normalizeType = (value: string): PlaguicidaTargetType =>
  normalizeText(value).startsWith('enfermedad') ? 'Enfermedad' : 'Plaga'

const cropIncludes = (cropField: string, selectedCrop: string) =>
  cropField
    .split(',')
    .map((item) => item.trim())
    .includes(selectedCrop)

let dataPromise: Promise<PlaguicidasData> | null = null

export const loadPlaguicidasData = async () => {
  if (!dataPromise) {
    dataPromise = Promise.all([
      fetch(productsUrl).then((response) => response.json() as Promise<PlaguicidaProduct[]>),
      fetch(targetsUrl).then((response) => response.json() as Promise<PlaguicidaTarget[]>),
      fetch(useCasesUrl).then((response) => response.json() as Promise<PlaguicidaUseCase[]>),
    ]).then(([products, targets, useCases]) => ({ products, targets, useCases }))
  }

  return dataPromise
}

export const getPlaguicidasCrops = async () => {
  const { targets } = await loadPlaguicidasData()
  const crops = new Set<string>()

  targets.forEach((target) => {
    target.crop
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => crops.add(item))
  })

  return Array.from(crops).sort((a, b) => a.localeCompare(b, 'es'))
}


export const getPlaguicidasCategories = async ({
  crop,
  targetType,
}: {
  crop: string
  targetType: PlaguicidaTargetType
}) => {
  const { targets } = await loadPlaguicidasData()
  const categories = new Set<string>()

  targets.forEach((target) => {
    if (!cropIncludes(target.crop, crop)) return
    if (normalizeType(target.target_type) !== targetType) return
    if (target.category) categories.add(target.category)
  })

  return Array.from(categories).sort((a, b) => a.localeCompare(b, 'es'))
}
export const searchTargets = async ({ crop, targetType, q }: SearchTargetsParams) => {
  const normalizedSearch = normalizeText(q)
  if (!normalizedSearch) return []

  const { targets } = await loadPlaguicidasData()

  return targets
    .filter((target) => {
      if (crop && !cropIncludes(target.crop, crop)) return false
      if (targetType && normalizeType(target.target_type) !== targetType) return false

      const targetCommon = normalizeText(target.target_common)
      const targetNorm = normalizeText(target.target_common_norm)
      return targetCommon.includes(normalizedSearch) || targetNorm.includes(normalizedSearch)
    })
    .slice(0, 10)
}

export const searchPlaguicidasRecommendations = async ({
  crop,
  targetType,
  targetCommonNorm,
  market = 'Todos',
  category,
  limit = 30,
}: SearchRecommendationsParams) => {
  const { products, targets, useCases } = await loadPlaguicidasData()

  const normalizedTarget = normalizeText(targetCommonNorm)
  const productByName = new Map(products.map((product) => [normalizeText(product.commercial_name), product]))

  const matchingTargetCategories = new Set(
    targets
      .filter((target) => {
        if (!cropIncludes(target.crop, crop)) return false
        if (normalizeType(target.target_type) !== targetType) return false

        return normalizeText(target.target_common_norm || target.target_common) === normalizedTarget
      })
      .map((target) => target.category)
      .filter(Boolean),
  )

  const results = useCases
    .filter((item) => {
      if (item.crop !== crop) return false
      if (item.target_type !== targetType) return false

      const itemTarget = normalizeText(item.target_common_norm || item.target_common)
      if (itemTarget !== normalizedTarget) return false

      if (market !== 'Todos' && item.market !== market) return false

      if (category) {
        const itemCategory = item.category || (matchingTargetCategories.has(category) ? category : '')
        if (itemCategory !== category) return false
      }

      return true
    })
    .map((item) => {
      const matchedProduct = productByName.get(normalizeText(item.commercial_name))
      return {
        ...item,
        product_id: item.product_id || matchedProduct?.product_id || item.id,
        active_ingredient: item.active_ingredient || matchedProduct?.active_ingredient || '—',
        resistance_class: item.resistance_class || matchedProduct?.resistance_class,
        chemical_group: item.chemical_group || matchedProduct?.chemical_group,
        category: item.category || Array.from(matchingTargetCategories)[0],
      }
    })

  return results.slice(0, limit)
}
