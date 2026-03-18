export type Operation = {
  id: string
  name: string
  description?: string
  createdAt: string
}

export type Ranch = {
  id: string
  operationId: string
  name: string
  description?: string
  location?: string
  surfaceHa?: number | null
  createdAt: string
}

export type Sector = {
  id: string
  ranchId: string
  name: string
  description?: string
  code?: string
  areaHa?: number | null
  number?: number | null
  tunnelCount?: number | null
}

export type Tunnel = {
  id: string
  sectorId: string
  name: string
  description?: string
  code?: string
  number?: number | null
}

export type Valve = {
  id: string
  sectorId: string
  tunnelId?: string
  name: string
  description?: string
  code?: string
  number?: number | null
}

export type Crop = {
  id: string
  name: string
  description?: string
}

export type Season = {
  id: string
  name: string
  description?: string
  startDate?: string
  endDate?: string
}

export type RanchCropSeason = {
  id: string
  ranchId: string
  cropId: string
  seasonId: string
  variety?: string
}

export type OperationCatalog = {
  operations: Operation[]
  ranches: Ranch[]
  sectors: Sector[]
  tunnels: Tunnel[]
  valves: Valve[]
  crops: Crop[]
  seasons: Season[]
  ranchCropSeasons: RanchCropSeason[]
}
