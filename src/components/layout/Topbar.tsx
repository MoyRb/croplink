import { useEffect } from 'react'
import { Menu } from 'lucide-react'

import { Input } from '../ui/Input'
import { Toast } from '../ui/Toast'
import { useOperationContext } from '../../lib/store/operationContext'
import { cn } from '../../lib/utils'

const selectStyles =
  'rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-gray-700 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

type TopbarProps = {
  onMobileMenuClick: () => void
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {
  const {
    operationContext,
    operations,
    ranches,
    cropSeasons,
    sectors,
    tunnels,
    valves,
    contextNotice,
    clearContextNotice,
    setOperation,
    setRanch,
    setCropSeason,
    setSector,
    setTunnel,
    setValve,
  } = useOperationContext()
  useEffect(() => {
    if (!contextNotice) return
    const timer = window.setTimeout(() => {
      clearContextNotice()
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [clearContextNotice, contextNotice])

  return (
    <header className="space-y-3 border-b border-[#E5E7EB] bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2 max-w-md flex-1">
          <button
            type="button"
            onClick={onMobileMenuClick}
            className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-2 text-gray-600 transition hover:bg-gray-100 md:hidden"
            title="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>
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

      {contextNotice ? <Toast>{contextNotice}</Toast> : null}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-3">
        <p className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Contexto de operación</p>
        <select
          className={cn(selectStyles, 'min-w-40')}
          value={operationContext.operation?.id ?? ''}
          onChange={(event) => setOperation(event.target.value)}
        >
          <option value="">Operación</option>
          {operations.map((operation) => (
            <option key={operation.id} value={operation.id}>
              {operation.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-40')}
          value={operationContext.ranch?.id ?? ''}
          onChange={(event) => setRanch(event.target.value)}
          disabled={!operationContext.operation}
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
          value={operationContext.cropSeason?.id ?? ''}
          onChange={(event) => setCropSeason(event.target.value)}
          disabled={!operationContext.ranch}
        >
          <option value="">Cultivo · Temporada</option>
          {cropSeasons.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.sector?.id ?? ''}
          onChange={(event) => setSector(event.target.value)}
          disabled={!operationContext.ranch || sectors.length === 0}
        >
          <option value="">Sector</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.tunnel?.id ?? ''}
          onChange={(event) => setTunnel(event.target.value)}
          disabled={!operationContext.sector || tunnels.length === 0}
        >
          <option value="">Túnel</option>
          {tunnels.map((tunnel) => (
            <option key={tunnel.id} value={tunnel.id}>
              {tunnel.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.valve?.id ?? ''}
          onChange={(event) => setValve(event.target.value)}
          disabled={!operationContext.sector || valves.length === 0}
        >
          <option value="">Válvula</option>
          {valves.map((valve) => (
            <option key={valve.id} value={valve.id}>
              {valve.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
