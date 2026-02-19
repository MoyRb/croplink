import { Input } from '../ui/Input'
import { useOperationContext } from '../../lib/store/operationContext'
import { cn } from '../../lib/utils'

const selectStyles =
  'rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-gray-700 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

export function Topbar() {
  const {
    operationContext,
    producers,
    ranches,
    crops,
    seasons,
    sectors,
    tunnels,
    valves,
    setProducer,
    setRanch,
    setCrop,
    setSeason,
    setSector,
    setTunnel,
    setValve,
  } = useOperationContext()

  return (
    <header className="space-y-3 border-b border-[#E5E7EB] bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-md flex-1">
          <Input placeholder="Buscar requisiciones, órdenes o proveedores" />
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-gray-600">💬</button>
          <button className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-gray-600">🔔</button>
          <div className="flex items-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#DBFAE6] text-center text-sm font-semibold text-[#0B6B2A]">CC</div>
            <div className="text-sm">
              <div className="font-semibold text-gray-900">Camila Cruz</div>
              <select className="text-xs text-gray-500 focus:outline-none">
                <option>Administradora</option>
                <option>Compras</option>
                <option>Supervisor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-3">
        <p className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Contexto de operación</p>
        <select
          className={cn(selectStyles, 'min-w-40')}
          value={operationContext.producer?.id ?? ''}
          onChange={(event) => setProducer(event.target.value)}
        >
          <option value="">Productor</option>
          {producers.map((producer) => (
            <option key={producer.id} value={producer.id}>
              {producer.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-40')}
          value={operationContext.ranch?.id ?? ''}
          onChange={(event) => setRanch(event.target.value)}
          disabled={!operationContext.producer}
        >
          <option value="">Rancho</option>
          {ranches.map((ranch) => (
            <option key={ranch.id} value={ranch.id}>
              {ranch.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-36')}
          value={operationContext.crop}
          onChange={(event) => setCrop(event.target.value)}
          disabled={!operationContext.ranch}
        >
          <option value="">Cultivo</option>
          {crops.map((crop) => (
            <option key={crop} value={crop}>
              {crop}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.season ?? ''}
          onChange={(event) => setSeason(event.target.value)}
          disabled={!operationContext.crop || seasons.length === 0}
        >
          <option value="">Temporada</option>
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.sector ?? ''}
          onChange={(event) => setSector(event.target.value)}
          disabled={!operationContext.crop || sectors.length === 0}
        >
          <option value="">Sector</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.tunnel ?? ''}
          onChange={(event) => setTunnel(event.target.value)}
          disabled={!operationContext.crop || tunnels.length === 0}
        >
          <option value="">Túnel</option>
          {tunnels.map((tunnel) => (
            <option key={tunnel} value={tunnel}>
              {tunnel}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.valve ?? ''}
          onChange={(event) => setValve(event.target.value)}
          disabled={!operationContext.crop || valves.length === 0}
        >
          <option value="">Válvula</option>
          {valves.map((valve) => (
            <option key={valve} value={valve}>
              {valve}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
