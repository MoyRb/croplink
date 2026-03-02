# BACKEND PLAN (Supabase) para Croplink ERP

> Alcance: plan de backend basado en lo que hoy existe en el front (stores/localStorage + pantallas).
> 
> No incluye SQL ni migrations ejecutables todavía: sólo diseño propuesto.

## 1) Módulos detectados en el front

1. **Estructura multi-rancho (catálogo operativo)**
   - Operación → Rancho → Sector → Túnel (opcional) → Válvula.
   - Catálogos de Cultivos, Temporadas y asignación Rancho-Cultivo-Temporada.
2. **Requisiciones**
   - Encabezado + items.
   - Estados de flujo (pendiente, revisión, comparativa, aprobada, etc.).
   - Contexto operativo (operación/rancho/cultivo/temporada/sector/túnel/válvula).
3. **Monitoreos**
   - Dos niveles en UI: historial simple y sesiones de monitoreo estructurado (sectores, puntos, plantas, métricas, hallazgos, umbrales).
4. **Nómina variable**
   - Empleados, periodos, registros/pagos, worklogs por actividad, tabulador de tarifas por contexto.
5. **Inventario / movimientos**
   - Insumos, stock, lotes/caducidad (actualmente en item/movimiento), movimientos IN/OUT/RETURN/WASTE/ADJUST.
6. **Recomendaciones / Excel**
   - Recomendación con modo foliar/drench o vía riego; detalle de productos/filas de riego y exportación a plantilla Excel.
7. **Benéficos**
   - Actualmente embebido como tipo de item en requisiciones (`BENEFICO`) con metadatos específicos (especie, dosis/ha, superficie, fecha programada).
8. **Cosechas**
   - Registro de cosecha por fecha/contexto y cuadrilla; integración con nómina (crea worklogs).

---

## 2) Estrategia multi-tenant (organization_id)

### Recomendación
- **Tenant principal = `organization_id`** en todas las tablas de negocio.
- Todos los PK en UUID (`id uuid primary key default gen_random_uuid()`).
- Índices compuestos frecuentes: `(organization_id, created_at desc)` y `(organization_id, <foreign_key>)`.
- FKs internas siempre dentro del tenant (validado por RLS + constraints + funciones de app).

### Tablas de identidad/tenant
- `organizations`
- `profiles` (1:1 con `auth.users`, incluye rol y organization_id)
- Opcional para escalar: `profile_organizations` (si en futuro hay usuarios multi-organización).

### Convención mínima en cada tabla de dominio
- `organization_id uuid not null references organizations(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `created_by uuid null references profiles(id)` (cuando aplique trazabilidad)

---

## 3) Modelo relacional propuesto (tablas + campos clave)

## 3.1 Núcleo de tenant y seguridad

### `organizations`
- `id`, `name`, `slug`, `is_active`, timestamps.

### `profiles`
- `id` (uuid = auth.uid)
- `organization_id`
- `full_name`
- `role` (enum: `admin | compras | campo | supervisor`)
- `is_active`
- timestamps.

---

## 3.2 Estructura multi-rancho (catálogo operativo)

### `operations`
- `id`, `organization_id`, `name`, `description`.

### `ranches`
- `id`, `organization_id`, `operation_id`, `name`, `location`, `description`.

### `sectors`
- `id`, `organization_id`, `ranch_id`, `name`, `code`, `description`.

### `tunnels`
- `id`, `organization_id`, `sector_id`, `name`, `code`, `description`.

### `valves`
- `id`, `organization_id`, `sector_id`, `tunnel_id nullable`, `name`, `code`, `description`.

### `crops`
- `id`, `organization_id`, `name`, `description`.

### `seasons`
- `id`, `organization_id`, `name`, `start_date`, `end_date`, `description`.

### `ranch_crop_seasons`
- `id`, `organization_id`, `ranch_id`, `crop_id`, `season_id`.
- Unique recomendado: `(organization_id, ranch_id, crop_id, season_id)`.

---

## 3.3 Requisiciones + ejecución

### `requisitions`
- `id`, `organization_id`, `folio` (REQ-XXXX opcional en capa app)
- `status` enum (`pending`, `in_review`, `in_comparative`, `approved`, `rejected`, `completed`)
- `cost_center` enum (`operaciones`, `compras`, `mantenimiento`, `campo`)
- `priority` enum (`baja`, `media`, `alta`)
- `requested_date`
- `notes`
- **Contexto operativo FK**: `operation_id`, `ranch_id`, `ranch_crop_season_id`, `sector_id`, `tunnel_id`, `valve_id` (nullable según caso)
- `requested_by`, timestamps.

### `requisition_items`
- `id`, `organization_id`, `requisition_id`
- `item_type` enum (`agroquimico`, `insumo_general`, `benefico`)
- `product_id nullable` (si existe catálogo interno)
- `commercial_name`, `active_ingredient`, `quantity`, `unit`, `notes`
- `metadata jsonb` (para campos específicos del dataset de plaguicidas/targets).

### `requisition_attachments`
- `id`, `organization_id`, `requisition_id`, `file_path`, `file_name`, `file_size`, `mime_type`, timestamps.

### `application_executions`
- `id`, `organization_id`, `requisition_id`
- `mode` enum (`foliar_drench`, `via_riego`)
- `status` enum (`draft`, `posted_out`, `closed`)
- `header jsonb` (campos operativos hoy en front)
- `posted_out_at`, `closed_at`, timestamps.

### `application_lines`
- `id`, `organization_id`, `execution_id`, `requisition_item_id`
- `product_name`, `unit`, `dosis_por_tanque`, `gasto_lt_ha`, `dosis_por_ha`.

### `application_irrigation_rows`
- `id`, `organization_id`, `execution_id`, `sector_id`, `valve_id`, `superficie`.

---

## 3.4 Monitoreos

> Propuesta híbrida: estructura relacional para navegación/filtros + JSONB para métricas dinámicas.

### `monitoring_sessions`
- `id`, `organization_id`
- `status` enum (`in_progress`, `paused`, `completed`)
- `monitoring_type` enum (`desarrollo`, `nutricion`)
- `production_system` enum (`hidroponico`, `suelo`) nullable
- contexto FK: `ranch_id`, `ranch_crop_season_id`, `sector_id`, `tunnel_id`, `valve_id`
- `weather_condition`, `phenological_stage`
- `config jsonb` (puntos por sector, plantas por punto, metros, umbrales)
- timestamps.

### `monitoring_sectors`
- `id`, `organization_id`, `session_id`, `sector_id`, `name_snapshot`, `tunnel_snapshot`, `valve_snapshot`, `sort_order`.

### `monitoring_points`
- `id`, `organization_id`, `session_id`, `monitoring_sector_id`, `name`, `metros_muestreados`, `conteo_en_metros`, `density`.

### `monitoring_plants`
- `id`, `organization_id`, `session_id`, `monitoring_point_id`, `name`
- `metrics jsonb`  ← **JSONB principal** para llaves dinámicas por plantilla (brix, ph, raíz, etc.).

### `monitoring_findings`
- `id`, `organization_id`, `session_id`, `monitoring_plant_id`
- `tipo`, `descripcion`, `pc nullable`, `severity nullable`, `photos jsonb`.

### `monitoring_thresholds` (opcional si se quiere query fuerte)
- `id`, `organization_id`, `session_id`, `metric_key`, `min_value`, `max_value`.
- Si no se requiere analítica SQL avanzada al inicio, puede vivir en `config jsonb`.

---

## 3.5 Inventario y movimientos

### `inventory_items`
- `id`, `organization_id`
- `sku`, `name`, `category`, `unit`
- `stock_current` (numérico)
- `stock_minimum`
- `location`, `suggested_supplier`
- timestamps.

### `inventory_lots` (normalizar lote/caducidad)
- `id`, `organization_id`, `inventory_item_id`
- `lot_code`, `expiration_date`, `current_qty`
- unique recomendado: `(organization_id, inventory_item_id, lot_code)`.

### `inventory_movements`
- `id`, `organization_id`, `inventory_item_id`, `inventory_lot_id nullable`
- `movement_type` enum (`in`, `out`, `adjust`, `return`, `waste`)
- `qty`, `unit`, `movement_date`, `notes`
- `ref_type` enum (`requisition`, `execution`, `adjustment`, `manual`)
- `ref_id` (uuid/text según estrategia)
- `created_by`, timestamps.

---

## 3.6 Nómina variable + Cosechas

### `employees`
- `id`, `organization_id`, `full_name`, `position`
- `payment_type` enum (`diario`, `semanal`)
- `pay_scheme_default` enum (`diario`, `por_tarea`, `por_unidad`)
- `base_salary`, `daily_rate`, `task_rate`, `unit_rate`
- `is_active`, `hire_date`, `notes`, timestamps.

### `payroll_periods`
- `id`, `organization_id`, `name`, `start_date`, `end_date`, `status` enum (`draft`, `calculated`, `paid`), timestamps.

### `payroll_records`
- `id`, `organization_id`, `period_id`, `employee_id`
- `days_worked`, `extra_hours`, `bonus`, `discount`, `gross_total`, `net_total`
- `payment_method` enum (`efectivo`, `transferencia`)
- `reference`, `paid_at`, `notes`.

### `activity_rates`
- `id`, `organization_id`
- `activity`, `unit` enum (`dia`, `caja`, `kg`, `planta`, `surco`, `ha`)
- `rate`
- contexto nullable: `ranch_id`, `crop_id`, `season_id`
- timestamps.

### `work_logs`
- `id`, `organization_id`, `employee_id`, `date`
- `ranch_id nullable`, `activity`
- `pay_type` enum (`diario`, `por_tarea`, `por_unidad`)
- `units nullable`, `rate_used`, `amount`
- `status` enum (`open`, `paid`)
- `payment_id nullable`, `notes`, timestamps.

### `payments`
- `id`, `organization_id`, `employee_id`
- `type` enum (`period`, `manual`)
- `date`, `start_date nullable`, `end_date nullable`
- `amount`, `note`, timestamps.

### `payment_work_logs` (join)
- `payment_id`, `work_log_id`, `organization_id`.

### `harvests`
- `id`, `organization_id`
- `date`, `ranch_id`, `crop_id`, `season_id`, `sector_id`
- `unit`, `total_quantity`
- `activity`, `rate`, `total_paid`, `unit_cost`
- timestamps.

### `harvest_crews`
- `id`, `organization_id`, `harvest_id`, `employee_id`, `units`.

### `harvest_work_logs` (join)
- `harvest_id`, `work_log_id`, `organization_id`.

---

## 3.7 Recomendaciones (y Excel)

### `recommendations`
- `id`, `organization_id`
- `mode` enum (`foliar_drench`, `via_riego`)
- `title`
- contexto texto/FK: `ranch_id` o `huerta_text`, `ranch_crop_season_id`, `sector_id`, `valve_id`
- campos de encabezado: `solicita`, `modo_aplicacion`, `justificacion`, `fecha_recomendacion`, `semana`, `equipo_aplicacion`, `operario`, `fecha_aplicacion`, `ph_mezcla`, `hora_inicio`, `hora_fin`, `comentarios`, `superficie`
- timestamps.

### `recommendation_products`
- `id`, `organization_id`, `recommendation_id`
- `product_name`, `active_ingredient`, `dosis`, `gasto`, `gasto_total`, `sector`.

### `recommendation_irrigation_rows`
- `id`, `organization_id`, `recommendation_id`, `sector_id nullable`, `valve_id nullable`, `surface`, `products jsonb`.

### `recommendation_exports` (opcional)
- `id`, `organization_id`, `recommendation_id`, `export_type` (`xlsx`), `file_path`, timestamps.

---

## 4) Enums propuestos (catálogo inicial)

- `app_role`: `admin`, `compras`, `campo`, `supervisor`
- `requisition_status`: `pending`, `in_review`, `in_comparative`, `approved`, `rejected`, `completed`
- `requisition_item_type`: `agroquimico`, `insumo_general`, `benefico`
- `application_mode`: `foliar_drench`, `via_riego`
- `application_execution_status`: `draft`, `posted_out`, `closed`
- `inventory_movement_type`: `in`, `out`, `adjust`, `return`, `waste`
- `inventory_ref_type`: `requisition`, `execution`, `adjustment`, `manual`
- `monitoring_type`: `desarrollo`, `nutricion`
- `monitoring_session_status`: `in_progress`, `paused`, `completed`
- `weather_condition`: `soleado`, `nublado`, `lluvia`, `viento`, `otro`
- `phenological_stage`: `vegetativa`, `floracion`, `fructificacion`, `cosecha`, `poda`
- `production_system`: `hidroponico`, `suelo`
- `finding_type`: `plaga`, `enfermedad`, `insectos_beneficos`, `desarrollo`, `nutricion`
- `finding_severity`: `baja`, `media`, `alta`
- `employee_payment_type`: `diario`, `semanal`
- `pay_scheme`: `diario`, `por_tarea`, `por_unidad`
- `payroll_period_status`: `draft`, `calculated`, `paid`
- `payment_method`: `efectivo`, `transferencia`
- `work_log_status`: `open`, `paid`
- `payment_type`: `period`, `manual`

---

## 5) RLS propuesta (organization_id + roles)

## 5.1 Base común
1. Activar RLS en todas las tablas de negocio.
2. Política base de lectura/escritura por tenant:
   - `organization_id = (select organization_id from profiles where id = auth.uid())`
3. Inserts: forzar `organization_id` vía default trigger o función RPC para evitar spoofing.

## 5.2 Matriz de permisos sugerida

- **admin**
  - CRUD total en todos los módulos.
- **compras**
  - CRUD en requisiciones, ejecuciones, inventario, recomendaciones.
  - Lectura en estructura, monitoreos, cosechas.
  - Sin edición de nómina (salvo lectura limitada opcional).
- **campo**
  - Crear/editar monitoreos, cosechas, work_logs.
  - Crear requisiciones (no aprobar).
  - Lectura inventario; salidas sólo vía ejecución autorizada.
- **supervisor**
  - Aprobar/rechazar requisiciones.
  - Cerrar ejecuciones, validar monitoreos, ver reportes completos.
  - Lectura global y edición selectiva en catálogos operativos.

## 5.3 Implementación recomendada en Supabase
- Función SQL estable: `current_user_role()` y `current_org_id()`.
- Policies por tabla usando helper functions.
- Para reglas finas (ej. cambiar estado a approved/rejected), usar **RPC SECURITY DEFINER** (`approve_requisition`, `close_execution`) y restringir UPDATE directo de columnas sensibles.

---

## 6) ¿Qué va en JSONB vs tablas normales?

### Mantener en **tablas normales**
- Entidades transaccionales y de referencia que se consultan/filtran constantemente:
  - estructura (operation/ranch/sector/tunnel/valve)
  - requisiciones, items
  - inventario, lotes, movimientos
  - nómina (employees, periods, worklogs, payments)
  - cosechas y crew
  - recomendaciones (encabezado + productos)

### Mantener en **JSONB**
- Información de forma variable o altamente dinámica:
  1. `monitoring_plants.metrics` (llaves cambiantes por tipo/etapa/sistema)
  2. `requisition_items.metadata` (campos de plaguicida/target con variación de dataset)
  3. `application_executions.header` (si el formato de hoja operativa sigue evolucionando)
  4. `monitoring_sessions.config` / umbrales (si no se requiere analítica SQL compleja inicial)

### Regla práctica
- Si se necesita **filtro/aggregate frecuente** en SQL → normalizar columna/tabla.
- Si el campo cambia seguido y es mayormente de captura/render → JSONB.

---

## 7) Diagrama textual (alto nivel)

- `organizations` 1─* `profiles`
- `organizations` 1─* `operations` 1─* `ranches` 1─* `sectors` 1─* `tunnels`
- `sectors` 1─* `valves` (con `tunnel_id` opcional)
- `organizations` 1─* `crops`, 1─* `seasons`
- `ranches` *─* (`ranch_crop_seasons`) *─* `crops` + `seasons`
- `requisitions` 1─* `requisition_items`
- `requisitions` 1─* `application_executions` 1─* `application_lines`
- `application_executions` 1─* `application_irrigation_rows`
- `inventory_items` 1─* `inventory_lots` 1─* `inventory_movements`
- `monitoring_sessions` 1─* `monitoring_sectors` 1─* `monitoring_points` 1─* `monitoring_plants` 1─* `monitoring_findings`
- `employees` 1─* `work_logs` *─* `payments` (vía `payment_work_logs`)
- `payroll_periods` 1─* `payroll_records`
- `harvests` 1─* `harvest_crews`
- `harvests` *─* `work_logs` (vía `harvest_work_logs`)
- `recommendations` 1─* `recommendation_products`
- `recommendations` 1─* `recommendation_irrigation_rows`

---

## 8) Orden sugerido de migrations

1. **Base y extensiones**
   - extensiones (`pgcrypto`, etc.), timestamps helpers.
2. **Tenant + seguridad**
   - `organizations`, `profiles`, enum `app_role`, funciones `current_org_id/current_user_role`.
3. **Catálogo operativo**
   - operations/ranches/sectors/tunnels/valves/crops/seasons/ranch_crop_seasons.
4. **Requisiciones**
   - requisitions, requisition_items, requisition_attachments + enums.
5. **Ejecución de requisiciones**
   - application_executions, application_lines, application_irrigation_rows.
6. **Inventario**
   - inventory_items, inventory_lots, inventory_movements + enums.
7. **Monitoreos**
   - monitoring_sessions + jerarquía sector/punto/planta/hallazgo.
8. **Nómina**
   - employees, activity_rates, payroll_periods, payroll_records, work_logs, payments, payment_work_logs.
9. **Cosechas**
   - harvests, harvest_crews, harvest_work_logs.
10. **Recomendaciones y exportaciones**
    - recommendations, recommendation_products, recommendation_irrigation_rows, recommendation_exports.
11. **RLS por tabla**
    - políticas por tenant + rol.
12. **RPCs de negocio críticas**
    - aprobar requisición, cerrar ejecución, postear movimientos inventario, crear pago de periodo.
13. **Índices/optimización final**
    - índices por tenant, fechas, estado, y FK de reportes más usados.

---

## 9) Notas de implementación para la siguiente fase

- Mantener nombres internos en inglés (consistencia SQL), UI en español.
- Definir desde inicio la estrategia de folio (`REQ-0001`, `MON-0001`) con secuencias por organización.
- Para archivos (adjuntos y Excel), usar bucket por tenant (`org/<organization_id>/...`) y guardar metadatos en tablas.
- Preparar vistas/materialized views para dashboards (pendientes, stock bajo, costo cosecha, etc.).

