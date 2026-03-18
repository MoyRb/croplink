import type { HarvestDetailEntry } from '../../lib/store/cosechas'

export const createEmptyHarvestDetail = (): HarvestDetailEntry => ({
  empaque: '',
  cajas: 0,
  rechazos: 0,
  kgProceso: 0,
  rendimiento: 0,
})
