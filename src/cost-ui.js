const viewer = document.getElementById('viewer');
const aside = document.querySelector('aside');

function money(n){return `$ ${Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function num(id,fallback){const n=Number(document.getElementById(id)?.value);return Number.isFinite(n)?n:fallback;}
function estimate(){
  const rows=[...document.querySelectorAll('#pieceList .piece')];
  const depth=Math.max(.8,num('depth',12));
  let volume=0;
  for(const row of rows){
    const span=row.querySelector('span');
    const m=span?.textContent.match(/·\s*([\d.,]+)\s*×\s*([\d.,]+)\s*mm/i);
    if(m){const w=Number(m[1].replace(',','.')),h=Number(m[2].replace(',','.'));if(Number.isFinite(w)&&Number.isFinite(h))volume+=w*h*depth;}
  }
  const density=Math.max(.01,num('costDensity',1.24));
  const waste=Math.max(0,num('costWaste',8));
  const grams=(volume/1000)*density*(1+waste/100);
  const priceKg=Math.max(0,num('costMaterial',22));
  const material=grams/1000*priceKg;
  const speed=Math.max(1,num('costMinutes100g',45));
  const hours=(grams/100)*speed/60;
  const power=Math.max(0,num('costPower',150));
  const kwh=hours*power/1000;
  const kwhPrice=Math.max(0,num('costKwh',0.12));
  const energy=kwh*kwhPrice;
  const labor=Math.max(0,num('costLabor',0))*hours;
  const direct=material+energy+labor;
  const margin=Math.min(99,Math.max(0,num('costMargin',30)));
  const sale=direct/(1-margin/100);
  document.getElementById('costWeight').textContent=`${grams.toFixed(1)} g`;
  document.getElementById('costTime').textContent=`${hours.toFixed(1)} h`;
  document.getElementById('costMaterialOut').textContent=money(material);
  document.getElementById('costEnergyOut').textContent=money(energy);
  document.getElementById('costDirectOut').textContent=money(direct);
  document.getElementById('costSaleOut').textContent=money(Number.isFinite(sale)?sale:0);
  document.getElementById('costKwhOut').textContent=`${kwh.toFixed(2)} kWh`;
  document.getElementById('costPiecesOut').textContent=String(rows.length);
}

function install(){
  if(!viewer||!aside||document.getElementById('costSection'))return;
  const section=document.createElement('section');section.id='costSection';
  section.innerHTML=`
    <h2 class="sectionTitle"><span class="sectionNumber">08</span>💰 Costos y precio</h2>
    <p class="sectionHint">Estimá material, tiempo, electricidad y un precio de venta antes de fabricar.</p>
    <div class="row">
      <div><label>Material ($/kg)</label><input id="costMaterial" type="number" value="22" min="0" step="0.1"></div>
      <div><label>Densidad (g/cm³)</label><input id="costDensity" type="number" value="1.24" min="0.01" step="0.01"></div>
    </div>
    <div class="row">
      <div><label>Desperdicio (%)</label><input id="costWaste" type="number" value="8" min="0" step="1"></div>
      <div><label>Minutos / 100 g</label><input id="costMinutes100g" type="number" value="45" min="1" step="1"></div>
    </div>
    <div class="row">
      <div><label>Potencia (W)</label><input id="costPower" type="number" value="150" min="0" step="10"></div>
      <div><label>Energía ($/kWh)</label><input id="costKwh" type="number" value="0.12" min="0" step="0.01"></div>
    </div>
    <div class="row">
      <div><label>Mano de obra ($/h)</label><input id="costLabor" type="number" value="0" min="0" step="1"></div>
      <div><label>Margen de venta (%)</label><input id="costMargin" type="number" value="30" min="0" max="99" step="1"></div>
    </div>
    <button id="costRefresh" class="primary">Calcular costo</button>
    <div class="stats">
      <div class="card"><b id="costWeight">—</b><span>Material</span></div>
      <div class="card"><b id="costTime">—</b><span>Tiempo estimado</span></div>
      <div class="card"><b id="costPiecesOut">0</b><span>Piezas</span></div>
      <div class="card"><b id="costKwhOut">—</b><span>Energía</span></div>
    </div>
    <div class="bedSummary">
      Material: <b id="costMaterialOut">$ 0,00</b><br>
      Electricidad: <b id="costEnergyOut">$ 0,00</b><br>
      Costo directo: <b id="costDirectOut">$ 0,00</b><br>
      <span style="display:block;margin-top:5px">Precio sugerido: <b id="costSaleOut">$ 0,00</b></span>
    </div>
    <div class="hint">Estimación orientativa: usa las dimensiones de las piezas. El consumo real puede variar por relleno, soportes, paredes y laminado.</div>`;
  const exportSection=[...aside.querySelectorAll('section')].find(s=>s.querySelector('#download'));
  if(exportSection)exportSection.after(section);else aside.appendChild(section);
  section.querySelectorAll('input').forEach(i=>i.addEventListener('input',estimate));
  section.querySelector('#costRefresh').addEventListener('click',estimate);
  const observer=new MutationObserver(()=>requestAnimationFrame(estimate));
  const list=document.getElementById('pieceList');
  if(list)observer.observe(list,{childList:true,subtree:true});
  estimate();
}

install();
