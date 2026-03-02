import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { downloadRecomendacionExcel } from '../../lib/recomendaciones/excel'
import { getRecomendacionById } from '../../lib/store/recomendaciones'

export function RecomendacionesDetallePage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const recomendacion = useMemo(() => getRecomendacionById(id), [id])
  const [error, setError] = useState('')

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

  const handleDownload = async () => {
    try {
      setError('')
      await downloadRecomendacionExcel(recomendacion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el Excel.')
    }
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
