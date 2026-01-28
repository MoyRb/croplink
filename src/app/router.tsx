import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './AppShell'
import { RequireAuth } from './auth/RequireAuth'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { LoginPage } from '../pages/login/LoginPage'
import { MarketplaceCompararPage } from '../pages/marketplace/MarketplaceCompararPage'
import { MonitoreosBitacoraPage } from '../pages/monitoreos/MonitoreosBitacoraPage'
import { MonitoreosGraficasPage } from '../pages/monitoreos/MonitoreosGraficasPage'
import { MonitoreosIniciarPage } from '../pages/monitoreos/MonitoreosIniciarPage'
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
        <Route path="/monitoreos" element={<Navigate to="/monitoreos/bitacora" replace />} />
        <Route path="/monitoreos/iniciar" element={<MonitoreosIniciarPage />} />
        <Route path="/monitoreos/bitacora" element={<MonitoreosBitacoraPage />} />
        <Route path="/monitoreos/graficas" element={<MonitoreosGraficasPage />} />
        <Route path="/configuracion" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
