/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { OPERATION_CATALOG_UPDATED_EVENT, getCatalog } from '../operationCatalog/repo'
import type { OperationCatalog } from '../operationCatalog/types'

const STORAGE_KEY = 'croplink.operationContext'

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
  contextNotice: string
  clearContextNotice: () => void
  setOperation: (operationId: string) => void
  setRanch: (ranchId: string) => void
  setCropSeason: (cropSeasonId: string) => void
  setSector: (sectorId: string) => void
  setTunnel: (tunnelId: string) => void
  setValve: (valveId: string) => void
}

const initialOperationContext: OperationContextState = {
  operation: null,
  ranch: null,
  cropSeason: null,
  sector: null,
  tunnel: null,
  valve: null,
}

const OperationContext = createContext<OperationContextValue | null>(null)

const getStoredOperationContext = (): OperationContextState => {
  if (typeof window === 'undefined') return initialOperationContext
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return initialOperationContext

  try {
    const parsed = JSON.parse(stored) as Partial<OperationContextState>
    return { ...initialOperationContext, ...parsed }
  } catch {
    return initialOperationContext
  }
}

const withChildrenReset = (state: OperationContextState, level: 'operation' | 'ranch' | 'cropSeason' | 'sector' | 'tunnel' | 'valve') => {
  const next = { ...state }
  if (level === 'operation') {
    next.ranch = null
    next.cropSeason = null
    next.sector = null
    next.tunnel = null
    next.valve = null
  }
  if (level === 'ranch') {
    next.cropSeason = null
    next.sector = null
    next.tunnel = null
    next.valve = null
  }
  if (level === 'cropSeason') {
    next.sector = null
    next.tunnel = null
    next.valve = null
  }
  if (level === 'sector') {
    next.tunnel = null
    next.valve = null
  }
  if (level === 'tunnel') {
    next.valve = null
  }
  return next
}

const sanitizeOperationContext = (state: OperationContextState, catalog: OperationCatalog) => {
  let next = { ...state }
  let wasReset = false

  if (next.operation && !catalog.operations.some((item) => item.id === next.operation?.id)) {
    next = withChildrenReset({ ...next, operation: null }, 'operation')
    wasReset = true
  }

  if (next.ranch) {
    const ranch = catalog.ranches.find((item) => item.id === next.ranch?.id)
    if (!ranch || ranch.operationId !== next.operation?.id) {
      next = withChildrenReset({ ...next, ranch: null }, 'ranch')
      wasReset = true
    }
  }

  if (next.cropSeason) {
    const assignment = catalog.ranchCropSeasons.find((item) => item.id === next.cropSeason?.id)
    if (!assignment || assignment.ranchId !== next.ranch?.id) {
      next = withChildrenReset({ ...next, cropSeason: null }, 'cropSeason')
      wasReset = true
    }
  }

  if (next.sector) {
    const sector = catalog.sectors.find((item) => item.id === next.sector?.id)
    if (!sector || sector.ranchId !== next.ranch?.id) {
      next = withChildrenReset({ ...next, sector: null }, 'sector')
      wasReset = true
    }
  }

  if (next.tunnel) {
    const tunnel = catalog.tunnels.find((item) => item.id === next.tunnel?.id)
    if (!tunnel || tunnel.sectorId !== next.sector?.id) {
      next = withChildrenReset({ ...next, tunnel: null }, 'tunnel')
      wasReset = true
    }
  }

  if (next.valve) {
    const valve = catalog.valves.find((item) => item.id === next.valve?.id)
    if (!valve || valve.sectorId !== next.sector?.id || (next.tunnel?.id ? valve.tunnelId !== next.tunnel.id : Boolean(valve.tunnelId))) {
      next = withChildrenReset({ ...next, valve: null }, 'valve')
      wasReset = true
    }
  }

  return { next, wasReset }
}

export function OperationContextProvider({ children }: PropsWithChildren) {
  const [catalog, setCatalog] = useState<OperationCatalog>(() => getCatalog())
  const [contextNotice, setContextNotice] = useState('')
  const [operationContext, setOperationContext] = useState<OperationContextState>(() => {
    const stored = getStoredOperationContext()
    return sanitizeOperationContext(stored, getCatalog()).next
  })

  useEffect(() => {
    const reloadCatalog = () => {
      const nextCatalog = getCatalog()
      setCatalog(nextCatalog)
      setOperationContext((prev) => {
        const result = sanitizeOperationContext(prev, nextCatalog)
        if (result.wasReset) setContextNotice('El elemento seleccionado ya no existe, se reinició el contexto.')
        return result.next
      })
    }

    window.addEventListener(OPERATION_CATALOG_UPDATED_EVENT, reloadCatalog)
    window.addEventListener('storage', reloadCatalog)
    return () => {
      window.removeEventListener(OPERATION_CATALOG_UPDATED_EVENT, reloadCatalog)
      window.removeEventListener('storage', reloadCatalog)
    }
  }, [])

  const operations = useMemo(() => catalog.operations.map((item) => ({ id: item.id, name: item.name })), [catalog.operations])

  const ranches = useMemo(
    () => catalog.ranches.filter((item) => item.operationId === operationContext.operation?.id).map((item) => ({ id: item.id, name: item.name })),
    [catalog.ranches, operationContext.operation?.id],
  )

  const cropSeasons = useMemo(
    () =>
      catalog.ranchCropSeasons
        .filter((item) => item.ranchId === operationContext.ranch?.id)
        .map((item) => {
          const crop = catalog.crops.find((entry) => entry.id === item.cropId)?.name ?? 'Cultivo'
          const season = catalog.seasons.find((entry) => entry.id === item.seasonId)?.name ?? 'Temporada'
          return { id: item.id, name: `${crop} · ${season}` }
        }),
    [catalog.ranchCropSeasons, catalog.crops, catalog.seasons, operationContext.ranch?.id],
  )

  const sectors = useMemo(
    () => catalog.sectors.filter((item) => item.ranchId === operationContext.ranch?.id).map((item) => ({ id: item.id, name: item.name })),
    [catalog.sectors, operationContext.ranch?.id],
  )

  const tunnels = useMemo(
    () => catalog.tunnels.filter((item) => item.sectorId === operationContext.sector?.id).map((item) => ({ id: item.id, name: item.name })),
    [catalog.tunnels, operationContext.sector?.id],
  )

  const valves = useMemo(() => {
    if (!operationContext.sector) return []
    return catalog.valves
      .filter((item) => item.sectorId === operationContext.sector?.id && (operationContext.tunnel ? item.tunnelId === operationContext.tunnel.id : !item.tunnelId))
      .map((item) => ({ id: item.id, name: item.name }))
  }, [catalog.valves, operationContext.sector, operationContext.tunnel])

  const setOperation = (operationId: string) => {
    const operation = catalog.operations.find((item) => item.id === operationId) ?? null
    setOperationContext({ operation: operation ? { id: operation.id, name: operation.name } : null, ranch: null, cropSeason: null, sector: null, tunnel: null, valve: null })
  }

  const setRanch = (ranchId: string) => {
    const ranch = catalog.ranches.find((item) => item.id === ranchId && item.operationId === operationContext.operation?.id) ?? null
    setOperationContext((prev) => ({ ...prev, ranch: ranch ? { id: ranch.id, name: ranch.name } : null, cropSeason: null, sector: null, tunnel: null, valve: null }))
  }

  const setCropSeason = (cropSeasonId: string) => {
    const assignment = catalog.ranchCropSeasons.find((item) => item.id === cropSeasonId && item.ranchId === operationContext.ranch?.id)
    const crop = catalog.crops.find((entry) => entry.id === assignment?.cropId)?.name ?? ''
    const season = catalog.seasons.find((entry) => entry.id === assignment?.seasonId)?.name ?? ''
    setOperationContext((prev) => ({ ...prev, cropSeason: assignment ? { id: assignment.id, name: `${crop} · ${season}` } : null, sector: null, tunnel: null, valve: null }))
  }

  const setSector = (sectorId: string) => {
    const sector = catalog.sectors.find((item) => item.id === sectorId && item.ranchId === operationContext.ranch?.id)
    setOperationContext((prev) => ({ ...prev, sector: sector ? { id: sector.id, name: sector.name } : null, tunnel: null, valve: null }))
  }

  const setTunnel = (tunnelId: string) => {
    const tunnel = catalog.tunnels.find((item) => item.id === tunnelId && item.sectorId === operationContext.sector?.id)
    setOperationContext((prev) => ({ ...prev, tunnel: tunnel ? { id: tunnel.id, name: tunnel.name } : null, valve: null }))
  }

  const setValve = (valveId: string) => {
    const valve = catalog.valves.find(
      (item) => item.id === valveId && item.sectorId === operationContext.sector?.id && (operationContext.tunnel ? item.tunnelId === operationContext.tunnel.id : !item.tunnelId),
    )
    setOperationContext((prev) => ({ ...prev, valve: valve ? { id: valve.id, name: valve.name } : null }))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(operationContext))
  }, [operationContext])

  const value: OperationContextValue = {
    operationContext,
    operations,
    ranches,
    cropSeasons,
    sectors,
    tunnels,
    valves,
    contextNotice,
    clearContextNotice: () => setContextNotice(''),
    setOperation,
    setRanch,
    setCropSeason,
    setSector,
    setTunnel,
    setValve,
  }

  return <OperationContext.Provider value={value}>{children}</OperationContext.Provider>
}

export function useOperationContext() {
  const context = useContext(OperationContext)
  if (!context) throw new Error('useOperationContext must be used within OperationContextProvider')
  return context
}
