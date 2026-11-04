/** Caja de figuritas: caja con tapa y divisiones a la medida de las figuritas del álbum (5,3 × 7 cm). */
import base from './cajas.js';
import { preset } from './_common.js';
export default preset(base, {
  id: 'caja-figuritas', title: 'Caja de figuritas',
  description: 'Caja con tapa y compartimentos a la medida de las figuritas o pegatinas, con nombre en la tapa.',
  defaults: { W: 120, D: 78, H: 45, nx: 2, ny: 1, radius: 4, divLow: 8, text: 'Repetidas', cBox: '#1D4ED8', cLid: '#FCBF49', cText: '#1D4ED8' },
});
