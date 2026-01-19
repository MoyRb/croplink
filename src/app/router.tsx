import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './AppShell'
import { RequireAuth } from './auth/RequireAuth'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { LoginPage } from '../pages/login/LoginPage'
import { MarketplaceCompararPage } from '../pages/marketplace/MarketplaceCompararPage'
import { RequisicionesCrearPage } from '../pages/requisiciones/RequisicionesCrearPage'
import { RequisicionesListaPage } from '../pages/requisiciones/RequisicionesListaPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/requisiciones/lista" element={<RequisicionesListaPage />} />
        <Route path="/requisiciones/crear" element={<RequisicionesCrearPage />} />
        <Route path="/marketplace/comparar" element={<MarketplaceCompararPage />} />
        <Route path="/requisiciones/aprobaciones" element={<RequisicionesListaPage />} />
        <Route path="/inventario" element={<DashboardPage />} />
        <Route path="/monitoreos" element={<DashboardPage />} />
        <Route path="/configuracion" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
