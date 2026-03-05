import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { getRecomendaciones, type Recomendacion } from '../../lib/store/recomendaciones'

export function RecomendacionesListaPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Recomendacion[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getRecomendaciones()
        if (!cancelled) setRows(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar recomendaciones.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

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
          <p className="text-sm text-gray-500">Registros sincronizados con Supabase.</p>
        </div>
        <Button onClick={() => navigate('/recomendaciones/crear')}>Nueva recomendación</Button>
      </div>

      <Card>
        <div className="flex justify-end">
          <Input className="max-w-sm" placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        {loading ? <p className="mt-4 text-sm text-gray-500">Cargando recomendaciones...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {!loading && !error && filtered.length === 0 ? <p className="mt-4 text-sm text-gray-500">No hay recomendaciones registradas.</p> : null}

        {!loading && !error && filtered.length > 0 ? (
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
        ) : null}
      </Card>
    </div>
  )
}
