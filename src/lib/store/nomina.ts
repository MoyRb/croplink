export type TipoPago = 'Diario' | 'Semanal'

export type PeriodoNominaStatus = 'Borrador' | 'Calculado' | 'Pagado'

export type MetodoPago = 'Efectivo' | 'Transferencia'

export type Empleado = {
  id: string
  nombreCompleto: string
  puesto: string
  tipoPago: TipoPago
  salarioBase: number
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

const STORAGE_KEYS = {
  empleados: 'croplink:nomina:empleados',
  periodos: 'croplink:nomina:periodos',
  pagos: 'croplink:nomina:pagos',
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

export const calculatePagoTotals = (
  tipoPago: TipoPago,
  salarioBase: number,
  diasTrabajados: number,
  horasExtra: number,
  bono: number,
  descuento: number,
) => {
  const hourlyRate = tipoPago === 'Diario' ? salarioBase / 8 : salarioBase / 40
  const base =
    tipoPago === 'Diario'
      ? salarioBase * diasTrabajados
      : salarioBase
  const totalBruto = base + horasExtra * hourlyRate * 2 + bono
  const totalNeto = Math.max(totalBruto - descuento, 0)
  return { totalBruto, totalNeto }
}

export const getEmpleados = () => readStorage<Empleado[]>(STORAGE_KEYS.empleados, [])

export const addEmpleado = (data: Omit<Empleado, 'id'>) => {
  const empleados = getEmpleados()
  const nuevo: Empleado = { ...data, id: createId('EMP') }
  const updated = [nuevo, ...empleados]
  writeStorage(STORAGE_KEYS.empleados, updated)
  return updated
}

export const updateEmpleado = (empleado: Empleado) => {
  const empleados = getEmpleados()
  const updated = empleados.map((item) => (item.id === empleado.id ? empleado : item))
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
