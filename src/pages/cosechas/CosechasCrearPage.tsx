import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import { useOperationCatalog } from '../../lib/operationCatalog/useOperationCatalog'
import { createCosecha } from '../../lib/store/cosechas'
import { getEmpleados, getTarifasActividad } from '../../lib/store/nomina'

export function CosechasCrearPage() {
  const navigate = useNavigate()
  const { catalog } = useOperationCatalog()
  const empleados = useMemo(() => getEmpleados().filter((item) => item.activo), [])
  const actividades = useMemo(() => [...new Set(getTarifasActividad().map((item) => item.actividad).filter(Boolean))], [])

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    ranchoId: '',
    cultivo: '',
    temporada: '',
    sectorId: '',
    unidad: 'kg',
    cantidadTotal: 0,
    actividad: actividades[0] ?? '',
  })
  const [cuadrilla, setCuadrilla] = useState([{ empleadoId: '', unidades: 0 }])
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const selectedRanch = catalog.ranches.find((r) => r.id === form.ranchoId)
  const selectedSector = catalog.sectors.find((s) => s.id === form.sectorId)
  const sectores = catalog.sectors.filter((item) => item.ranchId === form.ranchoId)

  const handleCuadrillaChange = (index: number, field: 'empleadoId' | 'unidades', value: string) => {
    setCuadrilla((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: field === 'unidades' ? Number(value) : value } : row,
      ),
    )
  }

  const handleSave = () => {
    if (!form.fecha || !form.ranchoId || !form.cultivo || !form.temporada || !form.sectorId || !form.actividad) {
      setError('Completa fecha, contexto y actividad.')
      return
    }
    if (form.cantidadTotal <= 0) {
      setError('La cantidad total debe ser mayor a cero.')
      return
    }

    const validCuadrilla = cuadrilla.filter((row) => row.empleadoId && row.unidades > 0)
    if (validCuadrilla.length === 0) {
      setError('Agrega al menos un empleado con unidades mayores a cero.')
      return
    }

    const result = createCosecha({
      ...form,
      cantidadTotal: Number(form.cantidadTotal),
      cuadrilla: validCuadrilla,
      ranchoNombre: selectedRanch?.name ?? 'Rancho',
      sectorNombre: selectedSector?.name ?? 'Sector',
    })

    setToast('Cosecha guardada y work_logs generados para Nómina.')
    window.setTimeout(() => navigate(`/cosechas/${result.cosecha.id}`), 700)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Crear cosecha</h1>
        <p className="text-sm text-gray-500">Al guardar se crean registros en Nómina/Pagos por empleado.</p>
      </div>

      {error ? <Toast variant="error">{error}</Toast> : null}
      {toast ? <Toast variant="success">{toast}</Toast> : null}

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Input type="date" value={form.fecha} onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))} />
          <select className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.ranchoId} onChange={(event) => setForm((prev) => ({ ...prev, ranchoId: event.target.value, sectorId: '' }))}>
            <option value="">Rancho</option>
            {catalog.ranches.map((ranch) => <option key={ranch.id} value={ranch.id}>{ranch.name}</option>)}
          </select>
          <select className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.sectorId} onChange={(event) => setForm((prev) => ({ ...prev, sectorId: event.target.value }))}>
            <option value="">Sector</option>
            {sectores.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
          </select>
          <Input placeholder="Cultivo" value={form.cultivo} onChange={(event) => setForm((prev) => ({ ...prev, cultivo: event.target.value }))} />
          <Input placeholder="Temporada" value={form.temporada} onChange={(event) => setForm((prev) => ({ ...prev, temporada: event.target.value }))} />
          <Input placeholder="Unidad (kg/caja/etc)" value={form.unidad} onChange={(event) => setForm((prev) => ({ ...prev, unidad: event.target.value }))} />
          <Input type="number" min={0} step="any" placeholder="Cantidad total" value={form.cantidadTotal || ''} onChange={(event) => setForm((prev) => ({ ...prev, cantidadTotal: Number(event.target.value) }))} />
          <select className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm md:col-span-2" value={form.actividad} onChange={(event) => setForm((prev) => ({ ...prev, actividad: event.target.value }))}>
            <option value="">Actividad (tabulador)</option>
            {actividades.map((actividad) => <option key={actividad} value={actividad}>{actividad}</option>)}
          </select>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Cuadrilla</h2>
          <Button variant="ghost" onClick={() => setCuadrilla((prev) => [...prev, { empleadoId: '', unidades: 0 }])}>Agregar empleado</Button>
        </div>
        <div className="mt-4 space-y-3">
          {cuadrilla.map((row, index) => (
            <div key={`${index}-${row.empleadoId}`} className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
              <select className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={row.empleadoId} onChange={(event) => handleCuadrillaChange(index, 'empleadoId', event.target.value)}>
                <option value="">Empleado</option>
                {empleados.map((empleado) => <option key={empleado.id} value={empleado.id}>{empleado.nombreCompleto}</option>)}
              </select>
              <Input type="number" min={0} step="any" placeholder="Unidades / días" value={row.unidades || ''} onChange={(event) => handleCuadrillaChange(index, 'unidades', event.target.value)} />
              <Button variant="ghost" onClick={() => setCuadrilla((prev) => prev.filter((_, i) => i !== index))}>Quitar</Button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={handleSave}>Guardar cosecha</Button>
        </div>
      </Card>
    </div>
  )
}
