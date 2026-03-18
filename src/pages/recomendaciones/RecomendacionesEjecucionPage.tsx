import { useEffect, useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { cn } from '../../lib/utils'
import {
  getProductosConDosis,
  getRecomendaciones,
  getSectoresParaEjecucion,
  updateProductDosisSupabase,
  type ProductoConDosis,
  type Recomendacion,
  type SectorConArea,
} from '../../lib/store/recomendaciones'

type ProductoEditable = ProductoConDosis & {
  dosePerHaInput: string
  doseUnitInput: string
}

type ProductCalculation = {
  id: string
  productName: string
  activeIngredient: string | null
  unit: string
  total: number | null
  perFullTank: number | null
  perLastTank: number | null
  dosePerHa: number | null
}

const round3 = (n: number) => parseFloat(n.toFixed(3))
const selectClassName =
  'w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-gray-700 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'
const summaryCardClassName = 'rounded-2xl border border-slate-200 bg-slate-50/80 p-4'

const parsePositiveNumber = (value: string) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function RecomendacionesEjecucionPage() {
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([])
  const [sectores, setSectores] = useState<SectorConArea[]>([])
  const [selectedRecId, setSelectedRecId] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [productos, setProductos] = useState<ProductoEditable[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [capTamboInput, setCapTamboInput] = useState('200')
  const [aguaPorHaInput, setAguaPorHaInput] = useState('200')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const [recs, sects] = await Promise.all([getRecomendaciones(), getSectoresParaEjecucion()])
        if (!cancelled) {
          setRecomendaciones(recs)
          setSectores(sects)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando datos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedRecId) {
      setProductos([])
      return
    }
    let cancelled = false
    const loadProductos = async () => {
      try {
        setLoadingProductos(true)
        setError('')
        const data = await getProductosConDosis(selectedRecId)
        if (!cancelled) {
          setProductos(
            data.map((p) => ({
              ...p,
              dosePerHaInput: p.dosePerHa != null ? String(p.dosePerHa) : '',
              doseUnitInput: p.doseUnit ?? '',
            })),
          )
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando productos.')
      } finally {
        if (!cancelled) setLoadingProductos(false)
      }
    }
    void loadProductos()
    return () => {
      cancelled = true
    }
  }, [selectedRecId])

  const selectedRecommendation = recomendaciones.find((item) => item.id === selectedRecId) ?? null
  const selectedSector = sectores.find((s) => s.id === selectedSectorId) ?? null
  const areaHa = selectedSector?.areaHa ?? null

  useEffect(() => {
    if (!selectedRecommendation?.volumenAguaHa) return
    const suggestedAgua = parsePositiveNumber(selectedRecommendation.volumenAguaHa)
    if (suggestedAgua !== null) {
      setAguaPorHaInput(String(suggestedAgua))
    }
  }, [selectedRecommendation?.id, selectedRecommendation?.volumenAguaHa])

  const capTambo = parsePositiveNumber(capTamboInput)
  const aguaPorHa = parsePositiveNumber(aguaPorHaInput)
  const tamboValid = areaHa !== null && areaHa > 0 && capTambo !== null && aguaPorHa !== null
  const aguaTotal = tamboValid ? round3(areaHa * aguaPorHa) : null
  const fullTanks = tamboValid && aguaTotal !== null && capTambo !== null ? Math.floor(aguaTotal / capTambo) : 0
  const lastTankLiters = tamboValid && aguaTotal !== null && capTambo !== null ? round3(aguaTotal - fullTanks * capTambo) : null
  const totalTanks = tamboValid && aguaTotal !== null && capTambo !== null ? Math.ceil(aguaTotal / capTambo) : 0

  const calculations = useMemo<ProductCalculation[]>(() => {
    return productos.map((producto) => {
      const dosePerHa = producto.dosePerHaInput.trim() !== '' ? Number(producto.dosePerHaInput) : null
      const hasValidDose = dosePerHa !== null && Number.isFinite(dosePerHa) && dosePerHa >= 0
      const total = areaHa !== null && hasValidDose ? round3(dosePerHa * areaHa) : null
      const perFullTank =
        tamboValid && total !== null && aguaTotal !== null && aguaTotal > 0 && capTambo !== null && fullTanks > 0
          ? round3(total * (capTambo / aguaTotal))
          : null
      const perLastTank =
        tamboValid && total !== null && aguaTotal !== null && aguaTotal > 0 && lastTankLiters !== null && lastTankLiters > 0
          ? round3(total * (lastTankLiters / aguaTotal))
          : null

      return {
        id: producto.id,
        productName: producto.productName,
        activeIngredient: producto.activeIngredient,
        unit: producto.doseUnitInput.trim() || 'unidad',
        total,
        perFullTank,
        perLastTank,
        dosePerHa: hasValidDose ? dosePerHa : null,
      }
    })
  }, [aguaTotal, areaHa, capTambo, fullTanks, lastTankLiters, productos, tamboValid])

  const productsWithDose = calculations.filter((item) => item.total !== null).length

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSavedMsg('')
      for (const p of productos) {
        const raw = p.dosePerHaInput.trim()
        const dosePerHa = raw !== '' ? Number(raw) : null
        const doseUnit = p.doseUnitInput.trim() || null
        if (dosePerHa !== null && (Number.isNaN(dosePerHa) || dosePerHa < 0)) {
          throw new Error(`Dosis inválida para "${p.productName}".`)
        }
        await updateProductDosisSupabase(p.id, dosePerHa, doseUnit)
      }
      setSavedMsg('Dosis guardadas correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const emptyState = !selectedRecId
    ? 'Selecciona una recomendación para cargar productos y preparar la mezcla.'
    : productos.length === 0
      ? 'Esta recomendación no tiene productos registrados.'
      : !selectedSectorId
        ? 'Selecciona un sector para calcular consumo total y distribución por tambo.'
        : areaHa === null
          ? 'El sector seleccionado no tiene superficie capturada; complétala para habilitar cálculos.'
          : ''

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Ejecución</h1>
        <p className="text-sm text-gray-500">Convierte la recomendación en una mezcla operativa clara con datos reales de productos, sector y superficie.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <Card>
          <p className="text-sm text-gray-500">Cargando recomendaciones y sectores...</p>
        </Card>
      ) : (
        <>
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Datos base</h2>
                <p className="text-sm text-slate-500">Selecciona la recomendación y el sector sobre el que harás la distribución.</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                {selectedRecommendation ? `Recomendación ${selectedRecommendation.numero}` : 'Sin recomendación seleccionada'}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Recomendación</label>
                <select
                  className={selectClassName}
                  value={selectedRecId}
                  onChange={(e) => {
                    setSelectedRecId(e.target.value)
                    setSavedMsg('')
                  }}
                >
                  <option value="">Seleccionar recomendación...</option>
                  {recomendaciones.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numero} · {r.titulo || r.id.slice(0, 8)}{r.fechaRecomendacion ? ` · ${r.fechaRecomendacion}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sector</label>
                <select
                  className={selectClassName}
                  value={selectedSectorId}
                  onChange={(e) => setSelectedSectorId(e.target.value)}
                >
                  <option value="">Seleccionar sector...</option>
                  {sectores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.areaHa != null ? ` (${s.areaHa} ha)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Rancho</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{selectedRecommendation?.huerta || '—'}</p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Clasificación</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{selectedRecommendation?.clasificacion || '—'}</p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Superficie sector</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{areaHa != null ? `${areaHa} ha` : '—'}</p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Productos</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{productos.length}</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Configuración de tambo</h2>
              <p className="text-sm text-slate-500">Ajusta capacidad y litros por hectárea para distribuir la mezcla de forma consistente.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Capacidad de tambo (L)</label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="200"
                  value={capTamboInput}
                  onChange={(e) => setCapTamboInput(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Agua por hectárea (L/ha)</label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="200"
                  value={aguaPorHaInput}
                  onChange={(e) => setAguaPorHaInput(e.target.value)}
                />
                {selectedRecommendation?.volumenAguaHa ? (
                  <p className="mt-1 text-xs text-slate-500">Sugerido desde la recomendación: {selectedRecommendation.volumenAguaHa} L/ha.</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Agua total</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{aguaTotal != null ? `${aguaTotal} L` : '—'}</p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Tambos completos</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{tamboValid ? fullTanks : '—'}</p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Último tambo</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {lastTankLiters !== null && lastTankLiters > 0 ? `${lastTankLiters} L` : tamboValid ? 'No aplica' : '—'}
                </p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Tandas estimadas</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{tamboValid ? totalTanks : '—'}</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Resumen de consumo</h2>
                <p className="text-sm text-slate-500">La dosis total se calcula como <span className="font-medium text-slate-700">dosis por ha × superficie del sector</span>.</p>
              </div>
              <Button onClick={handleSave} disabled={saving || productos.length === 0}>
                {saving ? 'Guardando...' : 'Guardar dosis'}
              </Button>
            </div>

            {savedMsg ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{savedMsg}</p> : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Productos configurados</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{productos.length}</p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Con dosis válida</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{productsWithDose}</p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Superficie activa</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{areaHa != null ? `${areaHa} ha` : '—'}</p>
              </div>
              <div className={summaryCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Agua configurada</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{aguaPorHa != null ? `${aguaPorHa} L/ha` : '—'}</p>
              </div>
            </div>

            {loadingProductos ? <p className="text-sm text-slate-500">Cargando productos...</p> : null}

            {!loadingProductos && emptyState ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                {emptyState}
              </div>
            ) : null}

            {!loadingProductos && productos.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Producto</th>
                        <th className="px-4 py-3 font-semibold">Ingrediente activo</th>
                        <th className="px-4 py-3 font-semibold">Dosis / ha</th>
                        <th className="px-4 py-3 font-semibold">Unidad</th>
                        <th className="px-4 py-3 font-semibold">Consumo total</th>
                        <th className="px-4 py-3 font-semibold">Por tambo</th>
                        <th className="px-4 py-3 font-semibold">Último tambo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map((producto, idx) => {
                        const calc = calculations.find((item) => item.id === producto.id)
                        return (
                          <tr key={producto.id} className="border-t border-slate-200 align-top hover:bg-slate-50/70">
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-900">{producto.productName}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-slate-600">{producto.activeIngredient || '—'}</td>
                            <td className="px-4 py-4">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                className="max-w-28"
                                value={producto.dosePerHaInput}
                                onChange={(e) =>
                                  setProductos((prev) => prev.map((item, i) => (i === idx ? { ...item, dosePerHaInput: e.target.value } : item)))
                                }
                              />
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                placeholder="L, ml, g, kg..."
                                className="max-w-28"
                                value={producto.doseUnitInput}
                                onChange={(e) =>
                                  setProductos((prev) => prev.map((item, i) => (i === idx ? { ...item, doseUnitInput: e.target.value } : item)))
                                }
                              />
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                                {calc?.total != null ? `${calc.total} ${calc.unit}` : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {calc?.perFullTank != null ? `${calc.perFullTank} ${calc.unit}` : '—'}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {calc?.perLastTank != null ? `${calc.perLastTank} ${calc.unit}` : tamboValid ? 'No aplica' : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-slate-200 p-5">
                    <div className="space-y-3">
                      <h3 className="text-base font-semibold text-slate-900">Distribución por producto</h3>
                      <div className="space-y-3">
                        {calculations.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{item.productName}</p>
                                <p className="text-sm text-slate-500">{item.activeIngredient || 'Ingrediente activo sin capturar'}</p>
                              </div>
                              <span className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold',
                                item.total != null ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
                              )}>
                                {item.total != null ? 'Calculado' : 'Pendiente'}
                              </span>
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{item.total != null ? `${item.total} ${item.unit}` : '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Por tambo</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{item.perFullTank != null ? `${item.perFullTank} ${item.unit}` : '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Último tambo</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{item.perLastTank != null ? `${item.perLastTank} ${item.unit}` : tamboValid ? 'No aplica' : '—'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card className="border-slate-200 p-5">
                    <div className="space-y-3">
                      <h3 className="text-base font-semibold text-slate-900">Resumen total de mezcla</h3>
                      <p className="text-sm text-slate-500">Vista rápida para validar volumen, tandas estimadas y productos listos para ejecución.</p>
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">Recomendación</span>
                          <span className="font-semibold text-slate-900">{selectedRecommendation ? `${selectedRecommendation.numero} · ${selectedRecommendation.titulo || 'Sin título'}` : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">Sector</span>
                          <span className="font-semibold text-slate-900">{selectedSector?.name || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">Superficie</span>
                          <span className="font-semibold text-slate-900">{areaHa != null ? `${areaHa} ha` : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">Agua total</span>
                          <span className="font-semibold text-slate-900">{aguaTotal != null ? `${aguaTotal} L` : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">Tandas / tambos</span>
                          <span className="font-semibold text-slate-900">{tamboValid ? totalTanks : '—'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {calculations.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                            <span className="font-medium text-slate-700">{item.productName}</span>
                            <span className="font-semibold text-slate-900">{item.total != null ? `${item.total} ${item.unit}` : '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : null}
          </Card>
        </>
      )}
    </div>
  )
}
