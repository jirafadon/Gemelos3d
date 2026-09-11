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
        <div>
          <strong>Fabricación</strong>
          <span>Lo que ves acá es lo que se va a fabricar</span>
        </div>
        <span class="fabLive">● EN VIVO</span>
      </div>

      <div class="fabMode" role="tablist" aria-label="Modo de visualización">
        <button type="button" data-fab-mode="model" class="active">Modelo</button>
        <button type="button" data-fab-mode="fabrication">Fabricación</button>
      </div>

      <div class="fabSummary" id="fabSummary">
        <div><b id="fabBedCount">0</b><span>camas</span></div>
        <div><b id="fabPieceCount">0</b><span>piezas</span></div>
        <div><b id="fabActiveBed">—</b><span>cama activa</span></div>
      </div>

      <div class="fabBedsTitle">CAMAS</div>
      <div id="fabBeds"></div>

      <div class="fabSelectedTitle">SELECCIÓN</div>
      <div id="fabSelected" class="fabSelected">
        <b>Ninguna pieza seleccionada</b>
        <span>Elegí una pieza para ver sus medidas y cama.</span>
      </div>

      <div class="fabPiecesTitle">PIEZAS</div>
      <div id="fabPieces"></div>
    `;
    viewer.appendChild(panel);
  }

  const fabBeds = panel.querySelector('#fabBeds');
  const fabPieces = panel.querySelector('#fabPieces');
  const fabSelected = panel.querySelector('#fabSelected');
  const fabBedCount = panel.querySelector('#fabBedCount');
  const fabPieceCount = panel.querySelector('#fabPieceCount');
  const fabActiveBed = panel.querySelector('#fabActiveBed');

  function readSelected(){
    const source = document.getElementById('selectedPiece');
    if (!source) {
      fabSelected.innerHTML = '<b>Ninguna pieza seleccionada</b><span>Elegí una pieza para ver sus medidas y cama.</span>';
      return;
    }
    fabSelected.innerHTML = source.innerHTML;
  }

  function sync(){
    const bedCards = [...bedList.querySelectorAll('.bedCard')];
    const pieceRows = [...pieceList.querySelectorAll('.piece')];
    const activeIndex = bedCards.findIndex(card => card.classList.contains('active'));

    fabBeds.innerHTML = '';
    bedCards.forEach((card, index) => {
      const item = document.createElement('div');
      item.className = `fabBedCard${index === activeIndex ? ' active' : ''}`;
      const tab = card.querySelector('.bedTab');
      item.innerHTML = `
        <div class="fabBedMain">
          <div>${tab?.innerHTML || `Cama ${index + 1}`}</div>
          <span>${index === activeIndex ? 'ACTIVA' : 'Disponible'}</span>
        </div>
        <button type="button">Ver cama ${index + 1}</button>
      `;
      item.querySelector('button').addEventListener('click', event => {
        event.stopPropagation();
        card.querySelector('button')?.click();
      });
      item.addEventListener('click', () => card.querySelector('button')?.click());
      fabBeds.appendChild(item);
    });

    fabPieces.innerHTML = '';
    pieceRows.forEach((row, index) => {
      const item = document.createElement('div');
      item.className = `fabPieceRow${row.classList.contains('selected') ? ' selected' : ''}`;
      item.innerHTML = row.innerHTML;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      const activate = () => row.click();
      item.addEventListener('click', activate);
      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
      fabPieces.appendChild(item);
    });

    fabBedCount.textContent = String(bedCards.length);
    fabPieceCount.textContent = String(pieceRows.length);
    fabActiveBed.textContent = activeIndex >= 0 ? `Cama ${activeIndex + 1}` : '—';
    panel.classList.toggle('hasBeds', bedCards.length > 0);
    panel.classList.toggle('hasPieces', pieceRows.length > 0);
    panel.classList.toggle('hasSelection', pieceRows.some(row => row.classList.contains('selected')));
    readSelected();
  }

  const observer = new MutationObserver(() => requestAnimationFrame(sync));
  observer.observe(bedList, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
  observer.observe(pieceList, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});

  sync();

  panel.querySelectorAll('[data-fab-mode]').forEach(btn => btn.addEventListener('click', () => {
    panel.querySelectorAll('[data-fab-mode]').forEach(b => b.classList.toggle('active', b === btn));
    const fabrication = btn.dataset.fabMode === 'fabrication';
    viewer.classList.toggle('fabricationMode', fabrication);
    panel.classList.toggle('fabricationMode', fabrication);

    if (fabrication) {
      const section = [...aside.querySelectorAll('section')].find(s => s.querySelector('#bedList'));
      section?.scrollIntoView({behavior:'smooth', block:'nearest'});
    }
  }));
}

installFabricationUI();
