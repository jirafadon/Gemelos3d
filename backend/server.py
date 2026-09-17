"""Local backend compatible with Gemelos3D's Hunyuan3D job contract.

This is intentionally a dependency-free simulator. Replace simulate_generation()
with the real Hunyuan3D worker when GPU infrastructure is available.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import json
import threading
import time
import uuid

JOBS = {}
LOCK = threading.Lock()


def simulate_generation(job_id: str) -> None:
    time.sleep(2)
    with LOCK:
        job = JOBS.get(job_id)
        if job:
            job.update({
                "status": "completed",
                "progress": 100,
                "message": "Simulación terminada. Conecta aquí el worker Hunyuan3D.",
                "modelUrl": None,
            })


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_json(204, {})

    def do_POST(self):
        if urlparse(self.path).path != "/api/generate-3d":
            self.send_json(404, {"error": "Ruta no encontrada"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error": "JSON inválido"})
            return

        job_id = str(uuid.uuid4())
        job = {
            "jobId": job_id,
            "status": "queued",
            "progress": 0,
            "message": "Trabajo en cola",
            "modelUrl": None,
            "input": data,
        }
        with LOCK:
            JOBS[job_id] = job
        threading.Thread(target=simulate_generation, args=(job_id,), daemon=True).start()
        self.send_json(202, job)

    def do_GET(self):
        parts = urlparse(self.path).path.strip("/").split("/")
        if len(parts) == 3 and parts[:2] == ["api", "generate-3d"]:
            with LOCK:
                job = JOBS.get(parts[2])
            if not job:
                self.send_json(404, {"error": "Trabajo no encontrado"})
                return
            self.send_json(200, job)
            return
        if self.path == "/health":
            self.send_json(200, {"ok": True, "mode": "simulation"})
            return
        self.send_json(404, {"error": "Ruta no encontrada"})


if __name__ == "__main__":
    print("Gemelos3D local backend: http://127.0.0.1:8787")
    ThreadingHTTPServer(("127.0.0.1", 8787), Handler).serve_forever()
