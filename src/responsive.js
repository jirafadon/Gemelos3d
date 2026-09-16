const style=document.createElement('style');
style.textContent=`
html{overflow-x:hidden}body{overflow-x:hidden}button,a,input,select,textarea{touch-action:manipulation}
@media (max-width:1024px){
  header{padding-left:18px!important;padding-right:18px!important}
  .page{padding-left:18px!important;padding-right:18px!important}
  .hero{gap:18px!important}
  .home-guidance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .home-workflow-track{padding-right:4px}
}
@media (max-width:760px){
  .page{padding-top:32px!important;padding-bottom:44px!important}
  .hero{grid-template-columns:1fr!important}
  .hero-copy{padding-top:4px!important}
  .visual{min-height:210px!important}
  .section-title{gap:10px;align-items:flex-start!important}
  .section-title span{line-height:1.4;text-align:right}
  .home-guidance-grid{grid-template-columns:1fr!important}
  .home-guidance-grid a{min-height:64px}
  .home-guidance-tip{align-items:flex-start!important;flex-wrap:wrap}
  .home-guidance-tip a{margin-left:30px}
  .home-workflow-track a{min-width:104px}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .toolbar{grid-template-columns:1fr!important}
  .toolbar .count{grid-column:auto!important}
  .hero-actions{justify-content:flex-start!important}
  .nav{max-width:55vw;overflow-x:auto;scrollbar-width:none}
  .nav::-webkit-scrollbar{display:none}
  .nav a{white-space:nowrap}
  .layout{grid-template-columns:1fr!important}
  aside{max-height:none!important;border-right:0!important;border-bottom:1px solid #252a33}
  #viewer{min-height:58vh!important}
  .fabricationPanel{width:calc(100% - 16px)!important;max-height:38%!important}
}
@media (max-width:520px){
  header{height:64px!important;padding:0 12px!important}
  .brand h1{font-size:14px!important}
  .brand p{font-size:9px!important}
  .header-link{padding:8px 9px!important;font-size:9px!important;white-space:nowrap}
  .page{padding:26px 12px 38px!important}
  h2{font-size:clamp(34px,12vw,48px)!important}
  .hero-copy>p{font-size:13px!important}
  .visual{min-height:180px!important;border-radius:18px!important}
  .cube{width:90px!important;height:90px!important}
  .grid{grid-template-columns:1fr!important}
  .card{min-height:138px!important;padding:16px!important}
  .section-title span{display:none}
  .home-guidance-grid a{padding:13px!important}
  .home-guidance-tip{padding:12px!important}
  .home-workflow-track a{min-width:100px;min-height:80px;padding:11px!important}
  .home-workflow-track a strong{font-size:10px}
  .home-workflow-track a small{font-size:8px}
  .flow{padding:14px!important;gap:9px!important}
  .flow span{font-size:9px}
  .layout aside{padding:7px!important}
  section{padding:9px!important}
  .row{grid-template-columns:1fr!important}
  .stats{grid-template-columns:repeat(2,1fr)!important}
  .sizeGuide{grid-template-columns:1fr!important}
  .sizeGuide svg{height:105px!important}
  .viewTools{max-width:calc(100% - 16px);overflow-x:auto}
  .viewTools button{white-space:nowrap}
  .fabricationPanel{bottom:7px!important;left:7px!important;width:calc(100% - 14px)!important}
  .actions{flex-direction:column!important}
  .actions a,.actions button{width:100%!important}
  .empty{padding:28px 16px!important}
}
@media (max-width:360px){
  .header-link{max-width:120px;overflow:hidden;text-overflow:ellipsis}
  .home-workflow-track a{min-width:92px}
  .flow{font-size:9px}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
document.head.appendChild(style);
