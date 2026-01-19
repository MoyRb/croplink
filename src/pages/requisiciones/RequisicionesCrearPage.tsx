import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'

export function RequisicionesCrearPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Crear requisición</h1>
        <p className="text-sm text-gray-500">Completa los datos esenciales para iniciar el flujo.</p>
      </div>

      <Toast variant="info">Estamos conectando este flujo con aprobaciones y marketplace.</Toast>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Nombre del requerimiento</label>
            <Input className="mt-2" placeholder="Compra de insumos" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Centro de costo</label>
            <Input className="mt-2" placeholder="Operaciones" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Monto estimado</label>
            <Input className="mt-2" placeholder="$0.00" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Fecha requerida</label>
            <Input className="mt-2" type="date" />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost">Guardar borrador</Button>
          <Button>Enviar a aprobación</Button>
        </div>
      </Card>
    </div>
  )
}
