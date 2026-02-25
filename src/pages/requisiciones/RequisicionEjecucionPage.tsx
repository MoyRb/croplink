import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import {
  buildInitialExecution,
  buildInitialLines,
  createIrrigationRow,
  getExecutionBundle,
  getLatestExecutionByRequisicionId,
  saveExecutionBundle,
  type ApplicationExecution,
  type ApplicationExecutionStatus,
  type ApplicationLine,
  type IrrigationRow,
} from '../../lib/store/applicationExecutions'
import { useRequisicionesStore } from '../../lib/store/requisiciones'
import { getCatalog } from '../../lib/operationCatalog/repo'

const tankVolumeOptions = [100, 200, 1000, 5000]

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)

const parseNumeric = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

type SectorSurface = {
  sectorId: string
  superficie: number
}

export function RequisicionEjecucionPage() {
  const navigate = useNavigate()
  const { id: requisicionId = '', execId } = useParams()
  const { requisiciones } = useRequisicionesStore()
  const requisicion = requisiciones.find((item) => item.id === requisicionId)

  const catalog = useMemo(() => getCatalog(), [])

  const initialBundle = useMemo(() => {
    if (!requisicion) return null

    if (execId) {
      return getExecutionBundle(execId)
    }

    const latest = getLatestExecutionByRequisicionId(requisicion.id)
    return latest ? getExecutionBundle(latest.id) : null
  }, [execId, requisicion])

  const [execution, setExecution] = useState<ApplicationExecution>(() => {
    if (!requisicion) {
      return {
        id: '',
        requisicionId: '',
        mode: 'FOLIAR_DRENCH',
        status: 'DRAFT',
        context: {
          operacion: '',
          rancho: '',
          cultivo: '',
          temporada: '',
          sector: '',
          tunel: '',
          valvula: '',
        },
        headerFields: {
          superficieTotal: 0,
          solicita: '',
          justificacion: '',
          comentarios: '',
          fechaRecomendacion: '',
          semana: '',
          operario: '',
          fechaAplicacion: '',
          horaInicio: '',
          horaTermino: '',
          modoAplicacion: '',
          equipoAplicacion: '',
          phMezcla: '',
          volumenTanqueLts: 200,
          volumenTanqueLibre: '',
        },
        createdAt: new Date().toISOString(),
      }
    }
    return initialBundle?.execution ?? buildInitialExecution(requisicion)
  })

  const [lines, setLines] = useState<ApplicationLine[]>(() => {
    if (!requisicion) return []
    return initialBundle?.lines ?? buildInitialLines(initialBundle?.execution.id ?? execution.id, requisicion)
  })

  const [irrigationRows, setIrrigationRows] = useState<IrrigationRow[]>(() => initialBundle?.irrigationRows ?? [createIrrigationRow(execution.id)])

  const [sectorSurfaces, setSectorSurfaces] = useState<SectorSurface[]>(() => [])
  const [saveMessage, setSaveMessage] = useState('')

  const ranch = useMemo(() => catalog.ranches.find((item) => item.name === execution.context.rancho), [catalog.ranches, execution.context.rancho])

  const sectors = useMemo(
    () =>
      catalog.sectors
        .filter((sector) => !ranch || sector.ranchId === ranch.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [catalog.sectors, ranch],
  )

  const selectedSectorSet = useMemo(() => new Set(sectorSurfaces.map((item) => item.sectorId)), [sectorSurfaces])

  const foliarSuperficieTotal = useMemo(
    () => sectorSurfaces.reduce((acc, item) => acc + (Number.isFinite(item.superficie) ? item.superficie : 0), 0),
    [sectorSurfaces],
  )

  const tankVolume = useMemo(() => {
    if (execution.headerFields.volumenTanqueLts === -1) {
      return parseNumeric(execution.headerFields.volumenTanqueLibre)
    }
    return execution.headerFields.volumenTanqueLts
  }, [execution.headerFields.volumenTanqueLibre, execution.headerFields.volumenTanqueLts])

  const valvesBySector = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>()
    sectors.forEach((sector) => {
      map.set(
        sector.id,
        catalog.valves
          .filter((valve) => valve.sectorId === sector.id)
          .map((valve) => ({ id: valve.id, name: valve.name })),
      )
    })
    return map
  }, [catalog.valves, sectors])

  const foliarTotalsByLine = useMemo(
    () =>
      lines.map((line) => {
        const tanquesPorHa = tankVolume > 0 ? line.gastoLtHa / tankVolume : 0
        const bySector = sectorSurfaces.map((sectorSurface) => ({
          sectorId: sectorSurface.sectorId,
          consumo: line.dosisPorTanque * tanquesPorHa * sectorSurface.superficie,
        }))
        const total = bySector.reduce((acc, item) => acc + item.consumo, 0)
        return { lineId: line.id, tanquesPorHa, bySector, total }
      }),
    [lines, sectorSurfaces, tankVolume],
  )

  const riegoTotalsByLine = useMemo(
    () =>
      lines.map((line) => {
        const byRow = irrigationRows.map((row) => ({
          rowId: row.id,
          consumo: line.dosisPorHa * row.superficie,
        }))
        const total = byRow.reduce((acc, item) => acc + item.consumo, 0)
        return { lineId: line.id, byRow, total }
      }),
    [irrigationRows, lines],
  )

  const resumenConsumo = useMemo(
    () =>
      lines.map((line) => {
        const lineTotal =
          execution.mode === 'FOLIAR_DRENCH'
            ? foliarTotalsByLine.find((item) => item.lineId === line.id)?.total ?? 0
            : riegoTotalsByLine.find((item) => item.lineId === line.id)?.total ?? 0
        return { productName: line.productName, unit: line.unit, total: lineTotal }
      }),
    [execution.mode, foliarTotalsByLine, lines, riegoTotalsByLine],
  )

  const totalGeneral = useMemo(() => resumenConsumo.reduce((acc, item) => acc + item.total, 0), [resumenConsumo])

  if (!requisicion) {
    return (
      <Card>
        <p className="text-sm text-gray-600">No encontramos la requisición seleccionada.</p>
      </Card>
    )
  }

  const updateHeaderField = <K extends keyof ApplicationExecution['headerFields']>(key: K, value: ApplicationExecution['headerFields'][K]) => {
    setExecution((prev) => ({
      ...prev,
      headerFields: {
        ...prev.headerFields,
        [key]: value,
      },
    }))
  }

  const persistExecution = (status: ApplicationExecutionStatus) => {
    const surfaceTotal = execution.mode === 'FOLIAR_DRENCH' ? foliarSuperficieTotal : irrigationRows.reduce((acc, row) => acc + row.superficie, 0)

    const nextExecution: ApplicationExecution = {
      ...execution,
      status,
      headerFields: {
        ...execution.headerFields,
        superficieTotal: surfaceTotal,
      },
    }

    setExecution(nextExecution)
    saveExecutionBundle(nextExecution, lines, irrigationRows)
    setSaveMessage(
      status === 'DRAFT'
        ? 'Borrador guardado.'
        : status === 'IN_PROGRESS'
          ? 'Ejecución marcada en progreso.'
          : 'Ejecución terminada.',
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Orden de aplicación · {requisicion.id}</h1>
          <p className="text-sm text-gray-500">Ejecución basada en la requisición aprobada.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Estado: {execution.status}</span>
          <Button variant="secondary" onClick={() => navigate('/requisiciones/lista')}>
            Volver
          </Button>
        </div>
      </div>

      {saveMessage ? <p className="text-sm font-medium text-emerald-700">{saveMessage}</p> : null}

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            Modo de ejecución
            <select
              className="mt-1 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2"
              value={execution.mode}
              onChange={(event) => setExecution((prev) => ({ ...prev, mode: event.target.value as ApplicationExecution['mode'] }))}
            >
              <option value="FOLIAR_DRENCH">Foliar / Drench</option>
              <option value="RIEGO">Vía riego</option>
            </select>
          </label>
          <label className="text-sm">
            Semana
            <Input value={execution.headerFields.semana} onChange={(event) => updateHeaderField('semana', event.target.value)} />
          </label>
          <label className="text-sm">
            Operario
            <Input value={execution.headerFields.operario} onChange={(event) => updateHeaderField('operario', event.target.value)} />
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Encabezado de recomendación</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm">Operación<Input value={execution.context.operacion} onChange={(event) => setExecution((prev) => ({ ...prev, context: { ...prev.context, operacion: event.target.value } }))} /></label>
          <label className="text-sm">Rancho<Input value={execution.context.rancho} onChange={(event) => setExecution((prev) => ({ ...prev, context: { ...prev.context, rancho: event.target.value } }))} /></label>
          <label className="text-sm">Cultivo<Input value={execution.context.cultivo} onChange={(event) => setExecution((prev) => ({ ...prev, context: { ...prev.context, cultivo: event.target.value } }))} /></label>
          <label className="text-sm">Temporada<Input value={execution.context.temporada} onChange={(event) => setExecution((prev) => ({ ...prev, context: { ...prev.context, temporada: event.target.value } }))} /></label>
          <label className="text-sm">Sector<Input value={execution.context.sector} onChange={(event) => setExecution((prev) => ({ ...prev, context: { ...prev.context, sector: event.target.value } }))} /></label>
          <label className="text-sm">Túnel<Input value={execution.context.tunel} onChange={(event) => setExecution((prev) => ({ ...prev, context: { ...prev.context, tunel: event.target.value } }))} /></label>
          <label className="text-sm">Válvula<Input value={execution.context.valvula} onChange={(event) => setExecution((prev) => ({ ...prev, context: { ...prev.context, valvula: event.target.value } }))} /></label>
          <label className="text-sm">Solicita<Input value={execution.headerFields.solicita} onChange={(event) => updateHeaderField('solicita', event.target.value)} /></label>
          <label className="text-sm">Fecha recomendación<Input type="date" value={execution.headerFields.fechaRecomendacion} onChange={(event) => updateHeaderField('fechaRecomendacion', event.target.value)} /></label>
          <label className="text-sm">Fecha aplicación<Input type="date" value={execution.headerFields.fechaAplicacion} onChange={(event) => updateHeaderField('fechaAplicacion', event.target.value)} /></label>
          <label className="text-sm">Hora inicio<Input type="time" value={execution.headerFields.horaInicio} onChange={(event) => updateHeaderField('horaInicio', event.target.value)} /></label>
          <label className="text-sm">Hora término<Input type="time" value={execution.headerFields.horaTermino} onChange={(event) => updateHeaderField('horaTermino', event.target.value)} /></label>
          <label className="text-sm">Equipo aplicación<Input value={execution.headerFields.equipoAplicacion} onChange={(event) => updateHeaderField('equipoAplicacion', event.target.value)} /></label>
          <label className="text-sm">Modo aplicación<Input value={execution.headerFields.modoAplicacion} onChange={(event) => updateHeaderField('modoAplicacion', event.target.value)} /></label>
          {execution.mode === 'FOLIAR_DRENCH' ? (
            <label className="text-sm">pH mezcla<Input value={execution.headerFields.phMezcla} onChange={(event) => updateHeaderField('phMezcla', event.target.value)} /></label>
          ) : null}
        </div>
        <label className="mt-4 block text-sm">Justificación<textarea className="mt-1 w-full rounded-2xl border border-[#E5E7EB] px-4 py-2" rows={2} value={execution.headerFields.justificacion} onChange={(event) => updateHeaderField('justificacion', event.target.value)} /></label>
        <label className="mt-4 block text-sm">Comentarios<textarea className="mt-1 w-full rounded-2xl border border-[#E5E7EB] px-4 py-2" rows={2} value={execution.headerFields.comentarios} onChange={(event) => updateHeaderField('comentarios', event.target.value)} /></label>
      </Card>

      {execution.mode === 'FOLIAR_DRENCH' ? (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Modo Foliar / Drench</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              Volumen de tanque (L)
              <select
                className="mt-1 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2"
                value={execution.headerFields.volumenTanqueLts}
                onChange={(event) => updateHeaderField('volumenTanqueLts', Number(event.target.value))}
              >
                {tankVolumeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={-1}>Libre</option>
              </select>
            </label>
            {execution.headerFields.volumenTanqueLts === -1 ? (
              <label className="text-sm">
                Volumen libre (L)
                <Input
                  type="number"
                  min={0}
                  value={execution.headerFields.volumenTanqueLibre}
                  onChange={(event) => updateHeaderField('volumenTanqueLibre', event.target.value)}
                />
              </label>
            ) : null}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-800">Sectores y superficie (ha)</h3>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {sectors.map((sector) => {
                const selectedSurface = sectorSurfaces.find((item) => item.sectorId === sector.id)
                const isSelected = selectedSectorSet.has(sector.id)
                return (
                  <label key={sector.id} className="rounded-2xl border border-[#E5E7EB] p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>{sector.name}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSectorSurfaces((prev) => [...prev, { sectorId: sector.id, superficie: 1 }])
                          } else {
                            setSectorSurfaces((prev) => prev.filter((item) => item.sectorId !== sector.id))
                          }
                        }}
                      />
                    </div>
                    {isSelected ? (
                      <Input
                        className="mt-2"
                        type="number"
                        min={0}
                        step="0.1"
                        value={selectedSurface?.superficie ?? 1}
                        onChange={(event) => {
                          const value = parseNumeric(event.target.value)
                          setSectorSurfaces((prev) =>
                            prev.map((item) => (item.sectorId === sector.id ? { ...item, superficie: value } : item)),
                          )
                        }}
                      />
                    ) : null}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-2 py-2">Producto</th>
                  <th className="px-2 py-2">Dosis por tanque</th>
                  <th className="px-2 py-2">Gasto Lt/ha</th>
                  <th className="px-2 py-2">Tanques/ha</th>
                  <th className="px-2 py-2">Gasto total producto</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const totals = foliarTotalsByLine.find((item) => item.lineId === line.id)
                  return (
                    <tr key={line.id} className="border-b border-gray-100">
                      <td className="px-2 py-2 font-medium">{line.productName}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.dosisPorTanque}
                          onChange={(event) => {
                            const value = parseNumeric(event.target.value)
                            setLines((prev) => prev.map((item) => (item.id === line.id ? { ...item, dosisPorTanque: value } : item)))
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.gastoLtHa}
                          onChange={(event) => {
                            const value = parseNumeric(event.target.value)
                            setLines((prev) => prev.map((item) => (item.id === line.id ? { ...item, gastoLtHa: value } : item)))
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">{formatNumber(totals?.tanquesPorHa ?? 0)}</td>
                      <td className="px-2 py-2 font-semibold">{formatNumber(totals?.total ?? 0)} {line.unit}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">Superficie total: {formatNumber(foliarSuperficieTotal)} ha</p>
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Modo vía riego</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-2 py-2">Producto</th>
                  <th className="px-2 py-2">Dosis por ha (kg/ha o L/ha)</th>
                  <th className="px-2 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const lineTotal = riegoTotalsByLine.find((item) => item.lineId === line.id)?.total ?? 0
                  return (
                    <tr key={line.id} className="border-b border-gray-100">
                      <td className="px-2 py-2 font-medium">{line.productName}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.dosisPorHa}
                          onChange={(event) => {
                            const value = parseNumeric(event.target.value)
                            setLines((prev) => prev.map((item) => (item.id === line.id ? { ...item, dosisPorHa: value } : item)))
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 font-semibold">{formatNumber(lineTotal)} {line.unit}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-2 py-2">Sector</th>
                  <th className="px-2 py-2">Válvula</th>
                  <th className="px-2 py-2">Superficie</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {irrigationRows.map((row) => {
                  const rowSectorValves = valvesBySector.get(row.sectorId) ?? []
                  return (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="px-2 py-2">
                        <select
                          className="w-full rounded-full border border-[#E5E7EB] bg-white px-3 py-2"
                          value={row.sectorId}
                          onChange={(event) => {
                            const nextSectorId = event.target.value
                            const defaultValve = (valvesBySector.get(nextSectorId) ?? [])[0]?.id ?? ''
                            setIrrigationRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id
                                  ? { ...item, sectorId: nextSectorId, valveId: defaultValve }
                                  : item,
                              ),
                            )
                          }}
                        >
                          <option value="">Seleccionar</option>
                          {sectors.map((sector) => (
                            <option key={sector.id} value={sector.id}>
                              {sector.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          className="w-full rounded-full border border-[#E5E7EB] bg-white px-3 py-2"
                          value={row.valveId}
                          onChange={(event) =>
                            setIrrigationRows((prev) =>
                              prev.map((item) => (item.id === row.id ? { ...item, valveId: event.target.value } : item)),
                            )
                          }
                        >
                          <option value="">Seleccionar</option>
                          {rowSectorValves.map((valve) => (
                            <option key={valve.id} value={valve.id}>
                              {valve.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          value={row.superficie}
                          onChange={(event) => {
                            const value = parseNumeric(event.target.value)
                            setIrrigationRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, superficie: value } : item)))
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Button
                          variant="secondary"
                          onClick={() => setIrrigationRows((prev) => prev.filter((item) => item.id !== row.id))}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button variant="secondary" onClick={() => setIrrigationRows((prev) => [...prev, createIrrigationRow(execution.id)])}>
              Agregar fila de riego
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Resumen de consumo</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-2 py-2">Producto</th>
                <th className="px-2 py-2">Consumo estimado</th>
              </tr>
            </thead>
            <tbody>
              {resumenConsumo.map((item) => (
                <tr key={item.productName} className="border-b border-gray-100">
                  <td className="px-2 py-2">{item.productName}</td>
                  <td className="px-2 py-2 font-semibold">{formatNumber(item.total)} {item.unit}</td>
                </tr>
              ))}
              <tr>
                <td className="px-2 py-3 font-semibold text-gray-900">Total general</td>
                <td className="px-2 py-3 font-semibold text-gray-900">{formatNumber(totalGeneral)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => persistExecution('DRAFT')}>
          Guardar borrador
        </Button>
        <Button variant="secondary" onClick={() => persistExecution('IN_PROGRESS')}>
          Marcar en ejecución
        </Button>
        <Button onClick={() => persistExecution('COMPLETED')}>Terminar ejecución</Button>
      </div>
    </div>
  )
}
