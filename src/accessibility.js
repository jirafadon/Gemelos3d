const main=document.querySelector('main');
if(!main)return;

const style=document.createElement('style');
style.textContent=`
:where(a,button,input,select,textarea,[tabindex]):focus-visible{outline:2px solid var(--accent,#8bf0c5);outline-offset:3px;box-shadow:0 0 0 2px #8bf0c522}
:where(a,button,input,select,textarea){scroll-margin-top:88px}
:where(button:disabled,[aria-disabled="true"]){cursor:not-allowed;opacity:.58}
button{font:inherit}
.skip-link{position:fixed;left:12px;top:12px;z-index:1000;transform:translateY(-160%);padding:10px 13px;border-radius:9px;background:#f5f7fa;color:#0b0d11;font-size:11px;font-weight:800;text-decoration:none;box-shadow:0 8px 24px #0006}
.skip-link:focus{transform:translateY(0)}
[aria-busy="true"]{cursor:progress}
`;
document.head.appendChild(style);

if(!document.querySelector('.skip-link')){
  const link=document.createElement('a');
  link.className='skip-link';
  link.href='#main-content';
  link.textContent='Saltar al contenido principal';
  document.body.prepend(link);
}

main.id=main.id||'main-content';

const controls=[...document.querySelectorAll('button,a,input,select,textarea')];
controls.forEach((el,index)=>{
  if(el.disabled)el.setAttribute('aria-disabled','true');
  if(el.tagName==='BUTTON'&&!el.getAttribute('type'))el.type='button';
  if(!el.getAttribute('aria-label')&&!el.textContent.trim()&&el.title)el.setAttribute('aria-label',el.title);
  if(el.tagName==='A'&&el.href&&!el.getAttribute('aria-label')){
    const text=el.textContent.trim();
    if(!text)el.setAttribute('aria-label','Abrir enlace');
  }
});

const labels=[...document.querySelectorAll('input,select,textarea')];
labels.forEach(el=>{
  if(el.id&&!el.getAttribute('aria-label')&&!document.querySelector(`label[for="${CSS.escape(el.id)}"]`)){
    const parent=el.closest('label');
    if(parent)return;
    const text=el.placeholder||el.name;
    if(text)el.setAttribute('aria-label',text);
  }
});

const live=document.createElement('div');
live.className='a11y-live';
live.setAttribute('aria-live','polite');
live.setAttribute('aria-atomic','true');
live.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
document.body.appendChild(live);
window.gemelosAnnounce=(message)=>{live.textContent='';requestAnimationFrame(()=>{live.textContent=String(message||'')})};

let lastFocused=null;
document.addEventListener('focusin',event=>{if(event.target.matches('a,button,input,select,textarea,[tabindex]'))lastFocused=event.target});
window.gemelosRestoreFocus=()=>{if(lastFocused&&document.contains(lastFocused)){lastFocused.focus();return true}return false};
