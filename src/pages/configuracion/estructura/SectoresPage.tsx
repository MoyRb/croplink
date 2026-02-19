import { useEffect, useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { OPERATION_CATALOG_UPDATED_EVENT, deleteSector, getCatalog, upsertSector } from '../../../lib/operationCatalog/repo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'

export function SectoresPage() {
  const [catalog, setCatalog] = useState(() => getCatalog())
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', ranchId: '', name: '', description: '', code: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  useEffect(() => {
    const reload = () => setCatalog(getCatalog())
    window.addEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
    return () => window.removeEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
  }, [])

  const rows = useMemo(() => catalog.sectors.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.sectors, query])

  return (
    <CrudShell title="Sectores" searchPlaceholder="Buscar sector" query={query} setQuery={setQuery} onNew={() => { setForm({ id: '', ranchId: '', name: '', description: '', code: '' }); setModalOpen(true) }} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage}
      renderRow={(item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">Rancho: {catalog.ranches.find((entry) => entry.id === item.ranchId)?.name ?? 'N/A'} · Túneles: {catalog.tunnels.filter((entry) => entry.sectorId === item.id).length}</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => { setForm({ id: item.id, ranchId: item.ranchId, name: item.name, description: item.description || '', code: item.code || '' }); setModalOpen(true) }}>Editar</Button><Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button></div>
        </div>
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar sector' : 'Nuevo sector'} onClose={() => setModalOpen(false)}>
        <form onSubmit={stopSubmit(() => feedback.run(() => { upsertSector(form); setModalOpen(false) }, 'Sector guardado.'))} className="space-y-2">
          <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={form.ranchId} onChange={(event) => setForm((prev) => ({ ...prev, ranchId: event.target.value }))}><option value="">Rancho</option>{catalog.ranches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Código" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(() => { deleteSector(deleteId); setDeleteId('') }, 'Sector eliminado.')} />
    </CrudShell>
  )
}
