import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  ClipboardList,
  FolderCog,
  Gauge,
  HardHat,
  Landmark,
  Sprout,
} from 'lucide-react'

import { ACTIVOS_ALLOWED_ROLES, type UserRole } from '../../lib/auth/roles'

export type SidebarNavItem = {
  label: string
  to: string
  matchPaths?: string[]
}

export type SidebarNavSection = {
  id: string
  label: string
  icon: LucideIcon
  to?: string
  matchPaths?: string[]
  items?: SidebarNavItem[]
  roles?: UserRole[]
}

export const SIDEBAR_NAV: SidebarNavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Gauge,
    to: '/dashboard',
  },
  {
    id: 'requisiciones',
    label: 'Requisiciones',
    icon: ClipboardList,
    matchPaths: ['/requisiciones/'],
    items: [
      { label: 'Lista', to: '/requisiciones/lista' },
      { label: 'Crear', to: '/requisiciones/crear' },
      { label: 'Aprobaciones', to: '/requisiciones/aprobaciones' },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Building2,
    matchPaths: ['/inventario'],
    items: [
      { label: 'Compras generales', to: '/inventario/insumos' },
      { label: 'Movimientos', to: '/inventario/movimientos' },
    ],
  },
  {
    id: 'activos',
    label: 'Activos',
    icon: HardHat,
    roles: ACTIVOS_ALLOWED_ROLES,
    matchPaths: ['/activos/'],
    items: [
      { label: 'Lista', to: '/activos/lista' },
      { label: 'Nuevo', to: '/activos/nuevo' },
      { label: 'Reportes', to: '/activos/reportes' },
    ],
  },
  {
    id: 'monitoreos',
    label: 'Monitoreos',
    icon: Sprout,
    matchPaths: ['/monitoreos/'],
    items: [
      { label: 'Lista', to: '/monitoreos/lista' },
      { label: 'Crear', to: '/monitoreos/crear' },
    ],
  },
  {
    id: 'nomina',
    label: 'Nómina',
    icon: Landmark,
    roles: ['AGRICOLA_PRODUCTOR', 'AGROQUIMICA_ADMIN'],
    matchPaths: ['/nomina/'],
    items: [
      { label: 'Empleados', to: '/nomina/empleados' },
      { label: 'Registros', to: '/nomina/registros' },
      { label: 'Pagos', to: '/nomina/pagos' },
      { label: 'Reportes', to: '/nomina/reportes' },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: FolderCog,
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
