# Núcleo de fabricación

El flujo puro de fabricación de Gemelos 3D queda dividido en cuatro contratos:

1. `fabrication-plan.js`: normaliza entradas y genera el plan de camas.
2. `fabrication-project.js`: convierte el plan en estado serializable del proyecto.
3. `fabrication-recovery.js`: reconstruye un estado seguro para la UI.
4. `fabrication-pipeline.js`: encadena los tres pasos sin depender de DOM ni Three.js.

## Flujo

`items medidos (mm) → plan → estado de proyecto → recuperación`

El núcleo conserva explícitamente piezas rechazadas. Una pieza no puede desaparecer silenciosamente entre planificación y persistencia.

La integración visual con `app-bedflow.js` queda separada de este núcleo para evitar mezclar lógica de fabricación con renderizado. El siguiente trabajo de producto puede consumir `buildFabricationPipeline()` desde el Taller y aplicar sus placements a la escena.
