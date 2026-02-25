import { type FormEvent, useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  type InventoryItem,
  updateInventoryItem,
} from '../../lib/store/inventory'

type ItemFormState = {
  sku: string
  nombre: string
  categoria: string
  unidad: string
  stock_minimo: string
  ubicacion: string
  proveedor_sugerido: string
}

const emptyForm: ItemFormState = {
  sku: '',
  nombre: '',
  categoria: '',
  unidad: '',
  stock_minimo: '0',
  ubicacion: '',
  proveedor_sugerido: '',
}

export function InventarioInsumosPage() {
  const [items, setItems] = useState<InventoryItem[]>(() => getInventoryItems())
  const [query, setQuery] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [ubicacionFilter, setUbicacionFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ItemFormState>(emptyForm)

  const refresh = () => setItems(getInventoryItems())

  const categorias = useMemo(
    () => Array.from(new Set(items.map((item) => item.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [items],
  )
  const ubicaciones = useMemo(
    () => Array.from(new Set(items.map((item) => item.ubicacion).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [items],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items
      .filter((item) => (categoriaFilter ? item.categoria === categoriaFilter : true))
      .filter((item) => (ubicacionFilter ? item.ubicacion === ubicacionFilter : true))
      .filter((item) => {
        if (!normalizedQuery) return true
        return [item.sku, item.nombre, item.categoria, item.ubicacion].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        )
      })
  }, [categoriaFilter, items, query, ubicacionFilter])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      sku: form.sku.trim(),
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim() || 'General',
      unidad: form.unidad.trim(),
      stock_minimo: Number(form.stock_minimo) || 0,
      ubicacion: form.ubicacion.trim() || 'Sin ubicación',
      proveedor_sugerido: form.proveedor_sugerido.trim() || undefined,
    }

    if (!payload.sku || !payload.nombre || !payload.unidad) return

    if (editingId) {
      updateInventoryItem(editingId, payload)
    } else {
      createInventoryItem(payload)
    }

    setEditingId(null)
    setForm(emptyForm)
    refresh()
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setForm({
      sku: item.sku,
      nombre: item.nombre,
      categoria: item.categoria,
      unidad: item.unidad,
      stock_minimo: String(item.stock_minimo),
      ubicacion: item.ubicacion,
      proveedor_sugerido: item.proveedor_sugerido ?? '',
    })
  }

  const handleDelete = (itemId: string) => {
    deleteInventoryItem(itemId)
    refresh()
    if (editingId === itemId) {
      setEditingId(null)
      setForm(emptyForm)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Inventario · Compras generales</h1>
        <p className="text-sm text-gray-500">Catálogo y stock de insumos generales (no agroquímicos).</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-medium text-gray-800">{editingId ? 'Editar insumo' : 'Nuevo insumo'}</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="SKU" value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} required />
            <Input placeholder="Nombre" value={form.nombre} onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))} required />
            <Input placeholder="Categoría" value={form.categoria} onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))} />
            <Input placeholder="Unidad (pza, rollo, caja...)" value={form.unidad} onChange={(event) => setForm((prev) => ({ ...prev, unidad: event.target.value }))} required />
            <Input type="number" min={0} step="0.01" placeholder="Stock mínimo" value={form.stock_minimo} onChange={(event) => setForm((prev) => ({ ...prev, stock_minimo: event.target.value }))} />
            <Input placeholder="Ubicación" value={form.ubicacion} onChange={(event) => setForm((prev) => ({ ...prev, ubicacion: event.target.value }))} />
            <div className="md:col-span-2">
              <Input placeholder="Proveedor sugerido (opcional)" value={form.proveedor_sugerido} onChange={(event) => setForm((prev) => ({ ...prev, proveedor_sugerido: event.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">{editingId ? 'Guardar cambios' : 'Crear insumo'}</Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
              }}>
                Cancelar edición
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Buscar por SKU, nombre, categoría o ubicación" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className="text-sm">
            Categoría
            <select className="mt-1 w-full rounded-full border border-[#E5E7EB] px-4 py-2" value={categoriaFilter} onChange={(event) => setCategoriaFilter(event.target.value)}>
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Ubicación
            <select className="mt-1 w-full rounded-full border border-[#E5E7EB] px-4 py-2" value={ubicacionFilter} onChange={(event) => setUbicacionFilter(event.target.value)}>
              <option value="">Todas</option>
              {ubicaciones.map((ubicacion) => (
                <option key={ubicacion} value={ubicacion}>{ubicacion}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Nombre</th>
                <th className="px-2 py-2">Categoría</th>
                <th className="px-2 py-2">Unidad</th>
                <th className="px-2 py-2">Stock actual</th>
                <th className="px-2 py-2">Stock mínimo</th>
                <th className="px-2 py-2">Ubicación</th>
                <th className="px-2 py-2">Proveedor sugerido</th>
                <th className="px-2 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="px-2 py-2 font-medium text-gray-900">{item.sku}</td>
                  <td className="px-2 py-2">{item.nombre}</td>
                  <td className="px-2 py-2">{item.categoria}</td>
                  <td className="px-2 py-2">{item.unidad}</td>
                  <td className="px-2 py-2">{item.stock_actual}</td>
                  <td className="px-2 py-2">{item.stock_minimo}</td>
                  <td className="px-2 py-2">{item.ubicacion}</td>
                  <td className="px-2 py-2">{item.proveedor_sugerido || '—'}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" onClick={() => handleEdit(item)}>Editar</Button>
                      <Button type="button" variant="ghost" onClick={() => handleDelete(item.id)}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-sm text-gray-500" colSpan={9}>No hay insumos para los filtros seleccionados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
