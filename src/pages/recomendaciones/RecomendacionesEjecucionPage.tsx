import { useEffect, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
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

  const selectedSector = sectores.find((s) => s.id === selectedSectorId) ?? null
  const areaHa = selectedSector?.areaHa ?? null

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSavedMsg('')
      for (const p of productos) {
        const raw = p.dosePerHaInput.trim()
        const dosePerHa = raw !== '' ? Number(raw) : null
        const doseUnit = p.doseUnitInput.trim() || null
        if (dosePerHa !== null && (isNaN(dosePerHa) || dosePerHa < 0)) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Ejecución</h1>
        <p className="text-sm text-gray-500">Calcula el consumo total de productos según la superficie del sector.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Recomendación</label>
              <select
                className="w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
                value={selectedRecId}
                onChange={(e) => setSelectedRecId(e.target.value)}
              >
                <option value="">Seleccionar recomendación...</option>
                {recomendaciones.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titulo || r.id.slice(0, 8)}{r.fechaRecomendacion ? ` · ${r.fechaRecomendacion}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sector</label>
              <select
                className="w-full rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
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
              {selectedSector !== null && areaHa === null ? (
                <p className="mt-1 text-xs text-amber-600">
                  Este sector no tiene superficie registrada. Ingrésala en Configuración → Sectores.
                </p>
              ) : null}
              {selectedSector !== null && areaHa !== null ? (
                <p className="mt-1 text-xs text-gray-500">Superficie: {areaHa} ha</p>
              ) : null}
            </div>
          </div>
        </Card>
      )}

      {loadingProductos ? <p className="text-sm text-gray-500">Cargando productos...</p> : null}

      {!loadingProductos && selectedRecId !== '' && productos.length === 0 && !loading ? (
        <p className="text-sm text-gray-500">Esta recomendación no tiene productos registrados.</p>
      ) : null}

      {!loadingProductos && productos.length > 0 ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Productos y consumo</h2>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar dosis'}
            </Button>
          </div>

          {savedMsg ? <p className="mb-3 text-sm text-green-600">{savedMsg}</p> : null}

          {selectedSectorId !== '' && areaHa === null ? (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Captura la superficie del sector para habilitar el cálculo de totales.
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left text-xs text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Producto</th>
                  <th className="pb-2 pr-4 font-medium">Dosis / ha</th>
                  <th className="pb-2 pr-4 font-medium">Unidad</th>
                  <th className="pb-2 pr-4 font-medium">Superficie (ha)</th>
                  <th className="pb-2 font-medium">Consumo total</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, idx) => {
                  const doseNum = Number(p.dosePerHaInput)
                  const hasValidDose = p.dosePerHaInput.trim() !== '' && !isNaN(doseNum) && doseNum >= 0
                  const total = areaHa !== null && hasValidDose ? parseFloat((doseNum * areaHa).toFixed(4)) : null
                  const unit = p.doseUnitInput.trim() || 'unidad'
                  return (
                    <tr key={p.id} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.productName}</td>
                      <td className="py-2 pr-4">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          className="w-28"
                          value={p.dosePerHaInput}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, dosePerHaInput: e.target.value } : item)),
                            )
                          }
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <Input
                          placeholder="L, ml, g, kg..."
                          className="w-28"
                          value={p.doseUnitInput}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, doseUnitInput: e.target.value } : item)),
                            )
                          }
                        />
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{areaHa ?? '—'}</td>
                      <td className="py-2 font-semibold text-gray-900">
                        {total !== null ? `${total} ${unit}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
