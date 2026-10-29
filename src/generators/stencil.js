/**
 * Stencil / plantilla: placa fina con el texto o una forma calada.
 * Los "puentes" son barras que cruzan el calado para que los centros de
 * letras como O, A o B no se caigan.
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';
import { stackLines } from '../engine/layers.js';
import { SHAPES } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'stencil',
  title: 'Stencil / plantilla',
  description: 'Placa con texto o forma calada, con puentes para que no se caigan los centros.',
  fileName: v => `stencil_${v.source === 'text' ? firstLine(v.text) : v.shape}`,
  params: [
    { type: 'group', label: 'Calado' },
    { key: 'source', type: 'segment', label: 'Qué calar', default: 'text', options: [{ value: 'text', label: 'Texto' }, { value: 'shape', label: 'Forma' }] },
    { key: 'text', type: 'text', label: 'Texto', default: 'HOLA', multiline: true, show: v => v.source === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'anton', show: v => v.source === 'text', hint: 'Las letras gruesas (Anton, Bebas, Bangers) quedan mejor.' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', show: v => v.source === 'shape', options: ['heart', 'star', 'paw', 'circle', 'bone', 'fish'].map(k => ({ value: k, label: SHAPES[k].label })) },
    { key: 'size', type: 'number', label: 'Alto del calado', default: 40, min: 10, max: 200, step: 1, unit: 'mm' },

    { type: 'group', label: 'Puentes' },
    { key: 'bridges', type: 'segment', label: 'Cantidad', default: 1, options: [0, 1, 2, 3].map(n => ({ value: n, label: n ? String(n) : 'Sin puentes' })) },
    { key: 'bridgeW', type: 'number', label: 'Ancho del puente', default: 1.6, min: 0.8, max: 5, step: 0.1, unit: 'mm', show: v => v.bridges > 0 },
    { key: 'vertical', type: 'toggle', label: 'Puentes verticales', default: false, show: v => v.bridges > 0, hint: 'Cruzan cada letra de arriba abajo en vez de a lo ancho.' },

    { type: 'group', label: 'Placa' },
    { key: 'margin', type: 'number', label: 'Margen alrededor', default: 12, min: 4, max: 40, step: 1, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo de esquinas', default: 4, min: 0, max: 20, step: 0.5, unit: 'mm' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 0.8, min: 0.4, max: 3, step: 0.1, unit: 'mm', hint: 'Fino se adapta a superficies; 1,2 mm o más si es para lija o pintura en aerosol.' },
    { key: 'hang', type: 'toggle', label: 'Agujero para colgar', default: false },
    { key: 'color', type: 'color', label: 'Color', default: '#0F766E' },
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    let cut;
    if (v.source === 'text') {
      const font = await ctx.font(v.font);
      const lines = String(v.text || ' ').split('\n');
      cut = stackLines(lines.map(t => ({ font, text: t, height: 10 })), 2.5);
      const b = cut.bounds();
      cut = cut.scale(v.size / (b.max[1] - b.min[1]));
    } else {
      cut = SHAPES[v.shape].make(v.size * (v.shape === 'bone' ? 2.2 : v.shape === 'fish' ? 1.6 : 1), v.size);
    }
    const b = cut.bounds();
    const cw = b.max[0] - b.min[0], ch = b.max[1] - b.min[1];
    if (v.bridges > 0) {
      const bars = [];
      for (let i = 1; i <= v.bridges; i++) {
        const t = i / (v.bridges + 1);
        bars.push(v.vertical
          ? CrossSection.square([v.bridgeW, ch + 4], true).translate([b.min[0] + cw * t, (b.min[1] + b.max[1]) / 2])
          : CrossSection.square([cw + 4, v.bridgeW], true).translate([(b.min[0] + b.max[0]) / 2, b.min[1] + ch * t]));
      }
      // Puentes verticales: uno por letra queda mejor que por bloque, así que se reparten por cada isla
      if (v.vertical && v.source === 'text') {
        bars.length = 0;
        for (const poly of cut.toPolygons()) {
          let x0 = Infinity, x1 = -Infinity;
          for (const [x] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
          if (x1 - x0 < v.bridgeW * 3) continue;
          for (let i = 1; i <= v.bridges; i++) bars.push(CrossSection.square([v.bridgeW, ch + 4], true).translate([x0 + (x1 - x0) * i / (v.bridges + 1), (b.min[1] + b.max[1]) / 2]));
        }
      }
      if (bars.length) cut = cut.subtract(CrossSection.union(bars));
    }
    let plate = roundedRect(cw + 2 * v.margin, ch + 2 * v.margin, v.radius).translate([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2]);
    if (v.hang) plate = plate.subtract(wasm().CrossSection.circle(2.5, 32).translate([(b.min[0] + b.max[0]) / 2, b.max[1] + v.margin / 2]));
    return [part('Stencil', v.color, slab(plate.subtract(cut), v.thick))];
  },
};
