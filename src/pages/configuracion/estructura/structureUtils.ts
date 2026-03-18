import type { OperationCatalog, Ranch, RanchCropSeason, Season } from '../../../lib/operationCatalog/types'

type OperationSeasonSummary = {
  key: string
  seasonName: string
  durationLabel: string
  ranchNames: string[]
}

type RanchAssignmentSummary = {
  id: string
  cropName: string
  variety: string
  seasonName: string
  durationLabel: string
}

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatArea(value?: number | null) {
  if (value == null) return '—'
  return `${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ha`
}

export function formatSeasonDuration(season?: Season) {
  if (!season?.startDate || !season.endDate) return 'Duración no definida'

  const start = new Date(`${season.startDate}T00:00:00Z`)
  const end = new Date(`${season.endDate}T00:00:00Z`)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

  return `${dateFormatter.format(start)} – ${dateFormatter.format(end)} · ${days} días`
}

function getAssignmentsForRanch(ranchId: string, catalog: OperationCatalog): RanchAssignmentSummary[] {
  return catalog.ranchCropSeasons
    .filter((item) => item.ranchId === ranchId)
    .map((item) => {
      const cropName = catalog.crops.find((crop) => crop.id === item.cropId)?.name ?? 'Cultivo sin nombre'
      const season = catalog.seasons.find((entry) => entry.id === item.seasonId)
      return {
        id: item.id,
        cropName,
        variety: item.variety?.trim() || '—',
        seasonName: season?.name ?? 'Temporada sin nombre',
        durationLabel: formatSeasonDuration(season),
      }
    })
}

export function getRanchAssignments(ranchId: string, catalog: OperationCatalog) {
  return getAssignmentsForRanch(ranchId, catalog)
}

export function getOperationSeasonSummaries(operationId: string, catalog: OperationCatalog): OperationSeasonSummary[] {
  const ranches = catalog.ranches.filter((item) => item.operationId === operationId)
  const ranchesById = new Map(ranches.map((ranch) => [ranch.id, ranch]))
  const summaries = new Map<string, OperationSeasonSummary>()

  catalog.ranchCropSeasons.forEach((assignment: RanchCropSeason) => {
    const ranch = ranchesById.get(assignment.ranchId)
    if (!ranch) return

    const season = catalog.seasons.find((entry) => entry.id === assignment.seasonId)
    const key = assignment.seasonId
    const existing = summaries.get(key)

    if (existing) {
      if (!existing.ranchNames.includes(ranch.name)) {
        existing.ranchNames.push(ranch.name)
      }
      return
    }

    summaries.set(key, {
      key,
      seasonName: season?.name ?? 'Temporada sin nombre',
      durationLabel: formatSeasonDuration(season),
      ranchNames: [ranch.name],
    })
  })

  return Array.from(summaries.values()).sort((a, b) => a.seasonName.localeCompare(b.seasonName, 'es'))
}

export function getRanchSurfaceTotal(ranch: Ranch, catalog: OperationCatalog) {
  if (ranch.surfaceHa != null) return ranch.surfaceHa

  const total = catalog.sectors
    .filter((sector) => sector.ranchId === ranch.id)
    .reduce((sum, sector) => sum + (sector.areaHa ?? 0), 0)

  return total > 0 ? total : null
}
