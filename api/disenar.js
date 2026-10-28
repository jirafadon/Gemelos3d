/**
 * Función de Vercel: "Describí tu pieza".
 * Recibe una descripción en castellano y devuelve objetos del Taller 3D
 * (formas con medidas, posición, color y huecos) armados por Claude.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   ANTHROPIC_API_KEY  (obligatoria) clave de la API de Anthropic
 *   ANTHROPIC_MODEL    (opcional)    modelo a usar; por defecto claude-sonnet-5-5
 *   LAB_PASSWORD       (opcional)    si se define, la página tiene que mandar esta clave
 */

export const SHAPE_TYPES = ['box', 'cylinder', 'sphere', 'cone', 'roof', 'pyramid', 'halfsphere', 'wedge', 'tube', 'torus', 'polygon', 'star', 'heart', 'paraboloid', 'text'];
export const FONTS = ['pacifico', 'lobster', 'dancing', 'great-vibes', 'fredoka', 'baloo', 'poppins', 'righteous', 'bangers', 'anton', 'bebas', 'oswald'];

const SYSTEM = `Sos el asistente de diseño del "Taller 3D", un editor estilo Tinkercad para impresión 3D (Snapmaker U1, cama de 270 × 270 mm).
Tu trabajo: convertir lo que pide la persona en una lista de formas simples combinadas, usando la herramienta armar_diseno.

Reglas del Taller:
- Todo está en milímetros. El eje Z es la altura.
- x e y son el CENTRO del objeto; z es la altura de su BASE (z = 0 apoya en la cama).
- w, d y h son el tamaño en X, Y y Z del objeto antes de rotarlo.
- rx, ry, rz son rotaciones en grados alrededor de X, Y y Z.
- hole = true convierte el objeto en HUECO: resta volumen. Un hueco suelto resta a todo lo que toca;
  si querés que reste solo a algunas piezas, poné el mismo "group" en las piezas y en el hueco.
- Formas disponibles: box (caja; "radius" redondea bordes), cylinder ("sides" lados), sphere, cone ("top" radio de la punta 0–1),
  roof (techo a dos aguas), pyramid, halfsphere (cúpula), wedge (cuña), tube (caño; "wall" pared), torus (aro; h = grosor del aro),
  polygon (prisma de "sides" lados), star ("points" puntas, "inner" radio interno 0–1), heart, paraboloid, text (texto en relieve:
  "text" y "font"; d = alto de las letras, h = espesor; w = ancho máximo).
- Colores en hexadecimal (#RRGGBB). Usá pocos colores y que tengan sentido.

Cómo diseñar bien para imprimir:
- Pensá la pieza como una suma de formas y huecos, como en Tinkercad.
- Apoyá la pieza en la cama (la parte más baja en z = 0) y evitá voladizos grandes sin soporte.
- Paredes de al menos 1,2 mm; agujeros para tornillos 0,2–0,4 mm más grandes que el tornillo.
- Los huecos tienen que atravesar bien: hacelos un poco más altos que lo que cortan (sobresaliendo 1 mm arriba y abajo).
- Usá la menor cantidad de objetos que logre la forma pedida (normalmente entre 1 y 25).
- Si te pasan el diseño actual y piden un cambio, devolvé SOLO los objetos nuevos o de reemplazo y explicalo en "nota".
- Si algo no se puede hacer con estas formas, aproximalo y aclaralo en "nota".`;

const TOOL = {
  name: 'armar_diseno',
  description: 'Devuelve los objetos del Taller 3D que forman la pieza pedida.',
  input_schema: {
    type: 'object',
    properties: {
      nota: { type: 'string', description: 'Explicación corta (1–3 oraciones) de cómo está armada la pieza, en castellano rioplatense.' },
      reemplazar: { type: 'boolean', description: 'true si estos objetos reemplazan todo el diseño actual; false si se agregan.' },
      objetos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: SHAPE_TYPES },
            name: { type: 'string' },
            x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' },
            w: { type: 'number' }, d: { type: 'number' }, h: { type: 'number' },
            rx: { type: 'number' }, ry: { type: 'number' }, rz: { type: 'number' },
            color: { type: 'string' },
            hole: { type: 'boolean' },
            group: { type: 'string', description: 'Nombre de grupo: los huecos de un grupo restan solo dentro de él.' },
            text: { type: 'string' }, font: { type: 'string', enum: FONTS },
            radius: { type: 'number' }, sides: { type: 'number' }, top: { type: 'number' },
            wall: { type: 'number' }, points: { type: 'number' }, inner: { type: 'number' },
          },
          required: ['type', 'x', 'y', 'z', 'w', 'd', 'h'],
        },
      },
    },
    required: ['objetos', 'nota'],
  },
};

const num = (v, def, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };

/** Deja solo campos conocidos y con valores razonables. */
export function sanitize(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 60).filter(o => o && SHAPE_TYPES.includes(o.type)).map((o, i) => {
    const c = {
      type: o.type, name: String(o.name || `${o.type} ${i + 1}`).slice(0, 60),
      x: num(o.x, 0, -300, 300), y: num(o.y, 0, -300, 300), z: num(o.z, 0, -100, 400),
      w: num(o.w, 20, 0.2, 400), d: num(o.d, 20, 0.2, 400), h: num(o.h, 20, 0.2, 400),
      rx: num(o.rx, 0, -360, 360), ry: num(o.ry, 0, -360, 360), rz: num(o.rz, 0, -360, 360),
      color: /^#[0-9a-fA-F]{6}$/.test(o.color || '') ? o.color.toUpperCase() : '#1D4ED8',
      hole: !!o.hole,
    };
    if (o.group) c.group = String(o.group).slice(0, 40);
    if (o.type === 'text') { c.text = String(o.text || 'Texto').slice(0, 200); c.font = FONTS.includes(o.font) ? o.font : 'baloo'; }
    if (o.radius != null) c.radius = num(o.radius, 0, 0, 100);
    if (o.sides != null) c.sides = Math.round(num(o.sides, 64, 3, 128));
    if (o.top != null) c.top = num(o.top, 0, 0, 1);
    if (o.wall != null) c.wall = num(o.wall, 2, 0.4, 100);
    if (o.points != null) c.points = Math.round(num(o.points, 5, 3, 16));
    if (o.inner != null) c.inner = num(o.inner, 0.45, 0.1, 0.95);
    return c;
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usá POST' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'Falta configurar la clave ANTHROPIC_API_KEY en Vercel.', code: 'no_key' });
  if (process.env.LAB_PASSWORD && req.headers['x-lab-password'] !== process.env.LAB_PASSWORD) {
    return res.status(401).json({ error: 'Clave del Lab incorrecta.', code: 'bad_password' });
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const prompt = String(body.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Escribí qué pieza querés.' });
  if (prompt.length > 2000) return res.status(400).json({ error: 'La descripción es muy larga (máximo 2000 caracteres).' });
  const scene = Array.isArray(body.scene) ? sanitize(body.scene).slice(0, 40) : [];

  const userText = scene.length
    ? `Diseño actual en el Taller (para referencia):\n${JSON.stringify(scene)}\n\nPedido: ${prompt}`
    : `Pedido: ${prompt}`;

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 6000,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: TOOL.name },
        messages: [{ role: 'user', content: userText }],
      }),
    });
  } catch {
    return res.status(502).json({ error: 'No se pudo conectar con la IA. Probá de nuevo en un rato.' });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `Error ${r.status}`;
    return res.status(r.status === 401 ? 503 : 502).json({ error: r.status === 401 ? 'La clave de Anthropic no es válida.' : `La IA respondió con un error: ${msg}` });
  }
  const call = (data.content || []).find(c => c.type === 'tool_use' && c.name === TOOL.name);
  if (!call) return res.status(502).json({ error: 'La IA no devolvió un diseño. Probá describirlo de otra forma.' });
  const objects = sanitize(call.input?.objetos);
  if (!objects.length) return res.status(422).json({ error: 'No pude armar esa pieza con las formas del Taller. Probá con más detalle.' });
  return res.status(200).json({ objects, note: String(call.input?.nota || ''), replace: !!call.input?.reemplazar, usage: data.usage || null });
}
