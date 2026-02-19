import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { useRequisicionesStore, type Requisicion, type RequisicionEstado } from '../../lib/store/requisiciones'
import { cn } from '../../lib/utils'

const statusTabs: Array<RequisicionEstado | 'Todos'> = [
  'Todos',
  'Pendiente',
  'En revisión',
  'En comparativa',
  'Aprobada',
  'Rechazada',
  'Completada',
]

const statusBadgeStyles: Record<RequisicionEstado, string> = {
  Pendiente: 'bg-amber-100 text-amber-700',
  'En revisión': 'bg-blue-100 text-blue-700',
  'En comparativa': 'bg-purple-100 text-purple-700',
  Aprobada: 'bg-emerald-100 text-emerald-700',
  Rechazada: 'bg-red-100 text-red-700',
  Completada: 'bg-green-100 text-green-700',
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

export function RequisicionesListaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { requisiciones } = useRequisicionesStore()
  const [activeStatus, setActiveStatus] = useState<RequisicionEstado | 'Todos'>('Todos')
  const [search, setSearch] = useState('')
  const [ranchFilter, setRanchFilter] = useState('Todos')
  const [selected, setSelected] = useState<Requisicion | null>(null)
  const [toastVisible, setToastVisible] = useState(() => location.state?.toast === 'created')

  useEffect(() => {
    if (location.state?.toast === 'created') {
      setToastVisible(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!toastVisible) return
    const timer = window.setTimeout(() => setToastVisible(false), 3000)
    return () => window.clearTimeout(timer)
  }, [toastVisible])

  const ranchOptions = useMemo(() => {
    const ranches = new Set<string>()
    requisiciones.forEach((requisicion) => {
      if (requisicion.operationContext?.ranch?.name) {
        ranches.add(requisicion.operationContext.ranch.name)
      }
    })
    return ['Todos', ...Array.from(ranches).sort((a, b) => a.localeCompare(b, 'es'))]
  }, [requisiciones])

  const filteredRequisiciones = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return requisiciones.filter((requisicion) => {
      const matchesStatus = activeStatus === 'Todos' || requisicion.estado === activeStatus
      const matchesSearch =
        !normalizedSearch ||
        requisicion.id.toLowerCase().includes(normalizedSearch) ||
        requisicion.producto.toLowerCase().includes(normalizedSearch)
      const ranchName = requisicion.operationContext?.ranch?.name ?? 'Sin rancho'
      const matchesRanch = ranchFilter === 'Todos' || ranchFilter === ranchName
      return matchesStatus && matchesSearch && matchesRanch
    })
  }, [activeStatus, ranchFilter, requisiciones, search])

  const handleDuplicate = (requisicion: Requisicion) => {
    navigate('/requisiciones/crear', {
      state: {
        prefill: {
          producto: requisicion.producto,
          cantidad: requisicion.cantidad,
          unidad: requisicion.unidad,
          centroCosto: requisicion.centroCosto,
          prioridad: requisicion.prioridad,
          notas: requisicion.notas,
        },
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Requisiciones</h1>
          <p className="text-sm text-gray-500">Lista centralizada de solicitudes.</p>
        </div>
        <Button onClick={() => navigate('/requisiciones/crear')}>Crear nueva</Button>
      </div>

      {toastVisible ? <Toast variant="success">Requisición creada</Toast> : null}

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Solicitudes activas</h2>
              <p className="text-sm text-gray-500">Gestiona prioridades y aprobaciones.</p>
            </div>
            <div className="flex w-full max-w-xl gap-2">
              <Input
                className="w-full"
                placeholder="Buscar por ID o producto"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                value={ranchFilter}
                onChange={(event) => setRanchFilter(event.target.value)}
              >
                {ranchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'Todos' ? 'Todos los ranchos' : option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusTabs.map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={cn(
                  'rounded-full border px-4 py-2 text-xs font-semibold transition',
                  activeStatus === status
                    ? 'border-[#00C050] bg-[#DBFAE6] text-[#0B6B2A]'
                    : 'border-[#E5E7EB] bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>ID</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Cultivo</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Fecha</TableHead>
              </tr>
            </thead>
            <tbody>
              {filteredRequisiciones.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer transition hover:bg-gray-50"
                  onClick={() => setSelected(row)}
                >
                  <TableCell className="font-medium text-gray-900">{row.id}</TableCell>
                  <TableCell>{row.producto}</TableCell>
                  <TableCell>
                    {row.cantidad} {row.unidad}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeStyles[row.estado]}>{row.estado}</Badge>
                  </TableCell>
                  <TableCell>{row.operationContext?.ranch?.name ?? 'Sin rancho'}</TableCell>
                  <TableCell>{row.operationContext?.crop || 'Sin cultivo'}</TableCell>
                  <TableCell>{formatCurrency(row.total)}</TableCell>
                  <TableCell>{formatDate(row.fecha)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          {filteredRequisiciones.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No encontramos requisiciones con esos filtros.
            </p>
          ) : null}
        </div>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            role="button"
            tabIndex={0}
            onClick={() => setSelected(null)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSelected(null)
            }}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selected.producto}</h3>
                <p className="text-sm text-gray-500">Detalle de requisición</p>
              </div>
              <button
                className="rounded-full px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100"
                onClick={() => setSelected(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">ID</span>
                <span className="font-medium text-gray-900">{selected.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Cantidad</span>
                <span className="font-medium text-gray-900">
                  {selected.cantidad} {selected.unidad}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Estado</span>
                <Badge className={statusBadgeStyles[selected.estado]}>{selected.estado}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-medium text-gray-900">{formatCurrency(selected.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-900">{formatDate(selected.fecha)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Rancho</span>
                <span className="font-medium text-gray-900">{selected.operationContext?.ranch?.name ?? 'Sin rancho'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Cultivo</span>
                <span className="font-medium text-gray-900">{selected.operationContext?.crop || 'Sin cultivo'}</span>
              </div>
              <div>
                <span className="text-gray-500">Notas</span>
                <p className="mt-2 rounded-2xl border border-[#E5E7EB] bg-gray-50 p-3 text-sm text-gray-600">
                  {selected.notas || 'Sin notas adicionales.'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900">Adjuntos</h4>
              {selected.adjunto ? (
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{selected.adjunto.nombre}</div>
                    <div className="text-xs text-gray-500">{selected.adjunto.tamano}</div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (selected.adjunto?.url) {
                        window.open(selected.adjunto.url, '_blank')
                      }
                    }}
                  >
                    Ver
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No hay adjuntos en esta requisición.</p>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="secondary" onClick={() => handleDuplicate(selected)}>
                Duplicar
              </Button>
              <Button onClick={() => setSelected(null)}>Cerrar detalle</Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
