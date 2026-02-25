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

const EXECUTIONS_KEY = 'application_executions'
const LINES_KEY = 'application_lines'
const IRRIGATION_ROWS_KEY = 'irrigation_rows'

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const parseArray = <T>(value: string | null): T[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

const getStoredArray = <T>(key: string) => {
  if (typeof window === 'undefined') return [] as T[]
  return parseArray<T>(window.localStorage.getItem(key))
}

const setStoredArray = <T>(key: string, value: T[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const getApplicationExecutions = () => getStoredArray<ApplicationExecution>(EXECUTIONS_KEY)
export const getApplicationLines = () => getStoredArray<ApplicationLine>(LINES_KEY)
export const getIrrigationRows = () => getStoredArray<IrrigationRow>(IRRIGATION_ROWS_KEY)

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
  id: createId('exec'),
  createdAt: new Date().toISOString(),
  ...getExecutionDefaults(requisicion),
})

export const buildInitialLines = (executionId: string, requisicion: Requisicion): ApplicationLine[] => {
  if (requisicion.items && requisicion.items.length > 0) {
    return requisicion.items.map((item) => ({
      id: createId('line'),
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
      id: createId('line'),
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

export const getExecutionById = (executionId: string) =>
  getApplicationExecutions().find((execution) => execution.id === executionId) ?? null

export const getLatestExecutionByRequisicionId = (requisicionId: string) => {
  const matches = getApplicationExecutions().filter((execution) => execution.requisicionId === requisicionId)
  if (matches.length === 0) return null
  return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

export const saveExecutionBundle = (execution: ApplicationExecution, lines: ApplicationLine[], irrigationRows: IrrigationRow[]) => {
  const executions = getApplicationExecutions()
  const linesAll = getApplicationLines()
  const rowsAll = getIrrigationRows()

  const nextExecutions = executions.some((item) => item.id === execution.id)
    ? executions.map((item) => (item.id === execution.id ? execution : item))
    : [execution, ...executions]

  const nextLines = [...linesAll.filter((item) => item.executionId !== execution.id), ...lines]
  const nextRows = [...rowsAll.filter((item) => item.executionId !== execution.id), ...irrigationRows]

  setStoredArray(EXECUTIONS_KEY, nextExecutions)
  setStoredArray(LINES_KEY, nextLines)
  setStoredArray(IRRIGATION_ROWS_KEY, nextRows)
}

export const getExecutionBundle = (executionId: string) => {
  const execution = getExecutionById(executionId)
  if (!execution) return null

  const lines = getApplicationLines().filter((line) => line.executionId === executionId)
  const irrigationRows = getIrrigationRows().filter((row) => row.executionId === executionId)

  return { execution, lines, irrigationRows }
}

export const createIrrigationRow = (executionId: string): IrrigationRow => ({
  id: createId('row'),
  executionId,
  sectorId: '',
  valveId: '',
  superficie: 0,
})
