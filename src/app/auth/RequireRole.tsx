import type { PropsWithChildren } from 'react'

import { Navigate } from 'react-router-dom'

import { getUserRoleFromProfileRole, isRoleAllowed, type UserRole } from '../../lib/auth/roles'
import { useAuth } from '../../lib/auth/useAuth'

type RequireRoleProps = PropsWithChildren & {
  allowed: UserRole[]
}

export function RequireRole({ allowed, children }: RequireRoleProps) {
  const { loading, myProfile, myProfileLoaded } = useAuth()

  if (loading || !myProfileLoaded) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-sm text-gray-600">Cargando perfil...</div>
  }

  const role = getUserRoleFromProfileRole(myProfile?.role)

  if (!isRoleAllowed(allowed, role)) {
    return <Navigate to="/dashboard" replace state={{ toast: 'unauthorized' }} />
  }

  return children
}
