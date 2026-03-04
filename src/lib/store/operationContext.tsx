/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { useAuth } from '../auth/useAuth'
import { supabase } from '../supabaseClient'

type NamedSelection = { id: string; name: string }

type OperationContextState = {
  operation: NamedSelection | null
  ranch: NamedSelection | null
  cropSeason: NamedSelection | null
  sector: NamedSelection | null
  tunnel: NamedSelection | null
  valve: NamedSelection | null
}

type Option = { id: string; name: string }

type OperationContextValue = {
  operationContext: OperationContextState
  operations: Option[]
  ranches: Option[]
  cropSeasons: Option[]
  sectors: Option[]
  tunnels: Option[]
  valves: Option[]
  isCatalogLoading: boolean
  hasStructureData: boolean
  contextNotice: string
  clearContextNotice: () => void
  setOperation: (operationId: string) => void
  setRanch: (ranchId: string) => void
  setCropSeason: (cropSeasonId: string) => void
  setSector: (sectorId: string) => void
  setTunnel: (tunnelId: string) => void
  setValve: (valveId: string) => void
}

type SelectionIds = {
  operationId: string | null
  ranchId: string | null
  cropId: string | null
  seasonId: string | null
  cropSeasonId: string | null
  sectorId: string | null
  tunnelId: string | null
  valveId: string | null
}

type StoredSelectionIds = {
  selectedOperationId: string | null
  selectedRanchId: string | null
  selectedSectorId: string | null
  selectedTunnelId: string | null
  selectedValveId: string | null
  selectedCropId: string | null
  selectedSeasonId: string | null
  selectedRanchCropSeasonId: string | null
}

type RanchRow = { id: string; name: string; operation_id: string }
type SectorRow = { id: string; name: string; ranch_id: string }
type TunnelRow = { id: string; name: string; sector_id: string }
type ValveRow = { id: string; name: string; sector_id: string; tunnel_id: string | null }
type CropSeasonRow = {
  id: string
  ranch_id: string
  crop_id: string
  season_id: string
  crops: { name: string } | { name: string }[] | null
  seasons: { label: string } | { label: string }[] | null
}

const baseStorageKey = 'croplink.operationContext.ids'

const initialSelectionIds: SelectionIds = {
  operationId: null,
  ranchId: null,
  cropId: null,
  seasonId: null,
  cropSeasonId: null,
  sectorId: null,
  tunnelId: null,
  valveId: null,
}

const OperationContext = createContext<OperationContextValue | null>(null)

const withChildrenReset = (state: SelectionIds, level: keyof SelectionIds) => {
  const next = { ...state }
  if (level === 'operationId') {
    next.ranchId = null
    next.cropId = null
    next.seasonId = null
    next.cropSeasonId = null
    next.sectorId = null
    next.tunnelId = null
    next.valveId = null
  }
  if (level === 'ranchId') {
    next.cropId = null
    next.seasonId = null
    next.cropSeasonId = null
    next.sectorId = null
    next.tunnelId = null
    next.valveId = null
  }
  if (level === 'cropSeasonId') {
    next.sectorId = null
    next.tunnelId = null
    next.valveId = null
  }
  if (level === 'sectorId') {
    next.tunnelId = null
    next.valveId = null
  }
  if (level === 'tunnelId') {
    next.valveId = null
  }
  return next
}

const getStorageKeyForUser = (userId: string | null | undefined) => `${baseStorageKey}:${userId ?? 'anon'}`

const toStoragePayload = (selectionIds: SelectionIds): StoredSelectionIds => ({
  selectedOperationId: selectionIds.operationId,
  selectedRanchId: selectionIds.ranchId,
  selectedSectorId: selectionIds.sectorId,
  selectedTunnelId: selectionIds.tunnelId,
  selectedValveId: selectionIds.valveId,
  selectedCropId: selectionIds.cropId,
  selectedSeasonId: selectionIds.seasonId,
  selectedRanchCropSeasonId: selectionIds.cropSeasonId,
})

const fromStoragePayload = (stored: Partial<StoredSelectionIds> | Partial<SelectionIds>): SelectionIds => {
  const legacy = stored as Partial<SelectionIds>
  const next = stored as Partial<StoredSelectionIds>

  return {
    operationId: next.selectedOperationId ?? legacy.operationId ?? null,
    ranchId: next.selectedRanchId ?? legacy.ranchId ?? null,
    cropId: next.selectedCropId ?? legacy.cropId ?? null,
    seasonId: next.selectedSeasonId ?? legacy.seasonId ?? null,
    cropSeasonId: next.selectedRanchCropSeasonId ?? legacy.cropSeasonId ?? null,
    sectorId: next.selectedSectorId ?? legacy.sectorId ?? null,
    tunnelId: next.selectedTunnelId ?? legacy.tunnelId ?? null,
    valveId: next.selectedValveId ?? legacy.valveId ?? null,
  }
}

const fromMaybeArray = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

const getStoredSelectionIds = (userId: string | null | undefined): SelectionIds => {
  if (typeof window === 'undefined') return initialSelectionIds
  const stored = window.localStorage.getItem(getStorageKeyForUser(userId))
  if (!stored) return initialSelectionIds

  try {
    const parsed = JSON.parse(stored) as Partial<StoredSelectionIds> | Partial<SelectionIds>
    return { ...initialSelectionIds, ...fromStoragePayload(parsed) }
  } catch {
    return initialSelectionIds
  }
}

export function OperationContextProvider({ children }: PropsWithChildren) {
  const { user, myProfile } = useAuth()
  const organizationId = myProfile?.organization_id ?? null
  const [contextNotice, setContextNotice] = useState('')
  const [selectionIds, setSelectionIds] = useState<SelectionIds>(() => getStoredSelectionIds(user?.id))
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)

  const [operations, setOperations] = useState<Option[]>([])
  const [ranchesCatalog, setRanchesCatalog] = useState<RanchRow[]>([])
  const [cropSeasonsCatalog, setCropSeasonsCatalog] = useState<CropSeasonRow[]>([])
  const [sectorsCatalog, setSectorsCatalog] = useState<SectorRow[]>([])
  const [tunnelsCatalog, setTunnelsCatalog] = useState<TunnelRow[]>([])
  const [valvesCatalog, setValvesCatalog] = useState<ValveRow[]>([])

  useEffect(() => {
    setSelectionIds(getStoredSelectionIds(user?.id))
  }, [user?.id])

  useEffect(() => {
    if (!organizationId) {
      setOperations([])
      setRanchesCatalog([])
      setCropSeasonsCatalog([])
      setSectorsCatalog([])
      setTunnelsCatalog([])
      setValvesCatalog([])
      return
    }

    let active = true
    const loadCatalog = async () => {
      setIsCatalogLoading(true)
      const operationsResult = await supabase
        .from('operations')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (!active) return

      if (operationsResult.error) {
        console.error('Error cargando catálogo de contexto operativo', {
          operationsError: operationsResult.error,
        })
        setContextNotice('No se pudo cargar la estructura operativa.')
      }

      setOperations(((operationsResult.data as Option[] | null) ?? []).map((item) => ({ id: item.id, name: item.name })))
      setIsCatalogLoading(false)
    }

    void loadCatalog()
    return () => {
      active = false
    }
  }, [organizationId])

  useEffect(() => {
    if (!organizationId || !selectionIds.operationId) {
      setRanchesCatalog([])
      return
    }

    let active = true
    const loadRanches = async () => {
      setIsCatalogLoading(true)
      const ranchesResult = await supabase
        .from('ranches')
        .select('id, name, operation_id')
        .eq('organization_id', organizationId)
        .eq('operation_id', selectionIds.operationId)
        .order('name', { ascending: true })

      if (!active) return
      if (ranchesResult.error) {
        console.error('Error cargando ranchos', { ranchesError: ranchesResult.error })
        setContextNotice('No se pudieron cargar los ranchos de la operación.')
      }

      setRanchesCatalog((ranchesResult.data as RanchRow[] | null) ?? [])
      setIsCatalogLoading(false)
    }

    void loadRanches()
    return () => {
      active = false
    }
  }, [organizationId, selectionIds.operationId])

  useEffect(() => {
    if (!organizationId || !selectionIds.ranchId) {
      setCropSeasonsCatalog([])
      setSectorsCatalog([])
      return
    }

    let active = true
    const loadRanchChildren = async () => {
      setIsCatalogLoading(true)
      const [cropSeasonResult, sectorsResult] = await Promise.all([
        supabase
          .from('ranch_crop_seasons')
          .select('id, ranch_id, crop_id, season_id, crops(name), seasons(label)')
          .eq('organization_id', organizationId)
          .eq('ranch_id', selectionIds.ranchId),
        supabase
          .from('sectors')
          .select('id, name, ranch_id')
          .eq('organization_id', organizationId)
          .eq('ranch_id', selectionIds.ranchId)
          .order('name', { ascending: true }),
      ])

      if (!active) return
      if (cropSeasonResult.error || sectorsResult.error) {
        console.error('Error cargando cultivos/temporadas o sectores', {
          cropSeasonsError: cropSeasonResult.error,
          sectorsError: sectorsResult.error,
        })
        setContextNotice('No se pudo cargar la estructura del rancho seleccionado.')
      }

      setCropSeasonsCatalog((cropSeasonResult.data as CropSeasonRow[] | null) ?? [])
      setSectorsCatalog((sectorsResult.data as SectorRow[] | null) ?? [])
      setIsCatalogLoading(false)
    }

    void loadRanchChildren()
    return () => {
      active = false
    }
  }, [organizationId, selectionIds.ranchId])

  useEffect(() => {
    if (!organizationId || !selectionIds.sectorId) {
      setTunnelsCatalog([])
      setValvesCatalog([])
      return
    }

    let active = true
    const loadSectorChildren = async () => {
      setIsCatalogLoading(true)
      const [tunnelsResult, valvesResult] = await Promise.all([
        supabase
          .from('tunnels')
          .select('id, name, sector_id')
          .eq('organization_id', organizationId)
          .eq('sector_id', selectionIds.sectorId)
          .order('name', { ascending: true }),
        supabase
          .from('valves')
          .select('id, name, sector_id, tunnel_id')
          .eq('organization_id', organizationId)
          .eq('sector_id', selectionIds.sectorId)
          .order('name', { ascending: true }),
      ])

      if (!active) return
      if (tunnelsResult.error || valvesResult.error) {
        console.error('Error cargando túneles/válvulas', {
          tunnelsError: tunnelsResult.error,
          valvesError: valvesResult.error,
        })
        setContextNotice('No se pudo cargar la estructura del sector seleccionado.')
      }

      setTunnelsCatalog((tunnelsResult.data as TunnelRow[] | null) ?? [])
      setValvesCatalog((valvesResult.data as ValveRow[] | null) ?? [])
      setIsCatalogLoading(false)
    }

    void loadSectorChildren()
    return () => {
      active = false
    }
  }, [organizationId, selectionIds.sectorId])

  const ranches = useMemo(() => ranchesCatalog.map((item) => ({ id: item.id, name: item.name })), [ranchesCatalog])

  const cropSeasons = useMemo(
    () =>
      cropSeasonsCatalog
        .filter((item) => item.ranch_id === selectionIds.ranchId)
        .map((item) => {
          const crop = fromMaybeArray(item.crops)?.name ?? 'Cultivo'
          const season = fromMaybeArray(item.seasons)?.label ?? 'Temporada'
          return { id: item.id, name: `${crop} · ${season}` }
        }),
    [cropSeasonsCatalog, selectionIds.ranchId],
  )

  const sectors = useMemo(
    () => sectorsCatalog.map((item) => ({ id: item.id, name: item.name })),
    [sectorsCatalog],
  )

  const tunnels = useMemo(() => tunnelsCatalog.map((item) => ({ id: item.id, name: item.name })), [tunnelsCatalog])

  const valves = useMemo(() => {
    if (!selectionIds.sectorId) return []
    return valvesCatalog
      .filter((item) => item.sector_id === selectionIds.sectorId && (selectionIds.tunnelId ? item.tunnel_id === selectionIds.tunnelId : true))
      .map((item) => ({ id: item.id, name: item.name }))
  }, [valvesCatalog, selectionIds.sectorId, selectionIds.tunnelId])

  useEffect(() => {
    setSelectionIds((prev) => {
      let next = { ...prev }
      let wasReset = false

      if (next.operationId && !operations.some((item) => item.id === next.operationId)) {
        next = withChildrenReset({ ...next, operationId: null }, 'operationId')
        wasReset = true
      }

      if (next.ranchId && !ranches.some((item) => item.id === next.ranchId)) {
        next = withChildrenReset({ ...next, ranchId: null }, 'ranchId')
        wasReset = true
      }

      if (next.cropSeasonId && !cropSeasons.some((item) => item.id === next.cropSeasonId)) {
        next = withChildrenReset({ ...next, cropSeasonId: null }, 'cropSeasonId')
        next.cropId = null
        next.seasonId = null
        wasReset = true
      }

      const selectedCropSeason = cropSeasonsCatalog.find((item) => item.id === next.cropSeasonId)
      if (next.cropSeasonId && selectedCropSeason) {
        if (next.cropId !== selectedCropSeason.crop_id || next.seasonId !== selectedCropSeason.season_id) {
          next.cropId = selectedCropSeason.crop_id
          next.seasonId = selectedCropSeason.season_id
          wasReset = true
        }
      } else if (next.cropId || next.seasonId) {
        next.cropId = null
        next.seasonId = null
        wasReset = true
      }

      if (next.sectorId && !sectors.some((item) => item.id === next.sectorId)) {
        next = withChildrenReset({ ...next, sectorId: null }, 'sectorId')
        wasReset = true
      }

      if (next.tunnelId && !tunnels.some((item) => item.id === next.tunnelId)) {
        next = withChildrenReset({ ...next, tunnelId: null }, 'tunnelId')
        wasReset = true
      }

      if (next.valveId && !valves.some((item) => item.id === next.valveId)) {
        next = withChildrenReset({ ...next, valveId: null }, 'valveId')
        wasReset = true
      }

      if (wasReset) {
        setContextNotice('El elemento seleccionado ya no existe, se reinició el contexto.')
      }

      return next
    })
  }, [cropSeasons, cropSeasonsCatalog, operations, ranches, sectors, tunnels, valves])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getStorageKeyForUser(user?.id), JSON.stringify(toStoragePayload(selectionIds)))
  }, [selectionIds, user?.id])

  const operationContext = useMemo<OperationContextState>(() => {
    const operation = operations.find((item) => item.id === selectionIds.operationId) ?? null
    const ranch = ranches.find((item) => item.id === selectionIds.ranchId) ?? null
    const cropSeason = cropSeasons.find((item) => item.id === selectionIds.cropSeasonId) ?? null
    const sector = sectors.find((item) => item.id === selectionIds.sectorId) ?? null
    const tunnel = tunnels.find((item) => item.id === selectionIds.tunnelId) ?? null
    const valve = valves.find((item) => item.id === selectionIds.valveId) ?? null
    return { operation, ranch, cropSeason, sector, tunnel, valve }
  }, [cropSeasons, cropSeasonsCatalog, operations, ranches, sectors, selectionIds, tunnels, valves])

  const hasStructureData =
    operations.length > 0 ||
    ranchesCatalog.length > 0 ||
    cropSeasonsCatalog.length > 0 ||
    sectorsCatalog.length > 0 ||
    tunnelsCatalog.length > 0 ||
    valvesCatalog.length > 0

  const value: OperationContextValue = {
    operationContext,
    operations,
    ranches,
    cropSeasons,
    sectors,
    tunnels,
    valves,
    isCatalogLoading,
    hasStructureData,
    contextNotice,
    clearContextNotice: () => setContextNotice(''),
    setOperation: (operationId) => setSelectionIds((prev) => withChildrenReset({ ...prev, operationId: operationId || null }, 'operationId')),
    setRanch: (ranchId) => setSelectionIds((prev) => withChildrenReset({ ...prev, ranchId: ranchId || null }, 'ranchId')),
    setCropSeason: (cropSeasonId) =>
      setSelectionIds((prev) => {
        const selectedCropSeason = cropSeasonsCatalog.find((item) => item.id === (cropSeasonId || null))
        const next = withChildrenReset({ ...prev, cropSeasonId: cropSeasonId || null }, 'cropSeasonId')
        return {
          ...next,
          cropId: selectedCropSeason?.crop_id ?? null,
          seasonId: selectedCropSeason?.season_id ?? null,
        }
      }),
    setSector: (sectorId) => setSelectionIds((prev) => withChildrenReset({ ...prev, sectorId: sectorId || null }, 'sectorId')),
    setTunnel: (tunnelId) => setSelectionIds((prev) => withChildrenReset({ ...prev, tunnelId: tunnelId || null }, 'tunnelId')),
    setValve: (valveId) => setSelectionIds((prev) => ({ ...prev, valveId: valveId || null })),
  }

  return <OperationContext.Provider value={value}>{children}</OperationContext.Provider>
}

export function useOperationContext() {
  const context = useContext(OperationContext)
  if (!context) throw new Error('useOperationContext must be used within OperationContextProvider')
  return context
}
