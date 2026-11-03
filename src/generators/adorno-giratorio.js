/**
 * Adorno giratorio: un aro con una figura adentro que gira sobre dos puntas cónicas.
 * Sale impreso de una sola vez (print-in-place): las puntas del aro entran en huecos
 * de la figura con holgura. De un lado el nombre en relieve, del otro un texto grabado.
 */
import { wasm, circle, roundedRect, part, slab } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { ring, star, heart, snowflake, fitInto } from '../engine/shapes.js';
import { treeShape, bauble } from '../engine/xmas.js';
import { firstLine } from './_common.js';

const INNER = [
  { value: 'disc', label: 'Disco' }, { value: 'star', label: 'Estrella' }, { value: 'tree', label: 'Arbolito' },
  { value: 'heart', label: 'Corazón' }, { value: 'flake', label: 'Copo' },
];

export default {
  id: 'adorno-giratorio',
  title: 'Adorno giratorio',
  description: 'Aro con una figura que gira adentro, impreso de una vez. Nombre de un lado y año o frase del otro.',
  fileName: v => `giratorio_${firstLine(v.name)}`,
  params: [
    { type: 'group', label: 'Adorno' },
    { key: 'inner', type: 'segment', label: 'Figura que gira', default: 'disc', options: INNER },
    { key: 'size', type: 'number', label: 'Diámetro', default: 80, min: 50, max: 140, step: 1, unit: 'mm' },
    { key: 'rim', type: 'number', label: 'Ancho del aro', default: 5, min: 3, max: 10, step: 0.5, unit: 'mm' },
    { key: 'gap', type: 'number', label: 'Holgura para que gire', default: 0.5, min: 0.3, max: 1, step: 0.05, unit: 'mm', hint: 'Si queda pegado, subila a 0,6. Imprimilo acostado y sin soportes.' },

    { type: 'group', label: 'Textos' },
    { key: 'name', type: 'text', label: 'Adelante (en relieve)', default: 'Aline' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico' },
    { key: 'back', type: 'text', label: 'Atrás (grabado)', default: 'Navidad 2026' },
    { key: 'font2', type: 'font', label: 'Tipografía de atrás', default: 'poppins', show: v => !!(v.back || '').trim() },
    { key: 'ringText', type: 'toggle', label: 'Estrellitas en el aro', default: true },

    { type: 'group', label: 'Colores' },
    { key: 'cRing', type: 'color', label: 'Aro', default: '#C9A227' },
    { key: 'cInner', type: 'color', label: 'Figura', default: '#D62828' },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#F5F5F5' },

    { type: 'group', label: 'Espesor' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 4, min: 3, max: 8, step: 0.2, unit: 'mm' },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const [font, font2] = await Promise.all([ctx.font(v.font), ctx.font(v.font2 || v.font)]);
    const R = v.size / 2, t = v.thick, g = v.gap, w = v.rim;
    const rIn = R - w;                      // borde interno del aro
    const rFig = rIn - g;                   // radio máximo de la figura
    const pinL = Math.min(3.2, rFig * 0.1); // cuánto entra cada punta
    const pinR = t * 0.36;                  // radio de la base del cono

    // Aro y estrellitas
    let ringS = ring(R, w);
    if (v.ringText) for (let i = 0; i < 6; i++) {
      const a = 30 + i * 60;
      if (Math.abs(a - 90) < 1 || Math.abs(a - 270) < 1) continue;
      ringS = ringS.add(star(w * 2.6, 5, 0.5, 0.5).translate([R, 0]).rotate(a));
    }
    ringS = ringS.subtract(circle(rIn, 128)); // las estrellitas no se meten en el hueco
    const top = R + 2.6;
    ringS = ringS.add(circle(4.6, 40).translate([0, top])).subtract(circle(2.2, 32).translate([0, top]));
    let ringM = slab(ringS, t);

    // Figura de adentro, con una barra vertical que la une a las dos puntas
    let fig = {
      disc: () => circle(rFig, 128),
      star: () => star(rFig * 2, 5, 0.5, 1),
      tree: () => fitInto(treeShape(100).shape, rFig * 1.5, rFig * 2),
      heart: () => fitInto(heart(100), rFig * 1.7, rFig * 1.6),
      flake: () => fitInto(snowflake(100).rotate(90), rFig * 2, rFig * 2),
    }[v.inner]?.() || circle(rFig, 128);
    const b = fig.bounds(), fc = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
    fig = fig.translate([-fc[0], -fc[1]]).intersect(circle(rFig, 128));
    const spine = roundedRect(Math.max(pinR * 2 + 3, t * 1.6), rFig * 2, 0).intersect(circle(rFig, 128));
    fig = fig.add(spine);

    // Texto adelante: en relieve y con su placa para que todo quede unido
    const parts = [];
    const nameS = (v.name || '').trim() ? fitInto(stackLines([{ font, text: v.name, height: 10 }]), rFig * 1.5, rFig * 0.55) : null;
    if (nameS) fig = fig.add(nameS.offset(1.4, 'Round', 2, 24)).intersect(circle(rFig, 128));
    let figM = slab(fig, t);
    // Texto atrás: grabado 0,6 mm, espejado para que se lea al darlo vuelta
    if ((v.back || '').trim()) {
      const backS = fitInto(stackLines([{ font: font2, text: v.back, height: 10 }]), rFig * 1.4, rFig * 0.4).mirror([1, 0]);
      figM = figM.subtract(slab(backS, 0.6, -0.01));
    }

    // Puntas cónicas del aro (sobre el eje Y, a media altura) y sus huecos en la figura
    const cone = (r0, r1, L) => Manifold.cylinder(L, r0, r1, 32).rotate([-90, 0, 0]);
    for (const s of [1, -1]) {
      const pin = cone(pinR, 0.3, pinL + g + 0.01).translate([0, 0, t / 2]);
      const p = s === 1 ? pin.rotate([0, 0, 180]).translate([0, rIn + 0.01, 0]) : pin.translate([0, -rIn - 0.01, 0]);
      ringM = ringM.add(p);
      const hole = cone(pinR + g, 0.3 + g, pinL + g + 0.6).translate([0, 0, t / 2]);
      const h = s === 1 ? hole.rotate([0, 0, 180]).translate([0, rIn + 0.01, 0]) : hole.translate([0, -rIn - 0.01, 0]);
      figM = figM.subtract(h);
    }

    parts.push(part('Aro', v.cRing, ringM));
    parts.push(part('Figura', v.cInner, figM));
    if (nameS) parts.push(part('Nombre', v.cText, slab(nameS, 1, t)));
    return mergeByColor(parts);
  },
};
