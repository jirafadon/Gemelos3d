/**
 * Árbol de nombres de la familia: un pino de pisos, con un nombre en cada piso,
 * estrella arriba y el apellido o el año en el tronco. Para colgar o para parar
 * (con una base aparte que se encastra).
 */
import { wasm, circle, roundedRect, polygonShape, outline, part, slab } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { smooth, star, fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'arbol-nombres',
  title: 'Árbol de nombres',
  description: 'Un pino con el nombre de cada uno de la familia en un piso, estrella arriba y el apellido en el tronco.',
  fileName: v => `arbol_${firstLine(v.trunk, v.names)}`,
  params: [
    { type: 'group', label: 'Nombres' },
    { key: 'names', type: 'text', label: 'Un nombre por piso (de arriba a abajo)', default: 'Elisa\nAlex\nAline\nMamá y Papá', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico' },
    { key: 'trunk', type: 'text', label: 'En el tronco', default: 'Pérez 2026' },
    { key: 'font2', type: 'font', label: 'Tipografía del tronco', default: 'poppins', show: v => !!(v.trunk || '').trim() },

    { type: 'group', label: 'Árbol' },
    { key: 'width', type: 'number', label: 'Ancho', default: 140, min: 70, max: 240, step: 1, unit: 'mm' },
    { key: 'tierH', type: 'number', label: 'Alto de cada piso', default: 26, min: 14, max: 50, step: 1, unit: 'mm' },
    { key: 'balls', type: 'toggle', label: 'Bolitas en las puntas', default: true },
    { key: 'use', type: 'segment', label: 'Uso', default: 'stand', options: [{ value: 'stand', label: 'Para parar' }, { value: 'hang', label: 'Para colgar' }],
      hint: v => (v.use === 'stand' ? 'La base sale aparte: el árbol entra parado en la ranura.' : 'Lleva un anillito arriba de la estrella.') },
    { key: 'tol', type: 'number', label: 'Holgura de la ranura', default: 0.3, min: 0, max: 1, step: 0.05, unit: 'mm', show: v => v.use === 'stand' },

    { type: 'group', label: 'Colores' },
    { key: 'cTree', type: 'color', label: 'Árbol', default: '#2D6A4F' },
    { key: 'cText', type: 'color', label: 'Nombres', default: '#F5F5F5' },
    { key: 'cDeco', type: 'color', label: 'Estrella y bolitas', default: '#FCBF49' },
    { key: 'cTrunk', type: 'color', label: 'Tronco y base', default: '#8B5A2B' },

    { type: 'group', label: 'Espesor' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 4, min: 2, max: 8, step: 0.2, unit: 'mm' },
    { key: 'border', type: 'number', label: 'Contorno de los nombres', default: 1.6, min: 0.6, max: 4, step: 0.1, unit: 'mm' },
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    const [font, font2] = await Promise.all([ctx.font(v.font), ctx.font(v.font2 || v.font)]);
    const names = String(v.names || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) names.push(' ');
    const N = names.length, W = v.width, th = v.tierH, t = v.thick;
    const H = N * th;
    // Pisos: cada uno más ancho que el de arriba, con la punta del de abajo metida en el de arriba
    const tiers = [], labels = [], tips = [];
    for (let i = 0; i < N; i++) {
      const wBot = W * (0.38 + 0.62 * (i + 1) / N), wTop = i === 0 ? 0 : W * (0.38 + 0.62 * i / N) * 0.55;
      const y0 = H - (i + 1) * th, y1 = y0 + th + (i === 0 ? th * 0.55 : th * 0.35);
      const sag = th * 0.12;
      const pts = [[-wBot / 2, y0 + sag]];
      for (let k = 1; k < 12; k++) { const x = -wBot / 2 + (wBot * k) / 12; pts.push([x, y0 + sag * Math.abs(Math.cos(Math.PI * k / 4))]); }
      pts.push([wBot / 2, y0 + sag], [wTop / 2, y1], [-wTop / 2, y1]);
      tiers.push(smooth(polygonShape(pts), Math.min(2.5, th * 0.08)));
      tips.push([-wBot / 2 + 3, y0 + sag + 2.5], [wBot / 2 - 3, y0 + sag + 2.5]);
      const room = (wBot + Math.max(wTop, wBot * 0.45)) / 2 * 0.82;
      const txt = fitInto(stackLines([{ font, text: names[i], height: 10 }]), room, th * 0.52);
      labels.push(txt.translate([0, y0 + th * 0.46]));
    }
    let tree = CrossSection.union(tiers);
    // Tronco
    const trunkW = Math.max(W * 0.3, 30), trunkH = th * 0.9;
    const extra = v.use === 'stand' ? 8 : 0; // lo que entra en la ranura de la base
    const trunk = roundedRect(trunkW, trunkH + 4 + extra, 2).translate([0, -(trunkH + extra) / 2 + 2]);
    // Estrella arriba
    const sR = Math.max(th * 0.75, W * 0.1);
    const st = star(sR * 2, 5, 0.48, 0.8).translate([0, H + th * 0.55 + sR * 0.15]);
    const nameS = CrossSection.union(labels);
    const trunkTxt = (v.trunk || '').trim() ? fitInto(stackLines([{ font: font2, text: v.trunk, height: 10 }]), trunkW * 0.86, trunkH * 0.6).translate([0, -trunkH / 2]) : null;

    tree = tree.add(outline(nameS, v.border));
    const deco = [st];
    if (v.balls) for (const p of tips) deco.push(circle(Math.min(3.2, th * 0.14), 32).translate(p));
    const decoS = CrossSection.union(deco);
    // El árbol (verde) no lleva la parte del tronco ni la estrella; las bolitas van encima
    const treeBody = tree.subtract(trunk).add(st.offset(-0.01));
    let parts = [];
    let trunkBody = trunk;
    if (trunkTxt) trunkBody = trunkBody.add(outline(trunkTxt, 1).intersect(trunk.offset(3, 'Round', 2, 16)));
    let hang = null;
    if (v.use === 'hang') {
      const tb = st.bounds(), y = tb.max[1] + 1.6;
      hang = circle(4.4, 40).subtract(circle(2.2, 32)).translate([0, y]);
    }
    const green = treeBody.subtract(st);
    parts.push(part('Árbol', v.cTree, slab(green, t)));
    parts.push(part('Estrella', v.cDeco, slab(hang ? st.add(hang) : st, t)));
    const balls = decoS.subtract(st).subtract(outline(nameS, v.border));
    if (!balls.isEmpty()) parts.push(part('Bolitas', v.cDeco, slab(balls, 0.8, t)));
    parts.push(part('Tronco', v.cTrunk, slab(trunkBody.subtract(green), t)));
    parts.push(part('Nombres', v.cText, slab(nameS, 1, t)));
    if (trunkTxt) parts.push(part('Apellido', v.cText, slab(trunkTxt, 1, t)));

    if (v.use === 'stand') {
      // Base aparte: un bloque con ranura donde entra el tronco
      const bw = Math.max(trunkW + 30, W * 0.5), bd = Math.max(30, t * 6), bh = 10;
      const { Manifold } = wasm();
      const base = Manifold.cube([bw, bd, bh], true).translate([0, 0, bh / 2])
        .subtract(Manifold.cube([trunkW + 2 * v.tol, t + 2 * v.tol, bh], true).translate([0, 0, bh / 2 + 2.5]));
      const bb = tree.add(trunkBody).bounds();
      parts.push(part('Base', v.cTrunk, base.translate([0, bb.min[1] - bd / 2 - 10, 0])));
    }
    return mergeByColor(parts);
  },
};
