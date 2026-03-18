import { Link } from 'react-router-dom'

import { Card } from '../../../components/ui/Card'
import { useStructureCatalog } from './useStructureCatalog'

const modules = [
  { key: 'operaciones', label: 'Operaciones', to: '/configuracion/estructura/operaciones' },
  { key: 'ranchos', label: 'Ranchos', to: '/configuracion/estructura/ranchos' },
]

export function EstructuraDashboardPage() {
  const { catalog, isLoading, loadError } = useStructureCatalog()
  const counters: Record<string, number> = {
    operaciones: catalog.operations.length,
    ranchos: catalog.ranches.length,
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Configuración · Estructura</h1>
        <p className="text-sm text-gray-500">El flujo visible se concentra en operaciones y ranchos, dejando la captura agrícola básica dentro del alta de rancho.</p>
      </div>
      {isLoading ? <p className="text-sm text-gray-500">Cargando estructura...</p> : null}
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
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
