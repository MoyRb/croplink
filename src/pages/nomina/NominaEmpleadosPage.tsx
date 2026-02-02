import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import {
  addEmpleado,
  getEmpleados,
  toggleEmpleadoActivo,
  updateEmpleado,
  type Empleado,
  type TipoPago,
} from '../../lib/store/nomina'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

const initialForm = {
  nombreCompleto: '',
  puesto: '',
  tipoPago: 'Diario' as TipoPago,
  salarioBase: 0,
  activo: true,
  fechaAlta: new Date().toISOString().slice(0, 10),
  notas: '',
}

export function NominaEmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>(() => getEmpleados())
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Empleado | null>(null)
  const [formData, setFormData] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const filteredEmpleados = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return empleados
    return empleados.filter(
      (empleado) =>
        empleado.nombreCompleto.toLowerCase().includes(normalized) ||
        empleado.puesto.toLowerCase().includes(normalized),
    )
  }, [empleados, search])

  const openModal = (empleado?: Empleado) => {
    if (empleado) {
      setEditing(empleado)
      setFormData({
        nombreCompleto: empleado.nombreCompleto,
        puesto: empleado.puesto,
        tipoPago: empleado.tipoPago,
        salarioBase: empleado.salarioBase,
        activo: empleado.activo,
        fechaAlta: empleado.fechaAlta,
        notas: empleado.notas ?? '',
      })
    } else {
      setEditing(null)
      setFormData(initialForm)
    }
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!formData.nombreCompleto.trim() || !formData.puesto.trim()) {
      setFormError('Nombre y puesto son obligatorios.')
      return
    }
    if (formData.salarioBase <= 0) {
      setFormError('El salario base debe ser mayor a cero.')
      return
    }
    if (!formData.fechaAlta) {
      setFormError('Selecciona una fecha de alta.')
      return
    }

    if (editing) {
      const updated = updateEmpleado({
        ...editing,
        ...formData,
        notas: formData.notas?.trim() ? formData.notas : undefined,
      })
      setEmpleados(updated)
    } else {
      const updated = addEmpleado({
        ...formData,
        notas: formData.notas?.trim() ? formData.notas : undefined,
      })
      setEmpleados(updated)
    }

    setToastVisible(true)
    window.setTimeout(() => setToastVisible(false), 2500)
    setModalOpen(false)
  }

  const handleToggle = (id: string) => {
    setEmpleados(toggleEmpleadoActivo(id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nómina · Empleados</h1>
          <p className="text-sm text-gray-500">Administra el personal y su esquema de pago.</p>
        </div>
        <Button onClick={() => openModal()}>Nuevo empleado</Button>
      </div>

      {toastVisible ? <Toast variant="success">Cambios guardados</Toast> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Empleados activos</h2>
            <p className="text-sm text-gray-500">Consulta puestos y salarios base.</p>
          </div>
          <Input
            className="w-full max-w-xs"
            placeholder="Buscar por nombre o puesto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="mt-4">
          {filteredEmpleados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F5F5F5] p-8 text-center">
              <p className="text-sm text-gray-500">
                No hay empleados registrados. Crea el primero para comenzar.
              </p>
              <Button className="mt-4" onClick={() => openModal()}>
                Crear empleado
              </Button>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Tipo pago</TableHead>
                  <TableHead>Salario base</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {filteredEmpleados.map((empleado) => (
                  <TableRow key={empleado.id}>
                    <TableCell className="font-medium text-gray-900">
                      {empleado.nombreCompleto}
                    </TableCell>
                    <TableCell>{empleado.puesto}</TableCell>
                    <TableCell>{empleado.tipoPago}</TableCell>
                    <TableCell>{formatCurrency(empleado.salarioBase)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggle(empleado.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          empleado.activo
                            ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {empleado.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" onClick={() => openModal(empleado)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Editar empleado' : 'Nuevo empleado'}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre completo</label>
              <Input
                className="mt-2"
                value={formData.nombreCompleto}
                onChange={(event) => setFormData({ ...formData, nombreCompleto: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Puesto</label>
              <Input
                className="mt-2"
                value={formData.puesto}
                onChange={(event) => setFormData({ ...formData, puesto: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo de pago</label>
              <select
                className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                value={formData.tipoPago}
                onChange={(event) =>
                  setFormData({ ...formData, tipoPago: event.target.value as TipoPago })
                }
              >
                <option value="Diario">Diario</option>
                <option value="Semanal">Semanal</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Salario base</label>
              <Input
                className="mt-2"
                type="number"
                min={0}
                value={formData.salarioBase}
                onChange={(event) =>
                  setFormData({ ...formData, salarioBase: Number(event.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha de alta</label>
              <Input
                className="mt-2"
                type="date"
                value={formData.fechaAlta}
                onChange={(event) => setFormData({ ...formData, fechaAlta: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(event) => setFormData({ ...formData, activo: event.target.checked })}
                className="h-4 w-4 rounded border-[#E5E7EB] text-[#00C050] focus:ring-[#DBFAE6]"
              />
              <span className="text-sm text-gray-700">Empleado activo</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
              rows={3}
              value={formData.notas}
              onChange={(event) => setFormData({ ...formData, notas: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editing ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
