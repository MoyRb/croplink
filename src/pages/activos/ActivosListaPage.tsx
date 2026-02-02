import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import {
  listActivos,
  type ActivoEstado,
  type ActivoTipo,
  type ActivoUbicacion,
} from '../../lib/store/activos'
import { cn } from '../../lib/utils'

const estadoStyles: Record<ActivoEstado, string> = {
  Activo: 'bg-emerald-100 text-emerald-700',
  'En reparación': 'bg-amber-100 text-amber-700',
  'Fuera de servicio': 'bg-red-100 text-red-700',
  'Dado de baja': 'bg-gray-200 text-gray-600',
}

const selectClassName =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

export function ActivosListaPage() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState<ActivoTipo | 'Todos'>('Todos')
  const [estado, setEstado] = useState<ActivoEstado | 'Todos'>('Todos')
  const [ubicacion, setUbicacion] = useState<ActivoUbicacion | 'Todos'>('Todos')
  const [search, setSearch] = useState('')

  const activos = useMemo(
    () =>
      listActivos({
        tipo,
        estado,
        ubicacion,
        search,
      }),
    [estado, search, tipo, ubicacion],
  )

  const renderEmpty = activos.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Activos</h1>
          <p className="text-sm text-gray-500">Inventario de flotilla, bodega y consumibles.</p>
        </div>
        <Button onClick={() => navigate('/activos/nuevo')}>Nuevo activo</Button>
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lista general</h2>
              <p className="text-sm text-gray-500">Filtra por tipo, estado o ubicación.</p>
            </div>
            <Input
              className="w-full max-w-xs"
              placeholder="Buscar por nombre, placa o VIN"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Tipo
              </label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={tipo}
                onChange={(event) => setTipo(event.target.value as ActivoTipo | 'Todos')}
              >
                <option value="Todos">Todos</option>
                <option value="Vehículo">Vehículo</option>
                <option value="Herramienta">Herramienta</option>
                <option value="Equipo">Equipo</option>
                <option value="Consumible">Consumible</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Estado
              </label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={estado}
                onChange={(event) => setEstado(event.target.value as ActivoEstado | 'Todos')}
              >
                <option value="Todos">Todos</option>
                <option value="Activo">Activo</option>
                <option value="En reparación">En reparación</option>
                <option value="Fuera de servicio">Fuera de servicio</option>
                <option value="Dado de baja">Dado de baja</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Ubicación
              </label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={ubicacion}
                onChange={(event) => setUbicacion(event.target.value as ActivoUbicacion | 'Todos')}
              >
                <option value="Todos">Todas</option>
                <option value="Bodega">Bodega</option>
                <option value="Rancho">Rancho</option>
                <option value="Taller">Taller</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Acciones</TableHead>
              </tr>
            </thead>
            <tbody>
              {activos.map((activo) => (
                <TableRow
                  key={activo.id}
                  className="cursor-pointer transition hover:bg-gray-50"
                  onClick={() => navigate(`/activos/${activo.id}`)}
                >
                  <TableCell className="font-medium text-gray-900">{activo.tipo}</TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-gray-900">{activo.nombre}</div>
                    <div className="text-xs text-gray-500">{activo.categoria}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700">{activo.ubicacion}</div>
                    <div className="text-xs text-gray-500">{activo.ubicacionDetalle ?? '—'}</div>
                  </TableCell>
                  <TableCell>{activo.responsable ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={estadoStyles[activo.estado]}>{activo.estado}</Badge>
                  </TableCell>
                  <TableCell>{activo.placa ?? '—'}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Button
                      variant="ghost"
                      onClick={() => navigate(`/activos/${activo.id}`)}
                    >
                      Ver detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          {renderEmpty ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No hay activos con los filtros seleccionados.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
