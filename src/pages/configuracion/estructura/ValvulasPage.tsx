import { useEffect, useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { OPERATION_CATALOG_UPDATED_EVENT, deleteValve, getCatalog, upsertValve } from '../../../lib/operationCatalog/repo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'

export function ValvulasPage() {
  const [catalog, setCatalog] = useState(() => getCatalog())
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', sectorId: '', tunnelId: '', name: '', description: '', code: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  useEffect(() => {
    const reload = () => setCatalog(getCatalog())
    window.addEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
    return () => window.removeEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
  }, [])

  const rows = useMemo(() => catalog.valves.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.valves, query])
  const availableTunnels = catalog.tunnels.filter((item) => item.sectorId === form.sectorId)

  return (
    <CrudShell title="Válvulas" searchPlaceholder="Buscar válvula" query={query} setQuery={setQuery} onNew={() => { setForm({ id: '', sectorId: '', tunnelId: '', name: '', description: '', code: '' }); setModalOpen(true) }} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage}
      renderRow={(item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">Sector: {catalog.sectors.find((entry) => entry.id === item.sectorId)?.name ?? 'N/A'} · Túnel: {item.tunnelId ? (catalog.tunnels.find((entry) => entry.id === item.tunnelId)?.name ?? 'N/A') : 'Sin túnel'}</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => { setForm({ id: item.id, sectorId: item.sectorId, tunnelId: item.tunnelId || '', name: item.name, description: item.description || '', code: item.code || '' }); setModalOpen(true) }}>Editar</Button><Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button></div>
        </div>
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar válvula' : 'Nueva válvula'} onClose={() => setModalOpen(false)}>
        <form onSubmit={stopSubmit(() => feedback.run(() => { upsertValve({ ...form, tunnelId: form.tunnelId || undefined }); setModalOpen(false) }, 'Válvula guardada.'))} className="space-y-2">
          <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={form.sectorId} onChange={(event) => setForm((prev) => ({ ...prev, sectorId: event.target.value, tunnelId: '' }))}><option value="">Sector</option>{catalog.sectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={form.tunnelId} onChange={(event) => setForm((prev) => ({ ...prev, tunnelId: event.target.value }))}><option value="">Sin túnel</option>{availableTunnels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Código" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(() => { deleteValve(deleteId); setDeleteId('') }, 'Válvula eliminada.')} />
    </CrudShell>
  )
}
