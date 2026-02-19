import { useEffect, useMemo, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { SidebarSection } from './SidebarSection'
import { SIDEBAR_NAV, type SidebarNavItem, type SidebarNavSection } from './sidebarNav'
import { getCurrentRole } from '../../lib/auth/roles'
import { BRAND } from '../../lib/brand'
import { cn } from '../../lib/utils'

const STORAGE_KEYS = {
  openSection: 'croplink.sidebar.openSection',
  isCollapsed: 'croplink.sidebar.isCollapsed',
}

type SidebarProps = {
  mobileOpen: boolean
  onCloseMobile: () => void
}

function isItemPathActive(pathname: string, item: SidebarNavItem) {
  if (pathname === item.to) return true

  if (item.matchPaths) {
    return item.matchPaths.some((path) => pathname.startsWith(path))
  }

  return pathname.startsWith(`${item.to}/`)
}

function isSectionPathActive(pathname: string, section: SidebarNavSection) {
  if (section.items?.some((item) => isItemPathActive(pathname, item))) {
    return true
  }

  if (!section.to) {
    return false
  }

  if (pathname === section.to) return true

  if (section.matchPaths) {
    return section.matchPaths.some((path) => pathname.startsWith(path))
  }

  return pathname.startsWith(`${section.to}/`)
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const role = getCurrentRole()

  const visibleSections = useMemo(
    () => SIDEBAR_NAV.filter((section) => !section.roles || section.roles.includes(role)),
    [role],
  )

  const [manualOpenState, setManualOpenState] = useState<{ pathname: string; sectionId: string | null }>(() => ({
    pathname: window.location.pathname,
    sectionId: window.localStorage.getItem(STORAGE_KEYS.openSection),
  }))
  const [isCollapsed, setIsCollapsed] = useState(() =>
    window.localStorage.getItem(STORAGE_KEYS.isCollapsed) === 'true',
  )

  const activeAccordionSectionId = useMemo(
    () =>
      visibleSections.find(
        (section) => section.items?.length && isSectionPathActive(location.pathname, section),
      )?.id ?? null,
    [location.pathname, visibleSections],
  )

  const resolvedOpenSection =
    manualOpenState.pathname === location.pathname ? manualOpenState.sectionId : activeAccordionSectionId

  useEffect(() => {
    if (!resolvedOpenSection) {
      window.localStorage.removeItem(STORAGE_KEYS.openSection)
      return
    }

    window.localStorage.setItem(STORAGE_KEYS.openSection, resolvedOpenSection)
  }, [resolvedOpenSection])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.isCollapsed, String(isCollapsed))
  }, [isCollapsed])

  const toggleSection = (sectionId: string) => {
    setManualOpenState((current) => {
      const currentSection = current.pathname === location.pathname ? current.sectionId : activeAccordionSectionId
      return {
        pathname: location.pathname,
        sectionId: currentSection === sectionId ? null : sectionId,
      }
    })
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/30 transition-opacity md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onCloseMobile}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-[#E5E7EB] bg-white px-3 py-4 transition-transform md:static md:translate-x-0',
          isCollapsed ? 'w-20' : 'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-2 px-1">
          {!isCollapsed ? (
            <div>
              <div className="text-lg font-semibold text-gray-900">{BRAND.product}</div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Operations</div>
            </div>
          ) : (
            <div className="mx-auto text-xs font-semibold uppercase tracking-wide text-gray-500">CP</div>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed((current) => !current)}
              className="hidden rounded-lg border border-[#E5E7EB] p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 md:inline-flex"
              title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex rounded-lg border border-[#E5E7EB] p-1.5 text-gray-500 transition hover:bg-gray-100 md:hidden"
              title="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {visibleSections.map((section) => (
            <SidebarSection
              key={section.id}
              label={section.label}
              icon={section.icon}
              to={section.to}
              items={section.items}
              isOpen={resolvedOpenSection === section.id}
              isActive={isSectionPathActive(location.pathname, section)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleSection(section.id)}
              onNavigate={onCloseMobile}
              isActivePath={(item) => isItemPathActive(location.pathname, item)}
            />
          ))}
        </nav>

        {!isCollapsed ? (
          <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] px-4 py-3 text-xs text-gray-500">
            Beta build · v0.1.0
          </div>
        ) : null}
      </aside>
    </>
  )
}
