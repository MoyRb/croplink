import type { HarvestDetailEntry } from '../store/cosechas'

const LB_TO_KG = 0.45359237
const OZ_TO_KG = 0.028349523125

const normalizeNumber = (value: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeEmpaque = (empaque: string) => empaque.trim().toLowerCase().replace(/\s+/g, ' ')

export const getKgPorCaja = (empaque: string) => {
  const normalized = normalizeEmpaque(empaque)
  if (!normalized) return 0

  const kgMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilo|kilos)\b/)
  if (kgMatch) {
    const value = Number(kgMatch[1].replace(',', '.'))
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  const gramsMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|grs|gramos)\b/)
  if (gramsMatch) {
    const value = Number(gramsMatch[1].replace(',', '.')) / 1000
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  const lbMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(lb|lbs|libra|libras)\b/)
  if (lbMatch) {
    const value = Number(lbMatch[1].replace(',', '.')) * LB_TO_KG
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  const ozMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(oz|onza|onzas)\b/)
  if (ozMatch) {
    const value = Number(ozMatch[1].replace(',', '.')) * OZ_TO_KG
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  return 0
}

export const calculateProcessPercentage = ({ empaque, cajas, kgProceso }: Pick<HarvestDetailEntry, 'empaque' | 'cajas' | 'kgProceso'>) => {
  const safeBoxes = Math.max(normalizeNumber(cajas), 0)
  if (safeBoxes <= 0) return 0

  const kgPorCaja = getKgPorCaja(empaque)
  if (kgPorCaja <= 0) return 0

  const kgBrutos = safeBoxes * kgPorCaja
  if (kgBrutos <= 0) return 0

  const processKg = Math.max(normalizeNumber(kgProceso), 0)
  const percentage = (processKg / kgBrutos) * 100
  return Number.isFinite(percentage) && percentage > 0 ? percentage : 0
}

export const calculateTotalProcessPercentage = (rows: HarvestDetailEntry[]) => {
  const totalKgProceso = rows.reduce((sum, row) => sum + Math.max(normalizeNumber(row.kgProceso), 0), 0)
  const totalKgBrutos = rows.reduce((sum, row) => sum + (Math.max(normalizeNumber(row.cajas), 0) * getKgPorCaja(row.empaque)), 0)
  if (totalKgBrutos <= 0) return 0

  const percentage = (totalKgProceso / totalKgBrutos) * 100
  return Number.isFinite(percentage) && percentage > 0 ? percentage : 0
}

export const getProcessAlertClassName = (percentage: number) =>
  percentage > 8 ? 'font-semibold text-amber-600' : 'font-medium text-gray-900'
