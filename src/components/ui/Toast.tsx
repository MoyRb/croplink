import type { HTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '../../lib/utils'

type ToastProps = HTMLAttributes<HTMLDivElement> &
  PropsWithChildren & {
    variant?: 'success' | 'info' | 'error'
  }

const variantStyles = {
  success: 'border-[#00C050] bg-[#DBFAE6] text-[#0B6B2A]',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  error: 'border-red-200 bg-red-50 text-red-700',
}

export function Toast({ className, variant = 'info', ...props }: ToastProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
