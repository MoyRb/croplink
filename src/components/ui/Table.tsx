import type { HTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '../../lib/utils'

type TableProps = HTMLAttributes<HTMLTableElement> & PropsWithChildren

type TableCellProps = HTMLAttributes<HTMLTableCellElement> & PropsWithChildren

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & PropsWithChildren

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      <table className={cn('w-full text-left text-sm', className)} {...props} />
    </div>
  )
}

export function TableHead({ className, ...props }: TableCellProps) {
  return (
    <th
      className={cn('bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn('px-4 py-3 text-gray-700', className)} {...props} />
}

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn('border-t border-[#E5E7EB]', className)} {...props} />
}
