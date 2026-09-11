/* Gemelos 3D — workspace responsive: dashboard desktop + categorías/accordion mobile. */
(function(){
  const STYLE_ID='gemelos-responsive-workspace';
  const inject=()=>{
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=`
/* ===== DESKTOP: dashboard real sobre el visor ===== */
@media(min-width:801px){
  .layout{grid-template-columns:300px minmax(0,1fr)!important}
  #viewer{position:relative!important;min-height:calc(100vh - 68px)!important;overflow:hidden!important}
  #viewer canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:0!important}
  #gDesktopDashboard{position:absolute!important;left:16px!important;right:16px!important;top:16px!important;display:grid!important;grid-template-columns:minmax(230px,1.5fr) repeat(4,minmax(105px,1fr))!important;gap:8px!important;padding:0!important;margin:0!important;z-index:100!important;pointer-events:none!important}
  .gDashCard{min-width:0!important;padding:10px 12px!important;border:1px solid #303947!important;border-radius:10px!important;background:rgba(10,14,20,.90)!important;backdrop-filter:blur(10px)!important;box-shadow:0 8px 24px rgba(0,0,0,.28)!important}
  .gDashCard small{display:block!important;font-size:8px!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#687382!important;margin-bottom:4px!important}
  .gDashCard strong{display:block!important;font-size:13px!important;color:#e6eaf0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .gDashCard span{font-size:9px!important;color:#7d8795!important}
  #viewer .viewTools{z-index:110!important}
  #viewer .badge{z-index:110!important}
  #viewer .fabricationPanel{z-index:120!important}
}
/* ===== MOBILE: categorías arriba + acordeón ===== */
@media(max-width:800px){
  .layout{display:flex!important;flex-direction:column!important}
  aside{order:1!important;display:flex!important;flex-direction:column!important;padding:8px!important;border-right:0!important;border-bottom:0!important;max-height:none!important;overflow:visible!important}
  #viewer{order:2!important;min-height:58vh!important;height:58vh!important;flex:0 0 auto!important}
  #mobileCategories{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;position:sticky;top:68px;z-index:20;padding:6px 0 8px;background:#0b0e13}
  #mobileCategories button{margin:0!important;min-height:38px!important;padding:5px 3px!important;font-size:9px!important;line-height:1.1!important;background:#11161d!important;border:1px solid #252d38!important;color:#8993a1!important}
  #mobileCategories button.active{background:#edf0f4!important;color:#090c11!important;border-color:#edf0f4!important}
  aside.g-mobileFiltered>section{display:none!important}
  aside.g-mobileFiltered>section.g-mobileVisible{display:block!important}
  aside.g-mobileFiltered>section{margin-bottom:7px!important}
  aside.g-mobileFiltered>section.g-mobileVisible .sectionTitle{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0!important;padding:2px 0}
  aside.g-mobileFiltered>section.g-mobileVisible .sectionTitle:after{content:'＋';font-size:15px;color:#778292;line-height:1}
  aside.g-mobileFiltered>section.g-mobileVisible.g-open .sectionTitle:after{content:'−';color:#e2e7ee}
  aside.g-mobileFiltered>section.g-mobileVisible:not(.g-open)>:not(.sectionTitle){display:none!important}
  aside.g-mobileFiltered>section.g-mobileVisible.g-open{padding-bottom:12px!important}
  #mobileCategoryHint{margin:0 0 6px;padding:7px 9px;color:#697484;font-size:9px;line-height:1.35}
  #workspaceNav{display:none!important}
  #viewer .fabricationPanel{left:8px!important;bottom:8px!important;width:calc(100% - 16px)!important;max-height:42%!important}
}
@media(min-width:801px){#mobileCategories,#mobileCategoryHint{display:none!important}}
`;
    document.head.appendChild(s);
  };

  function addDesktopDashboard(viewer){
    if(document.getElementById('gDesktopDashboard')) return;
    const d=document.createElement('div'); d.id='gDesktopDashboard';
    d.innerHTML=`
      <div class="gDashCard"><small>Espacio de trabajo</small><strong>Gemelos 3D · Taller</strong><span>Diseño y fabricación en tiempo real</span></div>
      <div class="gDashCard"><small>Tamaño</small><strong id="gDashSize">— × — × —</strong><span>mm</span></div>
      <div class="gDashCard"><small>Piezas</small><strong id="gDashPieces">0</strong><span>para fabricar</span></div>
      <div class="gDashCard"><small>Cama</small><strong id="gDashBed">—</strong><span>área útil</span></div>
      <div class="gDashCard"><small>Estado</small><strong id="gDashStatus">Listo</strong><span>flujo actual</span></div>`;
    viewer.appendChild(d);
    const sync=()=>{
      const q=id=>document.getElementById(id)?.textContent?.trim()||'—';
      const size=document.getElementById('gDashSize');
      const pieces=document.getElementById('gDashPieces');
      const bed=document.getElementById('gDashBed');
      const status=document.getElementById('gDashStatus');
      if(size)size.textContent=`${q('sx')} × ${q('sy')} × ${q('sz')}`;
      if(pieces)pieces.textContent=q('pieces');
      if(status)status.textContent=(q('status')||'Listo').slice(0,28);
      const info=q('bedInfo'); if(bed)bed.textContent=info==='—'?'—':info.split('\n')[0].slice(0,22);
    };
    ['sx','sy','sz','pieces','status','bedInfo'].forEach(id=>{const e=document.getElementById(id);if(e)new MutationObserver(sync).observe(e,{childList:true,subtree:true,characterData:true});});
    setInterval(sync,1000); sync();
  }

  function setupMobile(aside){
    if(document.getElementById('mobileCategories')) return;
    const sections=[...aside.querySelectorAll(':scope > section')];
    if(!sections.length) return;
    const groups=[
      {name:'Diseño',icon:'✏️',idx:[0,3,4],hint:'Texto, medidas visuales del diseño y creación del modelo.'},
      {name:'Medidas',icon:'📐',idx:[1],hint:'Tamaño físico, ancho total, alto, grosor y separación.'},
      {name:'Máquina',icon:'🛏️',idx:[2],hint:'Impresora, cama útil, margen y torre de purga.'},
      {name:'Fabricar',icon:'🧩',idx:[5],hint:'Acomodado, optimización, camas y piezas.'},
      {name:'Entrega',icon:'📦',idx:[6,7,8,9,10],hint:'Exportación, proyecto, costos y documentación técnica.'}
    ];
    const nav=document.createElement('nav'); nav.id='mobileCategories'; nav.setAttribute('aria-label','Categorías del taller');
    groups.forEach((g,i)=>{const b=document.createElement('button');b.type='button';b.dataset.group=i;b.textContent=`${g.icon} ${g.name}`;nav.appendChild(b);});
    const hint=document.createElement('div');hint.id='mobileCategoryHint';
    aside.insertBefore(nav,sections[0]); aside.insertBefore(hint,sections[0]); aside.classList.add('g-mobileFiltered');
    const activate=(i,openFirst=true)=>{
      groups.forEach((g,n)=>nav.children[n].classList.toggle('active',n===i));
      hint.textContent=groups[i].hint;
      sections.forEach((s,n)=>{s.classList.toggle('g-mobileVisible',groups[i].idx.includes(n));s.classList.remove('g-open');});
      const first=sections[groups[i].idx[0]]; if(first){first.classList.add('g-open'); if(openFirst) first.scrollIntoView({behavior:'smooth',block:'nearest'});}
    };
    nav.querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>activate(i,true)));
    sections.forEach(s=>{
      const title=s.querySelector('.sectionTitle'); if(!title)return;
      title.addEventListener('click',()=>{if(!s.classList.contains('g-mobileVisible'))return;s.classList.toggle('g-open');});
    });
    activate(0,false);
  }

  function run(){
    inject();
    const aside=document.querySelector('aside'),viewer=document.getElementById('viewer');
    if(!aside||!viewer)return;
    addDesktopDashboard(viewer);
    setupMobile(aside);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
