import { supabase } from '../supabaseClient'
import type { Requisicion, RequisicionOperationContext } from './requisiciones'

export type ApplicationMode = 'FOLIAR_DRENCH' | 'RIEGO'
export type ApplicationExecutionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'

export type ApplicationContext = {
  operacion: string
  rancho: string
  cultivo: string
  temporada: string
  sector: string
  tunel: string
  valvula: string
}

export type ApplicationHeaderFields = {
  superficieTotal: number
  solicita: string
  justificacion: string
  comentarios: string
  fechaRecomendacion: string
  semana: string
  operario: string
  fechaAplicacion: string
  horaInicio: string
  horaTermino: string
  modoAplicacion: string
  equipoAplicacion: string
  phMezcla: string
  volumenTanqueLts: number
  volumenTanqueLibre: string
}

export type ApplicationExecution = {
  id: string
  requisicionId: string
  mode: ApplicationMode
  status: ApplicationExecutionStatus
  context: ApplicationContext
  headerFields: ApplicationHeaderFields
  inventory?: {
    lines: {
      lineId: string
      itemId: string
      sku: string
      nombre: string
      unit: string
      qtyPlanificada: number
      qtySalida: number
      qtyUsada: number
      qtyMerma: number
    }[]
    outMovementIds: string[]
    returnMovementIds: string[]
    wasteMovementIds: string[]
    outPostedAt?: string
    closedPostedAt?: string
  }
  createdAt: string
}

export type ApplicationLine = {
  id: string
  executionId: string
  requisicionItemId: string
  productName: string
  unit: string
  dosisPorTanque: number
  gastoLtHa: number
  dosisPorHa: number
}

export type IrrigationRow = {
  id: string
  executionId: string
  sectorId: string
  valveId: string
  superficie: number
}

type ProfileOrgRow = {
  organization_id: string | null
}

type ApplicationExecutionDbRow = {
  id: string
  requisition_id: string | null
  mode: 'foliar_drench' | 'via_riego'
  status: 'draft' | 'posted_out' | 'closed'
  header: Record<string, unknown> | null
  created_at: string
}

type ApplicationLineDbRow = {
  id: string
  execution_id: string
  requisition_item_id: string | null
  product_name: string
  unit: string | null
  dosis_por_tanque: number | null
  gasto_lt_ha: number | null
  dosis_por_ha: number | null
}

type IrrigationRowDbRow = {
  id: string
  execution_id: string
  sector_id: string | null
  valve_id: string | null
  surface: number | null
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const createUuid = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

const sanitizeUuid = (value?: string | null) => {
  if (!value) return null
  return uuidPattern.test(value) ? value : null
}

const modeToDb = (mode: ApplicationMode) => (mode === 'RIEGO' ? 'via_riego' : 'foliar_drench')
const modeFromDb = (mode: ApplicationExecutionDbRow['mode']): ApplicationMode =>
  mode === 'via_riego' ? 'RIEGO' : 'FOLIAR_DRENCH'

const statusToDb = (status: ApplicationExecutionStatus) => {
  if (status === 'IN_PROGRESS') return 'posted_out'
  if (status === 'COMPLETED') return 'closed'
  return 'draft'
}

const statusFromDb = (status: ApplicationExecutionDbRow['status']): ApplicationExecutionStatus => {
  if (status === 'posted_out') return 'IN_PROGRESS'
  if (status === 'closed') return 'COMPLETED'
  return 'DRAFT'
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

const resolveRequisitionDbId = async (organizationId: string, requisicionId: string) => {
  const requisicionUuid = sanitizeUuid(requisicionId)
  const query = supabase.from('requisitions').select('id, folio').eq('organization_id', organizationId)
  const { data, error } = requisicionUuid
    ? await query.eq('id', requisicionUuid).maybeSingle<{ id: string; folio: string | null }>()
    : await query.eq('folio', requisicionId).maybeSingle<{ id: string; folio: string | null }>()

  if (error) throw new Error(error.message)
  return data?.id ?? null
}

const toContext = (operationContext?: RequisicionOperationContext): ApplicationContext => ({
  operacion: operationContext?.operation?.name ?? '',
  rancho: operationContext?.ranch?.name ?? '',
  cultivo: operationContext?.crop ?? '',
  temporada: operationContext?.season ?? '',
  sector: operationContext?.sector?.name ?? '',
  tunel: operationContext?.tunnel?.name ?? '',
  valvula: operationContext?.valve?.name ?? '',
})

const getExecutionDefaults = (requisicion: Requisicion): Omit<ApplicationExecution, 'id' | 'createdAt'> => ({
  requisicionId: requisicion.id,
  mode: 'FOLIAR_DRENCH',
  status: 'DRAFT',
  context: toContext(requisicion.operationContext),
  headerFields: {
    superficieTotal: 0,
    solicita: '',
    justificacion: requisicion.notas ?? '',
    comentarios: '',
    fechaRecomendacion: new Date().toISOString().slice(0, 10),
    semana: '',
    operario: '',
    fechaAplicacion: '',
    horaInicio: '',
    horaTermino: '',
    modoAplicacion: 'Manual',
    equipoAplicacion: '',
    phMezcla: '',
    volumenTanqueLts: 200,
    volumenTanqueLibre: '',
  },
})

export const buildInitialExecution = (requisicion: Requisicion): ApplicationExecution => ({
  id: createUuid(),
  createdAt: new Date().toISOString(),
  ...getExecutionDefaults(requisicion),
})

export const buildInitialLines = (executionId: string, requisicion: Requisicion): ApplicationLine[] => {
  if (requisicion.items && requisicion.items.length > 0) {
    return requisicion.items.map((item) => ({
      id: createUuid(),
      executionId,
      requisicionItemId: item.id,
      productName: item.commercial_name,
      unit: item.unit,
      dosisPorTanque: 0,
      gastoLtHa: 0,
      dosisPorHa: 0,
    }))
  }

  return [
    {
      id: createUuid(),
      executionId,
      requisicionItemId: requisicion.id,
      productName: requisicion.producto,
      unit: requisicion.unidad,
      dosisPorTanque: 0,
      gastoLtHa: 0,
      dosisPorHa: 0,
    },
  ]
}

const mapExecution = (row: ApplicationExecutionDbRow): ApplicationExecution => {
  const header = (row.header ?? {}) as {
    context?: ApplicationContext
    headerFields?: ApplicationHeaderFields
    inventory?: ApplicationExecution['inventory']
    requisicionId?: string
  }

  return {
    id: row.id,
    requisicionId: header.requisicionId ?? row.requisition_id ?? '',
    mode: modeFromDb(row.mode),
    status: statusFromDb(row.status),
    context: header.context ?? {
      operacion: '',
      rancho: '',
      cultivo: '',
      temporada: '',
      sector: '',
      tunel: '',
      valvula: '',
    },
    headerFields: header.headerFields ?? {
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
      modoAplicacion: 'Manual',
      equipoAplicacion: '',
      phMezcla: '',
      volumenTanqueLts: 200,
      volumenTanqueLibre: '',
    },
    inventory: header.inventory,
    createdAt: row.created_at,
  }
}

const mapLine = (row: ApplicationLineDbRow): ApplicationLine => ({
  id: row.id,
  executionId: row.execution_id,
  requisicionItemId: row.requisition_item_id ?? '',
  productName: row.product_name,
  unit: row.unit ?? 'pza',
  dosisPorTanque: Number(row.dosis_por_tanque ?? 0),
  gastoLtHa: Number(row.gasto_lt_ha ?? 0),
  dosisPorHa: Number(row.dosis_por_ha ?? 0),
})

const mapIrrigationRow = (row: IrrigationRowDbRow): IrrigationRow => ({
  id: row.id,
  executionId: row.execution_id,
  sectorId: row.sector_id ?? '',
  valveId: row.valve_id ?? '',
  superficie: Number(row.surface ?? 0),
})

export const listExecutions = async (requisicionId?: string) => {
  const { organizationId } = await getCurrentUserAndOrganization()
  let requisitionDbId: string | null = null
  if (requisicionId) {
    requisitionDbId = await resolveRequisitionDbId(organizationId, requisicionId)
    if (!requisitionDbId) return []
  }

  let query = supabase
    .from('application_executions')
    .select('id, requisition_id, mode, status, header, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (requisitionDbId) query = query.eq('requisition_id', requisitionDbId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapExecution(row as ApplicationExecutionDbRow))
}

export const getExecutionById = async (executionId: string) => {
  const { organizationId } = await getCurrentUserAndOrganization()
  const { data, error } = await supabase
    .from('application_executions')
    .select('id, requisition_id, mode, status, header, created_at')
    .eq('organization_id', organizationId)
    .eq('id', executionId)
    .maybeSingle<ApplicationExecutionDbRow>()

  if (error) throw new Error(error.message)
  return data ? mapExecution(data) : null
}

export const getLatestExecutionByRequisicionId = async (requisicionId: string) => {
  const executions = await listExecutions(requisicionId)
  return executions[0] ?? null
}

const persistExecutionDetails = async (
  organizationId: string,
  executionId: string,
  lines: ApplicationLine[],
  irrigationRows: IrrigationRow[],
) => {
  const { error: deleteLinesError } = await supabase
    .from('application_lines')
    .delete()
    .eq('organization_id', organizationId)
    .eq('execution_id', executionId)

  if (deleteLinesError) throw new Error(deleteLinesError.message)

  const { error: deleteRowsError } = await supabase
    .from('application_irrigation_rows')
    .delete()
    .eq('organization_id', organizationId)
    .eq('execution_id', executionId)

  if (deleteRowsError) throw new Error(deleteRowsError.message)

  if (lines.length > 0) {
    const linePayload = lines.map((line) => ({
      id: sanitizeUuid(line.id) ?? createUuid(),
      organization_id: organizationId,
      execution_id: executionId,
      requisition_item_id: sanitizeUuid(line.requisicionItemId),
      product_name: line.productName,
      unit: line.unit,
      dosis_por_tanque: line.dosisPorTanque,
      gasto_lt_ha: line.gastoLtHa,
      dosis_por_ha: line.dosisPorHa,
    }))

    const { error: linesError } = await supabase.from('application_lines').insert(linePayload)
    if (linesError) throw new Error(linesError.message)
  }

  if (irrigationRows.length > 0) {
    const rowPayload = irrigationRows.map((row, index) => ({
      id: sanitizeUuid(row.id) ?? createUuid(),
      organization_id: organizationId,
      execution_id: executionId,
      sector_id: sanitizeUuid(row.sectorId),
      valve_id: sanitizeUuid(row.valveId),
      surface: row.superficie,
      sort_order: index,
    }))

    const { error: rowsError } = await supabase.from('application_irrigation_rows').insert(rowPayload)
    if (rowsError) throw new Error(rowsError.message)
  }
}

export const createExecution = async (
  execution: ApplicationExecution,
  lines: ApplicationLine[],
  irrigationRows: IrrigationRow[],
) => {
  const { organizationId } = await getCurrentUserAndOrganization()
  const requisitionDbId = await resolveRequisitionDbId(organizationId, execution.requisicionId)

  const executionId = sanitizeUuid(execution.id) ?? createUuid()
  const header = {
    requisicionId: execution.requisicionId,
    context: execution.context,
    headerFields: execution.headerFields,
    inventory: execution.inventory,
  }

  const { error } = await supabase.from('application_executions').insert({
    id: executionId,
    organization_id: organizationId,
    requisition_id: requisitionDbId,
    mode: modeToDb(execution.mode),
    status: statusToDb(execution.status),
    header,
  })

  if (error) throw new Error(error.message)
  await persistExecutionDetails(organizationId, executionId, lines, irrigationRows)

  return executionId
}

export const updateExecution = async (
  execution: ApplicationExecution,
  lines: ApplicationLine[],
  irrigationRows: IrrigationRow[],
) => {
  const { organizationId } = await getCurrentUserAndOrganization()
  const requisitionDbId = await resolveRequisitionDbId(organizationId, execution.requisicionId)

  const header = {
    requisicionId: execution.requisicionId,
    context: execution.context,
    headerFields: execution.headerFields,
    inventory: execution.inventory,
  }

  const { error } = await supabase
    .from('application_executions')
    .update({
      requisition_id: requisitionDbId,
      mode: modeToDb(execution.mode),
      status: statusToDb(execution.status),
      header,
    })
    .eq('organization_id', organizationId)
    .eq('id', execution.id)

  if (error) throw new Error(error.message)
  await persistExecutionDetails(organizationId, execution.id, lines, irrigationRows)
}

export const saveExecutionBundle = async (
  execution: ApplicationExecution,
  lines: ApplicationLine[],
  irrigationRows: IrrigationRow[],
) => {
  const existing = await getExecutionById(execution.id)
  if (existing) {
    await updateExecution(execution, lines, irrigationRows)
    return execution.id
  }

  return createExecution(execution, lines, irrigationRows)
}

export const getExecutionBundle = async (executionId: string) => {
  const { organizationId } = await getCurrentUserAndOrganization()
  const execution = await getExecutionById(executionId)
  if (!execution) return null

  const { data: linesData, error: linesError } = await supabase
    .from('application_lines')
    .select('id, execution_id, requisition_item_id, product_name, unit, dosis_por_tanque, gasto_lt_ha, dosis_por_ha')
    .eq('organization_id', organizationId)
    .eq('execution_id', executionId)

  if (linesError) throw new Error(linesError.message)

  const { data: rowsData, error: rowsError } = await supabase
    .from('application_irrigation_rows')
    .select('id, execution_id, sector_id, valve_id, surface')
    .eq('organization_id', organizationId)
    .eq('execution_id', executionId)
    .order('sort_order', { ascending: true })

  if (rowsError) throw new Error(rowsError.message)

  return {
    execution,
    lines: (linesData ?? []).map((row) => mapLine(row as ApplicationLineDbRow)),
    irrigationRows: (rowsData ?? []).map((row) => mapIrrigationRow(row as IrrigationRowDbRow)),
  }
}

export const createIrrigationRow = (executionId: string): IrrigationRow => ({
  id: createUuid(),
  executionId,
  sectorId: '',
  valveId: '',
  superficie: 0,
})
