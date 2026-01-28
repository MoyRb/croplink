import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import {
  getNextMonitoreoId,
  getPromedioDensidad,
  useMonitoreosStore,
  type CondicionMeteorologica,
  type EtapaFenologica,
  type Hallazgo,
  type HallazgoSeveridad,
  type HallazgoTipo,
  type MonitoreoDraft,
  type PuntoDraft,
} from '../../lib/store/monitoreos'
import { cn } from '../../lib/utils'

const condicionesMeteorologicas: CondicionMeteorologica[] = [
  'Soleado',
  'Nublado',
  'Lluvia',
  'Viento',
  'Otro',
]
const etapasFenologicas: EtapaFenologica[] = [
  'Vegetativa',
  'Floración',
  'Fructificación',
  'Cosecha',
  'Poda',
]
const tiposHallazgo: HallazgoTipo[] = [
  'Plaga',
  'Enfermedad',
  'Insectos benéficos',
  'Desarrollo',
  'Nutrición',
]
const severidades: HallazgoSeveridad[] = ['Baja', 'Media', 'Alta']

const selectStyles =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const chipBase =
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

const createDefaultPuntos = (): PuntoDraft[] =>
  Array.from({ length: 8 }, (_, index) => ({
    index: index + 1,
    conteoPorMetroLineal: '',
  }))

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)

export function MonitoreosIniciarPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { monitoreos, draft, addMonitoreo, saveDraft, clearDraft } = useMonitoreosStore()

  const prefill = useMemo(() => location.state?.prefill as MonitoreoDraft | undefined, [location.state])
  const initialDraft = prefill ?? draft ?? null

  const [draftId] = useState(initialDraft?.id ?? getNextMonitoreoId(monitoreos))
  const [draftCreatedAt] = useState(initialDraft?.createdAt ?? new Date().toISOString())

  const [rancho, setRancho] = useState(initialDraft?.rancho ?? '')
  const [cultivo, setCultivo] = useState(initialDraft?.cultivo ?? '')
  const [humedadRelativa, setHumedadRelativa] = useState(initialDraft?.humedadRelativa ?? '')
  const [temperatura, setTemperatura] = useState(initialDraft?.temperatura ?? '')
  const [condicionMeteorologica, setCondicionMeteorologica] = useState<CondicionMeteorologica>(
    initialDraft?.condicionMeteorologica ?? 'Soleado',
  )
  const [etapaFenologica, setEtapaFenologica] = useState<EtapaFenologica>(
    initialDraft?.etapaFenologica ?? 'Vegetativa',
  )
  const [numSector, setNumSector] = useState(initialDraft?.numSector ?? '')
  const [numValvula, setNumValvula] = useState(initialDraft?.numValvula ?? '')
  const [umbralPC, setUmbralPC] = useState(initialDraft?.umbralPC ?? '')
  const [umbralPROM, setUmbralPROM] = useState(initialDraft?.umbralPROM ?? '')
  const [puntos, setPuntos] = useState<PuntoDraft[]>(initialDraft?.puntos ?? createDefaultPuntos())
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(initialDraft?.hallazgos ?? [])
  const [formError, setFormError] = useState('')

  const humedadNumero = Number(humedadRelativa)
  const temperaturaNumero = Number(temperatura)
  const numSectorNumero = Number(numSector)
  const numValvulaNumero = Number(numValvula)
  const umbralPCNumero = Number(umbralPC)
  const umbralPROMNumero = Number(umbralPROM)

  const densidadesValidas = puntos.every((punto) => punto.conteoPorMetroLineal.trim() !== '')
  const densidadesNumeros = puntos.map((punto) => Number(punto.conteoPorMetroLineal))
  const densidadesValidasNumeros = densidadesNumeros.every((valor) => !Number.isNaN(valor))

  const densidadPromedio =
    densidadesValidas && densidadesValidasNumeros
      ? getPromedioDensidad(
          puntos.map((punto) => ({
            index: punto.index,
            conteoPorMetroLineal: Number(punto.conteoPorMetroLineal),
          })),
        )
      : null

  const showUmbrales = hallazgos.some(
    (hallazgo) => hallazgo.tipo === 'Plaga' || hallazgo.tipo === 'Enfermedad',
  )

  useEffect(() => {
    if (!prefill) return
    clearDraft()
  }, [clearDraft, prefill])

  useEffect(() => {
    const shouldPersist =
      rancho.trim() ||
      cultivo.trim() ||
      humedadRelativa ||
      temperatura ||
      numSector ||
      numValvula ||
      puntos.some((punto) => punto.conteoPorMetroLineal.trim()) ||
      hallazgos.length > 0

    if (!shouldPersist) {
      clearDraft()
      return
    }

    const draftPayload: MonitoreoDraft = {
      id: draftId,
      createdAt: draftCreatedAt,
      rancho,
      cultivo,
      humedadRelativa,
      temperatura,
      condicionMeteorologica,
      etapaFenologica,
      numSector,
      numValvula,
      umbralPC,
      umbralPROM,
      puntos,
      hallazgos,
    }

    saveDraft(draftPayload)
  }, [
    clearDraft,
    condicionMeteorologica,
    cultivo,
    draftCreatedAt,
    draftId,
    etapaFenologica,
    hallazgos,
    humedadRelativa,
    numSector,
    numValvula,
    puntos,
    rancho,
    saveDraft,
    temperatura,
    umbralPC,
    umbralPROM,
  ])

  const handlePuntoChange = (index: number, value: string) => {
    setPuntos((prev) =>
      prev.map((punto, idx) => (idx === index ? { ...punto, conteoPorMetroLineal: value } : punto)),
    )
  }

  const handleAddHallazgo = () => {
    setHallazgos((prev) => [...prev, { tipo: 'Plaga', nota: '', severidad: 'Baja' }])
  }

  const handleRemoveHallazgo = (index: number) => {
    setHallazgos((prev) => prev.filter((_, idx) => idx !== index))
  }

  const updateHallazgo = (index: number, payload: Partial<Hallazgo>) => {
    setHallazgos((prev) => prev.map((hallazgo, idx) => (idx === index ? { ...hallazgo, ...payload } : hallazgo)))
  }

  const handleGuardar = () => {
    if (!rancho.trim() || !cultivo.trim()) {
      setFormError('Completa rancho y cultivo para guardar el monitoreo.')
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

    if (!densidadesValidas || !densidadesValidasNumeros) {
      setFormError('Captura los 8 puntos de muestreo con valores numéricos.')
      return
    }

    if (showUmbrales && (Number.isNaN(umbralPCNumero) || Number.isNaN(umbralPROMNumero))) {
      setFormError('Define los umbrales PC y PROM con valores numéricos.')
      return
    }

    setFormError('')

    addMonitoreo({
      rancho,
      cultivo,
      humedadRelativa: humedadNumero,
      temperatura: temperaturaNumero,
      condicionMeteorologica,
      etapaFenologica,
      numSector: numSectorNumero,
      numValvula: numValvulaNumero,
      umbralPC: showUmbrales ? umbralPCNumero : null,
      umbralPROM: showUmbrales ? umbralPROMNumero : null,
      puntos: puntos.map((punto) => ({
        index: punto.index,
        conteoPorMetroLineal: Number(punto.conteoPorMetroLineal),
      })),
      hallazgos: hallazgos.map((hallazgo) => ({
        ...hallazgo,
        nota: hallazgo.nota.trim(),
      })),
    })

    clearDraft()
    navigate('/monitoreos/bitacora', { state: { toast: 'saved' } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Iniciar monitoreo</h1>
          <p className="text-sm text-gray-500">
            Registra las condiciones iniciales y captura los 8 puntos obligatorios.
          </p>
        </div>
        {draft ? <Badge className="bg-amber-100 text-amber-700">Borrador en curso</Badge> : null}
      </div>

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
              <div className="mt-2 flex flex-wrap gap-2">
                {etapasFenologicas.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEtapaFenologica(item)}
                    className={cn(
                      chipBase,
                      item === etapaFenologica
                        ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    {item}
                  </button>
                ))}
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
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Muestreo por sector</h2>
            <p className="text-sm text-gray-500">
              Captura el conteo por metro lineal en los 8 puntos definidos.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {puntos.map((punto, index) => (
              <Card key={punto.index} className="border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Punto {punto.index}</h3>
                  <Badge variant="neutral">Sector {numSector || '--'}</Badge>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase text-gray-500">
                    Conteo por metro lineal
                  </label>
                  <Input
                    type="number"
                    value={punto.conteoPorMetroLineal}
                    onChange={(event) => handlePuntoChange(index, event.target.value)}
                  />
                </div>
              </Card>
            ))}
          </div>

          <Card className="bg-[#F5F5F5]">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Promedio densidad</p>
                <p className="text-lg font-semibold text-gray-900">
                  {densidadPromedio !== null ? formatNumber(densidadPromedio) : '--'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Puntos capturados</p>
                <p className="text-lg font-semibold text-gray-900">
                  {puntos.filter((punto) => punto.conteoPorMetroLineal.trim()).length}/8
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Última captura</p>
                <p className="text-sm text-gray-500">
                  {densidadesValidas ? 'Listo para guardar' : 'Completa los 8 puntos'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Hallazgos</h2>
            <p className="text-sm text-gray-500">Agrega observaciones detectadas durante el monitoreo.</p>
          </div>
          <div className="space-y-4">
            {hallazgos.length === 0 ? (
              <p className="text-sm text-gray-400">Sin hallazgos registrados.</p>
            ) : (
              hallazgos.map((hallazgo, index) => (
                <div key={`${hallazgo.tipo}-${index}`} className="rounded-2xl border border-[#E5E7EB] p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-gray-500">Tipo</label>
                      <select
                        className={selectStyles}
                        value={hallazgo.tipo}
                        onChange={(event) =>
                          updateHallazgo(index, { tipo: event.target.value as HallazgoTipo })
                        }
                      >
                        {tiposHallazgo.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-gray-500">Severidad</label>
                      <select
                        className={selectStyles}
                        value={hallazgo.severidad}
                        onChange={(event) =>
                          updateHallazgo(index, { severidad: event.target.value as HallazgoSeveridad })
                        }
                      >
                        {severidades.map((nivel) => (
                          <option key={nivel} value={nivel}>
                            {nivel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-semibold uppercase text-gray-500">Nota</label>
                      <textarea
                        className={cn(
                          'w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]',
                        )}
                        rows={2}
                        value={hallazgo.nota}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                          updateHallazgo(index, { nota: event.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      className="text-xs font-semibold text-gray-500 hover:text-red-600"
                      onClick={() => handleRemoveHallazgo(index)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button variant="secondary" onClick={handleAddHallazgo}>
            + Agregar hallazgo
          </Button>
        </div>
      </Card>

      {showUmbrales ? (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Umbrales PC / PROM</h2>
              <p className="text-sm text-gray-500">
                PC solo en plantas: define los umbrales cuando hay Plaga o Enfermedad.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Umbral PC</label>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="bg-[#DBFAE6] text-[#0B6B2A]">PC</Badge>
                  <Input type="number" value={umbralPC} onChange={(event) => setUmbralPC(event.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Umbral PROM</label>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-600">PROM</Badge>
                  <Input
                    type="number"
                    value={umbralPROM}
                    onChange={(event) => setUmbralPROM(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGuardar}>Guardar monitoreo</Button>
        <Button variant="secondary" onClick={() => navigate('/monitoreos/bitacora')}>
          Ir a bitácora
        </Button>
      </div>
    </div>
  )
}
