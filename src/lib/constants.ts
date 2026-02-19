import { BRAND } from './brand'
import { ACTIVOS_ALLOWED_ROLES } from './auth/roles'
import type { UserRole } from './auth/roles'

export const APP_NAME = BRAND.product

type NavItem = {
  label: string
  to?: string
  children?: { label: string; to: string }[]
  roles?: UserRole[]
}

export const NAV_SECTIONS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
  },
  {
    label: 'Requisiciones',
    children: [
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
    children: [
      { label: 'Lista', to: '/activos/lista' },
      { label: 'Nuevo', to: '/activos/nuevo' },
      { label: 'Reportes', to: '/activos/reportes' },
    ],
  },
  {
    label: 'Monitoreos',
    children: [
      { label: 'Lista', to: '/monitoreos/lista' },
      { label: 'Crear', to: '/monitoreos/crear' },
    ],
  },
  {
    label: 'Nómina',
    roles: ['AGRICOLA_PRODUCTOR', 'AGROQUIMICA_ADMIN'],
    children: [
      { label: 'Empleados', to: '/nomina/empleados' },
      { label: 'Periodos', to: '/nomina/periodos' },
      { label: 'Pagos', to: '/nomina/pagos' },
      { label: 'Reportes', to: '/nomina/reportes' },
    ],
  },
  {
    label: 'Configuración',
    children: [
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
