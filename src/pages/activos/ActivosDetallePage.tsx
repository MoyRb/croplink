import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Toast } from '../../components/ui/Toast'
import {
  deleteActivo,
  getActivo,
  listMantenimientos,
  updateActivo,
  type Activo,
  type ActivoEstado,
  type ActivoTipo,
  type ActivoUbicacion,
} from '../../lib/store/activos'
import { cn } from '../../lib/utils'

const selectClassName =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const textareaClassName =
  'w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const estadoStyles: Record<ActivoEstado, string> = {
  Activo: 'bg-emerald-100 text-emerald-700',
  'En reparación': 'bg-amber-100 text-amber-700',
  'Fuera de servicio': 'bg-red-100 text-red-700',
  'Dado de baja': 'bg-gray-200 text-gray-600',
}

const optionalValue = (value: string) => (value.trim() ? value.trim() : undefined)

const formatCurrency = (value?: number) => {
  if (value === undefined) return '—'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const buildEditForm = (activo: Activo) => ({
  tipo: activo.tipo,
  nombre: activo.nombre,
  categoria: activo.categoria,
  marca: activo.marca ?? '',
  modelo: activo.modelo ?? '',
  serieVIN: activo.serieVIN ?? '',
  placa: activo.placa ?? '',
  ubicacion: activo.ubicacion,
  ubicacionDetalle: activo.ubicacionDetalle ?? '',
  responsable: activo.responsable ?? '',
  estado: activo.estado,
  fechaCompra: activo.fechaCompra ?? '',
  costoCompra: activo.costoCompra?.toString() ?? '',
  notas: activo.notas ?? '',
})

export function ActivosDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [activo, setActivo] = useState<Activo | null>(() => (id ? getActivo(id) ?? null : null))
  const [toastVisible, setToastVisible] = useState(() => location.state?.toast === 'created')
  const [toastMessage, setToastMessage] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [editForm, setEditForm] = useState(() =>
    activo
      ? buildEditForm(activo)
      : {
          tipo: 'Herramienta' as ActivoTipo,
          nombre: '',
          categoria: '',
          marca: '',
          modelo: '',
          serieVIN: '',
          placa: '',
          ubicacion: 'Bodega' as ActivoUbicacion,
          ubicacionDetalle: '',
          responsable: '',
          estado: 'Activo' as ActivoEstado,
          fechaCompra: '',
          costoCompra: '',
          notas: '',
        },
  )

  useEffect(() => {
    if (!id) return
    const stored = getActivo(id) ?? null
    setActivo(stored)
    if (stored) {
      setEditForm(buildEditForm(stored))
    }
  }, [id])

  useEffect(() => {
    if (location.state?.toast === 'created') {
      setToastVisible(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!toastVisible && !toastMessage) return
    const timer = window.setTimeout(() => {
      setToastVisible(false)
      setToastMessage('')
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [toastVisible, toastMessage])

  const mantenimientos = useMemo(() => (id ? listMantenimientos(id) : []), [id])
  const recientes = mantenimientos.slice(0, 5)

  if (!activo) {
    return (
      <Card>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Activo no encontrado</h2>
          <p className="text-sm text-gray-500">Revisa que el activo exista en la lista.</p>
          <Button variant="secondary" onClick={() => navigate('/activos/lista')}>
            Volver a lista
          </Button>
        </div>
      </Card>
    )
  }

  const handleEstadoChange = (estado: ActivoEstado) => {
    const updated = updateActivo(activo.id, { estado })
    if (updated) {
      setActivo(updated)
      setToastMessage(`Estado actualizado a ${estado}.`)
    }
  }

  const handleEditar = () => {
    const errores: string[] = []

    if (!editForm.nombre.trim()) {
      errores.push('El nombre es obligatorio.')
    }

    if (!editForm.tipo) {
      errores.push('El tipo de activo es obligatorio.')
    }

    if (editForm.tipo === 'Vehículo') {
      if (!editForm.placa.trim() && !editForm.serieVIN.trim()) {
        errores.push('Para vehículos se requiere placa o VIN.')
      }
    }

    if (editForm.costoCompra && Number(editForm.costoCompra) < 0) {
      errores.push('El costo de compra debe ser mayor o igual a 0.')
    }

    if (errores.length > 0) {
      setFormError(errores[0])
      return
    }

    const updated = updateActivo(activo.id, {
      tipo: editForm.tipo,
      nombre: editForm.nombre.trim(),
      categoria: editForm.categoria.trim() || 'Sin categoría',
      marca: optionalValue(editForm.marca),
      modelo: optionalValue(editForm.modelo),
      serieVIN: optionalValue(editForm.serieVIN),
      placa: optionalValue(editForm.placa),
      ubicacion: editForm.ubicacion,
      ubicacionDetalle: optionalValue(editForm.ubicacionDetalle),
      responsable: optionalValue(editForm.responsable),
      estado: editForm.estado,
      fechaCompra: optionalValue(editForm.fechaCompra),
      costoCompra: editForm.costoCompra ? Number(editForm.costoCompra) : undefined,
      notas: optionalValue(editForm.notas),
    })

    if (updated) {
      setActivo(updated)
      setEditOpen(false)
      setFormError('')
      setToastMessage('Activo actualizado.')
    }
  }

  const handleBaja = () => {
    const updated = deleteActivo(activo.id)
    if (updated) {
      setActivo(updated)
      setToastMessage('Activo dado de baja.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">{activo.nombre}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-gray-100 text-gray-700">{activo.tipo}</Badge>
            <Badge className={estadoStyles[activo.estado]}>{activo.estado}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            Editar activo
          </Button>
          <Button onClick={() => navigate(`/activos/${activo.id}/mantenimientos`)}>
            Registrar mantenimiento
          </Button>
        </div>
      </div>

      {toastVisible ? <Toast variant="success">Activo creado</Toast> : null}
      {toastMessage ? <Toast variant="success">{toastMessage}</Toast> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Datos generales</h2>
            <p className="text-sm text-gray-500">Información principal del activo.</p>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Categoría:</span> {activo.categoria}
            </p>
            <p>
              <span className="font-medium">Marca:</span> {activo.marca ?? '—'}
            </p>
            <p>
              <span className="font-medium">Modelo:</span> {activo.modelo ?? '—'}
            </p>
            <p>
              <span className="font-medium">Serie/VIN:</span> {activo.serieVIN ?? '—'}
            </p>
            <p>
              <span className="font-medium">Placa:</span> {activo.placa ?? '—'}
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ubicación</h2>
            <p className="text-sm text-gray-500">Responsables y ubicación física.</p>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Ubicación:</span> {activo.ubicacion}
            </p>
            <p>
              <span className="font-medium">Detalle:</span> {activo.ubicacionDetalle ?? '—'}
            </p>
            <p>
              <span className="font-medium">Responsable:</span> {activo.responsable ?? '—'}
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Compra</h2>
            <p className="text-sm text-gray-500">Datos financieros y fecha.</p>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Fecha:</span> {formatDate(activo.fechaCompra)}
            </p>
            <p>
              <span className="font-medium">Costo:</span> {formatCurrency(activo.costoCompra)}
            </p>
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Últimos mantenimientos</h2>
            <p className="text-sm text-gray-500">Resumen de actividades recientes.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/activos/${activo.id}/mantenimientos`)}>
            Ver historial completo
          </Button>
        </div>
        {recientes.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay mantenimientos registrados.</p>
        ) : (
          <div className="space-y-3">
            {recientes.map((mantenimiento) => (
              <div
                key={mantenimiento.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E5E7EB] bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{mantenimiento.descripcion}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(mantenimiento.fecha)} · {mantenimiento.tipo} ·{' '}
                    {mantenimiento.estatus}
                  </p>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(mantenimiento.costo)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => handleEstadoChange('En reparación')}>
            Marcar en reparación
          </Button>
          <Button variant="secondary" onClick={() => handleEstadoChange('Fuera de servicio')}>
            Marcar fuera de servicio
          </Button>
          <Button variant="ghost" onClick={handleBaja}>
            Dar de baja
          </Button>
        </div>
      </Card>

      <Modal open={editOpen} title="Editar activo" onClose={() => setEditOpen(false)}>
        <div className="space-y-4">
          {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={editForm.tipo}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, tipo: event.target.value as ActivoTipo }))
                }
              >
                <option value="Vehículo">Vehículo</option>
                <option value="Herramienta">Herramienta</option>
                <option value="Equipo">Equipo</option>
                <option value="Consumible">Consumible</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre</label>
              <Input
                className="mt-2"
                value={editForm.nombre}
                onChange={(event) => setEditForm((prev) => ({ ...prev, nombre: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <Input
                className="mt-2"
                value={editForm.categoria}
                onChange={(event) => setEditForm((prev) => ({ ...prev, categoria: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Marca</label>
              <Input
                className="mt-2"
                value={editForm.marca}
                onChange={(event) => setEditForm((prev) => ({ ...prev, marca: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Modelo</label>
              <Input
                className="mt-2"
                value={editForm.modelo}
                onChange={(event) => setEditForm((prev) => ({ ...prev, modelo: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Serie / VIN</label>
              <Input
                className="mt-2"
                value={editForm.serieVIN}
                onChange={(event) => setEditForm((prev) => ({ ...prev, serieVIN: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Placa</label>
              <Input
                className="mt-2"
                value={editForm.placa}
                onChange={(event) => setEditForm((prev) => ({ ...prev, placa: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ubicación</label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={editForm.ubicacion}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, ubicacion: event.target.value as ActivoUbicacion }))
                }
              >
                <option value="Bodega">Bodega</option>
                <option value="Rancho">Rancho</option>
                <option value="Taller">Taller</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Detalle de ubicación</label>
              <Input
                className="mt-2"
                value={editForm.ubicacionDetalle}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, ubicacionDetalle: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Responsable</label>
              <Input
                className="mt-2"
                value={editForm.responsable}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, responsable: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={editForm.estado}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, estado: event.target.value as ActivoEstado }))
                }
              >
                <option value="Activo">Activo</option>
                <option value="En reparación">En reparación</option>
                <option value="Fuera de servicio">Fuera de servicio</option>
                <option value="Dado de baja">Dado de baja</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha de compra</label>
              <Input
                className="mt-2"
                type="date"
                value={editForm.fechaCompra}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, fechaCompra: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Costo de compra</label>
              <Input
                className="mt-2"
                type="number"
                min={0}
                value={editForm.costoCompra}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, costoCompra: event.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              className={cn(textareaClassName, 'mt-2')}
              rows={4}
              value={editForm.notas}
              onChange={(event) => setEditForm((prev) => ({ ...prev, notas: event.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleEditar}>Guardar cambios</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
