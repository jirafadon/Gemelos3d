# Gemelos 3D

## Proyecto 01 — Núcleo de fabricación

Base funcional de Gemelos 3D para preparar piezas 3D, acomodarlas en camas de impresión y exportarlas.

### Incluye actualmente
- Selección de impresora.
- Snapmaker U1 con volumen 270 × 270 × 270 mm.
- Impresora personalizada.
- Margen de seguridad.
- Texto 3D en milímetros.
- Visualización 3D.
- Cálculo de dimensiones X/Y/Z.
- Detección de ajuste contra cama útil.
- División física de texto sobredimensionado mediante clipping 2D + extrusión.
- Acomodado automático en una o varias camas.
- Reserva configurable de área para torre de purga.
- Exportación STL.
- Guardado/persistencia de proyectos y recuperación del Taller.

### Estado de la división física
La división de texto grande está **implementada realmente** en la ruta actual del Taller. `src/app.js` genera los contornos de cada carácter, los recorta contra regiones de la cama mediante `polygon-clipping` y vuelve a extruir los fragmentos resultantes.

Esto **no debe confundirse** con un motor general de corte CSG sobre mallas arbitrarias. La auditoría actual no encuentra una ruta ejecutable de `three-bvh-csg` en `src/app.js`, por lo que CSG general, búsqueda de cortes óptimos y encastres/uniones siguen siendo trabajo pendiente.

### Acomodado y purga
La cama útil se calcula a partir de las dimensiones de la impresora, margen y reserva de purga. El estado actual acomoda piezas por filas, pero todavía no implementa una búsqueda completa de orientación 90° ni un modelo geométrico independiente de keepout.

### Regla de producto
Gemelos 3D debe distinguir siempre entre una función visual/prototipo y una función de fabricación realmente implementada.

El registro detallado de estado, evidencia y deuda técnica está en [`docs/feature-status.md`](docs/feature-status.md).

### Cómo probar
Abrir `index.html` en un navegador moderno con conexión a Internet. Los módulos Three.js se cargan desde CDN.
