import { NavLink } from 'react-router-dom'

import { getCurrentRole } from '../../lib/auth/roles'
import { BRAND } from '../../lib/brand'
import { NAV_SECTIONS } from '../../lib/constants'
import { cn } from '../../lib/utils'

export function Sidebar() {
  const role = getCurrentRole()
  const visibleSections = NAV_SECTIONS.filter(
    (section) => !section.roles || section.roles.includes(role),
  )

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[#E5E7EB] bg-white px-4 py-6">
      <div className="px-2">
        <div className="text-lg font-semibold text-gray-900">{BRAND.product}</div>
        <div className="text-xs uppercase tracking-wide text-gray-400">Operations</div>
      </div>
      <nav className="mt-8 flex-1 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.label}>
            {section.children ? (
              <div>
                <div className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {section.label}
                </div>
                <div className="mt-2 space-y-1">
                  {section.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition',
                          isActive ? 'bg-[#DBFAE6] text-gray-900' : 'hover:bg-gray-100',
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink
                to={section.to ?? '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition',
                    isActive ? 'bg-[#DBFAE6] text-gray-900' : 'hover:bg-gray-100',
                  )
                }
              >
                {section.label}
              </NavLink>
            )}
          </div>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] px-4 py-3 text-xs text-gray-500">
        Beta build · v0.1.0
      </div>
    </aside>
  )
}
