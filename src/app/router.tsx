import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './AppShell'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { LoginPage } from '../pages/login/LoginPage'
import { MarketplaceCompararPage } from '../pages/marketplace/MarketplaceCompararPage'
import { InventarioInsumosPage } from '../pages/inventario/InventarioInsumosPage'
import { InventarioMovimientosPage } from '../pages/inventario/InventarioMovimientosPage'
import { MonitoreosCrearPage } from '../pages/monitoreos/MonitoreosCrearPage'
import { MonitoreosGraficasPage } from '../pages/monitoreos/MonitoreosGraficasPage'
import { MonitoreosIniciarPage } from '../pages/monitoreos/MonitoreosIniciarPage'
import { MonitoreosListaPage } from '../pages/monitoreos/MonitoreosListaPage'
import { MonitoreosResumenPage } from '../pages/monitoreos/MonitoreosResumenPage'
import { MonitoreosSesionPage } from '../pages/monitoreos/MonitoreosSesionPage'
import { NominaEmpleadosPage } from '../pages/nomina/NominaEmpleadosPage'
import { NominaPagosPage } from '../pages/nomina/NominaPagosPage'
import { NominaPeriodosPage } from '../pages/nomina/NominaPeriodosPage'
import { NominaRegistrosPage } from '../pages/nomina/NominaRegistrosPage'
import { NominaReportesPage } from '../pages/nomina/NominaReportesPage'
import { RequisicionesCrearPage } from '../pages/requisiciones/RequisicionesCrearPage'
import { RequisicionEjecucionPage } from '../pages/requisiciones/RequisicionEjecucionPage'
import { RequisicionesListaPage } from '../pages/requisiciones/RequisicionesListaPage'
import { ActivosDetallePage } from '../pages/activos/ActivosDetallePage'
import { ActivosListaPage } from '../pages/activos/ActivosListaPage'
import { ActivosMantenimientosPage } from '../pages/activos/ActivosMantenimientosPage'
import { ActivosNuevoPage } from '../pages/activos/ActivosNuevoPage'
import { ActivosReportesPage } from '../pages/activos/ActivosReportesPage'
import { ACTIVOS_ALLOWED_ROLES, NOMINA_ALLOWED_ROLES } from '../lib/auth/roles'
import { EstructuraPage } from '../pages/configuracion/EstructuraPage'
import { CultivosPage } from '../pages/configuracion/estructura/CultivosPage'
import { OperacionesPage } from '../pages/configuracion/estructura/OperacionesPage'
import { RanchosPage } from '../pages/configuracion/estructura/RanchosPage'
import { SectoresPage } from '../pages/configuracion/estructura/SectoresPage'
import { TemporadasPage } from '../pages/configuracion/estructura/TemporadasPage'
import { TunelesPage } from '../pages/configuracion/estructura/TunelesPage'
import { ValvulasPage } from '../pages/configuracion/estructura/ValvulasPage'

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
        <Route path="/requisiciones/:id/ejecutar" element={<RequisicionEjecucionPage />} />
        <Route path="/requisiciones/:id/ejecucion/:execId" element={<RequisicionEjecucionPage />} />
        <Route path="/marketplace/comparar" element={<MarketplaceCompararPage />} />
        <Route path="/requisiciones/aprobaciones" element={<RequisicionesListaPage />} />
        <Route path="/inventario" element={<Navigate to="/inventario/insumos" replace />} />
        <Route path="/inventario/insumos" element={<InventarioInsumosPage />} />
        <Route path="/inventario/movimientos" element={<InventarioMovimientosPage />} />
        <Route
          path="/activos/lista"
          element={
            <RequireRole allowed={ACTIVOS_ALLOWED_ROLES}>
              <ActivosListaPage />
            </RequireRole>
          }
        />
        <Route
          path="/activos/nuevo"
          element={
            <RequireRole allowed={ACTIVOS_ALLOWED_ROLES}>
              <ActivosNuevoPage />
            </RequireRole>
          }
        />
        <Route
          path="/activos/:id"
          element={
            <RequireRole allowed={ACTIVOS_ALLOWED_ROLES}>
              <ActivosDetallePage />
            </RequireRole>
          }
        />
        <Route
          path="/activos/:id/mantenimientos"
          element={
            <RequireRole allowed={ACTIVOS_ALLOWED_ROLES}>
              <ActivosMantenimientosPage />
            </RequireRole>
          }
        />
        <Route
          path="/activos/reportes"
          element={
            <RequireRole allowed={ACTIVOS_ALLOWED_ROLES}>
              <ActivosReportesPage />
            </RequireRole>
          }
        />
        <Route path="/monitoreos" element={<Navigate to="/monitoreos/lista" replace />} />
        <Route path="/monitoreos/lista" element={<MonitoreosListaPage />} />
        <Route path="/monitoreos/crear" element={<MonitoreosCrearPage />} />
        <Route path="/monitoreos/graficas" element={<MonitoreosGraficasPage />} />
        <Route path="/monitoreos/iniciar/:sessionId" element={<MonitoreosIniciarPage />} />
        <Route path="/monitoreos/sesion/:id" element={<MonitoreosSesionPage />} />
        <Route path="/monitoreos/resumen/:id" element={<MonitoreosResumenPage />} />
        <Route
          path="/nomina/empleados"
          element={
            <RequireRole allowed={NOMINA_ALLOWED_ROLES}>
              <NominaEmpleadosPage />
            </RequireRole>
          }
        />
        <Route
          path="/nomina/registros"
          element={
            <RequireRole allowed={NOMINA_ALLOWED_ROLES}>
              <NominaRegistrosPage />
            </RequireRole>
          }
        />
        <Route
          path="/nomina/periodos"
          element={
            <RequireRole allowed={NOMINA_ALLOWED_ROLES}>
              <NominaPeriodosPage />
            </RequireRole>
          }
        />
        <Route
          path="/nomina/pagos"
          element={
            <RequireRole allowed={NOMINA_ALLOWED_ROLES}>
              <NominaPagosPage />
            </RequireRole>
          }
        />
        <Route
          path="/nomina/reportes"
          element={
            <RequireRole allowed={NOMINA_ALLOWED_ROLES}>
              <NominaReportesPage />
            </RequireRole>
          }
        />
        <Route path="/configuracion" element={<Navigate to="/configuracion/estructura" replace />} />
        <Route path="/configuracion/estructura" element={<EstructuraPage />} />
        <Route path="/configuracion/estructura/operaciones" element={<OperacionesPage />} />
        <Route path="/configuracion/estructura/ranchos" element={<RanchosPage />} />
        <Route path="/configuracion/estructura/sectores" element={<SectoresPage />} />
        <Route path="/configuracion/estructura/tuneles" element={<TunelesPage />} />
        <Route path="/configuracion/estructura/valvulas" element={<ValvulasPage />} />
        <Route path="/configuracion/estructura/cultivos" element={<CultivosPage />} />
        <Route path="/configuracion/estructura/temporadas" element={<TemporadasPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
