import type { HTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '../../lib/utils'

type CardProps = HTMLAttributes<HTMLDivElement> & PropsWithChildren

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm', className)}
      {...props}
    />
  )
}
