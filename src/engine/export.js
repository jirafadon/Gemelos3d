/**
 * Exportación de modelos: STL binario y 3MF con una pieza por color.
 * El 3MF arma un único objeto con varias partes (componentes), así Orca / Bambu
 * Studio lo abren como un solo objeto multicolor con las partes en su lugar.
 */
import { zipSync, strToU8 } from 'fflate';

/** Triángulos de un Manifold como Float32Array (9 valores por triángulo). */
export function solidToTriangles(solid) {
  const mesh = solid.getMesh();
  const { vertProperties: v, triVerts: t, numProp: n } = mesh;
  const out = new Float32Array(t.length * 3);
  for (let i = 0; i < t.length; i++) {
    const vi = t[i] * n;
    out[i * 3] = v[vi]; out[i * 3 + 1] = v[vi + 1]; out[i * 3 + 2] = v[vi + 2];
  }
  return out;
}

/** Desplazamiento que apoya el modelo en z=0 y lo centra en la cama. */
export function bedOffset(parts, bed = { x: 270, y: 270 }) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    const b = p.solid.boundingBox();
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], b.min[i]); max[i] = Math.max(max[i], b.max[i]); }
  }
  return [bed.x / 2 - (min[0] + max[0]) / 2, bed.y / 2 - (min[1] + max[1]) / 2, -min[2]];
}

export function toSTL(triangleArrays, offset = [0, 0, 0]) {
  const count = triangleArrays.reduce((a, t) => a + t.length / 9, 0);
  const buf = new ArrayBuffer(84 + count * 50);
  const dv = new DataView(buf);
  const header = 'Gemelos 3D Lab';
  for (let i = 0; i < header.length; i++) dv.setUint8(i, header.charCodeAt(i));
  dv.setUint32(80, count, true);
  let o = 84;
  for (const tri of triangleArrays) {
    for (let i = 0; i < tri.length; i += 9) {
      const ax = tri[i], ay = tri[i + 1], az = tri[i + 2];
      const ux = tri[i + 3] - ax, uy = tri[i + 4] - ay, uz = tri[i + 5] - az;
      const vx = tri[i + 6] - ax, vy = tri[i + 7] - ay, vz = tri[i + 8] - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / len, true); dv.setFloat32(o + 4, ny / len, true); dv.setFloat32(o + 8, nz / len, true);
      for (let j = 0; j < 9; j++) dv.setFloat32(o + 12 + j * 4, tri[i + j] + offset[j % 3], true);
      dv.setUint16(o + 48, 0, true);
      o += 50;
    }
  }
  return new Uint8Array(buf);
}

const xmlEsc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/** 3MF con una parte por pieza, cada una con su color. */
export function to3MF(parts, { name = 'Gemelos 3D', bed } = {}) {
  const off = bedOffset(parts, bed);
  const colors = parts.map(p => (p.color || '#cccccc').toUpperCase());
  const objects = parts.map((p, idx) => {
    const mesh = p.solid.getMesh();
    const { vertProperties: v, triVerts: t, numProp: n } = mesh;
    const nv = v.length / n;
    const verts = new Array(nv);
    for (let i = 0; i < nv; i++) verts[i] = `<vertex x="${(v[i * n]).toFixed(4)}" y="${(v[i * n + 1]).toFixed(4)}" z="${(v[i * n + 2]).toFixed(4)}"/>`;
    const tris = new Array(t.length / 3);
    for (let i = 0; i < t.length; i += 3) tris[i / 3] = `<triangle v1="${t[i]}" v2="${t[i + 1]}" v3="${t[i + 2]}"/>`;
    return `<object id="${idx + 2}" name="${xmlEsc(p.name)}" type="model" pid="1" pindex="${idx}"><mesh><vertices>${verts.join('')}</vertices><triangles>${tris.join('')}</triangles></mesh></object>`;
  });
  const parentId = parts.length + 2;
  const components = parts.map((_, idx) => `<component objectid="${idx + 2}"/>`).join('');
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="es-AR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${xmlEsc(name)}</metadata>
<metadata name="Application">Gemelos 3D Lab</metadata>
<resources>
<basematerials id="1">${colors.map((c, i) => `<base name="${xmlEsc(parts[i].name)}" displaycolor="${c}FF"/>`).join('')}</basematerials>
${objects.join('\n')}
<object id="${parentId}" name="${xmlEsc(name)}" type="model"><components>${components}</components></object>
</resources>
<build><item objectid="${parentId}" transform="1 0 0 0 1 0 0 0 1 ${off.map(x => x.toFixed(4)).join(' ')}"/></build>
</model>`;
  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`),
    '3D/3dmodel.model': strToU8(model),
  };
  return zipSync(files, { level: 6 });
}

/** ZIP con un STL por pieza. */
export function toSTLZip(parts, bed) {
  const off = bedOffset(parts, bed);
  const files = {};
  parts.forEach((p, i) => {
    const safe = `${String(i + 1).padStart(2, '0')}_${p.name}`.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, '').trim().replace(/\s+/g, '_');
    files[`${safe}.stl`] = toSTL([solidToTriangles(p.solid)], off);
  });
  return zipSync(files, { level: 6 });
}

export function mergedSTL(parts, bed) {
  return toSTL(parts.map(p => solidToTriangles(p.solid)), bedOffset(parts, bed));
}

export function download(bytes, filename, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
