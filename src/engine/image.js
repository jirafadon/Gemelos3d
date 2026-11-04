/**
 * Imágenes en el navegador: achicar al subirlas, convertirlas en máscara (con bordes suaves),
 * quitar el fondo, leer SVG como vector y separar una imagen en colores.
 */

const isSVG = url => /^data:image\/svg\+xml/i.test(url || '');

/**
 * Lee un archivo de imagen y lo devuelve como dataURL.
 * Las fotos se achican (para guardarlas livianas); los SVG quedan tal cual (son vectores).
 */
export function fileToDataURL(file, maxPx = 1400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '')) {
      reader.onload = () => {
        const text = String(reader.result);
        if (!/<svg[\s>]/i.test(text)) return reject(new Error('Ese archivo no parece un SVG'));
        resolve('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text))));
      };
      reader.readAsText(file);
      return;
    }
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ese archivo no es una imagen que el navegador pueda abrir'));
      img.onload = () => {
        const k = Math.min(1, maxPx / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const cache = new Map();
function loadImage(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { cache.delete(url); reject(new Error('No se pudo abrir la imagen')); };
      img.src = url;
    }));
  }
  return cache.get(url);
}

/** Píxeles RGBA de la imagen a la resolución de trabajo. */
async function pixels(url, maxPx) {
  const img = await loadImage(url);
  const iw = img.naturalWidth || img.width || 512, ih = img.naturalHeight || img.height || 512;
  const k = Math.min(isSVG(url) ? 4 : 1, maxPx / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  return { w, h, px: g.getImageData(0, 0, w, h).data };
}

/**
 * Fondo: píxeles conectados al borde que se parecen al color del borde.
 * Devuelve 1 = fondo. Sirve para fotos y dibujos sobre un fondo liso (blanco, gris, de color).
 */
function backgroundMask(px, w, h, tol) {
  // Color del fondo: mediana del borde
  const border = [];
  for (let x = 0; x < w; x++) border.push(0 * w + x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  const med = ch => { const v = border.map(i => px[i * 4 + ch]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const t2 = tol * tol * 3;
  const near = i => { const dr = px[i * 4] - bg[0], dg = px[i * 4 + 1] - bg[1], db = px[i * 4 + 2] - bg[2]; return dr * dr + dg * dg + db * db <= t2 || px[i * 4 + 3] < 40; };
  const out = new Uint8Array(w * h), stack = [];
  for (const i of border) if (!out[i] && near(i)) { out[i] = 1; stack.push(i); }
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !out[j] && near(j)) { out[j] = 1; stack.push(j); }
  }
  return out;
}

/** Desenfoque de caja (r px), para bordes más suaves en fotos. */
function boxBlur(f, w, h, r) {
  if (r < 1) return f;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += f[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[y * w + x] = s / (2 * r + 1); s += f[y * w + Math.min(w - 1, x + r + 1)] - f[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s / (2 * r + 1); s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
  return out;
}

/** Contornos de un SVG (en unidades del dibujo), muestreando cada forma con el navegador. */
async function svgPolys(url) {
  const text = decodeURIComponent(escape(atob(url.split(',')[1])));
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:1000px;height:1000px;visibility:hidden';
  host.innerHTML = text;
  document.body.appendChild(host);
  try {
    const svg = host.querySelector('svg');
    if (!svg) throw new Error('SVG vacío');
    const polys = [];
    const shapes = svg.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
    const root = svg.getScreenCTM ? svg.getScreenCTM() : null;
    for (const el of shapes) {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.fill === 'none' && st.stroke === 'none') continue;
      if (st.fill === 'none') continue; // solo rellenos: un trazo sin relleno no es una superficie
      const len = el.getTotalLength ? el.getTotalLength() : 0;
      if (!len) continue;
      const m = el.getScreenCTM && root ? root.inverse().multiply(el.getScreenCTM()) : null;
      // Cada subtrayecto del path es un contorno: se cortan donde la curva salta
      const n = Math.min(4000, Math.max(24, Math.ceil(len / 0.5)));
      let cur = [], last = null;
      const mine = [];
      const step = len / n;
      for (let i = 0; i <= n; i++) {
        let p = el.getPointAtLength(i * step);
        if (m) p = p.matrixTransform(m);
        if (last && Math.hypot(p.x - last.x, p.y - last.y) > step * 6) { if (cur.length > 2) mine.push(cur); cur = []; }
        cur.push([p.x, p.y]); last = p;
      }
      if (cur.length > 2) mine.push(cur);
      if (mine.length) polys.push({ loops: mine, rule: st.fillRule === 'evenodd' ? 'EvenOdd' : 'NonZero' });
    }
    if (!polys.length) throw new Error('El SVG no tiene formas con relleno');
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const g of polys) for (const p of g.loops) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { polys, bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
  } finally { host.remove(); }
}

/**
 * Convierte una imagen en máscara de "material".
 * @param opts.threshold  0–255: más alto = toma también los grises claros
 * @param opts.invert     usa lo claro en vez de lo oscuro
 * @param opts.maxPx      resolución de trabajo (más = más detalle, más lento)
 * @param opts.removeBg   quita el fondo liso que toca los bordes (fotos)
 * @param opts.bgTol      cuánto puede variar el color del fondo (0–120)
 * @param opts.vector     si es un SVG, usa sus curvas (sin pasar por píxeles)
 * Si la imagen tiene transparencia, usa la transparencia en lugar del color.
 */
export async function imageToMask(url, { threshold = 128, invert = false, maxPx = 320, removeBg = false, bgTol = 40, vector = true } = {}) {
  if (isSVG(url) && vector && !invert) {
    try { return await svgPolys(url); } catch (e) { console.warn('SVG como imagen:', e.message); }
  }
  const { w, h, px } = await pixels(url, maxPx);
  let transparent = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 200) transparent++;
  const useAlpha = transparent > w * h * 0.05;
  const bg = removeBg && !useAlpha ? backgroundMask(px, w, h, bgTol) : null;
  let field = new Float32Array(w * h);
  const soft = 28; // banda de grises que da el borde suave
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3];
    let f;
    if (useAlpha) f = a / 255;
    else if (bg) f = bg[i] ? 0 : 1;
    else {
      const L = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      f = Math.min(1, Math.max(0, (threshold - L) / soft + 0.5));
      if (a < 128) f = 0;
    }
    field[i] = invert ? 1 - f : f;
  }
  if (bg) field = boxBlur(field, w, h, 1);
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = field[i] >= 0.5 ? 1 : 0;
  return { width: w, height: h, data, field, usedAlpha: useAlpha };
}

/**
 * Separa una imagen en sus colores principales (k-means sobre los píxeles visibles).
 * @returns { width, height, palette: ['#rrggbb', ...], layers: [{ color, mask: {width,height,data,field} }] }
 *          ordenadas de la más grande a la más chica. El fondo (si se pide quitarlo) no cuenta.
 */
export async function imageToColors(url, { colors = 4, maxPx = 400, removeBg = true, bgTol = 40 } = {}) {
  const { w, h, px } = await pixels(url, maxPx);
  let transparent = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 200) transparent++;
  const useAlpha = transparent > w * h * 0.05;
  const bg = removeBg && !useAlpha ? backgroundMask(px, w, h, bgTol) : null;
  const vis = i => (useAlpha ? px[i * 4 + 3] > 127 : !(bg && bg[i]));
  const idx = [];
  for (let i = 0; i < w * h; i++) if (vis(i)) idx.push(i);
  if (!idx.length) return { width: w, height: h, palette: [], layers: [] };
  // k-means++ en RGB, sobre una muestra
  const sample = idx.length > 40000 ? idx.filter((_, j) => j % Math.ceil(idx.length / 40000) === 0) : idx;
  const K = Math.max(1, Math.min(8, colors));
  const C = [[px[sample[0] * 4], px[sample[0] * 4 + 1], px[sample[0] * 4 + 2]]];
  const d2 = (i, c) => (px[i * 4] - c[0]) ** 2 + (px[i * 4 + 1] - c[1]) ** 2 + (px[i * 4 + 2] - c[2]) ** 2;
  while (C.length < K) {
    let best = sample[0], bd = -1;
    for (const i of sample) { const d = Math.min(...C.map(c => d2(i, c))); if (d > bd) { bd = d; best = i; } }
    if (bd < 100) break;
    C.push([px[best * 4], px[best * 4 + 1], px[best * 4 + 2]]);
  }
  const lab = new Int8Array(w * h).fill(-1);
  for (let it = 0; it < 12; it++) {
    const sum = C.map(() => [0, 0, 0, 0]);
    for (const i of sample) { let b = 0, bd = Infinity; C.forEach((c, k) => { const d = d2(i, c); if (d < bd) { bd = d; b = k; } }); const s = sum[b]; s[0] += px[i * 4]; s[1] += px[i * 4 + 1]; s[2] += px[i * 4 + 2]; s[3]++; }
    C.forEach((c, k) => { if (sum[k][3]) { c[0] = sum[k][0] / sum[k][3]; c[1] = sum[k][1] / sum[k][3]; c[2] = sum[k][2] / sum[k][3]; } });
  }
  const count = C.map(() => 0);
  for (const i of idx) { let b = 0, bd = Infinity; C.forEach((c, k) => { const d = d2(i, c); if (d < bd) { bd = d; b = k; } }); lab[i] = b; count[b]++; }
  // Filtro de mayoría 3×3: saca puntitos sueltos de color
  const clean = new Int8Array(lab);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (lab[i] < 0) continue;
    const votes = new Map();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const l = lab[i + dy * w + dx]; if (l >= 0) votes.set(l, (votes.get(l) || 0) + 1); }
    let best = lab[i], bv = 0; for (const [l, v] of votes) if (v > bv) { bv = v; best = l; }
    clean[i] = best;
  }
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const layers = C.map((c, k) => {
    const data = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) data[i] = clean[i] === k ? 1 : 0;
    return { color: hex(c), area: count[k], mask: { width: w, height: h, data } };
  }).filter(l => l.area > 0).sort((a, b) => b.area - a.area);
  return { width: w, height: h, palette: layers.map(l => l.color), layers };
}

/**
 * Convierte una imagen en una grilla de grises (0 = negro, 1 = blanco), para litofanías.
 * @param opts.cols  cantidad de columnas (el alto sale proporcional)
 */
export async function imageToGray(url, { cols = 250 } = {}) {
  const img = await loadImage(url);
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const w = Math.max(2, Math.round(cols)), h = Math.max(2, Math.round(cols * ih / iw));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); // lo transparente cuenta como blanco (fino)
  g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const data = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
  return { width: w, height: h, data };
}
