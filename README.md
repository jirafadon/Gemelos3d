# Gemelos 3D

## Proyecto 01 — Núcleo de fabricación

Primera base funcional de Gemelos 3D.

### Incluye
- Selección de impresora.
- Snapmaker U1 con volumen 270 × 270 × 270 mm.
- Impresora personalizada.
- Margen de seguridad.
- Texto 3D en milímetros.
- Visualización 3D.
- Cálculo de dimensiones X/Y/Z.
- Detección de ajuste contra cama útil.
- División física de geometría sobredimensionada mediante CSG (`three-bvh-csg`).
- Generación de piezas independientes a partir de una letra que supera el ancho útil.
- Acomodado automático en una o varias camas, con rotación de 90°.
- Reserva configurable de área para torre de purga.
- Exportación STL.
- Guardado de parámetros como JSON.

### Estado de la división física
La división de piezas grandes **ya está implementada realmente**. `src/app.js` utiliza `three-bvh-csg` para intersectar la geometría con volúmenes de corte y generar piezas físicas independientes mediante `splitMeshByX()`.

La división profesional con búsqueda de cortes óptimos, encastres/uniones y optimización avanzada corresponde a etapas posteriores. No debe confundirse con una simple estimación por caracteres.

### Cómo probar
Abrir `index.html` en un navegador moderno con conexión a Internet. Los módulos Three.js se cargan desde CDN.

### Regla de producto
Gemelos 3D debe distinguir siempre entre una función visual/prototipo y una función de fabricación realmente implementada.
