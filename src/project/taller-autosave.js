import {loadProject,updateStoredProject} from './project-storage.js';

const FIELD_IDS=['text','printer','margin','cx','cy','cz','purgeMode','purgeX','purgeY','height','widthScale','depth','spacing','fontStyle','curveSegments','bevel','bevelSize','bevelSegments'];
const read=(id)=>document.getElementById(id);
const value=(id)=>{const el=read(id);if(!el)return null;return el.type==='checkbox'?el.checked:el.value};
const number=(id)=>{const v=Number(value(id));return Number.isFinite(v)?v:null};

export function captureTallerConfiguration(){
  const printer=value('printer');
  const bed=printer==='custom'
    ?{width:number('cx'),depth:number('cy'),height:number('cz')}
    :(()=>{const [width,depth,height]=(printer||'').split(',').map(Number);return{width,depth,height}})();
  return {
    printer,
    margin:number('margin'),
    spacing:number('spacing'),
    text:value('text'),
    height:number('height'),
    width:number('widthScale'),
    depth:number('depth'),
    bed,
    purge:{mode:value('purgeMode'),width:number('purgeX'),depth:number('purgeY')},
    font:value('fontStyle'),
    curveSegments:number('curveSegments'),
    bevel:value('bevel'),
    bevelSize:number('bevelSize'),
    bevelSegments:number('bevelSegments')
  };
}

function persistConfiguration(){
  const project=loadProject();
  if(!project?.id)return null;
  return updateStoredProject(project.id,{configuration:captureTallerConfiguration(),workflow:{current:'taller'}});
}

export function installTallerAutosave({delay=450}={}){
  let timer;
  let disposed=false;
  const initialConfiguration=captureTallerConfiguration();
  let lastSnapshot=JSON.stringify(initialConfiguration);
  const save=()=>{
    if(disposed)return;
    const configuration=captureTallerConfiguration();
    const snapshot=JSON.stringify(configuration);
    if(snapshot===lastSnapshot)return;
    try{
      if(persistConfiguration())lastSnapshot=snapshot;
    }catch{
      // El autosave nunca debe bloquear el Taller si el almacenamiento no está disponible.
    }
  };
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(save,delay)};
  const flush=()=>{clearTimeout(timer);save()};
  const onVisibilityChange=()=>{if(document.visibilityState==='hidden')flush()};
  FIELD_IDS.forEach(id=>read(id)?.addEventListener('input',schedule));
  FIELD_IDS.forEach(id=>read(id)?.addEventListener('change',schedule));
  window.addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',onVisibilityChange);

  const saveButton=read('project');
  const onSaveClick=(event)=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    try{
      const saved=persistConfiguration();
      const status=read('status');
      if(status)status.innerHTML='<span class="ok">✓ Proyecto guardado en Mis proyectos.</span>';
      if(saved)lastSnapshot=JSON.stringify(captureTallerConfiguration());
    }catch{
      const status=read('status');
      if(status)status.innerHTML='<span class="bad">✕ No se pudo guardar el proyecto local.</span>';
    }
  };
  saveButton?.addEventListener('click',onSaveClick,{capture:true});

  return ()=>{
    disposed=true;
    clearTimeout(timer);
    FIELD_IDS.forEach(id=>read(id)?.removeEventListener('input',schedule));
    FIELD_IDS.forEach(id=>read(id)?.removeEventListener('change',schedule));
    window.removeEventListener('pagehide',flush);
    document.removeEventListener('visibilitychange',onVisibilityChange);
    saveButton?.removeEventListener('click',onSaveClick,{capture:true});
  };
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installTallerAutosave());
else installTallerAutosave();
