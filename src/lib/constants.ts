import { BRAND } from './brand'

export const APP_NAME = BRAND.product

export const NAV_SECTIONS = [
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
    label: 'Monitoreos',
    to: '/monitoreos',
  },
  {
    label: 'Configuración',
    to: '/configuracion',
  },
]
