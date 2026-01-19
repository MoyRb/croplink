import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import {
  getOffers,
  SELECTED_OFFER_STORAGE_KEY,
  type Offer,
  type SelectedOfferPayload,
} from '../../lib/marketplace/offers'
import { cn } from '../../lib/utils'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const sortOptions = [
  { value: 'price-asc', label: 'Precio total (menor a mayor)' },
  { value: 'price-desc', label: 'Precio total (mayor a menor)' },
  { value: 'rating', label: 'Rating' },
] as const

type SortOption = (typeof sortOptions)[number]['value']

export function MarketplaceCompararPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('query') ?? ''
  const qty = Number(searchParams.get('qty') ?? '0')
  const unit = searchParams.get('unit') ?? 'kg'

  const [offers, setOffers] = useState<Offer[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('price-asc')
  const [stockOnly, setStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    getOffers({ query, qty, unit }).then((data) => {
      if (!active) return
      setOffers(data)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [query, qty, unit])

  const filteredOffers = useMemo(() => {
    const list = stockOnly ? offers.filter((offer) => offer.enStock) : offers
    return [...list].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'price-desc') return b.precioTotal - a.precioTotal
      return a.precioTotal - b.precioTotal
    })
  }, [offers, sortBy, stockOnly])

  const chips = [
    { label: 'Producto', value: query || 'Sin definir' },
    { label: 'Cantidad', value: qty > 0 ? String(qty) : 'Sin definir' },
    { label: 'Unidad', value: unit || 'Sin definir' },
  ]

  const baseSocialUrl = import.meta.env.VITE_SOCIAL_WEB_URL || 'http://localhost:3000'
  const productSlug = slugify(query || 'producto')

  const handleSelect = (offer: Offer) => {
    if (typeof window === 'undefined') return

    const payload: SelectedOfferPayload = {
      producto: query,
      cantidad: qty,
      unidad: unit,
      offer,
    }

    window.localStorage.setItem(SELECTED_OFFER_STORAGE_KEY, JSON.stringify(payload))
    navigate('/requisiciones/crear', { state: { toast: 'offer-selected' } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Comparar precios</h1>
          <p className="text-sm text-gray-500">
            Evalúa propuestas y selecciona proveedores en la red de agroquímicas.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/requisiciones/crear')}>
          Volver a requisición
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="rounded-full border border-[#E5E7EB] bg-white px-4 py-1 text-xs font-medium text-gray-600"
          >
            {chip.label}: <span className="text-gray-900">{chip.value}</span>
          </span>
        ))}
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Ordenar</p>
            <select
              className="mt-2 w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-800"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(event) => setStockOnly(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#00C050]"
            />
            Solo en stock
          </label>
        </div>
      </Card>

      {loading ? (
        <Card>
          <p className="text-sm text-gray-500">Cargando ofertas...</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredOffers.map((offer) => (
            <Card key={offer.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Agroquímica</p>
                  <h2 className="text-lg font-semibold text-gray-900">{offer.agroquimicaNombre}</h2>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    offer.enStock
                      ? 'bg-[#DBFAE6] text-[#0B6B2A]'
                      : 'bg-red-50 text-red-600',
                  )}
                >
                  {offer.enStock ? 'En stock' : 'Sin stock'}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-400">Presentación</p>
                  <p className="text-sm font-medium text-gray-900">{offer.presentacion}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Rating</p>
                  <p className="text-sm font-medium text-gray-900">{offer.rating.toFixed(1)} / 5</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Precio unitario</p>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(offer.precioUnitario)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Precio total</p>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(offer.precioTotal)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Tiempo estimado</p>
                  <p className="text-sm font-medium text-gray-900">{offer.tiempoEstimado}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  className="inline-flex items-center justify-center rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  href={`${baseSocialUrl}/tienda/${offer.agroquimicaId}?producto=${productSlug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver tienda
                </a>
                <Button onClick={() => handleSelect(offer)}>Elegir oferta</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
