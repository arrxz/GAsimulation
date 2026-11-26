{
const GENES='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890, .-;:_!"#%&/()=?@${[]}';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const show=g=>esc(g===' '?'␣':g);
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const D={lambat:{ph:1300,g:340},sedang:{ph:380,g:80},cepat:{ph:0,g:0}};
const PH=[['Populasi','Kumpulan individu acak. Setiap individu adalah kromosom: untaian gen (huruf) sepanjang kata target.'],['Fitness','Fitness = jumlah huruf yang berbeda dari target. Tujuannya mencari fitness minimum (0 = kata ditemukan). Populasi lalu diurutkan dari yang terbaik.'],['Elitism','Sebagian individu terbaik disalin langsung ke generasi berikutnya, sehingga solusi terbaik tidak pernah hilang.'],['Seleksi','Dua induk dipilih acak dari kolam individu teratas. Individu bagus lebih berpeluang mewariskan gennya.'],['Crossover & mutasi','Tiap gen anak diundi: sebagian besar dari Induk 1 atau Induk 2 (crossover), sebagian kecil diganti huruf acak (mutasi) agar keanekaragaman tetap terjaga.']];
const PRE=[['Modul',{n:500,mut:10,eli:10,pool:50}],['Populasi kecil (10)',{n:10,mut:10,eli:10,pool:10}],['Populasi besar (5000)',{n:5000,mut:10,eli:10,pool:50}],['Mutasi 1%',{n:500,mut:1,eli:10,pool:50}],['Mutasi 50%',{n:500,mut:50,eli:10,pool:50}],['Tanpa elitism',{n:500,mut:10,eli:0,pool:50}]];
let T='GENETIKA',pop=[],gen=0,hist=[],evals=0,running=false,busy=false,done=false,token=0,stage=null,logs=[],uid=0,pick=[],mk={},prevBest=[],G=null,roll=null;
const cfg=()=>({n:+$('n').value,mut:+$('mut').value/100,eli:+$('eli').value/100,pool:+$('pool').value});
const speed=()=>document.querySelector('input[name=spd]:checked').value;
const rg=()=>GENES[Math.floor(Math.random()*GENES.length)];
const rnd=k=>Math.floor(Math.random()*k);
const fit=c=>c.reduce((s,g,i)=>s+(g!==T[i]?1:0),0);
const ind=c=>({c,f:fit(c),id:++uid});
const sorted=()=>[...pop].sort((a,b)=>a.f-b.f);
const sleep=ms=>new Promise((res,rej)=>{const t=token;setTimeout(()=>t===token?res():rej(new Error('abort')),ms)});
const retrig=(el,c)=>{el.classList.remove(c);void el.offsetWidth;el.classList.add(c)};
function mate(a,b,mut){const src=[],r=[],lim=(1-mut)/2;const c=a.c.map((g,i)=>{const p=Math.random();r.push(p);if(p<lim){src.push(1);return g}if(p<1-mut){src.push(2);return b.c[i]}src.push(3);return rg()});return{child:ind(c),src,r}}

$('steps').innerHTML=PH.map((p,i)=>`<li><button type="button" class="chip" data-i="${i}">${i+1} ${esc(p[0])}</button></li>`).join('');
$('steps').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const i=+b.dataset.i,box=$('info');if(!box.hidden&&box.dataset.i==i){box.hidden=true;return}box.dataset.i=i;box.innerHTML=`<b>${esc(PH[i][0])}.</b> ${esc(PH[i][1])}`;box.hidden=false;retrig(box,'in')});
function setPhase(k,html,dur){document.querySelectorAll('#page-kata .chip').forEach((c,i)=>{c.classList.remove('run');c.classList.toggle('on',i===k);if(i===k&&dur){c.style.setProperty('--dur',dur+'ms');requestAnimationFrame(()=>requestAnimationFrame(()=>c.classList.add('run')))}});const n=$('narr');n.innerHTML=html;retrig(n,'in')}

function renderBest(){const L=T.length,el=$('best');const b=pop.length?sorted()[0].c:Array(L).fill('?');
  if(el.children.length!==L){el.innerHTML=b.map(()=>'<span class="tl"></span>').join('');prevBest=[]}
  [...el.children].forEach((t,j)=>{const g=b[j],m=g===T[j];if(prevBest[j]!==g){t.innerHTML=show(g);if(prevBest[j]!==undefined)retrig(t,m&&!t.classList.contains('m')?'win':'flip')}t.classList.toggle('m',m);t.title=`Gen ke-${j+1}: "${g}" ${m?'cocok':'belum cocok, target "'+T[j]+'"'}`});prevBest=[...b]}
function renderList(){const v=sorted().slice(0,12),L=T.length,ul=$('list'),old={};
  ul.querySelectorAll('.row').forEach(r=>old[r.dataset.id]=r.getBoundingClientRect().top);
  ul.innerHTML=v.map((x,i)=>`<li class="row ${i<(mk.eli||0)?'eli':''} ${x===mk.p1?'isp1':''} ${x===mk.p2?'isp2':''}" data-id="${x.id}"><span class="rk">#${i+1}</span><span class="mini">${x.c.map((g,j)=>`<b class="${g===T[j]?'m':''}">${show(g)}</b>`).join('')}</span><span class="fv">${x.f}</span><span class="pbar"><i style="width:${(L-x.f)/L*100}%"></i></span></li>`).join('')||'<li class="note">Belum ada populasi. Tekan Mulai.</li>';
  if(RM||speed()==='cepat')return;
  ul.querySelectorAll('.row').forEach(r=>{const o=old[r.dataset.id],t=r.getBoundingClientRect().top;if(o!=null){if(Math.abs(o-t)>1)r.animate([{transform:`translateY(${o-t}px)`},{transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'})}else r.animate([{opacity:0,transform:'translateX(18px)'},{opacity:1,transform:'none'}],{duration:320,easing:'ease-out'})})}
function renderStage(){const L=T.length,el=$('stage');const av=$('stagewrap').clientWidth-110,vh=$('stagewrap').clientHeight||300,tw=Math.max(16,Math.min(56,Math.floor(av/L-5))),th=Math.max(22,Math.min(Math.round(tw*1.12),Math.floor((vh-44)/4)-5));el.style.setProperty('--tw',Math.min(tw,th)+'px');el.style.setProperty('--th',th+'px');el.classList.toggle('compact',th<34);el.style.gridTemplateColumns=`auto repeat(${L},var(--tw))`;
  const tile=(g,c)=>`<span class="tl ${c}">${show(g)}</span>`,emp=ch=>Array(L).fill(`<span class="tl emp">${ch}</span>`).join('');
  let h=`<div class="lab">Target</div>`+[...T].map(g=>tile(g,'m')).join('');
  const c=cfg(),lim=(1-c.mut)/2;$('mA').style.flexBasis=lim*100+'%';$('mB').style.flexBasis=lim*100+'%';$('mC').style.flexBasis=c.mut*100+'%';
  if(!stage){el.innerHTML=h+`<div class="lab">Induk 1</div>${emp('·')}<div class="lab">Induk 2</div>${emp('·')}<div class="lab">Anak</div>${emp('?')}`;$('needle').classList.remove('on');return}
  const{a,b,i1,i2,m,filled,act}=stage;
  h+=`<div class="lab">Induk 1<small>peringkat #${i1+1}, fitness ${a.f}</small></div>`+a.c.map((g,j)=>tile(g,'p1'+(j===act?' act':'')+(j<filled&&m.src[j]===1?' use':''))).join('');
  h+=`<div class="lab">Induk 2<small>peringkat #${i2+1}, fitness ${b.f}</small></div>`+b.c.map((g,j)=>tile(g,'p2'+(j===act?' act':'')+(j<filled&&m.src[j]===2?' use':''))).join('');
  h+=`<div class="lab">Anak${filled===L?`<small>fitness ${m.child.f}</small>`:''}</div>`+m.child.c.map((g,j)=>j===act&&roll?tile(roll,'roll'):j<filled?tile(g,'s'+m.src[j]+(g===T[j]?' m':'')+(j===act?' new':'')):'<span class="tl emp">?</span>').join('');
  h+=`<div class="lab">Angka acak r</div>`+m.r.map((r,j)=>`<span class="rv ${j<filled?'s'+m.src[j]:''}">${j<filled?(Math.min(tw,th)<36?r.toFixed(2).slice(1):r.toFixed(2)):''}</span>`).join('');
  el.innerHTML=h;const nd=$('needle');if(act>=0){nd.style.left=m.r[act]*100+'%';$('rv').textContent=m.r[act].toFixed(2);nd.classList.add('on')}else nd.classList.remove('on')}
function verdict(){const v=$('verdict');if(!stage||stage.filled<T.length){v.innerHTML='';return}const{a,b,m}=stage,f=m.child.f;
  v.innerHTML=f<Math.min(a.f,b.f)?'<span class="badge">Anak lebih baik dari kedua induk</span>':f>Math.max(a.f,b.f)?'<span class="badge bad">Anak lebih buruk dari kedua induk</span>':'<span class="badge mid">Anak setara dengan salah satu induk</span>'}
function tween(id,to,dec){const el=$(id),card=el.closest('.stat');if(typeof to!=='number'){el.textContent=to;el.dataset.v='';return}
  const from=el.dataset.v===''||el.dataset.v==null?to:+el.dataset.v;el.dataset.v=to;const fmt=v=>dec?v.toFixed(dec):Math.round(v).toLocaleString('id-ID')+(id==='sSim'?'%':'');
  if(from===to||RM||speed()==='cepat'){el.textContent=fmt(to);if(from!==to&&!RM&&speed()!=='cepat')retrig(card,'bump');return}
  retrig(card,'bump');cancelAnimationFrame(el._r);const t0=performance.now();const tick=t=>{const k=Math.min((t-t0)/380,1);el.textContent=fmt(from+(to-from)*(1-(1-k)**3));if(k<1)el._r=requestAnimationFrame(tick)};el._r=requestAnimationFrame(tick)}
function stats(){const L=T.length,has=pop.length>0,b=has?sorted()[0].f:L,last=hist[hist.length-1],sim=has?Math.round((L-b)/L*100):0;
  tween('sGen',has?gen:'–');tween('sBest',has?b:'–');tween('sSim',has?sim:'–');tween('sAvg',last?last.a:'–',2);tween('sEval',evals);$('ring').style.strokeDashoffset=100.5*(1-sim/100)}
function drawChart(){const s=$('chart'),W=s.clientWidth,H=s.clientHeight;if(!W)return;const L=T.length,n=Math.max(hist.length,10),pl=34,pr=12,pt=10,pb=28;
  const X=i=>pl+(W-pl-pr)*i/(n-1),Y=v=>pt+(H-pt-pb)*(1-v/L);G={X,pl,pr,W,n};
  const path=k=>hist.map((h,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(h[k]).toFixed(1)).join('');
  const ticks=[0,Math.round(L/2),L].map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${Y(v)+4}" text-anchor="end" font-size="12" fill="var(--mut)">${v}</text>`).join('');
  const lx=hist.length?X(hist.length-1):0,ly=hist.length?Y(hist[hist.length-1].b):0;
  s.innerHTML=ticks+`<text x="${W-pr}" y="${H-6}" text-anchor="end" font-size="12" fill="var(--mut)">generasi 1–${hist.length}</text><text x="${pl}" y="${H-6}" font-size="12" fill="var(--mut)">huruf salah, makin kecil makin baik</text>`+(hist.length?`<path d="${path('a')}" fill="none" stroke="var(--mut)" stroke-width="2" stroke-dasharray="4 3"/><path d="${path('b')}" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="5" fill="var(--ok)" class="ping"/><circle cx="${lx}" cy="${ly}" r="5" fill="var(--ok)"/>`:'')}
$('chartfig').addEventListener('pointermove',e=>{const f=$('chartfig');if(!G||!hist.length)return;const x=e.clientX-f.getBoundingClientRect().left;const i=Math.max(0,Math.min(hist.length-1,Math.round((x-G.pl)/(G.W-G.pl-G.pr)*(G.n-1))));const px=G.X(i);
  $('vline').style.left=px+'px';const tp=$('tip');tp.textContent=`Generasi ${i+1}: terbaik ${hist[i].b}, rata-rata ${hist[i].a.toFixed(2)}`;tp.style.left=Math.min(Math.max(px-tp.offsetWidth/2,0),G.W-tp.offsetWidth)+'px';f.classList.add('hov')});
$('chartfig').addEventListener('pointerleave',()=>$('chartfig').classList.remove('hov'));
function drawHeat(){const cv=$('heat'),W=cv.clientWidth,H=cv.clientHeight;if(!W)return;const dpr=window.devicePixelRatio||1;cv.width=W*dpr;cv.height=H*dpr;const x=cv.getContext('2d');x.scale(dpr,dpr);x.clearRect(0,0,W,H);
  const v=sorted(),n=v.length;if(!n)return;const L=T.length,cols=Math.ceil(Math.sqrt(n*W/H)),rows=Math.ceil(n/cols),cw=W/cols,ch=H/rows,e=Math.floor(cfg().eli*cfg().n);
  v.forEach((d,i)=>{const s=(L-d.f)/L;x.fillStyle=`hsl(${25+s*130} 70% ${48+(1-s)*8}%)`;const cx=(i%cols)*cw,cy=Math.floor(i/cols)*ch;x.fillRect(cx+.5,cy+.5,Math.max(cw-1,1),Math.max(ch-1,1));if(i<e&&cw>5){x.strokeStyle='rgba(0,0,0,.55)';x.strokeRect(cx+1,cy+1,cw-2,ch-2)}})}
function log(){const b=sorted()[0];logs.unshift(`Gen ${String(gen).padEnd(4)}| ${b.c.join('')} | fitness ${b.f}`);logs=logs.slice(0,12);$('log').innerHTML=logs.map(l=>`<li>${esc(l)}</li>`).join('')}
function record(){const fs=pop.map(p=>p.f);hist.push({b:Math.min(...fs),a:fs.reduce((s,v)=>s+v,0)/fs.length});evals+=pop.length}
function all(){renderBest();renderList();stats();drawChart();drawHeat()}
function btns(){const p=$('play');p.textContent=running?'Jeda':(done?'Ulangi':(pop.length?'Lanjutkan':'Mulai'));p.classList.toggle('on',running);$('step').disabled=busy||done;$('mate').disabled=busy||pick.length<2;
  $('mhint').textContent=pick.length===0?'Eksperimen: saat evolusi dijeda, klik 2 individu di daftar populasi untuk memilih induk sendiri.':pick.length===1?'Induk 1 dipilih. Klik satu individu lagi sebagai Induk 2.':'Dua induk siap. Tekan tombol untuk melihat anaknya (populasi tidak berubah).'}
function confetti(){if(RM)return;const cv=$('fx'),x=cv.getContext('2d'),W=cv.width=innerWidth,H=cv.height=innerHeight,cols=['#33d49b','#2f6fed','#ffb24d','#ff6b9a','#ffd45c'];
  const ps=Array.from({length:140},()=>({x:W/2,y:H*.3,vx:(Math.random()-.5)*14,vy:-Math.random()*12-4,r:Math.random()*6+3,c:cols[rnd(5)],a:Math.random()*6}));const t0=performance.now();
  const f=t=>{x.clearRect(0,0,W,H);ps.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.a+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore()});if(t-t0<2200)requestAnimationFrame(f);else x.clearRect(0,0,W,H)};requestAnimationFrame(f)}

async function init(){const val=$('target').value;const bad=[...new Set([...val].filter(ch=>!GENES.includes(ch)))];
  if(!val.length||bad.length){$('err').textContent=val.length?'Karakter tidak ada di daftar GENES: '+bad.join(' '):'Kata target tidak boleh kosong.';retrig($('target'),'shake');throw new Error('bad')}
  $('err').textContent='';T=val;gen=1;hist=[];evals=0;logs=[];done=false;stage=null;pick=[];mk={};$('stagecard').classList.remove('done');
  const c=cfg();pop=Array.from({length:c.n},()=>ind(Array.from(T,rg)));record();log();const d=D[speed()];
  setPhase(0,`<b>Populasi awal</b>: ${c.n} individu dibuat acak. Setiap individu adalah kromosom berisi ${T.length} gen (huruf) yang dipilih dari ${GENES.length} karakter yang valid.`,d.ph);renderStage();verdict();all();
  if(d.ph)await sleep(d.ph)}

async function animCross(d){const L=T.length,m=stage.m;
  for(let j=0;j<L;j++){stage.act=j;stage.filled=j;if(m.src[j]===3&&d.g>150){for(let k=0;k<4;k++){roll=rg();renderStage();await sleep(d.g/5)}roll=null}
    stage.filled=j+1;renderStage();await sleep(d.g)}
  stage.act=-1;renderStage();verdict();await sleep(d.ph*.7)}

async function generation(){const c=cfg(),d=D[speed()],L=T.length,anim=d.ph>0;
  pick=[];pop.sort((a,b)=>a.f-b.f);mk={};
  if(anim){setPhase(1,`<b>Evaluasi fitness</b>: setiap individu dinilai dengan menghitung berapa huruf yang belum cocok dengan target, lalu populasi diurutkan. Terbaik saat ini: <b>${pop[0].f}</b> huruf salah.`,d.ph);all();await sleep(d.ph)}
  if(pop[0].f===0){finish();return false}
  const s=Math.floor(c.eli*c.n),pool=Math.min(c.pool,pop.length);
  if(anim){mk={eli:s};setPhase(2,`<b>Elitism</b>: ${s} individu terbaik (${Math.round(c.eli*100)}%) disalin langsung ke generasi berikutnya tanpa diubah, supaya solusi terbaik tidak hilang.`,d.ph);renderList();await sleep(d.ph)}
  const i1=rnd(pool),i2=rnd(pool),a=pop[i1],b=pop[i2],m=mate(a,b,c.mut),lim=(1-c.mut)/2;
  stage={a,b,i1,i2,m,filled:anim?0:L,act:-1};
  if(anim){mk={eli:s,p1:a,p2:b};setPhase(3,`<b>Seleksi induk</b>: dua induk dipilih acak dari ${pool} individu teratas. Terpilih peringkat <b style="color:var(--p1)">#${i1+1}</b> dan <b style="color:var(--p2)">#${i2+1}</b>.`,d.ph);renderList();renderStage();verdict();await sleep(d.ph);
    setPhase(4,`<b>Crossover &amp; mutasi</b>: untuk tiap gen diambil angka acak r. Jika r &lt; ${lim.toFixed(2)} gen diambil dari <b style="color:var(--p1)">Induk 1</b>, jika r &lt; ${(1-c.mut).toFixed(2)} dari <b style="color:var(--p2)">Induk 2</b>, selebihnya <b style="color:var(--mu)">mutasi</b> (huruf acak baru).`,(d.g*1.25)*L+d.ph*.7);
    await animCross(d)}
  const kids=[m.child],nk=Math.max(c.n-s,1);for(let k=1;k<nk;k++)kids.push(mate(pop[rnd(pool)],pop[rnd(pool)],c.mut).child);
  pop=pop.slice(0,s).concat(kids);gen++;record();log();mk={};
  if(anim){setPhase(0,`<b>Generasi ${gen} terbentuk</b>: ${s} elit + ${nk} anak baru (anak di panggung adalah salah satunya; ${nk-1} lainnya dibuat dengan cara yang sama) = ${pop.length} individu.`,d.ph);all();await sleep(d.ph)}
  else{renderStage();verdict();all()}
  return true}

function finish(){done=true;running=false;mk={};setPhase(1,`<b>Selesai!</b> Kata "<b>${esc(T)}</b>" ditemukan pada generasi ke-<b>${gen}</b> setelah ${evals.toLocaleString('id-ID')} individu dievaluasi. Tekan <b>Ulangi</b> untuk mencoba lagi, atau ubah parameter lalu bandingkan jumlah generasinya.`);
  $('stagecard').classList.add('done');all();btns();$('bestcap').textContent=`Ditemukan pada generasi ke-${gen}`;
  [...$('best').children].forEach((t,j)=>{t.style.animationDelay=j*60+'ms';retrig(t,'wave')});confetti()}

async function run(){if(busy)return;if(done)reset();const my=token;busy=true;running=true;pick=[];btns();
  try{if(!pop.length)await init();while(running&&my===token){if(!(await generation()))break;if(speed()==='cepat')await sleep(25)}}catch(e){}
  if(my===token){busy=false;running=false;btns()}}
async function step(){if(busy||done)return;const my=token;busy=true;btns();
  try{if(!pop.length)await init();else await generation()}catch(e){}
  if(my===token){busy=false;btns()}}
async function manual(){if(busy||pick.length<2)return;const my=token;busy=true;btns();const c=cfg(),v=sorted(),[a,b]=pick,d=D[speed()==='cepat'?'sedang':speed()];
  stage={a,b,i1:v.indexOf(a),i2:v.indexOf(b),m:mate(a,b,c.mut),filled:0,act:-1};mk={p1:a,p2:b};
  setPhase(4,`<b>Eksperimen manual</b>: Anda memilih induk peringkat #${stage.i1+1} dan #${stage.i2+1}. Perhatikan bagaimana gen anak diundi satu per satu.`,(d.g*1.25)*T.length);renderList();
  try{await animCross(d)}catch(e){}
  if(my===token){busy=false;pick=[];btns()}}
function reset(){token++;running=false;busy=false;done=false;pop=[];gen=0;hist=[];evals=0;logs=[];stage=null;pick=[];mk={};roll=null;T=$('target').value||'GENETIKA';$('log').innerHTML='';$('stagecard').classList.remove('done');$('bestcap').textContent='Kromosom terbaik saat ini';
  setPhase(-1,'Tekan <b>Mulai</b> untuk menjalankan evolusi otomatis, atau <b>Langkah 1 generasi</b> untuk maju satu generasi. Klik label tahap di atas untuk membaca penjelasannya.');renderStage();verdict();all();btns()}

$('list').addEventListener('click',e=>{const r=e.target.closest('.row');if(!r||busy)return;const x=pop.find(p=>p.id==r.dataset.id);if(!x)return;
  const k=pick.indexOf(x);if(k>=0)pick.splice(k,1);else{if(pick.length===2)pick.shift();pick.push(x)}mk={p1:pick[0],p2:pick[1]};renderList();btns()});
$('f').addEventListener('submit',e=>{e.preventDefault();if(running){running=false;btns()}else run()});
$('step').addEventListener('click',step);$('reset').addEventListener('click',reset);$('mate').addEventListener('click',manual);
$('target').addEventListener('input',()=>{$('err').textContent='';if(!busy&&!pop.length)reset()});
document.addEventListener('keydown',e=>{if(window.GA_PAGE!=='kata')return;if(e.target.matches('input[type=text]')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key===' '){e.preventDefault();$('play').click()}else if(e.key==='ArrowRight'){e.preventDefault();step()}else if(e.key==='r'||e.key==='R')reset();
  else if('123'.includes(e.key)&&e.key.length===1){document.querySelectorAll('input[name=spd]')[+e.key-1].checked=true}});
const outs={n:v=>v,mut:v=>v+'%',eli:v=>v+'%',pool:v=>v};
const upd=k=>{const o=$(k+'O');o.textContent=outs[k]($(k).value);retrig(o,'bump');if(!busy)renderStage()};
for(const k in outs){$(k).addEventListener('input',()=>upd(k));$(k+'O').textContent=outs[k]($(k).value)}
$('presets').innerHTML=PRE.map((p,i)=>`<button type="button" data-i="${i}">${esc(p[0])}</button>`).join('');
$('presets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[+b.dataset.i][1];for(const k in p){$(k).value=p[k];upd(k)}});
const ro=new ResizeObserver(()=>{drawChart();drawHeat()});ro.observe($('chartfig'));ro.observe($('heatfig'));
const ro2=new ResizeObserver(()=>renderStage());ro2.observe($('stagewrap'));
$('info').addEventListener('click',()=>{$('info').hidden=true});
const TT={pChart:'Fitness per generasi',pLog:'Log generasi',pCode:'Hubungan dengan kode Python'};
document.querySelector('#page-kata .tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#page-kata .tabs button').forEach(x=>x.classList.toggle('on',x===b));for(const id in TT)$(id).hidden=id!==b.dataset.p;$('tabtitle').textContent=TT[b.dataset.p];retrig($(b.dataset.p),'in');if(b.dataset.p==='pChart')drawChart()});
reset();
}
