# Análisis competitivo — Gemelos 3D vs. Área Maker

## Objetivo

Comparar capacidades de producto sin confundir una herramienta visual con una capacidad de fabricación realmente ejecutable.

> **Regla:** una función sólo se considera paridad si existe una ruta ejecutable, produce una salida utilizable y tiene un criterio de aceptación verificable.

## Área Maker

Área Maker se presenta actualmente como una plataforma integral para talleres 3D, con calculadora de costos, librería STL, CRM, tienda, IA y comunidad. citeturn0search0

El relevamiento funcional usado como referencia para Gemelos 3D identifica estas herramientas específicas:

| Capacidad | Área Maker | Gemelos 3D | Prioridad |
|---|---|---|---|
| Texto 3D / letras corpóreas | Sí | Sí, funcional | Mantener |
| STL Cutter | Sí | Parcial | Alta |
| Espigas / encastres automáticos | Sí | Pendiente | Alta |
| Separación por color | Sí | Pendiente | Media |
| Moldes de silicona | Sí | Pendiente | Media |
| Cookie cutters | Sí | Pendiente | Media |
| Texturas / bumpmesh | Sí | Pendiente | Baja |
| Flujo proyecto → fabricación | Parcial / distribuido | Sí, objetivo central | Alta |
| Multi-cama | Limitado según herramienta | Parcial | Alta |
| IA local gratuita | No verificado como capacidad equivalente | En arquitectura | Alta |
| Sin login para probar | No es la propuesta principal actual | Sí | Diferenciador |

## Posicionamiento de Gemelos 3D

El diferencial no debe ser "tener más herramientas". Debe ser **un flujo continuo de fabricación**:

`Idea → Diseño/Importación → Proyecto → Taller 3D → Piezas → STL`

La ventaja competitiva buscada es que las decisiones de fabricación (cama, margen, purga, división, acomodado y exportación) permanezcan dentro del mismo proyecto.

## Riesgo detectado

El informe externo describe el núcleo como "CSG real con three-bvh-csg", pero la auditoría del código actual de `src/app.js` no confirma esa afirmación. La implementación observada usa `polygon-clipping` para recortar contornos de texto y luego los extruye. Por eso CSG general sobre mallas arbitrarias queda clasificado como **pendiente** hasta que exista una ruta ejecutable y testeada.

Del mismo modo, el packing actual debe tratarse como **parcial** hasta integrar una estrategia explícita de orientación 0°/90°, área útil y keepout.

## Roadmap competitivo

### P0 — Núcleo confiable

- Área útil independiente de la UI.
- Keepout de purga explícito.
- Packing con 0°/90°.
- Rechazo explícito de piezas que no entran.
- Tests de dimensiones y colocación.

### P1 — Paridad con STL Cutter

- Plano de corte óptimo.
- División X/Y real sobre geometría soportada.
- Validación de resultado.
- Espigas/pines configurables.
- Exportación de piezas y proyecto reproducible.

### P2 — Diferenciación

- Motor IA local.
- Importación normalizada a mm.
- Vista previa y validación antes del Taller.

### P3 — Suite de herramientas

- Separador por color.
- Moldes.
- Cookie cutters.
- Integración con slicers.

## Métricas

- porcentaje de proyectos que llegan a Taller;
- porcentaje de divisiones exportadas sin intervención manual;
- piezas rechazadas por no-fit;
- tiempo medio desde proyecto hasta primer STL;
- proyectos recuperados correctamente tras cerrar el navegador;
- número de exportaciones STL;
- porcentaje de funciones marcadas como Implementado con evidencia ejecutable.

## Fuente externa

La página pública actual de Área Maker describe una propuesta más amplia de plataforma (costos, librería, CRM, tienda, IA y comunidad), por lo que esta comparación se limita a las capacidades de herramientas indicadas en el relevamiento y no pretende ser una auditoría exhaustiva del producto competidor. citeturn0search0
