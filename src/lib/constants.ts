import { BRAND } from './brand'
import { ACTIVOS_ALLOWED_ROLES } from './auth/roles'
import type { UserRole } from './auth/roles'

export const APP_NAME = BRAND.product

type NavItem = {
  label: string
  to?: string
  items?: { label: string; to: string }[]
  roles?: UserRole[]
}

export const NAV_SECTIONS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
  },
  {
    label: 'Requisiciones',
    items: [
      { label: 'Lista', to: '/requisiciones/lista' },
      { label: 'Crear', to: '/requisiciones/crear' },
      { label: 'Aprobaciones', to: '/requisiciones/aprobaciones' },
    ],
  },
  {
    label: 'Inventario',
    to: '/inventario',
  },
  {
    label: 'Activos',
    roles: ACTIVOS_ALLOWED_ROLES,
    items: [
      { label: 'Lista', to: '/activos/lista' },
      { label: 'Nuevo', to: '/activos/nuevo' },
      { label: 'Reportes', to: '/activos/reportes' },
    ],
  },
  {
    label: 'Monitoreos',
    items: [
      { label: 'Lista', to: '/monitoreos/lista' },
      { label: 'Crear', to: '/monitoreos/crear' },
    ],
  },
  {
    label: 'Nómina',
    roles: ['AGRICOLA_PRODUCTOR', 'AGROQUIMICA_ADMIN'],
    items: [
      { label: 'Empleados', to: '/nomina/empleados' },
      { label: 'Periodos', to: '/nomina/periodos' },
      { label: 'Pagos', to: '/nomina/pagos' },
      { label: 'Reportes', to: '/nomina/reportes' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { label: 'Estructura', to: '/configuracion/estructura' },
      { label: 'Operaciones', to: '/configuracion/estructura/operaciones' },
      { label: 'Ranchos', to: '/configuracion/estructura/ranchos' },
      { label: 'Sectores', to: '/configuracion/estructura/sectores' },
      { label: 'Túneles', to: '/configuracion/estructura/tuneles' },
      { label: 'Válvulas', to: '/configuracion/estructura/valvulas' },
      { label: 'Cultivos', to: '/configuracion/estructura/cultivos' },
      { label: 'Temporadas', to: '/configuracion/estructura/temporadas' },
    ],
  },
]
