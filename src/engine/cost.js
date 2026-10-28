/**
 * Estimación de filamento, tiempo y costo.
 * Usa el mismo perfil que la calculadora (calculadora.html), guardado en este navegador.
 */
const STORE = { profiles: 'g3d_calc_profiles', active: 'g3d_calc_active', job: 'g3d_calc_job' };

export const DEFAULT_PROFILE = {
  name: 'Snapmaker U1', kwhPrice: 160, watts: 200, lifeHours: 5000, partsCost: 300000,
  errorPct: 15, markup: 3,
  est: { infill: 15, walls: 3, lineWidth: 0.42, gph: 25 },
  filaments: [{ name: 'PLA', price: 25000, density: 1.24 }],
};

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

export function activeProfile() {
  const list = read(STORE.profiles);
  if (!Array.isArray(list) || !list.length) return DEFAULT_PROFILE;
  const id = read(STORE.active);
  return list.find(p => p.id === id) || list[0];
}

/** Gramos, minutos y costos de un conjunto de piezas. */
export function estimate(parts, prof = activeProfile()) {
  const { infill, walls, lineWidth, gph } = prof.est || DEFAULT_PROFILE.est;
  const fil = (prof.filaments && prof.filaments[0]) || DEFAULT_PROFILE.filaments[0];
  let grams = 0;
  for (const p of parts) {
    const vol = p.solid.volume(), area = p.solid.surfaceArea();
    const shell = Math.min(vol, area * walls * lineWidth);
    const plastic = shell + (vol - shell) * (infill / 100);
    grams += plastic / 1000 * fil.density;
  }
  // Cada color extra suma cambios de cabezal: lo contamos como un 10% más de tiempo.
  const colors = new Set(parts.map(p => p.color)).size;
  const minutes = (gph > 0 ? grams / gph * 60 : 0) * (1 + Math.max(0, colors - 1) * 0.1);
  const hours = minutes / 60;
  const material = grams / 1000 * fil.price;
  const electricity = hours * prof.watts / 1000 * prof.kwhPrice;
  const wear = prof.lifeHours > 0 ? hours * prof.partsCost / prof.lifeHours : 0;
  const cost = (material + electricity + wear) * (1 + prof.errorPct / 100);
  return { grams, minutes, cost, price: cost * Math.max(1, prof.markup), profile: prof.name, colors };
}

/** Agrega la pieza al presupuesto actual de la calculadora y la abre. */
export function sendToCalculator({ name, grams, minutes, thumb, meta }) {
  const job = read(STORE.job) || { name: '', units: 1, pieces: [], supplies: 0, design: { mode: 'fixed', value: 0 }, post: { mode: 'fixed', value: 0 }, searchText: '', marketRef: 0 };
  job.pieces = job.pieces || [];
  job.pieces.push({
    id: Math.random().toString(36).slice(2, 10), name, filament: 0,
    grams: Math.round(grams * 10) / 10, minutes: Math.round(minutes), qty: 1,
    source: 'mesh', thumb, meta: meta || 'Desde Gemelos 3D Lab', warn: '',
  });
  if (!job.name) job.name = name;
  if (!job.searchText) job.searchText = name;
  try { localStorage.setItem(STORE.job, JSON.stringify(job)); } catch { /* sin espacio */ }
  window.open(`${import.meta.env.BASE_URL}calculadora.html`, '_blank');
}
