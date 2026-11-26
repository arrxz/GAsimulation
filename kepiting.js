{
const $=id=>document.getElementById(id);
const TAU=Math.PI*2,DEG=Math.PI/180,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd=k=>Math.floor(Math.random()*k),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v)};
const retrig=(el,c)=>{el.classList.remove(c);void el.offsetWidth;el.classList.add(c)};
const BW=1,BH=.38,L1=.55,L2=.75,DT=1/50,T=6;
const D={lambat:2500,sedang:900,cepat:60};
let nLeg=4,pop=[],gen=0,hist=[],running=false,busy=false,token=0,sel=null,main=null,minis=[],lastStats={};
const cfg=()=>({n:+$('kpN').value,pm:+$('kpPm').value/100,sg:+$('kpSg').value/100,e:+$('kpE').value});
const spd=()=>document.querySelector('input[name=kpspd]:checked').value;
const sleep=ms=>new Promise((res,rej)=>{const t=token;setTimeout(()=>t===token?res():rej(new Error('abort')),ms)});
const nGenes=()=>nLeg*2*6+1;

// ---------- model robot ----------
function decode(g){const legs=[];for(const s of [1,-1])for(let i=0;i<nLeg;i++){const b=((s===1?0:nLeg)+i)*6;
  legs.push({s,i,ho:-35+70*g[b],ha:32*g[b+1],hp:TAU*g[b+2],ko:30+90*g[b+3],ka:32*g[b+4],kp:TAU*g[b+5]})}
  return{legs,freq:.3+.9*g[g.length-1]}}
function fk(l,t,w){const a1=clamp(l.ho+l.ha*Math.sin(w*t+l.hp),-70,70)*DEG,a2=clamp(l.ko+l.ka*Math.sin(w*t+l.kp),10,160)*DEG,hx=l.s*BW/2,
  kx=hx+l.s*L1*Math.cos(a1),ky=L1*Math.sin(a1);return[hx,0,kx,ky,kx+l.s*L2*Math.cos(a1-a2),ky+L2*Math.sin(a1-a2)]}
const newSt=()=>({t:0,bx:0,by:null,phi:0,prev:null,pc:null,unst:0,drag:0,tilt:0,bob:0,feet:null,contact:[],stable:true,dragging:false});
const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
function stepSim(st,d){const w=TAU*d.freq,feet=d.legs.map(l=>fk(l,st.t,w));
  const pts=feet.map(f=>({x:f[4],y:f[5]})).sort((p,q)=>p.x-q.x),h=[];
  for(const p of pts){while(h.length>=2&&cross(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p)}
  let phi,by,drag=false,stable=false,e=-1;for(let k=0;k<h.length-1;k++)if(h[k].x<=0&&h[k+1].x>=0){e=k;break}
  if(e>=0){const A=h[e],B=h[e+1],m=(B.y-A.y)/((B.x-A.x)||1e-9),y0=A.y-m*A.x;phi=-Math.atan(m);by=-y0/Math.sqrt(1+m*m);stable=A.x<-.05&&B.x>.05;if(by<BH*.45){by=BH*.45;drag=true}}
  else{phi=pts[0].x>0?.35:-.35;by=BH*.45;drag=true}
  const c=Math.cos(phi),s=Math.sin(phi),contact=feet.map(f=>by+f[4]*s+f[5]*c<.03);
  if(st.prev){let sum=0,n=0;for(let i=0;i<feet.length;i++)if(contact[i]&&st.pc[i]){sum+=c*(feet[i][4]-st.prev[i][0])-s*(feet[i][5]-st.prev[i][1]);n++}if(n){let dx=-sum/n;if(drag)dx*=.3;st.bx+=dx}st.bob+=Math.abs(by-st.by)}
  if(!stable)st.unst+=DT;if(drag)st.drag+=DT;st.tilt+=Math.abs(phi)*DT;
  st.by=by;st.phi=phi;st.prev=feet.map(f=>[f[4],f[5]]);st.pc=contact;st.feet=feet;st.contact=contact;st.stable=stable;st.dragging=drag;st.t+=DT}
function evaluate(g){const d=decode(g),st=newSt();for(let k=0;k<T/DT;k++)stepSim(st,d);
  return{fit:st.bx-4*(st.unst/T)-3*(st.drag/T)-1.5*(st.tilt/T)-.2*st.bob,dx:st.bx,stab:1-st.unst/T,freq:d.freq}}

// ---------- GA ----------
function makeInd(g){return{g,r:evaluate(g)}}
function init(){const c=cfg();pop=Array.from({length:c.n},()=>makeInd(Array.from({length:nGenes()},Math.random)));pop.sort((a,b)=>b.r.fit-a.r.fit);gen=1;hist=[];record();sel=null}
function record(){const f=pop.map(p=>p.r.fit);hist.push({b:f[0],a:f.reduce((s,v)=>s+v,0)/f.length})}
function breed(){const c=cfg(),G=nGenes(),E=Math.min(c.e,pop.length),next=pop.slice(0,E);
  const tour=()=>{let b=null;for(let i=0;i<3;i++){const x=pop[rnd(pop.length)];if(!b||x.r.fit>b.r.fit)b=x}return b};
  while(next.length<c.n){const a=tour(),b=tour(),g=new Array(G);
    for(let s=0;s<(G-1)/3;s++){const src=Math.random()<.5?a.g:b.g;for(let j=0;j<3;j++)g[s*3+j]=src[s*3+j]}
    g[G-1]=(Math.random()<.5?a:b).g[G-1];
    for(let i=0;i<G;i++)if(Math.random()<c.pm){g[i]+=gauss()*c.sg;g[i]=(i<G-1&&i%3===2)?((g[i]%1)+1)%1:clamp(g[i],0,1)}
    next.push(makeInd(g))}
  pop=next.sort((a,b)=>b.r.fit-a.r.fit);gen++;record();sel=null}

// ---------- tampilan ----------
const view=ind=>({ind,d:decode(ind.g),st:newSt(),cam:0,acc:0});
function syncViews(){const target=sel||pop[0];if(!main||main.ind!==target){main=view(target);updCode();}
  for(let i=0;i<4;i++){const p=pop[i];if(!p){minis[i]=null;continue}if(!minis[i]||minis[i].ind!==p)minis[i]=view(p)}renderMinis()}
function renderMinis(){const box=$('kpMinis');if(box.children.length!==4)box.innerHTML=[0,1,2,3].map(i=>`<button type="button" class="mc" data-i="${i}" aria-label="Kandidat ${i+1}"><canvas></canvas><span></span></button>`).join('');
  [...box.children].forEach((b,i)=>{const p=pop[i];b.querySelector('span').textContent=p?`#${i+1} · ${p.r.dx.toFixed(2)}`:'';b.classList.toggle('on',!!p&&main&&main.ind===p)})}
$('kpMinis').addEventListener('click',e=>{const b=e.target.closest('.mc');if(!b)return;const p=pop[+b.dataset.i];if(!p)return;sel=p;syncViews();stats()});

function fit2(cv){const W=cv.clientWidth,H=cv.clientHeight,dpr=devicePixelRatio||1;if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);return[x,W,H]}
function advance(v,dt){v.acc=Math.min(v.acc+dt,.25);while(v.acc>=DT){stepSim(v.st,v.d);v.acc-=DT;if(v.st.t>=T){const c=v.cam-v.st.bx;v.st=newSt();v.cam=c}}v.cam+=(v.st.bx-v.cam)*Math.min(1,dt*6)}
function drawCrab(x,W,H,v,big){const st=v.st;if(!st.feet)return;const sc=big?Math.min(H/2.5,W/4.2):H/2.3,y0=H*(big?.8:.82),cam=v.cam,SX=wx=>W/2+(wx-cam)*sc,SY=wy=>y0-wy*sc;
  x.clearRect(0,0,W,H);const gr=x.createLinearGradient(0,y0,0,H);gr.addColorStop(0,'rgba(255,255,255,.07)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,y0,W,H-y0);
  x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=1.5;x.beginPath();x.moveTo(0,y0);x.lineTo(W,y0);x.stroke();
  const a=Math.floor(cam-W/2/sc)-1,b=Math.ceil(cam+W/2/sc)+1;x.font='12px Inter';x.textAlign='center';
  for(let k=a*2;k<=b*2;k++){const wx=k/2,px=SX(wx);x.strokeStyle='rgba(255,255,255,'+(k%2?.15:.3)+')';x.beginPath();x.moveTo(px,y0);x.lineTo(px,y0+(k%2?5:9));x.stroke();if(big&&!(k%2)){x.fillStyle='rgba(235,238,245,.45)';x.fillText(wx,px,y0+22)}}
  {const px=SX(0);x.setLineDash([5,4]);x.strokeStyle='rgba(48,209,88,.7)';x.beginPath();x.moveTo(px,y0-sc*1.6);x.lineTo(px,y0);x.stroke();x.setLineDash([]);if(big){x.fillStyle='rgba(48,209,88,.85)';x.fillText('start',px,y0-sc*1.6-6)}}
  const bx=st.bx,by=st.by;x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(SX(bx),y0+2,sc*.62,sc*.06,0,0,TAU);x.fill();
  x.save();x.translate(SX(bx),SY(by));x.rotate(-st.phi);
  const n=nLeg,legs=v.d.legs,drawLeg=(idx)=>{const l=legs[idx],f=st.feet[idx],z=n>1?l.i/(n-1):0,oy=z*.07,ox=-l.s*z*.05,
      c1=[255-z*90,138-z*70,92-z*55],col=`rgb(${c1.map(Math.round)})`,P=(px,py)=>[(px+ox)*sc,-(py+oy)*sc],h=P(f[0],f[1]),k=P(f[2],f[3]),ft=P(f[4],f[5]);
    x.lineCap='round';x.strokeStyle=col;x.lineWidth=sc*(.075-z*.015);x.beginPath();x.moveTo(h[0],h[1]);x.lineTo(k[0],k[1]);x.stroke();x.lineWidth=sc*(.06-z*.012);x.beginPath();x.moveTo(k[0],k[1]);x.lineTo(ft[0],ft[1]);x.stroke();
    const jr=Math.max(2.2,sc*.042);for(const p of [h,k]){x.beginPath();x.arc(p[0],p[1],jr,0,TAU);x.fillStyle='#262a33';x.fill();x.lineWidth=Math.max(1.2,sc*.014);x.strokeStyle='#5fb0ff';x.stroke()}
    x.beginPath();x.arc(ft[0],ft[1],Math.max(2,sc*.03),0,TAU);x.fillStyle=st.contact[idx]?'#30d158':'rgba(255,255,255,.55)';x.fill()};
  const order=legs.map((l,i)=>i).sort((p,q)=>legs[q].i-legs[p].i);
  order.filter(i=>legs[i].i>=n/2).forEach(drawLeg);
  const cx=0,cy=0,rx=sc*.6,ry=sc*BH*.56,bob=Math.sin(st.t*TAU*v.d.freq)*sc*.01;
  x.strokeStyle='#e0552a';x.lineWidth=sc*.07;x.lineCap='round';
  for(const s of [-1,1]){const ax=cx+s*rx*.45,ay=cy-ry*.5,ex=cx+s*rx*1.05,ey=cy-ry*1.9+bob;x.beginPath();x.moveTo(ax,ay);x.quadraticCurveTo(cx+s*rx*1.1,cy-ry*.6,ex,ey);x.stroke();
    x.save();x.translate(ex,ey);x.rotate(s*-.5);x.fillStyle='#ef6233';x.beginPath();x.ellipse(0,-sc*.08,sc*.11,sc*.16,0,0,TAU);x.fill();x.strokeStyle='rgba(20,22,27,.75)';x.lineWidth=Math.max(1.5,sc*.02);x.beginPath();x.moveTo(0,-sc*.22);x.lineTo(0,-sc*.06);x.stroke();x.restore()}
  x.strokeStyle='#c9481f';x.lineWidth=Math.max(2,sc*.025);for(const s of [-1,1]){x.beginPath();x.moveTo(cx+s*sc*.12,cy-ry*.8);x.lineTo(cx+s*sc*.16,cy-ry*1.55);x.stroke();x.beginPath();x.arc(cx+s*sc*.16,cy-ry*1.6,Math.max(2.5,sc*.045),0,TAU);x.fillStyle='#14161b';x.fill();x.beginPath();x.arc(cx+s*sc*.16-sc*.012,cy-ry*1.6-sc*.014,Math.max(1,sc*.013),0,TAU);x.fillStyle='#fff';x.fill()}
  const g=x.createRadialGradient(cx-rx*.25,cy-ry*.5,rx*.1,cx,cy,rx*1.05);g.addColorStop(0,'#ff8d57');g.addColorStop(.6,'#d84a20');g.addColorStop(1,'#8c2a10');
  x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,TAU);x.fillStyle=g;x.fill();
  if(!st.stable){x.save();x.shadowColor='rgba(255,55,95,.9)';x.shadowBlur=14;x.lineWidth=3;x.strokeStyle='rgba(255,55,95,.95)';x.stroke();x.restore()}
  x.fillStyle='rgba(255,220,190,.18)';x.beginPath();x.ellipse(cx-rx*.2,cy-ry*.35,rx*.45,ry*.25,-.15,0,TAU);x.fill();
  x.fillStyle='rgba(120,30,10,.35)';for(const[px,py,r] of [[-.3,.1,.05],[.25,-.05,.04],[.05,.25,.035],[.38,.2,.03]]){x.beginPath();x.arc(cx+px*rx,cy+py*ry,r*sc,0,TAU);x.fill()}
  order.filter(i=>legs[i].i<n/2).forEach(drawLeg);x.restore()}
let hudT=0;
function frame(now){requestAnimationFrame(frame);if(window.GA_PAGE!=='kepiting'||!main)return;const dt=RM?DT:Math.min((now-(frame.l||now))/1000,.1);frame.l=now;
  advance(main,dt);{const[x,W,H]=fit2($('kpSim'));if(W)drawCrab(x,W,H,main,true)}
  document.querySelectorAll('#kpMinis .mc canvas').forEach((cv,i)=>{const v=minis[i];if(!v)return;advance(v,dt);const[x,W,H]=fit2(cv);if(W)drawCrab(x,W,H,v,false)});
  if(!$('kpPServo').hidden)drawServo();
  if(now-hudT>120){hudT=now;const r=pop.indexOf(main.ind)+1,st=main.st;$('kpHud').innerHTML=`<b>Individu #${r||'–'}</b> · generasi ${gen}<br>t ${st.t.toFixed(1)} s dari ${T} s · jarak <b>${st.bx.toFixed(2)}</b> lebar badan`;
    const h2=st.dragging?'<span class="badge bad">badan terseret</span>':st.stable?'<span class="badge">stabil</span>':'<span class="badge bad">tidak stabil</span>';if($('kpHud2').dataset.v!==h2){$('kpHud2').innerHTML=h2;$('kpHud2').dataset.v=h2}}}

function drawServo(){const[x,W,H]=fit2($('kpServo'));if(!W||!main)return;x.clearRect(0,0,W,H);const legs=main.d.legs,rows=legs.length*2,rh=H/rows,lw=86,f=main.d.freq,ph=((main.st.t*f)%1);
  x.font='12px Inter';x.textBaseline='middle';
  legs.forEach((l,li)=>{[['pangkal',l.ho,l.ha,l.hp,-70,70,'#5fb0ff'],['lutut',l.ko,l.ka,l.kp,10,160,'#ff9f0a']].forEach((sv,si)=>{const r=li*2+si,y=r*rh;
    if(r%2===0){x.fillStyle='rgba(255,255,255,.035)';x.fillRect(0,y,W,rh*2)}
    x.fillStyle='rgba(235,238,245,.66)';x.textAlign='left';x.fillText(`${l.s>0?'Ka':'Ki'}${l.i+1} ${sv[0]}`,4,y+rh/2);
    x.strokeStyle=sv[6];x.lineWidth=1.8;x.beginPath();for(let k=0;k<=80;k++){const p=k/80,a=clamp(sv[1]+sv[2]*Math.sin(TAU*p+sv[3]),sv[4],sv[5]),nv=clamp((a-sv[1]+34)/68,0,1),px=lw+p*(W-lw-6),py=y+rh-2-nv*(rh-4);k?x.lineTo(px,py):x.moveTo(px,py)}x.stroke()})});
  const cx=lw+ph*(W-lw-6);x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=1.5;x.beginPath();x.moveTo(cx,0);x.lineTo(cx,H);x.stroke()}

let CG=null;
function drawChart(){const s=$('kpChart'),W=s.clientWidth,H=s.clientHeight;if(!W)return;const n=Math.max(hist.length,10),pl=34,pr=10,pt=10,pb=24;
  let lo=Math.min(0,...hist.map(h=>h.a)),hi=Math.max(1,...hist.map(h=>h.b));lo=Math.floor(lo);hi=Math.ceil(hi);
  const Xc=i=>pl+(W-pl-pr)*i/(n-1),Y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo||1));CG={Xc,pl,pr,W,n};
  const path=k=>hist.map((h,i)=>(i?'L':'M')+Xc(i).toFixed(1)+' '+Y(h[k]).toFixed(1)).join('');
  const tv=[lo,(lo+hi)/2,hi].map(v=>+v.toFixed(1));const L=hist.length-1;
  s.innerHTML=tv.map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${Y(v)+4}" text-anchor="end" font-size="12" fill="var(--dim)">${v}</text>`).join('')+`<text x="${W-pr}" y="${H-6}" text-anchor="end" font-size="12" fill="var(--dim)">generasi 1–${hist.length}</text>`+(hist.length?`<path d="${path('a')}" fill="none" stroke="var(--mut)" stroke-width="2" stroke-dasharray="4 3"/><path d="${path('b')}" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linejoin="round"/><circle cx="${Xc(L)}" cy="${Y(hist[L].b)}" r="5" fill="var(--ok)" class="ping"/><circle cx="${Xc(L)}" cy="${Y(hist[L].b)}" r="4.5" fill="var(--ok)"/>`:'')}
$('kpChartFig').addEventListener('pointermove',e=>{const f=$('kpChartFig');if(!CG||!hist.length)return;const x=e.clientX-f.getBoundingClientRect().left,i=clamp(Math.round((x-CG.pl)/(CG.W-CG.pl-CG.pr)*(CG.n-1)),0,hist.length-1),px=CG.Xc(i),t=$('kpT');
  $('kpV').style.left=px+'px';t.textContent=`Gen ${i+1}: terbaik ${hist[i].b.toFixed(2)}, rata-rata ${hist[i].a.toFixed(2)}`;t.style.left=clamp(px-t.offsetWidth/2,0,CG.W-t.offsetWidth)+'px';f.classList.add('hov')});
$('kpChartFig').addEventListener('pointerleave',()=>$('kpChartFig').classList.remove('hov'));

function updCode(){if(!main)return;const ind=main.ind,r=pop.indexOf(ind)+1,legs=main.d.legs,O=[],A=[],P=[],names=[];
  for(const l of legs){const R=l.s>0;names.push(`${R?'Ka':'Ki'}${l.i+1} pangkal`,`${R?'Ka':'Ki'}${l.i+1} lutut`);
    O.push(R?90+l.ho:90-l.ho,R?l.ko:180-l.ko);A.push(l.ha,l.ka);P.push(R?l.hp:l.hp+Math.PI,R?l.kp:l.kp+Math.PI)}
  const f1=a=>a.map(v=>v.toFixed(1)).join(', '),f3=a=>a.map(v=>(v%TAU).toFixed(3)).join(', ');
  $('kpCode').textContent=`// Gaya jalan hasil evolusi GA: generasi ${gen}, individu #${r}
// Simulasi: jarak ${ind.r.dx.toFixed(2)} lebar badan dalam ${T} s, stabil ${Math.round(ind.r.stab*100)}%
// Kanal PCA9685: ${names.map((s,i)=>i+'='+s).join(', ')}
// Ka = kaki kanan, Ki = kaki kiri (servo kiri dipasang cermin).
// Model simulasi 2D sederhana: kalibrasi posisi netral dan arah tiap servo di robot nyata.
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();
const int N = ${legs.length*2};
const float FREQ = ${main.d.freq.toFixed(3)};  // Hz, kecepatan ayunan
const float OFFSET[N] = {${f1(O)}};  // derajat
const float AMP[N]    = {${f1(A)}};  // derajat
const float PHASE[N]  = {${f3(P)}};  // radian
const int SERVO_MIN = 110, SERVO_MAX = 510;  // pulsa untuk 0 dan 180 derajat

void setup() {
  pwm.begin();
  pwm.setPWMFreq(50);
}

void loop() {
  float t = millis() / 1000.0;
  for (int i = 0; i < N; i++) {
    float a = OFFSET[i] + AMP[i] * sin(2 * PI * FREQ * t + PHASE[i]);
    a = constrain(a, 0, 180);
    pwm.setPWM(i, 0, map((int)a, 0, 180, SERVO_MIN, SERVO_MAX));
  }
  delay(10);
}`}
$('kpCopy').addEventListener('click',async()=>{const b=$('kpCopy');try{await navigator.clipboard.writeText($('kpCode').textContent);b.textContent='Tersalin'}catch(e){const r=document.createRange();r.selectNodeContents($('kpCode'));const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Teks dipilih, tekan Ctrl+C'}setTimeout(()=>b.textContent='Salin kode',1800)});

function setStat(id,val){const el=$(id);if(el.textContent!==String(val)){el.textContent=val;if(lastStats[id]!==undefined&&!RM&&spd()!=='cepat')retrig(el.closest('.stat'),'bump');lastStats[id]=val}}
function stats(){const b=main?main.ind:pop[0],avg=pop.reduce((s,p)=>s+p.r.dx,0)/pop.length;
  setStat('kpGen',gen);$('kpGenS').textContent=`${pop.length} individu × ${nGenes()} gen`;
  setStat('kpDist',b.r.dx.toFixed(2));$('kpDistS').textContent=`lebar badan / ${T} s · rata-rata populasi ${avg.toFixed(2)}`;
  setStat('kpStab',Math.round(b.r.stab*100)+'%');setStat('kpFreq',b.r.freq.toFixed(2)+' Hz');
  const r=pop.indexOf(b)+1;$('kpTitle').textContent=`Simulasi individu #${r} · generasi ${gen}`;drawChart();renderMinis()}
function ui(){syncViews();stats();updCode()}
function btn(){const p=$('kpPlay');p.textContent=running?'Jeda':(gen>1?'Lanjutkan':'Mulai evolusi');p.classList.toggle('on',running);$('kpStep').disabled=busy}
async function run(){if(busy)return;const my=token;busy=true;running=true;btn();
  try{while(running&&my===token){breed();ui();await sleep(D[spd()])}}catch(e){}
  if(my===token){busy=false;running=false;btn()}}
function reset(){token++;running=false;busy=false;nLeg=+$('kpLegs').value;main=null;minis=[];init();ui();btn()}
$('kpPlay').addEventListener('click',()=>{if(running){running=false;btn()}else run()});
$('kpStep').addEventListener('click',()=>{if(busy)return;breed();ui();btn()});
$('kpReset').addEventListener('click',reset);$('kpLegs').addEventListener('change',reset);
document.querySelector('#kpTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const TT={kpPChart:'Fitness per generasi',kpPServo:'Gerak servo (1 siklus)',kpPCode:'Ekspor ke Arduino'};
  document.querySelectorAll('#kpTabs button').forEach(x=>x.classList.toggle('on',x===b));for(const id in TT)$(id).hidden=id!==b.dataset.p;$('kpTabT').textContent=TT[b.dataset.p];retrig($(b.dataset.p),'in');if(b.dataset.p==='kpPChart')drawChart()});
document.addEventListener('keydown',e=>{if(window.GA_PAGE!=='kepiting'||e.target.matches('input[type=text],select')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key===' '){e.preventDefault();$('kpPlay').click()}else if(e.key==='ArrowRight'){e.preventDefault();$('kpStep').click()}else if(e.key==='r'||e.key==='R')reset()});
const outs={kpN:v=>v,kpPm:v=>v+'%',kpSg:v=>v+'%',kpE:v=>v};
const upd=k=>{const o=$(k+'O');o.textContent=outs[k]($(k).value);retrig(o,'bump')};
for(const k in outs){$(k).addEventListener('input',()=>upd(k));$(k+'O').textContent=outs[k]($(k).value)}
const PRE=[['Standar',{kpN:40,kpPm:12,kpSg:10,kpE:2}],['Tanpa mutasi',{kpN:40,kpPm:0,kpSg:10,kpE:2}],['Mutasi besar',{kpN:40,kpPm:45,kpSg:30,kpE:2}],['Populasi besar',{kpN:120,kpPm:12,kpSg:10,kpE:4}],['Tanpa elit',{kpN:40,kpPm:12,kpSg:10,kpE:0}]];
$('kpPre').innerHTML=PRE.map((p,i)=>`<button type="button" data-i="${i}">${p[0]}</button>`).join('');
$('kpPre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[+b.dataset.i][1];for(const k in p){$(k).value=p[k];upd(k)}});
new ResizeObserver(()=>drawChart()).observe($('kpChartFig'));
reset();requestAnimationFrame(frame);
}
