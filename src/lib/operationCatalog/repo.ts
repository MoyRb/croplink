import { nanoid } from 'nanoid'

import type {
  Crop,
  Operation,
  OperationCatalog,
  Ranch,
  RanchCropSeason,
  Season,
  Sector,
  Tunnel,
  Valve,
} from './types'

export const OPERATION_CATALOG_STORAGE_KEY = 'croplink_operation_catalog_v2'
export const OPERATION_CATALOG_UPDATED_EVENT = 'croplink:operation-catalog-updated'

const nowIso = () => new Date().toISOString()
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const seedCatalog: OperationCatalog = {
  operations: [
    { id: 'op_santa_elena', name: 'Operación Santa Elena', description: 'Norte del valle', createdAt: '2024-01-10T10:00:00.000Z' },
    { id: 'op_las_palmas', name: 'Operación Las Palmas', description: 'Operación multi-rancho', createdAt: '2024-02-12T10:00:00.000Z' },
  ],
  ranches: [
    { id: 'ranch_olivos', operationId: 'op_santa_elena', name: 'Rancho Los Olivos', location: 'Caborca, Sonora', createdAt: '2024-01-15T10:00:00.000Z' },
    { id: 'ranch_esperanza', operationId: 'op_las_palmas', name: 'Rancho La Esperanza', location: 'Hermosillo, Sonora', createdAt: '2024-02-15T10:00:00.000Z' },
  ],
  sectors: [
    { id: 'sec_ol_1', ranchId: 'ranch_olivos', name: 'Sector A', code: 'A' },
    { id: 'sec_ol_2', ranchId: 'ranch_olivos', name: 'Sector B', code: 'B' },
    { id: 'sec_es_1', ranchId: 'ranch_esperanza', name: 'Sector Norte', code: 'NTE' },
  ],
  tunnels: [
    { id: 'tun_ol_a1', sectorId: 'sec_ol_1', name: 'Túnel 1', code: 'A1' },
    { id: 'tun_ol_a2', sectorId: 'sec_ol_1', name: 'Túnel 2', code: 'A2' },
  ],
  valves: [
    { id: 'val_ol_a1_1', sectorId: 'sec_ol_1', tunnelId: 'tun_ol_a1', name: 'Válvula 1', code: 'V1' },
    { id: 'val_ol_a1_2', sectorId: 'sec_ol_1', tunnelId: 'tun_ol_a1', name: 'Válvula 2', code: 'V2' },
    { id: 'val_sec_b_1', sectorId: 'sec_ol_2', name: 'Válvula cabecera B', code: 'VB-1' },
  ],
  crops: [
    { id: 'crop_tomate', name: 'Tomate Roma' },
    { id: 'crop_pepino', name: 'Pepino' },
  ],
  seasons: [
    { id: 'season_2425', name: '2024-2025', startDate: '2024-08-01', endDate: '2025-03-31' },
    { id: 'season_2526', name: '2025-2026', startDate: '2025-08-01', endDate: '2026-03-31' },
  ],
  ranchCropSeasons: [
    { id: 'rcs_1', ranchId: 'ranch_olivos', cropId: 'crop_tomate', seasonId: 'season_2425' },
    { id: 'rcs_2', ranchId: 'ranch_esperanza', cropId: 'crop_pepino', seasonId: 'season_2425' },
  ],
}

const cloneSeed = () => JSON.parse(JSON.stringify(seedCatalog)) as OperationCatalog

const isCatalogShape = (value: unknown): value is OperationCatalog => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    Array.isArray(candidate.operations) &&
    Array.isArray(candidate.ranches) &&
    Array.isArray(candidate.sectors) &&
    Array.isArray(candidate.tunnels) &&
    Array.isArray(candidate.valves) &&
    Array.isArray(candidate.crops) &&
    Array.isArray(candidate.seasons) &&
    Array.isArray(candidate.ranchCropSeasons)
  )
}

export const saveCatalog = (catalog: OperationCatalog) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(OPERATION_CATALOG_STORAGE_KEY, JSON.stringify(catalog))
  window.dispatchEvent(new CustomEvent(OPERATION_CATALOG_UPDATED_EVENT))
}

export const getCatalog = (): OperationCatalog => {
  if (typeof window === 'undefined') return cloneSeed()
  const raw = window.localStorage.getItem(OPERATION_CATALOG_STORAGE_KEY)
  if (!raw) {
    const seed = cloneSeed()
    saveCatalog(seed)
    return seed
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isCatalogShape(parsed)) throw new Error('invalid')
    return parsed
  } catch {
    const seed = cloneSeed()
    saveCatalog(seed)
    return seed
  }
}

const withMutation = (mutator: (catalog: OperationCatalog) => OperationCatalog) => {
  const next = mutator(getCatalog())
  saveCatalog(next)
  return next
}

export const upsertOperation = (payload: Omit<Operation, 'createdAt'> & { createdAt?: string }) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!name) throw new Error('El nombre de la operación es requerido.')
    if (catalog.operations.some((item) => item.id !== payload.id && sameText(item.name, name))) {
      throw new Error('Ya existe una operación con ese nombre.')
    }
    const existing = catalog.operations.find((item) => item.id === payload.id)
    const nextItem: Operation = {
      id: payload.id || nanoid(),
      name,
      description: payload.description?.trim() || undefined,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
    }

    return {
      ...catalog,
      operations: existing ? catalog.operations.map((item) => (item.id === existing.id ? nextItem : item)) : [...catalog.operations, nextItem],
    }
  })

export const deleteOperation = (operationId: string) =>
  withMutation((catalog) => {
    if (catalog.ranches.some((item) => item.operationId === operationId)) {
      throw new Error('No puedes eliminar la operación mientras tenga ranchos.')
    }
    return { ...catalog, operations: catalog.operations.filter((item) => item.id !== operationId) }
  })

export const upsertRanch = (payload: Omit<Ranch, 'createdAt'> & { createdAt?: string }) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!payload.operationId) throw new Error('Selecciona una operación.')
    if (!name) throw new Error('El nombre del rancho es requerido.')
    if (catalog.ranches.some((item) => item.id !== payload.id && item.operationId === payload.operationId && sameText(item.name, name))) {
      throw new Error('Ya existe un rancho con ese nombre en la operación seleccionada.')
    }
    const existing = catalog.ranches.find((item) => item.id === payload.id)
    const nextItem: Ranch = {
      id: payload.id || nanoid(),
      operationId: payload.operationId,
      name,
      description: payload.description?.trim() || undefined,
      location: payload.location?.trim() || undefined,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
    }
    return {
      ...catalog,
      ranches: existing ? catalog.ranches.map((item) => (item.id === existing.id ? nextItem : item)) : [...catalog.ranches, nextItem],
    }
  })

export const deleteRanch = (ranchId: string) =>
  withMutation((catalog) => {
    if (catalog.sectors.some((item) => item.ranchId === ranchId) || catalog.ranchCropSeasons.some((item) => item.ranchId === ranchId)) {
      throw new Error('No puedes eliminar el rancho mientras tenga sectores o cultivos/temporadas asignados.')
    }
    return { ...catalog, ranches: catalog.ranches.filter((item) => item.id !== ranchId) }
  })

export const upsertSector = (payload: Sector) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!payload.ranchId) throw new Error('Selecciona un rancho.')
    if (!name) throw new Error('El nombre del sector es requerido.')
    if (catalog.sectors.some((item) => item.id !== payload.id && item.ranchId === payload.ranchId && sameText(item.name, name))) {
      throw new Error('Ya existe un sector con ese nombre en el rancho seleccionado.')
    }
    const nextItem: Sector = {
      id: payload.id || nanoid(),
      ranchId: payload.ranchId,
      name,
      description: payload.description?.trim() || undefined,
      code: payload.code?.trim() || undefined,
    }
    const existing = catalog.sectors.some((item) => item.id === payload.id)
    return { ...catalog, sectors: existing ? catalog.sectors.map((item) => (item.id === payload.id ? nextItem : item)) : [...catalog.sectors, nextItem] }
  })

export const deleteSector = (sectorId: string) =>
  withMutation((catalog) => {
    if (catalog.tunnels.some((item) => item.sectorId === sectorId) || catalog.valves.some((item) => item.sectorId === sectorId)) {
      throw new Error('No puedes eliminar el sector mientras tenga túneles o válvulas.')
    }
    return { ...catalog, sectors: catalog.sectors.filter((item) => item.id !== sectorId) }
  })

export const upsertTunnel = (payload: Tunnel) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!payload.sectorId) throw new Error('Selecciona un sector.')
    if (!name) throw new Error('El nombre del túnel es requerido.')
    if (catalog.tunnels.some((item) => item.id !== payload.id && item.sectorId === payload.sectorId && sameText(item.name, name))) {
      throw new Error('Ya existe un túnel con ese nombre en el sector seleccionado.')
    }
    const nextItem: Tunnel = {
      id: payload.id || nanoid(),
      sectorId: payload.sectorId,
      name,
      description: payload.description?.trim() || undefined,
      code: payload.code?.trim() || undefined,
    }
    const existing = catalog.tunnels.some((item) => item.id === payload.id)
    return { ...catalog, tunnels: existing ? catalog.tunnels.map((item) => (item.id === payload.id ? nextItem : item)) : [...catalog.tunnels, nextItem] }
  })

export const deleteTunnel = (tunnelId: string) =>
  withMutation((catalog) => {
    if (catalog.valves.some((item) => item.tunnelId === tunnelId)) {
      throw new Error('No puedes eliminar un túnel con válvulas asignadas.')
    }
    return { ...catalog, tunnels: catalog.tunnels.filter((item) => item.id !== tunnelId) }
  })

export const upsertValve = (payload: Valve) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!payload.sectorId) throw new Error('Selecciona un sector.')
    if (!name) throw new Error('El nombre de la válvula es requerido.')
    if (payload.tunnelId && !catalog.tunnels.some((item) => item.id === payload.tunnelId && item.sectorId === payload.sectorId)) {
      throw new Error('El túnel no pertenece al sector seleccionado.')
    }
    if (catalog.valves.some((item) => item.id !== payload.id && item.sectorId === payload.sectorId && item.tunnelId === payload.tunnelId && sameText(item.name, name))) {
      throw new Error('Ya existe una válvula con ese nombre para la misma ubicación.')
    }
    const nextItem: Valve = {
      id: payload.id || nanoid(),
      sectorId: payload.sectorId,
      tunnelId: payload.tunnelId || undefined,
      name,
      description: payload.description?.trim() || undefined,
      code: payload.code?.trim() || undefined,
    }
    const existing = catalog.valves.some((item) => item.id === payload.id)
    return { ...catalog, valves: existing ? catalog.valves.map((item) => (item.id === payload.id ? nextItem : item)) : [...catalog.valves, nextItem] }
  })

export const deleteValve = (valveId: string) =>
  withMutation((catalog) => ({ ...catalog, valves: catalog.valves.filter((item) => item.id !== valveId) }))

export const upsertCrop = (payload: Crop) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!name) throw new Error('El nombre del cultivo es requerido.')
    if (catalog.crops.some((item) => item.id !== payload.id && sameText(item.name, name))) {
      throw new Error('Ya existe un cultivo con ese nombre.')
    }
    const nextItem: Crop = { id: payload.id || nanoid(), name, description: payload.description?.trim() || undefined }
    const existing = catalog.crops.some((item) => item.id === payload.id)
    return { ...catalog, crops: existing ? catalog.crops.map((item) => (item.id === payload.id ? nextItem : item)) : [...catalog.crops, nextItem] }
  })

export const deleteCrop = (cropId: string) =>
  withMutation((catalog) => {
    if (catalog.ranchCropSeasons.some((item) => item.cropId === cropId)) {
      throw new Error('No puedes eliminar un cultivo asignado a ranchos.')
    }
    return { ...catalog, crops: catalog.crops.filter((item) => item.id !== cropId) }
  })

export const upsertSeason = (payload: Season) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!name) throw new Error('El nombre de la temporada es requerido.')
    if (catalog.seasons.some((item) => item.id !== payload.id && sameText(item.name, name))) {
      throw new Error('Ya existe una temporada con ese nombre.')
    }
    const nextItem: Season = {
      id: payload.id || nanoid(),
      name,
      description: payload.description?.trim() || undefined,
      startDate: payload.startDate || undefined,
      endDate: payload.endDate || undefined,
    }
    const existing = catalog.seasons.some((item) => item.id === payload.id)
    return { ...catalog, seasons: existing ? catalog.seasons.map((item) => (item.id === payload.id ? nextItem : item)) : [...catalog.seasons, nextItem] }
  })

export const deleteSeason = (seasonId: string) =>
  withMutation((catalog) => {
    if (catalog.ranchCropSeasons.some((item) => item.seasonId === seasonId)) {
      throw new Error('No puedes eliminar una temporada asignada a ranchos.')
    }
    return { ...catalog, seasons: catalog.seasons.filter((item) => item.id !== seasonId) }
  })

export const upsertRanchCropSeason = (payload: RanchCropSeason) =>
  withMutation((catalog) => {
    if (!payload.ranchId) throw new Error('Selecciona un rancho.')
    if (!payload.cropId) throw new Error('Selecciona un cultivo.')
    if (!payload.seasonId) throw new Error('Selecciona una temporada.')
    if (catalog.ranchCropSeasons.some((item) => item.id !== payload.id && item.ranchId === payload.ranchId && item.cropId === payload.cropId && item.seasonId === payload.seasonId)) {
      throw new Error('Ese cultivo/temporada ya está asignado al rancho.')
    }
    const nextItem: RanchCropSeason = { id: payload.id || nanoid(), ranchId: payload.ranchId, cropId: payload.cropId, seasonId: payload.seasonId }
    const existing = catalog.ranchCropSeasons.some((item) => item.id === payload.id)
    return {
      ...catalog,
      ranchCropSeasons: existing ? catalog.ranchCropSeasons.map((item) => (item.id === payload.id ? nextItem : item)) : [...catalog.ranchCropSeasons, nextItem],
    }
  })

export const deleteRanchCropSeason = (id: string) =>
  withMutation((catalog) => ({ ...catalog, ranchCropSeasons: catalog.ranchCropSeasons.filter((item) => item.id !== id) }))

export const replaceCatalog = (catalog: unknown) => {
  if (!isCatalogShape(catalog)) throw new Error('El archivo no tiene la estructura esperada.')
  saveCatalog(catalog)
}
