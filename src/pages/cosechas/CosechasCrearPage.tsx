import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import { useOperationCatalog } from '../../lib/operationCatalog/useOperationCatalog'
import { listHarvestActivities, listHarvestEmployees, useCosechasStore, type HarvestActivity, type HarvestEmployee } from '../../lib/store/cosechas'

export function CosechasCrearPage() {
  const navigate = useNavigate()
  const { catalog } = useOperationCatalog()
  const { saveNewCosecha, isSaving, error } = useCosechasStore()

  const [empleados, setEmpleados] = useState<HarvestEmployee[]>([])
  const [actividades, setActividades] = useState<HarvestActivity[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState('')

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    ranchoId: '',
    cropId: '',
    seasonId: '',
    sectorId: '',
    unidad: 'kg',
    cantidadTotal: 0,
    actividad: '',
    notes: '',
  })
  const [cuadrilla, setCuadrilla] = useState([{ empleadoId: '', unidades: 0 }])
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoadingCatalog(true)
      setCatalogError('')
      try {
        const [employeesData, activitiesData] = await Promise.all([listHarvestEmployees(), listHarvestActivities()])
        setEmpleados(employeesData)
        setActividades(activitiesData)
        if (activitiesData[0]) {
          setForm((prev) => ({ ...prev, actividad: prev.actividad || activitiesData[0].actividad, unidad: activitiesData[0].unidad }))
        }
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : 'No se pudo cargar catálogo de cosechas.')
      } finally {
        setLoadingCatalog(false)
      }
    }

    void load()
  }, [])

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

  const selectedActivity = useMemo(
    () => actividades.find((item) => item.actividad === form.actividad),
    [actividades, form.actividad],
  )

  const handleSave = async () => {
    setFormError('')

    if (!form.fecha || !form.ranchoId || !form.cropId || !form.seasonId || !form.sectorId || !form.actividad) {
      setFormError('Completa fecha, contexto y actividad.')
      return
    }
    if (form.cantidadTotal <= 0) {
      setFormError('La cantidad total debe ser mayor a cero.')
      return
    }

    const validCuadrilla = cuadrilla.filter((row) => row.empleadoId && row.unidades > 0)
    if (validCuadrilla.length === 0) {
      setFormError('Agrega al menos un empleado con unidades mayores a cero.')
      return
    }

    try {
      const cosechaId = await saveNewCosecha({
        ...form,
        cantidadTotal: Number(form.cantidadTotal),
        cuadrilla: validCuadrilla,
      })

      setToast('Cosecha guardada y work_logs generados para Nómina.')
      window.setTimeout(() => navigate(`/cosechas/${cosechaId}`), 700)
    } catch {
      // error displayed by store
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Crear cosecha</h1>
        <p className="text-sm text-gray-500">Al guardar se crean registros en Nómina/Pagos por empleado.</p>
      </div>

      {formError ? <Toast variant="error">{formError}</Toast> : null}
      {catalogError ? <Toast variant="error">{catalogError}</Toast> : null}
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
          <select className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.cropId} onChange={(event) => setForm((prev) => ({ ...prev, cropId: event.target.value }))}>
            <option value="">Cultivo</option>
            {catalog.crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
          </select>
          <select className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.seasonId} onChange={(event) => setForm((prev) => ({ ...prev, seasonId: event.target.value }))}>
            <option value="">Temporada</option>
            {catalog.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
          </select>
          <Input placeholder="Unidad (kg/caja/etc)" value={form.unidad} onChange={(event) => setForm((prev) => ({ ...prev, unidad: event.target.value }))} />
          <Input type="number" min={0} step="any" placeholder="Cantidad total" value={form.cantidadTotal || ''} onChange={(event) => setForm((prev) => ({ ...prev, cantidadTotal: Number(event.target.value) }))} />
          <select className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm" value={form.actividad} onChange={(event) => setForm((prev) => ({ ...prev, actividad: event.target.value }))}>
            <option value="">Actividad (tabulador)</option>
            {actividades.map((actividad) => <option key={`${actividad.actividad}-${actividad.unidad}`} value={actividad.actividad}>{actividad.actividad}</option>)}
          </select>
          <Input placeholder="Notas" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        {selectedActivity ? <p className="mt-3 text-xs text-gray-500">Tarifa configurada en nómina para esta actividad: unidad base {selectedActivity.unidad}.</p> : null}
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
          <Button onClick={() => void handleSave()} disabled={isSaving || loadingCatalog}>{isSaving ? 'Guardando...' : loadingCatalog ? 'Cargando catálogo...' : 'Guardar cosecha'}</Button>
        </div>
      </Card>

      {!loadingCatalog && !selectedRanch && form.ranchoId ? <p className="text-xs text-gray-500">No se encontró el rancho seleccionado.</p> : null}
      {!loadingCatalog && !selectedSector && form.sectorId ? <p className="text-xs text-gray-500">No se encontró el sector seleccionado.</p> : null}
    </div>
  )
}
