import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { resolveCatalogProductByName } from '../../lib/plaguicidas'
import { downloadRecomendacionExcel } from '../../lib/recomendaciones/excel'
import { createRecomendacion, type Recomendacion, type RecommendationMode } from '../../lib/store/recomendaciones'

const createProducto = () => ({
  producto: '',
  ingredienteActivo: '',
  dosis: '',
  gasto: '',
  gastoTotal: '',
  sector: '',
  dosePerHa: null as number | null,
  doseUnit: '',
  intervalo: null as string | null,
  reentrada: null as string | null,
})

const createRiegoFila = () => ({
  sector: '',
  valvula: '',
  superficie: '',
  productos: Array.from({ length: 10 }, () => ''),
})

const baseForm: Omit<Recomendacion, 'id' | 'createdAt'> = {
  estado: 'draft',
  modo: 'FOLIAR_DRENCH',
  numero: '',
  titulo: '',
  huerta: '',
  superficie: '',
  solicita: '',
  modoAplicacion: '',
  justificacion: '',
  clasificacion: '',
  contenedor: '',
  volumenAguaHa: '',
  fechaRecomendacion: '',
  semana: '',
  equipoAplicacion: '',
  empleadoRecibe: '',
  operario: '',
  fechaAplicacion: '',
  phMezcla: '',
  horaInicio: '',
  horaTermino: '',
  comentarios: '',
  productos: [createProducto()],
  dosisPorHa: Array.from({ length: 10 }, () => ''),
  riegoFilas: [createRiegoFila()],
}

export function RecomendacionesCrearPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(baseForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [catalogHints, setCatalogHints] = useState<Record<number, string>>({})

  const handleModeChange = (mode: RecommendationMode) => {
    setForm((prev) => ({ ...prev, modo: mode }))
  }

  const handleSave = async () => {
    if (!form.titulo || !form.huerta || !form.fechaRecomendacion) {
      setError('Completa al menos título, huerta y fecha de recomendación.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const saved = await createRecomendacion(form)
      navigate(`/recomendaciones/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la recomendación.')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    try {
      await downloadRecomendacionExcel({ ...form, id: 'preview', createdAt: new Date().toISOString() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el Excel.')
    }
  }

  const updateProducto = (index: number, updater: (current: Recomendacion['productos'][number]) => Recomendacion['productos'][number]) => {
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)),
    }))
  }

  const handleAutofillFromCatalog = async (index: number) => {
    const current = form.productos[index]
    if (!current) return

    try {
      const match = await resolveCatalogProductByName(current.producto)
      if (!match) {
        setCatalogHints((prev) => ({ ...prev, [index]: '' }))
        return
      }

      updateProducto(index, (item) => ({
        ...item,
        ingredienteActivo: item.ingredienteActivo.trim() || match.activeIngredient,
        dosis: item.dosis.trim() || match.doseLabel,
        dosePerHa: item.dosePerHa ?? match.dosePerHa,
        doseUnit: item.doseUnit?.trim() || match.doseUnit || '',
        intervalo: item.intervalo ?? match.intervalo,
        reentrada: item.reentrada ?? match.reentrada,
      }))

      const hintParts: string[] = []
      if (match.dosePerHa !== null) hintParts.push(`Dosis/ha: ${match.dosePerHa}`)
      if (match.doseUnit) hintParts.push(`Unidad: ${match.doseUnit}`)
      if (match.intervalo) hintParts.push(`Intervalo: ${match.intervalo}`)
      if (match.reentrada) hintParts.push(`Reentrada: ${match.reentrada}`)
      setCatalogHints((prev) => ({
        ...prev,
        [index]: hintParts.length > 0 ? `Autocompletado desde catálogo. ${hintParts.join(' · ')}` : 'Producto reconocido en catálogo.',
      }))
    } catch {
      setCatalogHints((prev) => ({ ...prev, [index]: '' }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva recomendación</h1>
          <p className="text-sm text-gray-500">Captura y exporta el formato oficial de CropLink.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/recomendaciones/lista')}>Volver a lista</Button>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
            value={form.modo}
            onChange={(event) => handleModeChange(event.target.value as RecommendationMode)}
          >
            <option value="FOLIAR_DRENCH">Foliar / Drench</option>
            <option value="VIA_RIEGO">Vía riego</option>
          </select>
          <Input placeholder="Título recomendación" value={form.titulo} onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))} />
          <Input placeholder="Huerta" value={form.huerta} onChange={(event) => setForm((prev) => ({ ...prev, huerta: event.target.value }))} />
          <Input placeholder="Superficie" value={form.superficie} onChange={(event) => setForm((prev) => ({ ...prev, superficie: event.target.value }))} />
          <Input placeholder="Solicita" value={form.solicita} onChange={(event) => setForm((prev) => ({ ...prev, solicita: event.target.value }))} />
          <Input placeholder="Modo de aplicación" value={form.modoAplicacion} onChange={(event) => setForm((prev) => ({ ...prev, modoAplicacion: event.target.value }))} />
          <Input placeholder="Fecha recomendación" type="date" value={form.fechaRecomendacion} onChange={(event) => setForm((prev) => ({ ...prev, fechaRecomendacion: event.target.value }))} />
          <Input placeholder="Semana" value={form.semana} onChange={(event) => setForm((prev) => ({ ...prev, semana: event.target.value }))} />
          <Input placeholder="Equipo aplicación" value={form.equipoAplicacion} onChange={(event) => setForm((prev) => ({ ...prev, equipoAplicacion: event.target.value }))} />
          <Input placeholder="Operario" value={form.operario} onChange={(event) => setForm((prev) => ({ ...prev, operario: event.target.value }))} />
          <Input placeholder="Fecha aplicación" type="date" value={form.fechaAplicacion} onChange={(event) => setForm((prev) => ({ ...prev, fechaAplicacion: event.target.value }))} />
          <Input placeholder="pH mezcla" value={form.phMezcla} onChange={(event) => setForm((prev) => ({ ...prev, phMezcla: event.target.value }))} />
          <Input placeholder="Hora inicio" type="time" value={form.horaInicio} onChange={(event) => setForm((prev) => ({ ...prev, horaInicio: event.target.value }))} />
          <Input placeholder="Hora término" type="time" value={form.horaTermino} onChange={(event) => setForm((prev) => ({ ...prev, horaTermino: event.target.value }))} />
          <Input className="md:col-span-4" placeholder="Justificación" value={form.justificacion} onChange={(event) => setForm((prev) => ({ ...prev, justificacion: event.target.value }))} />
          <Input className="md:col-span-4" placeholder="Comentarios" value={form.comentarios} onChange={(event) => setForm((prev) => ({ ...prev, comentarios: event.target.value }))} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tabla de productos</h2>
          <Button variant="ghost" onClick={() => setForm((prev) => ({ ...prev, productos: [...prev.productos, createProducto()] }))}>Agregar fila</Button>
        </div>
        <div className="mt-4 space-y-3">
          {form.productos.map((item, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-[#E5E7EB] p-3">
              <div className="grid gap-2 md:grid-cols-8">
                <Input
                  placeholder="Producto"
                  value={item.producto}
                  onBlur={() => void handleAutofillFromCatalog(index)}
                  onChange={(event) => updateProducto(index, (current) => ({ ...current, producto: event.target.value }))}
                />
                <Input placeholder="I. activo" value={item.ingredienteActivo} onChange={(event) => updateProducto(index, (current) => ({ ...current, ingredienteActivo: event.target.value }))} />
                <Input placeholder="Dosis etiqueta" value={item.dosis} onChange={(event) => updateProducto(index, (current) => ({ ...current, dosis: event.target.value }))} />
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Dosis / ha"
                  value={item.dosePerHa ?? ''}
                  onChange={(event) =>
                    updateProducto(index, (current) => ({
                      ...current,
                      dosePerHa: event.target.value.trim() === '' ? null : Number(event.target.value),
                    }))
                  }
                />
                <Input placeholder="Unidad" value={item.doseUnit ?? ''} onChange={(event) => updateProducto(index, (current) => ({ ...current, doseUnit: event.target.value }))} />
                <Input placeholder="Gasto" value={item.gasto} onChange={(event) => updateProducto(index, (current) => ({ ...current, gasto: event.target.value }))} />
                <Input placeholder="Gasto total" value={item.gastoTotal} onChange={(event) => updateProducto(index, (current) => ({ ...current, gastoTotal: event.target.value }))} />
                <Input placeholder="Sector" value={item.sector} onChange={(event) => updateProducto(index, (current) => ({ ...current, sector: event.target.value }))} />
              </div>
              {catalogHints[index] ? <p className="text-xs text-slate-500">{catalogHints[index]}</p> : null}
            </div>
          ))}
        </div>
      </Card>

      {form.modo === 'VIA_RIEGO' ? (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Vía riego</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {form.dosisPorHa.map((dosis, index) => (
              <Input
                key={index}
                placeholder={`Dosis producto ${index + 1}`}
                value={dosis}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dosisPorHa: prev.dosisPorHa.map((value, idx) => (idx === index ? event.target.value : value)),
                  }))
                }
              />
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={() => setForm((prev) => ({ ...prev, riegoFilas: [...prev.riegoFilas, createRiegoFila()] }))}>Agregar sector</Button>
          </div>
          <div className="mt-4 space-y-3">
            {form.riegoFilas.map((fila, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-[#E5E7EB] p-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <Input placeholder="Sector" value={fila.sector} onChange={(event) => setForm((prev) => ({ ...prev, riegoFilas: prev.riegoFilas.map((f, i) => i === index ? { ...f, sector: event.target.value } : f) }))} />
                  <Input placeholder="Válvula" value={fila.valvula} onChange={(event) => setForm((prev) => ({ ...prev, riegoFilas: prev.riegoFilas.map((f, i) => i === index ? { ...f, valvula: event.target.value } : f) }))} />
                  <Input placeholder="Superficie" value={fila.superficie} onChange={(event) => setForm((prev) => ({ ...prev, riegoFilas: prev.riegoFilas.map((f, i) => i === index ? { ...f, superficie: event.target.value } : f) }))} />
                </div>
                <div className="grid gap-2 md:grid-cols-5">
                  {fila.productos.map((valor, productIndex) => (
                    <Input
                      key={productIndex}
                      placeholder={`Prod ${productIndex + 1}`}
                      value={valor}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          riegoFilas: prev.riegoFilas.map((f, i) =>
                            i === index
                              ? {
                                  ...f,
                                  productos: f.productos.map((productValue, idx) =>
                                    idx === productIndex ? event.target.value : productValue,
                                  ),
                                }
                              : f,
                          ),
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={handleDownload}>Descargar Excel</Button>
        <Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Guardando...' : 'Guardar recomendación'}</Button>
      </div>
    </div>
  )
}
