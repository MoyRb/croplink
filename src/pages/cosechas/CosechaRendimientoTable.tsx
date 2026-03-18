import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/Table'
import {
  calculateProcessPercentage,
  calculateTotalProcessPercentage,
  getProcessAlertClassName,
} from '../../lib/cosechas/processMetrics'
import type { HarvestDetailEntry } from '../../lib/store/cosechas'
import { createEmptyHarvestDetail } from './cosechaRendimientoTableUtils'

type Props = {
  rows: HarvestDetailEntry[]
  onChange?: (rows: HarvestDetailEntry[]) => void
  indicadorLabel?: string
}

const numberFields: Array<keyof Pick<HarvestDetailEntry, 'cajas' | 'rechazos' | 'kgProceso'>> = [
  'cajas',
  'rechazos',
  'kgProceso',
]

const normalizeRows = (rows: HarvestDetailEntry[]) =>
  rows.map((row) => ({
    ...row,
    empaque: row.empaque ?? '',
    cajas: Number.isFinite(row.cajas) ? row.cajas : 0,
    rechazos: Number.isFinite(row.rechazos) ? row.rechazos : 0,
    kgProceso: Number.isFinite(row.kgProceso) ? row.kgProceso : 0,
    rendimiento: calculateProcessPercentage(row),
  }))

const totals = (rows: HarvestDetailEntry[]) => {
  const cajas = rows.reduce((sum, row) => sum + row.cajas, 0)
  const rechazos = rows.reduce((sum, row) => sum + row.rechazos, 0)
  const kgProceso = rows.reduce((sum, row) => sum + row.kgProceso, 0)
  const rendimiento = calculateTotalProcessPercentage(rows)

  return { cajas, rechazos, kgProceso, rendimiento }
}


export function CosechaRendimientoTable({ rows, onChange, indicadorLabel = '% Proceso' }: Props) {
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
                <span className={getProcessAlertClassName(row.rendimiento)}>{row.rendimiento.toFixed(2)}</span>
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
            <TableCell className={getProcessAlertClassName(summary.rendimiento)}>{summary.rendimiento.toFixed(2)}</TableCell>
            {editable ? <TableCell /> : null}
          </TableRow>
        </tbody>
      </Table>
    </div>
  )
}
