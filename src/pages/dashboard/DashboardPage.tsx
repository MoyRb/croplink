import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabaseClient'

type DashboardRequisition = {
  id: string
  status: string
  cost_center: string | null
}

export function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [toastVisible, setToastVisible] = useState(() => location.state?.toast === 'unauthorized')
  const [requisitions, setRequisitions] = useState<DashboardRequisition[]>([])

  useEffect(() => {
    if (location.state?.toast !== 'unauthorized') return

    const timer = window.setTimeout(() => {
      setToastVisible(true)
      navigate(location.pathname, { replace: true })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!toastVisible) return
    const timer = window.setTimeout(() => setToastVisible(false), 3000)
    return () => window.clearTimeout(timer)
  }, [toastVisible])

  useEffect(() => {
    const loadDashboard = async () => {
      const { data, error } = await supabase
        .from('requisitions')
        .select('id, status, cost_center')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error cargando dashboard:', error)
        setRequisitions([])
        return
      }

      setRequisitions((data as DashboardRequisition[] | null) ?? [])
    }

    void loadDashboard()
  }, [])

  const metrics = useMemo(() => {
    const abiertas = requisitions.filter((item) => item.status !== 'completed' && item.status !== 'rejected').length
    const enCurso = requisitions.filter((item) => item.status === 'in_review' || item.status === 'in_comparative').length
    return {
      abiertas,
      enCurso,
      ahorroMensual: 0,
    }
  }, [requisitions])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen operativo y métricas clave.</p>
        </div>
        <Button onClick={() => navigate('/requisiciones/crear')}>Crear requisición</Button>
      </div>

      {toastVisible ? <Toast>No autorizado</Toast> : null}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <div className="text-sm text-gray-500">Requisiciones abiertas</div>
          <div className="mt-3 text-2xl font-semibold text-gray-900">{metrics.abiertas}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Órdenes en curso</div>
          <div className="mt-3 text-2xl font-semibold text-gray-900">{metrics.enCurso}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Ahorro mensual</div>
          <div className="mt-3 text-2xl font-semibold text-gray-900">$0</div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Últimas requisiciones</h2>
            <p className="text-sm text-gray-500">Seguimiento rápido de prioridades.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/requisiciones/lista')}>Ver todas</Button>
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>ID</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Estado</TableHead>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-gray-900">{row.id}</TableCell>
                  <TableCell>{row.cost_center || '—'}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
              {requisitions.length === 0 ? (
                <TableRow>
                  <td colSpan={3} className="px-2 py-4 text-sm text-gray-500">No hay datos todavía.</td>
                </TableRow>
              ) : null}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
