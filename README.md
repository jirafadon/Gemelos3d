# Gemelos 3D Lab

Catálogo de generadores paramétricos para impresión 3D, al estilo MakerLab.
Elegís un producto, lo personalizás y bajás un 3MF con los colores separados, listo para la Snapmaker U1.
Uso personal: no hay cuentas ni cobros.

La versión anterior del proyecto quedó guardada en la rama `legacy-v1`.

## Cómo correrlo

```bash
npm install
npm run dev      # servidor local con recarga
npm test         # pruebas del motor 3D (Node)
npm run build    # sitio estático en dist/
```

## Apps

- **Calculadora de presupuestos** (`public/calculadora.html`): precio desde STL, 3MF o G-code.
- **Taller 3D** (`src/taller/`, ruta `#/taller`): editor estilo Tinkercad. 14 formas con parámetros (caja redondeada, cilindro, esfera, cono, techo, pirámide, media esfera, cuña, tubo, toroide, polígono, estrella, corazón, paraboloide), texto, imagen y STL. Manijas para mover/rotar/escalar, selección múltiple, grupos (los huecos restan solo dentro del grupo; multicolor o de un color), deshacer/rehacer, copiar/pegar, duplicar repitiendo el movimiento, alinear, espejar, ocultar, bloquear, grilla y medidas. Cada generador tiene "Seguir editando en el Taller 3D".

## IA: "Describí tu pieza" (Taller 3D)

La función `api/disenar.js` (Vercel) le pasa la descripción a Claude y devuelve formas del Taller.
Para activarla, en Vercel → proyecto → Settings → Environment Variables:

- `ANTHROPIC_API_KEY` (obligatoria): clave de https://console.anthropic.com
- `LAB_PASSWORD` (recomendada): si la definís, la página pide esa clave una vez antes de usar la IA, así nadie más gasta tus créditos.
- `ANTHROPIC_MODEL` (opcional): modelo a usar; por defecto `claude-sonnet-5-5`.

Después de cargarlas, volvé a publicar (Deployments → Redeploy).

## Estructura

```
index.html               Entrada del sitio (catálogo + páginas de generador por hash: #/g/<id>)
public/calculadora.html  Calculadora de presupuestos (comparte el perfil con el Lab)
public/thumbs/           Miniaturas de los generadores listos (<id>.jpg)
src/catalog.js           Lista completa de generadores, categorías y fase de cada uno
src/main.js              Router, catálogo y página de generador
src/ui/params.js         Panel de parámetros generado desde el esquema
src/engine/              Motor 3D compartido
  geom.js                Texto → formas 2D, contornos, argollas, extrusión (manifold-3d)
  export.js              STL, 3MF multicolor y ZIP de STL por color
  viewer.js              Visor three.js (Z hacia arriba)
  fonts.js               Tipografías libres (OFL) vía @fontsource
  cost.js                Gramos, tiempo y costo con el perfil de la calculadora
  gc.js                  Limpieza de memoria de WebAssembly
src/generators/<id>.js   Un archivo por generador
tests/                   Pruebas del motor y de cada generador
```

## Cómo agregar un generador

1. Crear `src/generators/<id>.js` exportando `{ id, title, description, params, build }`.
   - `params`: lista de campos (`group`, `text`, `number`, `segment`, `select`, `toggle`, `color`, `font`), cada uno con `key`, `label`, `default` y opcionalmente `show: v => …`.
   - `build(values, ctx)`: devuelve una lista de piezas `part(nombre, color, sólido)`. `ctx.font(id)` carga una tipografía.
2. En `src/catalog.js`, agregarle `() => import('./generators/<id>.js')` a su entrada.
3. Sumar una prueba en `tests/` que lo genere con los valores por defecto y verifique que las piezas sean sólidos válidos y no se pisen.
4. Agregar la miniatura `public/thumbs/<id>.jpg`.

Regla: cada generador es independiente. Arreglar o agregar uno nunca debe tocar otro; lo compartido vive en `src/engine/`.

## Fases

| Fase | Contenido |
|---|---|
| 0 | Motor, catálogo, visor, exportación, calculadora ✅ |
| 1 | Texto y capas: llaveros, placas de mascota, colgantes, letreros, @usuario, placas con base, toppers, estacas, adornos ✅ (falta marcapáginas → fase 2, usa imagen) |
| 2 | QR e imagen: placas QR (Mercado Pago, WiFi, redes, Google, lista, tarjeta, QR 3D) ✅, imagen→silueta ✅, dibujo a STL ✅, cortador ✅, sello ✅, llavero con logo ✅ · faltan: eyector, sellos de letras/EVA, stencils, colorear, posavasos a color, line art, multipartes, marcapáginas |
| 3 | Paramétricos sólidos: cajas, Gridfinity, gabinetes, adaptadores, soportes, ganchos, repuestos, bottons |
| 4 | Superficies: litofanía, bowls, vasos y lámparas en espiral, letras grandes, string art, rompecabezas, texturas |
| 5 | Avanzados: letras corpóreas con división por cama, neón flex, cortar por color con encastres, moldes, roscas, engranajes |

Los productos están inspirados en tipos de producto comunes (MakerLab, Mafagrafos, Área Maker, PROLED3D, CORTO, etc.); el código, los diseños y las imágenes son propios.
