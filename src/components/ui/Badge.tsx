import type { HTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '../../lib/utils'

type BadgeVariant = 'success' | 'neutral'

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  PropsWithChildren & {
    variant?: BadgeVariant
  }

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#DBFAE6] text-[#0B6B2A]',
  neutral: 'bg-gray-100 text-gray-600',
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
