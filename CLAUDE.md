# Croplink ERP — CLAUDE.md

Este documento define reglas y contexto para trabajar en el repo Croplink ERP.
Cualquier cambio debe respetar estas reglas.

## Stack
- React + Vite + TypeScript
- TailwindCSS
- Supabase (Postgres + Auth + RLS)
- Deploy: Vercel

## Objetivo del producto
ERP agrícola multi-tenant (por organización). El sistema debe operar con datos reales, sin mocks ni seeds visibles.

## Reglas obligatorias (NO negociables)
- NO inventar mocks, seeds demo, catálogos hardcodeados (salvo datos de UI/placeholder no productivo).
- NO guardar datos de negocio en localStorage (solo IDs de contexto UI).
- NO tocar secrets ni pedir contraseñas.
- NO romper UI ni rediseñar radicalmente.
- Mantener TypeScript fuerte (evitar `any`).
- Mantener build pasando: `npm run build`.
- Preferir cambios pequeños, PRs pequeños.

## Multi-tenant / Seguridad
- Toda entidad de negocio debe estar aislada por `organization_id`.
- Confiar en RLS en Supabase, pero aplicar “defensa en profundidad”:
  - en queries importantes, filtrar explícitamente por `organization_id` cuando aplique.
- `organization_id` debe venir del perfil real del usuario (`profiles.organization_id`) o helper equivalente.
- Roles: vienen de `profiles.role` (no localStorage).

## Auth
- Supabase Auth
- `profiles` existe y contiene `role` + `organization_id`.
- `RequireRole` debe depender de profile real del AuthProvider.
- Auth redirects deben soportar:
  - https://croplink.com.mx/**
  - https://www.croplink.com.mx/**

## Persistencia local permitida
- Solo IDs de contexto operativo por usuario:
  - selectedOperationId, selectedRanchId, selectedSectorId, selectedTunnelId, selectedValveId
  - selectedCropId, selectedSeasonId, selectedRanchCropSeasonId
- NO persistir listas, catálogos ni bundles de negocio.

## Módulos del ERP (deben usar Supabase real)
- Estructura: operations, ranches, sectors, tunnels, valves, crops, seasons, ranch_crop_seasons
- Contexto operativo: selects encadenados desde Supabase
- Requisiciones: requisitions, requisition_items
- Ejecución: application_executions, application_lines, application_irrigation_rows
- Inventario: inventory_items, inventory_movements
- Monitoreos: monitoring_* (sesiones, puntos, plantas, hallazgos)
- Nómina: employees, payroll_*
- Cosechas: harvests, harvest_crews, etc.
- Activos: assets, asset_maintenance_records
- Recomendaciones: recommendations + calendario/export

## Deploy (Vercel)
- Es SPA con React Router:
  - debe existir `vercel.json` con rewrite a `/index.html` para evitar 404 en rutas profundas.

## Estilo de entrega (cómo debes responder)
Para cada cambio:
1) Resumen breve
2) Lista de archivos tocados
3) Comandos para validar:
   - npm run build
   - npm run lint (si aplica)
4) Riesgos o pendientes reales (si existen)