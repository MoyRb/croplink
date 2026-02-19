import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import { SELECTED_OFFER_STORAGE_KEY, type SelectedOfferPayload } from '../../lib/marketplace/offers'
import {
  getPlaguicidasCategories,
  searchPlaguicidasRecommendations,
  searchTargets,
  type PlaguicidaMarketFilter,
  type PlaguicidaTarget,
  type PlaguicidaTargetType,
  type PlaguicidaUseCase,
} from '../../lib/plaguicidas'
import { useRequisicionesStore, type NuevaRequisicion, type RequisicionItem } from '../../lib/store/requisiciones'
import { cn } from '../../lib/utils'

const unidades = ['kg', 'L', 'pza'] as const
const centrosCosto = ['Operaciones', 'Compras', 'Mantenimiento', 'Campo'] as const
const prioridades = ['Baja', 'Media', 'Alta'] as const
const cultivosDisponibles = ['Arándano', 'Fresa', 'Frambuesa', 'Zarzamora'] as const
const tiposPlaga: PlaguicidaTargetType[] = ['Plaga', 'Enfermedad']
const mercados: PlaguicidaMarketFilter[] = ['MX', 'USA', 'Todos']

const maxFileSize = 10 * 1024 * 1024

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

const fallbackValue = (value?: string, empty = '—') => (value && value.trim() ? value : empty)

export function RequisicionesCrearPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addRequisicion } = useRequisicionesStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const prefill = useMemo(() => location.state?.prefill as Partial<NuevaRequisicion> | undefined, [location.state])

  const [producto, setProducto] = useState(prefill?.producto ?? '')
  const [cantidad, setCantidad] = useState(prefill?.cantidad ? String(prefill.cantidad) : '')
  const [unidad, setUnidad] = useState<(typeof unidades)[number]>(prefill?.unidad ?? 'kg')
  const [centroCosto, setCentroCosto] = useState<(typeof centrosCosto)[number]>(
    prefill?.centroCosto ?? 'Operaciones',
  )
  const [prioridad, setPrioridad] = useState<(typeof prioridades)[number]>(prefill?.prioridad ?? 'Media')
  const [notas, setNotas] = useState(prefill?.notas ?? '')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoError, setArchivoError] = useState('')
  const [selectedOffer, setSelectedOffer] = useState<SelectedOfferPayload | null>(null)
  const [toastVisible, setToastVisible] = useState(() => location.state?.toast === 'offer-selected')
  const [duplicateToastVisible, setDuplicateToastVisible] = useState(false)

  const [cultivo, setCultivo] = useState<(typeof cultivosDisponibles)[number]>('Arándano')
  const [tipoProblema, setTipoProblema] = useState<PlaguicidaTargetType>('Plaga')
  const [targetQuery, setTargetQuery] = useState('')
  const [targetSeleccionado, setTargetSeleccionado] = useState<{ target_common: string; target_common_norm: string } | null>(
    null,
  )
  const [autocompleteOptions, setAutocompleteOptions] = useState<PlaguicidaTarget[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendations, setRecommendations] = useState<PlaguicidaUseCase[]>([])
  const [mercado, setMercado] = useState<PlaguicidaMarketFilter>('Todos')
  const [categoria, setCategoria] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [itemsRequisicion, setItemsRequisicion] = useState<RequisicionItem[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const cantidadNumero = Number(cantidad)
  const isCompareDisabled = !producto.trim() || !cantidadNumero || cantidadNumero <= 0
  const compareQuery = useMemo(() => {
    if (isCompareDisabled) return '/marketplace/comparar'
    const params = new URLSearchParams({
      query: producto.trim(),
      qty: String(cantidadNumero),
      unit: unidad,
    })
    return `/marketplace/comparar?${params.toString()}`
  }, [cantidadNumero, isCompareDisabled, producto, unidad])

  const selectStyles =
    'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

  const resistanceWarning = useMemo(() => {
    const groups = new Map<string, number>()
    itemsRequisicion.forEach((item) => {
      const key = (item.metadata.resistance_class || '').trim()
      if (!key) return
      groups.set(key, (groups.get(key) ?? 0) + 1)
    })

    return Array.from(groups.values()).some((count) => count >= 2)
  }, [itemsRequisicion])

  const handleAgregarItem = (item: PlaguicidaUseCase) => {
    if (!targetSeleccionado) return

    const productId = item.product_id || item.id
    setItemsRequisicion((prev) => {
      const alreadyExists = prev.some(
        (existing) =>
          existing.product_id === productId &&
          existing.metadata.target_common_norm === targetSeleccionado.target_common_norm,
      )

      if (alreadyExists) {
        setDuplicateToastVisible(true)
        return prev
      }

      const next: RequisicionItem = {
        id: `${productId}-${targetSeleccionado.target_common_norm}-${Date.now()}`,
        product_id: productId,
        commercial_name: item.commercial_name,
        active_ingredient: item.active_ingredient || '—',
        quantity: 1,
        unit: 'L',
        metadata: {
          crop: cultivo,
          target_type: tipoProblema,
          target_common: targetSeleccionado.target_common,
          target_common_norm: targetSeleccionado.target_common_norm,
          market: mercado,
          resistance_class: item.resistance_class,
          chemical_group: item.chemical_group,
          safety_interval: item.safety_interval,
          reentry_period: item.reentry_period,
          interval_between_applications: item.interval_between_applications,
          max_applications: item.max_applications,
          registration: item.registration,
          observations: item.observations,
          sheet: item.sheet,
        },
      }

      return [...prev, next]
    })
  }

  const handleUpdateItem = (itemId: string, changes: Partial<Pick<RequisicionItem, 'quantity' | 'unit' | 'notes'>>) => {
    setItemsRequisicion((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...changes } : item)))
  }

  const handleRemoveItem = (itemId: string) => {
    setItemsRequisicion((prev) => prev.filter((item) => item.id !== itemId))
  }

  const handleBuscarRecomendaciones = async () => {
    setHasSearched(true)

    const selectedCrop = cultivo
    const targetSelected = targetSeleccionado
    const targetCommonNorm = targetSeleccionado?.target_common_norm
    const targetTypeNorm = tipoProblema.toLowerCase() as 'plaga' | 'enfermedad'
    const market = mercado === 'Todos' ? undefined : mercado
    const category = categoria === 'Todas' ? undefined : categoria || undefined

    if (!targetSelected || !targetCommonNorm) {
      setRecommendations([])
      return
    }

    setLoadingRecommendations(true)
    try {
      const payload = {
        crop: selectedCrop,
        targetType: targetTypeNorm,
        targetCommonNorm,
        market,
        category,
        limit: 30,
      }
      const recs = await searchPlaguicidasRecommendations(payload)
      setRecommendations(recs)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleSelectTarget = (target: PlaguicidaTarget) => {
    setTargetSeleccionado({
      target_common: target.target_common,
      target_common_norm: target.target_common_norm,
    })
    setTargetQuery(target.target_common)
    setAutocompleteOptions([])
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setArchivo(null)
      setArchivoError('Solo se permiten archivos PDF.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > maxFileSize) {
      setArchivo(null)
      setArchivoError('El PDF debe pesar máximo 10MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setArchivo(file)
    setArchivoError('')
  }

  const handleRemoveFile = () => {
    setArchivo(null)
    setArchivoError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!producto || !cantidadNumero || cantidadNumero <= 0) {
      return
    }

    const unitRates = {
      kg: 180,
      L: 220,
      pza: 350,
    }

    const offerMatches =
      selectedOffer &&
      selectedOffer.producto === producto &&
      selectedOffer.cantidad === cantidadNumero &&
      selectedOffer.unidad === unidad

    const total = offerMatches ? selectedOffer.offer.precioTotal : cantidadNumero * unitRates[unidad]

    addRequisicion({
      producto,
      cantidad: cantidadNumero,
      unidad,
      centroCosto,
      prioridad,
      notas: notas.trim() || undefined,
      items: itemsRequisicion,
      total,
      adjunto: archivo
        ? {
            nombre: archivo.name,
            tamano: formatFileSize(archivo.size),
          }
        : undefined,
    })

    navigate('/requisiciones/lista', { state: { toast: 'created' } })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(SELECTED_OFFER_STORAGE_KEY)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as SelectedOfferPayload
      if (parsed && parsed.offer) {
        setSelectedOffer(parsed)
        setProducto(parsed.producto || '')
        setCantidad(parsed.cantidad ? String(parsed.cantidad) : '')
        setUnidad(parsed.unidad as (typeof unidades)[number])
      }
    } catch {
      // noop
    } finally {
      window.localStorage.removeItem(SELECTED_OFFER_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const loadCategories = async () => {
      const availableCategories = await getPlaguicidasCategories({ crop: cultivo, targetType: tipoProblema })
      setCategorias(availableCategories)
      setCategoria('')
    }

    void loadCategories()
    setTargetQuery('')
    setTargetSeleccionado(null)
    setAutocompleteOptions([])
    setRecommendations([])
    setHasSearched(false)
  }, [cultivo, tipoProblema])

  useEffect(() => {
    if (!targetQuery.trim()) {
      setAutocompleteOptions([])
      setLoadingTargets(false)
      return
    }

    const timer = window.setTimeout(() => {
      setLoadingTargets(true)
      searchTargets({ crop: cultivo, targetType: tipoProblema, q: targetQuery })
        .then((options) => setAutocompleteOptions(options))
        .finally(() => setLoadingTargets(false))
    }, 250)

    return () => window.clearTimeout(timer)
  }, [cultivo, targetQuery, tipoProblema])

  useEffect(() => {
    if (
      selectedOffer &&
      (selectedOffer.producto !== producto ||
        selectedOffer.cantidad !== cantidadNumero ||
        selectedOffer.unidad !== unidad)
    ) {
      setSelectedOffer(null)
    }
  }, [cantidadNumero, producto, selectedOffer, unidad])

  useEffect(() => {
    if (location.state?.toast === 'offer-selected') {
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
    if (!duplicateToastVisible) return
    const timer = window.setTimeout(() => setDuplicateToastVisible(false), 2000)
    return () => window.clearTimeout(timer)
  }, [duplicateToastVisible])

  const estimatedTotal = selectedOffer
    ? selectedOffer.offer.precioTotal
    : cantidadNumero * (unidad === 'kg' ? 180 : unidad === 'L' ? 220 : 350)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Crear requisición</h1>
          <p className="text-sm text-gray-500">Completa los datos esenciales para iniciar el flujo.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="secondary"
            disabled={isCompareDisabled}
            className={isCompareDisabled ? 'cursor-not-allowed opacity-60' : ''}
            onClick={() => navigate(compareQuery)}
          >
            Comparar precios
          </Button>
          {isCompareDisabled ? (
            <p className="text-xs text-gray-500">Ingresa producto y cantidad para comparar.</p>
          ) : null}
        </div>
      </div>

      {toastVisible ? <Toast variant="success">Oferta seleccionada</Toast> : null}
      {duplicateToastVisible ? <Toast variant="info">Ya agregado</Toast> : null}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Producto</label>
              <Input
                className="mt-2"
                placeholder="Ej. Fertilizante NPK"
                value={producto}
                onChange={(event) => setProducto(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Centro de costo</label>
              <select
                className={cn(selectStyles, 'mt-2')}
                value={centroCosto}
                onChange={(event) => setCentroCosto(event.target.value as (typeof centrosCosto)[number])}
                required
              >
                {centrosCosto.map((centro) => (
                  <option key={centro} value={centro}>
                    {centro}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cantidad</label>
              <div className="mt-2 flex gap-3">
                <Input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={cantidad}
                  onChange={(event) => setCantidad(event.target.value)}
                  required
                />
                <select
                  className={selectStyles}
                  value={unidad}
                  onChange={(event) => setUnidad(event.target.value as (typeof unidades)[number])}
                >
                  {unidades.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Prioridad</label>
              <select
                className={cn(selectStyles, 'mt-2')}
                value={prioridad}
                onChange={(event) => setPrioridad(event.target.value as (typeof prioridades)[number])}
              >
                {prioridades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-gray-400">Asistente fitosanitario</p>
                <p className="text-sm text-gray-600">Selecciona cultivo, target y filtros para obtener recomendaciones.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Cultivo</label>
                <select
                  className={cn(selectStyles, 'mt-2')}
                  value={cultivo}
                  onChange={(event) => setCultivo(event.target.value as (typeof cultivosDisponibles)[number])}
                >
                  {cultivosDisponibles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo de problema</label>
                <div className="mt-2 flex rounded-full border border-[#E5E7EB] bg-white p-1">
                  {tiposPlaga.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={cn(
                        'flex-1 rounded-full px-3 py-1.5 text-sm',
                        tipoProblema === item ? 'bg-[#DBFAE6] font-medium text-[#0B6B2A]' : 'text-gray-600',
                      )}
                      onClick={() => setTipoProblema(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <label className="text-sm font-medium text-gray-700">Buscar target</label>
                <Input
                  className="mt-2"
                  placeholder="Ej. araña roja"
                  value={targetQuery}
                  onChange={(event) => {
                    setTargetQuery(event.target.value)
                    setTargetSeleccionado(null)
                  }}
                />
                {loadingTargets ? <p className="mt-1 text-xs text-gray-500">Cargando targets…</p> : null}
                {autocompleteOptions.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-lg">
                    {autocompleteOptions.map((item) => (
                      <button
                        key={`${item.target_common_norm}-${item.target_type}`}
                        type="button"
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => handleSelectTarget(item)}
                      >
                        <span className="font-medium text-gray-900">{item.target_common}</span>
                        <span className="ml-2 text-xs text-gray-500">{item.target_type}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Filtro mercado</label>
                <div className="mt-2 flex rounded-full border border-[#E5E7EB] bg-white p-1">
                  {mercados.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={cn(
                        'flex-1 rounded-full px-3 py-1.5 text-sm',
                        mercado === item ? 'bg-[#DBFAE6] font-medium text-[#0B6B2A]' : 'text-gray-600',
                      )}
                      onClick={() => setMercado(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              {categorias.length > 0 ? (
                <div>
                  <label className="text-sm font-medium text-gray-700">Filtro category</label>
                  <select className={cn(selectStyles, 'mt-2')} value={categoria} onChange={(event) => setCategoria(event.target.value)}>
                    <option value="">Todas</option>
                    {categorias.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {targetSeleccionado
                  ? `Target seleccionado: ${targetSeleccionado.target_common} (${targetSeleccionado.target_common_norm})`
                  : 'Selecciona un target del autocomplete para buscar recomendaciones.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                disabled={loadingRecommendations}
                onClick={() => void handleBuscarRecomendaciones()}
              >
                {loadingRecommendations ? 'Buscando…' : 'Buscar recomendaciones'}
              </Button>
            </div>

            {hasSearched && !loadingRecommendations ? (
              <p className="mt-4 text-sm font-medium text-gray-700">Encontrados {recommendations.length} productos</p>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#E5E7EB]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Producto</th>
                    <th className="px-4 py-3 font-semibold">Ingrediente activo</th>
                    <th className="px-4 py-3 font-semibold">Resistencia</th>
                    <th className="px-4 py-3 font-semibold">Grupo químico</th>
                    <th className="px-4 py-3 font-semibold">Intervalo seguridad</th>
                    <th className="px-4 py-3 font-semibold">Reentrada</th>
                    <th className="px-4 py-3 font-semibold">Dosis</th>
                    <th className="px-4 py-3 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loadingRecommendations ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={8}>
                        Cargando recomendaciones…
                      </td>
                    </tr>
                  ) : !hasSearched ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={8}>
                        Busca recomendaciones para ver productos sugeridos.
                      </td>
                    </tr>
                  ) : !targetSeleccionado ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={8}>
                        Selecciona un target válido del autocomplete.
                      </td>
                    </tr>
                  ) : recommendations.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={8}>
                        No encontramos resultados con esos filtros.
                      </td>
                    </tr>
                  ) : (
                    recommendations.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.commercial_name}</td>
                        <td className="px-4 py-3 text-gray-700">{fallbackValue(item.active_ingredient)}</td>
                        <td className="px-4 py-3 text-gray-700">{fallbackValue(item.resistance_class)}</td>
                        <td className="px-4 py-3 text-gray-700">{fallbackValue(item.chemical_group)}</td>
                        <td className="px-4 py-3 text-gray-700">{fallbackValue(item.safety_interval, 'No especificado')}</td>
                        <td className="px-4 py-3 text-gray-700">{fallbackValue(item.reentry_period)}</td>
                        <td className="px-4 py-3 text-gray-700">{fallbackValue(item.dose)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button type="button" variant="secondary" onClick={() => handleAgregarItem(item)}>
                            Agregar a requisición
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {itemsRequisicion.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Items agregados a requisición</p>
                  <span className="text-xs text-gray-500">{itemsRequisicion.length} agregado(s)</span>
                </div>
                <div className="mt-3 space-y-3">
                  {itemsRequisicion.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{item.commercial_name}</p>
                          <p className="text-xs text-gray-500">{item.active_ingredient}</p>
                        </div>
                        <Button type="button" variant="ghost" onClick={() => handleRemoveItem(item.id)}>
                          Quitar
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Cantidad</label>
                          <Input
                            className="mt-1"
                            type="number"
                            min={1}
                            value={String(item.quantity)}
                            onChange={(event) => handleUpdateItem(item.id, { quantity: Number(event.target.value) || 1 })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Unidad</label>
                          <Input
                            className="mt-1"
                            value={item.unit}
                            onChange={(event) => handleUpdateItem(item.id, { unit: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Notas</label>
                          <Input
                            className="mt-1"
                            placeholder="Observaciones del ítem"
                            value={item.notes || ''}
                            onChange={(event) => handleUpdateItem(item.id, { notes: event.target.value })}
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2 lg:grid-cols-3">
                        <p><strong>Crop:</strong> {item.metadata.crop}</p>
                        <p><strong>Tipo:</strong> {item.metadata.target_type}</p>
                        <p><strong>Target:</strong> {item.metadata.target_common}</p>
                        <p><strong>Mercado:</strong> {item.metadata.market}</p>
                        <p><strong>Resistencia:</strong> {fallbackValue(item.metadata.resistance_class)}</p>
                        <p><strong>Grupo químico:</strong> {fallbackValue(item.metadata.chemical_group)}</p>
                        <p><strong>Intervalo seguridad:</strong> {fallbackValue(item.metadata.safety_interval, 'No especificado')}</p>
                        <p><strong>Reentrada:</strong> {fallbackValue(item.metadata.reentry_period)}</p>
                        <p><strong>Intervalo aplicaciones:</strong> {fallbackValue(item.metadata.interval_between_applications)}</p>
                        <p><strong>Máx. aplicaciones:</strong> {fallbackValue(item.metadata.max_applications)}</p>
                        <p><strong>Registro:</strong> {fallbackValue(item.metadata.registration)}</p>
                        <p><strong>Observaciones:</strong> {fallbackValue(item.metadata.observations)}</p>
                        <p><strong>Ficha:</strong> {fallbackValue(item.metadata.sheet)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]"
              rows={4}
              placeholder="Detalles adicionales para compras"
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Adjuntar ficha técnica (PDF)</label>
            <input
              ref={fileInputRef}
              className={cn(
                'mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]',
              )}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
            />
            <p className="mt-2 text-xs text-gray-500">Solo PDF. Tamaño máximo 10MB.</p>
            {archivoError ? <p className="mt-2 text-xs font-medium text-red-600">{archivoError}</p> : null}
            {archivo ? (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm">
                <div>
                  <div className="font-medium text-gray-900">{archivo.name}</div>
                  <div className="text-xs text-gray-500">{formatFileSize(archivo.size)}</div>
                </div>
                <Button type="button" variant="ghost" onClick={handleRemoveFile}>
                  Quitar
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-gray-50 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-gray-600">{selectedOffer ? 'Estimado con oferta' : 'Estimado automático'}</span>
              <span className="font-semibold text-gray-900">{formatCurrency(estimatedTotal || 0)}</span>
            </div>
            {resistanceWarning ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                Riesgo de resistencia: estás repitiendo el mismo grupo. Considera rotación.
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate('/requisiciones/lista')}>
              Cancelar
            </Button>
            <Button type="submit">Crear requisición</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
