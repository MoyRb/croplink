import { useEffect, useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { OPERATION_CATALOG_UPDATED_EVENT, deleteCrop, deleteRanchCropSeason, getCatalog, upsertCrop, upsertRanchCropSeason } from '../../../lib/operationCatalog/repo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'

export function CultivosPage() {
  const [catalog, setCatalog] = useState(() => getCatalog())
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', name: '', description: '' })
  const [assignmentForm, setAssignmentForm] = useState({ id: '', ranchId: '', cropId: '', seasonId: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  useEffect(() => {
    const reload = () => setCatalog(getCatalog())
    window.addEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
    return () => window.removeEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
  }, [])

  const rows = useMemo(() => catalog.crops.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.crops, query])

  return (
    <div className="space-y-4">
      <CrudShell title="Cultivos" searchPlaceholder="Buscar cultivo" query={query} setQuery={setQuery} onNew={() => { setForm({ id: '', name: '', description: '' }); setModalOpen(true) }} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage}
        renderRow={(item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
            <div><p className="font-medium">{item.name}</p></div>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => { setForm({ id: item.id, name: item.name, description: item.description || '' }); setModalOpen(true) }}>Editar</Button><Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button></div>
          </div>
        )}
      >
        <Modal open={modalOpen} title={form.id ? 'Editar cultivo' : 'Nuevo cultivo'} onClose={() => setModalOpen(false)}>
          <form onSubmit={stopSubmit(() => feedback.run(() => { upsertCrop(form); setModalOpen(false) }, 'Cultivo guardado.'))} className="space-y-2">
            <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            <ModalActions onClose={() => setModalOpen(false)} />
          </form>
        </Modal>
        <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(() => { deleteCrop(deleteId); setDeleteId('') }, 'Cultivo eliminado.')} />
      </CrudShell>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Asignar cultivo + temporada a rancho</h2>
        <form className="flex flex-wrap gap-2" onSubmit={stopSubmit(() => feedback.run(() => upsertRanchCropSeason(assignmentForm), 'Asignación guardada.'))}>
          <select className="rounded-full border border-[#E5E7EB] px-3 py-2" value={assignmentForm.ranchId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, ranchId: event.target.value }))}><option value="">Rancho</option>{catalog.ranches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="rounded-full border border-[#E5E7EB] px-3 py-2" value={assignmentForm.cropId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, cropId: event.target.value }))}><option value="">Cultivo</option>{catalog.crops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="rounded-full border border-[#E5E7EB] px-3 py-2" value={assignmentForm.seasonId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, seasonId: event.target.value }))}><option value="">Temporada</option>{catalog.seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <Button type="submit">Asignar</Button>
        </form>
        <div className="space-y-2">
          {catalog.ranchCropSeasons.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3 text-sm">
              <span>{catalog.ranches.find((entry) => entry.id === item.ranchId)?.name} · {catalog.crops.find((entry) => entry.id === item.cropId)?.name} · {catalog.seasons.find((entry) => entry.id === item.seasonId)?.name}</span>
              <Button variant="secondary" onClick={() => feedback.run(() => deleteRanchCropSeason(item.id), 'Asignación eliminada.')}>Eliminar</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
