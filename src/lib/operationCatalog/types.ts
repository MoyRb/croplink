export type Producer = {
  id: string
  name: string
  notes?: string
  createdAt: string
}

export type Ranch = {
  id: string
  producerId: string
  name: string
  location?: string
  createdAt: string
}

export type CropSeason = {
  id: string
  ranchId: string
  crop: string
  seasonLabel: string
  startDate?: string
  endDate?: string
}

export type Sector = {
  id: string
  ranchId: string
  name: string
  code?: string
}

export type Tunnel = {
  id: string
  sectorId: string
  name: string
  code?: string
}

export type Valve = {
  id: string
  tunnelId: string
  name: string
  code?: string
}

export type OperationCatalog = {
  producers: Producer[]
  ranches: Ranch[]
  cropSeasons: CropSeason[]
  sectors: Sector[]
  tunnels: Tunnel[]
  valves: Valve[]
}
