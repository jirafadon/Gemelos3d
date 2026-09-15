const DEFAULT_PROJECT={
  schemaVersion:2,
  id:null,
  name:'Proyecto sin nombre',
  source:null,
  model:{url:null,name:null,format:null,dimensions:{width:null,height:null,depth:null}},
  configuration:{
    printer:null,
    margin:0,
    spacing:4,
    text:'',
    height:60,
    width:0,
    depth:12,
    bed:{width:null,depth:null,height:null},
    purge:{mode:'none',width:0,depth:0},
    font:'helvetiker_regular',
    curveSegments:6,
    bevel:false,
    bevelSize:1.2,
    bevelSegments:2
  },
  fabrication:{pieces:[],beds:[],selectedPiece:null,selectedBed:0},
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
  normalize(p);
  return p;
}

function merge(target,source){
  Object.keys(source||{}).forEach(key=>{
    if(source[key]&&typeof source[key]==='object'&&!Array.isArray(source[key])&&target[key]&&typeof target[key]==='object') merge(target[key],source[key]);
    else if(source[key]!==undefined) target[key]=source[key];
  });
}

function normalize(project){
  project.schemaVersion=2;
  if(!Array.isArray(project.fabrication.pieces))project.fabrication.pieces=[];
  if(!Array.isArray(project.fabrication.beds))project.fabrication.beds=[];
  if(!Number.isInteger(project.fabrication.selectedBed)||project.fabrication.selectedBed<0)project.fabrication.selectedBed=0;
  if(!['crear','configurar','revisar','taller'].includes(project.workflow.current))project.workflow.current='crear';
  const order=['crear','configurar','revisar','taller'];
  const index=order.indexOf(project.workflow.current);
  order.forEach((name,i)=>{project.workflow.steps[name]=i<index?'complete':i===index?'active':'pending'});
}

export function updateProject(project,patch={}){
  const next=hydrateProject(project);
  merge(next,patch);
  normalize(next);
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
