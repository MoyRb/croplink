import type { HTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '../../lib/utils'

type ModalProps = HTMLAttributes<HTMLDivElement> &
  PropsWithChildren & {
    open: boolean
    title?: string
    onClose?: () => void
  }

export function Modal({ open, title, onClose, className, children, ...props }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div
        className={cn('w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl', className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div>
            {title ? <h2 className="text-lg font-semibold text-gray-900">{title}</h2> : null}
          </div>
          {onClose ? (
            <button
              onClick={onClose}
              className="rounded-full px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Cerrar
            </button>
          ) : null}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
