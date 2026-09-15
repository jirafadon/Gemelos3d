const main = document.querySelector('main.page');
const flow = main?.querySelector('.flow');
if (!main || !flow) return;

const section = document.createElement('section');
section.className = 'home-guidance';
section.innerHTML = `<div class="section-title"><h3>Elegí tu objetivo</h3><span>Un camino recomendado para empezar</span></div><div class="home-guidance-grid"><a href="./crear-ia.html"><span>01</span><div><strong>Tengo una idea</strong><small>Describila y generá una primera pieza 3D.</small></div><b>→</b></a><a href="./importar-modelo.html"><span>02</span><div><strong>Ya tengo un archivo</strong><small>Importá tu modelo y lleválo al taller.</small></div><b>→</b></a><a href="./buscar-modelos.html"><span>03</span><div><strong>Necesito encontrar un modelo</strong><small>Explorá bases gratuitas para inspirarte o fabricar.</small></div><b>→</b></a><a href="./svg-3d.html"><span>04</span><div><strong>Tengo un logo o dibujo</strong><small>Convertí un SVG en una pieza con volumen.</small></div><b>→</b></a></div>`;
flow.before(section);

const style = document.createElement('style');
style.textContent = `.home-guidance{margin-top:18px}.home-guidance-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.home-guidance-grid a{display:flex;align-items:center;gap:13px;min-width:0;padding:15px 16px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#10161f,#0c1016);color:#fff;text-decoration:none;transition:transform .18s,border-color .18s,background .18s}.home-guidance-grid a:hover{transform:translateY(-2px);border-color:#8bf0c544;background:#151d26}.home-guidance-grid>a>span{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border:1px solid #8bf0c522;border-radius:10px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.06em}.home-guidance-grid a div{min-width:0;flex:1}.home-guidance-grid strong{display:block;font-size:12px}.home-guidance-grid small{display:block;margin-top:5px;color:#7d899a;font-size:9px;line-height:1.5}.home-guidance-grid b{color:var(--accent);font-size:14px}@media(max-width:560px){.home-guidance-grid{grid-template-columns:1fr}}`;
document.head.appendChild(style);
