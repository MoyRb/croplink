import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { addActivo, type ActivoEstado, type ActivoTipo, type ActivoUbicacion } from '../../lib/store/activos'
import { cn } from '../../lib/utils'

const selectClassName =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const textareaClassName =
  'w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const optionalValue = (value: string) => (value.trim() ? value.trim() : undefined)

export function ActivosNuevoPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    tipo: '' as ActivoTipo | '',
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
  })

  const handleSubmit = () => {
    const errores: string[] = []

    if (!formData.nombre.trim()) {
      errores.push('El nombre es obligatorio.')
    }

    if (!formData.tipo) {
      errores.push('El tipo de activo es obligatorio.')
    }

    if (formData.tipo === 'Vehículo') {
      if (!formData.placa.trim() && !formData.serieVIN.trim()) {
        errores.push('Para vehículos se requiere placa o VIN.')
      }
    }

    if (formData.costoCompra && Number(formData.costoCompra) < 0) {
      errores.push('El costo de compra debe ser mayor o igual a 0.')
    }

    if (errores.length > 0) {
      setFormError(errores[0])
      return
    }

    const nuevo = addActivo({
      tipo: formData.tipo as ActivoTipo,
      nombre: formData.nombre.trim(),
      categoria: formData.categoria.trim() || 'Sin categoría',
      marca: optionalValue(formData.marca),
      modelo: optionalValue(formData.modelo),
      serieVIN: optionalValue(formData.serieVIN),
      placa: optionalValue(formData.placa),
      ubicacion: formData.ubicacion,
      ubicacionDetalle: optionalValue(formData.ubicacionDetalle),
      responsable: optionalValue(formData.responsable),
      estado: formData.estado,
      fechaCompra: optionalValue(formData.fechaCompra),
      costoCompra: formData.costoCompra ? Number(formData.costoCompra) : undefined,
      notas: optionalValue(formData.notas),
    })

    navigate(`/activos/${nuevo.id}`, { state: { toast: 'created' } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nuevo activo</h1>
          <p className="text-sm text-gray-500">Registra vehículos, herramientas, equipos o consumibles.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/activos/lista')}>
          Volver a lista
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo de activo</label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={formData.tipo}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, tipo: event.target.value as ActivoTipo }))
                }
              >
                <option value="">Selecciona una opción</option>
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
                value={formData.nombre}
                onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <Input
                className="mt-2"
                value={formData.categoria}
                onChange={(event) => setFormData((prev) => ({ ...prev, categoria: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Marca</label>
              <Input
                className="mt-2"
                value={formData.marca}
                onChange={(event) => setFormData((prev) => ({ ...prev, marca: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Modelo</label>
              <Input
                className="mt-2"
                value={formData.modelo}
                onChange={(event) => setFormData((prev) => ({ ...prev, modelo: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Serie / VIN</label>
              <Input
                className="mt-2"
                value={formData.serieVIN}
                onChange={(event) => setFormData((prev) => ({ ...prev, serieVIN: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Placa</label>
              <Input
                className="mt-2"
                value={formData.placa}
                onChange={(event) => setFormData((prev) => ({ ...prev, placa: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ubicación</label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={formData.ubicacion}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, ubicacion: event.target.value as ActivoUbicacion }))
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
                value={formData.ubicacionDetalle}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, ubicacionDetalle: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Responsable</label>
              <Input
                className="mt-2"
                value={formData.responsable}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, responsable: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <select
                className={cn(selectClassName, 'mt-2')}
                value={formData.estado}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, estado: event.target.value as ActivoEstado }))
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
                value={formData.fechaCompra}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, fechaCompra: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Costo de compra</label>
              <Input
                className="mt-2"
                type="number"
                min={0}
                value={formData.costoCompra}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, costoCompra: event.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              className={cn(textareaClassName, 'mt-2')}
              rows={4}
              value={formData.notas}
              onChange={(event) => setFormData((prev) => ({ ...prev, notas: event.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit}>Guardar activo</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
