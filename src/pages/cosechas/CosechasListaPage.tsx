import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { useCosechasStore } from '../../lib/store/cosechas'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value)

export function CosechasListaPage() {
  const navigate = useNavigate()
  const { cosechas, isLoading, error, refreshCosechas } = useCosechasStore()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return cosechas
    return cosechas.filter((item) =>
      [item.actividad, item.ranchoNombre, item.cultivo, item.temporada, item.sectorNombre]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [cosechas, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cosechas</h1>
          <p className="text-sm text-gray-500">Control de producción e integración automática a Nómina.</p>
        </div>
        <Button onClick={() => navigate('/cosechas/crear')}>Nueva cosecha</Button>
      </div>

      <Card>
        <div className="flex justify-end">
          <Input className="max-w-sm" placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Cultivo/Temporada</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Cantidad total</TableHead>
                <TableHead>Total pagado</TableHead>
                <TableHead>Costo unitario</TableHead>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/cosechas/${item.id}`)}>
                  <TableCell>{item.fecha}</TableCell>
                  <TableCell>{item.ranchoNombre}</TableCell>
                  <TableCell>{item.cultivo} · {item.temporada}</TableCell>
                  <TableCell>{item.actividad}</TableCell>
                  <TableCell>{item.cantidadTotal} {item.unidad}</TableCell>
                  <TableCell>{formatCurrency(item.totalPagado)}</TableCell>
                  <TableCell>{formatCurrency(item.costoUnitario)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          {isLoading ? <p className="py-6 text-center text-sm text-gray-500">Cargando cosechas...</p> : null}
          {!isLoading && error ? (
            <div className="space-y-2 py-6 text-center">
              <p className="text-sm text-red-600">No se pudo cargar cosechas: {error}</p>
              <Button variant="secondary" onClick={() => void refreshCosechas()}>Reintentar</Button>
            </div>
          ) : null}
          {!isLoading && !error && filtered.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">Sin cosechas registradas.</p> : null}
        </div>
      </Card>
    </div>
  )
}
