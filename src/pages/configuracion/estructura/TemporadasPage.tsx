import { useEffect, useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { OPERATION_CATALOG_UPDATED_EVENT, deleteSeason, getCatalog, upsertSeason } from '../../../lib/operationCatalog/repo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'

export function TemporadasPage() {
  const [catalog, setCatalog] = useState(() => getCatalog())
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', name: '', description: '', startDate: '', endDate: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  useEffect(() => {
    const reload = () => setCatalog(getCatalog())
    window.addEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
    return () => window.removeEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
  }, [])

  const rows = useMemo(() => catalog.seasons.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.seasons, query])

  return (
    <CrudShell title="Temporadas" searchPlaceholder="Buscar temporada" query={query} setQuery={setQuery} onNew={() => { setForm({ id: '', name: '', description: '', startDate: '', endDate: '' }); setModalOpen(true) }} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage}
      renderRow={(item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">{item.startDate || 'Sin inicio'} - {item.endDate || 'Sin fin'}</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => { setForm({ id: item.id, name: item.name, description: item.description || '', startDate: item.startDate || '', endDate: item.endDate || '' }); setModalOpen(true) }}>Editar</Button><Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button></div>
        </div>
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar temporada' : 'Nueva temporada'} onClose={() => setModalOpen(false)}>
        <form onSubmit={stopSubmit(() => feedback.run(() => { upsertSeason(form); setModalOpen(false) }, 'Temporada guardada.'))} className="space-y-2">
          <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <Input type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} />
          <Input type="date" value={form.endDate} onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))} />
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(() => { deleteSeason(deleteId); setDeleteId('') }, 'Temporada eliminada.')} />
    </CrudShell>
  )
}
