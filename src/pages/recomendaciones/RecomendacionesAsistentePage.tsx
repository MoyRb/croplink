import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import {
  buildIndex,
  getRecommendations,
  loadTargets,
  loadUseCases,
  resolveCatalogDoseFromUseCase,
  searchTargets,
  type SearchIndex,
  type Target,
  type UseCase,
} from '../../lib/plaguicidas'
import { createRecomendacion, type RecommendationMode } from '../../lib/store/recomendaciones'

// UI-only filter constants for the plaguicidas dataset
const cultivosDisponibles = ['Arándano', 'Fresa', 'Frambuesa', 'Zarzamora'] as const
const tiposProblema = ['Plaga', 'Enfermedad'] as const
const mercados = ['MX', 'USA', 'Todos'] as const
const modos: Array<{ value: RecommendationMode; label: string }> = [
  { value: 'FOLIAR_DRENCH', label: 'Foliar / Drench' },
  { value: 'VIA_RIEGO', label: 'Vía riego' },
]

const selectStyles =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

type ProductoSeleccionado = {
  rowId: string
  comercialName: string
  activeIngredient: string
  dosis: string
  dosePerHa: number | null
  doseUnit: string | null
  intervalo: string | null
  reentrada: string | null
  doseStrategy: string
  targetCommon: string
  resistanceClass: string
}

export function RecomendacionesAsistentePage() {
  const navigate = useNavigate()

  // ── Plaguicidas search state ──────────────────────────────────────────────
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null)
  const [indexError, setIndexError] = useState('')
  const [cultivo, setCultivo] = useState<(typeof cultivosDisponibles)[number]>('Arándano')
  const [tipoProblema, setTipoProblema] = useState<(typeof tiposProblema)[number]>('Plaga')
  const [mercado, setMercado] = useState<(typeof mercados)[number]>('Todos')
  const [categoria, setCategoria] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [targetQuery, setTargetQuery] = useState('')
  const [autocompleteOptions, setAutocompleteOptions] = useState<Target[]>([])
  const [targetSeleccionado, setTargetSeleccionado] = useState<Target | null>(null)
  const [recommendations, setRecommendations] = useState<UseCase[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  // ── Selected products ─────────────────────────────────────────────────────
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([])
  const [duplicateToast, setDuplicateToast] = useState(false)

  // ── General recommendation fields ─────────────────────────────────────────
  const [titulo, setTitulo] = useState('')
  const [modo, setModo] = useState<RecommendationMode>('FOLIAR_DRENCH')
  const [solicita, setSolicita] = useState('')
  const [fechaRec, setFechaRec] = useState('')
  const [notas, setNotas] = useState('')

  // ── Submit state ──────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [validationError, setValidationError] = useState('')

  // Load plaguicidas index once
  useEffect(() => {
    const load = async () => {
      try {
        const [useCases, targets] = await Promise.all([loadUseCases(), loadTargets()])
        setSearchIndex(buildIndex(useCases, targets))
      } catch (err) {
        setIndexError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo fitosanitario.')
      }
    }
    void load()
  }, [])

  // Update categories when cultivo/tipoProblema changes
  useEffect(() => {
    if (!searchIndex) return
    const normalizedCrop = cultivo.toLowerCase()
    const normalizedType = tipoProblema.toLowerCase()
    const availableCategories = Array.from(
      new Set(
        searchIndex.targets
          .filter((t) => t.crop.split(',').map((s) => s.trim().toLowerCase()).includes(normalizedCrop))
          .filter((t) => t.target_type.toLowerCase() === normalizedType)
          .map((t) => t.category)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, 'es'))

    setCategorias(availableCategories)
    setCategoria('')
    setTargetQuery('')
    setTargetSeleccionado(null)
    setAutocompleteOptions([])
    setRecommendations([])
    setHasSearched(false)
  }, [searchIndex, cultivo, tipoProblema])

  // Re-run search when target or filters change
  useEffect(() => {
    if (!searchIndex || !targetSeleccionado) {
      setRecommendations([])
      return
    }
    const results = getRecommendations(
      { crop: cultivo, targetType: tipoProblema, targetCommonNorm: targetSeleccionado.target_common_norm, market: mercado, category: categoria },
      searchIndex,
    )
    setRecommendations(results)
    setHasSearched(true)
  }, [searchIndex, targetSeleccionado, mercado, categoria, cultivo, tipoProblema])

  // Resistance class warning
  const resistanceWarning = useMemo(() => {
    const groups = new Map<string, number>()
    productosSeleccionados.forEach((p) => {
      const key = p.resistanceClass.trim()
      if (!key) return
      groups.set(key, (groups.get(key) ?? 0) + 1)
    })
    return Array.from(groups.values()).some((count) => count >= 2)
  }, [productosSeleccionados])

  const handleTargetQueryChange = (value: string) => {
    setTargetQuery(value)
    setTargetSeleccionado(null)
    setRecommendations([])
    setHasSearched(false)

    if (!searchIndex || value.length < 2) {
      setAutocompleteOptions([])
      return
    }
    setAutocompleteOptions(searchTargets({ crop: cultivo, targetType: tipoProblema, q: value }, searchIndex))
  }

  const handleSelectTarget = (target: Target) => {
    setTargetQuery(target.target_common)
    setTargetSeleccionado(target)
    setAutocompleteOptions([])
  }

  const handleAgregarProducto = (useCase: UseCase) => {
    if (!targetSeleccionado) return
    const resolvedCatalogDose = resolveCatalogDoseFromUseCase(useCase)
    const alreadyExists = productosSeleccionados.some(
      (p) => p.comercialName === useCase.commercial_name && p.targetCommon === targetSeleccionado.target_common,
    )
    if (alreadyExists) {
      setDuplicateToast(true)
      setTimeout(() => setDuplicateToast(false), 2000)
      return
    }
    setProductosSeleccionados((prev) => [
      ...prev,
      {
        rowId: `${useCase.product_id}-${targetSeleccionado.target_common_norm}-${Date.now()}`,
        comercialName: useCase.commercial_name,
        activeIngredient: useCase.active_ingredient,
        dosis: resolvedCatalogDose.doseLabel,
        dosePerHa: resolvedCatalogDose.dosePerHa,
        doseUnit: resolvedCatalogDose.doseUnit,
        intervalo: resolvedCatalogDose.intervalo,
        reentrada: resolvedCatalogDose.reentrada,
        doseStrategy: resolvedCatalogDose.strategy,
        targetCommon: targetSeleccionado.target_common,
        resistanceClass: useCase.resistance_class,
      },
    ])
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    setValidationError('')

    if (productosSeleccionados.length === 0) {
      setValidationError('Agrega al menos un producto fitosanitario antes de guardar.')
      return
    }

    setIsSubmitting(true)
    try {
      await createRecomendacion({
        modo,
        estado: 'draft',
        numero: '',
        titulo: titulo.trim() || 'Recomendación fitosanitaria',
        huerta: '',
        superficie: '',
        solicita: solicita.trim(),
        modoAplicacion: '',
        justificacion: '',
        clasificacion: '',
        contenedor: '',
        volumenAguaHa: '',
        fechaRecomendacion: fechaRec,
        semana: '',
        equipoAplicacion: '',
        empleadoRecibe: '',
        operario: '',
        fechaAplicacion: '',
        phMezcla: '',
        horaInicio: '',
        horaTermino: '',
        comentarios: notas.trim(),
        productos: productosSeleccionados.map((p) => ({
          producto: p.comercialName,
          ingredienteActivo: p.activeIngredient,
          dosis: p.dosis,
          gasto: '',
          gastoTotal: '',
          sector: p.targetCommon,
          dosePerHa: p.dosePerHa,
          doseUnit: p.doseUnit,
          intervalo: p.intervalo,
          reentrada: p.reentrada,
        })),
        dosisPorHa: Array.from({ length: 10 }, () => ''),
        riegoFilas: [],
      })
      navigate('/recomendaciones/lista')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la recomendación.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Asistente fitosanitario</h1>
          <p className="text-sm text-gray-500">Busca productos por plaga o enfermedad y crea una recomendación.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/recomendaciones/lista')}>
          Cancelar
        </Button>
      </div>

      {duplicateToast ? <Toast variant="error">Este producto ya fue agregado para ese objetivo.</Toast> : null}
      {indexError ? <p className="text-sm text-amber-600">{indexError}</p> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Buscador fitosanitario ── */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Buscador fitosanitario</h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cultivo</label>
              <select className={selectStyles} value={cultivo} onChange={(e) => setCultivo(e.target.value as typeof cultivo)}>
                {cultivosDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de problema</label>
              <select className={selectStyles} value={tipoProblema} onChange={(e) => setTipoProblema(e.target.value as typeof tipoProblema)}>
                {tiposProblema.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Mercado</label>
              <select className={selectStyles} value={mercado} onChange={(e) => setMercado(e.target.value as typeof mercado)}>
                {mercados.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {categorias.length > 0 ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Categoría</label>
                <select className={selectStyles} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">Todas</option>
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ) : null}
          </div>

          <div className="relative mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">Plaga o enfermedad objetivo</label>
            <Input
              placeholder="Escribe para buscar..."
              value={targetQuery}
              onChange={(e) => handleTargetQueryChange(e.target.value)}
              disabled={!searchIndex}
            />
            {autocompleteOptions.length > 0 ? (
              <ul className="absolute z-10 mt-1 w-full rounded-2xl border border-[#E5E7EB] bg-white shadow-md">
                {autocompleteOptions.map((target) => (
                  <li key={target.target_common_norm}>
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-[#DBFAE6] first:rounded-t-2xl last:rounded-b-2xl"
                      onClick={() => handleSelectTarget(target)}
                    >
                      {target.target_common}
                      {target.category ? <span className="ml-2 text-xs text-gray-400">· {target.category}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Results table */}
          {hasSearched && recommendations.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No se encontraron productos para los filtros seleccionados.</p>
          ) : null}

          {recommendations.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <p className="mb-2 text-xs text-gray-500">
                Objetivo: <span className="font-medium text-gray-700">{targetSeleccionado?.target_common}</span>
                {' · '}{recommendations.length} productos encontrados
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Producto comercial</th>
                    <th className="pb-2 pr-4 font-medium">Ingrediente activo</th>
                    <th className="pb-2 pr-4 font-medium">Dosis</th>
                    <th className="pb-2 pr-4 font-medium">Clase resistencia</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((rec) => (
                    <tr key={`${rec.product_id}-${rec.target_common_norm}`} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="py-2 pr-4 font-medium">{rec.commercial_name}</td>
                      <td className="py-2 pr-4 text-gray-600">{rec.active_ingredient}</td>
                      <td className="py-2 pr-4 text-gray-600">{rec.dose || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600">{rec.resistance_class || '—'}</td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleAgregarProducto(rec)}
                        >
                          + Agregar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        {/* ── Productos seleccionados ── */}
        {productosSeleccionados.length > 0 ? (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Productos seleccionados ({productosSeleccionados.length})
            </h2>

            {resistanceWarning ? (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Advertencia: hay 2 o más productos de la misma clase de resistencia. Considera rotar ingredientes activos.
              </p>
            ) : null}

            <div className="space-y-2">
              {productosSeleccionados.map((p) => (
                <div key={p.rowId} className="flex items-start justify-between rounded-xl border border-[#E5E7EB] p-3">
                  <div>
                    <p className="font-medium text-gray-900">{p.comercialName}</p>
                    <p className="text-xs text-gray-500">
                      {p.activeIngredient}
                      {p.dosis ? ` · Dosis: ${p.dosis}` : ''}
                      {p.dosePerHa != null ? ` · Base/ha: ${p.dosePerHa}` : ''}
                      {p.doseUnit ? ` ${p.doseUnit}` : ''}
                      {p.intervalo ? ` · Intervalo: ${p.intervalo}` : ''}
                      {p.reentrada ? ` · Reentrada: ${p.reentrada}` : ''}
                      {' · Objetivo: '}{p.targetCommon}
                    </p>
                    {p.doseStrategy === 'range_lower_bound' ? (
                      <p className="mt-1 text-[11px] text-amber-700">Rango detectado en catálogo: se usa el límite inferior como dosis inicial editable.</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="ml-4 rounded-full px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setProductosSeleccionados((prev) => prev.filter((item) => item.rowId !== p.rowId))}
                    aria-label="Eliminar producto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {/* ── Datos de la recomendación ── */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Datos de la recomendación</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
              <Input
                placeholder="Ej. Recomendación Botrytis semana 22"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Modo de aplicación</label>
              <select className={selectStyles} value={modo} onChange={(e) => setModo(e.target.value as RecommendationMode)}>
                {modos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha recomendación</label>
              <Input
                type="date"
                value={fechaRec}
                onChange={(e) => setFechaRec(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Solicita</label>
              <Input
                placeholder="Nombre del solicitante"
                value={solicita}
                onChange={(e) => setSolicita(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
              <Input
                placeholder="Observaciones adicionales..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {validationError ? <p className="text-sm text-red-600">{validationError}</p> : null}
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/recomendaciones/lista')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || productosSeleccionados.length === 0}>
            {isSubmitting ? 'Guardando...' : `Crear recomendación${productosSeleccionados.length > 0 ? ` (${productosSeleccionados.length} productos)` : ''}`}
          </Button>
        </div>
      </form>
    </div>
  )
}
