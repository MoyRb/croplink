import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getMyProfile } from '../../lib/auth/helpers'
import { useAuth } from '../../lib/auth/useAuth'

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [organizationId, setOrganizationId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!user?.id) return

    let active = true

    void getMyProfile(user.id)
      .then(({ data, error }) => {
        if (!active) return

        if (error) {
          console.error('Error obteniendo profile del usuario:', error)
          setOrganizationId(null)
          return
        }

        setOrganizationId(data?.organization_id ?? null)
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error('Error inesperado validando acceso:', error)
        setOrganizationId(null)
      })

    return () => {
      active = false
    }
  }, [user?.id])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-sm text-gray-600">Cargando sesión...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (organizationId === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-sm text-gray-600">Cargando perfil...</div>
  }

  if (!organizationId) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
