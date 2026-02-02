export type UserRole =
  | 'AGRICOLA_PRODUCTOR'
  | 'AGROQUIMICA_ADMIN'
  | 'AGRICOLA_INGENIERO'
  | 'AGROQUIMICA_VENTAS'

export const NOMINA_ALLOWED_ROLES: UserRole[] = ['AGRICOLA_PRODUCTOR', 'AGROQUIMICA_ADMIN']

const ROLE_STORAGE_KEY = 'croplink:role'

export const getCurrentRole = (): UserRole => {
  if (typeof window === 'undefined') {
    return 'AGRICOLA_PRODUCTOR'
  }

  const stored = window.localStorage.getItem(ROLE_STORAGE_KEY)
  if (
    stored === 'AGRICOLA_PRODUCTOR' ||
    stored === 'AGROQUIMICA_ADMIN' ||
    stored === 'AGRICOLA_INGENIERO' ||
    stored === 'AGROQUIMICA_VENTAS'
  ) {
    return stored
  }

  return 'AGRICOLA_PRODUCTOR'
}

export const isRoleAllowed = (allowed: UserRole[], role: UserRole) => allowed.includes(role)
