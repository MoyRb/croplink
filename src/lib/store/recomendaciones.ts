import { supabase } from '../supabaseClient'

export type RecommendationMode = 'FOLIAR_DRENCH' | 'VIA_RIEGO'
export type RecommendationStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export type RecomendacionProducto = {
  producto: string
  ingredienteActivo: string
  dosis: string
  gasto: string
  gastoTotal: string
  sector: string
  dosePerHa?: number | null
  doseUnit?: string | null
  intervalo?: string | null
  reentrada?: string | null
}

export type RecomendacionViaRiegoFila = {
  sector: string
  valvula: string
  superficie: string
  productos: string[]
}

export type Recomendacion = {
  id: string
  modo: RecommendationMode
  estado: RecommendationStatus
  numero: string
  titulo: string
  huerta: string
  superficie: string
  solicita: string
  modoAplicacion: string
  justificacion: string
  clasificacion: string
  contenedor: string
  volumenAguaHa: string
  fechaRecomendacion: string
  semana: string
  equipoAplicacion: string
  empleadoRecibe: string
  operario: string
  fechaAplicacion: string
  phMezcla: string
  horaInicio: string
  horaTermino: string
  comentarios: string
  productos: RecomendacionProducto[]
  dosisPorHa: string[]
  riegoFilas: RecomendacionViaRiegoFila[]
  createdAt: string
}

type RecommendationRow = {
  id: string
  mode: 'foliar_drench' | 'via_riego'
  status: RecommendationStatus
  title: string | null
  solicita: string | null
  modo_aplicacion: string | null
  justificacion?: string | null
  fecha_recomendacion: string | null
  semana?: number | null
  equipo_aplicacion?: string | null
  operario?: string | null
  fecha_aplicacion?: string | null
  ph_mezcla?: number | null
  hora_inicio?: string | null
  hora_fin?: string | null
  comentarios?: string | null
  superficie?: number | null
  header_extra: Record<string, unknown> | null
  created_at: string
  ranches?: { name: string | null }[] | { name: string | null } | null
}

type ProductRow = {
  product_name: string
  active_ingredient: string | null
  dosis: Record<string, unknown> | null
  gasto: Record<string, unknown> | null
  gasto_total: Record<string, unknown> | null
  notes: string | null
  dose_per_ha: number | null
  dose_unit: string | null
}

type IrrigationRow = {
  surface: number | null
  products: unknown[] | null
  sectors?: { name: string | null }[] | { name: string | null } | null
  valves?: { name: string | null }[] | { name: string | null } | null
}

type ProfileOrgRow = { organization_id: string | null }

const dbModeToApp = (mode: RecommendationRow['mode']): RecommendationMode =>
  mode === 'via_riego' ? 'VIA_RIEGO' : 'FOLIAR_DRENCH'

const appModeToDb = (mode: RecommendationMode): RecommendationRow['mode'] =>
  mode === 'VIA_RIEGO' ? 'via_riego' : 'foliar_drench'

const toStr = (value: unknown) => (typeof value === 'string' ? value : '')
const toOptionalStr = (value: unknown) => {
  const str = toStr(value).trim()
  return str ? str : null
}

const getNestedName = (value: { name: string | null }[] | { name: string | null } | null | undefined) =>
  Array.isArray(value) ? value[0]?.name ?? '' : value?.name ?? ''

const pickHeaderValue = (headerExtra: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = headerExtra[key]
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    const str = toStr(value).trim()
    if (str) return str
  }
  return ''
}

const mapRecommendation = (row: RecommendationRow, products: ProductRow[], irrigationRows: IrrigationRow[]): Recomendacion => {
  const headerExtra = row.header_extra ?? {}
  const dosisPorHa = Array.isArray(headerExtra.dosisPorHa)
    ? headerExtra.dosisPorHa.map((item) => toStr(item))
    : Array.from({ length: 10 }, () => '')
  const numero = pickHeaderValue(headerExtra, ['numero', 'folio', 'recommendation_number']) || row.id.slice(0, 8).toUpperCase()

  return {
    id: row.id,
    modo: dbModeToApp(row.mode),
    estado: row.status,
    numero,
    titulo: row.title ?? '',
    huerta: toStr(headerExtra.huerta) || getNestedName(row.ranches) || '',
    superficie: toStr(headerExtra.superficie) || (row.superficie != null ? String(row.superficie) : ''),
    solicita: row.solicita ?? '',
    modoAplicacion: row.modo_aplicacion ?? '',
    justificacion: row.justificacion ?? '',
    clasificacion: pickHeaderValue(headerExtra, ['clasificacion', 'classification', 'tipo']),
    contenedor: pickHeaderValue(headerExtra, ['contenedor', 'container', 'tank']),
    volumenAguaHa: pickHeaderValue(headerExtra, ['volumenAguaHa', 'volumen_agua_ha', 'aguaPorHa', 'agua_por_ha', 'waterVolumePerHa']),
    fechaRecomendacion: row.fecha_recomendacion ?? '',
    semana: row.semana != null ? String(row.semana) : '',
    equipoAplicacion: row.equipo_aplicacion ?? '',
    empleadoRecibe: pickHeaderValue(headerExtra, ['empleadoRecibe', 'empleado_recibe', 'recibe', 'receivedBy']),
    operario: row.operario ?? '',
    fechaAplicacion: row.fecha_aplicacion ?? '',
    phMezcla: row.ph_mezcla != null ? String(row.ph_mezcla) : '',
    horaInicio: row.hora_inicio ?? '',
    horaTermino: row.hora_fin ?? '',
    comentarios: row.comentarios ?? '',
    productos: products.map((item) => ({
      producto: item.product_name,
      ingredienteActivo: item.active_ingredient ?? '',
      dosis: toStr(item.dosis?.value),
      gasto: toStr(item.gasto?.value),
      gastoTotal: toStr(item.gasto_total?.value),
      sector: item.notes ?? '',
      dosePerHa: item.dose_per_ha ?? null,
      doseUnit: item.dose_unit ?? null,
      intervalo: toOptionalStr(item.dosis?.intervalo ?? item.gasto?.intervalo ?? item.gasto_total?.intervalo),
      reentrada: toOptionalStr(item.dosis?.reentrada ?? item.gasto?.reentrada ?? item.gasto_total?.reentrada),
    })),
    dosisPorHa,
    riegoFilas: irrigationRows.map((item) => ({
      sector: getNestedName(item.sectors),
      valvula: getNestedName(item.valves),
      superficie: item.surface != null ? String(item.surface) : '',
      productos: Array.isArray(item.products) ? item.products.map((product) => toStr(product)).slice(0, 10) : Array.from({ length: 10 }, () => ''),
    })),
    createdAt: row.created_at,
  }
}

const getProfileOrg = async () => {
  const { data, error } = await supabase.from('profiles').select('organization_id').single<ProfileOrgRow>()
  if (error || !data?.organization_id) {
    throw new Error(error?.message || 'No hay organización asociada al usuario.')
  }
  return data.organization_id
}

const upsertCalendarEvent = async (recommendationId: string, organizationId: string, title: string, startAt: string | null) => {
  const { data: existing, error: existingError } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('ref_id', recommendationId)
    .eq('event_type', 'recommendation')
    .maybeSingle<{ id: string }>()

  if (existingError) throw new Error(existingError.message)

  const payload = {
    organization_id: organizationId,
    event_type: 'recommendation',
    ref_id: recommendationId,
    title: title || 'Recomendación',
    start_at: startAt,
    end_at: startAt,
    meta: {},
  }

  if (existing?.id) {
    const { error } = await supabase.from('calendar_events').update(payload).eq('id', existing.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('calendar_events').insert(payload)
  if (error) throw new Error(error.message)
}

export const getRecomendaciones = async () => {
  const organizationId = await getProfileOrg()
  const { data, error } = await supabase
    .from('recommendations')
    .select('id, mode, status, title, fecha_recomendacion, solicita, modo_aplicacion, created_at, header_extra, ranches(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data as RecommendationRow[] | null) ?? []).map((row) =>
    mapRecommendation(row, [], []),
  )
}

export const getRecomendacionById = async (id: string) => {
  const organizationId = await getProfileOrg()
  const { data: rec, error: recError } = await supabase
    .from('recommendations')
    .select('id, mode, status, title, solicita, modo_aplicacion, justificacion, fecha_recomendacion, semana, equipo_aplicacion, operario, fecha_aplicacion, ph_mezcla, hora_inicio, hora_fin, comentarios, superficie, header_extra, created_at, ranches(name)')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle<RecommendationRow>()

  if (recError) throw new Error(recError.message)
  if (!rec) return null

  const [{ data: products, error: productsError }, { data: irrigationRows, error: irrigationError }] = await Promise.all([
    supabase
      .from('recommendation_products')
      .select('product_name, active_ingredient, dosis, gasto, gasto_total, notes, dose_per_ha, dose_unit')
      .eq('recommendation_id', id)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('recommendation_irrigation_rows')
      .select('surface, products, sectors(name), valves(name)')
      .eq('recommendation_id', id)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true }),
  ])

  if (productsError) throw new Error(productsError.message)
  if (irrigationError) throw new Error(irrigationError.message)

  return mapRecommendation(rec, (products as ProductRow[] | null) ?? [], (irrigationRows as IrrigationRow[] | null) ?? [])
}

export const createRecomendacion = async (payload: Omit<Recomendacion, 'id' | 'createdAt'>) => {
  const organizationId = await getProfileOrg()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    throw new Error(authError?.message || 'No se encontró el usuario autenticado.')
  }

  const safeWeek = Number.parseInt(payload.semana, 10)
  const safeSurface = Number.parseFloat(payload.superficie)
  const safePh = Number.parseFloat(payload.phMezcla)

  const { data: recommendation, error: recommendationError } = await supabase
    .from('recommendations')
    .insert({
      organization_id: organizationId,
      mode: appModeToDb(payload.modo),
      status: payload.estado,
      title: payload.titulo || null,
      solicita: payload.solicita || null,
      modo_aplicacion: payload.modoAplicacion || null,
      justificacion: payload.justificacion || null,
      fecha_recomendacion: payload.fechaRecomendacion || null,
      semana: Number.isFinite(safeWeek) ? safeWeek : null,
      equipo_aplicacion: payload.equipoAplicacion || null,
      operario: payload.operario || null,
      fecha_aplicacion: payload.fechaAplicacion || null,
      ph_mezcla: Number.isFinite(safePh) ? safePh : null,
      hora_inicio: payload.horaInicio || null,
      hora_fin: payload.horaTermino || null,
      comentarios: payload.comentarios || null,
      superficie: Number.isFinite(safeSurface) ? safeSurface : null,
      requested_by: authData.user.id,
      header_extra: {
        numero: payload.numero,
        huerta: payload.huerta,
        superficie: payload.superficie,
        clasificacion: payload.clasificacion,
        contenedor: payload.contenedor,
        volumenAguaHa: payload.volumenAguaHa,
        empleadoRecibe: payload.empleadoRecibe,
        dosisPorHa: payload.dosisPorHa,
      },
    })
    .select('id, mode, status, title, solicita, modo_aplicacion, justificacion, fecha_recomendacion, semana, equipo_aplicacion, operario, fecha_aplicacion, ph_mezcla, hora_inicio, hora_fin, comentarios, superficie, header_extra, created_at, ranches(name)')
    .single<RecommendationRow>()

  if (recommendationError || !recommendation) {
    throw new Error(recommendationError?.message || 'No se pudo crear la recomendación.')
  }

  const validProducts = payload.productos.filter((item) => item.producto.trim())
  if (validProducts.length > 0) {
    const { error } = await supabase.from('recommendation_products').insert(
      validProducts.map((item, index) => ({
        organization_id: organizationId,
        recommendation_id: recommendation.id,
        product_name: item.producto,
        active_ingredient: item.ingredienteActivo || null,
        dosis: { value: item.dosis },
        gasto: { value: item.gasto },
        gasto_total: { value: item.gastoTotal },
        notes: item.sector || null,
        sort_order: index,
      })),
    )
    if (error) throw new Error(error.message)
  }

  if (payload.modo === 'VIA_RIEGO') {
    const validRows = payload.riegoFilas.filter((row) => row.sector.trim() || row.valvula.trim() || row.superficie.trim())
    if (validRows.length > 0) {
      const { error } = await supabase.from('recommendation_irrigation_rows').insert(
        validRows.map((item, index) => ({
          organization_id: organizationId,
          recommendation_id: recommendation.id,
          surface: Number.isFinite(Number.parseFloat(item.superficie)) ? Number.parseFloat(item.superficie) : null,
          products: item.productos,
          sort_order: index,
        })),
      )
      if (error) throw new Error(error.message)
    }
  }

  await upsertCalendarEvent(recommendation.id, organizationId, payload.titulo, payload.fechaRecomendacion || null)

  return mapRecommendation(recommendation, [], [])
}

export const updateRecomendacionSeguimiento = async (
  id: string,
  payload: Pick<Recomendacion, 'estado' | 'comentarios' | 'fechaAplicacion' | 'operario'>,
) => {
  const organizationId = await getProfileOrg()
  const { error } = await supabase
    .from('recommendations')
    .update({
      status: payload.estado,
      comentarios: payload.comentarios || null,
      fecha_aplicacion: payload.fechaAplicacion || null,
      operario: payload.operario || null,
    })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  const recomendacion = await getRecomendacionById(id)
  if (!recomendacion) {
    throw new Error('No encontramos la recomendación actualizada.')
  }

  await upsertCalendarEvent(id, organizationId, recomendacion.titulo, recomendacion.fechaRecomendacion || null)

  return recomendacion
}

export const getRecommendationCalendar = async () => {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, ref_id, title, start_at, end_at, meta')
    .eq('event_type', 'recommendation')
    .order('start_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// --- Ejecución: dosis por ha y sectores ---

export type ProductoConDosis = {
  id: string
  productName: string
  activeIngredient: string | null
  dosePerHa: number | null
  doseUnit: string | null
  sortOrder: number
}

export type SectorConArea = {
  id: string
  name: string
  areaHa: number | null
}

type ProductConDosisRow = {
  id: string
  product_name: string
  active_ingredient: string | null
  dose_per_ha: number | null
  dose_unit: string | null
  sort_order: number
}

type SectorRow = {
  id: string
  name: string
  surface_ha: number | null
}

export const getProductosConDosis = async (recommendationId: string): Promise<ProductoConDosis[]> => {
  const organizationId = await getProfileOrg()
  const { data, error } = await supabase
    .from('recommendation_products')
    .select('id, product_name, active_ingredient, dose_per_ha, dose_unit, sort_order')
    .eq('recommendation_id', recommendationId)
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as ProductConDosisRow[]).map((item) => ({
    id: item.id,
    productName: item.product_name,
    activeIngredient: item.active_ingredient,
    dosePerHa: item.dose_per_ha,
    doseUnit: item.dose_unit,
    sortOrder: item.sort_order,
  }))
}

export const updateProductDosisSupabase = async (productId: string, dosePerHa: number | null, doseUnit: string | null) => {
  const organizationId = await getProfileOrg()
  const { error } = await supabase
    .from('recommendation_products')
    .update({ dose_per_ha: dosePerHa, dose_unit: doseUnit })
    .eq('id', productId)
    .eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
}

export const getSectoresParaEjecucion = async (): Promise<SectorConArea[]> => {
  const organizationId = await getProfileOrg()
  const { data, error } = await supabase
    .from('sectors')
    .select('id, name, surface_ha')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as SectorRow[]).map((item) => ({
    id: item.id,
    name: item.name,
    areaHa: item.surface_ha,
  }))
}
