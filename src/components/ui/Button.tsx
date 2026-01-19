import type { ButtonHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#00C050] text-white hover:bg-[#00b048]',
  secondary: 'bg-white text-gray-900 border border-[#E5E7EB] hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
