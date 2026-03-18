import { Link, Navigate, useParams } from 'react-router-dom'

import { Card } from '../../../components/ui/Card'
import { Table, TableCell, TableHead, TableRow } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { formatArea, getRanchAssignments, getRanchSurfaceTotal } from './structureUtils'
import { useStructureCatalog } from './useStructureCatalog'

export function RanchoDetallePage() {
  const { ranchId } = useParams<{ ranchId: string }>()
  const { catalog, isLoading, loadError } = useStructureCatalog()

  if (!ranchId) return <Navigate to="/configuracion/estructura/ranchos" replace />

  const ranch = catalog.ranches.find((item) => item.id === ranchId)

  if (!isLoading && !ranch) {
    return <Navigate to="/configuracion/estructura/ranchos" replace />
  }

  const assignments = ranch ? getRanchAssignments(ranch.id, catalog) : []
  const sectors = ranch ? catalog.sectors.filter((item) => item.ranchId === ranch.id) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Detalle de rancho</h1>
          <p className="text-sm text-gray-500">Vista resumida de cultivo, variedad y sectores.</p>
        </div>
        <Link to="/configuracion/estructura/ranchos">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-gray-500">Cargando detalle del rancho...</p> : null}
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      {ranch ? (
        <>
          <Card className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">{ranch.name}</h2>
            <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-3">
              <p><span className="font-medium text-gray-900">Superficie total:</span> {formatArea(getRanchSurfaceTotal(ranch, catalog))}</p>
              <p><span className="font-medium text-gray-900">Temporadas:</span> {assignments.length > 0 ? assignments.map((item) => item.seasonName).join(', ') : '—'}</p>
              <p><span className="font-medium text-gray-900">Duración prevista:</span> {assignments.length > 0 ? assignments.map((item) => item.durationLabel).join(' | ') : '—'}</p>
            </div>
          </Card>

          <Table>
            <thead>
              <tr>
                <TableHead>Cultivo</TableHead>
                <TableHead>Variedad</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Superficie del sector (ha)</TableHead>
                <TableHead>Número de túneles</TableHead>
              </tr>
            </thead>
            <tbody>
              {sectors.length > 0 ? (
                sectors.flatMap((sector) => {
                  const sectorAssignments = assignments.length > 0 ? assignments : [{ id: `${sector.id}-empty`, cropName: '—', variety: '—', seasonName: '—', durationLabel: '—' }]

                  return sectorAssignments.map((assignment, index) => (
                    <TableRow key={`${sector.id}-${assignment.id}-${index}`}>
                      <TableCell>{assignment.cropName}</TableCell>
                      <TableCell>{assignment.variety}</TableCell>
                      <TableCell>{sector.name}</TableCell>
                      <TableCell>{sector.areaHa != null ? sector.areaHa : '—'}</TableCell>
                      <TableCell>{sector.tunnelCount ?? catalog.tunnels.filter((item) => item.sectorId === sector.id).length}</TableCell>
                    </TableRow>
                  ))
                })
              ) : (
                <TableRow>
                  <TableCell className="text-center text-gray-500" colSpan={5}>No hay sectores registrados para este rancho.</TableCell>
                </TableRow>
              )}
            </tbody>
          </Table>
        </>
      ) : null}
    </div>
  )
}
