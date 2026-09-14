# Motor IA gratuito de Gemelos 3D

Gemelos 3D no depende de una API de generación paga para su arquitectura principal.

## Objetivo

`crear-ia.html` funciona como interfaz de generación y entrega un modelo GLB al Taller. El backend de generación queda desacoplado para poder ejecutar un modelo open-source en una máquina con GPU, sin enviar claves privadas ni cobrar por cada generación.

## Motor recomendado

TRELLIS es la primera opción para investigar para Texto → 3D porque su proyecto publica modelos para text-to-3D y mesh, con licencia MIT para el núcleo. Requiere GPU; no se debe prometer generación gratuita en Vercel porque Vercel no aporta una GPU gratuita para ejecutar este tipo de inferencia.

## Contrato del adaptador

El motor local debe exponer:

- `POST /generate` con `{ "prompt": "..." }`
- respuesta `{ "jobId": "..." }`
- `GET /generate/:jobId`
- respuesta `{ "status": "queued|running|success|failed", "progress": 0-100, "modelUrl": "..." }`

El frontend de Gemelos 3D ya utiliza un contrato equivalente mediante `/api/generate-3d`.

## Regla de costo

No agregar servicios que requieran pago, créditos o suscripciones. Si un motor necesita GPU, la opción gratuita debe ejecutarse en hardware del usuario o en una infraestructura gratuita disponible; nunca se debe introducir automáticamente un proveedor con facturación.
