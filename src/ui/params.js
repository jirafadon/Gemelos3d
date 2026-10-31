/**
 * Panel de parámetros generado a partir del esquema de cada generador.
 * Tipos: group, text, number, segment, select, toggle, color, font.
 */
import { FONTS, FONT_KINDS, registerCssFont } from '../engine/fonts.js';
import { fileToDataURL } from '../engine/image.js';

export const PALETTE = [
  ['Blanco', '#F5F5F5'], ['Perla', '#EAE7DC'], ['Beige', '#E9D8A6'], ['Negro', '#1E1E1E'], ['Gris', '#8D99AE'], ['Plateado', '#C0C0C0'],
  ['Rojo', '#D62828'], ['Bordó', '#7B1E3A'], ['Coral', '#FF6F59'], ['Naranja', '#F77F00'], ['Amarillo', '#FCBF49'], ['Amarillo pastel', '#FFF3B0'],
  ['Dorado', '#C9A227'], ['Cobre', '#B87333'], ['Bronce', '#8C6239'], ['Madera', '#B08968'], ['Marrón', '#7F4F24'],
  ['Verde', '#2A9D8F'], ['Verde oscuro', '#1B4332'], ['Lima', '#8AC926'], ['Menta', '#B9FBC0'], ['Turquesa', '#00A6A6'],
  ['Celeste', '#4CC9F0'], ['Celeste pastel', '#A2D2FF'], ['Azul', '#1D4ED8'], ['Azul marino', '#14213D'],
  ['Violeta', '#7B2CBF'], ['Lila', '#C8B6FF'], ['Rosa', '#F72585'], ['Fucsia', '#D90368'], ['Rosa pastel', '#FFC8DD'],
];

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function defaultValues(schema) {
  return Object.fromEntries(schema.filter(p => p.key).map(p => [p.key, p.default]));
}

// Texto de muestra para el selector de tipografías: lo primero que escribiste
let sample = { key: null, get: () => '' };

export function renderParams(root, schema, values, onChange) {
  root.innerHTML = '';
  const firstText = schema.find(p => p.type === 'text' && typeof values[p.key] === 'string');
  sample = { key: firstText?.key || null, get: () => String((firstText && values[firstText.key]) || '').split('\n')[0].trim().slice(0, 18) };
  const wrappers = [];

  const updateVisibility = () => {
    for (const { el, p } of wrappers) {
      el.hidden = p.show ? !p.show(values) : false;
      // Ayudas que dependen de lo que se escribió (ej.: a qué link lleva el QR)
      if (typeof p.hint === 'function') el.querySelector('.p-hint').textContent = p.hint(values) || '';
    }
    // Oculta los títulos de grupo que quedaron sin campos visibles
    root.querySelectorAll('.p-group').forEach(gr => {
      gr.hidden = ![...gr.querySelectorAll('.p-field')].some(f => !f.hidden);
    });
  };
  const set = (key, val) => {
    values[key] = val; updateVisibility(); onChange(values, key);
    if (key === sample.key) root.querySelectorAll('.p-font-sample').forEach(e => { e.textContent = sample.get() || e.dataset.name; });
  };

  let group = root;
  for (const p of schema) {
    if (p.type === 'group') {
      group = document.createElement('section');
      group.className = 'p-group';
      group.innerHTML = `<h3>${esc(p.label)}</h3>`;
      root.appendChild(group);
      continue;
    }
    const el = document.createElement('div');
    el.className = 'p-field';
    el.innerHTML = `<label class="p-label">${esc(p.label)}</label>`;
    const body = fieldBody(p, values, set);
    el.appendChild(body);
    if (p.hint) el.insertAdjacentHTML('beforeend', `<div class="p-hint">${typeof p.hint === 'function' ? '' : esc(p.hint)}</div>`);
    group.appendChild(el);
    wrappers.push({ el, p });
  }
  updateVisibility();
}

function fieldBody(p, values, set) {
  const box = document.createElement('div');
  const v = values[p.key];
  switch (p.type) {
    case 'text': {
      const input = document.createElement(p.multiline ? 'textarea' : 'input');
      input.className = 'p-input';
      if (p.multiline) input.rows = Math.max(1, String(v || '').split('\n').length);
      input.value = v ?? '';
      input.placeholder = p.placeholder || '';
      input.addEventListener('input', () => {
        if (p.multiline) input.rows = Math.max(1, Math.min(4, input.value.split('\n').length));
        set(p.key, input.value);
      });
      box.appendChild(input);
      break;
    }
    case 'number': {
      box.className = 'p-number';
      box.innerHTML = `<input type="range" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${v}">
        <div class="p-num"><input type="number" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${v}"><span>${esc(p.unit || '')}</span></div>`;
      const [range, num] = box.querySelectorAll('input');
      range.addEventListener('input', () => { num.value = range.value; set(p.key, +range.value); });
      num.addEventListener('input', () => {
        const n = parseFloat(String(num.value).replace(',', '.'));
        if (!isFinite(n)) return;
        range.value = n; set(p.key, n);
      });
      break;
    }
    case 'segment': {
      box.className = 'p-seg';
      box.style.gridTemplateColumns = `repeat(${Math.min(p.options.length, 4)}, 1fr)`;
      for (const o of p.options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = o.label;
        b.classList.toggle('on', o.value === v);
        b.addEventListener('click', () => {
          box.querySelectorAll('button').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
          set(p.key, o.value);
        });
        box.appendChild(b);
      }
      break;
    }
    case 'select': {
      const s = document.createElement('select');
      s.className = 'p-input';
      // Opciones agrupadas (optgroup) si traen "group"; selectedIndex cuenta solo las <option>, así que el orden se mantiene
      let html = '', grp = null;
      for (const o of p.options) {
        if ((o.group || null) !== grp) { if (grp) html += '</optgroup>'; grp = o.group || null; if (grp) html += `<optgroup label="${esc(grp)}">`; }
        html += `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`;
      }
      s.innerHTML = html + (grp ? '</optgroup>' : '');
      s.addEventListener('change', () => set(p.key, p.options[s.selectedIndex].value));
      box.appendChild(s);
      break;
    }
    case 'toggle': {
      box.className = 'p-toggle';
      box.innerHTML = `<input type="checkbox" ${v ? 'checked' : ''}><span></span>`;
      box.querySelector('input').addEventListener('change', e => set(p.key, e.target.checked));
      // El label del campo también activa el interruptor
      box.addEventListener('click', e => { if (e.target === box || e.target.tagName === 'SPAN') { const c = box.querySelector('input'); c.checked = !c.checked; set(p.key, c.checked); } });
      break;
    }
    case 'color': {
      box.className = 'p-colors';
      const paint = val => box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.c === val));
      for (const [name, hex] of PALETTE) {
        const b = document.createElement('button');
        b.type = 'button'; b.title = name; b.dataset.c = hex; b.style.background = hex;
        b.addEventListener('click', () => { custom.value = hex; paint(hex); set(p.key, hex); });
        box.appendChild(b);
      }
      const custom = document.createElement('input');
      custom.type = 'color'; custom.value = v; custom.title = 'Otro color';
      custom.addEventListener('input', () => { const c = custom.value.toUpperCase(); paint(c); set(p.key, c); });
      box.appendChild(custom);
      paint(v);
      break;
    }
    case 'font': {
      // Selector con categorías, búsqueda y vista previa con tu texto. Cada letra se carga cuando se ve.
      box.className = 'p-fontpick';
      const cur = FONTS.find(f => f.id === v) || FONTS[0];
      box.innerHTML = `<div class="p-fontbar"><input type="search" class="p-input" placeholder="Buscar tipografía…"><span class="p-fontcur">Elegida: <b>${esc(cur.name)}</b></span></div>
        <div class="p-kinds"><button type="button" data-kind="" class="on">Todas</button>${FONT_KINDS.map(k => `<button type="button" data-kind="${esc(k)}">${esc(k)}</button>`).join('')}</div>
        <div class="p-fonts"></div>`;
      const grid = box.querySelector('.p-fonts'), search = box.querySelector('input'), curEl = box.querySelector('.p-fontcur b');
      let kind = '';
      const io = typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { registerCssFont(e.target.dataset.font); io.unobserve(e.target); } }), { root: grid, rootMargin: '80px' })
        : null;
      for (const f of FONTS) {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.font = f.id; b.dataset.kind = f.kind; b.dataset.q = `${f.name} ${f.kind}`.toLowerCase();
        b.innerHTML = `<span class="p-font-sample" data-name="${esc(f.name)}" style="font-family:'g3d-${f.id}',sans-serif">${esc(sample.get() || f.name)}</span><small>${esc(f.name)} · ${esc(f.kind)}</small>`;
        b.classList.toggle('on', f.id === v);
        b.addEventListener('click', () => {
          grid.querySelectorAll('button').forEach(x => x.classList.remove('on'));
          b.classList.add('on'); curEl.textContent = f.name;
          set(p.key, f.id);
        });
        grid.appendChild(b);
        if (io) io.observe(b); else registerCssFont(f.id);
      }
      registerCssFont(cur.id);
      const filter = () => {
        const q = search.value.trim().toLowerCase();
        grid.querySelectorAll('button').forEach(b => { b.hidden = (kind && b.dataset.kind !== kind) || (q && !b.dataset.q.includes(q)); });
      };
      search.addEventListener('input', filter);
      box.querySelector('.p-kinds').addEventListener('click', e => {
        const k = e.target.closest('[data-kind]'); if (!k) return;
        kind = k.dataset.kind; box.querySelectorAll('.p-kinds button').forEach(x => x.classList.toggle('on', x === k)); filter();
      });
      // La elegida queda a la vista
      requestAnimationFrame(() => { const on = grid.querySelector('button.on'); if (on) grid.scrollTop = Math.max(0, on.offsetTop - grid.offsetTop - 40); });
      break;
    }
    case 'nudge': {
      // Mover el texto con flechas (Mayús = de a 5) y centrarlo en la forma con un toque
      box.className = 'p-nudge';
      const step = p.step || 0.5;
      const show = () => {
        const x = +values[p.key] || 0, y = +values[p.keyY] || 0;
        box.querySelector('.n-pos').textContent = `${values[p.keyC] ? 'Centrado' : 'Lugar del diseño'} ${x || y ? `· corrido X ${x.toLocaleString('es-AR')} · Y ${y.toLocaleString('es-AR')} mm` : ''}`;
      };
      box.innerHTML = `<div class="n-pad">
          <span></span><button type="button" data-d="0,1" title="Subir">▲</button><span></span>
          <button type="button" data-d="-1,0" title="A la izquierda">◀</button><button type="button" data-d="c" class="n-c" title="Centrar en la forma">Centrar</button><button type="button" data-d="1,0" title="A la derecha">▶</button>
          <span></span><button type="button" data-d="0,-1" title="Bajar">▼</button><span></span>
        </div><div class="n-side"><span class="n-pos"></span><button type="button" class="link" data-d="r">Volver al lugar original</button><small>Mayús + flecha: de a 5 mm</small></div>`;
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-d]'); if (!b) return;
        const d = b.dataset.d;
        if (d === 'c') { values[p.keyC] = true; values[p.keyY] = 0; set(p.key, 0); }
        else if (d === 'r') { values[p.keyC] = false; values[p.keyY] = 0; set(p.key, 0); }
        else {
          const [dx, dy] = d.split(',').map(Number), k = step * (e.shiftKey ? 10 : 1);
          const r = v => Math.round(v * 100) / 100;
          values[p.keyY] = r((+values[p.keyY] || 0) + dy * k);
          set(p.key, r((+values[p.key] || 0) + dx * k));
        }
        show();
      });
      show();
      break;
    }
    case 'image': {
      box.className = 'p-image';
      const draw = () => {
        const url = values[p.key];
        box.innerHTML = `<label class="p-drop">${url ? `<img src="${url}" alt="">` : '<span class="p-drop-empty">Tocá o arrastrá una imagen<br><small>PNG con fondo transparente o dibujo oscuro sobre fondo claro</small></span>'}<input type="file" accept="image/*" hidden></label>${url ? '<button type="button" class="link p-clear">Quitar imagen</button>' : ''}`;
        const input = box.querySelector('input');
        const take = async file => {
          if (!file) return;
          try { set(p.key, await fileToDataURL(file)); draw(); } catch (err) { alert(err.message); }
        };
        input.addEventListener('change', () => take(input.files[0]));
        const drop = box.querySelector('.p-drop');
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('over'));
        drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files[0]); });
        box.querySelector('.p-clear')?.addEventListener('click', () => { set(p.key, ''); draw(); });
      };
      draw();
      break;
    }
    default:
      box.textContent = `Tipo de campo desconocido: ${p.type}`;
  }
  return box;
}
