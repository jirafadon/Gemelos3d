# Backend local de Gemelos3D

Backend HTTP mínimo, sin dependencias, compatible con el contrato preparado para Hunyuan3D.

## Ejecutar

```bash
python backend/server.py
```

Queda disponible en `http://127.0.0.1:8787`.

## Endpoints

- `GET /health`
- `POST /api/generate-3d`
- `GET /api/generate-3d/{jobId}`

Actualmente devuelve trabajos simulados y no ejecuta PyTorch ni Hunyuan3D. El punto de integración real es `simulate_generation()` en `server.py`.

## Ejemplo

```bash
curl http://127.0.0.1:8787/health
curl -X POST http://127.0.0.1:8787/api/generate-3d \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"un jarrón futurista","format":"glb"}'
```
