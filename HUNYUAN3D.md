# Integración Hunyuan3D en Gemelos3D

## Arquitectura

- **Frontend Vercel:** `ia-generativa.html`, carga de prompts, imágenes, estados y descarga.
- **Backend GPU:** servicio local o servidor propio que ejecute Hunyuan3D.
- **Almacenamiento:** archivos GLB/OBJ/texturas generados.
- **Postproceso:** validación de malla, escala, reparación y exportación STL.

## Flujo previsto

1. El usuario escribe una descripción o selecciona una imagen.
2. El frontend envía un trabajo al backend GPU.
3. El backend ejecuta Hunyuan3D-DiT para generar la geometría.
4. Opcionalmente ejecuta Hunyuan3D-Paint para materiales y texturas.
5. Devuelve un GLB/OBJ y metadatos.
6. Gemelos3D muestra el modelo y ofrece exportación.

## Contrato HTTP propuesto

### `POST /api/generate-3d`

```json
{
  "prompt": "figura de zorro low-poly",
  "image": null,
  "mode": "shape",
  "format": "glb"
}
```

Respuesta inicial:

```json
{
  "jobId": "job-123",
  "status": "queued"
}
```

### `GET /api/generate-3d/:jobId`

```json
{
  "jobId": "job-123",
  "status": "completed",
  "modelUrl": "https://.../modelo.glb",
  "textureUrl": null
}
```

## Importante

Vercel no debe ejecutar directamente PyTorch/Hunyuan3D pesado. La interfaz puede permanecer en Vercel, mientras que el motor se ejecuta en una máquina con GPU o en infraestructura aprobada explícitamente.

El modo demo de `ia-generativa.html` no representa una generación real de Hunyuan3D. Hasta conectar el backend, debe mostrarse como demo/local.

## Orden de implementación

1. Preparar backend local con endpoint compatible.
2. Agregar estados `queued`, `running`, `completed`, `error` al frontend.
3. Conectar visor GLB/OBJ.
4. Agregar reparación y validación para impresión 3D.
5. Mantener el CAD paramétrico para piezas funcionales exactas.
