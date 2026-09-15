import {createProject,hydrateProject,updateProject} from './project-state.js';

const KEY='gemelos3dProject';
const COLLECTION_KEY='gemelos3dProjects';
const LEGACY_KEY='gemelos3dAiModel';

function read(){
  try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
}

function readCollection(){
  try{
    const value=JSON.parse(localStorage.getItem(COLLECTION_KEY)||'[]');
    return Array.isArray(value)?value:[];
  }catch{return []}
}

function writeCollection(projects){
  localStorage.setItem(COLLECTION_KEY,JSON.stringify(projects));
}

function ensureCollection(){
  const projects=readCollection();
  if(projects.length)return projects;
  const active=read();
  if(active){
    const hydrated=hydrateProject(active);
    writeCollection([hydrated]);
    return [hydrated];
  }
  return [];
}

export function saveProject(project){
  const next=updateProject(project);
  const projects=ensureCollection();
  const index=projects.findIndex(item=>item.id===next.id);
  if(index>=0)projects[index]=next;
  else projects.unshift(next);
  writeCollection(projects);
  localStorage.setItem(KEY,JSON.stringify(next));
  return next;
}

export function updateStoredProject(id,patch={}){
  const current=getProject(id);
  if(!current)return null;
  const next=saveProject(updateProject(current,patch));
  return next;
}

export function loadProject(){
  const saved=read();
  return saved?hydrateProject(saved):null;
}

export function loadProjects(){
  return ensureCollection().map(hydrateProject);
}

export function getProject(id){
  return loadProjects().find(project=>project.id===id)||null;
}

export function setActiveProject(id){
  const project=getProject(id);
  if(!project)return null;
  localStorage.setItem(KEY,JSON.stringify(project));
  return project;
}

export function getOrCreateProject(overrides={}){
  return loadProject()||createProject(overrides);
}

export function clearProject(){
  localStorage.removeItem(KEY);
}

export function deleteProject(id){
  const active=read();
  const projects=loadProjects().filter(project=>project.id!==id);
  writeCollection(projects);
  if(active?.id===id){
    if(projects[0])localStorage.setItem(KEY,JSON.stringify(projects[0]));
    else localStorage.removeItem(KEY);
  }
  return projects;
}

export function clearProjects(){
  localStorage.removeItem(KEY);
  localStorage.removeItem(COLLECTION_KEY);
}

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
    const saved=saveProject(project);
    sessionStorage.removeItem(LEGACY_KEY);
    return saved;
  }catch{return null}
}
