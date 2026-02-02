import type { PropsWithChildren } from 'react'

import { Navigate } from 'react-router-dom'

import { getCurrentRole, isRoleAllowed, type UserRole } from '../../lib/auth/roles'

type RequireRoleProps = PropsWithChildren & {
  allowed: UserRole[]
}

export function RequireRole({ allowed, children }: RequireRoleProps) {
  const role = getCurrentRole()

  if (!isRoleAllowed(allowed, role)) {
    return <Navigate to="/dashboard" replace state={{ toast: 'unauthorized' }} />
  }

  return children
}
