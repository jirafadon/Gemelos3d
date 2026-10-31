/**
 * Editor 2D de perfiles (como el boceto de FreeCAD, simplificado):
 * - arrastrar puntos (se pegan a la grilla y se alinean con los otros puntos),
 * - doble clic en una línea para agregar un punto ahí,
 * - elegir un punto para escribir su X / Y exactos, o una línea para escribir su largo y ángulo,
 * - borrar puntos, deshacer, ver las medidas de cada lado.
 * Funciona en mm, con Y hacia arriba. No toca el modelo hasta que tocás "Aplicar".
 */
const r2 = v => Math.round(v * 100) / 100;
const fmt = v => r2(v).toLocaleString('es-AR');

/**
 * @param host     elemento donde se abre (la vista 3D)
 * @param opts.pts [[x, y], ...] en mm
 * @param opts.op  'extrude' | 'revolve' (dibuja el eje de giro)
 * @param opts.snap paso de la grilla en mm
 * @param opts.onApply(pts) / opts.onCancel()
 * @returns { close }
 */
export function openProfileEditor(host, { pts, op = 'extrude', snap = 1, title = 'Perfil', onApply, onCancel }) {
  let P = pts.map(p => [p[0], p[1]]);
  const hist = [];
  let sel = null; // { type: 'pt'|'seg', i }
  let showDims = true, grid = snap;
  const el = document.createElement('div');
  el.className = 't-pe';
  el.innerHTML = `
    <div class="pe-bar">
      <b>${title}</b>
      <span class="pe-help">Arrastrá los puntos. Doble clic en una línea agrega un punto. Rueda: zoom · arrastrar el fondo: mover.</span>
      <label>Grilla <select data-k="grid">${[0.1, 0.5, 1, 2, 5, 10].map(v => `<option value="${v}" ${v === snap ? 'selected' : ''}>${v} mm</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" data-k="dims" checked> Medidas</label>
      <button data-a="undo" title="Deshacer (Ctrl+Z)">Deshacer</button>
      <button data-a="fit" title="Ver todo">Encuadrar</button>
      <button data-a="cancel">Cancelar</button>
      <button data-a="apply" class="primary">Aplicar</button>
    </div>
    <div class="pe-stage"><svg class="pe-svg" tabindex="0"></svg><div class="pe-edit" hidden></div></div>`;
  host.appendChild(el);
  const svg = el.querySelector('svg'), edit = el.querySelector('.pe-edit');
  const NS = 'http://www.w3.org/2000/svg';

  // Vista: escala (px por mm) y centro en mm
  let scale = 4, cx = 0, cy = 0;
  const size = () => { const r = svg.getBoundingClientRect(); return { w: r.width || 800, h: r.height || 500, r }; };
  const toPx = ([x, y]) => { const { w, h } = size(); return [w / 2 + (x - cx) * scale, h / 2 - (y - cy) * scale]; };
  const toMm = (px, py) => { const { w, h } = size(); return [cx + (px - w / 2) / scale, cy - (py - h / 2) / scale]; };
  const fit = () => {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const { w, h } = size();
    scale = Math.max(0.2, Math.min(60, Math.min((w - 120) / Math.max(1, x1 - x0), (h - 170) / Math.max(1, y1 - y0))));
    cx = (x0 + x1) / 2; cy = (y0 + y1) / 2 + 25 / scale; // deja lugar arriba para el cuadro de edición
  };
  const push = () => { hist.push(P.map(p => [...p])); if (hist.length > 100) hist.shift(); };
  const snapTo = v => Math.round(v / grid) * grid;

  function draw() {
    const { w, h } = size();
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let out = '';
    // Grilla: líneas finas cada paso que se vea (≥ 8 px) y gruesas cada 10
    let step = grid; while (step * scale < 8) step *= step === grid && grid < 1 ? 10 : 2;
    const [mx0, my1] = toMm(0, 0), [mx1, my0] = toMm(w, h);
    for (let x = Math.ceil(mx0 / step) * step; x <= mx1; x += step) {
      const [px] = toPx([x, 0]); const major = Math.abs(Math.round(x / (step * 10)) * step * 10 - x) < 1e-6;
      out += `<line x1="${px}" y1="0" x2="${px}" y2="${h}" class="${Math.abs(x) < 1e-6 ? 'ax' : major ? 'g2' : 'g1'}"/>`;
    }
    for (let y = Math.ceil(my0 / step) * step; y <= my1; y += step) {
      const [, py] = toPx([0, y]); const major = Math.abs(Math.round(y / (step * 10)) * step * 10 - y) < 1e-6;
      out += `<line x1="0" y1="${py}" x2="${w}" y2="${py}" class="${Math.abs(y) < 1e-6 ? 'ax' : major ? 'g2' : 'g1'}"/>`;
    }
    // Eje de giro del perfil revolucionado
    if (op === 'revolve') {
      const minX = Math.min(...P.map(p => p[0])); const [px] = toPx([minX, 0]);
      out += `<line x1="${px}" y1="0" x2="${px}" y2="${h}" class="axis"/><text x="${px + 6}" y="18" class="lbl">eje de giro</text>`;
    }
    const pp = P.map(toPx);
    out += `<polygon points="${pp.map(p => p.join(',')).join(' ')}" class="fill"/>`;
    pp.forEach((a, i) => {
      const b = pp[(i + 1) % pp.length], on = sel?.type === 'seg' && sel.i === i;
      out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="seg ${on ? 'on' : ''}" data-seg="${i}"/>`;
      out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="hit" data-seg="${i}"/>`;
      if (showDims) {
        const A = P[i], B = P[(i + 1) % P.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        if (L > 0 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 34) {
          // La medida va del lado de afuera de la línea
          const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1, s = area() > 0 ? 1 : -1;
          out += `<text x="${(a[0] + b[0]) / 2 + nx / nl * 14 * s}" y="${(a[1] + b[1]) / 2 + ny / nl * 14 * s + 4}" class="dim">${fmt(L)}</text>`;
        }
      }
    });
    pp.forEach((p, i) => { out += `<circle cx="${p[0]}" cy="${p[1]}" r="${sel?.type === 'pt' && sel.i === i ? 7 : 5.5}" class="pt ${sel?.type === 'pt' && sel.i === i ? 'on' : ''}" data-pt="${i}"/>`; });
    if (guide) out += guide.map(g => `<line x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}" class="guide"/>`).join('');
    svg.innerHTML = out;
    drawEdit();
  }
  // Área con signo (para saber de qué lado poner las medidas)
  const area = () => P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

  function drawEdit() {
    if (!sel) { edit.hidden = true; return; }
    edit.hidden = false;
    if (sel.type === 'pt') {
      const p = P[sel.i];
      edit.innerHTML = `<b>Punto ${sel.i + 1}</b><label>X <input type="number" step="${grid}" data-e="x" value="${r2(p[0])}"></label><label>Y <input type="number" step="${grid}" data-e="y" value="${r2(p[1])}"></label><button data-a="del" ${P.length <= 3 ? 'disabled' : ''}>Borrar punto</button>`;
    } else {
      const A = P[sel.i], B = P[(sel.i + 1) % P.length];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ang = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI;
      edit.innerHTML = `<b>Línea ${sel.i + 1} → ${(sel.i + 1) % P.length + 1}</b><label>Largo <input type="number" min="0.1" step="${grid}" data-e="len" value="${r2(L)}"> mm</label><label>Ángulo <input type="number" step="1" data-e="ang" value="${r2(ang)}">°</label><button data-a="split">Agregar punto en el medio</button><span class="muted">Cambiar el largo o el ángulo mueve el punto ${(sel.i + 1) % P.length + 1}.</span>`;
    }
  }
  edit.addEventListener('change', e => {
    const k = e.target.dataset.e; if (!k) return;
    const v = +e.target.value; if (!Number.isFinite(v)) return;
    push();
    if (sel.type === 'pt') P[sel.i][k === 'x' ? 0 : 1] = v;
    else {
      const A = P[sel.i], j = (sel.i + 1) % P.length, B = P[j];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      const nl = k === 'len' ? Math.max(0.1, v) : L, na = k === 'ang' ? v * Math.PI / 180 : ang;
      P[j] = [r2(A[0] + Math.cos(na) * nl), r2(A[1] + Math.sin(na) * nl)];
    }
    draw();
  });

  // ---------- Mouse ----------
  let drag = null, guide = null;
  const ev2 = e => { const { r } = size(); return [e.clientX - r.left, e.clientY - r.top]; };
  /** Qué hay bajo el puntero: un punto (a 10 px) o una línea (a 8 px), por distancia. */
  function hitTest(px, py) {
    const pp = P.map(toPx);
    let bi = -1, bd = 10;
    pp.forEach((p, i) => { const d = Math.hypot(p[0] - px, p[1] - py); if (d < bd) { bd = d; bi = i; } });
    if (bi >= 0) return { type: 'pt', i: bi };
    let si = -1, sd = 8, st = 0;
    pp.forEach((a, i) => {
      const b = pp[(i + 1) % pp.length], dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(a[0] + dx * t - px, a[1] + dy * t - py);
      if (d < sd) { sd = d; si = i; st = t; }
    });
    return si >= 0 ? { type: 'seg', i: si, t: st } : null;
  }
  svg.addEventListener('pointerdown', e => {
    svg.focus();
    const [px, py] = ev2(e);
    const h = hitTest(px, py);
    // Doble clic propio (el dibujo se rehace en cada toque y el navegador pierde el doble clic)
    const now = performance.now(), dbl = lastDown && now - lastDown.t < 400 && Math.hypot(px - lastDown.x, py - lastDown.y) < 6;
    lastDown = dbl ? null : { t: now, x: px, y: py };
    if (dbl && h?.type === 'seg') { insertAt(h, e.altKey); return; }
    if (h?.type === 'pt') { sel = { type: 'pt', i: h.i }; push(); drag = { kind: 'pt', i: h.i, moved: false }; }
    else if (h?.type === 'seg') { sel = { type: 'seg', i: h.i }; drag = null; }
    else { drag = { kind: 'pan', x: px, y: py, cx, cy, moved: false }; }
    svg.setPointerCapture(e.pointerId);
    draw();
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) { const h = hitTest(...ev2(e)); svg.style.cursor = h?.type === 'pt' ? 'move' : h ? 'pointer' : 'grab'; return; }
    const [px, py] = ev2(e);
    if (drag.kind === 'pan') { cx = drag.cx - (px - drag.x) / scale; cy = drag.cy + (py - drag.y) / scale; drag.moved = true; draw(); return; }
    let [x, y] = toMm(px, py);
    if (!e.altKey) { x = snapTo(x); y = snapTo(y); }
    // Se alinea con la X o la Y de otro punto si está cerca (6 px)
    guide = [];
    const { w, h } = size();
    P.forEach((q, k) => {
      if (k === drag.i) return;
      if (Math.abs((q[0] - x) * scale) < 6) { x = q[0]; const [gx] = toPx(q); guide.push([gx, 0, gx, h]); }
      if (Math.abs((q[1] - y) * scale) < 6) { y = q[1]; const [, gy] = toPx(q); guide.push([0, gy, w, gy]); }
    });
    P[drag.i] = [r2(x), r2(y)]; drag.moved = true; draw();
  });
  const up = () => { if (drag?.kind === 'pt' && !drag.moved) hist.pop(); drag = null; guide = null; draw(); };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  let lastDown = null;
  function insertAt(h, free) {
    const i = h.i, A = P[i], B = P[(i + 1) % P.length];
    // El punto nuevo cae sobre la línea, en la grilla si se puede
    let x = A[0] + (B[0] - A[0]) * h.t, y = A[1] + (B[1] - A[1]) * h.t;
    if (!free && (A[0] === B[0] || A[1] === B[1])) { if (A[0] === B[0]) y = snapTo(y); else x = snapTo(x); }
    push(); P.splice(i + 1, 0, [r2(x), r2(y)]); sel = { type: 'pt', i: i + 1 }; draw();
  }
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const [px, py] = ev2(e), before = toMm(px, py);
    scale = Math.max(0.2, Math.min(80, scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    const after = toMm(px, py); cx += before[0] - after[0]; cy += before[1] - after[1];
    draw();
  }, { passive: false });

  // ---------- Botones y teclado ----------
  const actions = {
    undo() { if (hist.length) { P = hist.pop(); if (sel && sel.i >= P.length) sel = null; draw(); } },
    fit() { fit(); draw(); },
    del() { if (sel?.type === 'pt' && P.length > 3) { push(); P.splice(sel.i, 1); sel = null; draw(); } },
    split() {
      if (sel?.type !== 'seg') return;
      const A = P[sel.i], B = P[(sel.i + 1) % P.length];
      push(); P.splice(sel.i + 1, 0, [r2((A[0] + B[0]) / 2), r2((A[1] + B[1]) / 2)]); sel = { type: 'pt', i: sel.i + 1 }; draw();
    },
    cancel() { close(); onCancel?.(); },
    apply() { close(); onApply?.(P.map(p => [r2(p[0]), r2(p[1])])); },
  };
  el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) actions[b.dataset.a](); });
  el.querySelector('[data-k=grid]').addEventListener('change', e => { grid = +e.target.value; draw(); });
  el.querySelector('[data-k=dims]').addEventListener('change', e => { showDims = e.target.checked; draw(); });
  const onKey = e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    const k = e.key.toLowerCase();
    e.stopImmediatePropagation();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); actions.undo(); }
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); actions.del(); }
    else if (k === 'escape') { if (sel) { sel = null; draw(); } else actions.cancel(); }
    else if (k === 'enter') actions.apply();
  };
  window.addEventListener('keydown', onKey, true);
  const ro = new ResizeObserver(() => draw()); ro.observe(svg);
  function close() { window.removeEventListener('keydown', onKey, true); ro.disconnect(); el.remove(); }
  requestAnimationFrame(() => { fit(); draw(); });
  return { close };
}
