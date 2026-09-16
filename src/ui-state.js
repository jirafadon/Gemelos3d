const STYLE_ID = 'gemelos-ui-state-style';
const BAR_ID = 'gemelos-page-progress';
const TOAST_ID = 'gemelos-ui-error';

function installStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`#${BAR_ID}{position:fixed;left:0;top:0;width:100%;height:2px;z-index:9999;pointer-events:none;opacity:0;background:var(--accent,#8bf0c5);box-shadow:0 0 14px #8bf0c577;transform-origin:left;transition:transform .22s ease,opacity .22s ease}#${TOAST_ID}{position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:12px;max-width:min(420px,calc(100vw - 32px));padding:13px 14px;border:1px solid #ff7f7f33;border-radius:12px;background:#151016f2;color:#f5f7fb;box-shadow:0 18px 50px #0008;backdrop-filter:blur(14px);font-size:11px;line-height:1.45}#${TOAST_ID} strong{display:block;font-size:11px}#${TOAST_ID} small{display:block;margin-top:3px;color:#a8a0aa;font-size:9px}#${TOAST_ID} button{flex:0 0 auto;border:1px solid #ffffff1f;border-radius:8px;background:#f5f7fa;color:#0b0d11;padding:8px 10px;font-size:9px;font-weight:800;cursor:pointer}#${TOAST_ID}[hidden]{display:none}@media(max-width:560px){#${TOAST_ID}{right:10px;bottom:10px;max-width:calc(100vw - 20px)}}`;
  document.head.appendChild(style);
}

function installProgress(){
  if(document.getElementById(BAR_ID)) return;
  const bar=document.createElement('div');
  bar.id=BAR_ID;
  bar.setAttribute('aria-hidden','true');
  document.body.appendChild(bar);
  requestAnimationFrame(()=>{bar.style.opacity='1';bar.style.transform='scaleX(.72)'});
  window.addEventListener('load',()=>{bar.style.transform='scaleX(1)';setTimeout(()=>{bar.style.opacity='0'},180)});
}

export function showUiError(title='No pudimos completar esta acción',detail='Probá nuevamente. Tu trabajo local no se modifica.'){
  installStyles();
  let toast=document.getElementById(TOAST_ID);
  if(!toast){
    toast=document.createElement('div');
    toast.id=TOAST_ID;
    toast.setAttribute('role','alert');
    document.body.appendChild(toast);
  }
  toast.innerHTML=`<div><strong></strong><small></small></div><button type="button">Reintentar</button>`;
  toast.querySelector('strong').textContent=title;
  toast.querySelector('small').textContent=detail;
  toast.querySelector('button').onclick=()=>window.location.reload();
  toast.hidden=false;
}

installStyles();
if(document.body) installProgress();
window.addEventListener('error',event=>{
  if(event?.error || event?.message) showUiError('Ocurrió un problema en esta pantalla','Podés reintentar sin perder los proyectos guardados localmente.');
});
window.addEventListener('unhandledrejection',()=>showUiError('No pudimos completar una operación','Reintentá la acción. Si el problema continúa, volvé a abrir la pantalla.'));
