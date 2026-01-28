import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import { Toast } from '../../components/ui/Toast'
import {
  getEstadoPC,
  getPromedioDensidad,
  useMonitoreosStore,
  type Hallazgo,
  type Monitoreo,
  type MonitoreoDraft,
} from '../../lib/store/monitoreos'
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
  const { monitoreos } = useMonitoreosStore()

  const [ranchoFiltro, setRanchoFiltro] = useState('')
  const [cultivoFiltro, setCultivoFiltro] = useState('')
  const [etapaFiltro, setEtapaFiltro] = useState('Todos')
  const [selected, setSelected] = useState<Monitoreo | null>(null)
  const [toastVisible, setToastVisible] = useState(() => location.state?.toast === 'saved')
  const [infoToast, setInfoToast] = useState('')

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

  useEffect(() => {
    if (!infoToast) return
    const timer = window.setTimeout(() => setInfoToast(''), 2500)
    return () => window.clearTimeout(timer)
  }, [infoToast])

  const ranchoOpciones = useMemo(
    () => Array.from(new Set(monitoreos.map((monitoreo) => monitoreo.rancho))).sort(),
    [monitoreos],
  )

  const cultivoOpciones = useMemo(
    () => Array.from(new Set(monitoreos.map((monitoreo) => monitoreo.cultivo))).sort(),
    [monitoreos],
  )

  const etapaOpciones = useMemo(
    () => ['Todos', ...new Set(monitoreos.map((monitoreo) => monitoreo.etapaFenologica))],
    [monitoreos],
  )

  const filtered = useMemo(() => {
    return monitoreos.filter((monitoreo) => {
      const matchesRancho = !ranchoFiltro || monitoreo.rancho === ranchoFiltro
      const matchesCultivo = !cultivoFiltro || monitoreo.cultivo === cultivoFiltro
      const matchesEtapa = etapaFiltro === 'Todos' || monitoreo.etapaFenologica === etapaFiltro
      return matchesRancho && matchesCultivo && matchesEtapa
    })
  }, [cultivoFiltro, etapaFiltro, monitoreos, ranchoFiltro])

  const handleDuplicate = (monitoreo: Monitoreo) => {
    const prefill: MonitoreoDraft = {
      ...monitoreo,
      puntos: monitoreo.puntos.map((punto) => ({
        ...punto,
        densidadPlantas: String(punto.densidadPlantas),
        notas: punto.notas ?? '',
      })),
    }

    navigate('/monitoreos/iniciar', { state: { prefill } })
  }

  const handleExport = () => {
    setInfoToast('Próximamente')
  }

  const renderHallazgos = (hallazgos: Hallazgo[]) => {
    if (hallazgos.length === 0) {
      return <span className="text-xs text-gray-400">Sin hallazgos</span>
    }
    return (
      <div className="flex flex-wrap gap-2">
        {hallazgos.map((hallazgo, index) => (
          <Badge key={`${hallazgo.categoria}-${index}`} className="bg-gray-100 text-gray-700">
            {hallazgo.categoria} · {hallazgo.tipoEvaluacion}
          </Badge>
        ))}
      </div>
    )
  }

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
      {infoToast ? <Toast variant="info">{infoToast}</Toast> : null}

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
          <Table>
            <thead>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Cultivo</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Promedio</TableHead>
                <TableHead>Estado PC</TableHead>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const promedio = getPromedioDensidad(row.puntos)
                const estado = getEstadoPC(promedio, row.umbralPC)
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer transition hover:bg-gray-50"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell className="font-medium text-gray-900">{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{row.rancho}</TableCell>
                    <TableCell>{row.cultivo}</TableCell>
                    <TableCell>
                      Sector {row.numSector} · Válvula {row.numValvula}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          row.etapaFenologica === 'Vegetativa'
                            ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {row.etapaFenologica}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(promedio)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          estado === 'Arriba del umbral'
                            ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </tbody>
          </Table>
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
                <h3 className="text-lg font-semibold text-gray-900">{selected.rancho}</h3>
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
                <span className="font-medium text-gray-900">{selected.cultivo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Humedad</span>
                <span className="font-medium text-gray-900">{selected.humedadRelativa}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Temperatura</span>
                <span className="font-medium text-gray-900">{selected.temperatura}°C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Condición</span>
                <span className="font-medium text-gray-900">{selected.condicionMeteorologica}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Etapa</span>
                <Badge
                  className={
                    selected.etapaFenologica === 'Vegetativa'
                      ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                      : 'bg-gray-100 text-gray-700'
                  }
                >
                  {selected.etapaFenologica}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Sector</span>
                <span className="font-medium text-gray-900">
                  {selected.numSector} · Válvula {selected.numValvula}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Tipo de sector</span>
                <span className="font-medium text-gray-900">{selected.tipoSector}</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Promedio densidad</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(getPromedioDensidad(selected.puntos))}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">Umbral</span>
                <span className="font-semibold text-gray-900">{selected.umbralPC}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">Estado PC</span>
                <Badge
                  className={
                    getEstadoPC(getPromedioDensidad(selected.puntos), selected.umbralPC) ===
                    'Arriba del umbral'
                      ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                      : 'bg-red-100 text-red-700'
                  }
                >
                  {getEstadoPC(getPromedioDensidad(selected.puntos), selected.umbralPC)}
                </Badge>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Puntos evaluados</h4>
              {selected.puntos.map((punto) => (
                <div key={punto.index} className="rounded-2xl border border-[#E5E7EB] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Punto {punto.index}</span>
                    <span className="text-sm text-gray-500">
                      Densidad: {formatNumber(punto.densidadPlantas)}
                    </span>
                  </div>
                  <div className="mt-2">{renderHallazgos(punto.hallazgos)}</div>
                  {punto.notas ? (
                    <p className="mt-2 rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      {punto.notas}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => handleDuplicate(selected)}>
                Duplicar
              </Button>
              <Button variant="secondary" onClick={handleExport}>
                Exportar
              </Button>
              <Button onClick={() => setSelected(null)}>Cerrar detalle</Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
