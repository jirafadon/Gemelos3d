const main = document.querySelector('main.page');
const flow = main?.querySelector('.flow');
if (!main || !flow) return;

const section = document.createElement('section');
section.className = 'home-tips';
section.innerHTML = `<div class="section-title"><h3>Antes de empezar</h3><span>Consejos rápidos</span></div><div class="home-tips-grid"><article><b>01</b><strong>Empezá simple</strong><p>Probá con una forma básica antes de crear una pieza compleja.</p></article><article><b>02</b><strong>Guardá tu proyecto</strong><p>Podés volver a tus diseños desde Mis proyectos en cualquier momento.</p></article><article><b>03</b><strong>Prepará para fabricar</strong><p>Revisá medidas, piezas y exportación antes de pasar al taller.</p></article></div>`;
flow.before(section);

const style = document.createElement('style');
style.textContent = `.home-tips{margin-top:18px}.home-tips-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.home-tips-grid article{padding:16px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#10161f,#0c1016)}.home-tips-grid b{display:block;color:var(--accent);font-size:10px;letter-spacing:.08em}.home-tips-grid strong{display:block;margin-top:10px;font-size:12px}.home-tips-grid p{margin:7px 0 0;color:#7d899a;font-size:10px;line-height:1.55}@media(max-width:560px){.home-tips-grid{grid-template-columns:1fr}}`;
document.head.appendChild(style);
