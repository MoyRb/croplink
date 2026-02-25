import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import { SELECTED_OFFER_STORAGE_KEY, type SelectedOfferPayload } from '../../lib/marketplace/offers'
import {
  buildIndex,
  getRecommendations,
  loadTargets,
  loadUseCases,
  searchTargets,
  type SearchIndex,
  type Target,
  type UseCase,
} from '../../lib/plaguicidas'
import { getInventoryItems, type InventoryItem } from '../../lib/store/inventory'
import { useRequisicionesStore, type NuevaRequisicion, type RequisicionItem } from '../../lib/store/requisiciones'
import { useOperationContext } from '../../lib/store/operationContext'
import { cn } from '../../lib/utils'

const unidades = ['kg', 'L', 'pza'] as const
const centrosCosto = ['Operaciones', 'Compras', 'Mantenimiento', 'Campo'] as const
const prioridades = ['Baja', 'Media', 'Alta'] as const
const cultivosDisponibles = ['Arándano', 'Fresa', 'Frambuesa', 'Zarzamora'] as const
const tiposPlaga = ['Plaga', 'Enfermedad'] as const
const mercados = ['MX', 'USA', 'Todos'] as const
const especiesBeneficosMock = ['Trichogramma', 'Aphidius', 'Chrysoperla', 'Orius', 'Encarsia'] as const
const presentacionesBeneficosMock = ['Sobres', 'Frascos', 'Tarjeta', 'Botella', 'Blister'] as const

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
  const { operationContext } = useOperationContext()
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
  const [missingRanchToastVisible, setMissingRanchToastVisible] = useState(false)

  const [cultivo, setCultivo] = useState<(typeof cultivosDisponibles)[number]>('Arándano')
  const [tipoProblema, setTipoProblema] = useState<(typeof tiposPlaga)[number]>('Plaga')
  const [targetQuery, setTargetQuery] = useState('')
  const [targetSeleccionado, setTargetSeleccionado] = useState<{ target_common: string; target_common_norm: string } | null>(
    null,
  )
  const [autocompleteOptions, setAutocompleteOptions] = useState<Target[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendations, setRecommendations] = useState<UseCase[]>([])
  const [mercado, setMercado] = useState<(typeof mercados)[number]>('Todos')
  const [categoria, setCategoria] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null)
  const [itemsRequisicion, setItemsRequisicion] = useState<RequisicionItem[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [inventoryItems] = useState<InventoryItem[]>(() => getInventoryItems())
  const [insumoQuery, setInsumoQuery] = useState('')
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<InventoryItem | null>(null)
  const [insumoCantidad, setInsumoCantidad] = useState('1')
  const [insumoUnidad, setInsumoUnidad] = useState('')
  const [beneficoEspecie, setBeneficoEspecie] = useState<(typeof especiesBeneficosMock)[number]>(especiesBeneficosMock[0])
  const [beneficoPresentacion, setBeneficoPresentacion] = useState<(typeof presentacionesBeneficosMock)[number]>(presentacionesBeneficosMock[0])
  const [beneficoDosisPorHa, setBeneficoDosisPorHa] = useState('1')
  const [beneficoSuperficieHa, setBeneficoSuperficieHa] = useState('1')
  const [beneficoFechaProgramada, setBeneficoFechaProgramada] = useState('')
  const [beneficoNotas, setBeneficoNotas] = useState('')

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
      const key = (item.metadata?.resistance_class || '').trim()
      if (!key) return
      groups.set(key, (groups.get(key) ?? 0) + 1)
    })

    return Array.from(groups.values()).some((count) => count >= 2)
  }, [itemsRequisicion])

  const handleAgregarItem = (item: UseCase) => {
    if (!targetSeleccionado) return

    const productId = item.product_id
    setItemsRequisicion((prev) => {
      const alreadyExists = prev.some(
        (existing) =>
          existing.tipo === 'AGROQUIMICO' &&
          existing.product_id === productId &&
          existing.metadata?.target_common_norm === targetSeleccionado.target_common_norm,
      )

      if (alreadyExists) {
        setDuplicateToastVisible(true)
        return prev
      }

      const next: RequisicionItem = {
        id: `${productId}-${targetSeleccionado.target_common_norm}-${Date.now()}`,
        tipo: 'AGROQUIMICO',
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

  const handleAgregarInsumoGeneral = () => {
    if (!insumoSeleccionado) return

    const qty = Number(insumoCantidad)
    if (!qty || qty <= 0) return

    setItemsRequisicion((prev) => {
      const alreadyExists = prev.some(
        (existing) => existing.tipo === 'INSUMO_GENERAL' && existing.product_id === insumoSeleccionado.id,
      )

      if (alreadyExists) {
        setDuplicateToastVisible(true)
        return prev
      }

      const next: RequisicionItem = {
        id: `general-${insumoSeleccionado.id}-${Date.now()}`,
        tipo: 'INSUMO_GENERAL',
        product_id: insumoSeleccionado.id,
        commercial_name: insumoSeleccionado.nombre,
        quantity: qty,
        unit: insumoUnidad.trim() || insumoSeleccionado.unidad,
        notes: insumoSeleccionado.proveedor_sugerido
          ? `Proveedor sugerido: ${insumoSeleccionado.proveedor_sugerido}`
          : undefined,
      }

      return [...prev, next]
    })

    setInsumoQuery('')
    setInsumoSeleccionado(null)
    setInsumoCantidad('1')
    setInsumoUnidad('')
  }

  const handleAgregarBenefico = () => {
    const dosis = Number(beneficoDosisPorHa)
    const superficie = Number(beneficoSuperficieHa)

    if (!beneficoEspecie.trim() || !beneficoPresentacion.trim() || !dosis || dosis <= 0 || !superficie || superficie <= 0) {
      return
    }

    const total = Number((dosis * superficie).toFixed(2))
    const key = `${beneficoEspecie.toLowerCase()}-${beneficoPresentacion.toLowerCase()}`

    setItemsRequisicion((prev) => {
      const alreadyExists = prev.some((item) => item.tipo === 'BENEFICO' && item.product_id === key)
      if (alreadyExists) {
        setDuplicateToastVisible(true)
        return prev
      }

      const next: RequisicionItem = {
        id: `benefico-${Date.now()}`,
        tipo: 'BENEFICO',
        product_id: key,
        commercial_name: beneficoEspecie,
        quantity: total,
        unit: beneficoPresentacion,
        notes: beneficoNotas.trim() || undefined,
        benefico: {
          especie: beneficoEspecie,
          presentacion: beneficoPresentacion,
          dosis_por_ha: dosis,
          superficie_ha: superficie,
          total,
          fecha_programada: beneficoFechaProgramada || undefined,
          notas: beneficoNotas.trim() || undefined,
        },
      }

      return [...prev, next]
    })

    setBeneficoDosisPorHa('1')
    setBeneficoSuperficieHa('1')
    setBeneficoFechaProgramada('')
    setBeneficoNotas('')
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
      if (!searchIndex) {
        setRecommendations([])
        return
      }

      const results = getRecommendations(
        {
          crop: selectedCrop,
          targetType: targetTypeNorm,
          targetCommonNorm,
          market,
          category,
        },
        searchIndex,
      )
      if (import.meta.env.DEV) {
        console.log('recommendations length', results.length)
      }
      setRecommendations(results)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleSelectTarget = (target: Target) => {
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

    if (!operationContext.ranch) {
      setMissingRanchToastVisible(true)
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
      operationContext,
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
    const loadPlaguicidas = async () => {
      const [useCases, targets] = await Promise.all([loadUseCases(), loadTargets()])
      setSearchIndex(buildIndex(useCases, targets))
    }

    void loadPlaguicidas()
  }, [])

  useEffect(() => {
    if (!searchIndex) return

    const normalizedCrop = cultivo.toLowerCase()
    const normalizedType = tipoProblema.toLowerCase()
    const availableCategories = Array.from(
      new Set(
        searchIndex.targets
          .filter((target) =>
            target.crop
              .toLowerCase()
              .split(',')
              .map((value) => value.trim())
              .includes(normalizedCrop),
          )
          .filter((target) => target.target_type.toLowerCase() === normalizedType)
          .map((target) => target.category)
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
  }, [cultivo, searchIndex, tipoProblema])

  useEffect(() => {
    if (!targetQuery.trim()) {
      setAutocompleteOptions([])
      setLoadingTargets(false)
      return
    }

    const timer = window.setTimeout(() => {
      setLoadingTargets(true)
      if (!searchIndex) {
        setAutocompleteOptions([])
        setLoadingTargets(false)
        return
      }

      const options = searchTargets(
        { crop: cultivo, targetType: tipoProblema.toLowerCase(), q: targetQuery },
        searchIndex,
      )
      setAutocompleteOptions(options)
      setLoadingTargets(false)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [cultivo, searchIndex, targetQuery, tipoProblema])

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

  useEffect(() => {
    if (!missingRanchToastVisible) return
    const timer = window.setTimeout(() => setMissingRanchToastVisible(false), 2500)
    return () => window.clearTimeout(timer)
  }, [missingRanchToastVisible])

  useEffect(() => {
    const superficieDefault = operationContext.sector ? 5 : operationContext.ranch ? 10 : null
    if (superficieDefault && Number(beneficoSuperficieHa) <= 1) {
      setBeneficoSuperficieHa(String(superficieDefault))
    }
  }, [beneficoSuperficieHa, operationContext.ranch, operationContext.sector])

  const insumoOptions = useMemo(() => {
    const normalizedQuery = insumoQuery.trim().toLowerCase()
    if (!normalizedQuery) return [] as InventoryItem[]

    return inventoryItems
      .filter((item) => [item.sku, item.nombre, item.categoria].some((value) => value.toLowerCase().includes(normalizedQuery)))
      .slice(0, 8)
  }, [insumoQuery, inventoryItems])

  const itemsAgroquimicos = useMemo(
    () => itemsRequisicion.filter((item) => item.tipo === 'AGROQUIMICO'),
    [itemsRequisicion],
  )

  const itemsInsumosGenerales = useMemo(
    () => itemsRequisicion.filter((item) => item.tipo === 'INSUMO_GENERAL'),
    [itemsRequisicion],
  )

  const itemsBeneficos = useMemo(
    () => itemsRequisicion.filter((item) => item.tipo === 'BENEFICO'),
    [itemsRequisicion],
  )

  const totalBeneficos = useMemo(
    () => itemsBeneficos.reduce((acc, item) => acc + (item.benefico?.total ?? 0), 0),
    [itemsBeneficos],
  )

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
      {missingRanchToastVisible ? <Toast variant="error">Selecciona un rancho antes de crear la requisición.</Toast> : null}

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
                      <tr key={`${item.product_id}-${item.market}-${item.category}`} className="hover:bg-gray-50">
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

            <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-xs uppercase text-gray-400">Compras generales</p>
              <p className="text-sm text-gray-600">Agregar insumo general desde inventario (sin asistente fitosanitario).</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div className="relative md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Buscar insumo</label>
                  <Input
                    className="mt-1"
                    placeholder="SKU o nombre"
                    value={insumoQuery}
                    onChange={(event) => {
                      setInsumoQuery(event.target.value)
                      setInsumoSeleccionado(null)
                    }}
                  />
                  {insumoOptions.length > 0 && !insumoSeleccionado ? (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-lg">
                      {insumoOptions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => {
                            setInsumoSeleccionado(item)
                            setInsumoQuery(`${item.nombre} (${item.sku})`)
                            setInsumoUnidad(item.unidad)
                          }}
                        >
                          <span className="font-medium text-gray-900">{item.nombre}</span>
                          <span className="ml-2 text-xs text-gray-500">{item.sku} · {item.categoria}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cantidad</label>
                  <Input className="mt-1" type="number" min={1} value={insumoCantidad} onChange={(event) => setInsumoCantidad(event.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Unidad</label>
                  <Input className="mt-1" value={insumoUnidad} onChange={(event) => setInsumoUnidad(event.target.value)} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {insumoSeleccionado
                    ? `Stock actual: ${insumoSeleccionado.stock_actual} ${insumoSeleccionado.unidad} · Ubicación: ${insumoSeleccionado.ubicacion}`
                    : 'Selecciona un insumo para agregarlo a la requisición.'}
                </p>
                <Button type="button" variant="secondary" onClick={handleAgregarInsumoGeneral} disabled={!insumoSeleccionado}>
                  Agregar insumo general
                </Button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-gray-400">Control biológico</p>
                  <p className="text-sm text-gray-600">Agregar liberación de benéficos como ítem especial de requisición.</p>
                </div>
                <Button type="button" variant="secondary" onClick={handleAgregarBenefico}>
                  Agregar liberación de benéficos
                </Button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Especie</label>
                  <select
                    className={cn(selectStyles, 'mt-1')}
                    value={beneficoEspecie}
                    onChange={(event) => setBeneficoEspecie(event.target.value as (typeof especiesBeneficosMock)[number])}
                  >
                    {especiesBeneficosMock.map((especie) => (
                      <option key={especie} value={especie}>
                        {especie}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Presentación</label>
                  <select
                    className={cn(selectStyles, 'mt-1')}
                    value={beneficoPresentacion}
                    onChange={(event) => setBeneficoPresentacion(event.target.value as (typeof presentacionesBeneficosMock)[number])}
                  >
                    {presentacionesBeneficosMock.map((presentacion) => (
                      <option key={presentacion} value={presentacion}>
                        {presentacion}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Dosis por ha</label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    step="0.1"
                    value={beneficoDosisPorHa}
                    onChange={(event) => setBeneficoDosisPorHa(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Superficie (ha)</label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    step="0.1"
                    value={beneficoSuperficieHa}
                    onChange={(event) => setBeneficoSuperficieHa(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha programada (opcional)</label>
                  <Input
                    className="mt-1"
                    type="date"
                    value={beneficoFechaProgramada}
                    onChange={(event) => setBeneficoFechaProgramada(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total</label>
                  <Input
                    className="mt-1"
                    value={String((Number(beneficoDosisPorHa || 0) * Number(beneficoSuperficieHa || 0)).toFixed(2))}
                    readOnly
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium text-gray-700">Notas</label>
                  <Input
                    className="mt-1"
                    placeholder="Detalles de liberación"
                    value={beneficoNotas}
                    onChange={(event) => setBeneficoNotas(event.target.value)}
                  />
                </div>
              </div>
            </div>

            {itemsRequisicion.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Items agregados a requisición</p>
                  <span className="text-xs text-gray-500">{itemsRequisicion.length} agregado(s)</span>
                </div>
                <div className="mt-3 space-y-4">
                  {[
                    { title: 'Agroquímicos (del asistente fitosanitario)', items: itemsAgroquimicos },
                    { title: 'Insumos generales', items: itemsInsumosGenerales },
                    { title: 'Benéficos', items: itemsBeneficos },
                  ].map((group) =>
                    group.items.length > 0 ? (
                      <div key={group.title} className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group.title}</p>
                        {group.items.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-gray-900">{item.commercial_name}</p>
                                <p className="text-xs text-gray-500">{item.tipo}</p>
                                <p className="text-xs text-gray-500">{item.active_ingredient || '—'}</p>
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
                            {item.tipo === 'AGROQUIMICO' && item.metadata ? (
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
                            ) : item.tipo === 'BENEFICO' && item.benefico ? (
                              <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2 lg:grid-cols-3">
                                <p><strong>Especie:</strong> {item.benefico.especie}</p>
                                <p><strong>Presentación:</strong> {item.benefico.presentacion}</p>
                                <p><strong>Dosis/ha:</strong> {item.benefico.dosis_por_ha}</p>
                                <p><strong>Superficie:</strong> {item.benefico.superficie_ha} ha</p>
                                <p><strong>Total:</strong> {item.benefico.total} {item.benefico.presentacion}</p>
                                <p><strong>Fecha programada:</strong> {fallbackValue(item.benefico.fecha_programada, 'No definida')}</p>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-gray-600">Insumo general agregado desde inventario.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null,
                  )}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-gray-600">Total de benéficos</span>
              <span className="font-semibold text-gray-900">{totalBeneficos.toFixed(2)} unidades de liberación</span>
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
