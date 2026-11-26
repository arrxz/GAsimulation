{
const $=id=>document.getElementById(id);
const TAU=Math.PI*2,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd=k=>Math.floor(Math.random()*k),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v)};
const retrig=(el,c)=>{el.classList.remove(c);void el.offsetWidth;el.classList.add(c)};
const LS={
  rastrigin:{lo:-5.12,hi:5.12,f:(x,y)=>{x-=2.3;y+=1.7;return-(20+x*x-10*Math.cos(TAU*x)+y*y-10*Math.cos(TAU*y))},opt:[2.3,-1.7],desc:'Rastrigin: puluhan bukit kecil tersusun rapi seperti kardus telur, dan hanya satu yang tertinggi.'},
  schwefel:{lo:-500,hi:500,f:(x,y)=>x*Math.sin(Math.sqrt(Math.abs(x)))+y*Math.sin(Math.sqrt(Math.abs(y))),opt:[420.9687,420.9687],desc:'Schwefel: puncak tertinggi kedua letaknya jauh dari puncak sejati (pojok kanan bawah), sehingga pencarian mudah tertipu.'},
  gunung:{lo:0,hi:1,f:null,opt:null,desc:'Pegunungan acak: banyak bukit lebar yang menggoda, dan satu puncak sejati yang sempit dan tersembunyi.'}
};
const D={lambat:{tw:850,wait:1150},sedang:{tw:300,wait:380},cepat:{tw:0,wait:35}};
const G=200;let L,fmin=0,fmax=1,opt=[.5,.5],optH=100,bg=document.createElement('canvas');
let pop=[],hc=null,gen=0,hist=[],running=false,busy=false,token=0,found=false,foundGen=0,t0=0,tw=0,hover=null,lastStats={};
const X=u=>L.lo+u*(L.hi-L.lo),U=x=>(x-L.lo)/(L.hi-L.lo);
const H=(u,v)=>(L.f(X(u),X(v))-fmin)/(fmax-fmin)*100;
const cfg=()=>({n:+$('pkN').value,pm:+$('pkPm').value/100,sg:+$('pkSg').value/100,k:+$('pkK').value});
const spd=()=>document.querySelector('input[name=pkspd]:checked').value;
const sleep=ms=>new Promise((res,rej)=>{const t=token;setTimeout(()=>t===token?res():rej(new Error('abort')),ms)});
const CM=[[0,8,12,34],[.3,24,46,120],[.55,10,132,255],[.75,94,231,223],[.9,255,214,10],[1,255,120,40]];
function cm(t){for(let i=1;i<CM.length;i++)if(t<=CM[i][0]){const a=CM[i-1],b=CM[i],k=(t-a[0])/(b[0]-a[0]);return[a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k,a[3]+(b[3]-a[3])*k]}return CM[CM.length-1].slice(1)}

function buildLand(key){L=LS[key];
  if(key==='gunung'){const pk=[];for(let i=0;i<34;i++)pk.push({x:Math.random(),y:Math.random(),h:.25+Math.random()*.5,s:.035+Math.random()*.09});
    const t={x:.12+Math.random()*.76,y:.12+Math.random()*.76,h:1.05,s:.022};pk.push(t);L.f=(x,y)=>{let s=0;for(const p of pk)s+=p.h*Math.exp(-((x-p.x)**2+(y-p.y)**2)/(2*p.s*p.s));return s};L.opt=[t.x,t.y]}
  const F=new Float32Array(G*G);fmin=Infinity;fmax=-Infinity;let bi=0;
  for(let j=0;j<G;j++)for(let i=0;i<G;i++){const v=L.f(X((i+.5)/G),X((j+.5)/G));F[j*G+i]=v;if(v<fmin)fmin=v;if(v>fmax){fmax=v;bi=j*G+i}}
  let o=[U(L.opt[0]),U(L.opt[1])];
  if(key==='gunung'){let best=L.f(X(o[0]),X(o[1]));for(let k=0;k<400;k++){const c=[clamp(o[0]+gauss()*.004,0,1),clamp(o[1]+gauss()*.004,0,1)],v=L.f(X(c[0]),X(c[1]));if(v>best){best=v;o=c}}}
  opt=o;fmax=Math.max(fmax,L.f(X(o[0]),X(o[1])));optH=100;
  bg.width=bg.height=G;const ctx=bg.getContext('2d'),img=ctx.createImageData(G,G),R=fmax-fmin;
  for(let j=0;j<G;j++)for(let i=0;i<G;i++){const t=(F[j*G+i]-fmin)/R,nx=((F[j*G+Math.min(i+1,G-1)]-F[j*G+Math.max(i-1,0)])/R)*G/16,ny=((F[Math.min(j+1,G-1)*G+i]-F[Math.max(j-1,0)*G+i])/R)*G/16;
    const sh=clamp(.86+(nx+ny)*1.1,.45,1.3),c=cm(t),p=(j*G+i)*4;img.data[p]=clamp(c[0]*sh,0,255);img.data[p+1]=clamp(c[1]*sh,0,255);img.data[p+2]=clamp(c[2]*sh,0,255);img.data[p+3]=255}
  ctx.putImageData(img,0,0)}

function newHc(u,v){u=u??Math.random();v=v??Math.random();return{u,v,pu:u,pv:v,h:H(u,v),path:[[u,v]],stuck:0}}
function init(){const c=cfg();pop=Array.from({length:c.n},()=>{const u=Math.random(),v=Math.random();return{u,v,pu:u,pv:v,h:H(u,v)}});hc=newHc();gen=1;found=false;foundGen=0;hist=[];record();t0=performance.now();tw=0}
function record(){const b=Math.max(...pop.map(p=>p.h));hist.push({g:b,c:hc.h});if(!found&&b>=optH-.4){found=true;foundGen=gen}}
const blx=(a,b)=>{const lo=Math.min(a,b),d=Math.abs(a-b);return lo-.5*d+Math.random()*d*2};
function step(){const c=cfg();pop.sort((a,b)=>b.h-a.h);const E=Math.min(2,c.n),next=pop.slice(0,E).map(p=>({...p,pu:p.u,pv:p.v,el:1}));
  const tour=()=>{let b=null;for(let i=0;i<c.k;i++){const x=pop[rnd(pop.length)];if(!b||x.h>b.h)b=x}return b};
  while(next.length<c.n){const a=tour(),b=tour();let u=a.u,v=a.v;if(Math.random()<.9){u=blx(a.u,b.u);v=blx(a.v,b.v)}
    if(Math.random()<c.pm)u+=gauss()*c.sg;if(Math.random()<c.pm)v+=gauss()*c.sg;u=clamp(u,0,1);v=clamp(v,0,1);next.push({u,v,pu:a.u,pv:a.v,h:H(u,v)})}
  pop=next;hc.pu=hc.u;hc.pv=hc.v;let bu=hc.u,bv=hc.v,bh=hc.h;
  for(let i=0;i<c.n;i++){const u=clamp(hc.u+gauss()*.018,0,1),v=clamp(hc.v+gauss()*.018,0,1),h=H(u,v);if(h>bh){bh=h;bu=u;bv=v}}
  if(bh>hc.h+.05){hc.u=bu;hc.v=bv;hc.h=bh;hc.path.push([bu,bv]);hc.stuck=0}else hc.stuck++;
  gen++;record();t0=performance.now();tw=RM?0:D[spd()].tw}
function diversity(){if(!pop.length)return 0;let cu=0,cv=0;for(const p of pop){cu+=p.u;cv+=p.v}cu/=pop.length;cv/=pop.length;let s=0;for(const p of pop)s+=Math.hypot(p.u-cu,p.v-cv);return Math.min(100,Math.round(s/pop.length/.38*100))}
const best=()=>pop.reduce((a,b)=>b.h>a.h?b:a,pop[0]);

function setStat(id,val,sub){const el=$(id);if(el.textContent!==String(val)){el.textContent=val;if(lastStats[id]!==undefined&&!RM&&spd()!=='cepat')retrig(el.closest('.stat'),'bump');lastStats[id]=val}if(sub!=null)$(id+'S').innerHTML=sub}
function ui(){const b=best(),d=diversity(),stuck=hc.stuck>=3&&hc.h<optH-1;
  setStat('pkGen',gen,`${pop.length} evaluasi/generasi, GA = pendaki`);
  setStat('pkGa',b.h.toFixed(1),found?`<span style="color:var(--ok)">puncak sejati ditemukan (gen ${foundGen})</span>`:`${Math.round(b.h/optH*100)}% dari puncak sejati`);
  setStat('pkHc',hc.h.toFixed(1),hc.h>=optH-1?'<span style="color:var(--ok)">mencapai puncak sejati</span>':stuck?'<span style="color:#ff8fa8">terjebak di puncak palsu</span>':'masih menanjak');
  $('pkDiv').textContent=d+'%';
  let h='';
  if(gen<=1)h=`Peta ini adalah <b>lanskap fitness</b>. ${L.desc} Titik putih = ${pop.length} individu GA, titik oranye = satu pendaki yang hanya mau melangkah naik. Tekan <b>Mulai</b>.`;
  else{h+=hc.h>=optH-1?'Pendaki kebetulan mulai di lereng puncak sejati, jadi ia berhasil. Klik titik lain di peta untuk mengujinya lagi. ':stuck?`<b style="color:var(--p2)">Pendaki terjebak</b> di ketinggian ${hc.h.toFixed(1)}: semua langkah kecil di sekitarnya lebih rendah, padahal puncak sejati ${optH}. Itulah <b>puncak palsu</b>. `:`Pendaki masih menanjak (${hc.h.toFixed(1)}). `;
    h+=found?`<b style="color:var(--ok)">GA menemukan puncak sejati</b> pada generasi ${foundGen}.`:d<12?`Populasi GA sudah berkumpul di satu bukit (keragaman ${d}%). Kalau itu bukan puncak sejati, hanya mutasi yang bisa melompatkannya keluar.`:`Populasi GA masih tersebar (keragaman ${d}%): crossover mencampur posisi dua induk, mutasi melompatkan individu ke bukit lain.`}
  const n=$('pkNarr');if(n.innerHTML!==h){n.innerHTML=h}
  drawChart()}

let geo=null;
function draw(){const fig=$('pkMapFig'),cv=$('pkMap'),W=fig.clientWidth,Hh=fig.clientHeight;if(!W||!Hh||!pop.length)return;const dpr=devicePixelRatio||1;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(Hh*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(Hh*dpr)}
  const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,Hh);const S=Math.min(W,Hh),ox=(W-S)/2,oy=(Hh-S)/2;geo={S,ox,oy};
  x.imageSmoothingEnabled=true;x.save();x.beginPath();x.roundRect(ox,oy,S,S,12);x.clip();x.drawImage(bg,ox,oy,S,S);x.restore();
  const P=(u,v)=>[ox+u*S,oy+v*S],now=performance.now(),k0=tw?clamp((now-t0)/tw,0,1):1,k=1-(1-k0)**3,lerp=(a,b)=>a+(b-a)*k;
  if($('pkShow').checked){const[gx,gy]=P(opt[0],opt[1]),pulse=found?(now/600)%1:0;x.setLineDash([4,4]);x.strokeStyle='#30d158';x.lineWidth=2.5;x.beginPath();x.arc(gx,gy,13,0,TAU);x.stroke();x.setLineDash([]);
    if(found){x.globalAlpha=1-pulse;x.beginPath();x.arc(gx,gy,13+pulse*26,0,TAU);x.stroke();x.globalAlpha=1}
    x.font='600 12px Inter';x.fillStyle='#30d158';x.textAlign='center';x.fillText('puncak sejati',gx,gy-18)}
  x.strokeStyle='rgba(255,159,10,.85)';x.lineWidth=2;x.beginPath();hc.path.forEach((p,i)=>{const[a,b]=P(p[0],p[1]);i?x.lineTo(a,b):x.moveTo(a,b)});x.stroke();
  const r=clamp(S/120,2.6,5.5),b=best();
  for(const p of pop){const[a,c]=P(lerp(p.pu,p.u),lerp(p.pv,p.v));x.beginPath();x.arc(a,c,r,0,TAU);x.fillStyle='rgba(255,255,255,.92)';x.fill();x.lineWidth=1.2;x.strokeStyle='rgba(0,0,0,.55)';x.stroke();if(p.el){x.beginPath();x.arc(a,c,r+2.5,0,TAU);x.strokeStyle='rgba(255,214,10,.9)';x.lineWidth=1.5;x.stroke()}}
  {const[a,c]=P(lerp(b.pu,b.u),lerp(b.pv,b.v)),R=r*2.6;x.save();x.shadowColor='rgba(255,214,10,.8)';x.shadowBlur=12;x.beginPath();for(let i=0;i<10;i++){const ang=-Math.PI/2+i*Math.PI/5,rr=i%2?R*.45:R;x.lineTo(a+Math.cos(ang)*rr,c+Math.sin(ang)*rr)}x.closePath();x.fillStyle='#ffd60a';x.fill();x.restore();x.strokeStyle='#3a2a00';x.lineWidth=1;x.stroke()}
  {const[a,c]=P(lerp(hc.pu,hc.u),lerp(hc.pv,hc.v)),stuck=hc.stuck>=3&&hc.h<optH-1;x.beginPath();x.arc(a,c,r+3,0,TAU);x.fillStyle='#ff9f0a';x.fill();x.lineWidth=2.5;x.strokeStyle='#fff';x.stroke();
    x.font='600 12px Inter';const label=stuck?'pendaki terjebak':'pendaki',tw2=x.measureText(label).width+14,lx=clamp(a-tw2/2,ox+2,ox+S-tw2-2),ly=c+r+9;x.fillStyle=stuck?'rgba(255,55,95,.92)':'rgba(20,22,27,.85)';x.beginPath();x.roundRect(lx,ly,tw2,20,10);x.fill();x.fillStyle='#fff';x.textAlign='left';x.fillText(label,lx+7,ly+14)}}
function loop(){if(window.GA_PAGE==='puncak')draw();requestAnimationFrame(loop)}
$('pkMapFig').addEventListener('pointermove',e=>{if(!geo)return;const f=$('pkMapFig').getBoundingClientRect(),mx=e.clientX-f.left,my=e.clientY-f.top,u=(mx-geo.ox)/geo.S,v=(my-geo.oy)/geo.S,t=$('pkTip');
  if(u<0||u>1||v<0||v>1){$('pkMapFig').classList.remove('hov');return}t.textContent=`ketinggian ${H(u,v).toFixed(1)}`;t.style.left=Math.min(mx+12,f.width-t.offsetWidth-4)+'px';t.style.top=Math.max(my-34,4)+'px';$('pkMapFig').classList.add('hov')});
$('pkMapFig').addEventListener('pointerleave',()=>$('pkMapFig').classList.remove('hov'));
$('pkMapFig').addEventListener('click',e=>{if(!geo||!pop.length)return;const f=$('pkMapFig').getBoundingClientRect(),u=(e.clientX-f.left-geo.ox)/geo.S,v=(e.clientY-f.top-geo.oy)/geo.S;if(u<0||u>1||v<0||v>1)return;hc=newHc(u,v);if(hist.length)hist[hist.length-1].c=hc.h;ui()});

let CG=null;
function drawChart(){const s=$('pkChart'),W=s.clientWidth,Hh=s.clientHeight;if(!W)return;const n=Math.max(hist.length,10),pl=30,pr=10,pt=10,pb=24;
  const Xc=i=>pl+(W-pl-pr)*i/(n-1),Y=v=>pt+(Hh-pt-pb)*(1-v/100);CG={Xc,pl,pr,W,n};
  const path=k=>hist.map((h,i)=>(i?'L':'M')+Xc(i).toFixed(1)+' '+Y(h[k]).toFixed(1)).join('');
  const ticks=[0,50,100].map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${Y(v)+4}" text-anchor="end" font-size="12" fill="var(--dim)">${v}</text>`).join('');
  const L1=hist.length-1;
  s.innerHTML=ticks+`<line x1="${pl}" x2="${W-pr}" y1="${Y(optH)}" y2="${Y(optH)}" stroke="var(--ok)" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W-pr}" y="${Hh-6}" text-anchor="end" font-size="12" fill="var(--dim)">generasi 1–${hist.length}</text>`+(hist.length?`<path d="${path('c')}" fill="none" stroke="var(--p2)" stroke-width="2.5"/><path d="${path('g')}" fill="none" stroke="var(--yel)" stroke-width="3" stroke-linejoin="round"/><circle cx="${Xc(L1)}" cy="${Y(hist[L1].g)}" r="5" fill="var(--yel)" class="ping"/><circle cx="${Xc(L1)}" cy="${Y(hist[L1].g)}" r="4.5" fill="var(--yel)"/>`:'')}
$('pkChartFig').addEventListener('pointermove',e=>{const f=$('pkChartFig');if(!CG||!hist.length)return;const x=e.clientX-f.getBoundingClientRect().left,i=clamp(Math.round((x-CG.pl)/(CG.W-CG.pl-CG.pr)*(CG.n-1)),0,hist.length-1),px=CG.Xc(i),t=$('pkT');
  $('pkV').style.left=px+'px';t.textContent=`Gen ${i+1}: GA ${hist[i].g.toFixed(1)}, pendaki ${hist[i].c.toFixed(1)}`;t.style.left=clamp(px-t.offsetWidth/2,0,CG.W-t.offsetWidth)+'px';f.classList.add('hov')});
$('pkChartFig').addEventListener('pointerleave',()=>$('pkChartFig').classList.remove('hov'));

function btn(){const p=$('pkPlay');p.textContent=running?'Jeda':(gen>1?'Lanjutkan':'Mulai');p.classList.toggle('on',running);$('pkStep').disabled=busy}
async function run(){if(busy)return;const my=token;busy=true;running=true;btn();
  try{while(running&&my===token){const was=found;step();ui();if(found&&!was){running=false;break}await sleep(D[spd()].wait)}}catch(e){}
  if(my===token){busy=false;running=false;btn()}}
function reset(){token++;running=false;busy=false;init();ui();btn()}
$('pkPlay').addEventListener('click',()=>{if(running){running=false;btn()}else run()});
$('pkStep').addEventListener('click',()=>{if(busy)return;step();ui();btn()});
$('pkReset').addEventListener('click',reset);
$('pkLand').addEventListener('change',()=>{buildLand($('pkLand').value);reset()});
$('pkShow').addEventListener('change',draw);
document.addEventListener('keydown',e=>{if(window.GA_PAGE!=='puncak'||e.target.matches('input[type=text],select')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key===' '){e.preventDefault();$('pkPlay').click()}else if(e.key==='ArrowRight'){e.preventDefault();$('pkStep').click()}else if(e.key==='r'||e.key==='R')reset()});
const outs={pkN:v=>v,pkPm:v=>v+'%',pkSg:v=>v+'%',pkK:v=>v};
const upd=k=>{const o=$(k+'O');o.textContent=outs[k]($(k).value);retrig(o,'bump')};
for(const k in outs){$(k).addEventListener('input',()=>upd(k));$(k+'O').textContent=outs[k]($(k).value)}
const PRE=[['Standar',{pkN:60,pkPm:25,pkSg:8,pkK:3}],['Tanpa mutasi',{pkN:60,pkPm:0,pkSg:8,pkK:3}],['Mutasi besar',{pkN:60,pkPm:70,pkSg:30,pkK:3}],['Populasi kecil (8)',{pkN:8,pkPm:25,pkSg:8,pkK:3}],['Seleksi ketat',{pkN:60,pkPm:25,pkSg:8,pkK:10}]];
$('pkPre').innerHTML=PRE.map((p,i)=>`<button type="button" data-i="${i}">${p[0]}</button>`).join('');
$('pkPre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[+b.dataset.i][1];for(const k in p){$(k).value=p[k];upd(k)}reset()});
new ResizeObserver(()=>drawChart()).observe($('pkChartFig'));
buildLand('rastrigin');reset();requestAnimationFrame(loop);
}
