/** Packaging: caja con tapa a presión a medida, para regalos o envíos chicos, con el nombre del negocio. */
import base from './cajas.js';
import { preset } from './_common.js';
export default preset(base, {
  id: 'packaging', title: 'Packaging',
  description: 'Caja de regalo o envío a medida con tapa a presión e insertos, con el nombre de tu negocio en la tapa.',
  defaults: { W: 100, D: 100, H: 40, nx: 1, ny: 1, radius: 6, text: 'Gemelos 3D', cBox: '#1E1E1E', cLid: '#1E1E1E', cText: '#C9A227' },
});
