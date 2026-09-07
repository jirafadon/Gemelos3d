import * as THREE from 'https://esm.sh/three@0.161.0';
import { FontLoader } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://esm.sh/three@0.161.0/examples/jsm/geometries/TextGeometry.js';
import { STLExporter } from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';
import { OrbitControls } from 'https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const viewer = $('viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101216);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
viewer.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.screenSpacePanning = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x30343d, 2));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(100, 180, 120);
scene.add(light);

const modelGroup = new THREE.Group();
const bedGroup = new THREE.Group();
scene.add(modelGroup, bedGroup);

const fontBase = 'https://threejs.org/examples/fonts/';
const fontFiles = {
  helvetiker_regular: 'helvetiker_regular.typeface.json',
  helvetiker_bold: 'helvetiker_bold.typeface.json',
  optimer_regular: 'optimer_regular.typeface.json',
  gentilis_regular: 'gentilis_regular.typeface.json'
};
const fontCache = new Map();
let currentFont = null;
let currentObjects = [];
let beds = [];
let buildTimer = null;

function status(message, cls = '') {
  const el = $('status');
  if (el) el.innerHTML = `<span class="${cls}">${message}</span>`;
}
function printerDims() {
  if ($('printer').value === 'custom') return { x: Math.max(1, +$('cx').value || 1), y: Math.max(1, +$('cy').value || 1), z: Math.max(1, +$('cz').value || 1) };
  const [x, y, z] = $('printer').value.split(',').map(Number);
  return { x, y, z };
}
function purgeSize() {
  return $('purgeMode').value === 'none' ? { x: 0, y: 0 } : { x: Math.max(5, +$('purgeX').value || 40), y: Math.max(5, +$('purgeY').value || 40) };
}
function usableBed() {
  const b = printerDims(), margin = Math.max(0, +$('margin').value || 0), purge = purgeSize();
  return { ...b, margin, purge, x: Math.max(1, b.x - 2 * margin - purge.x), y: Math.max(1, b.y - 2 * margin), z: Math.max(1, b.z - 2 * margin) };
}
function updateBedInfo() {
  const b = printerDims(), u = usableBed(), p = purgeSize();
  $('bedInfo').textContent = `Cama total: ${b.x} × ${b.y} × ${b.z} mm · Área para piezas: ${u.x} × ${u.y} mm · Z útil: ${u.z} mm`;
  $('purgeInfo').textContent = p.x ? `Reserva lateral para torre de purga: ${p.x} × ${p.y} mm.` : 'Sin reserva de torre de purga.';
}
function material() { return new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 }); }
async function ensureFont() {
  const key = $('fontStyle').value;
  if (fontCache.has(key)) { currentFont = fontCache.get(key); return true; }
  try {
    status('Cargando tipografía…', 'warn');
    currentFont = await new FontLoader().loadAsync(fontBase + (fontFiles[key] || fontFiles.helvetiker_regular));
    fontCache.set(key, currentFont);
    return true;
  } catch (e) { console.error(e); status('✕ No se pudo cargar la tipografía 3D.', 'bad'); return false; }
}
function makeGeometry(char, height, depth) {
  const bevel = $('bevel').checked;
  const requested = Math.max(0.1, +$('bevelSize').value || 1.2);
  const safe = Math.min(requested, depth / 2, height / 8);
  return new TextGeometry(char, { font: currentFont, size: height, height: depth, curveSegments: Math.max(3, +$('curveSegments').value || 6), bevelEnabled: bevel, bevelThickness: bevel ? safe : 0, bevelSize: bevel ? safe : 0, bevelSegments: bevel ? Math.max(1, Math.min(6, +$('bevelSegments').value || 2)) : 0 });
}
function clearModel() {
  modelGroup.clear(); currentObjects = []; beds = [];
  $('pieces').textContent = '0'; $('sx').textContent = '—'; $('sy').textContent = '—'; $('sz').textContent = '—';
  $('pieceList').innerHTML = ''; $('bedList').innerHTML = '';
}
function drawBeds(bed, count) {
  bedGroup.clear();
  const gap = 40, offset = (count - 1) * (bed.x + gap) / 2;
  for (let i = 0; i < count; i++) {
    const ox = i * (bed.x + gap) - offset;
    const points = [[-bed.x/2,-bed.y/2],[bed.x/2,-bed.y/2],[bed.x/2,bed.y/2],[-bed.x/2,bed.y/2],[-bed.x/2,-bed.y/2]].map(([x,y]) => new THREE.Vector3(ox+x,y,0));
    bedGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({color:0x687383})));
    const grid = new THREE.GridHelper(Math.max(bed.x,bed.y), Math.max(10,Math.round(Math.max(bed.x,bed.y)/10)), 0x333740, 0x22262d);
    grid.rotation.x = Math.PI/2; grid.position.set(ox,0,-0.05); bedGroup.add(grid);
    if (bed.purge.x) { const q = new THREE.Mesh(new THREE.BoxGeometry(bed.purge.x,bed.purge.y,.15), new THREE.MeshBasicMaterial({color:0x333740,transparent:true,opacity:.7})); q.position.set(ox+bed.x/2-bed.margin-bed.purge.x/2,-bed.y/2+bed.margin+bed.purge.y/2,.1); bedGroup.add(q); }
  }
}
function packInOrder(objects, bed) {
  const groups=[]; let group={objects:[],rowWidth:0,rowHeight:0}; groups.push(group);
  let x=0,y=0,rowH=0;
  for (const object of objects) {
    object.updateMatrixWorld(true); const box=new THREE.Box3().setFromObject(object); const w=box.max.x-box.min.x, h=box.max.y-box.min.y;
    if (w>bed.x+.01 || h>bed.y+.01) { group.objects.push({object,invalid:true}); continue; }
    if (x>0 && x+w>bed.x) { x=0; y+=rowH+2; rowH=0; }
    if (y+h>bed.y) { group={objects:[],rowWidth:0,rowHeight:0}; groups.push(group); x=0; y=0; rowH=0; }
    group.objects.push({object,invalid:false}); x+=w+2; rowH=Math.max(rowH,h); group.rowWidth=Math.max(group.rowWidth,x); group.rowHeight=Math.max(group.rowHeight,y+h);
  }
  return groups;
}
function centerBeds(groups,bed) {
  const gap=40, offset=(groups.length-1)*(bed.x+gap)/2;
  groups.forEach((group,index)=>{ const ox=index*(bed.x+gap)-offset, valid=group.objects.filter(i=>!i.invalid); if(!valid.length)return; const box=new THREE.Box3(); valid.forEach(i=>box.expandByObject(i.object)); const dx=ox-(box.min.x+box.max.x)/2, dy=-(box.min.y+box.max.y)/2; valid.forEach(i=>{i.object.position.x+=dx;i.object.position.y+=dy;i.object.updateMatrixWorld(true);}); });
}
function fitCamera(bed,count) { const span=Math.max(bed.y,count*bed.x+Math.max(0,count-1)*40); camera.position.set(0,span*.72,span*1.55); controls.target.set(0,0,0); controls.minDistance=Math.max(40,span*.42); controls.maxDistance=Math.max(900,span*7); controls.update(); }
function updateGuide(w,h,d) { $('guideWidth').textContent=w?`${w.toFixed(1)} mm`:'—'; $('guideHeight').textContent=`${h.toFixed(1)} mm`; $('guideDepth').textContent=`${d.toFixed(1)} mm`; }
function renderLists() {
  $('pieceList').innerHTML=currentObjects.map((o,i)=>`<div class="piece"><b>Pieza ${i+1}</b><span>${o.userData.char}</span></div>`).join('');
  $('bedList').innerHTML=beds.map((b,i)=>`<div class="bedCard"><b>🛏️ Cama ${i+1}</b><br>${b.objects.filter(x=>!x.invalid).length} piezas<button class="exportBed" data-bed="${i}">Exportar STL de esta cama</button></div>`).join('');
  document.querySelectorAll('.exportBed').forEach(btn=>btn.onclick=()=>exportBed(+btn.dataset.bed));
}
async function build() {
  if (!(await ensureFont())) return;
  const text=($('text').value||'').trim(), height=Math.max(1,+$('height').value||60), depth=Math.max(.8,+$('depth').value||12), spacing=Math.max(0,+$('spacing').value||4), requested=Math.max(0,+$('widthScale').value||0), bed=usableBed();
  clearModel(); updateBedInfo();
  if (!text) { updateGuide(0,height,depth); fitCamera(printerDims(),1); status('Escribí el texto arriba y tocá “Crear modelo”.','warn'); return; }
  let cursor=0,naturalWidth=0,maxHeight=0; const chars=[];
  for (const char of [...text]) {
    if(char===' '){cursor+=height*.45+spacing;continue;}
    const geometry=makeGeometry(char,height,depth); geometry.computeBoundingBox(); const box=geometry.boundingBox, width=Math.max(.01,box.max.x-box.min.x), object=new THREE.Mesh(geometry,material());
    object.position.x=cursor; object.userData={char,width}; chars.push(object); cursor+=width+spacing; maxHeight=Math.max(maxHeight,box.max.y-box.min.y);
  }
  naturalWidth=Math.max(.01,cursor-spacing); const scale=requested?requested/naturalWidth:1, totalWidth=requested||naturalWidth;
  chars.forEach(object=>{object.position.x*=scale;object.scale.x=scale;object.userData.width*=scale;modelGroup.add(object);currentObjects.push(object);});
  beds=packInOrder(currentObjects,bed); centerBeds(beds,bed); drawBeds(bed,beds.length); renderLists(); updateGuide(totalWidth,maxHeight,depth);
  $('sx').textContent=totalWidth.toFixed(1); $('sy').textContent=maxHeight.toFixed(1); $('sz').textContent=depth.toFixed(1); $('pieces').textContent=currentObjects.length; fitCamera(printerDims(),beds.length);
  const invalid=beds.flatMap(g=>g.objects).filter(i=>i.invalid);
  if(depth>bed.z+.01) status(`✕ Grosor Z ${depth.toFixed(1)} mm supera la altura útil ${bed.z.toFixed(1)} mm.`,'bad');
  else if(invalid.length) status('✕ Una o más letras no entran en la cama útil. Bajá el ancho total o el alto.','bad');
  else status(`✓ “${text}” · orden original · conjunto centrado en la cama · ${beds.length} cama${beds.length>1?'s':''}.`,'ok');
}
function scheduleBuild(){clearTimeout(buildTimer);buildTimer=setTimeout(build,300);}
function exportObjects(objects,filename){if(!objects.length)return;const root=new THREE.Group();objects.forEach(o=>root.add(o.clone()));root.updateMatrixWorld(true);const stl=new STLExporter().parse(root),url=URL.createObjectURL(new Blob([stl],{type:'model/stl'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportBed(index){const objects=beds[index]?.objects.filter(i=>!i.invalid).map(i=>i.object)||[];exportObjects(objects,`gemelos3d-cama-${String(index+1).padStart(2,'0')}.stl`);}
function saveProject(){const data={app:'Gemelos 3D',version:1,text:$('text').value,printer:$('printer').value,custom:{x:$('cx').value,y:$('cy').value,z:$('cz').value},margin:$('margin').value,purgeMode:$('purgeMode').value,purge:{x:$('purgeX').value,y:$('purgeY').value},height:$('height').value,widthMm:$('widthScale').value,depth:$('depth').value,spacing:$('spacing').value,font:$('fontStyle').value,curveSegments:$('curveSegments').value,bevel:$('bevel').checked,bevelSize:$('bevelSize').value,bevelSegments:$('bevelSegments').value};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='gemelos3d-proyecto.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('✓ Proyecto JSON guardado.','ok');}

$('build').onclick=build;
$('buildTop').onclick=build;
$('clearText').onclick=()=>{ $('text').value=''; clearModel(); updateGuide(0,+$('height').value||60,+$('depth').value||12); status('Campo limpio. Escribí algo arriba para crear el modelo.','warn'); $('text').focus(); };
$('centerAll').onclick=build;
$('optimize').onclick=()=>status('La base segura mantiene el orden del texto. La optimización se agregará sin modificar este modo.','ok');
$('download').onclick=()=>exportObjects(currentObjects,'gemelos3d-proyecto02.stl');
$('downloadPieces').onclick=()=>currentObjects.forEach((o,i)=>exportObjects([o],`gemelos3d-pieza-${String(i+1).padStart(2,'0')}.stl`));
$('project').onclick=saveProject;
['printer','margin','cx','cy','cz','text','height','widthScale','depth','spacing','curveSegments','bevelSize','bevelSegments','purgeMode','purgeX','purgeY'].forEach(id=>$(id)?.addEventListener('input',()=>{if(id==='printer')$('customFields').hidden=$('printer').value!=='custom';if(id==='purgeMode')$('purgeFields').hidden=$('purgeMode').value==='none';updateBedInfo();scheduleBuild();}));
$('printer').onchange=build;
$('fontStyle').onchange=build;
$('bevel').onchange=()=>{$('bevelFields').hidden=!$('bevel').checked;build();};
$('purgeFields').hidden=$('purgeMode').value==='none';
$('customFields').hidden=$('printer').value!=='custom';
$('bevelFields').hidden=!$('bevel').checked;
updateBedInfo(); updateGuide(0,+$('height').value||60,+$('depth').value||12); fitCamera(printerDims(),1); status('Listo. Escribí el texto arriba y tocá “Crear modelo”.','ok');
function resize(){const w=Math.max(1,viewer.clientWidth),h=Math.max(1,viewer.clientHeight||600);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize); resize();
(function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);})();
