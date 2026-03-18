import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import { useOperationCatalog } from '../../lib/operationCatalog/useOperationCatalog'
import { getCosechaById, updateCosecha, type Cosecha, type HarvestDetailEntry } from '../../lib/store/cosechas'
import { CosechaRendimientoTable } from './CosechaRendimientoTable'
import { createEmptyHarvestDetail } from './cosechaRendimientoTableUtils'

const formatNumber = (value: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)

export function CosechasDetallePage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { catalog } = useOperationCatalog()

  const [cosecha, setCosecha] = useState<Cosecha | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    fecha: '',
    ranchoId: '',
    ranchCropSeasonId: '',
    sectorId: '',
    manejoAgronomico: '',
    notes: '',
  })
  const [detalle, setDetalle] = useState<HarvestDetailEntry[]>([createEmptyHarvestDetail()])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const found = await getCosechaById(id)
        setCosecha(found)
        if (found) {
          setForm({
            fecha: found.fecha,
            ranchoId: found.ranchoId,
            ranchCropSeasonId: found.ranchCropSeasonId ?? '',
            sectorId: found.sectorId,
            manejoAgronomico: found.manejoAgronomico,
            notes: found.notes ?? '',
          })
          setDetalle(found.detalle.length > 0 ? found.detalle : [createEmptyHarvestDetail()])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la cosecha.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

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
    () => catalog.crops.find((item) => item.id === (selectedRanchCropSeason?.cropId ?? cosecha?.cropId)),
    [catalog.crops, cosecha?.cropId, selectedRanchCropSeason?.cropId],
  )

  const selectedSeason = useMemo(
    () => catalog.seasons.find((item) => item.id === (selectedRanchCropSeason?.seasonId ?? cosecha?.seasonId)),
    [catalog.seasons, cosecha?.seasonId, selectedRanchCropSeason?.seasonId],
  )

  const hasLegacyPayrollLinks = useMemo(
    () => Boolean(cosecha && (cosecha.cuadrilla.length > 0 || cosecha.workLogIds.length > 0)),
    [cosecha],
  )

  const handleSave = async () => {
    if (!cosecha) return
    if (!form.fecha || !form.ranchoId || !form.ranchCropSeasonId || !form.manejoAgronomico.trim()) {
      setError('Completa fecha, rancho, variedad y manejo agronómico.')
      return
    }

    const validDetalle = detalle.filter(
      (row) => row.empaque.trim() || row.cajas > 0 || row.rechazos > 0 || row.kgProceso > 0 || row.rendimiento > 0,
    )
    if (validDetalle.length === 0) {
      setError('Agrega al menos una fila de detalle con información de rendimiento.')
      return
    }
    if (validDetalle.some((row) => !row.empaque.trim())) {
      setError('Cada fila del detalle debe incluir empaque.')
      return
    }
    if (!selectedRanchCropSeason) {
      setError('Selecciona una variedad válida para el rancho.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateCosecha({
        id: cosecha.id,
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

      const refreshed = await getCosechaById(cosecha.id)
      setCosecha(refreshed)
      if (refreshed) {
        setForm({
          fecha: refreshed.fecha,
          ranchoId: refreshed.ranchoId,
          ranchCropSeasonId: refreshed.ranchCropSeasonId ?? '',
          sectorId: refreshed.sectorId,
          manejoAgronomico: refreshed.manejoAgronomico,
          notes: refreshed.notes ?? '',
        })
        setDetalle(refreshed.detalle.length > 0 ? refreshed.detalle : [createEmptyHarvestDetail()])
      }
      setIsEditing(false)
      setToast('Cosecha actualizada correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la cosecha.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-gray-600">Cargando cosecha...</p>
      </Card>
    )
  }

  if (!cosecha) {
    return (
      <Card>
        <p className="text-sm text-gray-600">No encontramos la cosecha solicitada.</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4">
          <Button onClick={() => navigate('/cosechas/lista')}>Volver</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error ? <Toast variant="error">{error}</Toast> : null}
      {toast ? <Toast variant="success">{toast}</Toast> : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cosecha {cosecha.id}</h1>
          <p className="text-sm text-gray-500">{cosecha.fecha} · {cosecha.ranchoNombre} · {cosecha.variedad}</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? <Button variant="secondary" onClick={() => setIsEditing(true)}>Editar</Button> : null}
          <Button variant="ghost" onClick={() => navigate('/cosechas/lista')}>Volver a lista</Button>
        </div>
      </div>

      <Card>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Input type="date" value={form.fecha} onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))} />
              <select
                className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.ranchoId}
                onChange={(event) => setForm((prev) => ({ ...prev, ranchoId: event.target.value, sectorId: '', ranchCropSeasonId: '' }))}
              >
                <option value="">Rancho</option>
                {catalog.ranches.map((ranch) => <option key={ranch.id} value={ranch.id}>{ranch.name}</option>)}
              </select>
              <select
                className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.ranchCropSeasonId}
                onChange={(event) => setForm((prev) => ({ ...prev, ranchCropSeasonId: event.target.value }))}
              >
                <option value="">Variedad</option>
                {ranchCropSeasonOptions.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {(assignment.variety?.trim() || 'Sin variedad')} · {catalog.crops.find((crop) => crop.id === assignment.cropId)?.name || 'Cultivo'} · {catalog.seasons.find((season) => season.id === assignment.seasonId)?.name || 'Temporada'}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Manejo agronómico"
                value={form.manejoAgronomico}
                onChange={(event) => setForm((prev) => ({ ...prev, manejoAgronomico: event.target.value }))}
              />
              <select
                className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                value={form.sectorId}
                onChange={(event) => setForm((prev) => ({ ...prev, sectorId: event.target.value }))}
              >
                <option value="">Sector (opcional)</option>
                {sectores.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
              </select>
              <Input className="xl:col-span-2" placeholder="Notas" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
            <div className="grid gap-3 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-gray-600 md:grid-cols-3">
              <p><span className="font-medium text-gray-900">Cultivo:</span> {selectedCrop?.name ?? '—'}</p>
              <p><span className="font-medium text-gray-900">Temporada:</span> {selectedSeason?.name ?? '—'}</p>
              <p><span className="font-medium text-gray-900">Variedad:</span> {selectedRanchCropSeason?.variety?.trim() || '—'}</p>
            </div>
            <CosechaRendimientoTable rows={detalle} onChange={setDetalle} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
            <p><span className="text-gray-500">Fecha:</span> {cosecha.fecha}</p>
            <p><span className="text-gray-500">Rancho:</span> {cosecha.ranchoNombre}</p>
            <p><span className="text-gray-500">Variedad:</span> {cosecha.variedad}</p>
            <p><span className="text-gray-500">Cultivo:</span> {cosecha.cultivo}</p>
            <p><span className="text-gray-500">Temporada:</span> {cosecha.temporada}</p>
            <p><span className="text-gray-500">Manejo agronómico:</span> {cosecha.manejoAgronomico}</p>
            <p><span className="text-gray-500">Sector:</span> {cosecha.sectorNombre}</p>
            <p><span className="text-gray-500">Total cajas:</span> {formatNumber(cosecha.totalCajas)}</p>
            <p><span className="text-gray-500">Total kg proceso:</span> {formatNumber(cosecha.totalKgProceso)}</p>
            <p><span className="text-gray-500">Total rechazos:</span> {formatNumber(cosecha.totalRechazos)}</p>
            <p><span className="text-gray-500">Rendimiento promedio:</span> {formatNumber(cosecha.promedioRendimiento)}%</p>
            <p className="md:col-span-2 xl:col-span-3"><span className="text-gray-500">Notas:</span> {cosecha.notes || 'Sin notas.'}</p>
          </div>
        )}
      </Card>

      {!isEditing ? (
        <Card>
          <CosechaRendimientoTable rows={cosecha.detalle} />
        </Card>
      ) : null}

      {hasLegacyPayrollLinks ? (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Vinculación histórica de nómina</h2>
          <p className="mt-2 text-sm text-gray-500">
            Esta cosecha conserva enlaces previos con Nómina para compatibilidad histórica, pero las capturas nuevas ya no generan pagos ni work logs.
          </p>
          <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
            <p><span className="font-medium text-gray-900">Integrantes históricos:</span> {cosecha.cuadrilla.length}</p>
            <p><span className="font-medium text-gray-900">Work logs históricos:</span> {cosecha.workLogIds.length}</p>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
