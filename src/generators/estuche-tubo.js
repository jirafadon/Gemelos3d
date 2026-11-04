/**
 * Estuche en tubo con tapa a presión: para labiales, cepillos de pestañas, peines, lápices o agujas.
 * Nombre embutido en el costado, argolla opcional en la tapa. Se imprimen parados, sin soportes.
 */
import { wasm, circle, roundedRect, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'estuche-tubo',
  title: 'Estuche en tubo',
  description: 'Tubo con tapa a presión para labial, cepillos de pestañas o lo que quieras, con nombre y argolla.',
  fileName: v => `estuche_${firstLine(v.text, 'tubo')}`,
  params: [
    { type: 'group', label: 'Medidas de lo que va adentro' },
    { key: 'shape', type: 'segment', label: 'Sección', default: 'round', options: [{ value: 'round', label: 'Redonda' }, { value: 'hex', label: 'Hexagonal' }, { value: 'square', label: 'Cuadrada' }] },
    { key: 'inD', type: 'number', label: 'Diámetro de adentro', default: 22, min: 6, max: 80, step: 0.5, unit: 'mm' },
    { key: 'inL', type: 'number', label: 'Largo de adentro', default: 80, min: 20, max: 220, step: 1, unit: 'mm' },
    { key: 'lidL', type: 'number', label: 'Largo de la tapa', default: 30, min: 10, max: 100, step: 1, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 1.6, min: 1, max: 4, step: 0.1, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura de la tapa', default: 0.2, min: 0, max: 0.6, step: 0.05, unit: 'mm', hint: 'Más chica = la tapa aprieta más.' },
    { key: 'ring', type: 'toggle', label: 'Argolla en la tapa', default: true },

    { type: 'group', label: 'Nombre' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Lola' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => !!(v.text || '').trim() },
    { key: 'cBody', type: 'color', label: 'Tubo', default: '#FF85A1' },
    { key: 'cLid', type: 'color', label: 'Tapa', default: '#F5F5F5' },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#F5F5F5', show: v => !!(v.text || '').trim() },
  ],
  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const sec = r => v.shape === 'hex' ? circle(r / Math.cos(Math.PI / 6), 6).rotate(30) : v.shape === 'square' ? roundedRect(2 * r, 2 * r, Math.min(3, r * 0.3)) : circle(r, 96);
    const ri = v.inD / 2, t = v.wall, floor = 1.6;
    const neck = Math.min(12, v.lidL * 0.6); // parte angosta donde calza la tapa
    const ro = ri + t;
    // Tubo: cuerpo + cuello más angosto arriba
    let body = sec(ro).extrude(v.inL - neck + floor).add(sec(ro - t / 2 - v.tol / 2).extrude(neck).translate([0, 0, v.inL - neck + floor]));
    body = body.subtract(sec(ri - t / 2).extrude(v.inL + 1).translate([0, 0, floor]));
    body = body.subtract(sec(ri).extrude(v.inL - neck).translate([0, 0, floor]));
    // Tapa: entra por el cuello (se imprime al lado, parada con el techo abajo)
    let lid = sec(ro).extrude(v.lidL).subtract(sec(ro - t / 2 + v.tol / 2).extrude(v.lidL).translate([0, 0, floor]));
    if (v.ring) {
      // Orejita plana al costado de la tapa, apoyada en la cama
      const tab = roundedRect(10, 8, 2).translate([ro + 3, 0]).add(circle(5, 32).translate([ro + 6, 0])).subtract(circle(2.4, 24).translate([ro + 6, 0]));
      lid = lid.add(tab.subtract(circle(ro - 0.5, 64)).extrude(2.4));
    }
    const lb = lid.boundingBox();
    lid = lid.translate([ro * 2 + 10, 0, -lb.min[2]]);
    const parts = [];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), v.inL * 0.7, Math.min(ri * 1.3, 14)).rotate(90);
      // Envuelto sobre el costado (embutido 0,6 mm)
      let w3 = txt.extrude(1.2).translate([0, 0, -0.6]).refineToLength(1);
      const zc = floor + (v.inL - neck) / 2;
      w3 = w3.warp(p => { const a = -Math.PI / 2 + p[0] / ro, r = ro + p[2] - 0.6; const z = zc + p[1]; p[0] = Math.cos(a) * r; p[1] = Math.sin(a) * r; p[2] = z; });
      const inl = w3.intersect(body);
      body = body.subtract(w3);
      parts.push(part('Nombre', v.cText, inl));
    }
    parts.unshift(part('Tubo', v.cBody, body), part('Tapa', v.cLid, lid));
    return mergeByColor(parts);
  },
};
