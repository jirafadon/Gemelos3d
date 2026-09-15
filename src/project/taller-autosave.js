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

export function installTallerAutosave({delay=450}={}){
  let timer;
  const save=()=>{
    const project=loadProject();
    if(!project?.id)return;
    updateStoredProject(project.id,{configuration:captureTallerConfiguration()});
  };
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(save,delay)};
  FIELD_IDS.forEach(id=>read(id)?.addEventListener('input',schedule));
  FIELD_IDS.forEach(id=>read(id)?.addEventListener('change',schedule));
  return ()=>{clearTimeout(timer);FIELD_IDS.forEach(id=>read(id)?.removeEventListener('input',schedule));FIELD_IDS.forEach(id=>read(id)?.removeEventListener('change',schedule));};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installTallerAutosave());
else installTallerAutosave();
