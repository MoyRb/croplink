import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import {
  getEstadoPC,
  getNextMonitoreoId,
  getPromedioDensidad,
  useMonitoreosStore,
  type CondicionMeteorologica,
  type EtapaFenologica,
  type Hallazgo,
  type HallazgoCategoria,
  type MonitoreoDraft,
  type PuntoDraft,
  type TipoEvaluacion,
  type TipoSector,
} from '../../lib/store/monitoreos'
import { cn } from '../../lib/utils'

const condicionesMeteorologicas: CondicionMeteorologica[] = ['Soleado', 'Nublado', 'Lluvia', 'Viento', 'Mixto']
const etapasFenologicas: EtapaFenologica[] = [
  'Vegetativa',
  'Floración',
  'Fructificación',
  'Cosecha',
  'Poda',
]
const tiposSector: TipoSector[] = ['Túnel', 'Campo abierto']
const tiposEvaluacion: TipoEvaluacion[] = ['Plantas', 'CCT']
const categoriasHallazgo: HallazgoCategoria[] = [
  'Plaga',
  'Enfermedad',
  'Insectos benéficos',
  'Desarrollo',
  'Nutrición',
  'PC',
]

const selectStyles =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const createDefaultPuntos = (): PuntoDraft[] =>
  Array.from({ length: 8 }, (_, index) => ({
    index: index + 1,
    densidadPlantas: '',
    hallazgos: [],
    notas: '',
  }))

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)

export function MonitoreosIniciarPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { monitoreos, draft, addMonitoreo, saveDraft, clearDraft } = useMonitoreosStore()

  const prefill = useMemo(() => location.state?.prefill as MonitoreoDraft | undefined, [location.state])
  const initialDraft = prefill ?? draft ?? null

  const [rancho, setRancho] = useState(initialDraft?.rancho ?? '')
  const [cultivo, setCultivo] = useState(initialDraft?.cultivo ?? '')
  const [humedadRelativa, setHumedadRelativa] = useState(
    initialDraft?.humedadRelativa ? String(initialDraft.humedadRelativa) : '',
  )
  const [temperatura, setTemperatura] = useState(
    initialDraft?.temperatura ? String(initialDraft.temperatura) : '',
  )
  const [condicionMeteorologica, setCondicionMeteorologica] = useState<CondicionMeteorologica>(
    initialDraft?.condicionMeteorologica ?? 'Soleado',
  )
  const [etapaFenologica, setEtapaFenologica] = useState<EtapaFenologica>(
    initialDraft?.etapaFenologica ?? 'Vegetativa',
  )
  const [numSector, setNumSector] = useState(initialDraft?.numSector ? String(initialDraft.numSector) : '')
  const [numValvula, setNumValvula] = useState(initialDraft?.numValvula ? String(initialDraft.numValvula) : '')
  const [tipoSector, setTipoSector] = useState<TipoSector>(initialDraft?.tipoSector ?? 'Túnel')
  const [umbralPC, setUmbralPC] = useState(initialDraft?.umbralPC ? String(initialDraft.umbralPC) : '')
  const [puntos, setPuntos] = useState<PuntoDraft[]>(initialDraft?.puntos ?? createDefaultPuntos())
  const [iniciado, setIniciado] = useState(Boolean(initialDraft))
  const [formError, setFormError] = useState('')
  const [puntosError, setPuntosError] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const humedadNumero = Number(humedadRelativa)
  const temperaturaNumero = Number(temperatura)
  const numSectorNumero = Number(numSector)
  const numValvulaNumero = Number(numValvula)
  const umbralNumero = Number(umbralPC)

  useEffect(() => {
    if (!prefill) return
    clearDraft()
  }, [clearDraft, prefill])

  useEffect(() => {
    if (!iniciado) return

    const draftPayload: MonitoreoDraft = {
      id: initialDraft?.id ?? getNextMonitoreoId(monitoreos),
      createdAt: initialDraft?.createdAt ?? new Date().toISOString(),
      rancho,
      cultivo,
      humedadRelativa: humedadNumero || 0,
      temperatura: temperaturaNumero || 0,
      condicionMeteorologica,
      etapaFenologica,
      numSector: numSectorNumero || 0,
      numValvula: numValvulaNumero || 0,
      tipoSector,
      umbralPC: umbralNumero || 0,
      puntos,
    }

    saveDraft(draftPayload)
  }, [
    condicionMeteorologica,
    cultivo,
    etapaFenologica,
    humedadNumero,
    iniciado,
    initialDraft?.createdAt,
    initialDraft?.id,
    monitoreos,
    numSectorNumero,
    numValvulaNumero,
    puntos,
    rancho,
    saveDraft,
    temperaturaNumero,
    tipoSector,
    umbralNumero,
  ])

  const handleStart = () => {
    if (!rancho.trim() || !cultivo.trim()) {
      setFormError('Completa rancho y cultivo para iniciar el monitoreo.')
      return
    }

    if (Number.isNaN(humedadNumero) || Number.isNaN(temperaturaNumero)) {
      setFormError('Captura humedad y temperatura con valores numéricos.')
      return
    }

    if (Number.isNaN(numSectorNumero) || Number.isNaN(numValvulaNumero)) {
      setFormError('Define número de sector y válvula con valores numéricos.')
      return
    }

    if (Number.isNaN(umbralNumero) || umbralNumero <= 0) {
      setFormError('El umbral del ingeniero es obligatorio.')
      return
    }

    setFormError('')
    setIniciado(true)
  }

  const handleAddHallazgo = (puntoIndex: number) => {
    setPuntos((prev) =>
      prev.map((punto, index) => {
        if (index !== puntoIndex) return punto
        const nuevo: Hallazgo = { categoria: 'Plaga', tipoEvaluacion: 'Plantas' }
        return { ...punto, hallazgos: [...punto.hallazgos, nuevo] }
      }),
    )
  }

  const handleRemoveHallazgo = (puntoIndex: number, hallazgoIndex: number) => {
    setPuntos((prev) =>
      prev.map((punto, index) => {
        if (index !== puntoIndex) return punto
        return {
          ...punto,
          hallazgos: punto.hallazgos.filter((_, idx) => idx !== hallazgoIndex),
        }
      }),
    )
  }

  const updateHallazgo = (
    puntoIndex: number,
    hallazgoIndex: number,
    payload: Partial<Hallazgo>,
  ) => {
    setPuntos((prev) =>
      prev.map((punto, index) => {
        if (index !== puntoIndex) return punto
        const hallazgos = punto.hallazgos.map((hallazgo, idx) => {
          if (idx !== hallazgoIndex) return hallazgo
          const updated = { ...hallazgo, ...payload }
          if (updated.tipoEvaluacion === 'CCT' && updated.categoria === 'PC') {
            return { ...updated, categoria: 'Plaga' }
          }
          return updated
        })
        return { ...punto, hallazgos }
      }),
    )
  }

  const handlePuntoChange = (index: number, field: keyof PuntoDraft, value: string) => {
    setPuntos((prev) =>
      prev.map((punto, idx) => (idx === index ? { ...punto, [field]: value } : punto)),
    )
  }

  const densidadesValidas = puntos.every((punto) => punto.densidadPlantas.trim() !== '')
  const densidadesNumeros = puntos.map((punto) => Number(punto.densidadPlantas))
  const densidadesValidasNumeros = densidadesNumeros.every((valor) => !Number.isNaN(valor))

  const promedioDensidad =
    densidadesValidas && densidadesValidasNumeros
      ? getPromedioDensidad(
          puntos.map((punto) => ({
            index: punto.index,
            densidadPlantas: Number(punto.densidadPlantas),
            hallazgos: punto.hallazgos,
            notas: punto.notas,
          })),
        )
      : null

  const estadoPC =
    promedioDensidad !== null && !Number.isNaN(umbralNumero) && umbralNumero > 0
      ? getEstadoPC(promedioDensidad, umbralNumero)
      : null

  const handleGuardar = () => {
    if (!iniciado) {
      setFormError('Primero inicia el monitoreo para capturar puntos.')
      return
    }

    if (!densidadesValidas || !densidadesValidasNumeros) {
      setPuntosError('Captura densidad en los 8 puntos antes de guardar.')
      return
    }

    if (Number.isNaN(umbralNumero) || umbralNumero <= 0) {
      setPuntosError('Define un umbral válido para calcular el estado PC.')
      return
    }

    setPuntosError('')

    addMonitoreo({
      rancho,
      cultivo,
      humedadRelativa: humedadNumero,
      temperatura: temperaturaNumero,
      condicionMeteorologica,
      etapaFenologica,
      numSector: numSectorNumero,
      numValvula: numValvulaNumero,
      tipoSector,
      umbralPC: umbralNumero,
      puntos: puntos.map((punto) => ({
        index: punto.index,
        densidadPlantas: Number(punto.densidadPlantas),
        hallazgos: punto.hallazgos,
        notas: punto.notas?.trim() ? punto.notas.trim() : undefined,
      })),
    })

    clearDraft()
    setToastVisible(true)
    navigate('/monitoreos/bitacora', { state: { toast: 'saved' } })
  }

  const handleResetDraft = () => {
    clearDraft()
    setIniciado(false)
    setPuntos(createDefaultPuntos())
    setToastVisible(true)
  }

  useEffect(() => {
    if (!toastVisible) return
    const timer = window.setTimeout(() => setToastVisible(false), 2500)
    return () => window.clearTimeout(timer)
  }, [toastVisible])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Iniciar monitoreo</h1>
          <p className="text-sm text-gray-500">
            Registra las condiciones iniciales y captura los 8 puntos obligatorios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {iniciado ? (
            <Badge className="bg-amber-100 text-amber-700">Borrador en curso</Badge>
          ) : null}
        </div>
      </div>

      {toastVisible ? <Toast variant="info">Borrador reiniciado</Toast> : null}

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Datos generales</h2>
            <p className="text-sm text-gray-500">Información base para el monitoreo.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Rancho</label>
              <Input value={rancho} onChange={(event) => setRancho(event.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Cultivo</label>
              <Input value={cultivo} onChange={(event) => setCultivo(event.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Humedad relativa (%)</label>
              <Input
                type="number"
                value={humedadRelativa}
                onChange={(event) => setHumedadRelativa(event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Temperatura (°C)</label>
              <Input
                type="number"
                value={temperatura}
                onChange={(event) => setTemperatura(event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Condición meteorológica</label>
              <select
                className={selectStyles}
                value={condicionMeteorologica}
                onChange={(event) =>
                  setCondicionMeteorologica(event.target.value as CondicionMeteorologica)
                }
              >
                {condicionesMeteorologicas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Etapa fenológica</label>
              <div className="flex items-center gap-2">
                <select
                  className={selectStyles}
                  value={etapaFenologica}
                  onChange={(event) => setEtapaFenologica(event.target.value as EtapaFenologica)}
                >
                  {etapasFenologicas.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {etapaFenologica === 'Vegetativa' ? (
                  <Badge className="bg-[#DBFAE6] text-[#0B6B2A]">Destacada</Badge>
                ) : null}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Sector</label>
              <Input
                type="number"
                value={numSector}
                onChange={(event) => setNumSector(event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Válvula</label>
              <Input
                type="number"
                value={numValvula}
                onChange={(event) => setNumValvula(event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Tipo de sector</label>
              <select
                className={selectStyles}
                value={tipoSector}
                onChange={(event) => setTipoSector(event.target.value as TipoSector)}
              >
                {tiposSector.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Umbral PC</label>
              <Input type="number" value={umbralPC} onChange={(event) => setUmbralPC(event.target.value)} />
            </div>
          </div>
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleStart}>Iniciar monitoreo</Button>
            {iniciado ? (
              <Button variant="secondary" onClick={handleResetDraft}>
                Reiniciar borrador
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {iniciado ? (
        <Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Captura de puntos</h2>
              <p className="text-sm text-gray-500">
                Registra densidad por metro lineal y hallazgos por punto.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {puntos.map((punto, index) => (
                <Card key={punto.index} className="border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Punto {punto.index}</h3>
                    <Badge variant="neutral">{punto.hallazgos.length} hallazgos</Badge>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Densidad de plantas (por metro)
                      </label>
                      <Input
                        type="number"
                        value={punto.densidadPlantas}
                        onChange={(event) => handlePuntoChange(index, 'densidadPlantas', event.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase text-gray-500">Hallazgos</label>
                        <button
                          className="text-xs font-semibold text-[#00C050] hover:underline"
                          onClick={() => handleAddHallazgo(index)}
                        >
                          + Agregar hallazgo
                        </button>
                      </div>
                      {punto.hallazgos.length === 0 ? (
                        <p className="mt-2 text-xs text-gray-400">
                          Sin hallazgos. Agrega observaciones si es necesario.
                        </p>
                      ) : null}
                      <div className="mt-3 space-y-3">
                        {punto.hallazgos.map((hallazgo, hallazgoIndex) => (
                          <div key={`${punto.index}-${hallazgoIndex}`} className="rounded-2xl border p-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-[10px] font-semibold uppercase text-gray-500">
                                  Tipo de evaluación
                                </label>
                                <select
                                  className={selectStyles}
                                  value={hallazgo.tipoEvaluacion}
                                  onChange={(event) =>
                                    updateHallazgo(index, hallazgoIndex, {
                                      tipoEvaluacion: event.target.value as TipoEvaluacion,
                                    })
                                  }
                                >
                                  {tiposEvaluacion.map((tipo) => (
                                    <option key={tipo} value={tipo}>
                                      {tipo}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase text-gray-500">
                                  Categoría
                                </label>
                                <select
                                  className={selectStyles}
                                  value={hallazgo.categoria}
                                  onChange={(event) =>
                                    updateHallazgo(index, hallazgoIndex, {
                                      categoria: event.target.value as HallazgoCategoria,
                                    })
                                  }
                                >
                                  {categoriasHallazgo.map((categoria) => (
                                    <option
                                      key={categoria}
                                      value={categoria}
                                      disabled={categoria === 'PC' && hallazgo.tipoEvaluacion !== 'Plantas'}
                                    >
                                      {categoria}
                                    </option>
                                  ))}
                                </select>
                                {hallazgo.tipoEvaluacion !== 'Plantas' ? (
                                  <p className="mt-1 text-[11px] text-amber-600">
                                    PC solo disponible para evaluación de Plantas.
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button
                                className="text-xs font-semibold text-gray-500 hover:text-red-600"
                                onClick={() => handleRemoveHallazgo(index, hallazgoIndex)}
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-500">Notas</label>
                      <textarea
                        className={cn(
                          'w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]',
                        )}
                        rows={2}
                        value={punto.notas}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                          handlePuntoChange(index, 'notas', event.target.value)
                        }
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-[#F5F5F5]">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Promedio densidad</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {promedioDensidad !== null ? formatNumber(promedioDensidad) : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Umbral del ingeniero</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {umbralNumero ? formatNumber(umbralNumero) : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Estado PC</p>
                  {estadoPC ? (
                    <Badge
                      className={
                        estadoPC === 'Arriba del umbral'
                          ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                          : 'bg-red-100 text-red-700'
                      }
                    >
                      {estadoPC}
                    </Badge>
                  ) : (
                    <p className="text-sm text-gray-400">--</p>
                  )}
                </div>
              </div>
            </Card>

            {puntosError ? <p className="text-sm text-red-600">{puntosError}</p> : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGuardar}>Guardar monitoreo</Button>
              <Button variant="secondary" onClick={() => navigate('/monitoreos/bitacora')}>
                Ir a bitácora
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
