import { useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { deleteRanchSupabase, upsertRanchSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import { DeleteModal, ModalActions, stopSubmit, useCrudFeedback, CrudShell } from './shared'
import { useStructureCatalog } from './useStructureCatalog'

export function RanchosPage() {
  const { catalog, isLoading, loadError, organizationId, reload } = useStructureCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', operationId: '', name: '', description: '', location: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  const rows = useMemo(() => catalog.ranches.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.ranches, query])

  return (
    <CrudShell title="Ranchos" searchPlaceholder="Buscar rancho" query={query} setQuery={setQuery} onNew={() => { setForm({ id: '', operationId: '', name: '', description: '', location: '' }); setModalOpen(true) }} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage || loadError} isLoading={isLoading} emptyMessage="No hay ranchos registrados."
      renderRow={(item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">Operación: {catalog.operations.find((entry) => entry.id === item.operationId)?.name ?? 'N/A'} · Sectores: {catalog.sectors.filter((entry) => entry.ranchId === item.id).length}</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => { setForm({ id: item.id, operationId: item.operationId, name: item.name, description: item.description || '', location: item.location || '' }); setModalOpen(true) }}>Editar</Button><Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button></div>
        </div>
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar rancho' : 'Nuevo rancho'} onClose={() => setModalOpen(false)}>
        <form onSubmit={stopSubmit(() => feedback.run(async () => { if (!organizationId) throw new Error('Perfil sin organización asignada.'); await upsertRanchSupabase(organizationId, form); await reload(); setModalOpen(false) }, 'Rancho guardado.'))} className="space-y-2">
          <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={form.operationId} onChange={(event) => setForm((prev) => ({ ...prev, operationId: event.target.value }))}>
            <option value="">Operación</option>
            {catalog.operations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Ubicación" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(async () => { await deleteRanchSupabase(deleteId); await reload(); setDeleteId('') }, 'Rancho eliminado.')} />
    </CrudShell>
  )
}
