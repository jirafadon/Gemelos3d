/**
 * Clicker (llavero o suelto) armado alrededor de un switch mecánico de teclado (tipo MX):
 * cuerpo con el calce del switch y tapa (tecla) con forma, texto o dibujo en otro color.
 * Se imprimen las dos piezas acostadas; el switch entra a presión en el cuerpo
 * y la tecla se calza en la cruz del switch.
 */
import { wasm, circle, roundedRect, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { imageParams, silhouette, firstLine } from './_common.js';

const FORMS = ['circle', 'heart', 'star', 'roundedSquare', 'shield', 'cloudShape', 'flower', 'paw'].filter(k => SHAPES[k] || k === 'roundedSquare');

export default {
  id: 'clicker',
  title: 'Clicker',
  description: 'Clicker con switch de teclado: forma, texto o tu dibujo en la tecla, con argolla de llavero.',
  fileName: v => `clicker_${firstLine(v.text, v.form)}`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'form', type: 'select', label: 'Forma', default: 'roundedSquare', options: [...FORMS.map(k => ({ value: k, label: k === 'roundedSquare' ? 'Cuadrado redondeado' : SHAPES[k].label })), { value: 'image', label: 'Silueta de mi imagen' }] },
    ...imageParams({ label: 'Imagen', showIf: v => v.form === 'image' || v.art === 'image' }).filter(p => ['image', 'removeBg', 'bgTol', 'threshold', 'invert', 'smooth', 'specks'].includes(p.key)),
    { key: 'size', type: 'number', label: 'Tamaño', default: 34, min: 26, max: 70, step: 1, unit: 'mm', hint: 'El switch ocupa 14 mm: menos de 26 no entra.' },
    { key: 'ring', type: 'segment', label: 'Argolla', default: 'top', options: [{ value: 'top', label: 'Arriba' }, { value: 'side', label: 'Al costado' }, { value: 'none', label: 'Sin' }] },

    { type: 'group', label: 'Tecla' },
    { key: 'art', type: 'segment', label: 'En la tecla', default: 'text', options: [{ value: 'text', label: 'Texto' }, { value: 'image', label: 'Dibujo' }, { value: 'none', label: 'Lisa' }] },
    { key: 'text', type: 'text', label: 'Texto', default: 'CLICK', show: v => v.art === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'luckiest', show: v => v.art === 'text' },
    { key: 'relief', type: 'number', label: 'Espesor del color', default: 0.6, min: 0.2, max: 1.6, step: 0.1, unit: 'mm', show: v => v.art !== 'none', hint: 'Va embutido al ras de la tecla.' },

    { type: 'group', label: 'Ajuste del switch' },
    { key: 'hole', type: 'number', label: 'Calce del switch', default: 14, min: 13.8, max: 14.3, step: 0.01, unit: 'mm', hint: 'Estándar 14 mm. Si queda flojo bajalo de a 0,05.' },
    { key: 'stemTol', type: 'number', label: 'Holgura de la cruz', default: 0.12, min: 0, max: 0.4, step: 0.01, unit: 'mm', hint: 'La tecla tiene que entrar firme en la cruz del switch.' },
    { key: 'travel', type: 'number', label: 'Luz entre tecla y cuerpo', default: 4.4, min: 3.5, max: 6, step: 0.1, unit: 'mm', hint: 'El recorrido de la mayoría de los switches es de 4 mm.' },

    { type: 'group', label: 'Colores' },
    { key: 'cBody', type: 'color', label: 'Cuerpo', default: '#1E1E1E' },
    { key: 'cCap', type: 'color', label: 'Tecla', default: '#FFCA3A' },
    { key: 'cArt', type: 'color', label: 'Texto o dibujo', default: '#E63946', show: v => v.art !== 'none' },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const S = v.size;
    let shape;
    if (v.form === 'image') shape = fitInto(fillHoles(await silhouette(v, ctx, 100, { fill: true })), S, S);
    else if (v.form === 'roundedSquare') shape = roundedRect(S, S, S * 0.22);
    else shape = SHAPES[v.form].make(S, S);
    // Tiene que entrar el switch (14 mm + 1,6 de pared)
    const need = CrossSection.square([v.hole + 3.2, v.hole + 3.2], true);
    if (!need.subtract(shape).isEmpty()) shape = shape.add(roundedRect(v.hole + 3.6, v.hole + 3.6, 2));

    // Cuerpo: la base hueca donde se mete el switch. Placa de 1,5 mm (lo que agarran las trabas del switch)
    const wall = 2, floor = 1.6, below = 5.4, plateT = 1.5;
    const bodyH = floor + below + plateT;
    const body2d = outline(shape, 0); // mismo contorno que la tecla
    let body = slab(body2d, bodyH);
    // Hueco de abajo para el cuerpo y las patas del switch, y calce cuadrado arriba
    body = body.subtract(slab(CrossSection.square([15.6, 15.6], true), below + 0.01, floor));
    body = body.subtract(slab(CrossSection.square([v.hole, v.hole], true), plateT + 0.02, floor + below - 0.01));
    // Muescas a los costados del calce para poder sacar el switch con un destornillador
    body = body.subtract(slab(CrossSection.square([4, v.hole + 2.4], true), plateT * 0.6, bodyH - plateT * 0.6 + 0.01));
    // Argolla
    if (v.ring !== 'none') {
      const b = body2d.bounds();
      const at = v.ring === 'top' ? [0, b.max[1] + 2.6] : [b.max[0] + 2.6, 0];
      const tab = circle(5, 40).translate(at).add(roundedRect(v.ring === 'top' ? 8 : 6, v.ring === 'top' ? 6 : 8, 2).translate(v.ring === 'top' ? [0, b.max[1] - 0.5] : [b.max[0] - 0.5, 0]));
      body = body.add(slab(tab.subtract(circle(2.5, 32).translate(at)), 3.2));
    }

    // Tecla: tapa con la forma y un vástago con la cruz para el switch
    const capT = 2.2, skirt = 2.4;
    let cap = slab(shape.offset(-0.4, 'Round', 2, 24), capT);
    cap = cap.add(slab(shape.offset(-0.4, 'Round', 2, 24).subtract(shape.offset(-2.0, 'Round', 2, 24)), skirt, -skirt));
    // Vástago: cilindro de 5,6 mm con la cruz (4,1 × 1,3 mm por brazo) más la holgura
    const t = v.stemTol, armL = 4.1 + t, armW = 1.3 + t;
    const stemH = Math.max(3.8, v.travel - 0.4);
    const cross = CrossSection.square([armL, armW], true).add(CrossSection.square([armW, armL], true));
    const stem = slab(circle(2.8, 40).subtract(cross), stemH, -stemH);
    cap = cap.add(stem);
    const parts = [];
    if (v.art !== 'none') {
      let art = null;
      const area = shape.offset(-3, 'Round', 2, 24), ab = area.bounds();
      if (v.art === 'text') {
        const font = await ctx.font(v.font);
        art = fitInto(stackLines(String(v.text || ' ').split('\n').map(x => ({ font, text: x, height: 10 })), 1.4), (ab.max[0] - ab.min[0]) * 0.9, (ab.max[1] - ab.min[1]) * 0.7);
      } else art = fitInto(await silhouette(v, ctx, 100), (ab.max[0] - ab.min[0]) * 0.9, (ab.max[1] - ab.min[1]) * 0.9);
      art = art.intersect(area);
      // Embutido al ras: la cara de la tecla va sobre la cama, así sale lisa y el color queda en las primeras capas
      if (!art.isEmpty()) { const inl = slab(art, v.relief, capT - v.relief); cap = cap.subtract(inl); parts.push(part('Dibujo', v.cArt, inl)); }
    }
    // La tecla se imprime dada vuelta: la cara sobre la cama y el vástago hacia arriba (sin soportes)
    const capAll = mergeByColor([part('Tecla', v.cCap, cap), ...parts]);
    const bb = body.boundingBox(), dx = bb.max[0] - bb.min[0] + 8;
    const flipped = capAll.map(p => ({ ...p, solid: p.solid.rotate([180, 0, 0]).translate([dx, 0, capT]) }));
    return mergeByColor([part('Cuerpo', v.cBody, body), ...flipped]);
  },
};
