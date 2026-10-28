/** Prueba la función de IA con la API de Anthropic simulada (no gasta créditos). */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import handler, { sanitize } from '../api/disenar.js';

function mockRes() {
  const r = { code: 200, body: null, headers: {} };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}
let sent;
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test';
  delete process.env.LAB_PASSWORD;
  globalThis.fetch = async (url, opts) => {
    sent = { url, body: JSON.parse(opts.body), headers: opts.headers };
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'tool_use', name: 'armar_diseno', input: {
      nota: 'Caja con agujero', reemplazar: false,
      objetos: [
        { type: 'box', x: 0, y: 0, z: 0, w: 60, d: 40, h: 10, color: '#ff0000', group: 'caja' },
        { type: 'cylinder', x: 0, y: 0, z: -1, w: 5, d: 5, h: 12, hole: true, group: 'caja' },
        { type: 'nave_espacial', x: 0, y: 0, z: 0, w: 1, d: 1, h: 1 },
        { type: 'text', x: 0, y: 30, z: 0, w: 9999, d: 8, h: 2, text: 'Hola', font: 'comic-sans' },
      ] } }], usage: { input_tokens: 10, output_tokens: 20 } }) };
  };
});

test('arma el pedido con la herramienta forzada y sanea la respuesta', async () => {
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: { prompt: 'una caja de 60x40 con un agujero de 5 mm' } }, res);
  assert.equal(res.code, 200);
  assert.equal(sent.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(sent.headers['anthropic-version'], '2023-06-01');
  assert.deepEqual(sent.body.tool_choice, { type: 'tool', name: 'armar_diseno' });
  assert.equal(res.body.objects.length, 3, 'descarta el tipo desconocido');
  assert.equal(res.body.objects[0].color, '#FF0000');
  assert.equal(res.body.objects[2].w, 400, 'limita medidas absurdas');
  assert.equal(res.body.objects[2].font, 'baloo', 'cambia tipografías desconocidas');
});

test('sin clave avisa que falta configurarla', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: { prompt: 'x' } }, res);
  assert.equal(res.code, 503); assert.equal(res.body.code, 'no_key');
});

test('con clave del Lab la exige', async () => {
  process.env.LAB_PASSWORD = 'secreto';
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: { prompt: 'x' } }, res);
  assert.equal(res.code, 401);
  const ok = mockRes();
  await handler({ method: 'POST', headers: { 'x-lab-password': 'secreto' }, body: { prompt: 'x' } }, ok);
  assert.equal(ok.code, 200);
});

test('sanitize ignora basura', () => {
  assert.deepEqual(sanitize(null), []);
  assert.equal(sanitize([{ type: 'box', x: 'a', w: -5 }])[0].w, 0.2);
});
