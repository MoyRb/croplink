import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'

export function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [toastVisible, setToastVisible] = useState(() => location.state?.toast === 'unauthorized')

  useEffect(() => {
    if (location.state?.toast === 'unauthorized') {
      setToastVisible(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!toastVisible) return
    const timer = window.setTimeout(() => setToastVisible(false), 3000)
    return () => window.clearTimeout(timer)
  }, [toastVisible])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen operativo y métricas clave.</p>
        </div>
        <Button>Crear requisición</Button>
      </div>

      {toastVisible ? <Toast>No autorizado</Toast> : null}

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: 'Requisiciones abiertas', value: '18', trend: '+6%' },
          { label: 'Órdenes en curso', value: '12', trend: '+2%' },
          { label: 'Ahorro mensual', value: '$24.5k', trend: '+11%' },
        ].map((item) => (
          <Card key={item.label}>
            <div className="text-sm text-gray-500">{item.label}</div>
            <div className="mt-3 text-2xl font-semibold text-gray-900">{item.value}</div>
            <Badge className="mt-4" variant="success">
              {item.trend} vs. mes anterior
            </Badge>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Últimas requisiciones</h2>
            <p className="text-sm text-gray-500">Seguimiento rápido de prioridades.</p>
          </div>
          <Button variant="secondary">Ver todas</Button>
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>ID</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Proveedor sugerido</TableHead>
                <TableHead>Estado</TableHead>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'REQ-2034', area: 'Mantenimiento', vendor: 'GreenSupply', status: 'En revisión' },
                { id: 'REQ-2035', area: 'Operaciones', vendor: 'SupplyOne', status: 'Aprobada' },
                { id: 'REQ-2036', area: 'Compras', vendor: 'FarmHub', status: 'En comparativa' },
              ].map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-gray-900">{row.id}</TableCell>
                  <TableCell>{row.area}</TableCell>
                  <TableCell>{row.vendor}</TableCell>
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
