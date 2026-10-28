/**
 * Tipografías libres (licencia OFL, vía @fontsource) para los generadores.
 * Se cargan solo cuando se usan.
 */
import { parse as parseFont } from 'opentype.js';
import pacifico from '@fontsource/pacifico/files/pacifico-latin-400-normal.woff?url';
import lobster from '@fontsource/lobster/files/lobster-latin-400-normal.woff?url';
import dancing from '@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff?url';
import greatVibes from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url';
import poppins from '@fontsource/poppins/files/poppins-latin-800-normal.woff?url';
import fredoka from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff?url';
import baloo from '@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff?url';
import righteous from '@fontsource/righteous/files/righteous-latin-400-normal.woff?url';
import bangers from '@fontsource/bangers/files/bangers-latin-400-normal.woff?url';
import anton from '@fontsource/anton/files/anton-latin-400-normal.woff?url';
import bebas from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff?url';
import oswald from '@fontsource/oswald/files/oswald-latin-700-normal.woff?url';

export const FONTS = [
  { id: 'pacifico', name: 'Pacifico', kind: 'Manuscrita', url: pacifico },
  { id: 'lobster', name: 'Lobster', kind: 'Manuscrita', url: lobster },
  { id: 'dancing', name: 'Dancing Script', kind: 'Manuscrita', url: dancing },
  { id: 'great-vibes', name: 'Great Vibes', kind: 'Caligráfica', url: greatVibes },
  { id: 'fredoka', name: 'Fredoka', kind: 'Redondeada', url: fredoka },
  { id: 'baloo', name: 'Baloo', kind: 'Redondeada', url: baloo },
  { id: 'poppins', name: 'Poppins', kind: 'Moderna', url: poppins },
  { id: 'righteous', name: 'Righteous', kind: 'Moderna', url: righteous },
  { id: 'bangers', name: 'Bangers', kind: 'Cómic', url: bangers },
  { id: 'anton', name: 'Anton', kind: 'Condensada', url: anton },
  { id: 'bebas', name: 'Bebas Neue', kind: 'Condensada', url: bebas },
  { id: 'oswald', name: 'Oswald', kind: 'Condensada', url: oswald },
];

const cache = new Map();

export function loadFont(id) {
  const f = FONTS.find(x => x.id === id) || FONTS[0];
  if (!cache.has(f.id)) {
    cache.set(f.id, fetch(f.url)
      .then(r => { if (!r.ok) throw new Error(`No se pudo cargar la fuente ${f.name}`); return r.arrayBuffer(); })
      .then(buf => parseFont(buf))
      .catch(err => { cache.delete(f.id); throw err; }));
  }
  return cache.get(f.id);
}

let cssRegistered = false;
/** Registra las fuentes en CSS para que el selector muestre cada nombre con su letra. */
export function registerCssFonts() {
  if (cssRegistered || typeof FontFace === 'undefined') return;
  cssRegistered = true;
  for (const f of FONTS) {
    const face = new FontFace(`g3d-${f.id}`, `url(${f.url})`);
    face.load().then(ff => document.fonts.add(ff)).catch(() => {});
  }
}
