import { nanoid } from 'nanoid'

import type { CropSeason, OperationCatalog, Producer, Ranch, Sector, Tunnel, Valve } from './types'

export const OPERATION_CATALOG_STORAGE_KEY = 'croplink_operation_catalog_v1'
export const OPERATION_CATALOG_UPDATED_EVENT = 'croplink:operation-catalog-updated'

const nowIso = () => new Date().toISOString()

const seedCatalog: OperationCatalog = {
  producers: [
    { id: 'prod_santa_elena', name: 'Productora Santa Elena', notes: 'Norte del valle', createdAt: '2024-01-10T10:00:00.000Z' },
    { id: 'prod_las_palmas', name: 'Agro Las Palmas', notes: 'Operación multi-rancho', createdAt: '2024-02-12T10:00:00.000Z' },
  ],
  ranches: [
    { id: 'ranch_olivos', producerId: 'prod_santa_elena', name: 'Rancho Los Olivos', location: 'Caborca, Sonora', createdAt: '2024-01-15T10:00:00.000Z' },
    { id: 'ranch_esperanza', producerId: 'prod_las_palmas', name: 'Rancho La Esperanza', location: 'Hermosillo, Sonora', createdAt: '2024-02-15T10:00:00.000Z' },
    { id: 'ranch_vista', producerId: 'prod_las_palmas', name: 'Rancho Vista Norte', location: 'Guaymas, Sonora', createdAt: '2024-02-16T10:00:00.000Z' },
  ],
  cropSeasons: [
    { id: 'cs_1', ranchId: 'ranch_olivos', crop: 'Tomate Roma', seasonLabel: '2024-2025', startDate: '2024-08-01', endDate: '2025-03-31' },
    { id: 'cs_2', ranchId: 'ranch_olivos', crop: 'Tomate Roma', seasonLabel: '2025-2026', startDate: '2025-08-01', endDate: '2026-03-31' },
    { id: 'cs_3', ranchId: 'ranch_esperanza', crop: 'Pepino', seasonLabel: '2024-2025', startDate: '2024-09-01', endDate: '2025-04-15' },
    { id: 'cs_4', ranchId: 'ranch_vista', crop: 'Pimiento', seasonLabel: '2024-2025', startDate: '2024-07-15', endDate: '2025-02-28' },
  ],
  sectors: [
    { id: 'sec_ol_1', ranchId: 'ranch_olivos', name: 'Sector A', code: 'A' },
    { id: 'sec_ol_2', ranchId: 'ranch_olivos', name: 'Sector B', code: 'B' },
    { id: 'sec_es_1', ranchId: 'ranch_esperanza', name: 'Sector Norte', code: 'NTE' },
  ],
  tunnels: [
    { id: 'tun_ol_a1', sectorId: 'sec_ol_1', name: 'Túnel 1', code: 'A1' },
    { id: 'tun_ol_a2', sectorId: 'sec_ol_1', name: 'Túnel 2', code: 'A2' },
    { id: 'tun_ol_b1', sectorId: 'sec_ol_2', name: 'Túnel 1', code: 'B1' },
    { id: 'tun_es_n1', sectorId: 'sec_es_1', name: 'Túnel 1', code: 'N1' },
  ],
  valves: [
    { id: 'val_ol_a1_1', tunnelId: 'tun_ol_a1', name: 'Válvula 1', code: 'V1' },
    { id: 'val_ol_a1_2', tunnelId: 'tun_ol_a1', name: 'Válvula 2', code: 'V2' },
    { id: 'val_ol_a2_1', tunnelId: 'tun_ol_a2', name: 'Válvula 1', code: 'V1' },
    { id: 'val_es_n1_1', tunnelId: 'tun_es_n1', name: 'Válvula Norte', code: 'VN' },
  ],
}

const isCatalogShape = (value: unknown): value is OperationCatalog => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    Array.isArray(candidate.producers) &&
    Array.isArray(candidate.ranches) &&
    Array.isArray(candidate.cropSeasons) &&
    Array.isArray(candidate.sectors) &&
    Array.isArray(candidate.tunnels) &&
    Array.isArray(candidate.valves)
  )
}

const cloneSeed = (): OperationCatalog => JSON.parse(JSON.stringify(seedCatalog)) as OperationCatalog

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
    if (!isCatalogShape(parsed)) return cloneSeed()
    return parsed
  } catch {
    return cloneSeed()
  }
}

export const saveCatalog = (catalog: OperationCatalog) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(OPERATION_CATALOG_STORAGE_KEY, JSON.stringify(catalog))
  window.dispatchEvent(new CustomEvent(OPERATION_CATALOG_UPDATED_EVENT))
}

const sameText = (left: string, right: string) => left.trim().toLowerCase() === right.trim().toLowerCase()

const withMutation = (mutator: (catalog: OperationCatalog) => OperationCatalog) => {
  const current = getCatalog()
  const next = mutator(current)
  saveCatalog(next)
  return next
}

export const upsertProducer = (payload: Omit<Producer, 'createdAt'> & { createdAt?: string }) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!name) throw new Error('El nombre del productor es requerido.')
    const duplicate = catalog.producers.find((item) => item.id !== payload.id && sameText(item.name, name))
    if (duplicate) throw new Error('Ya existe un productor con ese nombre.')

    const existing = catalog.producers.find((item) => item.id === payload.id)
    const nextItem: Producer = {
      id: payload.id || nanoid(),
      name,
      notes: payload.notes?.trim() || undefined,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
    }

    return {
      ...catalog,
      producers: existing
        ? catalog.producers.map((item) => (item.id === payload.id ? nextItem : item))
        : [...catalog.producers, nextItem],
    }
  })

export const deleteProducer = (producerId: string) =>
  withMutation((catalog) => {
    const hasRanches = catalog.ranches.some((ranch) => ranch.producerId === producerId)
    if (hasRanches) throw new Error('No puedes eliminar el productor mientras tenga ranchos.')
    return {
      ...catalog,
      producers: catalog.producers.filter((item) => item.id !== producerId),
    }
  })

export const upsertRanch = (payload: Omit<Ranch, 'createdAt'> & { createdAt?: string }) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!name) throw new Error('El nombre del rancho es requerido.')
    if (!payload.producerId) throw new Error('Selecciona un productor para el rancho.')

    const duplicate = catalog.ranches.find(
      (item) => item.id !== payload.id && item.producerId === payload.producerId && sameText(item.name, name),
    )
    if (duplicate) throw new Error('Ya existe un rancho con ese nombre para el productor seleccionado.')

    const existing = catalog.ranches.find((item) => item.id === payload.id)
    const nextItem: Ranch = {
      id: payload.id || nanoid(),
      producerId: payload.producerId,
      name,
      location: payload.location?.trim() || undefined,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
    }

    return {
      ...catalog,
      ranches: existing
        ? catalog.ranches.map((item) => (item.id === payload.id ? nextItem : item))
        : [...catalog.ranches, nextItem],
    }
  })

export const deleteRanch = (ranchId: string) =>
  withMutation((catalog) => {
    const hasCropSeasons = catalog.cropSeasons.some((item) => item.ranchId === ranchId)
    const hasSectors = catalog.sectors.some((item) => item.ranchId === ranchId)
    if (hasCropSeasons || hasSectors) {
      throw new Error('No puedes eliminar el rancho mientras tenga cultivos/temporadas o sectores.')
    }
    return {
      ...catalog,
      ranches: catalog.ranches.filter((item) => item.id !== ranchId),
    }
  })

export const upsertCropSeason = (payload: CropSeason) =>
  withMutation((catalog) => {
    const crop = payload.crop.trim()
    const seasonLabel = payload.seasonLabel.trim()
    if (!payload.ranchId) throw new Error('Selecciona un rancho.')
    if (!crop) throw new Error('El cultivo es requerido.')
    if (!seasonLabel) throw new Error('La temporada es requerida.')

    const duplicate = catalog.cropSeasons.find(
      (item) =>
        item.id !== payload.id &&
        item.ranchId === payload.ranchId &&
        sameText(item.crop, crop) &&
        sameText(item.seasonLabel, seasonLabel),
    )
    if (duplicate) throw new Error('Ya existe ese cultivo/temporada en el rancho seleccionado.')

    const nextItem: CropSeason = {
      id: payload.id || nanoid(),
      ranchId: payload.ranchId,
      crop,
      seasonLabel,
      startDate: payload.startDate || undefined,
      endDate: payload.endDate || undefined,
    }

    const existing = catalog.cropSeasons.some((item) => item.id === payload.id)
    return {
      ...catalog,
      cropSeasons: existing
        ? catalog.cropSeasons.map((item) => (item.id === payload.id ? nextItem : item))
        : [...catalog.cropSeasons, nextItem],
    }
  })

export const deleteCropSeason = (cropSeasonId: string) =>
  withMutation((catalog) => ({
    ...catalog,
    cropSeasons: catalog.cropSeasons.filter((item) => item.id !== cropSeasonId),
  }))

export const upsertSector = (payload: Sector) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!payload.ranchId) throw new Error('Selecciona un rancho.')
    if (!name) throw new Error('El nombre del sector es requerido.')

    const duplicate = catalog.sectors.find(
      (item) => item.id !== payload.id && item.ranchId === payload.ranchId && sameText(item.name, name),
    )
    if (duplicate) throw new Error('Ya existe un sector con ese nombre en el rancho seleccionado.')

    const nextItem: Sector = {
      id: payload.id || nanoid(),
      ranchId: payload.ranchId,
      name,
      code: payload.code?.trim() || undefined,
    }
    const existing = catalog.sectors.some((item) => item.id === payload.id)
    return {
      ...catalog,
      sectors: existing
        ? catalog.sectors.map((item) => (item.id === payload.id ? nextItem : item))
        : [...catalog.sectors, nextItem],
    }
  })

export const deleteSector = (sectorId: string) =>
  withMutation((catalog) => {
    const hasTunnels = catalog.tunnels.some((item) => item.sectorId === sectorId)
    if (hasTunnels) throw new Error('No puedes eliminar un sector con túneles asignados.')
    return {
      ...catalog,
      sectors: catalog.sectors.filter((item) => item.id !== sectorId),
    }
  })

export const upsertTunnel = (payload: Tunnel) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!payload.sectorId) throw new Error('Selecciona un sector.')
    if (!name) throw new Error('El nombre del túnel es requerido.')

    const duplicate = catalog.tunnels.find(
      (item) => item.id !== payload.id && item.sectorId === payload.sectorId && sameText(item.name, name),
    )
    if (duplicate) throw new Error('Ya existe un túnel con ese nombre en el sector seleccionado.')

    const nextItem: Tunnel = {
      id: payload.id || nanoid(),
      sectorId: payload.sectorId,
      name,
      code: payload.code?.trim() || undefined,
    }
    const existing = catalog.tunnels.some((item) => item.id === payload.id)
    return {
      ...catalog,
      tunnels: existing
        ? catalog.tunnels.map((item) => (item.id === payload.id ? nextItem : item))
        : [...catalog.tunnels, nextItem],
    }
  })

export const deleteTunnel = (tunnelId: string) =>
  withMutation((catalog) => {
    const hasValves = catalog.valves.some((item) => item.tunnelId === tunnelId)
    if (hasValves) throw new Error('No puedes eliminar un túnel con válvulas asignadas.')
    return {
      ...catalog,
      tunnels: catalog.tunnels.filter((item) => item.id !== tunnelId),
    }
  })

export const upsertValve = (payload: Valve) =>
  withMutation((catalog) => {
    const name = payload.name.trim()
    if (!payload.tunnelId) throw new Error('Selecciona un túnel.')
    if (!name) throw new Error('El nombre de la válvula es requerido.')

    const duplicate = catalog.valves.find(
      (item) => item.id !== payload.id && item.tunnelId === payload.tunnelId && sameText(item.name, name),
    )
    if (duplicate) throw new Error('Ya existe una válvula con ese nombre en el túnel seleccionado.')

    const nextItem: Valve = {
      id: payload.id || nanoid(),
      tunnelId: payload.tunnelId,
      name,
      code: payload.code?.trim() || undefined,
    }
    const existing = catalog.valves.some((item) => item.id === payload.id)
    return {
      ...catalog,
      valves: existing
        ? catalog.valves.map((item) => (item.id === payload.id ? nextItem : item))
        : [...catalog.valves, nextItem],
    }
  })

export const deleteValve = (valveId: string) =>
  withMutation((catalog) => ({
    ...catalog,
    valves: catalog.valves.filter((item) => item.id !== valveId),
  }))

export const replaceCatalog = (catalog: unknown) => {
  if (!isCatalogShape(catalog)) throw new Error('El archivo no tiene la estructura esperada.')
  saveCatalog(catalog)
}

export const generateQuickStructure = (params: {
  ranchId: string
  sectors: number
  tunnelsPerSector: number
  valvesPerTunnel: number
}) =>
  withMutation((catalog) => {
    const nextSectors = [...catalog.sectors]
    const nextTunnels = [...catalog.tunnels]
    const nextValves = [...catalog.valves]

    for (let sectorIndex = 1; sectorIndex <= params.sectors; sectorIndex += 1) {
      const sectorName = `Sector ${sectorIndex}`
      const duplicateSector = nextSectors.find(
        (item) => item.ranchId === params.ranchId && sameText(item.name, sectorName),
      )
      const sectorId = duplicateSector?.id || nanoid()

      if (!duplicateSector) {
        nextSectors.push({ id: sectorId, ranchId: params.ranchId, name: sectorName, code: `S${sectorIndex}` })
      }

      for (let tunnelIndex = 1; tunnelIndex <= params.tunnelsPerSector; tunnelIndex += 1) {
        const tunnelName = `Túnel ${tunnelIndex}`
        const duplicateTunnel = nextTunnels.find(
          (item) => item.sectorId === sectorId && sameText(item.name, tunnelName),
        )
        const tunnelId = duplicateTunnel?.id || nanoid()

        if (!duplicateTunnel) {
          nextTunnels.push({ id: tunnelId, sectorId, name: tunnelName, code: `T${sectorIndex}-${tunnelIndex}` })
        }

        for (let valveIndex = 1; valveIndex <= params.valvesPerTunnel; valveIndex += 1) {
          const valveName = `Válvula ${valveIndex}`
          const duplicateValve = nextValves.find(
            (item) => item.tunnelId === tunnelId && sameText(item.name, valveName),
          )
          if (!duplicateValve) {
            nextValves.push({ id: nanoid(), tunnelId, name: valveName, code: `V${sectorIndex}-${tunnelIndex}-${valveIndex}` })
          }
        }
      }
    }

    return {
      ...catalog,
      sectors: nextSectors,
      tunnels: nextTunnels,
      valves: nextValves,
    }
  })
