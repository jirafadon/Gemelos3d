/**
 * Gabinete para electrónica: caja con postes para atornillar la placa (Arduino, ESP32,
 * fuentes, etc.), columnas en las esquinas para la tapa, aberturas para conectores
 * y ventilación opcional. Medidas por dentro. Caja y tapa se imprimen sin soportes.
 */
import { wasm, roundedRect, circle, slab, part } from '../engine/geom.js';
import { stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';

const BOARDS = {
  custom: { label: 'A medida', w: 70, d: 50, hx: 60, hy: 40 },
  uno: { label: 'Arduino Uno', w: 69, d: 54, hx: 50.8, hy: 48.3 },
  nano: { label: 'Arduino Nano (sin postes)', w: 45, d: 18, hx: 0, hy: 0 },
  esp32: { label: 'ESP32 DevKit (sin postes)', w: 56, d: 29, hx: 0, hy: 0 },
  rpi: { label: 'Raspberry Pi 4 / 5', w: 85, d: 56, hx: 58, hy: 49 },
};

export default {
  id: 'caja-electronica',
  title: 'Gabinete para electrónica',
  description: 'Caja con postes para la placa, tapa atornillada, aberturas para USB y ventilación.',
  fileName: v => `gabinete_${v.board}`,
  params: [
    { type: 'group', label: 'Placa' },
    { key: 'board', type: 'select', label: 'Placa', default: 'uno', options: Object.entries(BOARDS).map(([value, b]) => ({ value, label: b.label })) },
    { key: 'pw', type: 'number', label: 'Ancho de la placa', default: 70, min: 10, max: 250, step: 0.5, unit: 'mm', show: v => v.board === 'custom' },
    { key: 'pd', type: 'number', label: 'Fondo de la placa', default: 50, min: 10, max: 250, step: 0.5, unit: 'mm', show: v => v.board === 'custom' },
    { key: 'hx', type: 'number', label: 'Distancia entre agujeros (ancho)', default: 60, min: 0, max: 240, step: 0.1, unit: 'mm', show: v => v.board === 'custom', hint: '0 = sin postes.' },
    { key: 'hy', type: 'number', label: 'Distancia entre agujeros (fondo)', default: 40, min: 0, max: 240, step: 0.1, unit: 'mm', show: v => v.board === 'custom' },
    { key: 'clear', type: 'number', label: 'Espacio alrededor de la placa', default: 3, min: 0.5, max: 30, step: 0.5, unit: 'mm' },
    { key: 'inH', type: 'number', label: 'Alto interior', default: 30, min: 8, max: 150, step: 1, unit: 'mm' },
    { key: 'postH', type: 'number', label: 'Alto de los postes', default: 5, min: 2, max: 20, step: 0.5, unit: 'mm', show: v => (v.board === 'custom' ? v.hx > 0 : BOARDS[v.board].hx > 0) },

    { type: 'group', label: 'Aberturas' },
    { key: 'usb', type: 'toggle', label: 'Hueco para USB al frente', default: true },
    { key: 'usbW', type: 'number', label: 'Ancho del hueco USB', default: 13, min: 5, max: 40, step: 0.5, unit: 'mm', show: v => v.usb },
    { key: 'usbH', type: 'number', label: 'Alto del hueco USB', default: 8, min: 3, max: 30, step: 0.5, unit: 'mm', show: v => v.usb },
    { key: 'usbX', type: 'number', label: 'Corrimiento del USB', default: 0, min: -100, max: 100, step: 0.5, unit: 'mm', show: v => v.usb },
    { key: 'jack', type: 'toggle', label: 'Agujero redondo atrás (fuente / cable)', default: false },
    { key: 'jackD', type: 'number', label: 'Diámetro', default: 8, min: 3, max: 25, step: 0.5, unit: 'mm', show: v => v.jack },
    { key: 'vents', type: 'toggle', label: 'Ranuras de ventilación en la tapa', default: true },

    { type: 'group', label: 'Caja' },
    { key: 'wall', type: 'number', label: 'Pared', default: 2, min: 1.2, max: 5, step: 0.2, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo de esquinas', default: 4, min: 0, max: 15, step: 0.5, unit: 'mm' },
    { key: 'label', type: 'text', label: 'Texto en la tapa (opcional)', default: '' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins', show: v => !!(v.label || '').trim() },
    { key: 'color', type: 'color', label: 'Caja', default: '#334155' },
    { key: 'color2', type: 'color', label: 'Tapa', default: '#1D4ED8' },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const B = BOARDS[v.board];
    const pw = v.board === 'custom' ? v.pw : B.w, pd = v.board === 'custom' ? v.pd : B.d;
    const hx = v.board === 'custom' ? v.hx : B.hx, hy = v.board === 'custom' ? v.hy : B.hy;
    const col = 7; // columnas de las esquinas para los tornillos de la tapa (M3)
    const iw = pw + 2 * v.clear + 2 * col, id = pd + 2 * v.clear + 2 * col;
    const t = v.wall, floor = 2, H = floor + v.inH;
    const W = iw + 2 * t, D = id + 2 * t;
    const r = Math.min(v.radius, W / 2 - 1, D / 2 - 1);
    const outer = roundedRect(W, D, r), inner = roundedRect(iw, id, Math.max(0.5, r - t));
    let box = slab(outer, H).subtract(slab(inner, H, floor));
    // Columnas de las esquinas con agujero para tornillo autorroscante M3 (2,5 mm)
    const cx = iw / 2 - col / 2, cy = id / 2 - col / 2;
    const corners = [[-cx, -cy], [cx, -cy], [-cx, cy], [cx, cy]];
    for (const [x, y] of corners) box = box.add(slab(CrossSection.square([col, col], true).translate([x, y]), v.inH, floor - 0.01));
    box = box.subtract(Manifold.union(corners.map(([x, y]) => slab(circle(1.25, 24).translate([x, y]), v.inH * 0.7, H - v.inH * 0.7 + 0.01))));
    // Postes para la placa
    if (hx > 0 && hy > 0) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const p = [sx * hx / 2, sy * hy / 2];
        box = box.add(slab(circle(3, 32).translate(p), v.postH, floor - 0.01)).subtract(slab(circle(1.25, 24).translate(p), v.postH, floor + 0.5));
      }
    }
    // Aberturas: USB al frente (-Y) y agujero redondo atrás (+Y), por encima de los postes
    const zHole = floor + v.postH + 1.6;
    if (v.usb) box = box.subtract(Manifold.cube([v.usbW, t * 4, v.usbH], true).translate([v.usbX, -D / 2, zHole + v.usbH / 2]));
    if (v.jack) box = box.subtract(Manifold.cylinder(t * 4, v.jackD / 2, v.jackD / 2, 32, true).rotate([90, 0, 0]).translate([0, D / 2, zHole + v.jackD / 2 + 1]));

    // Tapa: placa con avellanados en las esquinas y un reborde que entra en la caja
    const lidT = 2;
    let lid = slab(outer, lidT).add(slab(inner.offset(-0.3, 'Round', 2, 24).subtract(inner.offset(-1.8, 'Round', 2, 24)), 2, lidT - 0.01));
    // El reborde no debe chocar con las columnas
    lid = lid.subtract(Manifold.union(corners.map(([x, y]) => slab(CrossSection.square([col + 0.8, col + 0.8], true).translate([x, y]), 3, lidT))));
    for (const [x, y] of corners) {
      lid = lid.subtract(slab(circle(1.7, 24).translate([x, y]), lidT + 2, -1))
        .subtract(Manifold.cylinder(1.4, 3.2, 1.7, 24).translate([x, y, -0.01])); // avellanado (la cara de afuera va sobre la cama)
    }
    if (v.vents) {
      const slots = [];
      const sw = Math.min(iw - 2 * col - 6, 60), n = Math.max(2, Math.floor((id - 2 * col - 6) / 5));
      for (let i = 0; i < n; i++) slots.push(roundedRect(sw, 2, 1).translate([0, -((n - 1) * 5) / 2 + i * 5]));
      lid = lid.subtract(slab(CrossSection.union(slots).translate([0, (v.label || '').trim() ? -id * 0.12 : 0]), lidT + 3, -1));
    }
    const parts = [part('Caja', v.color, box)];
    const off = [W + 12, 0, 0];
    if ((v.label || '').trim()) {
      const font = await ctx.font(v.font);
      const txt = fitInto(stackLines([{ font, text: v.label, height: 10 }], 0), iw - 2 * col, id * 0.16).translate([0, id * 0.32]).mirror([1, 0]);
      const ts = slab(txt, 0.6);
      lid = lid.subtract(ts);
      parts.push(part('Texto', v.color, ts.translate(off)));
    }
    parts.unshift(part('Tapa', v.color2, lid.translate(off)));
    return parts;
  },
};
