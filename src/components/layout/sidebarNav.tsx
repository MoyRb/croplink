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
    to: '/requisiciones/lista',
    matchPaths: ['/requisiciones/'],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Building2,
    to: '/inventario',
  },
  {
    id: 'activos',
    label: 'Activos',
    icon: HardHat,
    roles: ACTIVOS_ALLOWED_ROLES,
    to: '/activos/lista',
    matchPaths: ['/activos/'],
  },
  {
    id: 'monitoreos',
    label: 'Monitoreos',
    icon: Sprout,
    to: '/monitoreos/lista',
    matchPaths: ['/monitoreos/'],
  },
  {
    id: 'nomina',
    label: 'Nómina',
    icon: Landmark,
    roles: ['AGRICOLA_PRODUCTOR', 'AGROQUIMICA_ADMIN'],
    to: '/nomina/empleados',
    matchPaths: ['/nomina/'],
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
