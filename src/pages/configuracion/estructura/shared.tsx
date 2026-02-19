/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { Toast } from '../../../components/ui/Toast'

export function useCrudFeedback() {
  const [toastMessage, setToastMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const run = (action: () => void, successMessage: string) => {
    try {
      action()
      setToastMessage(successMessage)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error inesperado.')
    }
  }

  return { toastMessage, errorMessage, setToastMessage, setErrorMessage, run }
}

type CrudShellProps<T> = {
  title: string
  searchPlaceholder: string
  query: string
  setQuery: (value: string) => void
  onNew: () => void
  rows: T[]
  renderRow: (row: T) => ReactNode
  children: ReactNode
  toastMessage?: string
  errorMessage?: string
}

export function CrudShell<T>({ title, searchPlaceholder, query, setQuery, onNew, rows, renderRow, children, toastMessage, errorMessage }: CrudShellProps<T>) {
  const content = useMemo(() => rows.map(renderRow), [rows, renderRow])
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {toastMessage ? <Toast variant="success">{toastMessage}</Toast> : null}
      {errorMessage ? <Toast variant="error">{errorMessage}</Toast> : null}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-sm" placeholder={searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button onClick={onNew}>Nuevo</Button>
        </div>
        <div className="space-y-2">{content}</div>
      </Card>
      {children}
    </div>
  )
}

type ModalActionsProps = { onClose: () => void; submitLabel?: string }

export function ModalActions({ onClose, submitLabel = 'Guardar' }: ModalActionsProps) {
  return (
    <div className="mt-4 flex gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  )
}

export function DeleteModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} title="Confirmar eliminación" onClose={onClose}>
      <p className="text-sm">¿Seguro que deseas eliminar este elemento?</p>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={onConfirm}>Eliminar</Button>
      </div>
    </Modal>
  )
}

export function stopSubmit(handler: () => void) {
  return (event: FormEvent) => {
    event.preventDefault()
    handler()
  }
}
