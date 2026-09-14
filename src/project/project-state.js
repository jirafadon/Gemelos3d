const DEFAULT_PROJECT={
  id:null,
  name:'Proyecto sin nombre',
  source:null,
  model:{url:null,name:null,format:null,dimensions:{width:null,height:null,depth:null}},
  configuration:{printer:null,margin:0,spacing:4},
  fabrication:{pieces:[],beds:[]},
  workflow:{current:'crear',steps:{crear:'active',configurar:'pending',revisar:'pending',taller:'pending'}},
  meta:{createdAt:null,updatedAt:null}
};

export function createProject(overrides={}){
  const now=new Date().toISOString();
  const id=overrides.id||crypto.randomUUID();
  return hydrateProject({...overrides,id,meta:{createdAt:now,updatedAt:now,...(overrides.meta||{})}});
}

export function hydrateProject(value={}){
  const p=typeof structuredClone==='function'?structuredClone(DEFAULT_PROJECT):JSON.parse(JSON.stringify(DEFAULT_PROJECT));
  merge(p,value);
  return p;
}

function merge(target,source){
  Object.keys(source||{}).forEach(key=>{
    if(source[key]&&typeof source[key]==='object'&&!Array.isArray(source[key])&&target[key]&&typeof target[key]==='object') merge(target[key],source[key]);
    else if(source[key]!==undefined) target[key]=source[key];
  });
}

export function updateProject(project,patch={}){
  const next=hydrateProject(project);
  merge(next,patch);
  next.meta.updatedAt=new Date().toISOString();
  return next;
}

export function setWorkflowStep(project,step){
  const next=updateProject(project,{workflow:{current:step}});
  const order=['crear','configurar','revisar','taller'];
  const index=order.indexOf(step);
  order.forEach((name,i)=>{next.workflow.steps[name]=i<index?'complete':i===index?'active':'pending'});
  return next;
}
