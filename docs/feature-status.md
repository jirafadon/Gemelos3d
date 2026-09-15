# Estado real de features — Gemelos 3D

> Auditoría inicial del núcleo realizada sobre el estado actual de `main`.
>
> **Regla:** una feature sólo se considera **Implementada** si existe código ejecutable que produzca el resultado físico/operativo prometido. La presencia de controles, textos o estados visuales no alcanza.

## Núcleo de fabricación

| Feature | Estado | Evidencia actual | Criterio de aceptación | Observación |
|---|---|---|---|---|
| Selección de impresora | **Implementado** | `src/app.js` → `dims()` | Snapmaker U1 y personalizada entregan X/Y/Z utilizables | Verificar límites inválidos en QA |
| Margen de seguridad | **Implementado** | `src/app.js` → `bed()` | El margen reduce el área útil | Falta encapsular el modelo de cama |
| Reserva de purga | **Implementado parcialmente** | `src/app.js` → `purge()` / `bed()` | La reserva debe excluirse realmente del packing y estar representada con sus dos dimensiones | El modelo actual reduce X, pero `packNormalPieces()` no recibe una región keepout explícita |
| Cálculo de cama útil | **Implementado parcialmente** | `src/app.js` → `bed()` | Área útil consistente con margen + purga | Debe pasar a `core/bed.js` para evitar divergencias |
| Cálculo de dimensiones del texto | **Implementado** | `src/app.js` → `build()` | X/Y/Z visibles y coherentes con la geometría generada | Requiere casos de caracteres vacíos/raros |
| División física de geometría sobredimensionada | **Implementado para texto** | `src/app.js` → `build()`, `polygon-clipping` | Una letra que supera la cama produce fragmentos físicos exportables | **No corresponde al `splitMeshByX()` descrito en README**; actualmente la ruta visible usa clipping 2D + extrusión |
| CSG con `three-bvh-csg` | **Pendiente / no evidenciado en el estado actual** | No aparece en el `src/app.js` actual auditado | Booleanas robustas sobre mallas arbitrarias | No marcar como implementado hasta localizar una ruta ejecutable y verificable |
| Acomodado automático | **Implementado parcialmente** | `packNormalPieces()` | Colocar piezas sin salir del área útil | Actualmente no implementa búsqueda general de orientación 90° |
| Rotación 90° durante packing | **Pendiente** | No hay giro de piezas en `packNormalPieces()` | Probar ambas orientaciones y elegir una válida/mejor | El README afirma esta capacidad, pero el código auditado no la demuestra |
| Optimización de cortes | **Pendiente** | `optimize` sólo informa que queda pausada | Elegir cortes con criterio de piezas, detalles y desperdicio | No implementar hasta estabilizar core |
| Encastres / uniones | **Pendiente** | Sin motor de joints identificado | Generar geometría complementaria y exportable | Etapa posterior |
| Exportación STL | **Implementado** | `exportObjects()` / `exportBed()` | STL válido por proyecto, cama y pieza | Agregar pruebas de salida y geometría vacía |
| Guardado JSON descargable | **Implementado** | `saveProject()` | Descargar parámetros del taller | No confundir con persistencia de proyecto en `project-storage.js` |

## Flujo de proyecto

| Feature | Estado | Evidencia |
|---|---|---|
| Proyectos persistentes | **Implementado** | `src/project/project-storage.js` |
| Carga de proyecto por URL | **Implementado** | `src/app.js` → `loadProjectFromUrl()` |
| Autosave del Taller | **Implementado** | `src/project/taller-autosave.js` + integración del entrypoint |
| Recuperación de sesión | **Implementado parcialmente** | Persistencia y carga existen; falta QA automatizado de cierre/reapertura |
| Versionado/migración de sesión | **Implementado** | `src/project/project-state.js` |

## Páginas

| Feature | Estado | Evidencia | Nota |
|---|---|---|---|
| Inicio | **Implementado** | `index.html` | Navegación y jerarquía visual |
| Crear con IA | **Implementado parcialmente** | `crear-ia.html` | Generación local/reglas + exportación; no equivale a un modelo generativo 3D general |
| Importar modelo | **Implementado** | `importar-modelo.html` | Loaders existentes y handoff al proyecto/taller |
| SVG → 3D | **Implementado** | `svg-3d.html` | Conversión local + exportación/handoff |
| Buscar modelos | **Implementado parcialmente** | `buscar-modelos.html` | Catálogo externo vía iframe; no existe todavía capa propia de proveedores/importación |
| Taller 3D | **Implementado** | `app.html` + módulos del workspace | Núcleo actual de fabricación y exportación |

## Riesgos detectados en esta auditoría

1. **README desactualizado respecto del código:** describe `splitMeshByX()` y `three-bvh-csg`, mientras que el `src/app.js` auditado usa `polygon-clipping` para dividir el texto en 2D antes de extruirlo.
2. **Packing sin rotación real:** `packNormalPieces()` calcula ancho/alto y acomoda por filas, pero no prueba una orientación de 90°.
3. **Keepout de purga no está modelado como región geométrica:** `bed()` descuenta ancho, pero el packing recibe únicamente `b.x/b.y`. Esto dificulta garantizar el comportamiento ante reservas no rectangulares o cambios futuros.
4. **Piezas sobredimensionadas se pueden descartar silenciosamente:** `packNormalPieces()` hace `continue` cuando una pieza excede el área útil; el usuario debería recibir un resultado explícito de “no acomodable”.
5. **Los fragmentos de un carácter dividido se convierten en grupos independientes:** esto simplifica la presentación actual, pero todavía no es un algoritmo profesional de multi-pieza/multi-cama.
6. **`bevel` existe en UI/estado pero la ruta visible de `extrudePolygon()` fuerza `bevelEnabled:false`:** debe clasificarse como visual/configuración no aplicada hasta corregirlo o retirarlo.
7. **`saveProject()` de `src/app.js` descarga JSON:** la persistencia de proyectos vive en `project-storage.js`; ambas funciones deben mantenerse conceptualmente separadas.

## Próxima acción recomendada

Antes de agregar CSG, encastres o nuevos proveedores, extraer tres primitivas puras y testeables:

- `computeUsefulArea(bed)`
- `packPieces(pieces, area, {rotation:true})`
- `validatePlacement(piece, area)`

Después se puede reemplazar gradualmente la lógica equivalente de `src/app.js` sin tocar la experiencia visual del Taller.
