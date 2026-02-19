import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import type { SidebarNavItem } from './sidebarNav'
import { cn } from '../../lib/utils'

type SidebarSectionProps = {
  label: string
  icon: LucideIcon
  to?: string
  items?: SidebarNavItem[]
  isOpen: boolean
  isActive: boolean
  isCollapsed: boolean
  onToggle: () => void
  isActivePath: (item: SidebarNavItem) => boolean
  onNavigate?: () => void
}

export function SidebarSection({
  label,
  icon: Icon,
  to,
  items,
  isOpen,
  isActive,
  onToggle,
  isCollapsed,
  isActivePath,
  onNavigate,
}: SidebarSectionProps) {
  const hasItems = Boolean(items?.length)
  const showItems = hasItems && (isCollapsed || isOpen)

  if (!hasItems && to) {
    return (
      <NavLink
        to={to}
        title={isCollapsed ? label : undefined}
        onClick={onNavigate}
        className={({ isActive: isCurrentRoute }) =>
          cn(
            'pointer-events-auto flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100',
            (isCurrentRoute || isActive) && 'bg-gray-100 text-gray-900',
            isCollapsed && 'justify-center px-2',
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!isCollapsed ? <span className="ml-3 truncate">{label}</span> : null}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        type="button"
        title={isCollapsed ? label : undefined}
        className={cn(
          'flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100',
          showItems && 'bg-gray-100 text-gray-900',
          isCollapsed && 'justify-center px-2',
        )}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!isCollapsed ? (
          <>
            <span className="ml-3 truncate">{label}</span>
            <ChevronDown
              className={cn('ml-auto h-4 w-4 transition-transform', showItems && 'rotate-180')}
            />
          </>
        ) : null}
      </button>

      <div
        className={cn(
          'grid overflow-hidden transition-all duration-200 ease-out',
          showItems ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0">
          <div className={cn('space-y-1', isCollapsed ? 'pl-0' : 'pl-8')}>
            {items?.map((item) => {
              const activeItem = isActivePath(item)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? `${label} · ${item.label}` : undefined}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'pointer-events-auto flex items-center rounded-lg px-3 py-2 text-sm text-gray-600 transition',
                      isCollapsed ? 'justify-center px-2 text-xs' : 'justify-start',
                      isActive || activeItem ? 'bg-[#DBFAE6] font-medium text-gray-900' : 'hover:bg-gray-100',
                    )
                  }
                >
                  {isCollapsed ? <span className="h-2 w-2 rounded-full bg-current" /> : item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
