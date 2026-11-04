/** Letrero de palabra con contorno en 2 o 3 capas: las letras sobre un fondo más grande de otro color. */
import base from './llavero-nombre.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'letrero-contorno',
  title: 'Letrero con contorno',
  description: 'Una palabra o nombre grande con las letras sobre un contorno de otro color, en 2 o 3 capas. Para mesa, puerta o cumpleaños.',
  defaults: { text: 'NOAH', font: 'lobster', height: 45, border: 5, border2: 2.5, colors: 2, base: 5, relief: 3, ring: 'none', cBase: '#6D1B3B', cText: '#F5F5F5' },
});
