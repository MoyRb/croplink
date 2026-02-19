import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { operationContexts, type Option } from '../mock/contexts'

const STORAGE_KEY = 'croplink.operationContext'

type OperationContextState = {
  producer: Option | null
  ranch: Option | null
  crop: string
  season?: string
  sector?: string
  tunnel?: string
  valve?: string
}

type OperationContextValue = {
  operationContext: OperationContextState
  producers: typeof operationContexts
  ranches: { id: string; name: string }[]
  crops: string[]
  seasons: string[]
  sectors: string[]
  tunnels: string[]
  valves: string[]
  setProducer: (producerId: string) => void
  setRanch: (ranchId: string) => void
  setCrop: (crop: string) => void
  setSeason: (season: string) => void
  setSector: (sector: string) => void
  setTunnel: (tunnel: string) => void
  setValve: (valve: string) => void
}

const initialOperationContext: OperationContextState = {
  producer: null,
  ranch: null,
  crop: '',
}

const OperationContext = createContext<OperationContextValue | null>(null)

const getStoredOperationContext = (): OperationContextState => {
  if (typeof window === 'undefined') return initialOperationContext
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return initialOperationContext

  try {
    const parsed = JSON.parse(stored) as OperationContextState
    return {
      ...initialOperationContext,
      ...parsed,
    }
  } catch {
    return initialOperationContext
  }
}

export function OperationContextProvider({ children }: PropsWithChildren) {
  const [operationContext, setOperationContext] = useState<OperationContextState>(() => getStoredOperationContext())

  const selectedProducer = useMemo(
    () => operationContexts.find((producer) => producer.id === operationContext.producer?.id) ?? null,
    [operationContext.producer],
  )

  const ranches = useMemo(() => selectedProducer?.ranches.map(({ id, name }) => ({ id, name })) ?? [], [selectedProducer])

  const selectedRanch = useMemo(
    () => selectedProducer?.ranches.find((ranch) => ranch.id === operationContext.ranch?.id) ?? null,
    [operationContext.ranch, selectedProducer],
  )

  const crops = useMemo(() => selectedRanch?.crops.map((crop) => crop.name) ?? [], [selectedRanch])

  const selectedCrop = useMemo(
    () => selectedRanch?.crops.find((crop) => crop.name === operationContext.crop) ?? null,
    [operationContext.crop, selectedRanch],
  )

  const seasons = selectedCrop?.seasons ?? []
  const sectors = selectedCrop?.sectors ?? []
  const tunnels = selectedCrop?.tunnels ?? []
  const valves = selectedCrop?.valves ?? []

  const setProducer = (producerId: string) => {
    const producer = operationContexts.find((item) => item.id === producerId) ?? null
    setOperationContext({
      producer: producer ? { id: producer.id, name: producer.name } : null,
      ranch: null,
      crop: '',
      season: undefined,
      sector: undefined,
      tunnel: undefined,
      valve: undefined,
    })
  }

  const setRanch = (ranchId: string) => {
    if (!selectedProducer) return
    const ranch = selectedProducer.ranches.find((item) => item.id === ranchId) ?? null
    setOperationContext((prev) => ({
      ...prev,
      ranch: ranch ? { id: ranch.id, name: ranch.name } : null,
      crop: '',
      season: undefined,
      sector: undefined,
      tunnel: undefined,
      valve: undefined,
    }))
  }

  const setCrop = (crop: string) => {
    setOperationContext((prev) => ({
      ...prev,
      crop,
      season: undefined,
      sector: undefined,
      tunnel: undefined,
      valve: undefined,
    }))
  }

  const setSeason = (season: string) => setOperationContext((prev) => ({ ...prev, season: season || undefined }))
  const setSector = (sector: string) => setOperationContext((prev) => ({ ...prev, sector: sector || undefined }))
  const setTunnel = (tunnel: string) => setOperationContext((prev) => ({ ...prev, tunnel: tunnel || undefined }))
  const setValve = (valve: string) => setOperationContext((prev) => ({ ...prev, valve: valve || undefined }))

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(operationContext))
  }, [operationContext])

  const value: OperationContextValue = {
    operationContext,
    producers: operationContexts,
    ranches,
    crops,
    seasons,
    sectors,
    tunnels,
    valves,
    setProducer,
    setRanch,
    setCrop,
    setSeason,
    setSector,
    setTunnel,
    setValve,
  }

  return <OperationContext.Provider value={value}>{children}</OperationContext.Provider>
}

export function useOperationContext() {
  const context = useContext(OperationContext)
  if (!context) {
    throw new Error('useOperationContext must be used within OperationContextProvider')
  }
  return context
}
