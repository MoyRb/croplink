import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { downloadRecomendacionExcel } from '../../lib/recomendaciones/excel'
import {
  getRecomendacionById,
  updateRecomendacionSeguimiento,
  type Recomendacion,
  type RecommendationStatus,
} from '../../lib/store/recomendaciones'

const statusOptions: { value: RecommendationStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'submitted', label: 'Enviada' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
]

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{recomendacion.titulo}</h1>
          <p className="text-sm text-gray-500">{recomendacion.huerta} · {recomendacion.fechaRecomendacion}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/recomendaciones/lista')}>Volver</Button>
          <Button onClick={handleDownload}>Descargar Excel</Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <p><span className="text-gray-500">Modo:</span> {recomendacion.modo === 'FOLIAR_DRENCH' ? 'Foliar / Drench' : 'Vía riego'}</p>
          <p><span className="text-gray-500">Solicita:</span> {recomendacion.solicita}</p>
          <p><span className="text-gray-500">Operario:</span> {recomendacion.operario}</p>
          <p><span className="text-gray-500">Superficie:</span> {recomendacion.superficie}</p>
          <p><span className="text-gray-500">Semana:</span> {recomendacion.semana}</p>
          <p><span className="text-gray-500">Equipo:</span> {recomendacion.equipoAplicacion}</p>
          <p><span className="text-gray-500">Fecha aplicación:</span> {recomendacion.fechaAplicacion}</p>
          <p><span className="text-gray-500">Hora:</span> {recomendacion.horaInicio} - {recomendacion.horaTermino}</p>
          <p><span className="text-gray-500">pH mezcla:</span> {recomendacion.phMezcla}</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Seguimiento</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
            value={recomendacion.estado}
            onChange={(event) => setRecomendacion((prev) => (prev ? { ...prev, estado: event.target.value as RecommendationStatus } : prev))}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <Input
            placeholder="Operario"
            value={recomendacion.operario}
            onChange={(event) => setRecomendacion((prev) => (prev ? { ...prev, operario: event.target.value } : prev))}
          />
          <Input
            placeholder="Fecha aplicación"
            type="date"
            value={recomendacion.fechaAplicacion}
            onChange={(event) => setRecomendacion((prev) => (prev ? { ...prev, fechaAplicacion: event.target.value } : prev))}
          />
        </div>
        <textarea
          className="mt-3 w-full rounded-2xl border border-[#E5E7EB] px-4 py-2 text-sm"
          rows={3}
          placeholder="Comentarios de seguimiento"
          value={recomendacion.comentarios}
          onChange={(event) => setRecomendacion((prev) => (prev ? { ...prev, comentarios: event.target.value } : prev))}
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void handleSaveTracking()} disabled={saving}>{saving ? 'Guardando...' : 'Guardar seguimiento'}</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Producto</TableHead>
                <TableHead>I. Activo</TableHead>
                <TableHead>Dosis</TableHead>
                <TableHead>Gasto</TableHead>
                <TableHead>Gasto total</TableHead>
                <TableHead>Sector</TableHead>
              </tr>
            </thead>
            <tbody>
              {recomendacion.productos.map((producto, index) => (
                <TableRow key={index}>
                  <TableCell>{producto.producto}</TableCell>
                  <TableCell>{producto.ingredienteActivo}</TableCell>
                  <TableCell>{producto.dosis}</TableCell>
                  <TableCell>{producto.gasto}</TableCell>
                  <TableCell>{producto.gastoTotal}</TableCell>
                  <TableCell>{producto.sector}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {recomendacion.modo === 'VIA_RIEGO' ? (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Sectores vía riego</h2>
          <div className="mt-4">
            <Table>
              <thead>
                <tr>
                  <TableHead>Sector</TableHead>
                  <TableHead>Válvula</TableHead>
                  <TableHead>Superficie</TableHead>
                  <TableHead>Productos (1-10)</TableHead>
                </tr>
              </thead>
              <tbody>
                {recomendacion.riegoFilas.map((fila, index) => (
                  <TableRow key={index}>
                    <TableCell>{fila.sector}</TableCell>
                    <TableCell>{fila.valvula}</TableCell>
                    <TableCell>{fila.superficie}</TableCell>
                    <TableCell>{fila.productos.join(' · ')}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
