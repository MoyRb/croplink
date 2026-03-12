import { useMemo, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { bulkInsertTunnelsSupabase, deleteTunnelSupabase, upsertTunnelSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import { CrudShell, DeleteModal, ModalActions, stopSubmit, useCrudFeedback } from './shared'
import { useStructureCatalog } from './useStructureCatalog'

export function TunelesPage() {
  const { catalog, isLoading, loadError, organizationId, reload } = useStructureCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', sectorId: '', number: '', description: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkFrom, setBulkFrom] = useState('')
  const [bulkTo, setBulkTo] = useState('')
  const feedback = useCrudFeedback()

  // "Rancho X · Sector N" labels keyed by sector id — built once from already-loaded catalog
  const sectorLabelsById = useMemo(() => {
    const map = new Map<string, string>()
    for (const sector of catalog.sectors) {
      const ranch = catalog.ranches.find((r) => r.id === sector.ranchId)
      map.set(sector.id, `${ranch?.name ?? 'Sin rancho'} · ${sector.name}`)
    }
    return map
  }, [catalog.sectors, catalog.ranches])

  const rows = useMemo(() => catalog.tunnels.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.tunnels, query])

  const openNew = () => {
    setForm({ id: '', sectorId: '', number: '', description: '' })
    setBulkMode(false)
    setBulkFrom('')
    setBulkTo('')
    setModalOpen(true)
  }

  const handleBulkSubmit = async () => {
    if (!organizationId) { feedback.setErrorMessage('Perfil sin organización asignada.'); return }
    if (!form.sectorId) { feedback.setErrorMessage('Selecciona un sector.'); return }
    const from = Number(bulkFrom)
    const to = Number(bulkTo)
    if (!Number.isInteger(from) || from <= 0) { feedback.setErrorMessage('Desde debe ser un entero positivo.'); return }
    if (!Number.isInteger(to) || to < from) { feedback.setErrorMessage('Hasta debe ser >= Desde.'); return }
    feedback.setErrorMessage('')
    try {
      const result = await bulkInsertTunnelsSupabase(organizationId, form.sectorId, from, to, form.description)
      await reload()
      feedback.setToastMessage(
        `${result.created} creado${result.created !== 1 ? 's' : ''}${result.skipped > 0 ? `, ${result.skipped} omitido${result.skipped !== 1 ? 's' : ''} (ya existían)` : ''}.`,
      )
      setModalOpen(false)
    } catch (err) {
      feedback.setErrorMessage(err instanceof Error ? err.message : 'Error inesperado.')
    }
  }

  return (
    <CrudShell title="Túneles" searchPlaceholder="Buscar túnel" query={query} setQuery={setQuery} onNew={openNew} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage || loadError} isLoading={isLoading} emptyMessage="No hay túneles registrados."
      renderRow={(item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">{sectorLabelsById.get(item.sectorId) ?? 'N/A'} · Válvulas: {catalog.valves.filter((entry) => entry.tunnelId === item.id).length}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setForm({ id: item.id, sectorId: item.sectorId, number: item.number != null ? String(item.number) : '', description: item.description || '' }); setBulkMode(false); setModalOpen(true) }}>Editar</Button>
            <Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button>
          </div>
        </div>
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar túnel' : 'Nuevo túnel'} onClose={() => setModalOpen(false)}>
        {/* Mode toggle — only when creating */}
        {!form.id ? (
          <div className="mb-3 flex gap-2">
            <button type="button" onClick={() => setBulkMode(false)} className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${!bulkMode ? 'bg-[#0B6B2A] text-white' : 'border border-[#E5E7EB] text-gray-600 hover:bg-gray-50'}`}>Crear uno</button>
            <button type="button" onClick={() => setBulkMode(true)} className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${bulkMode ? 'bg-[#0B6B2A] text-white' : 'border border-[#E5E7EB] text-gray-600 hover:bg-gray-50'}`}>Crear varios</button>
          </div>
        ) : null}

        <form
          onSubmit={bulkMode
            ? stopSubmit(() => { void handleBulkSubmit() })
            : stopSubmit(() => feedback.run(async () => {
                if (!organizationId) throw new Error('Perfil sin organización asignada.')
                const numberRaw = form.number.trim()
                const numberVal = Number(numberRaw)
                if (!numberRaw || !Number.isInteger(numberVal) || numberVal <= 0) throw new Error('El número de túnel debe ser un entero positivo.')
                await upsertTunnelSupabase(organizationId, { id: form.id, sectorId: form.sectorId, name: '', number: numberVal, description: form.description })
                await reload(); setModalOpen(false)
              }, 'Túnel guardado.'))}
          className="space-y-2"
        >
          <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={form.sectorId} onChange={(event) => setForm((prev) => ({ ...prev, sectorId: event.target.value }))}>
            <option value="">Sector</option>
            {catalog.sectors.map((item) => <option key={item.id} value={item.id}>{sectorLabelsById.get(item.id)}</option>)}
          </select>

          {bulkMode ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Desde *" min="1" step="1" required value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} />
                <Input type="number" placeholder="Hasta *" min="1" step="1" required value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} />
              </div>
              <Input placeholder="Descripción (opcional, aplica a todos)" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </>
          ) : (
            <>
              <Input type="number" placeholder="Número de túnel *" min="1" step="1" required value={form.number} onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))} />
              <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </>
          )}

          <ModalActions onClose={() => setModalOpen(false)} submitLabel={bulkMode ? 'Crear túneles' : 'Guardar'} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(async () => { await deleteTunnelSupabase(deleteId); await reload(); setDeleteId('') }, 'Túnel eliminado.')} />
    </CrudShell>
  )
}
