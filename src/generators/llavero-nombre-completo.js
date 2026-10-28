import base from './llavero-rectangular.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'llavero-nombre-completo',
  title: 'Llavero nombre y apellido',
  description: 'Nombre grande y apellido abajo, sobre placa con borde.',
  defaults: { line1: 'Aline', line2: 'Borges', font1: 'poppins', font2: 'poppins', size1: 11, size2: 7, gap: 1.6, cBase: '#D62828', padX: 5, padY: 3.5 },
});
