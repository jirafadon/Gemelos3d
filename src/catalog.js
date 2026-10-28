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

export const GENERATORS = [
  // ---------- Nombres y llaveros ----------
  g('llavero-nombre', 'Llavero de nombre', 'Nombre con contorno en 1, 2 o 3 colores, superposición de letras y argolla.', 'nombres', 1, () => import('./generators/llavero-nombre.js')),
  g('llavero-nombre-completo', 'Llavero nombre y apellido', 'Dos líneas de texto sobre placa con borde.', 'nombres', 1),
  g('llavero-rectangular', 'Llavero rectangular', 'Placa rectangular con nombre en relieve o al ras.', 'nombres', 1),
  g('llavero-logo', 'Llavero con nombre y logo', 'Texto más un ícono o logo desde imagen.', 'nombres', 2),
  g('llavero-forma', 'Llavero con forma', 'Zanahoria, conejo, corazón u otra silueta con nombre encima.', 'nombres', 2),
  g('llavero-espejo', 'Llavero con espejo', 'Aro con texto para encastrar un espejo redondo.', 'nombres', 3),
  g('llavero-nfc', 'Llavero NFC', 'Llavero con alojamiento para tag NFC (cuadrado, redondo o carrete).', 'nombres', 3),
  g('placa-mascota', 'Placa de mascota', 'Hueso, pez, ovalada, ondulada o con la forma que quieras, con nombre y teléfono.', 'nombres', 1),
  g('colgante-familia', 'Colgante de nombres familiares', 'Cadena de corazones o patitas con un nombre en cada uno.', 'nombres', 1),
  g('rosa-nombre', 'Rosa con nombre', 'Rosa con el nombre en letra cursiva unido al tallo.', 'nombres', 2),
  g('marcapaginas', 'Marcapáginas', 'Geométrico, floral, elegante o con imagen, con nombre que asoma del libro.', 'nombres', 2),
  g('cubos-apilables', 'Cubos apilables', 'Bloques con encastre y letras en relieve para armar nombres.', 'nombres', 3),
  g('abrelatas', 'Abrelatas / llavero de lata', 'Llavero que abre latas, con texto o NFC.', 'nombres', 3),

  // ---------- Carteles y letreros ----------
  g('letrero-palabras', 'Letrero de palabras superpuestas', 'Dos o tres palabras encimadas en 2 o 3 colores, con base.', 'carteles', 1),
  g('letras-separadas', 'Letrero de letras separadas', 'Cada letra con su contorno, unidas por una base.', 'carteles', 1),
  g('letrero-social', 'Letrero @usuario', 'Tu usuario de redes en 2 o 3 colores, libre o en rectángulo.', 'carteles', 1),
  g('placa-profesional', 'Placa profesional', 'Nombre, profesión e ícono sobre base de escritorio.', 'carteles', 1),
  g('placa-rayas', 'Placa con rayas y base', 'Placa con fondo rayado y texto, para regalar.', 'carteles', 1),
  g('cuadro-marco', 'Cuadro con marco', 'Cuadro con texto, fecha y datos (ideal nacimientos), con marco y pie.', 'carteles', 1),
  g('palabra-corazon', 'Palabra en 2 capas con corazón', 'Palabra cursiva con un corazón final, en dos capas.', 'carteles', 1),
  g('letrero-imagen', 'Letrero con imagen', 'Una o dos líneas de texto más un ícono, en 2 o 3 colores.', 'carteles', 2),
  g('letrero-multipart', 'Letrero multipartes desde imagen', 'Logo o dibujo separado en capas de color para encastrar.', 'carteles', 2),
  g('trofeo', 'Trofeo imagen + texto', 'Trofeo con logo y placa grabada.', 'carteles', 2),
  g('texto-guia', 'Texto de pared con guía', 'Letras grandes para pegar en pared, con plantilla de colocación.', 'carteles', 3),

  // ---------- QR y comercios ----------
  g('placa-qr', 'Placa QR', 'QR con texto o logo sobre placa con soporte.', 'qr', 2),
  g('placa-qr-mp', 'Placa de cobro Mercado Pago / alias', 'QR de cobro con alias y logo de tu comercio.', 'qr', 2),
  g('placa-wifi', 'Placa QR WiFi', 'El QR conecta directo a tu WiFi, con red y clave impresas.', 'qr', 2),
  g('placa-redes', 'Placa QR de redes', 'Instagram, TikTok, YouTube o WhatsApp con su QR.', 'qr', 2),
  g('placa-google', 'Placa "Dejanos tu reseña"', 'QR a tu ficha de Google para pedir reseñas.', 'qr', 2),
  g('lista-qr', 'Lista de códigos QR', 'Varios QR en una placa vertical u horizontal, en capas.', 'qr', 2),
  g('qr-3d', 'QR 3D', 'Código QR imprimible suelto o como llavero.', 'qr', 2),
  g('tarjeta-presentacion', 'Tarjeta de presentación', 'Tarjeta con QR, datos y soporte para exhibir.', 'qr', 2),
  g('exhibidor-salon', 'Exhibidor para salón', 'Exhibidor con logo para uñas, pestañas u otros servicios.', 'qr', 3),

  // ---------- Cocina y repostería ----------
  g('cortador-galletas', 'Cortador de galletas', 'Con forma, nombre o desde imagen. Con filo, refuerzo y faldón.', 'cocina', 2),
  g('eyector', 'Eyector de masa', 'Cortador con émbolo para galletitas, caramelos y bombones.', 'cocina', 2),
  g('sello-imagen', 'Sello desde imagen', 'Sello circular o con forma para bombones, galletitas o fondant.', 'cocina', 2),
  g('sello-letras', 'Sellos de letras y números', 'Sellos individuales con mango para escribir en masas.', 'cocina', 2),
  g('sello-eva', 'Sello para goma EVA / plastilina', 'Molde de estampado desde texto o imagen.', 'cocina', 2),
  g('topper-torta', 'Topper de torta', 'Nombre, edad y frase con púas, también circular.', 'cocina', 1),
  g('estacas', 'Señaladores y estacas', 'Carteles con estaca para macetas, huertas y tortas.', 'cocina', 1),
  g('adorno-galleta', 'Adorno tipo galleta', 'Adornos navideños con dibujo en relieve estilo galleta decorada.', 'cocina', 2),
  g('soporte-torta', 'Soporte de torta', 'Base giratoria o fija con borde decorado.', 'cocina', 3),
  g('soporte-palillos', 'Soporte para palillos', 'Pie para pinchos y palillos decorativos.', 'cocina', 3),
  g('cortador-rectangulos', 'Cortador en cuadrícula', 'Corta varios rectángulos iguales de una sola vez.', 'cocina', 3),
  g('rodillo-textura', 'Rodillo texturizado', 'Rodillo con patrón o mosaico para masas y porcelana fría.', 'cocina', 4),
  g('stencil', 'Stencils y plantillas', 'Plantillas de texto o formas con puentes automáticos.', 'cocina', 2),

  // ---------- Foto e imagen ----------
  g('dibujo-stl', 'De dibujo a STL', 'DXF, SVG o imagen a pieza imprimible, con placa base opcional.', 'imagen', 2),
  g('line-art', 'Placa de line art', 'Dibujo de línea fina parado sobre base con nombre.', 'imagen', 2),
  g('posavasos-imagen', 'Posavasos con imagen', 'Tu foto o logo separada en hasta 4 colores.', 'imagen', 2),
  g('litofania', 'Litofanía', 'Foto que aparece a contraluz: plana, curva o para lámpara.', 'imagen', 4),
  g('colorear', 'Para colorear', 'Dibujo con bordes en relieve para pintar con marcadores.', 'imagen', 2),
  g('imagen-multipartes', 'Imagen multipartes', 'Imagen dividida en piezas de color que encastran.', 'imagen', 2),
  g('imagen-resina', 'Imagen con bordes altos para resina', 'Molde abierto para rellenar con resina o glitter.', 'imagen', 2),
  g('rompecabezas', 'Rompecabezas', 'Foto o dibujo a rompecabezas, con marco y piezas de colores.', 'imagen', 4),
  g('portafotos', 'Portafotos', 'Portafotos colgante o de mesa con texto.', 'imagen', 3),
  g('botton', 'Accesorios para botton', 'Imán, llavero y adorno con borde para chapitas, y test de tamaño.', 'imagen', 3),

  // ---------- Hogar y organización ----------
  g('cajas', 'Cajas y organizadores', 'Cajitas a medida con divisiones y tapa a presión.', 'hogar', 3),
  g('gridfinity', 'Gridfinity', 'Bins, bandejas, divisiones y bases sobre la grilla estándar.', 'hogar', 3),
  g('packaging', 'Packaging', 'Bandejas, insertos, separadores y esquineros a medida.', 'hogar', 3),
  g('portalapices', 'Portalápices con nombre', 'Portalápices con el nombre al frente.', 'hogar', 3),
  g('porta-boligrafos', 'Porta-marcadores paramétrico', 'Grilla de alojamientos para marcadores o pinceles.', 'hogar', 3),
  g('caja-figuritas', 'Caja de figuritas', 'Caja con divisiones para figuritas o pegatinas.', 'hogar', 3),
  g('estuche-labial', 'Estuche de labial', 'Estuche con tapa, nombre y argolla.', 'hogar', 3),
  g('portapeine', 'Portapeine de pestañas', 'Tubo con tapa para cepillos y peines de pestañas.', 'hogar', 3),
  g('caja-panuelos', 'Caja de pañuelos', 'Cubre rollo o caja de pañuelos con texto en la tapa.', 'hogar', 4),
  g('ganchos', 'Ganchos de pared', 'Ganchos para llaves, auriculares o carteras.', 'hogar', 3),
  g('soporte-universal', 'Soporte universal', 'Soportes de escritorio, pared o debajo de mesa.', 'hogar', 3),
  g('peines', 'Peines con formas', 'Peines con dientes y mango a medida.', 'hogar', 3),
  g('contenedor-sellos', 'Contenedor de sellos', 'Caja para guardar sellos de plastilina o masa.', 'hogar', 3),
  g('contador-rascar', 'Contador para rascar', 'Tablero de casilleros para metas o rifas.', 'hogar', 3),

  // ---------- Taller y repuestos ----------
  g('caja-electronica', 'Caja para electrónica', 'Gabinetes para placas con postes, conectores y tapa.', 'taller', 3),
  g('adaptador', 'Adaptador de medidas', 'Une dos medidas: recto, reductor o codo, circular o rectangular.', 'taller', 3),
  g('repara', 'Repará 3D', 'Perillas, patas, bujes, manijas, tapas y clips a medida.', 'taller', 3),
  g('mueble-salvado', 'Mueble salvado', 'Pata, tirador, cuña o pasacables con medidas simples.', 'taller', 3),
  g('jig', 'Plantilla de perforación', 'Guías para agujerear con cotas y patrones repetibles.', 'taller', 3),
  g('roscas', 'Roscas y fijaciones', 'Roscas métricas, perillas y calibres de prueba.', 'taller', 5),
  g('engranajes', 'Engranajes', 'Engranajes rectos parametrizados por módulo y dientes.', 'taller', 5),
  g('conectores', 'Conectores de estructura', 'Uniones en T, L y cruz para varillas o caños.', 'taller', 3),

  // ---------- Deco y lámparas ----------
  g('bowls', 'Bowls y cuencos', 'Cuencos, fruteras y macetas con ondas o espiral.', 'deco', 4),
  g('vasos-espiral', 'Vasos y lámparas en espiral', 'Pantallas y floreros para modo vaso, con giro y ondas.', 'deco', 4),
  g('lampara-letra', 'Lámpara de letra con nombre', 'Letra grande hueca para LED con el nombre encima.', 'deco', 4),
  g('lampara-social', 'Lámpara LED @usuario', 'Letrero hueco para tira LED con tu usuario.', 'deco', 4),
  g('string-art', 'String art', 'Marco con hilos tensados y nombre flotante.', 'deco', 4),
  g('mini-microfono', 'Mini micrófono', 'Micrófono de juguete con cubo de logo personalizable.', 'deco', 3),
  g('adorno-navidad', 'Adornos navideños', 'Bolas, copos y estrellas con nombre calado.', 'deco', 1),
  g('thermoform', 'Texturas tipo tela', 'Piezas con textura de malla o tela para imprimir sobre tela.', 'deco', 4),

  // ---------- Letras grandes ----------
  g('letra-grande', 'Letra grande con nombre', 'Inicial grande con nombre encima: hundido, con textura, borde, floral o brillo.', 'letras', 4),
  g('corporeas', 'Letras corpóreas', 'Carteles gigantes que se cortan solos para entrar en la cama, con conectores.', 'letras', 5),
  g('neon-flex', 'Cartel de neón flex', 'Base con canal para neón flex desde logo o dibujo.', 'letras', 5),

  // ---------- Herramientas STL ----------
  g('separar-color', 'Separar STL por color', 'Divide un modelo en piezas por color con encastres.', 'herramientas', 5),
  g('cortar-conectar', 'Cortá y conectá', 'Corta un STL y agrega encastres, bisagras o rótulas.', 'herramientas', 5),
  g('moldes-silicona', 'Moldes de silicona', 'Genera la caja del molde con llaves de registro a partir de tu pieza.', 'herramientas', 5),
];

export const findGenerator = id => GENERATORS.find(x => x.id === id);
