export type TipoPago = 'Diario' | 'Semanal'

export type PayScheme = 'DIARIO' | 'POR_TAREA' | 'POR_UNIDAD'

export type PeriodoNominaStatus = 'Borrador' | 'Calculado' | 'Pagado'

export type MetodoPago = 'Efectivo' | 'Transferencia'

export type WorkLogStatus = 'OPEN' | 'PAID'

export type PaymentType = 'PERIODO' | 'MANUAL'

export type Empleado = {
  id: string
  nombreCompleto: string
  puesto: string
  tipoPago: TipoPago
  salarioBase: number
  paySchemeDefault: PayScheme
  dailyRate?: number
  taskRate?: number
  unitRate?: number
  activo: boolean
  fechaAlta: string
  notas?: string
}

export type PeriodoNomina = {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  estatus: PeriodoNominaStatus
  createdAt: string
}

export type RegistroPago = {
  id: string
  periodoId: string
  empleadoId: string
  diasTrabajados: number
  horasExtra: number
  bono: number
  descuento: number
  totalBruto: number
  totalNeto: number
  metodoPago: MetodoPago
  referencia?: string
  pagadoEn?: string
  notas?: string
}

export type WorkLog = {
  id: string
  date: string
  employeeId: string
  ranchId?: string
  activity: string
  payType: PayScheme
  units?: number
  rateUsed: number
  amount: number
  notes?: string
  status: WorkLogStatus
  paymentId?: string
  createdAt: string
}

export type Payment = {
  id: string
  type: PaymentType
  date: string
  employeeId: string
  startDate?: string
  endDate?: string
  amount: number
  note?: string
  linkedWorkLogIds: string[]
  createdAt: string
}

const STORAGE_KEYS = {
  empleados: 'croplink:nomina:empleados',
  periodos: 'croplink:nomina:periodos',
  pagos: 'croplink:nomina:pagos',
  workLogs: 'croplink:nomina:workLogs',
  nominaPayments: 'croplink:nomina:payments',
}

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const readStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  return safeParse(window.localStorage.getItem(key), fallback)
}

const writeStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeEmpleado = (empleado: Empleado): Empleado => ({
  ...empleado,
  paySchemeDefault: empleado.paySchemeDefault ?? 'DIARIO',
  dailyRate: empleado.dailyRate ?? (empleado.tipoPago === 'Diario' ? empleado.salarioBase : undefined),
  taskRate: empleado.taskRate,
  unitRate: empleado.unitRate,
})

export const calculatePagoTotals = (
  tipoPago: TipoPago,
  salarioBase: number,
  diasTrabajados: number,
  horasExtra: number,
  bono: number,
  descuento: number,
) => {
  const hourlyRate = tipoPago === 'Diario' ? salarioBase / 8 : salarioBase / 40
  const base = tipoPago === 'Diario' ? salarioBase * diasTrabajados : salarioBase
  const totalBruto = base + horasExtra * hourlyRate * 2 + bono
  const totalNeto = Math.max(totalBruto - descuento, 0)
  return { totalBruto, totalNeto }
}

export const getEmpleados = () => readStorage<Empleado[]>(STORAGE_KEYS.empleados, []).map(normalizeEmpleado)

export const getEmployeeRateByPayType = (employee: Empleado, payType: PayScheme) => {
  if (payType === 'DIARIO') return employee.dailyRate ?? employee.salarioBase
  if (payType === 'POR_TAREA') return employee.taskRate ?? 0
  return employee.unitRate ?? 0
}

export const computeWorkLogAmount = (payType: PayScheme, rateUsed: number, units?: number) => {
  if (payType === 'POR_UNIDAD') {
    const safeUnits = Number.isFinite(units) ? Number(units) : 0
    return Math.max(rateUsed * safeUnits, 0)
  }
  return Math.max(rateUsed, 0)
}

export const addEmpleado = (data: Omit<Empleado, 'id'>) => {
  const empleados = getEmpleados()
  const nuevo: Empleado = normalizeEmpleado({ ...data, id: createId('EMP') })
  const updated = [nuevo, ...empleados]
  writeStorage(STORAGE_KEYS.empleados, updated)
  return updated
}

export const updateEmpleado = (empleado: Empleado) => {
  const empleados = getEmpleados()
  const updated = empleados.map((item) => (item.id === empleado.id ? normalizeEmpleado(empleado) : item))
  writeStorage(STORAGE_KEYS.empleados, updated)
  return updated
}

export const toggleEmpleadoActivo = (id: string) => {
  const empleados = getEmpleados()
  const updated = empleados.map((item) =>
    item.id === id ? { ...item, activo: !item.activo } : item,
  )
  writeStorage(STORAGE_KEYS.empleados, updated)
  return updated
}

export const getPeriodos = () => readStorage<PeriodoNomina[]>(STORAGE_KEYS.periodos, [])

export const addPeriodo = (
  data: Omit<PeriodoNomina, 'id' | 'estatus' | 'createdAt'> & {
    estatus?: PeriodoNominaStatus
    createdAt?: string
  },
) => {
  const periodos = getPeriodos()
  const nuevo: PeriodoNomina = {
    id: createId('PER'),
    nombre: data.nombre,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    estatus: data.estatus ?? 'Borrador',
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
  const updated = [nuevo, ...periodos]
  writeStorage(STORAGE_KEYS.periodos, updated)
  return updated
}

export const updatePeriodoStatus = (id: string, estatus: PeriodoNominaStatus) => {
  const periodos = getPeriodos()
  const updated = periodos.map((item) => (item.id === id ? { ...item, estatus } : item))
  writeStorage(STORAGE_KEYS.periodos, updated)
  return updated
}

const getPagos = () => readStorage<RegistroPago[]>(STORAGE_KEYS.pagos, [])

export const getPagosByPeriodo = (periodoId: string) =>
  getPagos().filter((pago) => pago.periodoId === periodoId)

export const upsertPago = (pago: RegistroPago) => {
  const pagos = getPagos()
  const indexById = pagos.findIndex((item) => item.id === pago.id)
  const indexByComposite =
    indexById === -1
      ? pagos.findIndex(
          (item) => item.periodoId === pago.periodoId && item.empleadoId === pago.empleadoId,
        )
      : indexById
  const updated = [...pagos]

  if (indexByComposite === -1) {
    updated.push(pago)
  } else {
    updated[indexByComposite] = pago
  }

  writeStorage(STORAGE_KEYS.pagos, updated)
  return updated
}

export const getWorkLogs = () => readStorage<WorkLog[]>(STORAGE_KEYS.workLogs, [])

export const addWorkLog = (data: Omit<WorkLog, 'id' | 'createdAt' | 'status' | 'amount' | 'paymentId'>) => {
  const logs = getWorkLogs()
  const amount = computeWorkLogAmount(data.payType, data.rateUsed, data.units)
  const newLog: WorkLog = {
    ...data,
    id: createId('WL'),
    amount,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  }
  const updated = [newLog, ...logs]
  writeStorage(STORAGE_KEYS.workLogs, updated)
  return updated
}

export const updateWorkLog = (workLog: WorkLog) => {
  const logs = getWorkLogs()
  const normalized: WorkLog = {
    ...workLog,
    amount: computeWorkLogAmount(workLog.payType, workLog.rateUsed, workLog.units),
  }
  const updated = logs.map((item) => (item.id === workLog.id ? normalized : item))
  writeStorage(STORAGE_KEYS.workLogs, updated)
  return updated
}

export const deleteWorkLog = (id: string) => {
  const logs = getWorkLogs()
  const updated = logs.filter((item) => item.id !== id)
  writeStorage(STORAGE_KEYS.workLogs, updated)
  return updated
}

export const getPayments = () => readStorage<Payment[]>(STORAGE_KEYS.nominaPayments, [])

const updateWorkLogs = (logs: WorkLog[]) => {
  writeStorage(STORAGE_KEYS.workLogs, logs)
  return logs
}

export const createPeriodPayment = (payload: {
  date: string
  employeeId: string
  startDate: string
  endDate: string
  note?: string
}) => {
  const allLogs = getWorkLogs()
  const eligibleLogs = allLogs.filter(
    (log) =>
      log.employeeId === payload.employeeId &&
      log.status === 'OPEN' &&
      log.date >= payload.startDate &&
      log.date <= payload.endDate,
  )
  const amount = eligibleLogs.reduce((sum, log) => sum + log.amount, 0)
  const payment: Payment = {
    id: createId('PAY'),
    type: 'PERIODO',
    date: payload.date,
    employeeId: payload.employeeId,
    startDate: payload.startDate,
    endDate: payload.endDate,
    amount,
    note: payload.note,
    linkedWorkLogIds: eligibleLogs.map((log) => log.id),
    createdAt: new Date().toISOString(),
  }

  const updatedLogs = allLogs.map((log) =>
    payment.linkedWorkLogIds.includes(log.id)
      ? { ...log, status: 'PAID' as WorkLogStatus, paymentId: payment.id }
      : log,
  )
  updateWorkLogs(updatedLogs)

  const payments = getPayments()
  const updatedPayments = [payment, ...payments]
  writeStorage(STORAGE_KEYS.nominaPayments, updatedPayments)

  return { payment, linkedLogs: eligibleLogs, payments: updatedPayments, workLogs: updatedLogs }
}

export const createManualPayment = (payload: {
  date: string
  employeeId: string
  amount: number
  note?: string
}) => {
  const payment: Payment = {
    id: createId('PAY'),
    type: 'MANUAL',
    date: payload.date,
    employeeId: payload.employeeId,
    amount: Math.max(payload.amount, 0),
    note: payload.note,
    linkedWorkLogIds: [],
    createdAt: new Date().toISOString(),
  }

  const payments = getPayments()
  const updated = [payment, ...payments]
  writeStorage(STORAGE_KEYS.nominaPayments, updated)
  return updated
}
