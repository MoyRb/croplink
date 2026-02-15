export type UseCase = {
  crop: string
  market: string
  category: string
  product_id: string
  commercial_name: string
  active_ingredient: string
  concentration: string
  company: string
  target_type: string
  target_common: string
  target_common_norm: string
  target_scientific: string
  dose: string
  safety_interval: string
  reentry_period: string
  phi_usa: string
  phi_eu: string
  mrl_ppm: string
  resistance_class: string
  chemical_group: string
  interval_between_applications: string
  max_applications: string
  registration: string
  observations: string
  sheet: string
}

export type Product = {
  product_id: string
  commercial_name: string
  active_ingredient: string
  concentration: string
  company: string
  resistance_class: string
  chemical_group: string
}

export type Target = {
  target_common_norm: string
  target_type: string
  target_common: string
  target_scientific: string
  crop: string
  category: string
}
