import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import { useOperationCatalog } from '../../lib/operationCatalog/useOperationCatalog'
import { useCosechasStore } from '../../lib/store/cosechas'
import { CosechaRendimientoTable } from './CosechaRendimientoTable'
import { createEmptyHarvestDetail } from './cosechaRendimientoTableUtils'

export function CosechasCrearPage() {
  const navigate = useNavigate()
  const { catalog, isLoading: loadingCatalog, loadError: catalogError } = useOperationCatalog()
  const { saveNewCosecha, isSaving, error } = useCosechasStore()

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    ranchoId: '',
    ranchCropSeasonId: '',
    sectorId: '',
    manejoAgronomico: '',
    notes: '',
  })
  const [detalle, setDetalle] = useState([createEmptyHarvestDetail()])
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState('')

  const ranchCropSeasonOptions = useMemo(
    () => catalog.ranchCropSeasons.filter((item) => item.ranchId === form.ranchoId),
    [catalog.ranchCropSeasons, form.ranchoId],
  )

  const sectores = useMemo(() => catalog.sectors.filter((item) => item.ranchId === form.ranchoId), [catalog.sectors, form.ranchoId])

  const selectedRanchCropSeason = useMemo(
    () => ranchCropSeasonOptions.find((item) => item.id === form.ranchCropSeasonId),
    [ranchCropSeasonOptions, form.ranchCropSeasonId],
  )

  const selectedCrop = useMemo(
    () => catalog.crops.find((item) => item.id === selectedRanchCropSeason?.cropId),
    [catalog.crops, selectedRanchCropSeason?.cropId],
  )

  const selectedSeason = useMemo(
    () => catalog.seasons.find((item) => item.id === selectedRanchCropSeason?.seasonId),
    [catalog.seasons, selectedRanchCropSeason?.seasonId],
  )

  const cultivoLabel = selectedCrop?.name ?? 'Se completa al seleccionar variedad'
  const variedadLabel = selectedRanchCropSeason?.variety?.trim() || 'Selecciona variedad'
  const temporadaLabel = selectedSeason?.name ?? 'Se completa al seleccionar variedad'

  const handleRanchChange = (ranchoId: string) => {
    const nextOptions = catalog.ranchCropSeasons.filter((item) => item.ranchId === ranchoId)
    setForm((prev) => ({
      ...prev,
      ranchoId,
      sectorId: '',
      ranchCropSeasonId: nextOptions[0]?.id ?? '',
    }))
  }

  const handleSave = async () => {
    setFormError('')

    if (!form.fecha || !form.ranchoId || !form.ranchCropSeasonId || !form.manejoAgronomico.trim()) {
      setFormError('Completa fecha, rancho, variedad y manejo.')
      return
    }

    if (!selectedRanchCropSeason) {
      setFormError('Selecciona una variedad válida para el rancho.')
      return
    }

    const validDetalle = detalle.filter(
      (row) => row.empaque.trim() || row.cajas > 0 || row.rechazos > 0 || row.kgProceso > 0,
    )

    if (validDetalle.length === 0) {
      setFormError('Agrega al menos una fila de detalle con información de rendimiento.')
      return
    }

    if (validDetalle.some((row) => !row.empaque.trim())) {
      setFormError('Cada fila del detalle debe incluir empaque.')
      return
    }

    try {
      const cosechaId = await saveNewCosecha({
        fecha: form.fecha,
        ranchoId: form.ranchoId,
        cropId: selectedRanchCropSeason.cropId,
        seasonId: selectedRanchCropSeason.seasonId,
        sectorId: form.sectorId || undefined,
        ranchCropSeasonId: form.ranchCropSeasonId,
        manejoAgronomico: form.manejoAgronomico,
        notes: form.notes,
        detalle: validDetalle,
      })

      setToast('Cosecha guardada como registro de rendimiento.')
      window.setTimeout(() => navigate(`/cosechas/${cosechaId}`), 700)
    } catch {
      // error displayed by store
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Crear cosecha</h1>
        <p className="text-sm text-gray-500">Registra el rendimiento agrícola por rancho con encabezado y tabla de detalle.</p>
      </div>

      {formError ? <Toast variant="error">{formError}</Toast> : null}
      {catalogError ? <Toast variant="error">{catalogError}</Toast> : null}
      {error ? <Toast variant="error">{error}</Toast> : null}
      {toast ? <Toast variant="success">{toast}</Toast> : null}

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Encabezado de la cosecha</h2>
            <p className="text-sm text-gray-500">Define el contexto agrícola antes de capturar el rendimiento.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Fecha</span>
              <Input type="date" value={form.fecha} onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Rancho</span>
              <select
                className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.ranchoId}
                onChange={(event) => handleRanchChange(event.target.value)}
              >
                <option value="">Selecciona rancho</option>
                {catalog.ranches.map((ranch) => <option key={ranch.id} value={ranch.id}>{ranch.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Cultivo</span>
              <div className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-sm text-gray-700">{cultivoLabel}</div>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Variedad</span>
              <select
                className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.ranchCropSeasonId}
                onChange={(event) => setForm((prev) => ({ ...prev, ranchCropSeasonId: event.target.value }))}
                disabled={!form.ranchoId}
              >
                <option value="">Selecciona variedad</option>
                {ranchCropSeasonOptions.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.variety?.trim() || 'Sin variedad'}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Manejo</span>
              <Input
                placeholder="Manejo agronómico"
                value={form.manejoAgronomico}
                onChange={(event) => setForm((prev) => ({ ...prev, manejoAgronomico: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Sector</span>
              <select
                className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.sectorId}
                onChange={(event) => setForm((prev) => ({ ...prev, sectorId: event.target.value }))}
                disabled={!form.ranchoId}
              >
                <option value="">Sin sector</option>
                {sectores.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Temporada</span>
              <div className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-sm text-gray-700">{temporadaLabel}</div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Notas</span>
            <Input placeholder="Notas (opcional)" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>

          <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-900">Resumen del encabezado:</span>{' '}
              {form.fecha || 'Sin fecha'} · {catalog.ranches.find((ranch) => ranch.id === form.ranchoId)?.name || 'Sin rancho'} · {cultivoLabel} ·{' '}
              {variedadLabel} · {form.manejoAgronomico.trim() || 'Sin manejo'} · {sectores.find((sector) => sector.id === form.sectorId)?.name || 'Sin sector'} ·{' '}
              {temporadaLabel}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CosechaRendimientoTable rows={detalle} onChange={setDetalle} />

        <div className="mt-5 flex justify-end">
          <Button onClick={() => void handleSave()} disabled={isSaving || loadingCatalog}>
            {isSaving ? 'Guardando...' : loadingCatalog ? 'Cargando catálogo...' : 'Guardar cosecha'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
