import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '../supabaseClient'

export type RequisicionEstado =
  | 'Pendiente'
  | 'En revisión'
  | 'En comparativa'
  | 'Aprobada'
  | 'Rechazada'
  | 'Completada'

export type RequisicionAdjunto = {
  nombre: string
  tamano: string
  url?: string
}

export type RequisicionItemMetadata = {
  crop: string
  target_type: 'Plaga' | 'Enfermedad'
  target_common: string
  target_common_norm: string
  market: 'MX' | 'USA' | 'Todos'
  resistance_class?: string
  chemical_group?: string
  safety_interval?: string
  reentry_period?: string
  interval_between_applications?: string
  max_applications?: string
  registration?: string
  observations?: string
  sheet?: string
}

export type RequisicionItemType = 'AGROQUIMICO' | 'INSUMO_GENERAL' | 'BENEFICO'

export type RequisicionBeneficoMetadata = {
  especie: string
  presentacion: string
  dosis_por_ha: number
  superficie_ha: number
  total: number
  fecha_programada?: string
  notas?: string
}

export type RequisicionItem = {
  id: string
  tipo: RequisicionItemType
  product_id: string
  commercial_name: string
  active_ingredient?: string
  quantity: number
  unit: string
  notes?: string
  metadata?: RequisicionItemMetadata
  benefico?: RequisicionBeneficoMetadata
}

export type RequisicionOperationContext = {
  operation?: { id: string; name: string } | null
  producer?: { id: string; name: string } | null
  ranch: { id: string; name: string } | null
  crop?: string
  season?: string
  cropSeason?: { id: string; name: string } | null
  sector?: { id: string; name: string } | null
  tunnel?: { id: string; name: string } | null
  valve?: { id: string; name: string } | null
}

export type Requisicion = {
  id: string
  producto: string
  cantidad: number
  unidad: 'kg' | 'L' | 'pza'
  centroCosto: 'Operaciones' | 'Compras' | 'Mantenimiento' | 'Campo'
  prioridad: 'Baja' | 'Media' | 'Alta'
  notas?: string
  estado: RequisicionEstado
  total: number
  fecha: string
  adjunto?: RequisicionAdjunto
  items?: RequisicionItem[]
  operationContext?: RequisicionOperationContext
}

export type NuevaRequisicion = Omit<Requisicion, 'id' | 'estado' | 'fecha' | 'total'> & {
  total?: number
  fecha?: string
  estado?: RequisicionEstado
}

type RequisitionStatusDb = 'pending' | 'in_review' | 'in_comparative' | 'approved' | 'rejected' | 'completed'
type RequisitionItemTypeDb = 'agroquimico' | 'insumo_general' | 'benefico'

type RequisitionDb = {
  id: string
  folio: string | null
  status: RequisitionStatusDb
  cost_center: string | null
  priority: string | null
  requested_date: string | null
  notes: string | null
  operation_id: string | null
  ranch_id: string | null
  ranch_crop_season_id: string | null
  sector_id: string | null
  tunnel_id: string | null
  valve_id: string | null
  operations: { id: string; name: string } | { id: string; name: string }[] | null
  ranches: { id: string; name: string } | { id: string; name: string }[] | null
  ranch_crop_seasons: {
    id: string
    crops: { name: string } | { name: string }[] | null
    seasons: { label: string } | { label: string }[] | null
  } | null
  sectors: { id: string; name: string } | { id: string; name: string }[] | null
  tunnels: { id: string; name: string } | { id: string; name: string }[] | null
  valves: { id: string; name: string } | { id: string; name: string }[] | null
  requisition_items: RequisitionItemDb[] | null
}

type RequisitionItemDb = {
  id: string
  item_type: RequisitionItemTypeDb
  product_id: string | null
  commercial_name: string | null
  active_ingredient: string | null
  quantity: number
  unit: string
  notes: string | null
  metadata: Record<string, unknown>
}

type RequisitionItemInsert = {
  organization_id: string
  requisition_id: string
  item_type: RequisitionItemTypeDb
  product_id: string | null
  commercial_name: string
  active_ingredient: string | null
  quantity: number
  unit: string
  notes: string | null
  metadata: Record<string, unknown>
}

type ProfileOrgRow = {
  organization_id: string | null
}

const statusFromDb: Record<RequisitionStatusDb, RequisicionEstado> = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  in_comparative: 'En comparativa',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  completed: 'Completada',
}

const statusToDb: Record<RequisicionEstado, RequisitionStatusDb> = {
  Pendiente: 'pending',
  'En revisión': 'in_review',
  'En comparativa': 'in_comparative',
  Aprobada: 'approved',
  Rechazada: 'rejected',
  Completada: 'completed',
}

const itemTypeToDb: Record<RequisicionItemType, RequisitionItemTypeDb> = {
  AGROQUIMICO: 'agroquimico',
  INSUMO_GENERAL: 'insumo_general',
  BENEFICO: 'benefico',
}

const fromMaybeArray = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const sanitizeProductId = (value?: string | null) => {
  if (!value) return null
  return uuidPattern.test(value) ? value : null
}

const getCurrentUserAndOrganization = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    throw new Error(authError?.message || 'No hay un usuario autenticado.')
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', authData.user.id)
    .single<ProfileOrgRow>()

  if (profileError || !profileData?.organization_id) {
    throw new Error(profileError?.message || 'No hay organización asociada al usuario.')
  }

  return {
    userId: authData.user.id,
    organizationId: profileData.organization_id,
  }
}

const resolveCropSeason = (value: RequisitionDb['ranch_crop_seasons']) => {
  if (!value) return null
  const crop = fromMaybeArray(value.crops)?.name
  const season = fromMaybeArray(value.seasons)?.label
  return {
    id: value.id,
    name: [crop, season].filter(Boolean).join(' · ') || 'Cultivo · Temporada',
    crop,
    season,
  }
}

const mapRequisitionItem = (item: RequisitionItemDb): RequisicionItem => {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>
  const tipo = item.item_type === 'agroquimico' ? 'AGROQUIMICO' : item.item_type === 'insumo_general' ? 'INSUMO_GENERAL' : 'BENEFICO'
  return {
    id: item.id,
    tipo,
    product_id: item.product_id ?? item.id,
    commercial_name: item.commercial_name ?? 'Sin nombre',
    active_ingredient: item.active_ingredient ?? undefined,
    quantity: Number(item.quantity ?? 0),
    unit: item.unit,
    notes: item.notes ?? undefined,
    metadata: tipo === 'AGROQUIMICO' ? (metadata as RequisicionItemMetadata) : undefined,
    benefico: tipo === 'BENEFICO' ? ((metadata.benefico as RequisicionBeneficoMetadata | undefined) ?? undefined) : undefined,
  }
}

const mapRequisition = (row: RequisitionDb): Requisicion => {
  const firstItem = row.requisition_items?.[0]
  const cropSeason = resolveCropSeason(row.ranch_crop_seasons)
  return {
    id: row.folio || row.id,
    producto: firstItem?.commercial_name ?? 'Sin productos',
    cantidad: Number(firstItem?.quantity ?? 0),
    unidad: (firstItem?.unit as Requisicion['unidad']) ?? 'pza',
    centroCosto: (row.cost_center as Requisicion['centroCosto']) ?? 'Operaciones',
    prioridad: (row.priority as Requisicion['prioridad']) ?? 'Media',
    notas: row.notes ?? undefined,
    estado: statusFromDb[row.status],
    total: 0,
    fecha: row.requested_date ?? new Date().toISOString().slice(0, 10),
    items: (row.requisition_items ?? []).map(mapRequisitionItem),
    operationContext: {
      operation: fromMaybeArray(row.operations),
      ranch: fromMaybeArray(row.ranches),
      crop: cropSeason?.crop,
      season: cropSeason?.season,
      cropSeason: cropSeason ? { id: cropSeason.id, name: cropSeason.name } : null,
      sector: fromMaybeArray(row.sectors),
      tunnel: fromMaybeArray(row.tunnels),
      valve: fromMaybeArray(row.valves),
    },
  }
}

export function useRequisicionesStore() {
  const [requisiciones, setRequisiciones] = useState<Requisicion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadRequisiciones = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('requisitions')
      .select(
        `
        id,
        folio,
        status,
        cost_center,
        priority,
        requested_date,
        notes,
        operation_id,
        ranch_id,
        ranch_crop_season_id,
        sector_id,
        tunnel_id,
        valve_id,
        operations:operation_id (id, name),
        ranches:ranch_id (id, name),
        ranch_crop_seasons:ranch_crop_season_id (
          id,
          crops:crop_id (name),
          seasons:season_id (label)
        ),
        sectors:sector_id (id, name),
        tunnels:tunnel_id (id, name),
        valves:valve_id (id, name),
        requisition_items (
          id,
          item_type,
          product_id,
          commercial_name,
          active_ingredient,
          quantity,
          unit,
          notes,
          metadata
        )
      `,
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error obteniendo requisiciones:', error)
      setLoadError(error.message)
      setRequisiciones([])
      setIsLoading(false)
      return
    }

    setRequisiciones((((data as unknown) as RequisitionDb[] | null) ?? []).map(mapRequisition))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequisiciones()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadRequisiciones])

  const stats = useMemo(() => {
    const pendientes = requisiciones.filter((requisicion) => requisicion.estado === 'Pendiente').length
    const enRevision = requisiciones.filter((requisicion) => requisicion.estado === 'En revisión').length
    const comparativa = requisiciones.filter((requisicion) => requisicion.estado === 'En comparativa').length
    return { pendientes, enRevision, comparativa }
  }, [requisiciones])

  const addRequisicion = useCallback(async (data: NuevaRequisicion) => {
    const { organizationId, userId } = await getCurrentUserAndOrganization()

    const payload = {
      organization_id: organizationId,
      status: statusToDb[data.estado ?? 'Pendiente'],
      cost_center: data.centroCosto,
      priority: data.prioridad,
      requested_date: data.fecha ?? new Date().toISOString().slice(0, 10),
      notes: data.notas ?? null,
      operation_id: data.operationContext?.operation?.id ?? null,
      ranch_id: data.operationContext?.ranch?.id ?? null,
      ranch_crop_season_id: data.operationContext?.cropSeason?.id ?? null,
      sector_id: data.operationContext?.sector?.id ?? null,
      tunnel_id: data.operationContext?.tunnel?.id ?? null,
      valve_id: data.operationContext?.valve?.id ?? null,
      requested_by: userId,
    }

    const { data: created, error: createError } = await supabase
      .from('requisitions')
      .insert(payload)
      .select('id')
      .single<{ id: string }>()

    if (createError || !created) {
      throw new Error(createError?.message || 'No se pudo crear la requisición.')
    }

    const itemsPayload: RequisitionItemInsert[] = (data.items ?? []).map((item) => ({
      organization_id: organizationId,
      requisition_id: created.id,
      item_type: itemTypeToDb[item.tipo],
      product_id: item.product_id || null,
      commercial_name: item.commercial_name || data.producto,
      active_ingredient: item.active_ingredient ?? null,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes ?? null,
      metadata: {
        ...(item.metadata ?? {}),
        benefico: item.benefico,
      },
    }))

    if (itemsPayload.length === 0) {
      itemsPayload.push({
        organization_id: organizationId,
        requisition_id: created.id,
        item_type: 'insumo_general',
        product_id: null,
        commercial_name: data.producto,
        active_ingredient: null,
        quantity: data.cantidad,
        unit: data.unidad,
        notes: data.notas ?? null,
        metadata: {},
      })
    }

    itemsPayload.forEach((item) => {
      const originalProductId = item.product_id
      item.product_id = sanitizeProductId(item.product_id)

      if (originalProductId && !item.product_id) {
        item.metadata = {
          ...item.metadata,
          source_product_id: originalProductId,
        }
      }
    })

    const { error: itemsError } = await supabase.from('requisition_items').insert(itemsPayload)
    if (itemsError) {
      throw new Error(itemsError.message)
    }

    await loadRequisiciones()
  }, [loadRequisiciones])

  return {
    requisiciones,
    stats,
    isLoading,
    loadError,
    addRequisicion,
    refreshRequisiciones: loadRequisiciones,
  }
}
