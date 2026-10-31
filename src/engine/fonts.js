/**
 * Tipografías libres (licencia OFL, vía @fontsource) para los generadores.
 * Se cargan solo cuando se usan.
 */
import { parse as parseFont } from 'opentype.js';
import f_pacifico from '@fontsource/pacifico/files/pacifico-latin-400-normal.woff?url';
import f_lobster from '@fontsource/lobster/files/lobster-latin-400-normal.woff?url';
import f_dancing from '@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff?url';
import f_satisfy from '@fontsource/satisfy/files/satisfy-latin-400-normal.woff?url';
import f_kaushan from '@fontsource/kaushan-script/files/kaushan-script-latin-400-normal.woff?url';
import f_cookie from '@fontsource/cookie/files/cookie-latin-400-normal.woff?url';
import f_courgette from '@fontsource/courgette/files/courgette-latin-400-normal.woff?url';
import f_yellowtail from '@fontsource/yellowtail/files/yellowtail-latin-400-normal.woff?url';
import f_leckerli from '@fontsource/leckerli-one/files/leckerli-one-latin-400-normal.woff?url';
import f_damion from '@fontsource/damion/files/damion-latin-400-normal.woff?url';
import f_grand_hotel from '@fontsource/grand-hotel/files/grand-hotel-latin-400-normal.woff?url';
import f_merienda from '@fontsource/merienda/files/merienda-latin-800-normal.woff?url';
import f_caveat from '@fontsource/caveat/files/caveat-latin-700-normal.woff?url';
import f_kalam from '@fontsource/kalam/files/kalam-latin-700-normal.woff?url';
import f_marker from '@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff?url';
import f_great_vibes from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url';
import f_fredoka from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff?url';
import f_baloo from '@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff?url';
import f_nunito from '@fontsource/nunito/files/nunito-latin-900-normal.woff?url';
import f_varela from '@fontsource/varela-round/files/varela-round-latin-400-normal.woff?url';
import f_comfortaa from '@fontsource/comfortaa/files/comfortaa-latin-700-normal.woff?url';
import f_chewy from '@fontsource/chewy/files/chewy-latin-400-normal.woff?url';
import f_sniglet from '@fontsource/sniglet/files/sniglet-latin-800-normal.woff?url';
import f_luckiest from '@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff?url';
import f_titan from '@fontsource/titan-one/files/titan-one-latin-400-normal.woff?url';
import f_bubblegum from '@fontsource/bubblegum-sans/files/bubblegum-sans-latin-400-normal.woff?url';
import f_coiny from '@fontsource/coiny/files/coiny-latin-400-normal.woff?url';
import f_rammetto from '@fontsource/rammetto-one/files/rammetto-one-latin-400-normal.woff?url';
import f_lilita from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff?url';
import f_poppins from '@fontsource/poppins/files/poppins-latin-800-normal.woff?url';
import f_montserrat from '@fontsource/montserrat/files/montserrat-latin-900-normal.woff?url';
import f_raleway from '@fontsource/raleway/files/raleway-latin-900-normal.woff?url';
import f_rubik from '@fontsource/rubik/files/rubik-latin-800-normal.woff?url';
import f_lexend from '@fontsource/lexend/files/lexend-latin-800-normal.woff?url';
import f_archivo from '@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff?url';
import f_righteous from '@fontsource/righteous/files/righteous-latin-400-normal.woff?url';
import f_russo from '@fontsource/russo-one/files/russo-one-latin-400-normal.woff?url';
import f_anton from '@fontsource/anton/files/anton-latin-400-normal.woff?url';
import f_bebas from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff?url';
import f_oswald from '@fontsource/oswald/files/oswald-latin-700-normal.woff?url';
import f_fjalla from '@fontsource/fjalla-one/files/fjalla-one-latin-400-normal.woff?url';
import f_teko from '@fontsource/teko/files/teko-latin-600-normal.woff?url';
import f_league_gothic from '@fontsource/league-gothic/files/league-gothic-latin-400-normal.woff?url';
import f_staatliches from '@fontsource/staatliches/files/staatliches-latin-400-normal.woff?url';
import f_passion from '@fontsource/passion-one/files/passion-one-latin-700-normal.woff?url';
import f_playfair from '@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff?url';
import f_abril from '@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff?url';
import f_cinzel from '@fontsource/cinzel/files/cinzel-latin-900-normal.woff?url';
import f_alfa_slab from '@fontsource/alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff?url';
import f_bree from '@fontsource/bree-serif/files/bree-serif-latin-400-normal.woff?url';
import f_roboto_slab from '@fontsource/roboto-slab/files/roboto-slab-latin-900-normal.woff?url';
import f_bangers from '@fontsource/bangers/files/bangers-latin-400-normal.woff?url';
import f_bungee from '@fontsource/bungee/files/bungee-latin-400-normal.woff?url';
import f_graduate from '@fontsource/graduate/files/graduate-latin-400-normal.woff?url';
import f_black_ops from '@fontsource/black-ops-one/files/black-ops-one-latin-400-normal.woff?url';
import f_racing from '@fontsource/racing-sans-one/files/racing-sans-one-latin-400-normal.woff?url';
import f_rye from '@fontsource/rye/files/rye-latin-400-normal.woff?url';
import f_creepster from '@fontsource/creepster/files/creepster-latin-400-normal.woff?url';
import f_christmas from '@fontsource/mountains-of-christmas/files/mountains-of-christmas-latin-700-normal.woff?url';
import f_audiowide from '@fontsource/audiowide/files/audiowide-latin-400-normal.woff?url';
import f_orbitron from '@fontsource/orbitron/files/orbitron-latin-900-normal.woff?url';
import f_pixel from '@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff?url';

/** Todas con trazo grueso para que impriman bien en 3D. `kind` es la categoría del selector. */
export const FONTS = [
  { id: 'pacifico', name: 'Pacifico', kind: 'Manuscrita', url: f_pacifico },
  { id: 'lobster', name: 'Lobster', kind: 'Manuscrita', url: f_lobster },
  { id: 'dancing', name: 'Dancing Script', kind: 'Manuscrita', url: f_dancing },
  { id: 'satisfy', name: 'Satisfy', kind: 'Manuscrita', url: f_satisfy },
  { id: 'kaushan', name: 'Kaushan Script', kind: 'Manuscrita', url: f_kaushan },
  { id: 'cookie', name: 'Cookie', kind: 'Manuscrita', url: f_cookie },
  { id: 'courgette', name: 'Courgette', kind: 'Manuscrita', url: f_courgette },
  { id: 'yellowtail', name: 'Yellowtail', kind: 'Manuscrita', url: f_yellowtail },
  { id: 'leckerli', name: 'Leckerli One', kind: 'Manuscrita', url: f_leckerli },
  { id: 'damion', name: 'Damion', kind: 'Manuscrita', url: f_damion },
  { id: 'grand-hotel', name: 'Grand Hotel', kind: 'Manuscrita', url: f_grand_hotel },
  { id: 'merienda', name: 'Merienda', kind: 'Manuscrita', url: f_merienda },
  { id: 'caveat', name: 'Caveat', kind: 'A mano', url: f_caveat },
  { id: 'kalam', name: 'Kalam', kind: 'A mano', url: f_kalam },
  { id: 'marker', name: 'Permanent Marker', kind: 'A mano', url: f_marker },
  { id: 'great-vibes', name: 'Great Vibes', kind: 'Caligráfica', url: f_great_vibes },
  { id: 'fredoka', name: 'Fredoka', kind: 'Redondeada', url: f_fredoka },
  { id: 'baloo', name: 'Baloo', kind: 'Redondeada', url: f_baloo },
  { id: 'nunito', name: 'Nunito', kind: 'Redondeada', url: f_nunito },
  { id: 'varela', name: 'Varela Round', kind: 'Redondeada', url: f_varela },
  { id: 'comfortaa', name: 'Comfortaa', kind: 'Redondeada', url: f_comfortaa },
  { id: 'chewy', name: 'Chewy', kind: 'Infantil', url: f_chewy },
  { id: 'sniglet', name: 'Sniglet', kind: 'Infantil', url: f_sniglet },
  { id: 'luckiest', name: 'Luckiest Guy', kind: 'Infantil', url: f_luckiest },
  { id: 'titan', name: 'Titan One', kind: 'Infantil', url: f_titan },
  { id: 'bubblegum', name: 'Bubblegum', kind: 'Infantil', url: f_bubblegum },
  { id: 'coiny', name: 'Coiny', kind: 'Infantil', url: f_coiny },
  { id: 'rammetto', name: 'Rammetto One', kind: 'Infantil', url: f_rammetto },
  { id: 'lilita', name: 'Lilita One', kind: 'Infantil', url: f_lilita },
  { id: 'poppins', name: 'Poppins', kind: 'Moderna', url: f_poppins },
  { id: 'montserrat', name: 'Montserrat', kind: 'Moderna', url: f_montserrat },
  { id: 'raleway', name: 'Raleway', kind: 'Moderna', url: f_raleway },
  { id: 'rubik', name: 'Rubik', kind: 'Moderna', url: f_rubik },
  { id: 'lexend', name: 'Lexend', kind: 'Moderna', url: f_lexend },
  { id: 'archivo', name: 'Archivo Black', kind: 'Moderna', url: f_archivo },
  { id: 'righteous', name: 'Righteous', kind: 'Moderna', url: f_righteous },
  { id: 'russo', name: 'Russo One', kind: 'Moderna', url: f_russo },
  { id: 'anton', name: 'Anton', kind: 'Condensada', url: f_anton },
  { id: 'bebas', name: 'Bebas Neue', kind: 'Condensada', url: f_bebas },
  { id: 'oswald', name: 'Oswald', kind: 'Condensada', url: f_oswald },
  { id: 'fjalla', name: 'Fjalla One', kind: 'Condensada', url: f_fjalla },
  { id: 'teko', name: 'Teko', kind: 'Condensada', url: f_teko },
  { id: 'league-gothic', name: 'League Gothic', kind: 'Condensada', url: f_league_gothic },
  { id: 'staatliches', name: 'Staatliches', kind: 'Condensada', url: f_staatliches },
  { id: 'passion', name: 'Passion One', kind: 'Condensada', url: f_passion },
  { id: 'playfair', name: 'Playfair Display', kind: 'Elegante', url: f_playfair },
  { id: 'abril', name: 'Abril Fatface', kind: 'Elegante', url: f_abril },
  { id: 'cinzel', name: 'Cinzel', kind: 'Elegante', url: f_cinzel },
  { id: 'alfa-slab', name: 'Alfa Slab', kind: 'Elegante', url: f_alfa_slab },
  { id: 'bree', name: 'Bree Serif', kind: 'Elegante', url: f_bree },
  { id: 'roboto-slab', name: 'Roboto Slab', kind: 'Elegante', url: f_roboto_slab },
  { id: 'bangers', name: 'Bangers', kind: 'Cómic', url: f_bangers },
  { id: 'bungee', name: 'Bungee', kind: 'Cómic', url: f_bungee },
  { id: 'graduate', name: 'Graduate', kind: 'Deportiva', url: f_graduate },
  { id: 'black-ops', name: 'Black Ops', kind: 'Deportiva', url: f_black_ops },
  { id: 'racing', name: 'Racing Sans', kind: 'Deportiva', url: f_racing },
  { id: 'rye', name: 'Rye', kind: 'Fiestas', url: f_rye },
  { id: 'creepster', name: 'Creepster', kind: 'Fiestas', url: f_creepster },
  { id: 'christmas', name: 'Mountains of Christmas', kind: 'Fiestas', url: f_christmas },
  { id: 'audiowide', name: 'Audiowide', kind: 'Tecnológica', url: f_audiowide },
  { id: 'orbitron', name: 'Orbitron', kind: 'Tecnológica', url: f_orbitron },
  { id: 'pixel', name: 'Press Start (pixel)', kind: 'Tecnológica', url: f_pixel },
];
export const FONT_KINDS = [...new Set(FONTS.map(f => f.kind))];

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

const cssDone = new Set();
/** Registra una fuente en CSS (para mostrar su nombre con su letra en el selector). */
export function registerCssFont(id) {
  if (cssDone.has(id) || typeof FontFace === 'undefined') return;
  const f = FONTS.find(x => x.id === id); if (!f) return;
  cssDone.add(id);
  new FontFace(`g3d-${f.id}`, `url(${f.url})`).load().then(ff => document.fonts.add(ff)).catch(() => cssDone.delete(id));
}
/** Compatibilidad: registra todas. */
export function registerCssFonts() { for (const f of FONTS) registerCssFont(f.id); }
