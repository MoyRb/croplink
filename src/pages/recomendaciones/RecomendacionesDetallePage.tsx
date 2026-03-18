import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { cn } from '../../lib/utils'
import { downloadRecomendacionExcel } from '../../lib/recomendaciones/excel'
import {
  getRecomendacionById,
  updateRecomendacionSeguimiento,
  type Recomendacion,
  type RecommendationStatus,
} from '../../lib/store/recomendaciones'

const statusOptions: { value: RecommendationStatus; label: string; tone: string }[] = [
  { value: 'draft', label: 'Borrador', tone: 'bg-slate-100 text-slate-700' },
  { value: 'submitted', label: 'Enviada', tone: 'bg-amber-100 text-amber-700' },
  { value: 'approved', label: 'Aprobada', tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Rechazada', tone: 'bg-rose-100 text-rose-700' },
]

const metaCardClassName =
  'rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm shadow-slate-200/50'
const selectClassName =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-700 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const emptyLabel = 'Sin capturar'

const displayValue = (value?: string | null) => {
  const safeValue = value?.trim()
  return safeValue ? safeValue : emptyLabel
}

const buildStatusMeta = (status: RecommendationStatus) =>
  statusOptions.find((option) => option.value === status) ?? statusOptions[0]

const buildSectionLink = (label: string, active = false) => ({
  label,
  active,
})

export function RecomendacionesDetallePage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [recomendacion, setRecomendacion] = useState<Recomendacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getRecomendacionById(id)
        if (!cancelled) setRecomendacion(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la recomendación.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleDownload = async () => {
    if (!recomendacion) return

    try {
      setError('')
      await downloadRecomendacionExcel(recomendacion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el Excel.')
    }
  }

  const handleSaveTracking = async () => {
    if (!recomendacion) return

    try {
      setSaving(true)
      setError('')
      const updated = await updateRecomendacionSeguimiento(recomendacion.id, {
        estado: recomendacion.estado,
        comentarios: recomendacion.comentarios,
        fechaAplicacion: recomendacion.fechaAplicacion,
        operario: recomendacion.operario,
      })
      setRecomendacion(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el seguimiento.')
    } finally {
      setSaving(false)
    }
  }

  const irrigationSurfaceBySector = useMemo(() => {
    if (!recomendacion) return new Map<string, string>()

    return recomendacion.riegoFilas.reduce((map, fila) => {
      const key = fila.sector.trim().toLowerCase()
      if (key && fila.superficie.trim()) map.set(key, fila.superficie)
      return map
    }, new Map<string, string>())
  }, [recomendacion])

  const sectionLinks = useMemo(() => {
    if (!recomendacion) return []

    return [
      buildSectionLink('Info.', true),
      buildSectionLink('Productos'),
      ...(recomendacion.modo === 'VIA_RIEGO' ? [buildSectionLink('Válvulas')] : []),
      buildSectionLink('Ejec.'),
      buildSectionLink('PDF'),
    ]
  }, [recomendacion])

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-gray-600">Cargando recomendación...</p>
      </Card>
    )
  }

  if (!recomendacion) {
    return (
      <Card>
        <p className="text-sm text-gray-600">No encontramos la recomendación solicitada.</p>
        <div className="mt-4">
          <Button onClick={() => navigate('/recomendaciones/lista')}>Volver</Button>
        </div>
      </Card>
    )
  }

  const statusMeta = buildStatusMeta(recomendacion.estado)
  const headline = recomendacion.titulo.trim() || `Recomendación ${recomendacion.numero}`
  const subtitle = [displayValue(recomendacion.huerta), recomendacion.fechaRecomendacion || null]
    .filter(Boolean)
    .join(' · ')

  const metadata = [
    { label: 'Rancho', value: displayValue(recomendacion.huerta) },
    { label: 'Fecha', value: displayValue(recomendacion.fechaRecomendacion) },
    { label: 'Clasificación', value: displayValue(recomendacion.clasificacion) },
    { label: 'Contenedor', value: displayValue(recomendacion.contenedor) },
    { label: 'Volumen agua / ha', value: recomendacion.volumenAguaHa ? `${recomendacion.volumenAguaHa} L` : emptyLabel },
    { label: 'Equipo de aplicación', value: displayValue(recomendacion.equipoAplicacion) },
    { label: 'Solicita', value: displayValue(recomendacion.solicita) },
    { label: 'Empleado que recibe', value: displayValue(recomendacion.empleadoRecibe) },
  ]

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-0">
        <div className="border-b border-emerald-100/80 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  Recomendación No. {recomendacion.numero}
                </span>
                <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', statusMeta.tone)}>
                  {statusMeta.label}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
                  {recomendacion.modo === 'FOLIAR_DRENCH' ? 'Foliar / Drench' : 'Vía riego'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{headline}</h1>
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              </div>
              <p className="max-w-4xl text-sm leading-6 text-slate-600">
                <span className="font-semibold text-slate-700">Justificación:</span> {displayValue(recomendacion.justificacion)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/recomendaciones/lista')}>Cerrar</Button>
              <Button variant="secondary" onClick={() => navigate('/recomendaciones/ejecucion')}>Ir a ejecución</Button>
              <Button onClick={handleDownload}>Exportar</Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {sectionLinks.map((link) => {
              const isAction = link.label === 'Ejec.' || link.label === 'PDF'
              const handleClick = () => {
                if (link.label === 'Ejec.') {
                  navigate('/recomendaciones/ejecucion')
                  return
                }
                if (link.label === 'PDF') {
                  void handleDownload()
                }
              }

              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={isAction ? handleClick : undefined}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition',
                    link.active
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                    isAction ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  {link.label}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metadata.map((item) => (
          <div key={item.label} className={metaCardClassName}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Resumen agronómico</h2>
              <p className="text-sm text-slate-500">Datos ejecutivos y operativos de la recomendación.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Superficie</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{displayValue(recomendacion.superficie)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Aplicación</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{displayValue(recomendacion.modoAplicacion)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Semana</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{displayValue(recomendacion.semana)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">pH mezcla</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{displayValue(recomendacion.phMezcla)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Fecha aplicación</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{displayValue(recomendacion.fechaAplicacion)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Horario</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {recomendacion.horaInicio || recomendacion.horaTermino
                  ? `${displayValue(recomendacion.horaInicio)} - ${displayValue(recomendacion.horaTermino)}`
                  : emptyLabel}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Seguimiento</h2>
              <p className="text-sm text-slate-500">Actualiza el estado operativo sin perder el flujo actual.</p>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                <select
                  className={selectClassName}
                  value={recomendacion.estado}
                  onChange={(event) => setRecomendacion((prev) => (prev ? { ...prev, estado: event.target.value as RecommendationStatus } : prev))}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Empleado que recibe / ejecuta</label>
                <Input
                  placeholder="Operario"
                  value={recomendacion.operario}
                  onChange={(event) => setRecomendacion((prev) => (prev ? { ...prev, operario: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de aplicación</label>
                <Input
                  placeholder="Fecha aplicación"
                  type="date"
                  value={recomendacion.fechaAplicacion}
                  onChange={(event) => setRecomendacion((prev) => (prev ? { ...prev, fechaAplicacion: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Comentarios</label>
                <textarea
                  className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm text-slate-700 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
                  rows={5}
                  placeholder="Comentarios de seguimiento"
                  value={recomendacion.comentarios}
                  onChange={(event) => setRecomendacion((prev) => (prev ? { ...prev, comentarios: event.target.value } : prev))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void handleSaveTracking()} disabled={saving}>{saving ? 'Guardando...' : 'Guardar seguimiento'}</Button>
            </div>
          </div>
        </Card>
      </section>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tabla agrícola principal</h2>
            <p className="text-sm text-slate-500">Productos por sector con las dosis reales capturadas en la recomendación.</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {recomendacion.productos.length} producto{recomendacion.productos.length === 1 ? '' : 's'} registrado{recomendacion.productos.length === 1 ? '' : 's'}
          </div>
        </div>

        {recomendacion.productos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            Esta recomendación todavía no tiene productos registrados.
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <TableHead>Sector</TableHead>
                <TableHead>Superficie sector</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Dosis sector</TableHead>
                <TableHead>Dosis / ha</TableHead>
                <TableHead>Ingrediente activo</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Reentrada</TableHead>
              </tr>
            </thead>
            <tbody>
              {recomendacion.productos.map((producto, index) => {
                const sectorSurface = irrigationSurfaceBySector.get(producto.sector.trim().toLowerCase()) ?? ''
                const dosePerHa =
                  producto.dosePerHa != null
                    ? `${producto.dosePerHa} ${producto.doseUnit?.trim() ? producto.doseUnit : ''}`.trim()
                    : ''

                return (
                  <TableRow key={`${producto.producto}-${index}`} className="align-top hover:bg-slate-50/80">
                    <TableCell>
                      <div className="min-w-28">
                        <p className="font-medium text-slate-800">{displayValue(producto.sector)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{displayValue(sectorSurface)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-44">
                        <p className="font-semibold text-slate-900">{displayValue(producto.producto)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                        {displayValue(producto.gastoTotal || producto.dosis || producto.gasto)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {displayValue(dosePerHa)}
                      </span>
                    </TableCell>
                    <TableCell>{displayValue(producto.ingredienteActivo)}</TableCell>
                    <TableCell>{displayValue(producto.intervalo)}</TableCell>
                    <TableCell>{displayValue(producto.reentrada)}</TableCell>
                  </TableRow>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {recomendacion.modo === 'VIA_RIEGO' ? (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Válvulas y sectores vía riego</h2>
            <p className="text-sm text-slate-500">Distribución real capturada para ejecución por riego.</p>
          </div>

          {recomendacion.riegoFilas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No hay filas de riego registradas para esta recomendación.
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Sector</TableHead>
                  <TableHead>Válvula</TableHead>
                  <TableHead>Superficie</TableHead>
                  <TableHead>Productos</TableHead>
                </tr>
              </thead>
              <tbody>
                {recomendacion.riegoFilas.map((fila, index) => (
                  <TableRow key={`${fila.sector}-${index}`} className="align-top hover:bg-slate-50/80">
                    <TableCell className="font-medium text-slate-800">{displayValue(fila.sector)}</TableCell>
                    <TableCell>{displayValue(fila.valvula)}</TableCell>
                    <TableCell>{displayValue(fila.superficie)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {fila.productos.filter((item) => item.trim()).length > 0 ? (
                          fila.productos
                            .filter((item) => item.trim())
                            .map((item) => (
                              <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {item}
                              </span>
                            ))
                        ) : (
                          <span className="text-sm text-slate-500">{emptyLabel}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
