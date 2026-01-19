import { useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'

export function MarketplaceCompararPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Marketplace · Comparar</h1>
          <p className="text-sm text-gray-500">Evalúa propuestas y selecciona proveedores.</p>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Abrir comparativa
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { name: 'GreenSupply', price: '$9,200', lead: '3 días' },
          { name: 'SupplyOne', price: '$8,950', lead: '5 días' },
          { name: 'FarmHub', price: '$9,450', lead: '2 días' },
        ].map((vendor) => (
          <Card key={vendor.name}>
            <div className="text-sm text-gray-500">Proveedor</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">{vendor.name}</div>
            <div className="mt-4 text-sm text-gray-500">Precio final</div>
            <div className="text-xl font-semibold text-gray-900">{vendor.price}</div>
            <div className="mt-4 text-sm text-gray-500">Lead time</div>
            <div className="text-base font-medium text-gray-900">{vendor.lead}</div>
            <Button className="mt-6 w-full">Seleccionar</Button>
          </Card>
        ))}
      </div>

      <Modal open={open} title="Comparativa rápida" onClose={() => setOpen(false)}>
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            Esta vista abrirá un modal con tablas comparativas, scorecards y alertas de compliance.
          </p>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4 text-gray-700">
            Integración con scoring ESG y contratos marco.
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button>Continuar evaluación</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
