import base from './placa-qr.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'placa-qr-mp',
  title: 'Placa de cobro Mercado Pago / alias',
  description: 'QR de cobro con tu alias y el nombre del comercio.',
  hide: ['kind'],
  defaults: {
    kind: 'link', link: 'https://link.mercadopago.com.ar/tualias',
    title: 'Pagá con QR', sub: 'Alias: tu.alias.mp\nGemelos 3D', cBase: '#4CC9F0', cLight: '#F5F5F5', cDark: '#1E1E1E',
  },
});
