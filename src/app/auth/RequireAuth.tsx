import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../lib/auth/useAuth'

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading, myProfile, myProfileLoaded } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-sm text-gray-600">Cargando sesión...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!myProfileLoaded) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-sm text-gray-600">Cargando perfil...</div>
  }

  if (!myProfile?.organization_id) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
