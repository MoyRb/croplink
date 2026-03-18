import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { deleteRanchSupabase, upsertRanchSupabase } from '../../../lib/operationCatalog/supabaseRepo'
import { DeleteModal, ModalActions, stopSubmit, useCrudFeedback, CrudShell } from './shared'
import { formatArea, getRanchAssignments } from './structureUtils'
import { useStructureCatalog } from './useStructureCatalog'

export function RanchosPage() {
  const { catalog, isLoading, loadError, organizationId, reload } = useStructureCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ id: '', operationId: '', name: '', description: '', surfaceHa: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const feedback = useCrudFeedback()

  const rows = useMemo(() => catalog.ranches.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [catalog.ranches, query])

  return (
    <CrudShell title="Ranchos" searchPlaceholder="Buscar rancho" query={query} setQuery={setQuery} onNew={() => { setForm({ id: '', operationId: '', name: '', description: '', surfaceHa: '' }); setModalOpen(true) }} rows={rows} toastMessage={feedback.toastMessage} errorMessage={feedback.errorMessage || loadError} isLoading={isLoading} emptyMessage="No hay ranchos registrados."
      renderRow={(item) => (
        (() => {
          const assignments = getRanchAssignments(item.id, catalog)

          return (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] p-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-gray-500">Operación: {catalog.operations.find((entry) => entry.id === item.operationId)?.name ?? 'N/A'} · Superficie: {formatArea(item.surfaceHa)} · Sectores: {catalog.sectors.filter((entry) => entry.ranchId === item.id).length}</p>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {assignments.length > 0 ? (
                    assignments.map((assignment) => (
                      <p key={assignment.id}>
                        Cultivo: {assignment.cropName} · Variedad: {assignment.variety} · {assignment.seasonName}
                      </p>
                    ))
                  ) : (
                    <p>Sin cultivo/temporada asignados.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/configuracion/estructura/ranchos/${item.id}`}>
                  <Button variant="secondary">Ver detalle</Button>
                </Link>
                <Button variant="secondary" onClick={() => { setForm({ id: item.id, operationId: item.operationId, name: item.name, description: item.description || '', surfaceHa: item.surfaceHa != null ? String(item.surfaceHa) : '' }); setModalOpen(true) }}>Editar</Button>
                <Button variant="secondary" onClick={() => setDeleteId(item.id)}>Eliminar</Button>
              </div>
            </div>
          )
        })()
      )}
    >
      <Modal open={modalOpen} title={form.id ? 'Editar rancho' : 'Nuevo rancho'} onClose={() => setModalOpen(false)}>
        <form onSubmit={stopSubmit(() => feedback.run(async () => {
          if (!organizationId) throw new Error('Perfil sin organización asignada.')
          const surfaceHaRaw = form.surfaceHa.trim()
          if (surfaceHaRaw !== '' && (Number.isNaN(Number(surfaceHaRaw)) || Number(surfaceHaRaw) < 0)) throw new Error('Superficie debe ser un número >= 0.')
          await upsertRanchSupabase(organizationId, {
            id: form.id,
            operationId: form.operationId,
            name: form.name,
            description: form.description,
            surfaceHa: surfaceHaRaw !== '' ? Number(surfaceHaRaw) : null,
          })
          await reload()
          setModalOpen(false)
        }, 'Rancho guardado.'))} className="space-y-2">
          <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={form.operationId} onChange={(event) => setForm((prev) => ({ ...prev, operationId: event.target.value }))}>
            <option value="">Operación</option>
            {catalog.operations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input type="number" placeholder="Superficie (ha)" min="0" step="any" value={form.surfaceHa} onChange={(event) => setForm((prev) => ({ ...prev, surfaceHa: event.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <ModalActions onClose={() => setModalOpen(false)} />
        </form>
      </Modal>
      <DeleteModal open={Boolean(deleteId)} onClose={() => setDeleteId('')} onConfirm={() => feedback.run(async () => { await deleteRanchSupabase(deleteId); await reload(); setDeleteId('') }, 'Rancho eliminado.')} />
    </CrudShell>
  )
}
