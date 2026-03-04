import { useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { deleteOperationSupabase, upsertOperationSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'
import { useStructureCatalog } from './useStructureCatalog'

export function OperacionesPage() {
  const { catalog, isLoading, loadError, organizationId, reload } = useStructureCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', name: '', description: '' })
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
      onNew={() => { setForm({ id: '', name: '', description: '' }); setModalOpen(true) }}
      rows={rows}
      toastMessage={feedback.toastMessage}
      errorMessage={feedback.errorMessage || loadError}
      isLoading={isLoading}
      emptyMessage="No hay operaciones registradas."
      renderRow={(item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">Ranchos: {catalog.ranches.filter((entry) => entry.operationId === item.id).length}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setForm({ id: item.id, name: item.name, description: item.description || '' }); setModalOpen(true) }}>Editar</Button>
            <Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button>
          </div>
        </div>
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar operación' : 'Nueva operación'} onClose={() => setModalOpen(false)}>
        <form
          onSubmit={stopSubmit(() => feedback.run(async () => {
            if (!organizationId) throw new Error('Perfil sin organización asignada.')
            await upsertOperationSupabase(organizationId, form)
            await reload()
            setModalOpen(false)
          }, 'Operación guardada.'))}
          className="space-y-2"
        >
          <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(async () => { await deleteOperationSupabase(deleteId); await reload(); setDeleteId('') }, 'Operación eliminada.')} />
    </CrudShell>
  )
}
