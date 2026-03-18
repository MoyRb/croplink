import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { useCosechasStore } from '../../lib/store/cosechas'

const formatNumber = (value: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)

const buildResumen = (item: {
  detalle: Array<unknown>
  totalCajas: number
  totalRechazos: number
  totalKgProceso: number
  promedioRendimiento: number
  cantidadTotal: number
  unidad: string
}) => {
  if (item.detalle.length === 0) return `${formatNumber(item.cantidadTotal)} ${item.unidad}`
  return `${item.detalle.length} filas · ${formatNumber(item.totalCajas)} cajas · ${formatNumber(item.totalRechazos)} rechazos · ${formatNumber(item.totalKgProceso)} kg proceso · ${formatNumber(item.promedioRendimiento)}% proceso`
}

export function CosechasListaPage() {
  const navigate = useNavigate()
  const { cosechas, isLoading, error, refreshCosechas } = useCosechasStore()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return cosechas
    return cosechas.filter((item) =>
      [item.ranchoNombre, item.variedad, item.manejoAgronomico, item.cultivo, item.temporada, item.sectorNombre]
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
          <p className="text-sm text-gray-500">Registro de rendimiento agrícola por rancho, sin integración nueva a Nómina.</p>
        </div>
        <Button onClick={() => navigate('/cosechas/crear')}>Nueva cosecha</Button>
      </div>

      <Card>
        <div className="flex justify-end">
          <Input className="max-w-sm" placeholder="Buscar por rancho, variedad o manejo..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Variedad</TableHead>
                <TableHead>Manejo agronómico</TableHead>
                <TableHead>Resumen de rendimiento</TableHead>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/cosechas/${item.id}`)}>
                  <TableCell>{item.fecha}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{item.ranchoNombre}</p>
                      <p className="text-xs text-gray-500">{item.cultivo} · {item.temporada}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.variedad}</TableCell>
                  <TableCell>{item.manejoAgronomico}</TableCell>
                  <TableCell>{buildResumen(item)}</TableCell>
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
