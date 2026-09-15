# Gemelos 3D — plan de evolución

## Objetivo

Convertir Gemelos 3D en una herramienta de fabricación 3D coherente de punta a punta: una idea entra, se convierte en geometría, se configura, se revisa y termina en piezas/camas listas para fabricar.

## Fase 0 — Base confiable (actual)

- [x] Estado de proyecto y almacenamiento centralizado.
- [x] Flujo Idea → Crear / Importar / Buscar / SVG → Proyecto → Taller.
- [x] Visual unificada en las páginas principales.
- [x] Taller 3D funcional para el flujo actual.
- [x] Auditoría de capacidades reales frente a claims históricos.
- [x] Núcleo puro de cama: dimensiones, margen, purga y keepout.
- [x] Núcleo puro de packing: orientación 0°/90°, múltiples camas y rechazos explícitos.
- [x] Primer set de tests sin dependencia paga.

## Fase 1 — Fabricación robusta (siguiente)

1. Integrar `src/core/bed.js` y `src/core/pack.js` en el Taller real sin duplicar reglas.
2. Reemplazar el packing local duplicado por un único motor.
3. Mostrar piezas rechazadas y motivo en la interfaz.
4. Agregar medición normalizada en mm y una capa `measure` compartida.
5. Separar cálculo de layout, geometría y renderizado para que el Taller sea mantenible.
6. Tests de regresión para margen, purga, rotación, múltiples camas y exportación.

## Fase 2 — Geometría avanzada

1. Separación real de modelos 3D importados, no solo texto/vector.
2. Cortes con geometría robusta y tolerancias.
3. Uniones/pasadores configurables.
4. Validación de sólidos/manifold antes de exportar.
5. Worker para operaciones pesadas de CSG y evitar bloquear la UI.
6. Optimización de memoria para modelos grandes.

## Fase 3 — IA local y búsqueda

1. Contrato único para Texto → 3D e Imagen → 3D.
2. Motor local opcional, sin API paga obligatoria.
3. Estado de generación persistente y recuperable.
4. Mejorar Buscar modelos con filtros y handoff directo a Proyecto.
5. Mantener proveedores externos como opcionales, nunca como dependencia del flujo básico.

## Fase 4 — Producto profesional

1. Historial/versionado de proyectos.
2. Recuperación automática de sesiones.
3. Exportación múltiple y presets de impresora.
4. Métricas de fabricación: utilización de cama, piezas rechazadas y tiempo de preparación.
5. QA automatizado de los flujos principales con navegador.
6. Pulido visual transversal y responsive.

## Orden de prioridad

**P0:** confiabilidad del core → integración del packing → tests → recuperación.

**P1:** cortes/medición/uniones → importación común → IA local.

**P2:** CSG worker → optimización → QA de navegador → prestaciones profesionales.

## Regla del proyecto

No se marca una capacidad como terminada por tener una pantalla o un botón. Se considera terminada cuando existe implementación real, estado persistente cuando corresponde, validación de errores y una prueba reproducible.
