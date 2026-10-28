/**
 * Imágenes en el navegador: achicar al subirlas y convertirlas en máscara.
 */

/** Lee un archivo de imagen y lo devuelve como dataURL achicado (para guardarlo liviano). */
export function fileToDataURL(file, maxPx = 700) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
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

/**
 * Convierte una imagen en máscara de "material".
 * @param opts.threshold  0–255: más alto = toma también los grises claros
 * @param opts.invert     usa lo claro en vez de lo oscuro
 * @param opts.maxPx      resolución de trabajo (más = más detalle, más lento)
 * Si la imagen tiene transparencia, usa la transparencia en lugar del color.
 */
export async function imageToMask(url, { threshold = 128, invert = false, maxPx = 320 } = {}) {
  const img = await loadImage(url);
  const k = Math.min(1, maxPx / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  let transparent = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 200) transparent++;
  const useAlpha = transparent > w * h * 0.05;
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
    let on;
    if (useAlpha) on = a > 127;
    else on = (0.299 * r + 0.587 * gg + 0.114 * b) < threshold;
    data[i] = (invert ? !on : on) ? 1 : 0;
  }
  return { width: w, height: h, data, usedAlpha: useAlpha };
}
