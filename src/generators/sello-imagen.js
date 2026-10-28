/**
 * Sello desde imagen o texto, para bombones, galletitas, fondant o porcelana fría.
 * El dibujo se espeja para que la marca quede al derecho.
 * Se imprime con el mango sobre la cama: la transición es a 45°, sin soportes.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, heart } from '../engine/shapes.js';
import { imageParams, silhouette, firstLine } from './_common.js';

export default {
  id: 'sello-imagen',
  title: 'Sello desde imagen',
  description: 'Sello circular, cuadrado o corazón para bombones, galletitas o fondant.',
  fileName: v => `sello_${v.source === 'text' ? firstLine(v.text) : 'imagen'}`,
  params: [
    { type: 'group', label: 'Dibujo' },
    { key: 'source', type: 'segment', label: 'A partir de', default: 'image', options: [{ value: 'image', label: 'Imagen' }, { value: 'text', label: 'Texto' }] },
    ...imageParams({ showIf: v => v.source === 'image' }),
    { key: 'text', type: 'text', label: 'Texto', default: 'Gracias', multiline: true, show: v => v.source === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => v.source === 'text' },

    { type: 'group', label: 'Sello' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'circle', options: [{ value: 'circle', label: 'Círculo' }, { value: 'square', label: 'Cuadrado' }, { value: 'heart', label: 'Corazón' }] },
    { key: 'size', type: 'number', label: 'Diámetro / lado', default: 35, min: 15, max: 90, step: 1, unit: 'mm' },
    { key: 'fill', type: 'number', label: 'Tamaño del dibujo', default: 0.8, min: 0.4, max: 0.95, step: 0.01, unit: '×' },
    { key: 'relief', type: 'number', label: 'Relieve del dibujo', default: 1.5, min: 0.6, max: 4, step: 0.1, unit: 'mm' },
    { key: 'rim', type: 'toggle', label: 'Borde alrededor', default: true },
    { key: 'mirror', type: 'toggle', label: 'Espejar (para que la marca salga al derecho)', default: true },

    { type: 'group', label: 'Mango' },
    { key: 'handleD', type: 'number', label: 'Diámetro del mango', default: 16, min: 8, max: 40, step: 1, unit: 'mm' },
    { key: 'handleH', type: 'number', label: 'Alto del mango', default: 22, min: 8, max: 60, step: 1, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Color', default: '#7B2CBF' },
  ],
  async build(v, ctx) {
    const { Manifold } = wasm();
    const S = v.size;
    const face = v.shape === 'circle' ? circle(S / 2, 128) : v.shape === 'square' ? roundedRect(S, S, S * 0.12) : heart(S, S * 0.9);
    let art;
    if (v.source === 'text') {
      const font = await ctx.font(v.font);
      art = stackLines(String(v.text || ' ').split('\n').map(t => ({ font, text: t, height: 10 })), 1.5);
    } else {
      art = await silhouette(v, ctx, 100);
    }
    const area = v.shape === 'heart' ? S * v.fill * 0.62 : S * v.fill * (v.rim ? 0.88 : 1);
    art = fitInto(art, area, v.shape === 'heart' ? area * 0.75 : area);
    if (v.shape === 'heart') art = art.translate([0, S * 0.06]);
    if (v.mirror) art = art.mirror([1, 0]);
    let top = art.intersect(face.offset(-0.6, 'Round', 2, 32));
    if (v.rim) top = top.add(face.subtract(face.offset(-1.2, 'Round', 2, 32)));

    // Mango → cono a 45° → disco → relieve
    const rH = v.handleD / 2;
    const reach = Math.max(0, S / 2 - rH);
    const handle = Manifold.cylinder(v.handleH, rH, rH, 64);
    const cone = Manifold.cylinder(reach, rH, S / 2, 96).translate([0, 0, v.handleH]);
    const discH = 3;
    const z0 = v.handleH + reach;
    let body = handle.add(cone).add(slab(face, discH, z0)).add(slab(top, v.relief, z0 + discH));
    // Si la forma no es circular, recorta el cono para que no sobresalga
    if (v.shape !== 'circle') body = body.intersect(slab(face.add(circle(rH, 64)), z0 + discH + v.relief + 1, -0.5));
    return mergeByColor([part('Sello', v.color, body)]);
  },
};
