import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import type { HarvestDetailEntry } from '../../lib/store/cosechas'
import { createEmptyHarvestDetail } from './cosechaRendimientoTableUtils'

type Props = {
  rows: HarvestDetailEntry[]
  onChange?: (rows: HarvestDetailEntry[]) => void
  indicadorLabel?: string
}

const numberFields: Array<keyof Pick<HarvestDetailEntry, 'cajas' | 'rechazos' | 'kgProceso' | 'rendimiento'>> = [
  'cajas',
  'rechazos',
  'kgProceso',
  'rendimiento',
]

const normalizeRows = (rows: HarvestDetailEntry[]) =>
  rows.map((row) => ({
    ...row,
    empaque: row.empaque ?? '',
    cajas: Number.isFinite(row.cajas) ? row.cajas : 0,
    rechazos: Number.isFinite(row.rechazos) ? row.rechazos : 0,
    kgProceso: Number.isFinite(row.kgProceso) ? row.kgProceso : 0,
    rendimiento: Number.isFinite(row.rendimiento) ? row.rendimiento : 0,
  }))

const totals = (rows: HarvestDetailEntry[]) => ({
  cajas: rows.reduce((sum, row) => sum + row.cajas, 0),
  rechazos: rows.reduce((sum, row) => sum + row.rechazos, 0),
  kgProceso: rows.reduce((sum, row) => sum + row.kgProceso, 0),
  rendimiento: rows.length > 0 ? rows.reduce((sum, row) => sum + row.rendimiento, 0) / rows.length : 0,
})


export function CosechaRendimientoTable({ rows, onChange, indicadorLabel = 'Rendimiento (%)' }: Props) {
  const editable = typeof onChange === 'function'
  const normalizedRows = normalizeRows(rows)
  const summary = totals(normalizedRows)

  const handleChange = (index: number, field: keyof HarvestDetailEntry, value: string) => {
    if (!onChange) return
    const next = normalizedRows.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      if (field === 'empaque') return { ...row, empaque: value }
      if (numberFields.includes(field as (typeof numberFields)[number])) {
        return { ...row, [field]: Math.max(Number(value) || 0, 0) }
      }
      return row
    })
    onChange(next)
  }

  const handleAddRow = () => {
    if (!onChange) return
    onChange([...normalizedRows, createEmptyHarvestDetail()])
  }

  const handleRemoveRow = (index: number) => {
    if (!onChange) return
    onChange(normalizedRows.filter((_, rowIndex) => rowIndex !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Detalle de cosecha</h2>
          <p className="text-sm text-gray-500">Captura 1..N registros de rendimiento por empaque.</p>
        </div>
        {editable ? <Button variant="ghost" onClick={handleAddRow}>Agregar fila</Button> : null}
      </div>

      <Table>
        <thead>
          <tr>
            <TableHead>Empaque</TableHead>
            <TableHead>Cajas</TableHead>
            <TableHead>Rechazos</TableHead>
            <TableHead>Kg de proceso</TableHead>
            <TableHead>{indicadorLabel}</TableHead>
            {editable ? <TableHead>Acciones</TableHead> : null}
          </tr>
        </thead>
        <tbody>
          {normalizedRows.map((row, index) => (
            <TableRow key={row.id ?? `${row.empaque}-${index}`}>
              <TableCell>
                {editable ? (
                  <Input
                    placeholder="Empaque"
                    value={row.empaque}
                    onChange={(event) => handleChange(index, 'empaque', event.target.value)}
                  />
                ) : row.empaque || '—'}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={row.cajas || ''}
                    onChange={(event) => handleChange(index, 'cajas', event.target.value)}
                  />
                ) : row.cajas}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={row.rechazos || ''}
                    onChange={(event) => handleChange(index, 'rechazos', event.target.value)}
                  />
                ) : row.rechazos}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={row.kgProceso || ''}
                    onChange={(event) => handleChange(index, 'kgProceso', event.target.value)}
                  />
                ) : row.kgProceso}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={row.rendimiento || ''}
                    onChange={(event) => handleChange(index, 'rendimiento', event.target.value)}
                  />
                ) : row.rendimiento}
              </TableCell>
              {editable ? (
                <TableCell>
                  <Button
                    variant="ghost"
                    onClick={() => handleRemoveRow(index)}
                    disabled={normalizedRows.length === 1}
                  >
                    Quitar
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
          <TableRow className="bg-gray-50">
            <TableCell className="font-semibold text-gray-900">Totales</TableCell>
            <TableCell className="font-semibold text-gray-900">{summary.cajas}</TableCell>
            <TableCell className="font-semibold text-gray-900">{summary.rechazos}</TableCell>
            <TableCell className="font-semibold text-gray-900">{summary.kgProceso}</TableCell>
            <TableCell className="font-semibold text-gray-900">{summary.rendimiento.toFixed(2)}</TableCell>
            {editable ? <TableCell /> : null}
          </TableRow>
        </tbody>
      </Table>
    </div>
  )
}
