import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useRequisicionesStore, type NuevaRequisicion } from '../../lib/store/requisiciones'
import { cn } from '../../lib/utils'

const unidades = ['kg', 'L', 'pza'] as const
const centrosCosto = ['Operaciones', 'Compras', 'Mantenimiento', 'Campo'] as const
const prioridades = ['Baja', 'Media', 'Alta'] as const

const maxFileSize = 10 * 1024 * 1024

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

export function RequisicionesCrearPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addRequisicion } = useRequisicionesStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const prefill = useMemo(() => location.state?.prefill as Partial<NuevaRequisicion> | undefined, [location.state])

  const [producto, setProducto] = useState(prefill?.producto ?? '')
  const [cantidad, setCantidad] = useState(prefill?.cantidad ? String(prefill.cantidad) : '')
  const [unidad, setUnidad] = useState<(typeof unidades)[number]>(prefill?.unidad ?? 'kg')
  const [centroCosto, setCentroCosto] = useState<(typeof centrosCosto)[number]>(
    prefill?.centroCosto ?? 'Operaciones',
  )
  const [prioridad, setPrioridad] = useState<(typeof prioridades)[number]>(prefill?.prioridad ?? 'Media')
  const [notas, setNotas] = useState(prefill?.notas ?? '')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoError, setArchivoError] = useState('')

  const selectStyles =
    'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setArchivo(null)
      setArchivoError('Solo se permiten archivos PDF.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > maxFileSize) {
      setArchivo(null)
      setArchivoError('El PDF debe pesar máximo 10MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setArchivo(file)
    setArchivoError('')
  }

  const handleRemoveFile = () => {
    setArchivo(null)
    setArchivoError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cantidadNumero = Number(cantidad)
    if (!producto || !cantidadNumero || cantidadNumero <= 0) {
      return
    }

    const unitRates = {
      kg: 180,
      L: 220,
      pza: 350,
    }

    const total = cantidadNumero * unitRates[unidad]

    addRequisicion({
      producto,
      cantidad: cantidadNumero,
      unidad,
      centroCosto,
      prioridad,
      notas,
      total,
      adjunto: archivo
        ? {
            nombre: archivo.name,
            tamano: formatFileSize(archivo.size),
          }
        : undefined,
    })

    navigate('/requisiciones/lista', { state: { toast: 'created' } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Crear requisición</h1>
          <p className="text-sm text-gray-500">Completa los datos esenciales para iniciar el flujo.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/marketplace/comparar')}>
          Comparar precios
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Producto</label>
              <Input
                className="mt-2"
                placeholder="Ej. Fertilizante NPK"
                value={producto}
                onChange={(event) => setProducto(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Centro de costo</label>
              <select
                className={cn(selectStyles, 'mt-2')}
                value={centroCosto}
                onChange={(event) => setCentroCosto(event.target.value as (typeof centrosCosto)[number])}
                required
              >
                {centrosCosto.map((centro) => (
                  <option key={centro} value={centro}>
                    {centro}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cantidad</label>
              <div className="mt-2 flex gap-3">
                <Input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={cantidad}
                  onChange={(event) => setCantidad(event.target.value)}
                  required
                />
                <select
                  className={selectStyles}
                  value={unidad}
                  onChange={(event) => setUnidad(event.target.value as (typeof unidades)[number])}
                >
                  {unidades.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Prioridad</label>
              <select
                className={cn(selectStyles, 'mt-2')}
                value={prioridad}
                onChange={(event) => setPrioridad(event.target.value as (typeof prioridades)[number])}
              >
                {prioridades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
              rows={4}
              placeholder="Detalles adicionales para compras"
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Adjuntar ficha técnica (PDF)</label>
            <input
              ref={fileInputRef}
              className={cn(
                'mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]',
              )}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
            />
            <p className="mt-2 text-xs text-gray-500">Solo PDF. Tamaño máximo 10MB.</p>
            {archivoError ? <p className="mt-2 text-xs font-medium text-red-600">{archivoError}</p> : null}
            {archivo ? (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm">
                <div>
                  <div className="font-medium text-gray-900">{archivo.name}</div>
                  <div className="text-xs text-gray-500">{formatFileSize(archivo.size)}</div>
                </div>
                <Button type="button" variant="ghost" onClick={handleRemoveFile}>
                  Quitar
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-gray-50 px-4 py-3 text-sm">
            <span className="text-gray-600">Estimado automático</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(Number(cantidad || 0) * (unidad === 'kg' ? 180 : unidad === 'L' ? 220 : 350))}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate('/requisiciones/lista')}>
              Cancelar
            </Button>
            <Button type="submit">Crear requisición</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
