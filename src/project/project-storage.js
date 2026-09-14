import {createProject,hydrateProject,updateProject} from './project-state.js';

const KEY='gemelos3dProject';
const LEGACY_KEY='gemelos3dAiModel';

function read(){
  try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
}

export function saveProject(project){
  const next=updateProject(project);
  localStorage.setItem(KEY,JSON.stringify(next));
  return next;
}

export function loadProject(){
  const saved=read();
  if(saved)return hydrateProject(saved);
  return null;
}

export function getOrCreateProject(overrides={}){
  return loadProject()||createProject(overrides);
}

export function clearProject(){localStorage.removeItem(KEY)}

export function importLegacyAiHandoff(){
  try{
    const raw=sessionStorage.getItem(LEGACY_KEY);
    if(!raw)return null;
    const data=JSON.parse(raw);
    if(!data?.modelUrl)return null;
    const project=createProject({
      name:data.prompt||'Modelo generado',
      source:data.source||'ai',
      model:{url:data.modelUrl,name:data.prompt||'Modelo generado',format:'glb'}
    });
    saveProject(project);
    return project;
  }catch{return null}
}
