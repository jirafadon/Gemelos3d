/**
 * Ladrillos de encastre compatibles con los bloques de juguete clásicos (paso de 8 mm).
 * Rectangulares o dibujados pastilla por pastilla (con # en una grilla de texto).
 * Alto de ladrillo, placa o teja lisa; tubos abajo para que agarren; holguras ajustables
 * para que encastren bien con tu impresora. Diseño propio a partir de las medidas estándar.
 */
import { wasm, circle, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';

const P = 8; // paso entre pastillas

function cellsFrom(v) {
  if (v.mode === 'draw') {
    const rows = String(v.grid || '').split('\n').map(r => r.replace(/\s+$/, '')).filter((r, i, a) => r.length || i < a.length - 1);
    const cells = [];
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.' && ch !== ' ' && ch !== '-') cells.push([i, rows.length - 1 - j]); }));
    return cells.length ? cells : [[0, 0]];
  }
  const cells = [];
  for (let i = 0; i < v.cols; i++) for (let j = 0; j < v.rows; j++) cells.push([i, j]);
  return cells;
}

export default {
  id: 'ladrillos',
  title: 'Ladrillos de encastre',
  description: 'Ladrillos, placas y tejas compatibles con bloques de 8 mm: rectangulares o con la forma que dibujes, con holgura ajustable.',
  fileName: v => `ladrillo_${v.mode === 'draw' ? 'dibujo' : `${v.cols}x${v.rows}`}_${v.kind}`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'mode', type: 'segment', label: 'Cómo', default: 'rect', options: [{ value: 'rect', label: 'Rectangular' }, { value: 'draw', label: 'Dibujado' }] },
    { key: 'cols', type: 'number', label: 'Largo (pastillas)', default: 4, min: 1, max: 32, step: 1, unit: '', show: v => v.mode === 'rect' },
    { key: 'rows', type: 'number', label: 'Ancho (pastillas)', default: 2, min: 1, max: 32, step: 1, unit: '', show: v => v.mode === 'rect' },
    { key: 'grid', type: 'text', label: 'Dibujo (# = pastilla, . = vacío)', default: '#####\n#...#\n#...#\n#####', multiline: true, show: v => v.mode === 'draw', hint: 'Cada renglón es una fila. Por ejemplo una L, un marco, una letra.' },
    { key: 'kind', type: 'segment', label: 'Alto', default: 'brick', options: [{ value: 'brick', label: 'Ladrillo (9,6)' }, { value: 'plate', label: 'Placa (3,2)' }, { value: 'tile', label: 'Teja lisa (3,2)' }, { value: 'tall', label: 'Doble (19,2)' }] },
    { key: 'text', type: 'text', label: 'Texto arriba (solo teja lisa)', default: '', show: v => v.kind === 'tile' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins', show: v => v.kind === 'tile' && !!(v.text || '').trim() },

    { type: 'group', label: 'Ajuste a tu impresora' },
    { key: 'studD', type: 'number', label: 'Diámetro de pastilla', default: 4.85, min: 4.5, max: 5.1, step: 0.01, unit: 'mm', hint: 'Si aprietan demasiado bajalo; si quedan flojos subilo. Estándar: 4,8.' },
    { key: 'tubeD', type: 'number', label: 'Diámetro de los tubos de abajo', default: 6.45, min: 6.2, max: 6.7, step: 0.01, unit: 'mm', hint: 'Estándar 6,51. Más grande = agarra más fuerte.' },
    { key: 'gap', type: 'number', label: 'Separación entre ladrillos', default: 0.1, min: 0, max: 0.3, step: 0.01, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 1.2, min: 0.8, max: 2, step: 0.05, unit: 'mm' },
    { key: 'hollowStud', type: 'toggle', label: 'Pastillas huecas', default: false },

    { type: 'group', label: 'Colores' },
    { key: 'color', type: 'color', label: 'Color', default: '#E63946' },
    { key: 'color2', type: 'color', label: 'Texto', default: '#F5F5F5', show: v => v.kind === 'tile' && !!(v.text || '').trim() },
  ],

  async build(v, ctx) {
    const { CrossSection, Manifold } = wasm();
    const cells = cellsFrom(v);
    const has = new Set(cells.map(([i, j]) => `${i},${j}`));
    const H = { brick: 9.6, plate: 3.2, tile: 3.2, tall: 19.2 }[v.kind] || 9.6;
    const top = Math.min(1.0, H - 0.6);
    const g = v.gap;
    // Contorno: la unión de las celdas, achicada la separación
    const foot = CrossSection.union(cells.map(([i, j]) => CrossSection.square([P, P], false).translate([i * P, j * P]))).offset(-g, 'Miter', 2, 4);
    let body = slab(foot, H).subtract(slab(foot.offset(-v.wall, 'Miter', 2, 4), H - top + 0.01, -0.01));
    // Tubos donde se juntan 4 pastillas; varillas en tiras de 1 de ancho
    const tubes = [], rods = [];
    for (const [i, j] of cells) {
      if (has.has(`${i + 1},${j}`) && has.has(`${i},${j + 1}`) && has.has(`${i + 1},${j + 1}`)) tubes.push([(i + 1) * P, (j + 1) * P]);
    }
    const tubeSet = new Set(tubes.map(t => t.join(',')));
    for (const [i, j] of cells) {
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        if (!has.has(`${i + di},${j + dj}`)) continue;
        const mid = [(i + 0.5 + di * 0.5) * P, (j + 0.5 + dj * 0.5) * P];
        // Si alrededor hay tubo, no hace falta varilla
        const nearTube = [...tubeSet].some(t => { const [x, y] = t.split(',').map(Number); return Math.hypot(x - mid[0], y - mid[1]) < P * 0.75; });
        if (!nearTube) rods.push(mid);
      }
    }
    const inH = H - top;
    const ring = circle(v.tubeD / 2, 40).subtract(circle(4.8 / 2 + 0.05, 40));
    if (tubes.length) body = body.add(slab(CrossSection.union(tubes.map(t => ring.translate(t))), inH + 0.01));
    if (rods.length) body = body.add(slab(CrossSection.union(rods.map(r => circle(1.6, 24).translate(r))), inH + 0.01));
    // Pastillas arriba (la teja lisa no lleva)
    const parts = [];
    if (v.kind !== 'tile') {
      let stud = Manifold.cylinder(1.8, v.studD / 2, v.studD / 2, 40);
      if (v.hollowStud) stud = stud.subtract(Manifold.cylinder(1.9, 1.6, 1.6, 24).translate([0, 0, 0.2]));
      body = body.add(Manifold.union(cells.map(([i, j]) => stud.translate([(i + 0.5) * P, (j + 0.5) * P, H]))));
    } else if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const fb = foot.bounds();
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), (fb.max[0] - fb.min[0]) * 0.85, (fb.max[1] - fb.min[1]) * 0.6)
        .translate([(fb.min[0] + fb.max[0]) / 2, (fb.min[1] + fb.max[1]) / 2]).intersect(foot.offset(-0.8, 'Round', 2, 12));
      const inlay = slab(txt, 0.6, H - 0.6);
      body = body.subtract(inlay);
      parts.push(part('Texto', v.color2, inlay));
    }
    parts.unshift(part('Ladrillo', v.color, body));
    return mergeByColor(parts);
  },
};
