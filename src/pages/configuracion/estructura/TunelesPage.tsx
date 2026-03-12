import { useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { deleteTunnelSupabase, upsertTunnelSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'
import { useStructureCatalog } from './useStructureCatalog'

export function TunelesPage() {
  const { catalog, isLoading, loadError, organizationId, reload } = useStructureCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', sectorId: '', number: '', description: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  const rows = useMemo(() => catalog.tunnels.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.tunnels, query])

  return (
    <CrudShell title="Túneles" searchPlaceholder="Buscar túnel" query={query} setQuery={setQuery} onNew={() => { setForm({ id: '', sectorId: '', number: '', description: '' }); setModalOpen(true) }} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage || loadError} isLoading={isLoading} emptyMessage="No hay túneles registrados."
      renderRow={(item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">Sector: {catalog.sectors.find((entry) => entry.id === item.sectorId)?.name ?? 'N/A'} · Válvulas: {catalog.valves.filter((entry) => entry.tunnelId === item.id).length}</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => { setForm({ id: item.id, sectorId: item.sectorId, number: item.number != null ? String(item.number) : '', description: item.description || '' }); setModalOpen(true) }}>Editar</Button><Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button></div>
        </div>
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar túnel' : 'Nuevo túnel'} onClose={() => setModalOpen(false)}>
        <form onSubmit={stopSubmit(() => feedback.run(async () => {
          if (!organizationId) throw new Error('Perfil sin organización asignada.')
          const numberRaw = form.number.trim()
          const numberVal = Number(numberRaw)
          if (!numberRaw || !Number.isInteger(numberVal) || numberVal <= 0) throw new Error('El número de túnel debe ser un entero positivo.')
          await upsertTunnelSupabase(organizationId, { id: form.id, sectorId: form.sectorId, name: '', number: numberVal, description: form.description })
          await reload(); setModalOpen(false)
        }, 'Túnel guardado.'))} className="space-y-2">
          <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={form.sectorId} onChange={(event) => setForm((prev) => ({ ...prev, sectorId: event.target.value }))}><option value="">Sector</option>{catalog.sectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <Input type="number" placeholder="Número de túnel *" min="1" step="1" required value={form.number} onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(async () => { await deleteTunnelSupabase(deleteId); await reload(); setDeleteId('') }, 'Túnel eliminado.')} />
    </CrudShell>
  )
}
