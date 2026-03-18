import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { deleteRanchSupabase, upsertRanchWithStructureSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import { DeleteModal, ModalActions, stopSubmit, useCrudFeedback, CrudShell } from './shared'
import { formatArea, formatSeasonDuration, getRanchAssignments } from './structureUtils'
import { useStructureCatalog } from './useStructureCatalog'

type SectorDraft = {
  localId: string
  id: string
  number: string
  areaHa: string
  tunnelCount: string
}

type RanchFormState = {
  id: string
  operationId: string
  name: string
  description: string
  surfaceHa: string
  cropSeasonId: string
  cropId: string
  seasonId: string
  variety: string
  sectors: SectorDraft[]
}

const createSectorDraft = (overrides?: Partial<SectorDraft>): SectorDraft => ({
  localId: overrides?.localId ?? crypto.randomUUID(),
  id: overrides?.id ?? '',
  number: overrides?.number ?? '',
  areaHa: overrides?.areaHa ?? '',
  tunnelCount: overrides?.tunnelCount ?? '0',
})

const createEmptyForm = (): RanchFormState => ({
  id: '',
  operationId: '',
  name: '',
  description: '',
  surfaceHa: '',
  cropSeasonId: '',
  cropId: '',
  seasonId: '',
  variety: '',
  sectors: [createSectorDraft()],
})

export function RanchosPage() {
  const { catalog, isLoading, loadError, organizationId, reload } = useStructureCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<RanchFormState>(createEmptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  const rows = useMemo(() => catalog.ranches.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.ranches, query])

  const openNewModal = () => {
    setForm(createEmptyForm())
    setModalOpen(true)
  }

  const openEditModal = (ranchId: string) => {
    const ranch = catalog.ranches.find((item) => item.id === ranchId)
    if (!ranch) return

    const assignment = catalog.ranchCropSeasons.find((item) => item.ranchId === ranch.id)
    const ranchSectors = catalog.sectors
      .filter((item) => item.ranchId === ranch.id)
      .sort((a, b) => (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER))

    setForm({
      id: ranch.id,
      operationId: ranch.operationId,
      name: ranch.name,
      description: ranch.description ?? '',
      surfaceHa: ranch.surfaceHa != null ? String(ranch.surfaceHa) : '',
      cropSeasonId: assignment?.id ?? '',
      cropId: assignment?.cropId ?? '',
      seasonId: assignment?.seasonId ?? '',
      variety: assignment?.variety ?? '',
      sectors: ranchSectors.length > 0
        ? ranchSectors.map((sector) =>
            createSectorDraft({
              id: sector.id,
              number: sector.number != null ? String(sector.number) : '',
              areaHa: sector.areaHa != null ? String(sector.areaHa) : '',
              tunnelCount: sector.tunnelCount != null ? String(sector.tunnelCount) : '0',
            }),
          )
        : [createSectorDraft()],
    })
    setModalOpen(true)
  }

  const selectedSeason = catalog.seasons.find((item) => item.id === form.seasonId)
  const totalSectorArea = form.sectors.reduce((sum, sector) => sum + (sector.areaHa.trim() !== '' ? Number(sector.areaHa) : 0), 0)

  return (
    <CrudShell title="Ranchos" searchPlaceholder="Buscar rancho" query={query} setQuery={setQuery} onNew={openNewModal} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage || loadError} isLoading={isLoading} emptyMessage="No hay ranchos registrados."
      renderRow={(item) => {
        const assignments = getRanchAssignments(item.id, catalog)
        const sectors = catalog.sectors.filter((entry) => entry.ranchId === item.id)
        const tunnels = sectors.reduce((sum, sector) => sum + (sector.tunnelCount ?? catalog.tunnels.filter((entry) => entry.sectorId === sector.id).length), 0)

        return (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-gray-500">Operación: {catalog.operations.find((entry) => entry.id === item.operationId)?.name ?? 'N/A'} · Superficie: {formatArea(item.surfaceHa)} · Sectores: {sectors.length} · Túneles: {tunnels}</p>
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                {assignments.length > 0 ? (
                  assignments.map((assignment) => (
                    <p key={assignment.id}>
                      Cultivo: {assignment.cropName} · Variedad: {assignment.variety} · {assignment.seasonName}
                    </p>
                  ))
                ) : (
                  <p>Sin cultivo/temporada asignados.</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/configuracion/estructura/ranchos/${item.id}`}>
                <Button variant="secondary">Ver detalle</Button>
              </Link>
              <Button variant="secondary" onClick={() => openEditModal(item.id)}>Editar</Button>
              <Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button>
            </div>
          </div>
        )
      }}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar rancho' : 'Nuevo rancho'} onClose={() => setModalOpen(false)} className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={stopSubmit(() => feedback.run(async () => {
          if (!organizationId) throw new Error('Perfil sin organización asignada.')

          const surfaceHa = Number(form.surfaceHa)
          if (!form.surfaceHa.trim() || Number.isNaN(surfaceHa) || surfaceHa <= 0) throw new Error('La superficie del rancho debe ser mayor a 0.')

          const sectors = form.sectors.map((sector, index) => {
            const number = Number(sector.number)
            const areaHa = Number(sector.areaHa)
            const tunnelCount = Number(sector.tunnelCount)

            if (!sector.number.trim() || !Number.isInteger(number) || number <= 0) {
              throw new Error(`El número del sector ${index + 1} es requerido.`)
            }
            if (!sector.areaHa.trim() || Number.isNaN(areaHa) || areaHa <= 0) {
              throw new Error(`La superficie del sector ${number} debe ser mayor a 0.`)
            }
            if (!sector.tunnelCount.trim() || !Number.isInteger(tunnelCount) || tunnelCount < 0) {
              throw new Error(`El número de túneles del sector ${number} debe ser mayor o igual a 0.`)
            }

            return {
              id: sector.id || undefined,
              number,
              areaHa,
              tunnelCount,
            }
          })

          await upsertRanchWithStructureSupabase(organizationId, {
            ranch: {
              id: form.id,
              operationId: form.operationId,
              name: form.name,
              description: form.description,
              surfaceHa,
            },
            ranchCropSeason: {
              id: form.cropSeasonId || undefined,
              cropId: form.cropId,
              seasonId: form.seasonId,
              variety: form.variety,
            },
            sectors,
          })
          await reload()
          setModalOpen(false)
        }, 'Rancho guardado con su estructura básica.'))} className="space-y-6">
          <section className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Datos base del rancho</h3>
              <p className="text-sm text-gray-500">Centraliza la captura básica del rancho en un solo flujo.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Operación</label>
                <select className="w-full rounded-full border border-[#E5E7EB] px-4 py-2 text-sm" value={form.operationId} onChange={(event) => setForm((prev) => ({ ...prev, operationId: event.target.value }))}>
                  <option value="">Selecciona una operación</option>
                  {catalog.operations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre del rancho</label>
                <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Superficie del rancho (ha)</label>
                <Input type="number" placeholder="Superficie (ha)" min="0.01" step="any" value={form.surfaceHa} onChange={(event) => setForm((prev) => ({ ...prev, surfaceHa: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripción (opcional)</label>
                <Input placeholder="Descripción breve" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Contexto agrícola</h3>
              <p className="text-sm text-gray-500">Usa catálogos reales de cultivo y temporada para persistir el contexto agrícola del rancho.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cultivo</label>
                <select className="w-full rounded-full border border-[#E5E7EB] px-4 py-2 text-sm" value={form.cropId} onChange={(event) => setForm((prev) => ({ ...prev, cropId: event.target.value }))}>
                  <option value="">Selecciona un cultivo</option>
                  {catalog.crops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Variedad</label>
                <Input placeholder="Variedad" value={form.variety} onChange={(event) => setForm((prev) => ({ ...prev, variety: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Temporada</label>
                <select className="w-full rounded-full border border-[#E5E7EB] px-4 py-2 text-sm" value={form.seasonId} onChange={(event) => setForm((prev) => ({ ...prev, seasonId: event.target.value }))}>
                  <option value="">Selecciona una temporada</option>
                  {catalog.seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-sm text-gray-600">
              <span className="font-medium text-gray-900">Duración prevista:</span>{' '}
              {selectedSeason ? formatSeasonDuration(selectedSeason) : 'Selecciona una temporada para ver su duración.'}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Sectores del rancho</h3>
                <p className="text-sm text-gray-500">Captura número de sector, superficie y túneles en el mismo guardado del rancho.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setForm((prev) => ({ ...prev, sectors: [...prev.sectors, createSectorDraft()] }))}>
                Agregar sector
              </Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB]">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Número</th>
                    <th className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Superficie (ha)</th>
                    <th className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Túneles</th>
                    <th className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre generado</th>
                    <th className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {form.sectors.map((sector, index) => {
                    const isPersisted = Boolean(sector.id)
                    const generatedName = sector.number.trim() ? `Sector ${sector.number.trim()}` : `Sector ${index + 1}`
                    return (
                      <tr key={sector.localId} className="border-t border-[#E5E7EB]">
                        <td className="px-4 py-3 align-top">
                          <Input type="number" min="1" step="1" placeholder="1" value={sector.number} onChange={(event) => setForm((prev) => ({
                            ...prev,
                            sectors: prev.sectors.map((entry) => entry.localId === sector.localId ? { ...entry, number: event.target.value } : entry),
                          }))} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Input type="number" min="0.01" step="any" placeholder="0.00" value={sector.areaHa} onChange={(event) => setForm((prev) => ({
                            ...prev,
                            sectors: prev.sectors.map((entry) => entry.localId === sector.localId ? { ...entry, areaHa: event.target.value } : entry),
                          }))} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Input type="number" min="0" step="1" placeholder="0" value={sector.tunnelCount} onChange={(event) => setForm((prev) => ({
                            ...prev,
                            sectors: prev.sectors.map((entry) => entry.localId === sector.localId ? { ...entry, tunnelCount: event.target.value } : entry),
                          }))} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 align-middle">
                          <div>{generatedName}</div>
                          {isPersisted ? <div className="text-xs text-gray-400">Sector existente</div> : null}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-3 py-1.5 text-xs"
                            disabled={isPersisted && form.sectors.length === 1}
                            onClick={() => setForm((prev) => ({
                              ...prev,
                              sectors: prev.sectors.length === 1 ? prev.sectors : prev.sectors.filter((entry) => entry.localId !== sector.localId),
                            }))}
                          >
                            Quitar
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-sm text-gray-600">
              <span>Total de sectores: <strong className="text-gray-900">{form.sectors.length}</strong></span>
              <span>Superficie capturada en sectores: <strong className="text-gray-900">{Number.isFinite(totalSectorArea) ? formatArea(totalSectorArea) : '—'}</strong></span>
            </div>
          </section>

          <ModalActions onClose={() => setModalOpen(false)} submitLabel={form.id ? 'Guardar cambios' : 'Crear rancho'} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(async () => { await deleteRanchSupabase(deleteId); await reload(); setDeleteId('') }, 'Rancho eliminado.')} />
    </CrudShell>
  )
}
