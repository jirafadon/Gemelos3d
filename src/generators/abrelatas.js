/**
 * Destapador llavero con moneda: el cuerpo lleva una moneda encastrada que hace de palanca
 * para sacar tapitas, tu texto en relieve y agujero para la argolla.
 * Se pausa la impresión para meter la moneda (o entra a presión por la ranura del costado).
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'abrelatas',
  title: 'Destapador llavero',
  description: 'Destapador con moneda encastrada que hace de palanca, con tu texto y argolla de llavero.',
  fileName: v => `destapador_${firstLine(v.text, 'liso')}`,
  params: [
    { type: 'group', label: 'Destapador' },
    { key: 'length', type: 'number', label: 'Largo', default: 80, min: 60, max: 140, step: 1, unit: 'mm' },
    { key: 'width', type: 'number', label: 'Ancho', default: 34, min: 30, max: 60, step: 1, unit: 'mm' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 8, min: 6, max: 14, step: 0.5, unit: 'mm' },
    { key: 'coinD', type: 'number', label: 'Diámetro de la moneda', default: 24.5, min: 16, max: 30, step: 0.1, unit: 'mm', hint: 'Medila con calibre: va 0,3 mm más grande.' },
    { key: 'coinT', type: 'number', label: 'Espesor de la moneda', default: 2.2, min: 1.2, max: 3.5, step: 0.05, unit: 'mm' },
    { key: 'slot', type: 'segment', label: 'La moneda entra', default: 'pause', options: [{ value: 'pause', label: 'Pausando la impresión' }, { value: 'side', label: 'Por una ranura del costado' }] },
    { key: 'text', type: 'text', label: 'Texto', default: 'Salud!' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'luckiest', show: v => !!(v.text || '').trim() },
    { key: 'color', type: 'color', label: 'Cuerpo', default: '#1E1E1E' },
    { key: 'color2', type: 'color', label: 'Texto', default: '#FCBF49', show: v => !!(v.text || '').trim() },
  ],
  async build(v, ctx) {
    const { Manifold } = wasm();
    const L = v.length, W = v.width, T = v.thick;
    // Cuerpo en forma de gota alargada: cabeza ancha con el agujero para la tapita
    let body2d = roundedRect(W * 0.7, L, W * 0.3).translate([0, -L / 2 + L * 0.5]).add(circle(W / 2, 96).translate([0, L / 2 - W / 2]));
    const capHole = roundedRect(W * 0.62, W * 0.42, W * 0.2).translate([0, L / 2 - W * 0.52]);
    body2d = body2d.subtract(capHole).subtract(circle(2.6, 32).translate([0, -L / 2 + 6]));
    let body = slab(body2d, T);
    // Moneda: horizontal, a media altura, asomando al borde de arriba del agujero (hace de palanca)
    const r = v.coinD / 2 + 0.15, zc = T / 2;
    const cy = L / 2 - W * 0.52 + W * 0.21 + r - 2.2;
    const coin = Manifold.cylinder(v.coinT + 0.3, r, r, 96).translate([0, cy, zc - (v.coinT + 0.3) / 2]);
    body = body.subtract(coin);
    if (v.slot === 'side') body = body.subtract(Manifold.cube([W, 2 * r, v.coinT + 0.3], false).translate([0, cy - r, zc - (v.coinT + 0.3) / 2]));
    const parts = [part('Destapador', v.color, body)];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), L * 0.48, W * 0.5).rotate(90).translate([0, -L * 0.12]);
      const inl = slab(txt, 0.8, T - 0.8);
      parts[0] = part('Destapador', v.color, body.subtract(inl));
      parts.push(part('Texto', v.color2, inl));
    }
    return mergeByColor(parts);
  },
};
