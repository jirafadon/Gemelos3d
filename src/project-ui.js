const aside = document.querySelector('aside');

function field(id, fallback=''){
  const el=document.getElementById(id);
  return el ? (el.value ?? fallback) : fallback;
}
function setField(id, value){
  const el=document.getElementById(id);
  if(!el || value===undefined || value===null)return;
  el.value=String(value);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function setCheck(id, value){
  const el=document.getElementById(id);
  if(!el || value===undefined)return;
  el.checked=Boolean(value);
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function downloadProject(){
  const data={
    app:'Gemelos 3D',formatVersion:2,createdAt:new Date().toISOString(),
    design:{
      text:field('text'),heightMm:Number(field('height',60)),widthTotalMm:Number(field('widthScale',0)),
      depthMm:Number(field('depth',12)),spacingMm:Number(field('spacing',4)),font:field('fontStyle'),
      curveSegments:Number(field('curveSegments',6)),bevel:document.getElementById('bevel')?.checked===true,
      bevelSizeMm:Number(field('bevelSize',1.2)),bevelSegments:Number(field('bevelSegments',2))
    },
    printer:{preset:field('printer'),marginMm:Number(field('margin',5)),purgeMode:field('purgeMode'),purgeXmm:Number(field('purgeX',40)),purgeYmm:Number(field('purgeY',40))},
    note:'El proyecto conserva la configuración necesaria para regenerar el modelo. La geometría se vuelve a crear con el motor de Gemelos 3D al abrirlo.'
  };
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='gemelos3d-proyecto.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function validProject(p){
  return p && p.app==='Gemelos 3D' && p.design && typeof p.design.text==='string' && p.printer;
}
function applyProject(p){
  setField('text',p.design.text);
  setField('height',p.design.heightMm);
  setField('widthScale',p.design.widthTotalMm);
  setField('depth',p.design.depthMm);
  setField('spacing',p.design.spacingMm);
  setField('fontStyle',p.design.font);
  setField('curveSegments',p.design.curveSegments);
  setCheck('bevel',p.design.bevel);
  setField('bevelSize',p.design.bevelSizeMm);
  setField('bevelSegments',p.design.bevelSegments);
  setField('printer',p.printer.preset);
  setField('margin',p.printer.marginMm);
  setField('purgeMode',p.printer.purgeMode);
  setField('purgeX',p.printer.purgeXmm);
  setField('purgeY',p.printer.purgeYmm);
  const build=document.getElementById('buildTop');
  if(build && p.design.text.trim())setTimeout(()=>build.click(),120);
}
function install(){
  if(!aside || document.getElementById('projectSection'))return;
  const section=document.createElement('section');section.id='projectSection';
  section.innerHTML=`
    <h2 class="sectionTitle"><span class="sectionNumber">10</span>📁 Proyecto</h2>
    <p class="sectionHint">Guardá tu trabajo y recuperalo más adelante sin rehacer la configuración.</p>
    <button id="saveProjectLocal" class="primary">Guardar proyecto</button>
    <label class="fileButton" for="openProjectFile">Abrir proyecto</label>
    <input id="openProjectFile" type="file" accept=".json,application/json" hidden>
    <div id="projectStatus" class="hint">El archivo guarda la configuración; al abrirlo, Gemelos 3D regenera el modelo.</div>`;
  const anchor=document.getElementById('exportPlusSection');
  anchor ? anchor.after(section) : aside.appendChild(section);
  section.querySelector('#saveProjectLocal').onclick=downloadProject;
  section.querySelector('#openProjectFile').onchange=async ev=>{
    const file=ev.target.files?.[0];if(!file)return;
    const status=section.querySelector('#projectStatus');
    try{
      const p=JSON.parse(await file.text());
      if(!validProject(p))throw new Error('Formato no reconocido');
      applyProject(p);
      status.textContent='Proyecto recuperado. El modelo se está regenerando con la configuración guardada.';
      status.classList.remove('warn');
    }catch(err){
      status.textContent='No se pudo abrir el proyecto: '+err.message;
      status.classList.add('warn');
    }finally{ev.target.value='';}
  };
}
install();
