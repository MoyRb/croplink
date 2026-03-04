import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../../../lib/auth/useAuth'
import { getCatalogFromSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import type { OperationCatalog } from '../../../lib/operationCatalog/types'

const emptyCatalog: OperationCatalog = {
  operations: [],
  ranches: [],
  sectors: [],
  tunnels: [],
  valves: [],
  crops: [],
  seasons: [],
  ranchCropSeasons: [],
}

export function useStructureCatalog() {
  const { myProfile } = useAuth()
  const organizationId = myProfile?.organization_id ?? null
  const [catalog, setCatalog] = useState<OperationCatalog>(emptyCatalog)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const reload = useCallback(async () => {
    if (!organizationId) {
      setCatalog(emptyCatalog)
      setIsLoading(false)
      setLoadError('')
      return
    }

    setIsLoading(true)
    try {
      const nextCatalog = await getCatalogFromSupabase(organizationId)
      setCatalog(nextCatalog)
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la estructura.')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { catalog, isLoading, loadError, organizationId, reload }
}
