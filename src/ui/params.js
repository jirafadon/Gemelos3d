/**
 * Panel de parámetros generado a partir del esquema de cada generador.
 * Tipos: group, text, number, segment, select, toggle, color, font.
 */
import { FONTS, registerCssFonts } from '../engine/fonts.js';

export const PALETTE = [
  ['Blanco', '#F5F5F5'], ['Negro', '#1E1E1E'], ['Gris', '#8D99AE'], ['Plateado', '#C0C0C0'],
  ['Rojo', '#D62828'], ['Naranja', '#F77F00'], ['Amarillo', '#FCBF49'], ['Dorado', '#C9A227'],
  ['Verde', '#2A9D8F'], ['Lima', '#8AC926'], ['Celeste', '#4CC9F0'], ['Azul', '#1D4ED8'],
  ['Violeta', '#7B2CBF'], ['Lila', '#C8B6FF'], ['Rosa', '#F72585'], ['Madera', '#B08968'],
];

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function defaultValues(schema) {
  return Object.fromEntries(schema.filter(p => p.key).map(p => [p.key, p.default]));
}

export function renderParams(root, schema, values, onChange) {
  registerCssFonts();
  root.innerHTML = '';
  const wrappers = [];

  const updateVisibility = () => {
    for (const { el, p } of wrappers) el.hidden = p.show ? !p.show(values) : false;
    // Oculta los títulos de grupo que quedaron sin campos visibles
    root.querySelectorAll('.p-group').forEach(gr => {
      gr.hidden = ![...gr.querySelectorAll('.p-field')].some(f => !f.hidden);
    });
  };
  const set = (key, val) => { values[key] = val; updateVisibility(); onChange(values, key); };

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
    if (p.hint) el.insertAdjacentHTML('beforeend', `<div class="p-hint">${esc(p.hint)}</div>`);
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
      s.innerHTML = p.options.map(o => `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
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
      box.className = 'p-fonts';
      for (const f of FONTS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<span style="font-family:'g3d-${f.id}',sans-serif">${esc(f.name)}</span><small>${esc(f.kind)}</small>`;
        b.classList.toggle('on', f.id === v);
        b.addEventListener('click', () => {
          box.querySelectorAll('button').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
          set(p.key, f.id);
        });
        box.appendChild(b);
      }
      break;
    }
    default:
      box.textContent = `Tipo de campo desconocido: ${p.type}`;
  }
  return box;
}
