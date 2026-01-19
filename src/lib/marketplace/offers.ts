export type Offer = {
  id: string
  agroquimicaId: string
  agroquimicaNombre: string
  presentacion: string
  precioUnitario: number
  precioTotal: number
  enStock: boolean
  rating: number
  tiempoEstimado: string
  unidad: string
}

export type OffersParams = {
  query?: string
  qty?: number
  unit?: string
}

export type SelectedOfferPayload = {
  producto: string
  cantidad: number
  unidad: string
  offer: Offer
}

const mockOffers = [
  {
    id: 'offer-1',
    agroquimicaId: 'agq-112',
    agroquimicaNombre: 'AgroQuímicos del Norte',
    presentacion: 'Saco 25 kg',
    precioUnitario: 185,
    enStock: true,
    rating: 4.8,
    tiempoEstimado: '3-4 días',
    unidad: 'kg',
  },
  {
    id: 'offer-2',
    agroquimicaId: 'agq-205',
    agroquimicaNombre: 'Campo Verde Supply',
    presentacion: 'Bidón 20 L',
    precioUnitario: 210,
    enStock: true,
    rating: 4.5,
    tiempoEstimado: '2-3 días',
    unidad: 'L',
  },
  {
    id: 'offer-3',
    agroquimicaId: 'agq-317',
    agroquimicaNombre: 'AgroHub Premium',
    presentacion: 'Caja 12 pza',
    precioUnitario: 340,
    enStock: false,
    rating: 4.2,
    tiempoEstimado: '5-7 días',
    unidad: 'pza',
  },
  {
    id: 'offer-4',
    agroquimicaId: 'agq-408',
    agroquimicaNombre: 'Distribuidora La Huerta',
    presentacion: 'Saco 40 kg',
    precioUnitario: 172,
    enStock: true,
    rating: 4.1,
    tiempoEstimado: '4-5 días',
    unidad: 'kg',
  },
  {
    id: 'offer-5',
    agroquimicaId: 'agq-519',
    agroquimicaNombre: 'Agroinsumos Pro',
    presentacion: 'Bidón 10 L',
    precioUnitario: 225,
    enStock: true,
    rating: 4.9,
    tiempoEstimado: '1-2 días',
    unidad: 'L',
  },
  {
    id: 'offer-6',
    agroquimicaId: 'agq-623',
    agroquimicaNombre: 'TecnoAgro Market',
    presentacion: 'Paquete 6 pza',
    precioUnitario: 360,
    enStock: false,
    rating: 4.0,
    tiempoEstimado: '6-8 días',
    unidad: 'pza',
  },
]

export const SELECTED_OFFER_STORAGE_KEY = 'marketplace:selectedOffer'

export async function getOffers(params: OffersParams): Promise<Offer[]> {
  const qty = params.qty && params.qty > 0 ? params.qty : 1
  const unit = params.unit ?? 'kg'

  return new Promise((resolve) => {
    window.setTimeout(() => {
      // TODO: reemplazar por implementación real con fetch a la API de marketplace.
      resolve(
        mockOffers.map((offer) => ({
          ...offer,
          unidad: unit,
          precioTotal: offer.precioUnitario * qty,
        })),
      )
    }, 300)
  })
}
