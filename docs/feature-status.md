# Estado real de features — Gemelos 3D

> Auditoría del estado actual de `main`.
>
> **Regla:** una feature sólo se considera **Implementada** si existe código ejecutable que produzca el resultado físico/operativo prometido. La presencia de controles, textos o estados visuales no alcanza.

## Núcleo de fabricación

| Feature | Estado | Evidencia actual | Observación |
|---|---|---|---|
| Selección de impresora | **Implementado** | `src/app.js` → `dims()` | Snapmaker U1 y personalizada entregan X/Y/Z utilizables |
| Margen de seguridad | **Implementado** | `src/core/bed.js` | Área útil normalizada y testeable |
| Reserva de purga | **Implementado** | `src/core/bed.js` + `src/core/pack.js` | Se modela como keepout rectangular durante el packing |
| Cálculo de cama útil | **Implementado** | `src/core/bed.js` | Regla centralizada para margen/purga |
| Validación de piezas | **Implementado** | `src/core/fabrication-validation.js` | Dimensiones inválidas e IDs duplicados producen rechazos explícitos |
| Acomodado automático | **Implementado** | `src/core/pack.js` | Motor puro con múltiples camas |
| Rotación 90° durante packing | **Implementado** | `src/core/pack.js` | Prueba ambas orientaciones cuando corresponde |
| Rechazo de piezas no acomodables | **Implementado** | `src/core/fabrication-plan.js` | No se pierden piezas silenciosamente; quedan con motivo |
| Plan de fabricación serializable | **Implementado** | `src/core/fabrication-plan.js` | Incluye camas, colocaciones, rechazos y resumen |
| Integración del plan con proyecto | **Implementado** | `src/core/fabrication-project.js` | Colocaciones y rechazos quedan persistidos en `fabrication` |
| Recuperación de fabricación | **Implementado** | `src/core/fabrication-recovery.js` | Reconstruye camas, piezas, colocadas/rechazadas y selección |
| Persistencia del Taller | **Implementado** | `src/core/taller-fabrication-persistence.js` | Planificación del Taller se guarda y puede recuperarse |
| Eventos Taller ↔ Fabricación | **Implementado** | `src/core/taller-fabrication-events.js` | Contrato explícito de request/result |
| Exportación STL | **Implementado** | `src/app.js` → `exportObjects()` / `exportBed()` | STL por proyecto, cama y pieza |
| CSG con `three-bvh-csg` | **Pendiente** | No hay ruta ejecutable verificada en el estado auditado | No marcar como implementado hasta existir integración real y tests |
| Optimización avanzada de cortes | **Pendiente** | El core actual usa packing determinista, no optimización global | Etapa posterior |
| Encastres / uniones | **Pendiente** | Sin motor de joints | Etapa posterior |

## Flujo de proyecto

| Feature | Estado | Evidencia |
|---|---|---|
| Proyectos persistentes | **Implementado** | `src/project/project-storage.js` |
| Carga de proyecto por URL | **Implementado** | `src/app.js` → `loadProjectFromUrl()` |
| Autosave del Taller | **Implementado** | `src/project/taller-autosave.js` + integración del entrypoint |
| Recuperación de sesión | **Implementado** | Persistencia, carga y recuperación de fabricación; existe prueba de roundtrip |
| Versionado/migración de sesión | **Implementado** | `src/project/project-state.js` |

## Páginas

| Feature | Estado | Evidencia | Nota |
|---|---|---|---|
| Inicio | **Implementado** | `index.html` | Navegación y jerarquía visual |
| Crear con IA | **Implementado parcialmente** | `crear-ia.html` | Generación local/reglas + exportación; no equivale a un modelo generativo 3D general |
| Importar modelo | **Implementado** | `importar-modelo.html` | Loaders existentes y handoff al proyecto/taller |
| SVG → 3D | **Implementado** | `svg-3d.html` | Conversión local + exportación/handoff |
| Buscar modelos | **Implementado parcialmente** | `buscar-modelos.html` | Catálogo externo vía iframe; todavía sin capa propia completa de proveedores/importación |
| Taller 3D | **Implementado** | `app.html` + módulos del workspace | Núcleo actual de fabricación, persistencia y exportación |

## Límites conocidos

1. El packing actual es determinista y funcional, pero todavía no es un optimizador global de desperdicio.
2. La división de geometría avanzada y el CSG general siguen pendientes.
3. Los encastres/uniones configurables siguen pendientes.
4. `bevel` debe seguir considerándose una configuración visual hasta que la ruta geométrica visible lo aplique de forma verificable.
5. La QA de navegador y las pruebas de exportación geométrica profunda son el siguiente escalón de calidad.

## Próxima acción recomendada

Con el núcleo de fabricación ya separado, testeable, persistente y recuperable, la siguiente fase debe enfocarse en **geometría avanzada y QA**, no en seguir duplicando lógica dentro del Taller.
