import * as XLSX from 'xlsx'

import type { Recomendacion } from '../store/recomendaciones'

const TEMPLATE_PATH = '/templates/recomendaciones/formato-recomendacion-croplink.xlsx'

const setCell = (sheet: XLSX.WorkSheet, row: number, col: number, value: string) => {
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  sheet[addr] = { t: 's', v: value }
}

const putCommonFields = (sheet: XLSX.WorkSheet, recomendacion: Recomendacion, includePh: boolean) => {
  setCell(sheet, 0, 1, recomendacion.titulo)
  setCell(sheet, 1, 1, recomendacion.huerta)
  setCell(sheet, 1, 6, recomendacion.superficie)
  setCell(sheet, 1, 8, recomendacion.solicita)
  setCell(sheet, 1, 12, recomendacion.modoAplicacion)
  setCell(sheet, 2, 1, recomendacion.justificacion)
  setCell(sheet, 2, 6, recomendacion.fechaRecomendacion)
  setCell(sheet, 2, 10, recomendacion.semana)
  setCell(sheet, 2, 12, recomendacion.equipoAplicacion)
  setCell(sheet, 3, 1, recomendacion.operario)
  setCell(sheet, 3, 6, recomendacion.fechaAplicacion)

  if (includePh) {
    setCell(sheet, 3, 10, recomendacion.phMezcla)
  }

  setCell(sheet, 3, 12, `${recomendacion.horaInicio} - ${recomendacion.horaTermino}`)
  setCell(sheet, 4, 1, recomendacion.comentarios)
}

export const downloadRecomendacionExcel = async (recomendacion: Recomendacion) => {
  const response = await fetch(TEMPLATE_PATH)
  if (!response.ok) {
    throw new Error('No se pudo cargar el template de recomendaciones.')
  }

  const data = await response.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })

  const foliarSheetName = 'Aplicaciones foliares y drench'
  const riegoSheetName = 'Aplicaciones via riego'
  const foliarSheet = workbook.Sheets[foliarSheetName]
  const riegoSheet = workbook.Sheets[riegoSheetName]

  if (!foliarSheet || !riegoSheet) {
    throw new Error('El template no contiene las hojas esperadas.')
  }

  putCommonFields(foliarSheet, recomendacion, true)
  putCommonFields(riegoSheet, recomendacion, false)

  recomendacion.productos.forEach((producto, index) => {
    const row = 6 + index
    setCell(foliarSheet, row, 1, producto.producto)
    setCell(foliarSheet, row, 2, producto.ingredienteActivo)
    setCell(foliarSheet, row, 3, producto.dosis)
    setCell(foliarSheet, row, 4, producto.gasto)
    setCell(foliarSheet, row, 5, producto.gastoTotal)
    setCell(foliarSheet, row, 6, producto.sector)
  })

  recomendacion.dosisPorHa.forEach((dosis, index) => {
    setCell(riegoSheet, 5, 3 + index, dosis)
  })

  recomendacion.riegoFilas.forEach((fila, index) => {
    const row = 7 + index
    setCell(riegoSheet, row, 0, fila.sector)
    setCell(riegoSheet, row, 1, fila.valvula)
    setCell(riegoSheet, row, 2, fila.superficie)

    fila.productos.forEach((valor, productIndex) => {
      setCell(riegoSheet, row, 3 + productIndex, valor)
    })
  })

  const safeTitle = recomendacion.titulo.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)
  XLSX.writeFile(workbook, `recomendacion_${safeTitle || recomendacion.id}.xlsx`)
}
