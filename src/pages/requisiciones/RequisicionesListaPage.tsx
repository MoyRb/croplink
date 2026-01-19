import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'

export function RequisicionesListaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Requisiciones</h1>
          <p className="text-sm text-gray-500">Lista centralizada de solicitudes.</p>
        </div>
        <Button>Crear nueva</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Solicitudes activas</h2>
            <p className="text-sm text-gray-500">Gestiona prioridades y aprobaciones.</p>
          </div>
          <Button variant="secondary">Filtrar</Button>
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Requisición</TableHead>
                <TableHead>Centro de costo</TableHead>
                <TableHead>Monto estimado</TableHead>
                <TableHead>Estado</TableHead>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'REQ-2042', cost: 'Operaciones', amount: '$4,800', status: 'En revisión' },
                { id: 'REQ-2043', cost: 'Mantenimiento', amount: '$9,200', status: 'En comparativa' },
                { id: 'REQ-2044', cost: 'Compras', amount: '$12,000', status: 'Aprobada' },
              ].map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-gray-900">{row.id}</TableCell>
                  <TableCell>{row.cost}</TableCell>
                  <TableCell>{row.amount}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'Aprobada' ? 'success' : 'neutral'}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
