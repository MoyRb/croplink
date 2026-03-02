import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { getCosechaById } from '../../lib/store/cosechas'
import { getEmpleados } from '../../lib/store/nomina'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value)

export function CosechasDetallePage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const cosecha = useMemo(() => getCosechaById(id), [id])
  const empleadosMap = useMemo(() => Object.fromEntries(getEmpleados().map((item) => [item.id, item.nombreCompleto])), [])

  if (!cosecha) {
    return (
      <Card>
        <p className="text-sm text-gray-600">No encontramos la cosecha solicitada.</p>
        <div className="mt-4">
          <Button onClick={() => navigate('/cosechas/lista')}>Volver</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cosecha {cosecha.id}</h1>
          <p className="text-sm text-gray-500">{cosecha.fecha} · {cosecha.ranchoNombre} · {cosecha.sectorNombre}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/cosechas/lista')}>Volver a lista</Button>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <p><span className="text-gray-500">Actividad:</span> {cosecha.actividad}</p>
          <p><span className="text-gray-500">Cultivo/Temporada:</span> {cosecha.cultivo} / {cosecha.temporada}</p>
          <p><span className="text-gray-500">Cantidad total:</span> {cosecha.cantidadTotal} {cosecha.unidad}</p>
          <p><span className="text-gray-500">Tarifa:</span> {formatCurrency(cosecha.tarifa)}</p>
          <p><span className="text-gray-500">Total pagado:</span> {formatCurrency(cosecha.totalPagado)}</p>
          <p><span className="text-gray-500">Costo unitario:</span> {formatCurrency(cosecha.costoUnitario)}</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Cuadrilla (work_logs generados)</h2>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Empleado</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Pago estimado</TableHead>
              </tr>
            </thead>
            <tbody>
              {cosecha.cuadrilla.map((row) => (
                <TableRow key={`${row.empleadoId}-${row.unidades}`}>
                  <TableCell>{empleadosMap[row.empleadoId] ?? row.empleadoId}</TableCell>
                  <TableCell>{row.unidades}</TableCell>
                  <TableCell>{formatCurrency(row.unidades * cosecha.tarifa)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
