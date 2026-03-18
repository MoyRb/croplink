import { useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { deleteSectorSupabase, upsertSectorSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'
import { useStructureCatalog } from './useStructureCatalog'

export function SectoresPage() {
  const { catalog, isLoading, loadError, organizationId, reload } = useStructureCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', ranchId: '', number: '', description: '', areaHa: '', tunnelCount: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  const rows = useMemo(() => catalog.sectors.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.sectors, query])

  return (
    <CrudShell title="Sectores" searchPlaceholder="Buscar sector" query={query} setQuery={setQuery} onNew={() => { setForm({ id: '', ranchId: '', number: '', description: '', areaHa: '', tunnelCount: '' }); setModalOpen(true) }} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage || loadError} isLoading={isLoading} emptyMessage="No hay sectores registrados."
      renderRow={(item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">Rancho: {catalog.ranches.find((entry) => entry.id === item.ranchId)?.name ?? 'N/A'} · Túneles: {item.tunnelCount ?? catalog.tunnels.filter((entry) => entry.sectorId === item.id).length}{item.areaHa != null ? ` · ${item.areaHa} ha` : ''}</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => { setForm({ id: item.id, ranchId: item.ranchId, number: item.number != null ? String(item.number) : '', description: item.description || '', areaHa: item.areaHa != null ? String(item.areaHa) : '', tunnelCount: item.tunnelCount != null ? String(item.tunnelCount) : String(catalog.tunnels.filter((entry) => entry.sectorId === item.id).length) }); setModalOpen(true) }}>Editar</Button><Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button></div>
        </div>
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar sector' : 'Nuevo sector'} onClose={() => setModalOpen(false)}>
        <form onSubmit={stopSubmit(() => feedback.run(async () => {
          if (!organizationId) throw new Error('Perfil sin organización asignada.')
          const numberRaw = form.number.trim()
          const numberVal = Number(numberRaw)
          if (!numberRaw || !Number.isInteger(numberVal) || numberVal <= 0) throw new Error('El número de sector debe ser un entero positivo.')
          const areaHaRaw = form.areaHa.trim()
          if (areaHaRaw !== '' && (isNaN(Number(areaHaRaw)) || Number(areaHaRaw) < 0)) throw new Error('Superficie debe ser un número >= 0.')
          const tunnelCountRaw = form.tunnelCount.trim()
          if (tunnelCountRaw !== '' && (!Number.isInteger(Number(tunnelCountRaw)) || Number(tunnelCountRaw) < 0)) throw new Error('Número de túneles debe ser un entero >= 0.')
          await upsertSectorSupabase(organizationId, {
            id: form.id,
            ranchId: form.ranchId,
            name: '',
            number: numberVal,
            description: form.description,
            areaHa: areaHaRaw !== '' ? Number(areaHaRaw) : null,
            tunnelCount: tunnelCountRaw !== '' ? Number(tunnelCountRaw) : null,
          })
          await reload(); setModalOpen(false)
        }, 'Sector guardado.'))} className="space-y-2">
          <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={form.ranchId} onChange={(event) => setForm((prev) => ({ ...prev, ranchId: event.target.value }))}><option value="">Rancho</option>{catalog.ranches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <Input type="number" placeholder="Número de sector *" min="1" step="1" required value={form.number} onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))} />
          <Input type="number" placeholder="Superficie (ha)" min="0" step="any" value={form.areaHa} onChange={(event) => setForm((prev) => ({ ...prev, areaHa: event.target.value }))} />
          <Input type="number" placeholder="Número de túneles" min="0" step="1" value={form.tunnelCount} onChange={(event) => setForm((prev) => ({ ...prev, tunnelCount: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(async () => { await deleteSectorSupabase(deleteId); await reload(); setDeleteId('') }, 'Sector eliminado.')} />
    </CrudShell>
  )
}
