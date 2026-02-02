import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import {
  addMantenimiento,
  getActivo,
  listMantenimientos,
  markMantenimientoRealizado,
  type Activo,
  type MantenimientoAdjunto,
  type MantenimientoEstatus,
  type MantenimientoTipo,
} from '../../lib/store/activos'
import { cn } from '../../lib/utils'

const selectClassName =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const textareaClassName =
  'w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

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

const isValidAdjunto = (file: File) => file.type.startsWith('image/') || file.type === 'application/pdf'

export function ActivosMantenimientosPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activo, setActivo] = useState<Activo | null>(null)
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [adjunto, setAdjunto] = useState<MantenimientoAdjunto | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [formData, setFormData] = useState({
    fecha: '',
    tipo: 'Preventivo' as MantenimientoTipo,
    descripcion: '',
    proveedor: '',
    costo: '',
    estatus: 'Programado' as MantenimientoEstatus,
    odometro: '',
    proximoServicio: '',
  })

  useEffect(() => {
    if (!id) return
    setActivo(getActivo(id) ?? null)
  }, [id])

  const mantenimientos = useMemo(
    () => (id ? listMantenimientos(id) : []),
    [id, refreshKey],
  )

  const proximos = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return mantenimientos.filter(
      (item) => item.proximoServicio && item.proximoServicio >= today,
    )
  }, [mantenimientos])

  if (!activo) {
    return (
      <Card>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Activo no encontrado</h2>
          <p className="text-sm text-gray-500">Selecciona un activo válido.</p>
          <Button variant="secondary" onClick={() => navigate('/activos/lista')}>
            Volver a lista
          </Button>
        </div>
      </Card>
    )
  }

  const handleOpen = () => {
    setFormError('')
    setAdjunto(null)
    setFormData({
      fecha: '',
      tipo: 'Preventivo',
      descripcion: '',
      proveedor: '',
      costo: '',
      estatus: 'Programado',
      odometro: '',
      proximoServicio: '',
    })
    setOpen(true)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setAdjunto(null)
      return
    }

    if (!isValidAdjunto(file)) {
      setFormError('Solo se permiten imágenes o archivos PDF.')
      return
    }

    setAdjunto({
      name: file.name,
      size: file.size,
      type: file.type,
      localUrl: URL.createObjectURL(file),
    })
  }

  const handleSubmit = () => {
    const errores: string[] = []

    if (!formData.fecha) {
      errores.push('La fecha del mantenimiento es obligatoria.')
    }

    if (!formData.descripcion.trim()) {
      errores.push('La descripción es obligatoria.')
    }

    if (!formData.costo || Number(formData.costo) < 0) {
      errores.push('El costo debe ser mayor o igual a 0.')
    }

    if (activo.tipo === 'Vehículo' && !formData.odometro) {
      errores.push('El odómetro es obligatorio para vehículos.')
    }

    if (errores.length > 0) {
      setFormError(errores[0])
      return
    }

    addMantenimiento({
      activoId: activo.id,
      fecha: formData.fecha,
      tipo: formData.tipo,
      descripcion: formData.descripcion.trim(),
      proveedor: formData.proveedor.trim() ? formData.proveedor.trim() : undefined,
      costo: Number(formData.costo),
      estatus: formData.estatus,
      odometro: formData.odometro ? Number(formData.odometro) : undefined,
      proximoServicio: formData.proximoServicio ? formData.proximoServicio : undefined,
      adjunto: adjunto ?? undefined,
    })

    setOpen(false)
    setRefreshKey((prev) => prev + 1)
  }

  const handleMarkRealizado = (mantenimientoId: string) => {
    markMantenimientoRealizado(mantenimientoId)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mantenimientos</h1>
          <p className="text-sm text-gray-500">
            {activo.nombre} · {activo.tipo}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/activos/${activo.id}`)}>
            Volver a detalle
          </Button>
          <Button onClick={handleOpen}>Nuevo mantenimiento</Button>
        </div>
      </div>

      {proximos.length > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Próximos servicios</h2>
            <p className="text-sm text-gray-500">
              {proximos.length} servicios programados próximamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proximos.slice(0, 3).map((item) => (
              <Badge key={item.id} className="bg-blue-100 text-blue-700">
                {item.proximoServicio}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <Table>
          <thead>
            <tr>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estatus</TableHead>
              {activo.tipo === 'Vehículo' ? <TableHead>Odómetro</TableHead> : null}
              <TableHead>Proveedor</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Adjunto</TableHead>
              <TableHead>Acciones</TableHead>
            </tr>
          </thead>
          <tbody>
            {mantenimientos.map((mantenimiento) => (
              <TableRow key={mantenimiento.id}>
                <TableCell>{formatDate(mantenimiento.fecha)}</TableCell>
                <TableCell>{mantenimiento.tipo}</TableCell>
                <TableCell>
                  <Badge className="bg-gray-100 text-gray-700">{mantenimiento.estatus}</Badge>
                </TableCell>
                {activo.tipo === 'Vehículo' ? (
                  <TableCell>{mantenimiento.odometro ?? '—'}</TableCell>
                ) : null}
                <TableCell>{mantenimiento.proveedor ?? '—'}</TableCell>
                <TableCell>{formatCurrency(mantenimiento.costo)}</TableCell>
                <TableCell>
                  {mantenimiento.adjunto ? (
                    <div className="text-xs text-gray-600">
                      {mantenimiento.adjunto.localUrl ? (
                        <a
                          className="font-semibold text-[#0B6B2A]"
                          href={mantenimiento.adjunto.localUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {mantenimiento.adjunto.name}
                        </a>
                      ) : (
                        <span>{mantenimiento.adjunto.name}</span>
                      )}
                      <div className="text-[11px] text-gray-400">
                        {(mantenimiento.adjunto.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {mantenimiento.estatus !== 'Realizado' ? (
                    <Button
                      variant="ghost"
                      onClick={() => handleMarkRealizado(mantenimiento.id)}
                    >
                      Marcar realizado
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">Completado</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
        {mantenimientos.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No hay mantenimientos registrados para este activo.
          </p>
        ) : null}
      </Card>

      <Modal open={open} title="Nuevo mantenimiento" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha</label>
              <Input
                className="mt-2"
                type="date"
                value={formData.fecha}
                onChange={(event) => setFormData((prev) => ({ ...prev, fecha: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={formData.tipo}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, tipo: event.target.value as MantenimientoTipo }))
                }
              >
                <option value="Preventivo">Preventivo</option>
                <option value="Correctivo">Correctivo</option>
              </select>
            </div>
            {activo.tipo === 'Vehículo' ? (
              <div>
                <label className="text-sm font-medium text-gray-700">Odómetro</label>
                <Input
                  className="mt-2"
                  type="number"
                  min={0}
                  value={formData.odometro}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, odometro: event.target.value }))
                  }
                />
              </div>
            ) : null}
            <div>
              <label className="text-sm font-medium text-gray-700">Proveedor</label>
              <Input
                className="mt-2"
                value={formData.proveedor}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, proveedor: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Costo</label>
              <Input
                className="mt-2"
                type="number"
                min={0}
                value={formData.costo}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, costo: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Estatus</label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={formData.estatus}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    estatus: event.target.value as MantenimientoEstatus,
                  }))
                }
              >
                <option value="Programado">Programado</option>
                <option value="Realizado">Realizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Próximo servicio</label>
              <Input
                className="mt-2"
                type="date"
                value={formData.proximoServicio}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, proximoServicio: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Adjunto (PDF o imagen)</label>
              <Input className="mt-2" type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
              {adjunto ? (
                <p className="mt-2 text-xs text-gray-500">
                  {adjunto.name} · {(adjunto.size / 1024).toFixed(1)} KB
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              className={cn(textareaClassName, 'mt-2')}
              rows={4}
              value={formData.descripcion}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, descripcion: event.target.value }))
              }
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit}>Guardar mantenimiento</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
