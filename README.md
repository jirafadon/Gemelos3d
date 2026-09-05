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
- Estimación de cantidad de piezas cuando el ancho supera la cama.
- Exportación STL.
- Guardado de parámetros como JSON.

### Límite explícito de esta etapa
La división mostrada es una **estimación por caracteres**. Todavía no corta físicamente una letra única que sea demasiado grande ni genera automáticamente STL independientes con encastres. Eso corresponde al Proyecto 04.

### Cómo probar
Abrir `index.html` en un navegador moderno con conexión a Internet. Los módulos Three.js se cargan desde CDN.

### Regla de producto
Gemelos 3D debe distinguir siempre entre una función visual/prototipo y una función de fabricación realmente implementada.
