import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { downloadRecomendacionExcel } from '../../lib/recomendaciones/excel'
import { createRecomendacion, type Recomendacion, type RecommendationMode } from '../../lib/store/recomendaciones'

const createProducto = () => ({
  producto: '',
  ingredienteActivo: '',
  dosis: '',
  gasto: '',
  gastoTotal: '',
  sector: '',
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
  titulo: '',
  huerta: '',
  superficie: '',
  solicita: '',
  modoAplicacion: '',
  justificacion: '',
  fechaRecomendacion: '',
  semana: '',
  equipoAplicacion: '',
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
            <div key={index} className="grid gap-2 md:grid-cols-6">
              <Input placeholder="Producto" value={item.producto} onChange={(event) => setForm((prev) => ({ ...prev, productos: prev.productos.map((p, i) => i === index ? { ...p, producto: event.target.value } : p) }))} />
              <Input placeholder="I. activo" value={item.ingredienteActivo} onChange={(event) => setForm((prev) => ({ ...prev, productos: prev.productos.map((p, i) => i === index ? { ...p, ingredienteActivo: event.target.value } : p) }))} />
              <Input placeholder="Dosis" value={item.dosis} onChange={(event) => setForm((prev) => ({ ...prev, productos: prev.productos.map((p, i) => i === index ? { ...p, dosis: event.target.value } : p) }))} />
              <Input placeholder="Gasto" value={item.gasto} onChange={(event) => setForm((prev) => ({ ...prev, productos: prev.productos.map((p, i) => i === index ? { ...p, gasto: event.target.value } : p) }))} />
              <Input placeholder="Gasto total" value={item.gastoTotal} onChange={(event) => setForm((prev) => ({ ...prev, productos: prev.productos.map((p, i) => i === index ? { ...p, gastoTotal: event.target.value } : p) }))} />
              <Input placeholder="Sector" value={item.sector} onChange={(event) => setForm((prev) => ({ ...prev, productos: prev.productos.map((p, i) => i === index ? { ...p, sector: event.target.value } : p) }))} />
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
