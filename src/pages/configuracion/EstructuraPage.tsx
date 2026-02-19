import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Toast } from '../../components/ui/Toast'
import {
  OPERATION_CATALOG_UPDATED_EVENT,
  deleteCropSeason,
  deleteProducer,
  deleteRanch,
  deleteSector,
  deleteTunnel,
  deleteValve,
  generateQuickStructure,
  getCatalog,
  replaceCatalog,
  upsertCropSeason,
  upsertProducer,
  upsertRanch,
  upsertSector,
  upsertTunnel,
  upsertValve,
} from '../../lib/operationCatalog/repo'
import type { CropSeason, OperationCatalog, Sector, Tunnel, Valve } from '../../lib/operationCatalog/types'

type TabKey = 'producers' | 'ranches' | 'cropSeasons' | 'structure' | 'io'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'producers', label: 'Productores' },
  { key: 'ranches', label: 'Ranchos' },
  { key: 'cropSeasons', label: 'Cultivos/Temporadas' },
  { key: 'structure', label: 'Sectores/Túneles/Válvulas' },
  { key: 'io', label: 'Import/Export' },
]

export function EstructuraPage() {
  const [tab, setTab] = useState<TabKey>('producers')
  const [catalog, setCatalog] = useState<OperationCatalog>(() => getCatalog())
  const [toastMessage, setToastMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [searchProducer, setSearchProducer] = useState('')
  const [searchRanch, setSearchRanch] = useState('')
  const [searchCropSeason, setSearchCropSeason] = useState('')
  const [searchStructure, setSearchStructure] = useState('')

  const [selectedProducerId, setSelectedProducerId] = useState('')
  const [selectedRanchId, setSelectedRanchId] = useState('')
  const [selectedCropSeasonId, setSelectedCropSeasonId] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [selectedTunnelId, setSelectedTunnelId] = useState('')
  const [selectedValveId, setSelectedValveId] = useState('')

  const [producerForm, setProducerForm] = useState({ id: '', name: '', notes: '' })
  const [ranchForm, setRanchForm] = useState({ id: '', producerId: '', name: '', location: '' })
  const [cropSeasonForm, setCropSeasonForm] = useState<CropSeason>({ id: '', ranchId: '', crop: '', seasonLabel: '' })
  const [sectorForm, setSectorForm] = useState<Sector>({ id: '', ranchId: '', name: '', code: '' })
  const [tunnelForm, setTunnelForm] = useState<Tunnel>({ id: '', sectorId: '', name: '', code: '' })
  const [valveForm, setValveForm] = useState<Valve>({ id: '', tunnelId: '', name: '', code: '' })

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; kind: string; id: string }>({ open: false, kind: '', id: '' })
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickForm, setQuickForm] = useState({ sectors: 2, tunnelsPerSector: 2, valvesPerTunnel: 2 })

  useEffect(() => {
    const reload = () => setCatalog(getCatalog())
    window.addEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
    return () => window.removeEventListener(OPERATION_CATALOG_UPDATED_EVENT, reload)
  }, [])

  const runAction = (action: () => void, successMessage: string) => {
    try {
      action()
      setCatalog(getCatalog())
      setToastMessage(successMessage)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error inesperado.')
    }
  }

  const producers = useMemo(
    () => catalog.producers.filter((item) => item.name.toLowerCase().includes(searchProducer.toLowerCase())),
    [catalog.producers, searchProducer],
  )
  const ranches = useMemo(
    () => catalog.ranches.filter((item) => item.name.toLowerCase().includes(searchRanch.toLowerCase())),
    [catalog.ranches, searchRanch],
  )
  const cropSeasons = useMemo(
    () => catalog.cropSeasons.filter((item) => `${item.crop} ${item.seasonLabel}`.toLowerCase().includes(searchCropSeason.toLowerCase())),
    [catalog.cropSeasons, searchCropSeason],
  )
  const sectors = useMemo(
    () => catalog.sectors.filter((item) => item.name.toLowerCase().includes(searchStructure.toLowerCase())),
    [catalog.sectors, searchStructure],
  )

  const selectedSector = catalog.sectors.find((item) => item.id === selectedSectorId)
  const selectedTunnel = catalog.tunnels.find((item) => item.id === selectedTunnelId)

  const openDelete = (kind: string, id: string) => setConfirmDelete({ open: true, kind, id })

  const doDelete = () => {
    runAction(() => {
      if (confirmDelete.kind === 'producer') deleteProducer(confirmDelete.id)
      if (confirmDelete.kind === 'ranch') deleteRanch(confirmDelete.id)
      if (confirmDelete.kind === 'cropSeason') deleteCropSeason(confirmDelete.id)
      if (confirmDelete.kind === 'sector') deleteSector(confirmDelete.id)
      if (confirmDelete.kind === 'tunnel') deleteTunnel(confirmDelete.id)
      if (confirmDelete.kind === 'valve') deleteValve(confirmDelete.id)
    }, 'Elemento eliminado.')
    setConfirmDelete({ open: false, kind: '', id: '' })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Gestión de Estructura</h1>
      {toastMessage ? <Toast variant="success">{toastMessage}</Toast> : null}
      {errorMessage ? <Toast variant="error">{errorMessage}</Toast> : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button key={item.key} variant={tab === item.key ? 'primary' : 'secondary'} onClick={() => setTab(item.key)}>
            {item.label}
          </Button>
        ))}
      </div>

      {tab === 'producers' ? (
        <Card className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2 border-r border-[#E5E7EB] pr-3">
            <Input placeholder="Buscar productor" value={searchProducer} onChange={(e) => setSearchProducer(e.target.value)} />
            <Button onClick={() => setProducerForm({ id: '', name: '', notes: '' })}>Nuevo</Button>
            {producers.map((item) => (
              <button key={item.id} className="w-full rounded-xl border border-[#E5E7EB] p-2 text-left" onClick={() => { setSelectedProducerId(item.id); setProducerForm({ id: item.id, name: item.name, notes: item.notes || '' }) }}>
                {item.name}
              </button>
            ))}
          </div>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); runAction(() => upsertProducer(producerForm), 'Productor guardado.') }}>
            <Input placeholder="Nombre" value={producerForm.name} onChange={(e) => setProducerForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input placeholder="Notas" value={producerForm.notes} onChange={(e) => setProducerForm((prev) => ({ ...prev, notes: e.target.value }))} />
            <div className="flex gap-2"><Button type="submit">Guardar</Button>{selectedProducerId ? <Button type="button" variant="secondary" onClick={() => openDelete('producer', selectedProducerId)}>Eliminar</Button> : null}</div>
          </form>
        </Card>
      ) : null}

      {tab === 'ranches' ? (
        <Card className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2 border-r border-[#E5E7EB] pr-3">
            <Input placeholder="Buscar rancho" value={searchRanch} onChange={(e) => setSearchRanch(e.target.value)} />
            <Button onClick={() => setRanchForm({ id: '', producerId: catalog.producers[0]?.id || '', name: '', location: '' })}>Nuevo</Button>
            {ranches.map((item) => (
              <button key={item.id} className="w-full rounded-xl border border-[#E5E7EB] p-2 text-left" onClick={() => { setSelectedRanchId(item.id); setRanchForm({ id: item.id, producerId: item.producerId, name: item.name, location: item.location || '' }) }}>
                {item.name}
              </button>
            ))}
          </div>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); runAction(() => upsertRanch(ranchForm), 'Rancho guardado.') }}>
            <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={ranchForm.producerId} onChange={(e) => setRanchForm((prev) => ({ ...prev, producerId: e.target.value }))}><option value="">Productor</option>{catalog.producers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <Input placeholder="Nombre" value={ranchForm.name} onChange={(e) => setRanchForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input placeholder="Ubicación" value={ranchForm.location} onChange={(e) => setRanchForm((prev) => ({ ...prev, location: e.target.value }))} />
            <div className="flex gap-2"><Button type="submit">Guardar</Button>{selectedRanchId ? <Button type="button" variant="secondary" onClick={() => openDelete('ranch', selectedRanchId)}>Eliminar</Button> : null}</div>
          </form>
        </Card>
      ) : null}

      {tab === 'cropSeasons' ? (
        <Card className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2 border-r border-[#E5E7EB] pr-3">
            <Input placeholder="Buscar cultivo/temporada" value={searchCropSeason} onChange={(e) => setSearchCropSeason(e.target.value)} />
            <Button onClick={() => setCropSeasonForm({ id: '', ranchId: catalog.ranches[0]?.id || '', crop: '', seasonLabel: '' })}>Nuevo</Button>
            {cropSeasons.map((item) => (
              <button key={item.id} className="w-full rounded-xl border border-[#E5E7EB] p-2 text-left" onClick={() => { setSelectedCropSeasonId(item.id); setCropSeasonForm(item) }}>
                {item.crop} · {item.seasonLabel}
              </button>
            ))}
          </div>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); runAction(() => upsertCropSeason(cropSeasonForm), 'Cultivo/Temporada guardado.') }}>
            <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={cropSeasonForm.ranchId} onChange={(e) => setCropSeasonForm((prev) => ({ ...prev, ranchId: e.target.value }))}><option value="">Rancho</option>{catalog.ranches.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            <Input placeholder="Cultivo" value={cropSeasonForm.crop} onChange={(e) => setCropSeasonForm((prev) => ({ ...prev, crop: e.target.value }))} />
            <Input placeholder="Temporada" value={cropSeasonForm.seasonLabel} onChange={(e) => setCropSeasonForm((prev) => ({ ...prev, seasonLabel: e.target.value }))} />
            <div className="flex gap-2"><Button type="submit">Guardar</Button>{selectedCropSeasonId ? <Button type="button" variant="secondary" onClick={() => openDelete('cropSeason', selectedCropSeasonId)}>Eliminar</Button> : null}</div>
          </form>
        </Card>
      ) : null}

      {tab === 'structure' ? (
        <Card className="space-y-4">
          <div className="flex gap-2"><Input placeholder="Buscar sector" value={searchStructure} onChange={(e) => setSearchStructure(e.target.value)} /><Button onClick={() => setQuickOpen(true)} disabled={!selectedRanchId}>Generar estructura rápida</Button></div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={selectedRanchId} onChange={(e) => { setSelectedRanchId(e.target.value); setSelectedSectorId(''); setSelectedTunnelId(''); setSelectedValveId('') }}><option value="">Rancho</option>{catalog.ranches.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              {sectors.filter((item) => !selectedRanchId || item.ranchId === selectedRanchId).map((item) => <button key={item.id} className="w-full rounded-xl border border-[#E5E7EB] p-2 text-left" onClick={() => { setSelectedSectorId(item.id); setSectorForm(item) }}>{item.name}</button>)}
            </div>
            <div className="space-y-2">{catalog.tunnels.filter((item) => item.sectorId === selectedSectorId).map((item) => <button key={item.id} className="w-full rounded-xl border border-[#E5E7EB] p-2 text-left" onClick={() => { setSelectedTunnelId(item.id); setTunnelForm(item) }}>{item.name}</button>)}</div>
            <div className="space-y-2">{catalog.valves.filter((item) => item.tunnelId === selectedTunnelId).map((item) => <button key={item.id} className="w-full rounded-xl border border-[#E5E7EB] p-2 text-left" onClick={() => { setSelectedValveId(item.id); setValveForm(item) }}>{item.name}</button>)}</div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); runAction(() => upsertSector({ ...sectorForm, ranchId: sectorForm.ranchId || selectedRanchId }), 'Sector guardado.') }}>
              <select className="w-full rounded-full border border-[#E5E7EB] px-3 py-2" value={sectorForm.ranchId || selectedRanchId} onChange={(e) => setSectorForm((prev) => ({ ...prev, ranchId: e.target.value }))}><option value="">Rancho</option>{catalog.ranches.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              <Input placeholder="Sector" value={sectorForm.name} onChange={(e) => setSectorForm((prev) => ({ ...prev, name: e.target.value }))} />
              <Input placeholder="Código" value={sectorForm.code || ''} onChange={(e) => setSectorForm((prev) => ({ ...prev, code: e.target.value }))} />
              <div className="flex gap-2"><Button type="submit">Guardar</Button>{selectedSector ? <Button type="button" variant="secondary" onClick={() => openDelete('sector', selectedSector.id)}>Eliminar</Button> : null}</div>
            </form>
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); runAction(() => upsertTunnel({ ...tunnelForm, sectorId: tunnelForm.sectorId || selectedSectorId }), 'Túnel guardado.') }}>
              <Input placeholder="Túnel" value={tunnelForm.name} onChange={(e) => setTunnelForm((prev) => ({ ...prev, name: e.target.value }))} />
              <Input placeholder="Código" value={tunnelForm.code || ''} onChange={(e) => setTunnelForm((prev) => ({ ...prev, code: e.target.value }))} />
              <div className="flex gap-2"><Button type="submit">Guardar</Button>{selectedTunnel ? <Button type="button" variant="secondary" onClick={() => openDelete('tunnel', selectedTunnel.id)}>Eliminar</Button> : null}</div>
            </form>
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); runAction(() => upsertValve({ ...valveForm, tunnelId: valveForm.tunnelId || selectedTunnelId }), 'Válvula guardada.') }}>
              <Input placeholder="Válvula" value={valveForm.name} onChange={(e) => setValveForm((prev) => ({ ...prev, name: e.target.value }))} />
              <Input placeholder="Código" value={valveForm.code || ''} onChange={(e) => setValveForm((prev) => ({ ...prev, code: e.target.value }))} />
              <div className="flex gap-2"><Button type="submit">Guardar</Button>{selectedValveId ? <Button type="button" variant="secondary" onClick={() => openDelete('valve', selectedValveId)}>Eliminar</Button> : null}</div>
            </form>
          </div>
        </Card>
      ) : null}

      {tab === 'io' ? (
        <Card className="space-y-3">
          <Button onClick={() => {
            const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'catalog.json'
            a.click()
            URL.revokeObjectURL(url)
          }}>Exportar JSON</Button>
          <label className="inline-flex cursor-pointer items-center rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold">
            Importar JSON
            <input type="file" className="hidden" accept="application/json" onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              try {
                const parsed = JSON.parse(await file.text())
                if (!window.confirm('¿Reemplazar catálogo actual?')) return
                replaceCatalog(parsed)
                setCatalog(getCatalog())
                setToastMessage('Catálogo importado.')
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'No se pudo importar.')
              } finally {
                event.target.value = ''
              }
            }} />
          </label>
        </Card>
      ) : null}

      <Modal open={confirmDelete.open} title="Confirmar eliminación" onClose={() => setConfirmDelete({ open: false, kind: '', id: '' })}>
        <p className="text-sm">¿Seguro que deseas continuar?</p>
        <div className="mt-3 flex gap-2"><Button variant="secondary" onClick={() => setConfirmDelete({ open: false, kind: '', id: '' })}>Cancelar</Button><Button onClick={doDelete}>Eliminar</Button></div>
      </Modal>

      <Modal open={quickOpen} title="Generar estructura rápida" onClose={() => setQuickOpen(false)}>
        <form className="space-y-2" onSubmit={(event: FormEvent) => {
          event.preventDefault()
          runAction(() => generateQuickStructure({ ranchId: selectedRanchId, sectors: quickForm.sectors, tunnelsPerSector: quickForm.tunnelsPerSector, valvesPerTunnel: quickForm.valvesPerTunnel }), 'Estructura generada.')
          setQuickOpen(false)
        }}>
          <Input type="number" min={1} value={quickForm.sectors} onChange={(e) => setQuickForm((prev) => ({ ...prev, sectors: Number(e.target.value) }))} />
          <Input type="number" min={1} value={quickForm.tunnelsPerSector} onChange={(e) => setQuickForm((prev) => ({ ...prev, tunnelsPerSector: Number(e.target.value) }))} />
          <Input type="number" min={1} value={quickForm.valvesPerTunnel} onChange={(e) => setQuickForm((prev) => ({ ...prev, valvesPerTunnel: Number(e.target.value) }))} />
          <Button type="submit" disabled={!selectedRanchId}>Generar</Button>
        </form>
      </Modal>
    </div>
  )
}
