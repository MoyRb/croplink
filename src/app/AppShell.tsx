import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'

export function AppShell() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#F5F5F5] text-gray-900">
      <Sidebar mobileOpen={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col md:pl-0">
        <Topbar onMobileMenuClick={() => setIsMobileSidebarOpen((current) => !current)} />
        <main className="flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
