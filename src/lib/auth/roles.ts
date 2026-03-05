export type UserRole =
  | 'AGRICOLA_PRODUCTOR'
  | 'AGROQUIMICA_ADMIN'
  | 'AGRICOLA_INGENIERO'
  | 'AGROQUIMICA_VENTAS'

const USER_ROLE_VALUES: UserRole[] = [
  'AGRICOLA_PRODUCTOR',
  'AGROQUIMICA_ADMIN',
  'AGRICOLA_INGENIERO',
  'AGROQUIMICA_VENTAS',
]

export const NOMINA_ALLOWED_ROLES: UserRole[] = ['AGRICOLA_PRODUCTOR', 'AGROQUIMICA_ADMIN']
export const ACTIVOS_ALLOWED_ROLES: UserRole[] = [
  'AGRICOLA_PRODUCTOR',
  'AGROQUIMICA_ADMIN',
  'AGROQUIMICA_VENTAS',
]

export const isUserRole = (value: string | null | undefined): value is UserRole =>
  value != null && USER_ROLE_VALUES.includes(value as UserRole)

const PROFILE_ROLE_TO_USER_ROLE: Record<string, UserRole> = {
  admin: 'AGROQUIMICA_ADMIN',
  compras: 'AGROQUIMICA_VENTAS',
  campo: 'AGRICOLA_PRODUCTOR',
  supervisor: 'AGRICOLA_INGENIERO',
}

export const getUserRoleFromProfileRole = (role: string | null | undefined): UserRole | null => {
  if (!role) return null
  if (isUserRole(role)) return role

  return PROFILE_ROLE_TO_USER_ROLE[role.toLowerCase()] ?? null
}

export const isRoleAllowed = (allowed: UserRole[], role: UserRole | null | undefined) =>
  role != null && allowed.includes(role)
