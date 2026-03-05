import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import { calcAverageDensity, getSessions, type MonitoringSession } from '../../lib/monitoreo'
import { cn } from '../../lib/utils'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)

export function MonitoreosBitacoraPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sessions, setSessions] = useState<MonitoringSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [ranchoFiltro, setRanchoFiltro] = useState('')
  const [cultivoFiltro, setCultivoFiltro] = useState('')
  const [etapaFiltro, setEtapaFiltro] = useState('Todos')
  const [selected, setSelected] = useState<MonitoringSession | null>(null)
  const [toastVisible, setToastVisible] = useState(() => location.state?.toast === 'saved')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await getSessions()
        if (!cancelled) setSessions(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los monitoreos.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (location.state?.toast === 'saved') {
      setToastVisible(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!toastVisible) return
    const timer = window.setTimeout(() => setToastVisible(false), 3000)
    return () => window.clearTimeout(timer)
  }, [toastVisible])

  const ranchoOpciones = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.config.rancho))).sort(),
    [sessions],
  )

  const cultivoOpciones = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.config.cultivo))).sort(),
    [sessions],
  )

  const etapaOpciones = useMemo(
    () => ['Todos', ...new Set(sessions.map((session) => session.config.etapaFenologica))],
    [sessions],
  )

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      const matchesRancho = !ranchoFiltro || session.config.rancho === ranchoFiltro
      const matchesCultivo = !cultivoFiltro || session.config.cultivo === cultivoFiltro
      const matchesEtapa = etapaFiltro === 'Todos' || session.config.etapaFenologica === etapaFiltro
      return matchesRancho && matchesCultivo && matchesEtapa
    })
  }, [cultivoFiltro, etapaFiltro, sessions, ranchoFiltro])

  const getHallazgosCount = (session: MonitoringSession) =>
    session.sectors.reduce(
      (total, sector) =>
        total +
        sector.points.reduce(
          (pointTotal, point) => pointTotal + point.plantas.reduce((plantTotal, plant) => plantTotal + plant.hallazgos.length, 0),
          0,
        ),
      0,
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bitácora de monitoreos</h1>
          <p className="text-sm text-gray-500">Historial de monitoreos guardados.</p>
        </div>
        <Button onClick={() => navigate('/monitoreos/iniciar')}>Nuevo monitoreo</Button>
      </div>

      {toastVisible ? <Toast variant="success">Monitoreo guardado</Toast> : null}

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Monitoreos recientes</h2>
            <p className="text-sm text-gray-500">Filtra por rancho, cultivo o etapa.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Rancho</label>
              <select
                className={cn(
                  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800',
                )}
                value={ranchoFiltro}
                onChange={(event) => setRanchoFiltro(event.target.value)}
              >
                <option value="">Todos</option>
                {ranchoOpciones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Cultivo</label>
              <select
                className={cn(
                  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800',
                )}
                value={cultivoFiltro}
                onChange={(event) => setCultivoFiltro(event.target.value)}
              >
                <option value="">Todos</option>
                {cultivoOpciones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Etapa</label>
              <select
                className={cn(
                  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800',
                )}
                value={etapaFiltro}
                onChange={(event) => setEtapaFiltro(event.target.value)}
              >
                {etapaOpciones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <p className="py-6 text-center text-sm text-gray-500">Cargando monitoreos...</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-600">{error}</p>
          ) : (
            <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Cultivo</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Densidad promedio</TableHead>
                <TableHead>Hallazgos</TableHead>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const promedio = calcAverageDensity(row)
                const hallazgos = getHallazgosCount(row)
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer transition hover:bg-gray-50"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell className="font-medium text-gray-900">{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{row.config.rancho}</TableCell>
                    <TableCell>{row.config.cultivo}</TableCell>
                    <TableCell>
                      {row.config.sector} · Válvula {row.config.valve || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          row.config.etapaFenologica === 'vegetativa'
                            ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {row.config.etapaFenologica}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(promedio)}</TableCell>
                    <TableCell>{hallazgos}</TableCell>
                  </TableRow>
                )
              })}
            </tbody>
          </Table>
          )}
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No encontramos monitoreos con esos filtros.
            </p>
          ) : null}
        </div>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            role="button"
            tabIndex={0}
            onClick={() => setSelected(null)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSelected(null)
            }}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selected.config.rancho}</h3>
                <p className="text-sm text-gray-500">Detalle de monitoreo</p>
              </div>
              <button
                className="rounded-full px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100"
                onClick={() => setSelected(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-900">{formatDate(selected.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Cultivo</span>
                <span className="font-medium text-gray-900">{selected.config.cultivo}</span>
              </div>
              {selected.config.humedadRelativa !== undefined ? <div className="flex items-center justify-between">
                <span className="text-gray-500">Humedad</span>
                <span className="font-medium text-gray-900">{selected.config.humedadRelativa}%</span>
              </div> : null}
              {selected.config.temperatura !== undefined ? <div className="flex items-center justify-between">
                <span className="text-gray-500">Temperatura</span>
                <span className="font-medium text-gray-900">{selected.config.temperatura}°C</span>
              </div> : null}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Condición</span>
                <span className="font-medium text-gray-900">{selected.config.condicionMeteorologica}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Etapa</span>
                <Badge
                  className={
                    selected.config.etapaFenologica === 'vegetativa'
                      ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                      : 'bg-gray-100 text-gray-700'
                  }
                >
                  {selected.config.etapaFenologica}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Sector</span>
                <span className="font-medium text-gray-900">
                  {selected.config.sector} · Válvula {selected.config.valve || 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Promedio densidad</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(calcAverageDensity(selected))}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Puntos evaluados</h4>
              <div className="grid gap-3">
                {selected.sectors.flatMap((sector) => sector.points).map((punto, index) => (
                  <div key={punto.id} className="rounded-2xl border border-[#E5E7EB] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Punto {index + 1}</span>
                      <span className="text-sm text-gray-500">
                        Conteo: {formatNumber(punto.conteoEnMetros)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Hallazgos</h4>
              {getHallazgosCount(selected) === 0 ? (
                <p className="text-sm text-gray-400">Sin hallazgos registrados.</p>
              ) : null}
              {selected.sectors
                .flatMap((sector) => sector.points)
                .flatMap((point) => point.plantas)
                .flatMap((planta) => planta.hallazgos)
                .map((hallazgo, index) => (
                <div key={`${hallazgo.tipo}-${index}`} className="rounded-2xl border border-[#E5E7EB] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{hallazgo.tipo}</span>
                    <Badge className="bg-gray-100 text-gray-700">{hallazgo.severidad || 'N/A'}</Badge>
                  </div>
                  {hallazgo.descripcion ? (
                    <p className="mt-2 text-xs text-gray-500">{hallazgo.descripcion}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Cerrar detalle
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
