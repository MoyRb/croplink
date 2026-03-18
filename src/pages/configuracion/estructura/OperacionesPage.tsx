import { useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { deleteOperationSupabase, upsertOperationSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'
import { formatSeasonDurationDays, getOperationSeason, getOperationSeasonSummaries } from './structureUtils'
import { useStructureCatalog } from './useStructureCatalog'

export function OperacionesPage() {
  const { catalog, isLoading, loadError, organizationId, reload } = useStructureCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', name: '', description: '', seasonId: '', seasonName: '', seasonDescription: '', startDate: '', endDate: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  const rows = useMemo(() => catalog.operations.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.operations, query])

  return (
    <CrudShell
      title="Operaciones"
      searchPlaceholder="Buscar operación"
      query={query}
      setQuery={setQuery}
      onNew={() => { setForm({ id: '', name: '', description: '', seasonId: '', seasonName: '', seasonDescription: '', startDate: '', endDate: '' }); setModalOpen(true) }}
      rows={rows}
      toastMessage={feedback.toastMessage}
      errorMessage={feedback.errorMessage || loadError}
      isLoading={isLoading}
      emptyMessage="No hay operaciones registradas."
      renderRow={(item) => (
        (() => {
          const seasonSummaries = getOperationSeasonSummaries(item.id, catalog)

          return (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-gray-500">Ranchos: {catalog.ranches.filter((entry) => entry.operationId === item.id).length}</p>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {seasonSummaries.length > 0 ? (
                    seasonSummaries.map((season) => (
                      <div key={season.key}>
                        <p>Temporada: {season.seasonName}</p>
                        <p>Rango: {season.dateRangeLabel}</p>
                        <p>Duración prevista: {season.durationLabel}</p>
                      </div>
                    ))
                  ) : (
                    <p>Temporada prevista: sin temporada configurada.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { const season = getOperationSeason(item.id, catalog); setForm({ id: item.id, name: item.name, description: item.description || '', seasonId: season?.id || '', seasonName: season?.name || '', seasonDescription: season?.description || '', startDate: season?.startDate || '', endDate: season?.endDate || '' }); setModalOpen(true) }}>Editar</Button>
                <Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button>
              </div>
            </div>
          )
        })()
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar operación' : 'Nueva operación'} onClose={() => setModalOpen(false)}>
        <form
          onSubmit={stopSubmit(() => feedback.run(async () => {
            if (!organizationId) throw new Error('Perfil sin organización asignada.')
            await upsertOperationSupabase(organizationId, {
              id: form.id,
              name: form.name,
              description: form.description,
              season: {
                id: form.seasonId,
                name: form.seasonName,
                description: form.seasonDescription,
                startDate: form.startDate,
                endDate: form.endDate,
              },
            })
            await reload()
            setModalOpen(false)
          }, 'Operación guardada.'))}
          className="space-y-2"
        >
          <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <Input placeholder="Temporada" value={form.seasonName} onChange={(event) => setForm((prev) => ({ ...prev, seasonName: event.target.value }))} />
          <Input type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} />
          <Input type="date" value={form.endDate} onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))} />
          <p className="px-1 text-xs text-gray-500">Duración prevista: {formatSeasonDurationDays({ startDate: form.startDate, endDate: form.endDate, id: form.seasonId || 'preview', name: form.seasonName })}</p>
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(async () => { await deleteOperationSupabase(deleteId); await reload(); setDeleteId('') }, 'Operación eliminada.')} />
    </CrudShell>
  )
}
