import base from './placa-decorada.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'placa-rayas',
  title: 'Placa con rayas y base',
  description: 'Placa con fondo rayado y texto, con base para pararla.',
  defaults: { bg: 'stripes', shape: 'rect' },
});
