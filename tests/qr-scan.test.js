/** Rasteriza el QR generado y lo lee con jsQR para confirmar que escanea. */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import jsQR from 'jsqr';
import { setWasm } from '../src/engine/geom.js';
import { qrShape, wifiPayload } from '../src/engine/qr.js';

before(async () => { const w = await Module(); w.setup(); setWasm(w); });

function rasterize(shape, size, px = 4) {
  const polys = shape.toPolygons();
  const n = Math.ceil(size * px) + 40, img = new Uint8ClampedArray(n * n * 4).fill(255);
  const inside = (x, y) => { let c = false; for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = (c - n / 2) / px, y = (n / 2 - r) / px;
    if (inside(x, y)) { const k = (r * n + c) * 4; img[k] = img[k + 1] = img[k + 2] = 0; }
  }
  return { data: img, n };
}

for (const text of ['https://gemelos3d.com.ar', 'Peña ñandú', wifiPayload('Casa', 'clave1234')]) {
  test(`el QR se lee: ${text}`, () => {
    const { shape } = qrShape(text, 30);
    const { data, n } = rasterize(shape, 30);
    const res = jsQR(data, n, n);
    assert.ok(res, 'jsQR no encontró el código');
    assert.equal(res.data, text);
  });
}
