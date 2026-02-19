import { Link } from 'react-router-dom'

import { Card } from '../../../components/ui/Card'
import { getCatalog } from '../../../lib/operationCatalog/repo'

const modules = [
  { key: 'operaciones', label: 'Operaciones', to: '/configuracion/estructura/operaciones' },
  { key: 'ranchos', label: 'Ranchos', to: '/configuracion/estructura/ranchos' },
  { key: 'sectores', label: 'Sectores', to: '/configuracion/estructura/sectores' },
  { key: 'tuneles', label: 'Túneles', to: '/configuracion/estructura/tuneles' },
  { key: 'valvulas', label: 'Válvulas', to: '/configuracion/estructura/valvulas' },
  { key: 'cultivos', label: 'Cultivos', to: '/configuracion/estructura/cultivos' },
  { key: 'temporadas', label: 'Temporadas', to: '/configuracion/estructura/temporadas' },
]

export function EstructuraDashboardPage() {
  const catalog = getCatalog()
  const counters: Record<string, number> = {
    operaciones: catalog.operations.length,
    ranchos: catalog.ranches.length,
    sectores: catalog.sectors.length,
    tuneles: catalog.tunnels.length,
    valvulas: catalog.valves.length,
    cultivos: catalog.crops.length,
    temporadas: catalog.seasons.length,
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Configuración · Estructura</h1>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.key} to={module.to}>
            <Card className="space-y-2 transition hover:border-[#00C050]">
              <h2 className="text-lg font-semibold">{module.label}</h2>
              <p className="text-sm text-gray-500">Total: {counters[module.key]}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
