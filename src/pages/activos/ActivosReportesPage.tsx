import { useMemo } from 'react'

import { Card } from '../../components/ui/Card'
import { listActivos, getAllMantenimientos, type ActivoTipo } from '../../lib/store/activos'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

const tipos: ActivoTipo[] = ['Vehículo', 'Herramienta', 'Equipo', 'Consumible']

export function ActivosReportesPage() {
  const activos = useMemo(() => listActivos(), [])
  const mantenimientos = useMemo(() => getAllMantenimientos(), [])

  const stats = useMemo(() => {
    const totalPorTipo = tipos.reduce<Record<ActivoTipo, number>>(
      (acc, tipo) => ({ ...acc, [tipo]: 0 }),
      {
        Vehículo: 0,
        Herramienta: 0,
        Equipo: 0,
        Consumible: 0,
      },
    )

    activos.forEach((activo) => {
      totalPorTipo[activo.tipo] += 1
    })

    const totalEnReparacion = activos.filter((activo) => activo.estado === 'En reparación').length

    const now = new Date()
    const last30 = new Date(now)
    last30.setDate(last30.getDate() - 30)
    const lastYear = new Date(now)
    lastYear.setFullYear(lastYear.getFullYear() - 1)

    const gasto30 = mantenimientos
      .filter((item) => item.estatus === 'Realizado')
      .filter((item) => new Date(item.fecha) >= last30)
      .reduce((acc, item) => acc + item.costo, 0)

    const gastoYear = mantenimientos
      .filter((item) => item.estatus === 'Realizado')
      .filter((item) => new Date(item.fecha) >= lastYear)
      .reduce((acc, item) => acc + item.costo, 0)

    const today = new Date().toISOString().slice(0, 10)
    const proximosServicios = mantenimientos.filter(
      (item) => item.proximoServicio && item.proximoServicio >= today,
    ).length

    return {
      totalPorTipo,
      totalEnReparacion,
      gasto30,
      gastoYear,
      proximosServicios,
    }
  }, [activos, mantenimientos])

  if (activos.length === 0 && mantenimientos.length === 0) {
    return (
      <Card>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Reportes de activos</h1>
          <p className="text-sm text-gray-500">No hay datos suficientes para mostrar KPIs.</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reportes de activos</h1>
        <p className="text-sm text-gray-500">KPIs rápidos para flotilla, bodega y mantenimiento.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tipos.map((tipo) => (
          <Card key={tipo}>
            <div className="text-sm text-gray-500">Total {tipo}</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {stats.totalPorTipo[tipo]}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm text-gray-500">Activos en reparación</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{stats.totalEnReparacion}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Próximos servicios</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{stats.proximosServicios}</div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm text-gray-500">Gasto de mantenimiento (últimos 30 días)</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(stats.gasto30)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Gasto de mantenimiento (último año)</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(stats.gastoYear)}
          </div>
        </Card>
      </div>
    </div>
  )
}
