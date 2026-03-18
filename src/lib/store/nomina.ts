import { supabase } from '../supabaseClient'

export type TipoPago = 'Diario' | 'Semanal'
export type PayScheme = 'DIARIO' | 'POR_TAREA' | 'POR_UNIDAD'
export type PeriodoNominaStatus = 'Borrador' | 'Calculado' | 'Pagado'
export type MetodoPago = 'Efectivo' | 'Transferencia'
export type WorkLogStatus = 'OPEN' | 'PAID'
export type PaymentType = 'PERIODO' | 'MANUAL' | 'REGISTROS'
export type TasaUnidad = 'dia' | 'caja' | 'kg' | 'tunel' | 'surco' | 'hr extra' | 'tambo' | 'metro lineal' | 'planta' | 'ha'
export type TasaUnidadActiva = Exclude<TasaUnidad, 'planta' | 'ha'>

export type TarifaActividad = {
  id: string
  actividad: string
  unidad: TasaUnidad
  tarifa: number
  cultivo?: string
  rancho?: string
  temporada?: string
  createdAt: string
}

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
  homoclave?: string | null
  nss?: string | null
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
  paymentUnit?: TasaUnidad
  quantity?: number
  units?: number
  rateUsed: number
  amount: number
  notes?: string
  status: WorkLogStatus
  paymentId?: string
  createdAt: string
}

export type WorkLogDraft = Omit<WorkLog, 'id' | 'createdAt' | 'status' | 'amount' | 'paymentId'>

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

type ProfileOrgRow = { organization_id: string | null }

const ACTIVE_TASA_UNIDADES: TasaUnidadActiva[] = ['dia', 'caja', 'kg', 'tunel', 'surco', 'hr extra', 'tambo', 'metro lineal']

export const getActiveTasaUnidades = () => [...ACTIVE_TASA_UNIDADES]

export const getUnidadLabel = (unidad?: TasaUnidad) => {
  if (!unidad) return '—'
  return unidad
}

export const getPaySchemeByUnidad = (unidad?: TasaUnidad): PayScheme => {
  if (!unidad) return 'POR_UNIDAD'
  if (unidad === 'dia') return 'DIARIO'
  return 'POR_UNIDAD'
}

export const getWorkLogQuantity = (workLog: Pick<WorkLog, 'quantity' | 'units' | 'payType'>) => {
  if (typeof workLog.quantity === 'number' && Number.isFinite(workLog.quantity)) {
    return Math.max(workLog.quantity, 0)
  }

  if (typeof workLog.units === 'number' && Number.isFinite(workLog.units)) {
    return Math.max(workLog.units, 0)
  }

  return workLog.payType === 'POR_UNIDAD' ? 0 : 1
}

const inferLegacyUnit = (payType: PayScheme, quantity: number): TasaUnidad | undefined => {
  if (payType === 'DIARIO') return 'dia'
  if (payType === 'POR_TAREA' && quantity > 0) return 'surco'
  if (payType === 'POR_UNIDAD' && quantity > 0) return 'caja'
  return undefined
}

const getCurrentOrganizationId = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error(authError?.message || 'No hay un usuario autenticado.')

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', authData.user.id)
    .single<ProfileOrgRow>()

  if (profileError || !profileData?.organization_id) {
    throw new Error(profileError?.message || 'No hay organización asociada al usuario.')
  }

  return profileData.organization_id
}

const mapPayScheme = (value: string): PayScheme => {
  if (value === 'por_tarea') return 'POR_TAREA'
  if (value === 'por_unidad') return 'POR_UNIDAD'
  return 'DIARIO'
}

const toDbPayScheme = (value: PayScheme) => {
  if (value === 'POR_TAREA') return 'por_tarea'
  if (value === 'POR_UNIDAD') return 'por_unidad'
  return 'diario'
}

const mapPeriodoStatus = (value: string): PeriodoNominaStatus => {
  if (value === 'calculated') return 'Calculado'
  if (value === 'paid') return 'Pagado'
  return 'Borrador'
}

const toDbPeriodoStatus = (value: PeriodoNominaStatus) => {
  if (value === 'Calculado') return 'calculated'
  if (value === 'Pagado') return 'paid'
  return 'draft'
}

const mapPaymentType = (value: string): PaymentType => {
  if (value === 'manual') return 'MANUAL'
  if (value === 'work_logs') return 'REGISTROS'
  return 'PERIODO'
}

const toDbPaymentType = (value: PaymentType) => {
  if (value === 'MANUAL') return 'manual'
  if (value === 'REGISTROS') return 'work_logs'
  return 'period'
}

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

export const getEmployeeRateByPayType = (employee: Empleado, payType: PayScheme) => {
  if (payType === 'DIARIO') return employee.dailyRate ?? employee.salarioBase
  if (payType === 'POR_TAREA') return employee.taskRate ?? 0
  return employee.unitRate ?? 0
}

export const computeWorkLogAmount = (quantity: number | undefined, rateUsed: number) => {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(Number(quantity), 0) : 0
  return Math.max(rateUsed * safeQuantity, 0)
}

export async function getEmpleados() {
  const organizationId = await getCurrentOrganizationId()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    nombreCompleto: row.full_name,
    puesto: row.position ?? '',
    tipoPago: row.pay_scheme_default === 'diario' ? 'Diario' : 'Semanal',
    salarioBase: Number(row.daily_rate ?? 0),
    paySchemeDefault: mapPayScheme(row.pay_scheme_default),
    dailyRate: row.daily_rate ? Number(row.daily_rate) : undefined,
    taskRate: row.task_rate ? Number(row.task_rate) : undefined,
    unitRate: row.unit_rate ? Number(row.unit_rate) : undefined,
    activo: Boolean(row.is_active),
    fechaAlta: row.hire_date ?? new Date().toISOString().slice(0, 10),
    notas: row.notes ?? undefined,
    homoclave: row.homoclave ?? null,
    nss: row.nss ?? null,
  })) as Empleado[]
}

export async function addEmpleado(data: Omit<Empleado, 'id'>) {
  const organizationId = await getCurrentOrganizationId()
  const payload = {
    organization_id: organizationId,
    full_name: data.nombreCompleto,
    position: data.puesto,
    pay_scheme_default: toDbPayScheme(data.paySchemeDefault),
    daily_rate: data.dailyRate ?? data.salarioBase,
    task_rate: data.taskRate ?? null,
    unit_rate: data.unitRate ?? null,
    is_active: data.activo,
    hire_date: data.fechaAlta,
    notes: data.notas ?? null,
    homoclave: data.homoclave?.trim().toUpperCase() || null,
    nss: data.nss?.trim() || null,
  }
  const { error } = await supabase.from('employees').insert(payload)
  if (error) throw new Error(error.message)
  return getEmpleados()
}

export async function updateEmpleado(empleado: Empleado) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase
    .from('employees')
    .update({
      full_name: empleado.nombreCompleto,
      position: empleado.puesto,
      pay_scheme_default: toDbPayScheme(empleado.paySchemeDefault),
      daily_rate: empleado.dailyRate ?? empleado.salarioBase,
      task_rate: empleado.taskRate ?? null,
      unit_rate: empleado.unitRate ?? null,
      is_active: empleado.activo,
      hire_date: empleado.fechaAlta,
      notes: empleado.notas ?? null,
      homoclave: empleado.homoclave?.trim().toUpperCase() || null,
      nss: empleado.nss?.trim() || null,
    })
    .eq('id', empleado.id)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)
  return getEmpleados()
}

export async function toggleEmpleadoActivo(id: string) {
  const empleados = await getEmpleados()
  const target = empleados.find((item) => item.id === id)
  if (!target) return empleados
  await updateEmpleado({ ...target, activo: !target.activo })
  return getEmpleados()
}

export async function getTarifasActividad() {
  const organizationId = await getCurrentOrganizationId()
  const { data, error } = await supabase
    .from('activity_rates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    actividad: row.activity,
    unidad: row.unit as TasaUnidad,
    tarifa: Number(row.rate),
    cultivo: row.crop_id ?? undefined,
    rancho: row.ranch_id ?? undefined,
    temporada: row.season_id ?? undefined,
    createdAt: row.created_at,
  })) as TarifaActividad[]
}

export async function addTarifaActividad(data: Omit<TarifaActividad, 'id' | 'createdAt'>) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase.from('activity_rates').insert({
    organization_id: organizationId,
    activity: data.actividad,
    unit: data.unidad,
    rate: data.tarifa,
    crop_id: data.cultivo ?? null,
    ranch_id: data.rancho ?? null,
    season_id: data.temporada ?? null,
  })
  if (error) throw new Error(error.message)
  return getTarifasActividad()
}

export async function updateTarifaActividad(tarifa: TarifaActividad) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase
    .from('activity_rates')
    .update({
      activity: tarifa.actividad,
      unit: tarifa.unidad,
      rate: tarifa.tarifa,
      crop_id: tarifa.cultivo ?? null,
      ranch_id: tarifa.rancho ?? null,
      season_id: tarifa.temporada ?? null,
    })
    .eq('id', tarifa.id)
    .eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  return getTarifasActividad()
}

export async function deleteTarifaActividad(id: string) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase.from('activity_rates').delete().eq('id', id).eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  return getTarifasActividad()
}

export async function resolveTarifaActividad(params: { actividad: string; unidad?: TasaUnidad; rancho?: string; cultivo?: string; temporada?: string }) {
  const normalizedActivity = params.actividad.trim().toLowerCase()
  if (!normalizedActivity) return null
  const tarifas = await getTarifasActividad()
  const matches = tarifas.filter((tarifa) => {
    if (tarifa.actividad.trim().toLowerCase() !== normalizedActivity) return false
    if (params.unidad && tarifa.unidad !== params.unidad) return false
    if (tarifa.rancho && tarifa.rancho !== params.rancho) return false
    if (tarifa.cultivo && tarifa.cultivo !== params.cultivo) return false
    if (tarifa.temporada && tarifa.temporada !== params.temporada) return false
    return true
  })
  if (!matches.length) return null
  const getScore = (tarifa: TarifaActividad) => (tarifa.rancho ? 8 : 0) + (tarifa.cultivo ? 4 : 0) + (tarifa.temporada ? 2 : 0) + (params.unidad && tarifa.unidad === params.unidad ? 1 : 0)
  return [...matches].sort((a, b) => getScore(b) - getScore(a))[0]
}

export async function getPeriodos() {
  const organizationId = await getCurrentOrganizationId()
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    nombre: row.name,
    fechaInicio: row.start_date,
    fechaFin: row.end_date,
    estatus: mapPeriodoStatus(row.status),
    createdAt: row.created_at,
  })) as PeriodoNomina[]
}

export async function addPeriodo(data: Omit<PeriodoNomina, 'id' | 'estatus' | 'createdAt'>) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase.from('payroll_periods').insert({
    organization_id: organizationId,
    name: data.nombre,
    start_date: data.fechaInicio,
    end_date: data.fechaFin,
    status: 'draft',
  })
  if (error) throw new Error(error.message)
  return getPeriodos()
}

export async function updatePeriodoStatus(id: string, estatus: PeriodoNominaStatus) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase.from('payroll_periods').update({ status: toDbPeriodoStatus(estatus) }).eq('id', id).eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  return getPeriodos()
}

export async function getPagosByPeriodo(periodoId: string) {
  const organizationId = await getCurrentOrganizationId()
  const { data, error } = await supabase
    .from('payroll_entries')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('payroll_period_id', periodoId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    periodoId: row.payroll_period_id,
    empleadoId: row.employee_id,
    diasTrabajados: Number(row.days_worked),
    horasExtra: Number(row.overtime_hours),
    bono: Number(row.bonus),
    descuento: Number(row.discount),
    totalBruto: Number(row.gross_total),
    totalNeto: Number(row.net_total),
    metodoPago: row.payment_method === 'efectivo' ? 'Efectivo' : 'Transferencia',
    referencia: row.reference ?? undefined,
    pagadoEn: row.paid_at ?? undefined,
    notas: row.notes ?? undefined,
  })) as RegistroPago[]
}

export async function upsertPago(pago: RegistroPago) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase.from('payroll_entries').upsert({
    id: pago.id.startsWith('PAG-') ? undefined : pago.id,
    organization_id: organizationId,
    payroll_period_id: pago.periodoId,
    employee_id: pago.empleadoId,
    days_worked: pago.diasTrabajados,
    overtime_hours: pago.horasExtra,
    bonus: pago.bono,
    discount: pago.descuento,
    gross_total: pago.totalBruto,
    net_total: pago.totalNeto,
    payment_method: pago.metodoPago === 'Efectivo' ? 'efectivo' : 'transferencia',
    reference: pago.referencia ?? null,
    paid_at: pago.pagadoEn ?? null,
    notes: pago.notas ?? null,
  }, { onConflict: 'payroll_period_id,employee_id' })
  if (error) throw new Error(error.message)
  return getPagosByPeriodo(pago.periodoId)
}

export async function getWorkLogs() {
  const organizationId = await getCurrentOrganizationId()
  const { data, error } = await supabase
    .from('work_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const payType = mapPayScheme(row.pay_type)
    const quantity = row.units != null ? Number(row.units) : undefined

    return {
      id: row.id,
      date: row.date,
      employeeId: row.employee_id,
      ranchId: row.ranch_id ?? undefined,
      activity: row.activity,
      payType,
      paymentUnit: (row.unit as TasaUnidad | null) ?? inferLegacyUnit(payType, quantity ?? 0),
      quantity,
      units: quantity,
      rateUsed: Number(row.rate_used),
      amount: Number(row.amount),
      notes: row.notes ?? undefined,
      status: row.status === 'paid' ? 'PAID' : 'OPEN',
      paymentId: row.payment_id ?? undefined,
      createdAt: row.created_at,
    }
  }) as WorkLog[]
}

export async function addWorkLog(data: WorkLogDraft) {
  const organizationId = await getCurrentOrganizationId()
  const quantity = getWorkLogQuantity(data)
  const amount = computeWorkLogAmount(quantity, data.rateUsed)
  const { error } = await supabase.from('work_logs').insert({
    organization_id: organizationId,
    employee_id: data.employeeId,
    date: data.date,
    ranch_id: data.ranchId ?? null,
    activity: data.activity,
    pay_type: toDbPayScheme(data.payType),
    unit: data.paymentUnit ?? null,
    units: quantity,
    rate_used: data.rateUsed,
    amount,
    status: 'open',
    notes: data.notes ?? null,
  })
  if (error) throw new Error(error.message)
  return getWorkLogs()
}

export async function updateWorkLog(workLog: WorkLog) {
  const organizationId = await getCurrentOrganizationId()
  const quantity = getWorkLogQuantity(workLog)
  const amount = computeWorkLogAmount(quantity, workLog.rateUsed)
  const { error } = await supabase
    .from('work_logs')
    .update({
      date: workLog.date,
      employee_id: workLog.employeeId,
      ranch_id: workLog.ranchId ?? null,
      activity: workLog.activity,
      pay_type: toDbPayScheme(workLog.payType),
      unit: workLog.paymentUnit ?? null,
      units: quantity,
      rate_used: workLog.rateUsed,
      amount,
      notes: workLog.notes ?? null,
    })
    .eq('id', workLog.id)
    .eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  return getWorkLogs()
}

export async function deleteWorkLog(id: string) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase.from('work_logs').delete().eq('id', id).eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  return getWorkLogs()
}

export async function getPayments() {
  const organizationId = await getCurrentOrganizationId()
  const { data, error } = await supabase
    .from('payments')
    .select('id, type, date, employee_id, start_date, end_date, amount, notes, created_at, payment_work_logs(work_log_id)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    type: mapPaymentType(row.type),
    date: row.date,
    employeeId: row.employee_id,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    amount: Number(row.amount),
    note: row.notes ?? undefined,
    linkedWorkLogIds: (row.payment_work_logs ?? []).map((item: { work_log_id: string }) => item.work_log_id),
    createdAt: row.created_at,
  })) as Payment[]
}

export async function createPeriodPayment(payload: { date: string; employeeId: string; startDate: string; endDate: string; note?: string }) {
  const allLogs = await getWorkLogs()
  const eligibleLogs = allLogs.filter((log) => log.employeeId === payload.employeeId && log.status === 'OPEN' && log.date >= payload.startDate && log.date <= payload.endDate)
  return createWorkLogPayment({
    date: payload.date,
    employeeId: payload.employeeId,
    workLogIds: eligibleLogs.map((log) => log.id),
    startDate: payload.startDate,
    endDate: payload.endDate,
    note: payload.note,
    fallbackType: 'PERIODO',
  })
}

export async function createWorkLogPayment(payload: { date: string; employeeId?: string; workLogIds: string[]; startDate?: string; endDate?: string; note?: string; fallbackType?: Extract<PaymentType, 'PERIODO' | 'REGISTROS'> }) {
  const organizationId = await getCurrentOrganizationId()
  const allLogs = await getWorkLogs()
  const eligibleLogs = allLogs.filter((log) => payload.workLogIds.includes(log.id) && log.status === 'OPEN')

  if (!eligibleLogs.length) {
    throw new Error('Selecciona al menos un registro abierto para generar el pago.')
  }

  const employeeIds = new Set(eligibleLogs.map((log) => log.employeeId))
  if (employeeIds.size > 1) {
    throw new Error('Todos los registros seleccionados deben pertenecer al mismo empleado.')
  }

  const employeeId = payload.employeeId ?? eligibleLogs[0]?.employeeId
  if (!employeeId) throw new Error('No se pudo resolver el empleado para este pago.')

  const sortedDates = [...eligibleLogs].map((log) => log.date).sort((a, b) => a.localeCompare(b))
  const amount = eligibleLogs.reduce((sum, log) => sum + log.amount, 0)
  const paymentType = payload.fallbackType ?? 'REGISTROS'

  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert({
      organization_id: organizationId,
      employee_id: employeeId,
      type: toDbPaymentType(paymentType),
      date: payload.date,
      start_date: payload.startDate ?? sortedDates[0],
      end_date: payload.endDate ?? sortedDates.at(-1),
      amount,
      notes: payload.note ?? null,
    })
    .select('id')
    .single<{ id: string }>()

  if (paymentError || !paymentData) throw new Error(paymentError?.message || 'No se pudo crear el pago.')

  const paymentLinks = eligibleLogs.map((log) => ({ organization_id: organizationId, payment_id: paymentData.id, work_log_id: log.id }))
  const { error: linksError } = await supabase.from('payment_work_logs').insert(paymentLinks)
  if (linksError) throw new Error(linksError.message)

  const { error: logsError } = await supabase
    .from('work_logs')
    .update({ status: 'paid', payment_id: paymentData.id })
    .eq('organization_id', organizationId)
    .in('id', eligibleLogs.map((log) => log.id))
  if (logsError) throw new Error(logsError.message)

  return { payments: await getPayments(), workLogs: await getWorkLogs() }
}

export async function createManualPayment(payload: { date: string; employeeId: string; amount: number; note?: string }) {
  const organizationId = await getCurrentOrganizationId()
  const { error } = await supabase.from('payments').insert({
    organization_id: organizationId,
    employee_id: payload.employeeId,
    type: toDbPaymentType('MANUAL'),
    date: payload.date,
    amount: Math.max(payload.amount, 0),
    notes: payload.note ?? null,
  })
  if (error) throw new Error(error.message)
  return getPayments()
}
