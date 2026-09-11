const viewer = document.getElementById('viewer');
const aside = document.querySelector('aside');
const bedList = document.getElementById('bedList');
const pieceList = document.getElementById('pieceList');

function installFabricationUI(){
  if (!viewer || !aside || !bedList || !pieceList) return;
  let panel = document.getElementById('fabricationPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'fabricationPanel';
    panel.className = 'fabricationPanel';
    panel.innerHTML = `
      <div class="fabHeader">
        <div><strong>Vista de fabricación</strong><span>camas y piezas reales</span></div>
        <span class="fabLive">● EN VIVO</span>
      </div>
      <div class="fabMode">
        <button type="button" data-fab-mode="model" class="active">Modelo</button>
        <button type="button" data-fab-mode="fabrication">Fabricación</button>
      </div>
      <div class="fabBedsTitle">CAMAS</div>
      <div id="fabBeds"></div>
      <div class="fabPiecesTitle">PIEZAS</div>
      <div id="fabPieces"></div>
    `;
    viewer.appendChild(panel);
  }
  const fabBeds = panel.querySelector('#fabBeds');
  const fabPieces = panel.querySelector('#fabPieces');
  function sync(){
    fabBeds.innerHTML = '';
    bedList.querySelectorAll('.bedCard').forEach((card) => {
      const clone = card.cloneNode(true);
      clone.classList.add('fabBedCard');
      clone.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => card.querySelector('button')?.click()));
      fabBeds.appendChild(clone);
    });
    fabPieces.innerHTML = '';
    pieceList.querySelectorAll('.piece').forEach((row) => {
      const clone = row.cloneNode(true);
      clone.classList.add('fabPieceRow');
      clone.addEventListener('click', () => row.click());
      fabPieces.appendChild(clone);
    });
    panel.classList.toggle('hasBeds', fabBeds.children.length > 0);
    panel.classList.toggle('hasPieces', fabPieces.children.length > 0);
  }
  const observer = new MutationObserver(sync);
  observer.observe(bedList, {childList:true, subtree:true});
  observer.observe(pieceList, {childList:true, subtree:true});
  sync();
  panel.querySelectorAll('[data-fab-mode]').forEach(btn => btn.addEventListener('click', () => {
    panel.querySelectorAll('[data-fab-mode]').forEach(b => b.classList.toggle('active', b === btn));
    const fabrication = btn.dataset.fabMode === 'fabrication';
    viewer.classList.toggle('fabricationMode', fabrication);
    panel.classList.toggle('fabricationMode', fabrication);
  }));
}

installFabricationUI();
