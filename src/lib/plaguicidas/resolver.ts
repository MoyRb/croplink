import { loadProducts, loadUseCases } from './dataset'
import { normalizeText } from './normalize'
import type { Product, UseCase } from './types'

export type DoseResolutionStrategy = 'exact_value' | 'range_lower_bound' | 'unresolved'

export type CatalogDoseResolution = {
  source: 'assistant' | 'json'
  doseLabel: string
  dosePerHa: number | null
  doseUnit: string | null
  intervalo: string | null
  reentrada: string | null
  strategy: DoseResolutionStrategy
}

export type CatalogProductMatch = CatalogDoseResolution & {
  commercialName: string
  activeIngredient: string
  productId: string | null
}

const parseSpanishNumber = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim()
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const cleanText = (value: string | null | undefined): string | null => {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : null
}

export const parseDoseLabel = (
  doseLabel: string | null | undefined,
): Pick<CatalogDoseResolution, 'doseLabel' | 'dosePerHa' | 'doseUnit' | 'strategy'> => {
  const normalizedLabel = cleanText(doseLabel) ?? ''
  if (!normalizedLabel) {
    return {
      doseLabel: '',
      dosePerHa: null,
      doseUnit: null,
      strategy: 'unresolved',
    }
  }

  const match = normalizedLabel.match(
    /(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?(?:\s*([^\d]+.*))?$/u,
  )

  if (!match) {
    return {
      doseLabel: normalizedLabel,
      dosePerHa: null,
      doseUnit: null,
      strategy: 'unresolved',
    }
  }

  const firstValue = parseSpanishNumber(match[1] ?? '')
  const secondValue = parseSpanishNumber(match[2] ?? '')
  const rawUnit = cleanText(match[3] ?? null)

  return {
    doseLabel: normalizedLabel,
    dosePerHa: firstValue,
    doseUnit: rawUnit,
    strategy: secondValue !== null ? 'range_lower_bound' : firstValue !== null ? 'exact_value' : 'unresolved',
  }
}

export const resolveCatalogDoseFromUseCase = (useCase: UseCase): CatalogProductMatch => {
  const parsedDose = parseDoseLabel(useCase.dose)

  return {
    source: 'assistant',
    commercialName: useCase.commercial_name,
    activeIngredient: useCase.active_ingredient,
    productId: useCase.product_id,
    doseLabel: parsedDose.doseLabel,
    dosePerHa: parsedDose.dosePerHa,
    doseUnit: parsedDose.doseUnit,
    intervalo: cleanText(useCase.interval_between_applications),
    reentrada: cleanText(useCase.reentry_period),
    strategy: parsedDose.strategy,
  }
}

const buildCatalogProductMatch = (
  commercialName: string,
  product: Product | null,
  candidates: UseCase[],
): CatalogProductMatch | null => {
  if (candidates.length === 0 && !product) return null

  const uniqueSuggestions = new Map<string, CatalogProductMatch>()
  for (const candidate of candidates) {
    const resolved = resolveCatalogDoseFromUseCase(candidate)
    const key = JSON.stringify({
      dosePerHa: resolved.dosePerHa,
      doseUnit: resolved.doseUnit,
      intervalo: resolved.intervalo,
      reentrada: resolved.reentrada,
      doseLabel: resolved.doseLabel,
      strategy: resolved.strategy,
    })
    if (!uniqueSuggestions.has(key)) {
      uniqueSuggestions.set(key, {
        ...resolved,
        source: 'json',
      })
    }
  }

  const resolvedSuggestion = uniqueSuggestions.size === 1 ? Array.from(uniqueSuggestions.values())[0] : null

  return {
    source: 'json',
    commercialName,
    activeIngredient: product?.active_ingredient ?? resolvedSuggestion?.activeIngredient ?? '',
    productId: product?.product_id ?? resolvedSuggestion?.productId ?? null,
    doseLabel: resolvedSuggestion?.doseLabel ?? '',
    dosePerHa: resolvedSuggestion?.dosePerHa ?? null,
    doseUnit: resolvedSuggestion?.doseUnit ?? null,
    intervalo: resolvedSuggestion?.intervalo ?? null,
    reentrada: resolvedSuggestion?.reentrada ?? null,
    strategy: resolvedSuggestion?.strategy ?? 'unresolved',
  }
}

export const resolveCatalogProductByName = async (commercialName: string): Promise<CatalogProductMatch | null> => {
  const normalizedName = normalizeText(commercialName)
  if (!normalizedName) return null

  const [products, useCases] = await Promise.all([loadProducts(), loadUseCases()])
  const matchedProduct =
    products.find((item) => normalizeText(item.commercial_name) === normalizedName) ?? null
  const matchedUseCases = useCases.filter((item) => normalizeText(item.commercial_name) === normalizedName)

  return buildCatalogProductMatch(commercialName.trim(), matchedProduct, matchedUseCases)
}
