import type { Product, Target, UseCase } from './types'

export const SEASON = '2025-2026'

const DATASET_BASE_PATH = `/data/plaguicidas/${SEASON}`

type DatasetType = 'use_cases' | 'products' | 'targets'

let useCasesPromise: Promise<UseCase[]> | null = null
let productsPromise: Promise<Product[]> | null = null
let targetsPromise: Promise<Target[]> | null = null

const loadDataset = async <T>(datasetType: DatasetType): Promise<T[]> => {
  const url = `${DATASET_BASE_PATH}/${datasetType}.json`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al cargar ${url}`)
    }

    const data = (await response.json()) as unknown

    if (!Array.isArray(data)) {
      throw new Error(`Formato inválido en ${url}: se esperaba un arreglo JSON.`)
    }

    return data as T[]
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const friendlyMessage = `No se pudo cargar ${datasetType}.json (${message}).`
    console.error(friendlyMessage, error)
    throw new Error(friendlyMessage)
  }
}

export const loadUseCases = (): Promise<UseCase[]> => {
  if (!useCasesPromise) {
    useCasesPromise = loadDataset<UseCase>('use_cases')
  }

  return useCasesPromise
}

export const loadProducts = (): Promise<Product[]> => {
  if (!productsPromise) {
    productsPromise = loadDataset<Product>('products')
  }

  return productsPromise
}

export const loadTargets = (): Promise<Target[]> => {
  if (!targetsPromise) {
    targetsPromise = loadDataset<Target>('targets')
  }

  return targetsPromise
}
