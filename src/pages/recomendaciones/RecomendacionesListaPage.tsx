import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { getRecomendaciones } from '../../lib/store/recomendaciones'

export function RecomendacionesListaPage() {
  const navigate = useNavigate()
  const [rows] = useState(() => getRecomendaciones())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows

    return rows.filter((item) =>
      [item.titulo, item.huerta, item.solicita, item.modoAplicacion, item.fechaRecomendacion].join(' ').toLowerCase().includes(term),
    )
  }, [rows, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Recomendaciones</h1>
          <p className="text-sm text-gray-500">Registros almacenados en localStorage.</p>
        </div>
        <Button onClick={() => navigate('/recomendaciones/crear')}>Nueva recomendación</Button>
      </div>

      <Card>
        <div className="flex justify-end">
          <Input className="max-w-sm" placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>ID</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Huerta</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Fecha recomendación</TableHead>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/recomendaciones/${item.id}`)}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.titulo}</TableCell>
                  <TableCell>{item.huerta}</TableCell>
                  <TableCell>{item.modo === 'FOLIAR_DRENCH' ? 'Foliar / Drench' : 'Vía riego'}</TableCell>
                  <TableCell>{item.fechaRecomendacion}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
