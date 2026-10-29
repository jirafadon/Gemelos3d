/**
 * Catálogo de generadores.
 * Para habilitar uno nuevo: crear src/generators/<id>.js y agregar `load` acá.
 * Fase = orden de construcción (ver README).
 */

export const CATEGORIES = [
  { id: 'nombres', name: 'Nombres y llaveros', icon: 'tag' },
  { id: 'carteles', name: 'Carteles y letreros', icon: 'sign' },
  { id: 'qr', name: 'QR y comercios', icon: 'qr' },
  { id: 'cocina', name: 'Cocina y repostería', icon: 'cookie' },
  { id: 'imagen', name: 'Foto e imagen', icon: 'image' },
  { id: 'hogar', name: 'Hogar y organización', icon: 'box' },
  { id: 'taller', name: 'Taller y repuestos', icon: 'wrench' },
  { id: 'deco', name: 'Deco y lámparas', icon: 'lamp' },
  { id: 'letras', name: 'Letras grandes', icon: 'letter' },
  { id: 'herramientas', name: 'Herramientas STL', icon: 'scissors' },
];

const g = (id, title, desc, cat, phase, load) => ({ id, title, desc, cat, phase, load: load || null });
/** Herramienta que vive en su propia página (no es un generador 3D). */
const page = (id, title, desc, cat, href) => ({ id, title, desc, cat, phase: 0, load: null, href });

export const GENERATORS = [
  // ---------- Nombres y llaveros ----------
  g('llavero-nombre', 'Llavero de nombre', 'Nombre con contorno en 1, 2 o 3 colores, superposición de letras y argolla.', 'nombres', 1, () => import('./generators/llavero-nombre.js')),
  g('llavero-nombre-completo', 'Llavero nombre y apellido', 'Dos líneas de texto sobre placa con borde.', 'nombres', 1, () => import('./generators/llavero-nombre-completo.js')),
  g('llavero-rectangular', 'Llavero rectangular', 'Placa rectangular con nombre en relieve o al ras.', 'nombres', 1, () => import('./generators/llavero-rectangular.js')),
  g('llavero-logo', 'Llavero con nombre y logo', 'Texto más un ícono o logo desde imagen.', 'nombres', 2, () => import('./generators/llavero-logo.js')),
  g('llavero-forma', 'Llavero con forma', 'Corazón, estrella, huella, hueso u ondulado, con el nombre adentro.', 'nombres', 2, () => import('./generators/llavero-forma.js')),
  g('llavero-espejo', 'Llavero con espejo', 'Aro con texto para encastrar un espejo redondo.', 'nombres', 3),
  g('llavero-nfc', 'Llavero NFC', 'Llavero con un hueco escondido para el tag NFC (se pone con una pausa).', 'nombres', 3, () => import('./generators/llavero-nfc.js')),
  g('placa-mascota', 'Placa de mascota', 'Hueso, pez, ovalada, ondulada o con la forma que quieras, con nombre y teléfono.', 'nombres', 1, () => import('./generators/placa-mascota.js')),
  g('colgante-familia', 'Colgante de nombres familiares', 'Cadena de corazones o patitas con un nombre en cada uno.', 'nombres', 1, () => import('./generators/colgante-familia.js')),
  g('rosa-nombre', 'Rosa con nombre', 'Rosa con el nombre en letra cursiva unido al tallo.', 'nombres', 2),
  g('marcapaginas', 'Marcapáginas', 'Tira con tu nombre o el nombre que asoma del libro, con adorno.', 'nombres', 2, () => import('./generators/marcapaginas.js')),
  g('cubos-apilables', 'Cubos apilables', 'Bloques con encastre y letras en relieve para armar nombres.', 'nombres', 3),
  g('abrelatas', 'Abrelatas / llavero de lata', 'Llavero que abre latas, con texto o NFC.', 'nombres', 3),

  // ---------- Carteles y letreros ----------
  g('letrero-palabras', 'Letrero de palabras superpuestas', 'Dos o tres palabras encimadas en 2 o 3 colores, con base.', 'carteles', 1, () => import('./generators/letrero-palabras.js')),
  g('letras-separadas', 'Letrero de letras separadas', 'Cada letra con su contorno, unidas por una base.', 'carteles', 1, () => import('./generators/letras-separadas.js')),
  g('letrero-social', 'Letrero @usuario', 'Tu usuario de redes en 2 o 3 colores, libre o en rectángulo.', 'carteles', 1, () => import('./generators/letrero-social.js')),
  g('placa-profesional', 'Placa profesional', 'Nombre, profesión e ícono sobre base de escritorio.', 'carteles', 1, () => import('./generators/placa-profesional.js')),
  g('placa-rayas', 'Placa con rayas y base', 'Placa con fondo rayado y texto, para regalar.', 'carteles', 1, () => import('./generators/placa-rayas.js')),
  g('cuadro-marco', 'Cuadro con marco', 'Cuadro con texto, fecha y datos (ideal nacimientos), con marco y pie.', 'carteles', 1, () => import('./generators/cuadro-marco.js')),
  g('palabra-corazon', 'Palabra en 2 capas con corazón', 'Palabra cursiva con un corazón final, en dos capas.', 'carteles', 1, () => import('./generators/palabra-corazon.js')),
  g('letrero-imagen', 'Letrero con imagen', 'Una o dos líneas de texto más un ícono, en 2 o 3 colores.', 'carteles', 2),
  g('letrero-multipart', 'Letrero multipartes desde imagen', 'Logo o dibujo separado en capas de color para encastrar.', 'carteles', 2),
  g('trofeo', 'Trofeo imagen + texto', 'Copa, estrella, medalla o escudo con texto, sobre base con el nombre.', 'carteles', 2, () => import('./generators/trofeo.js')),
  g('texto-guia', 'Texto de pared con guía', 'Letras grandes para pegar en pared, con plantilla de colocación.', 'carteles', 3),

  // ---------- QR y comercios ----------
  g('placa-qr', 'Placa QR', 'QR con texto o logo sobre placa con soporte.', 'qr', 2, () => import('./generators/placa-qr.js')),
  g('placa-qr-mp', 'Placa de cobro Mercado Pago / alias', 'QR de cobro con alias y logo de tu comercio.', 'qr', 2, () => import('./generators/placa-qr-mp.js')),
  g('placa-wifi', 'Placa QR WiFi', 'El QR conecta directo a tu WiFi, con red y clave impresas.', 'qr', 2, () => import('./generators/placa-wifi.js')),
  g('placa-redes', 'Placa QR de redes', 'Instagram, TikTok, YouTube o WhatsApp con su QR.', 'qr', 2, () => import('./generators/placa-redes.js')),
  g('placa-google', 'Placa "Dejanos tu reseña"', 'QR a tu ficha de Google para pedir reseñas.', 'qr', 2, () => import('./generators/placa-google.js')),
  g('lista-qr', 'Lista de códigos QR', 'Varios QR en una placa vertical u horizontal, en capas.', 'qr', 2, () => import('./generators/lista-qr.js')),
  g('qr-3d', 'QR 3D', 'Código QR imprimible suelto o como llavero.', 'qr', 2, () => import('./generators/qr-3d.js')),
  g('tarjeta-presentacion', 'Tarjeta de presentación', 'Tarjeta con QR, datos y soporte para exhibir.', 'qr', 2, () => import('./generators/tarjeta-presentacion.js')),
  g('exhibidor-salon', 'Exhibidor para salón', 'Exhibidor con logo para uñas, pestañas u otros servicios.', 'qr', 3),

  // ---------- Cocina y repostería ----------
  g('cortador-galletas', 'Cortador de galletas', 'Con forma, nombre o desde imagen. Con filo, refuerzo y faldón.', 'cocina', 2, () => import('./generators/cortador-galletas.js')),
  g('eyector', 'Eyector de masa', 'Cortador con émbolo y marca opcional, para galletitas, caramelos y bombones.', 'cocina', 2, () => import('./generators/eyector.js')),
  g('sello-imagen', 'Sello desde imagen', 'Sello circular o con forma para bombones, galletitas o fondant.', 'cocina', 2, () => import('./generators/sello-imagen.js')),
  g('sello-letras', 'Sellos de letras y números', 'Un sello por letra o número, con mango, para escribir en masas.', 'cocina', 2, () => import('./generators/sello-letras.js')),
  g('sello-eva', 'Sello para goma EVA / plastilina', 'Molde de estampado desde texto o imagen.', 'cocina', 2),
  g('topper-torta', 'Topper de torta', 'Nombre, edad y frase con púas, también circular.', 'cocina', 1, () => import('./generators/topper-torta.js')),
  g('estacas', 'Señaladores y estacas', 'Carteles con estaca para macetas, huertas y tortas.', 'cocina', 1, () => import('./generators/estacas.js')),
  g('adorno-galleta', 'Adorno tipo galleta', 'Adornos navideños con dibujo en relieve estilo galleta decorada.', 'cocina', 2),
  g('soporte-torta', 'Soporte de torta', 'Base giratoria o fija con borde decorado.', 'cocina', 3),
  g('soporte-palillos', 'Soporte para palillos', 'Pie para pinchos y palillos decorativos.', 'cocina', 3),
  g('cortador-rectangulos', 'Cortador en cuadrícula', 'Corta varios rectángulos iguales de una sola vez.', 'cocina', 3),
  g('rodillo-textura', 'Rodillo texturizado', 'Rodillo con patrón o mosaico para masas y porcelana fría.', 'cocina', 4),
  g('stencil', 'Stencils y plantillas', 'Placa con texto o forma calada y puentes para que no se caigan los centros.', 'cocina', 2, () => import('./generators/stencil.js')),

  // ---------- Foto e imagen ----------
  g('dibujo-stl', 'De dibujo a STL', 'Imagen o SVG (logo, dibujo, silueta) a pieza imprimible, con placa base opcional.', 'imagen', 2, () => import('./generators/dibujo-stl.js')),
  g('line-art', 'Placa de line art', 'Dibujo de línea fina parado sobre base con nombre.', 'imagen', 2),
  g('posavasos-imagen', 'Posavasos con imagen', 'Tu foto o logo separada en hasta 4 colores.', 'imagen', 2),
  g('litofania', 'Litofanía', 'Foto que aparece a contraluz: plana o curva, parada con pie.', 'imagen', 4, () => import('./generators/litofania.js')),
  g('colorear', 'Para colorear', 'Dibujo con bordes en relieve para pintar con marcadores.', 'imagen', 2),
  g('imagen-multipartes', 'Imagen multipartes', 'Imagen dividida en piezas de color que encastran.', 'imagen', 2),
  g('imagen-resina', 'Imagen con bordes altos para resina', 'Molde abierto para rellenar con resina o glitter.', 'imagen', 2),
  g('rompecabezas', 'Rompecabezas', 'Piezas con encastre, marco y un nombre repartido entre las piezas.', 'imagen', 4, () => import('./generators/rompecabezas.js')),
  g('portafotos', 'Portafotos', 'Marco de mesa para foto, con tapa a presión, texto y base.', 'imagen', 3, () => import('./generators/portafotos.js')),
  g('botton', 'Accesorios para botton', 'Imán, llavero y adorno con borde para chapitas, y test de tamaño.', 'imagen', 3),

  // ---------- Hogar y organización ----------
  g('cajas', 'Cajas y organizadores', 'Caja a medida con divisiones y tapa a presión con nombre.', 'hogar', 3, () => import('./generators/cajas.js')),
  g('gridfinity', 'Gridfinity', 'Cajitas con divisiones, etiqueta e imanes, y bases de grilla de 42 mm.', 'hogar', 3, () => import('./generators/gridfinity.js')),
  g('packaging', 'Packaging', 'Bandejas, insertos, separadores y esquineros a medida.', 'hogar', 3),
  g('posavasos', 'Posavasos', 'Redondo, cuadrado, hexagonal u ondulado, con nombre, anillos o panal.', 'hogar', 3, () => import('./generators/posavasos.js')),
  g('portalapices', 'Portalápices con nombre', 'Portalápices con el nombre al frente.', 'hogar', 3, () => import('./generators/portalapices.js')),
  g('porta-boligrafos', 'Porta-marcadores paramétrico', 'Grilla de agujeros para marcadores o pinceles, en escalones y con nombre.', 'hogar', 3, () => import('./generators/porta-boligrafos.js')),
  g('caja-figuritas', 'Caja de figuritas', 'Caja con divisiones para figuritas o pegatinas.', 'hogar', 3),
  g('estuche-labial', 'Estuche de labial', 'Estuche con tapa, nombre y argolla.', 'hogar', 3),
  g('portapeine', 'Portapeine de pestañas', 'Tubo con tapa para cepillos y peines de pestañas.', 'hogar', 3),
  g('caja-panuelos', 'Caja de pañuelos', 'Cubre rollo o caja de pañuelos con texto en la tapa.', 'hogar', 4),
  g('ganchos', 'Ganchos de pared', 'Uno o varios ganchos sobre placa, con tornillos o cinta doble faz.', 'hogar', 3, () => import('./generators/ganchos.js')),
  g('soporte-celular', 'Soporte de celular / tablet', 'Atril de escritorio con ángulo a elección y paso para el cable.', 'hogar', 3, () => import('./generators/soporte-celular.js')),
  g('soporte-universal', 'Soporte universal', 'Soportes de escritorio, pared o debajo de mesa.', 'hogar', 3),
  g('peines', 'Peines con formas', 'Peines con dientes y mango a medida.', 'hogar', 3),
  g('contenedor-sellos', 'Contenedor de sellos', 'Caja para guardar sellos de plastilina o masa.', 'hogar', 3),
  g('contador-rascar', 'Contador para rascar', 'Tablero de casilleros para metas o rifas.', 'hogar', 3),

  // ---------- Taller y repuestos ----------
  g('caja-electronica', 'Caja para electrónica', 'Caja con postes para Arduino, ESP32 o Raspberry, tapa atornillada, USB y ventilación.', 'taller', 3, () => import('./generators/caja-electronica.js')),
  g('adaptador', 'Adaptador de medidas', 'Une dos caños o mangueras redondas de distinta medida.', 'taller', 3, () => import('./generators/adaptador.js')),
  g('repara', 'Repará 3D', 'Perillas, patas, bujes, manijas, tapas y clips a medida.', 'taller', 3),
  g('mueble-salvado', 'Mueble salvado', 'Pata, tirador, cuña o pasacables con medidas simples.', 'taller', 3),
  g('jig', 'Plantilla de perforación', 'Guías para agujerear con cotas y patrones repetibles.', 'taller', 3),
  g('roscas', 'Roscas y fijaciones', 'Roscas métricas, perillas y calibres de prueba.', 'taller', 5),
  g('engranajes', 'Engranajes', 'Rectos, helicoidales o en espiga, por módulo y dientes, con su par.', 'taller', 5, () => import('./generators/engranajes.js')),
  g('conectores', 'Conectores de estructura', 'Uniones en T, L y cruz para varillas o caños.', 'taller', 3),

  // ---------- Deco y lámparas ----------
  g('bowls', 'Bowls y cuencos', 'Cuencos, fruteras y macetas con ondas o espiral.', 'deco', 4, () => import('./generators/bowls.js')),
  g('vasos-espiral', 'Vasos y lámparas en espiral', 'Pantallas y floreros para modo vaso, con giro y ondas.', 'deco', 4, () => import('./generators/vasos-espiral.js')),
  g('lampara-letra', 'Lámpara de letra con nombre', 'Letra grande hueca para LED con el nombre encima.', 'deco', 4),
  g('lampara-social', 'Lámpara LED @usuario', 'Letrero hueco para tira LED con tu usuario.', 'deco', 4),
  g('string-art', 'String art', 'Marco con hilos tensados y nombre flotante.', 'deco', 4),
  g('mini-microfono', 'Mini micrófono', 'Micrófono de juguete con cubo de logo personalizable.', 'deco', 3),
  g('adorno-navidad', 'Adornos navideños', 'Bolas, copos y estrellas con nombre calado.', 'deco', 1, () => import('./generators/adorno-navidad.js')),
  g('thermoform', 'Texturas tipo tela', 'Piezas con textura de malla o tela para imprimir sobre tela.', 'deco', 4),

  // ---------- Letras grandes ----------
  g('letra-grande', 'Letra grande con nombre', 'Inicial grande con el nombre en cursiva cruzándola, en 2 o 3 colores.', 'letras', 4, () => import('./generators/letra-grande.js')),
  g('corporeas', 'Letras corpóreas', 'Letras gruesas por separado, macizas o huecas para LED; las grandes se cortan solas con pernos.', 'letras', 5, () => import('./generators/corporeas.js')),
  g('neon-flex', 'Cartel de neón flex', 'Base con canal para neón flex desde logo o dibujo.', 'letras', 5),

  // ---------- Herramientas STL ----------
  g('separar-color', 'Separar STL por color', 'Divide un modelo en piezas por color con encastres.', 'herramientas', 5),
  g('cortar-conectar', 'Cortá y conectá', 'Corta un STL y agrega encastres, bisagras o rótulas.', 'herramientas', 5),
  g('moldes-silicona', 'Moldes de silicona', 'Genera la caja del molde con llaves de registro a partir de tu pieza.', 'herramientas', 5),
];

export const findGenerator = id => GENERATORS.find(x => x.id === id);

/** Apps del Lab: herramientas completas que no son un generador (van primero). */
export const APPS = [
  { id: 'calculadora', icon: 'calc', tone: 'green', title: 'Calculadora de presupuestos', desc: 'Arrastrá STL, 3MF o G-code y te arma el precio: material, luz, desgaste, extras y comisión.', href: 'calculadora.html' },
  { id: 'taller', icon: 'cube', tone: 'blue', title: 'Taller 3D', desc: 'Editor libre estilo Tinkercad: sumá formas, texto, imágenes o tu STL, marcá huecos y exportá.', route: '#/taller' },
];

/**
 * Programas: agrupan generadores parecidos en una sola entrada de la portada.
 * Adentro de cada programa se elige qué hacer (las variantes).
 * `items` son ids de GENERATORS; los que todavía no están listos se muestran como "próximamente".
 */
export const FAMILIES = [
  { id: 'llaveros', icon: 'tag', tone: 'blue', title: 'Llaveros', desc: 'Nombre con contorno, placa, nombre y apellido o con logo.', cover: 'llavero-nombre', cat: 'nombres',
    items: ['llavero-nombre', 'llavero-forma', 'llavero-rectangular', 'llavero-nombre-completo', 'llavero-logo', 'llavero-espejo', 'llavero-nfc', 'abrelatas'] },
  { id: 'qr', icon: 'qr', tone: 'teal', title: 'QR y comercios', desc: 'Placas de cobro, WiFi, redes, reseñas, listas de QR y tarjetas.', cover: 'placa-qr-mp', cat: 'qr',
    items: ['placa-qr-mp', 'placa-wifi', 'placa-redes', 'placa-google', 'placa-qr', 'lista-qr', 'tarjeta-presentacion', 'qr-3d', 'exhibidor-salon'] },
  { id: 'letreros', icon: 'sign', tone: 'purple', title: 'Letreros', desc: 'Palabras superpuestas, @usuario, letras separadas y palabra con corazón.', cover: 'letrero-palabras', cat: 'carteles',
    items: ['letrero-palabras', 'letrero-social', 'letras-separadas', 'palabra-corazon', 'letrero-imagen', 'letrero-multipart', 'texto-guia'] },
  { id: 'placas', icon: 'frame', tone: 'indigo', title: 'Placas y cuadros', desc: 'Placa profesional, cuadros, portafotos y trofeos, con base para pararlos.', cover: 'cuadro-marco', cat: 'carteles',
    items: ['placa-profesional', 'placa-rayas', 'cuadro-marco', 'portafotos', 'trofeo'] },
  { id: 'fiestas', icon: 'gift', tone: 'pink', title: 'Fiestas y regalos', desc: 'Toppers de torta, estacas, adornos navideños y colgantes familiares.', cover: 'topper-torta', cat: 'deco',
    items: ['topper-torta', 'estacas', 'adorno-navidad', 'colgante-familia', 'rosa-nombre', 'marcapaginas', 'adorno-galleta'] },
  { id: 'mascotas', icon: 'paw', tone: 'amber', title: 'Mascotas', desc: 'Placas con nombre y teléfono: hueso, pez, óvalo, corazón y más.', cover: 'placa-mascota', cat: 'nombres',
    items: ['placa-mascota'] },
  { id: 'cocina', icon: 'cookie', tone: 'orange', title: 'Cocina y repostería', desc: 'Cortadores, eyectores con émbolo, sellos y stencils.', cover: 'cortador-galletas', cat: 'cocina',
    items: ['cortador-galletas', 'eyector', 'sello-imagen', 'sello-letras', 'stencil', 'sello-eva', 'soporte-torta', 'cortador-rectangulos', 'rodillo-textura'] },
  { id: 'imagen', icon: 'image', tone: 'rose', title: 'Imagen a 3D', desc: 'Tu logo o dibujo a pieza imprimible, y litofanías de tus fotos.', cover: 'dibujo-stl', cat: 'imagen',
    items: ['dibujo-stl', 'litofania', 'rompecabezas', 'line-art', 'posavasos-imagen', 'colorear', 'imagen-multipartes', 'imagen-resina'] },
  { id: 'hogar', icon: 'home', tone: 'green', title: 'Hogar y organización', desc: 'Cajas, Gridfinity, portalápices, porta-marcadores, posavasos, ganchos y soportes.', cover: 'cajas', cat: 'hogar',
    items: ['cajas', 'gridfinity', 'portalapices', 'porta-boligrafos', 'posavasos', 'ganchos', 'soporte-celular', 'caja-figuritas', 'packaging', 'soporte-universal'] },
  { id: 'taller', icon: 'gear', tone: 'slate', title: 'Taller y repuestos', desc: 'Engranajes, adaptadores de medidas y gabinetes para electrónica.', cover: 'engranajes', cat: 'taller',
    items: ['engranajes', 'adaptador', 'caja-electronica', 'repara', 'jig', 'conectores', 'roscas', 'mueble-salvado'] },
  { id: 'deco', icon: 'lamp', tone: 'yellow', title: 'Deco y lámparas', desc: 'Floreros, pantallas y bowls en espiral para modo vaso.', cover: 'vasos-espiral', cat: 'deco',
    items: ['vasos-espiral', 'bowls', 'lampara-letra', 'lampara-social', 'string-art'] },
  { id: 'letras', icon: 'letter', tone: 'cyan', title: 'Letras grandes', desc: 'Inicial grande con nombre y letras corpóreas que se cortan solas para la cama.', cover: 'letra-grande', cat: 'letras',
    items: ['letra-grande', 'corporeas', 'neon-flex'] },
];

export const familyOf = id => FAMILIES.find(f => f.items.includes(id));

/**
 * Datos que se comparten entre las opciones de un mismo programa: si escribís "Joni" en un
 * llavero y pasás a otro estilo, el nombre, la letra y los colores te siguen.
 * Cada grupo junta los nombres de campo que significan lo mismo en distintos generadores.
 */
export const SHARED_GROUPS = {
  texto: ['text', 'line1', 'name', 'text1'],
  texto2: ['line2', 'text2'],
  letra: ['font', 'font1'],
  colores: ['colors'],
  colorBase: ['cBase'],
  colorMedio: ['cMid'],
  colorTexto: ['cText'],
  colorClaro: ['cLight'],
  colorOscuro: ['cDark'],
  qrLink: ['link'],
  wifi: ['ssid'], clave: ['pass'], red: ['network'], usuario: ['user'],
  anillo: ['ring'],
};
export const FAMILY_SHARE = {
  llaveros: ['texto', 'texto2', 'letra', 'colores', 'colorBase', 'colorMedio', 'colorTexto', 'anillo'],
  letreros: ['texto', 'texto2', 'letra', 'colores', 'colorBase', 'colorMedio', 'colorTexto'],
  qr: ['colorBase', 'colorClaro', 'colorOscuro', 'qrLink', 'wifi', 'clave', 'red', 'usuario'],
  placas: ['colorBase'],
  fiestas: ['texto', 'letra'],
  cocina: [],
  mascotas: [],
  imagen: [],
  hogar: ['texto', 'letra'],
  taller: [],
  deco: [],
  letras: ['letra'],
};
