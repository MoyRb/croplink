import { Input } from '../ui/Input'

export function Topbar() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-6 py-4">
      <div className="max-w-md flex-1">
        <Input placeholder="Buscar requisiciones, órdenes o proveedores" />
      </div>
      <div className="flex items-center gap-3">
        <button className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-gray-600">
          💬
        </button>
        <button className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-gray-600">
          🔔
        </button>
        <div className="flex items-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-[#DBFAE6] text-center text-sm font-semibold text-[#0B6B2A]">
            CC
          </div>
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
    </header>
  )
}
