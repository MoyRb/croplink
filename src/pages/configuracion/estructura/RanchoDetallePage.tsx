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
  const sectors = ranch
    ? catalog.sectors
        .filter((item) => item.ranchId === ranch.id)
        .sort((a, b) => (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER))
    : []
  const totalTunnels = sectors.reduce((sum, sector) => sum + (sector.tunnelCount ?? catalog.tunnels.filter((item) => item.sectorId === sector.id).length), 0)
  const operationName = ranch ? catalog.operations.find((item) => item.id === ranch.operationId)?.name ?? '—' : '—'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Detalle de rancho</h1>
          <p className="text-sm text-gray-500">Resumen del rancho con su contexto agrícola y sus sectores capturados desde el alta.</p>
        </div>
        <Link to="/configuracion/estructura/ranchos">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-gray-500">Cargando detalle del rancho...</p> : null}
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      {ranch ? (
        <>
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{ranch.name}</h2>
                <p className="mt-1 text-sm text-gray-500">Operación: {operationName}</p>
                {ranch.description ? <p className="mt-2 text-sm text-gray-600">{ranch.description}</p> : null}
              </div>
              <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                <p><span className="font-medium text-gray-900">Superficie total:</span> {formatArea(getRanchSurfaceTotal(ranch, catalog))}</p>
                <p><span className="font-medium text-gray-900">Sectores:</span> {sectors.length}</p>
                <p><span className="font-medium text-gray-900">Túneles capturados:</span> {totalTunnels}</p>
                <p><span className="font-medium text-gray-900">Temporadas:</span> {assignments.length > 0 ? assignments.map((item) => item.seasonName).join(', ') : '—'}</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Contexto agrícola</h2>
            {assignments.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-2xl border border-[#E5E7EB] p-4 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-900">Cultivo:</span> {assignment.cropName}</p>
                    <p><span className="font-medium text-gray-900">Variedad:</span> {assignment.variety}</p>
                    <p><span className="font-medium text-gray-900">Temporada:</span> {assignment.seasonName}</p>
                    <p><span className="font-medium text-gray-900">Duración prevista:</span> {assignment.durationLabel}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Este rancho todavía no tiene cultivo y temporada asignados.</p>
            )}
          </Card>

          <Table>
            <thead>
              <tr>
                <TableHead>Sector</TableHead>
                <TableHead>Superficie del sector (ha)</TableHead>
                <TableHead>Túneles</TableHead>
                <TableHead>Cultivo</TableHead>
                <TableHead>Variedad</TableHead>
                <TableHead>Temporada</TableHead>
                <TableHead>Duración prevista</TableHead>
              </tr>
            </thead>
            <tbody>
              {sectors.length > 0 ? (
                sectors.flatMap((sector) => {
                  const sectorAssignments = assignments.length > 0
                    ? assignments
                    : [{ id: `${sector.id}-empty`, cropName: '—', variety: '—', seasonName: '—', durationLabel: '—' }]

                  return sectorAssignments.map((assignment, index) => (
                    <TableRow key={`${sector.id}-${assignment.id}-${index}`}>
                      <TableCell>{sector.name}</TableCell>
                      <TableCell>{formatArea(sector.areaHa)}</TableCell>
                      <TableCell>{sector.tunnelCount ?? catalog.tunnels.filter((item) => item.sectorId === sector.id).length}</TableCell>
                      <TableCell>{assignment.cropName}</TableCell>
                      <TableCell>{assignment.variety}</TableCell>
                      <TableCell>{assignment.seasonName}</TableCell>
                      <TableCell>{assignment.durationLabel}</TableCell>
                    </TableRow>
                  ))
                })
              ) : (
                <TableRow>
                  <TableCell className="text-center text-gray-500" colSpan={7}>No hay sectores registrados para este rancho.</TableCell>
                </TableRow>
              )}
            </tbody>
          </Table>
        </>
      ) : null}
    </div>
  )
}
