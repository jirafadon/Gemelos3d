/**
 * Texturas tipo tela: un mosaico de piecitas (escamas, hexágonos, cuadrados o estrellas)
 * separadas, para imprimir sobre una tela o tul: se imprime la primera capa, se pausa,
 * se estira la tela encima y se sigue. Queda una tela flexible con las piezas atrapadas.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { SHAPES, fitInto, star, heart } from '../engine/shapes.js';
import { imageParams, silhouette } from './_common.js';

export default {
  id: 'thermoform',
  title: 'Texturas sobre tela',
  description: 'Mosaico de piecitas para imprimir sobre tela o tul (con pausa): escamas, hexágonos, cuadrados o estrellas, con la forma que quieras.',
  fileName: v => `tela_${v.tile}`,
  params: [
    { type: 'group', label: 'Forma total' },
    { key: 'outline', type: 'segment', label: 'Contorno', default: 'rect', options: [{ value: 'rect', label: 'Rectángulo' }, { value: 'circle', label: 'Círculo' }, { value: 'heart', label: 'Corazón' }, { value: 'image', label: 'Mi silueta' }] },
    ...imageParams({ label: 'Silueta', showIf: v => v.outline === 'image' }).filter(p => ['image', 'removeBg', 'threshold', 'invert', 'smooth'].includes(p.key)),
    { key: 'w', type: 'number', label: 'Ancho', default: 120, min: 30, max: 250, step: 1, unit: 'mm' },
    { key: 'h', type: 'number', label: 'Alto', default: 90, min: 30, max: 250, step: 1, unit: 'mm', show: v => v.outline === 'rect' },

    { type: 'group', label: 'Piecitas' },
    { key: 'tile', type: 'segment', label: 'Pieza', default: 'hex', options: [{ value: 'hex', label: 'Hexágono' }, { value: 'scale', label: 'Escama' }, { value: 'square', label: 'Cuadrado' }, { value: 'star', label: 'Estrella' }, { value: 'heart', label: 'Corazón' }] },
    { key: 'size', type: 'number', label: 'Tamaño de cada una', default: 8, min: 3, max: 25, step: 0.5, unit: 'mm' },
    { key: 'gap', type: 'number', label: 'Separación (lo que dobla la tela)', default: 1, min: 0.4, max: 4, step: 0.1, unit: 'mm' },
    { key: 'under', type: 'number', label: 'Abajo de la tela', default: 0.4, min: 0.2, max: 1.2, step: 0.1, unit: 'mm', hint: 'Pausá la impresión a esta altura, poné la tela tirante y seguí.' },
    { key: 'over', type: 'number', label: 'Arriba de la tela', default: 1.4, min: 0.6, max: 4, step: 0.1, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Color', default: '#2A9D8F' },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    let shape = v.outline === 'circle' ? circle(v.w / 2, 128) : v.outline === 'heart' ? fitInto(heart(100), v.w, v.w) : v.outline === 'image' ? fitInto(await silhouette(v, ctx, 100, { fill: true }), v.w, v.w) : roundedRect(v.w, v.h, 4);
    const s = v.size, g = v.gap;
    const tileOf = { hex: () => circle(s / 2, 6).rotate(30), scale: () => circle(s / 2, 40).intersect(CrossSection.square([s, s * 0.75], false).translate([-s / 2, -s * 0.25])), square: () => roundedRect(s, s, s * 0.12), star: () => star(s, 5, 0.5, 0.3), heart: () => fitInto(heart(10), s, s) }[v.tile];
    const tile = tileOf();
    const b = shape.bounds();
    const px = v.tile === 'hex' ? s * 0.866 + g : s + g, py = v.tile === 'hex' ? s * 0.75 + g * 0.866 : (v.tile === 'scale' ? s * 0.75 : s) + g;
    const items = [];
    for (let y = b.min[1], j = 0; y < b.max[1] + py; y += py, j++) for (let x = b.min[0]; x < b.max[0] + px; x += px) items.push(tile.translate([x + (j % 2 ? px / 2 : 0), y]));
    const inside = shape.offset(-0.2, 'Round', 2, 16);
    // Solo piezas enteras (las cortadas por el borde quedan chiquitas y se despegan)
    const whole = items.filter(t => t.subtract(inside).isEmpty());
    const all = CrossSection.union(whole);
    const H = v.under + v.over;
    return mergeByColor([part('Piecitas', v.color, slab(all, H))]);
  },
};
