{
const PAGES=['kata','jadwal','kepiting','balance'];
const go=(p,anim)=>{if(!PAGES.includes(p))p='kata';window.GA_PAGE=p;
  for(const q of PAGES){const el=document.getElementById('page-'+q);const on=q===p;el.hidden=!on;if(on&&anim){el.classList.remove('enter');void el.offsetWidth;el.classList.add('enter')}}
  document.querySelectorAll('.nb[data-page]').forEach(b=>{b.classList.toggle('on',b.dataset.page===p);b.setAttribute('aria-current',b.dataset.page===p?'page':'false')});
  try{if(location.hash!=='#'+p)history.replaceState(null,'','#'+p)}catch(e){}
  window.dispatchEvent(new CustomEvent('gapage',{detail:p}))};
document.querySelectorAll('.nb[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page,true)));
window.addEventListener('hashchange',()=>go(location.hash.slice(1),true));
const help=document.getElementById('help');
document.getElementById('helpBtn').addEventListener('click',()=>{help.hidden=false});
document.getElementById('helpX').addEventListener('click',()=>{help.hidden=true});
help.addEventListener('click',e=>{if(e.target===help)help.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')help.hidden=true});
window.GA_PAGE=(location.hash.slice(1)||'kata');
go(window.GA_PAGE,false);
}
