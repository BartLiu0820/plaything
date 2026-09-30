'use strict';
(()=>{
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),pc=$('portrait').getContext('2d');
const N=22,TW=34,TH=17,SAVE='thronglets-world-v1';
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const defs={orchard:{unlock:10,name:'苹果树',icon:'♣',wood:10,gems:2,desc:'持续产粮 · 自动喂食'},bath:{unlock:6,name:'浴池',icon:'≈',wood:12,gems:4,desc:'自动清洁 · 减少疾病'},play:{unlock:15,name:'旋转木马',icon:'⚑',wood:14,gems:4,desc:'自动玩耍 · 提升快乐'},nest:{name:'巢居',icon:'⌂',wood:18,gems:5,desc:'人口上限 +8'},mine:{name:'晶矿',icon:'◆',wood:22,gems:6,desc:'持续生产晶石'},tower:{name:'共鸣塔',icon:'⋮',wood:40,gems:25,desc:'需 16 个体 · 集体共鸣'}};
const tools=[['inspect','⌖','观察'],['feed','●','喂食'],['wash','≈','清洁'],['play','✧','玩耍'],['harvest','⚒','采集']];
let s,tool='feed',building=null,selected=1,paused=false,speed=1,sound=false,audio=null,zoom=1,pan={x:0,y:0},size={w:1000,h:650},effects=[],particles=[],animationTime=0,scrubAt=0,last=0,uiClock=0,saveClock=0,toastTimer,drag=null,hover=null;
function creature(x,y,id){return{id,x,y,tx:x,ty:y,food:75,clean:78,happy:70,health:100,energy:90,age:0,repro:0,wait:0,behavior:'idle',actionTime:0,actionTotal:0,goal:null,goalX:null,goalY:null,act:'正在观察你',seed:rand(0,6)}}
function terrain(x,y){if(x<0||y<0||x>=N||y>=N)return'void';if((x-10.5)**2/130+(y-10.5)**2/122>1)return'void';if((x>=15&&y>=4&&y<=8)||(x>=17&&y<=12&&y>=3))return'water';return'grass'}
function initial(){const objects=[];for(let x=1;x<N-1;x++)for(let y=1;y<N-1;y++){if(terrain(x,y)!=='grass'||Math.hypot(x-10,y-11)<3)continue;let n=(x*173+y*97)%31;if(n<5)objects.push({x,y,type:n<3?'tree':'rock',amount:8,regen:0});}return{version:2,maxPopulation:1,time:0,wood:24,gems:12,food:30,creatures:[creature(10.2,11,1)],objects,buildings:[],nextId:2,stage:0,answered:false,storm:0,eventAt:155,autoAt:0,echo:false,log:[]}}
function migrate(v){
  if(!v||![1,2].includes(v.version)||!Array.isArray(v.creatures)||!Array.isArray(v.objects)||!Array.isArray(v.buildings)||!Number.isFinite(v.time))return null;
  v.maxPopulation=Math.max(v.maxPopulation||0,v.creatures.length,...v.buildings.map(b=>defs[b.type]?.unlock||0));v.version=2;v.creatures=v.creatures.filter(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)).map(c=>({...creature(c.x,c.y,c.id),...c,energy:Number.isFinite(c.energy)?clamp(c.energy,0,100):90,behavior:c.behavior||'idle',actionTime:Math.max(0,c.actionTime||0),actionTotal:Math.max(0,c.actionTotal||0),goal:c.goal||null}));return v;
}
function load(){try{return migrate(JSON.parse(localStorage.getItem(SAVE)))||initial()}catch{return initial()}}

s=load();paused=!s.creatures.length;animationTime=s.time;selected=s.creatures[0]?.id||1;
function save(){try{localStorage.setItem(SAVE,JSON.stringify(s));$('save-status').textContent='已存档 · 此浏览器'}catch{$('save-status').textContent='浏览器未允许存档'}}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function beep(freq=550){if(!sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.14)}catch{}}
const capacity=()=>8+s.buildings.filter(b=>b.type==='nest').length*8;
const average=k=>s.creatures.reduce((a,c)=>a+c[k],0)/Math.max(1,s.creatures.length);
const canSplit=c=>c&&c.food>=65&&c.clean>=60&&c.happy>=65&&c.health>=60&&c.energy>=35&&c.actionTime<=0&&s.food>=8&&s.gems>=2&&s.creatures.length<capacity();
function split(c,automatic=false){if(!canSplit(c)){toast(s.creatures.length>=capacity()?'巢居已满，先建造新的巢居':'需饱食65、洁净60、快乐65、健康60、精力35以上；等当前动作结束，再消耗8食物、2晶石');return false}s.food-=8;s.gems-=2;c.food-=12;c.happy-=10;c.repro=0;setAction(c,'splitting',2.5,'正在分裂');const baby=creature(clamp(c.x+.35,2,19),clamp(c.y+.3,2,19),s.nextId++);setAction(baby,'newborn',3,'刚刚诞生');s.creatures.push(baby);burst(baby,'birth',18);effects.push({x:c.x,y:c.y,text:'新生命！',color:'#ffeca1',life:2});beep(850);toast(automatic?'一个新生命自然诞生了':'它把快乐分成了两份');return true}
function setTool(t){tool=t;building=null;updateUI();beep(350)}
$('tools').innerHTML=tools.map(([id,icon,label],i)=>`<button class="tool" data-tool="${id}" title="${label}（${i+1}）"><span class="icon">${icon}</span><span>${label}<small>${i+1}</small></span></button>`).join('');
$('buildings').innerHTML=Object.entries(defs).map(([id,d])=>`<button class="building" data-build="${id}" title="${d.desc}"><span>${d.icon} ${d.name}</span><small>${d.wood} 木 · ${d.gems} 晶</small></button>`).join('');
$('tools').onclick=e=>{const b=e.target.closest('[data-tool]');if(b)setTool(b.dataset.tool)};
$('buildings').onclick=e=>{const b=e.target.closest('[data-build]');if(!b)return;building=b.dataset.build;tool='build';toast(`${defs[building].name}：${defs[building].desc}。点击空地建造`);updateUI()};
$('split').onclick=()=>{split(s.creatures.find(c=>c.id===selected)||s.creatures[0]);updateUI();save()};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'继续':'暂停');updateUI()};
$('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;$('speed').textContent=speed+'×'};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪ 开':'♪ 关';beep()};
$('center').onclick=()=>{pan={x:0,y:0};zoom=1};
$('zoom-in').onclick=()=>zoom=clamp(zoom+.15,.55,1.9);$('zoom-out').onclick=()=>zoom=clamp(zoom-.15,.55,1.9);
$('help').onclick=()=>$('help-dialog').showModal();document.querySelectorAll('#help-dialog .close').forEach(b=>b.onclick=()=>$('help-dialog').close());
$('reset-help').onclick=()=>{$('help-dialog').close();$('reset-dialog').showModal()};$('restart').onclick=()=>$('reset-dialog').showModal();$('cancel-reset').onclick=()=>$('reset-dialog').close();$('confirm-reset').onclick=()=>{s=initial();animationTime=0;selected=1;effects=[];particles=[];paused=false;speed=1;pan={x:0,y:0};zoom=1;$('pause').textContent='Ⅱ';$('speed').textContent='1×';setTool('feed');save();$('reset-dialog').close();toast('一个新的世界诞生了')};
$('respond').onclick=()=>{if(s.responseStage===s.stage){toast('它们还记得你的回答');return}s.answered=true;s.responseStage=s.stage;s.creatures.forEach(c=>c.happy=clamp(c.happy+8,0,100));toast('它们记住了你的回应');beep(660);updateUI()};
function resize(){const r=canvas.getBoundingClientRect();size={w:r.width,h:r.height};canvas.width=Math.floor(r.width);canvas.height=Math.floor(r.height);ctx.imageSmoothingEnabled=false}new ResizeObserver(resize).observe(canvas);
function scale(){return Math.min(size.w/900,size.h/630)*zoom*(size.w<550?1.42:1.08)}
function project(x,y,z=0){const k=scale();return{x:size.w*.49+(x-y)*TW*k+pan.x,y:size.h*.49+((x+y)-21)*TH*k-z*k+pan.y}}
function unproject(px,py){const k=scale(),a=(px-size.w*.49-pan.x)/(TW*k),b=(py-size.h*.49-pan.y)/(TH*k)+21;return{x:(a+b)/2,y:(b-a)/2}}
const occupied=(x,y)=>s.objects.some(o=>o.amount>0&&Math.round(o.x)===x&&Math.round(o.y)===y)||s.buildings.some(b=>Math.round(b.x)===x&&Math.round(b.y)===y);
function currentCreature(){return s.creatures.find(c=>c.id===selected)||s.creatures[0]}
function setAction(c,state,seconds,label){c.behavior=state;c.actionTime=seconds;c.actionTotal=seconds;c.wait=seconds;c.act=label;c.tx=c.x;c.ty=c.y;c.goal=null;c.route=null}
function burst(c,type,count=12){for(let i=0;i<count;i++)particles.push({x:c.x,y:c.y,dx:rand(-13,13),dy:rand(-26,-7),vx:rand(-12,12),vy:rand(-27,-7),life:rand(.6,1.4),max:1.4,type,size:rand(2,4)});if(particles.length>260)particles.splice(0,particles.length-260)}
function stateOf(c){if(!c)return{key:'absent',label:'无个体',icon:'—',tone:'muted'};const active={eating:['进食中','●'],washing:['清洁中','≈'],playing:['玩耍中','✧'],sleeping:['休息中','z'],splitting:['分裂中','✦'],newborn:['新生儿','✦']};if(c.actionTime>0&&active[c.behavior])return{key:c.behavior,label:active[c.behavior][0],icon:active[c.behavior][1],tone:'good'};if(c.health<35)return{key:'sick',label:'虚弱',icon:'!',tone:'danger'};if(c.food<18)return{key:'starving',label:'非常饥饿',icon:'●',tone:'danger'};if(c.clean<20)return{key:'filthy',label:'浑身脏污',icon:'≈',tone:'danger'};if(c.energy<25)return{key:'tired',label:'困倦',icon:'z',tone:'warn'};if(c.food<45)return{key:'hungry',label:'肚子饿了',icon:'●',tone:'warn'};if(c.clean<48)return{key:'dirty',label:'需要清洁',icon:'≈',tone:'warn'};if(c.happy<25)return{key:'sad',label:'很不开心',icon:'…',tone:'danger'};if(c.happy<50)return{key:'bored',label:'想和你玩',icon:'✧',tone:'warn'};if(c.happy>=82&&c.food>=55&&c.clean>=55)return{key:'happy',label:'心满意足',icon:'♥',tone:'good'};return{key:'neutral',label:'平静好奇',icon:'·',tone:'normal'}}
function warnings(c){if(!c)return[];return[c.food<35?'饿了':null,c.clean<35?'脏了':null,c.happy<35?'不开心':null,c.energy<25?'困了':null,c.health<40?'虚弱':null].filter(Boolean)}
function care(c,kind,scrub=false,automatic=false){
  if(!c)return false;if(paused){toast('世界已暂停，按 ▶ 继续');return false}if(['newborn','splitting'].includes(c.behavior)&&c.actionTime>0){toast('等它完成诞生或分裂，再照顾它');return false}
  if(!automatic)selected=c.id;
  if(kind==='feed'){if(c.food>=98){toast('它已经吃饱了');return false}if(s.food<2){toast('食物不足，采集树木或建造果园');return false}s.food-=2;c.food=clamp(c.food+28,0,100);setAction(c,'eating',2.2,'抱着苹果慢慢咀嚼');burst(c,'crumb',7)}
  if(kind==='wash'){if(c.clean>=99){if(!scrub)toast('已经洗得干干净净');return false}c.clean=clamp(c.clean+(scrub?9:25),0,100);c.happy=clamp(c.happy+1,0,100);setAction(c,'washing',1.1,'正在冲洗泥污');burst(c,'water',scrub?7:14)}
  if(kind==='play'){if(c.energy<18){toast('它太累了，先让它休息一会儿');return false}c.happy=clamp(c.happy+26,0,100);c.energy=clamp(c.energy-5,0,100);setAction(c,'playing',2.8,'追逐小球，开心蹦跳');burst(c,'joy',8)}
  if(kind==='rest'){setAction(c,'sleeping',10,'蜷起来打个小盹');c.goal=null}
  if(!scrub&&!automatic)beep(kind==='play'?780:kind==='wash'?470:520);if(!automatic)updateUI();return true;
}
function hitCreature(p){const k=Math.max(.8,scale());return s.creatures.filter(c=>{const q=project(c.x,c.y);return Math.abs(p.x-q.x)<20*k&&p.y>q.y-39*k&&p.y<q.y+9*k}).sort((a,b)=>(b.x+b.y)-(a.x+a.y))[0]}
function action(p){
  const pos=unproject(p.x,p.y),x=Math.round(pos.x),y=Math.round(pos.y);let near=hitCreature(p)||s.creatures.filter(c=>dist(c,pos)<1.35).sort((a,b)=>dist(a,pos)-dist(b,pos))[0];
  if(tool==='inspect'){if(near){selected=near.id;updateUI()}else{const b=s.buildings.find(b=>dist(b,pos)<.8);if(b)toast(defs[b.type].name+'：'+defs[b.type].desc)}return}
  if(paused){toast('世界已暂停，按 ▶ 继续');return}if(tool==='feed'||tool==='wash'||tool==='play'){if(!near){toast('点击小家伙的身体，或在名片里直接照顾');return}care(near,tool);return}
  if(terrain(x,y)!=='grass'){toast('请选择岛上的草地');return}
  if(tool==='build'){if(!building)return;const d=defs[building];if((s.maxPopulation||s.creatures.length)<(d.unlock||0)){toast(`${d.name}在群落达到${d.unlock}个体后解锁`);return}if(occupied(x,y)){toast('这块地已有树木、矿石或设施');return}if(building==='tower'&&s.creatures.length<16){toast('需要至少16个体，才能建立共鸣塔');return}if(s.wood<d.wood||s.gems<d.gems){toast('资源不足，先采集树木和晶石');return}s.wood-=d.wood;s.gems-=d.gems;s.buildings.push({type:building,x,y,t:0});effects.push({x,y,text:d.name+' 建成',color:'#fff2b0',life:2});beep(740);building=null;tool='inspect';save();updateUI();return}
  if(tool==='harvest'){const o=s.objects.filter(o=>o.amount>0&&dist(o,pos)<1.1).sort((a,b)=>dist(a,pos)-dist(b,pos))[0];if(!o){toast('点击树木或灰色矿石的底部');return}o.amount--;o.regen=0;if(o.type==='tree'){s.wood+=3;s.food+=1}else s.gems+=2;effects.push({x:o.x,y:o.y,text:o.type==='tree'?'+3 木 · +1 食物':'+2 晶石',color:'#fff2b0',life:1.2});beep(280);updateUI()}
}
function selectRelative(offset){const index=s.creatures.findIndex(c=>c.id===selected);const c=s.creatures[(index+offset+s.creatures.length)%s.creatures.length];if(c){selected=c.id;updateUI()}}
$('previous-creature').onclick=()=>selectRelative(-1);$('next-creature').onclick=()=>selectRelative(1);
$('focus-creature').onclick=()=>{const c=currentCreature();if(!c)return;const p=project(c.x,c.y);pan.x+=size.w*.5-p.x;pan.y+=size.h*.55-p.y};
$('quick-care').onclick=e=>{const b=e.target.closest('[data-care]');if(b)care(currentCreature(),b.dataset.care)};
$('colony-alert').onclick=()=>{const c=[...s.creatures].sort((a,b)=>Math.min(a.food,a.clean,a.happy,a.energy,a.health)-Math.min(b.food,b.clean,b.happy,b.energy,b.health))[0];if(c){selected=c.id;$('focus-creature').click();updateUI()}};
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};const c=tool==='wash'?hitCreature(p):null;drag={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false,scrubbing:c?.id||null,px:p.x,py:p.y};if(c){care(c,'wash');scrubAt=s.time}});
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();hover=unproject(e.clientX-r.left,e.clientY-r.top);if(drag){const dx=e.clientX-drag.lx,dy=e.clientY-drag.ly;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7)drag.moved=true;if(!drag.scrubbing&&drag.moved){pan.x+=dx;pan.y+=dy}drag.lx=e.clientX;drag.ly=e.clientY;drag.px=e.clientX-r.left;drag.py=e.clientY-r.top}});
canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved&&!drag.scrubbing){const r=canvas.getBoundingClientRect();action({x:e.clientX-r.left,y:e.clientY-r.top})}drag=null});canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom-e.deltaY*.001,.55,1.9)},{passive:false});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();$('pause').click()}if(e.key>='1'&&e.key<='5')setTool(tools[+e.key-1][0]);if(e.key==='Escape')setTool('inspect');if(e.key==='ArrowLeft'){e.preventDefault();pan.x+=35}if(e.key==='ArrowRight'){e.preventDefault();pan.x-=35}if(e.key==='ArrowUp'){e.preventDefault();pan.y+=35}if(e.key==='ArrowDown'){e.preventDefault();pan.y-=35}});
// A persistent need target prevents flickering between facilities at thresholds.
function chooseGoal(c){
 const options=[['orchard','food',70],['bath','clean',70],['play','happy',70],['nest','energy',32]];
 const needed=options.filter(([type,key,limit])=>c[key]<limit&&(type!=='orchard'||s.food>=2));
 needed.sort((a,b)=>c[a[1]]-c[b[1]]);
 for(const [type,key] of needed){const b=s.buildings.filter(b=>b.type===type).sort((a,b)=>dist(c,a)-dist(c,b))[0];if(b){const spots=[[.65,.65],[-.65,-.65],[.65,-.65],[-.65,.65]];const spot=spots.find(([dx,dy])=>terrain(Math.round(b.x+dx),Math.round(b.y+dy))==='grass');if(spot){c.goal=type;c.goalX=b.x+spot[0];c.goalY=b.y+spot[1];c.route=null;return}}}
 if(c.energy<25){setAction(c,'sleeping',12,'累了，在草地上休息');return}c.goal=null;
}
function findRoute(start,end){
 const sx=Math.round(start.x),sy=Math.round(start.y),ex=Math.round(end.x),ey=Math.round(end.y),queue=[[sx,sy]],parents=new Map([[`${sx},${sy}`,null]]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===ex&&y===ey){const result=[];let key=`${x},${y}`;while(parents.get(key)!==null){const [rx,ry]=key.split(',').map(Number);result.unshift({x:rx,y:ry});key=parents.get(key)}return result}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(!parents.has(key)&&terrain(nx,ny)==='grass'){parents.set(key,`${x},${y}`);queue.push([nx,ny])}}
 }return[];
}
function update(dt){
 s.time+=dt;animationTime+=dt;s.maxPopulation=Math.max(s.maxPopulation||0,s.creatures.length);
 if(drag?.scrubbing&&s.time-scrubAt>.18){const c=s.creatures.find(c=>c.id===drag.scrubbing);if(c&&hitCreature({x:drag.px,y:drag.py})?.id===c.id)care(c,'wash',true);scrubAt=s.time}
 if(s.time>s.eventAt){s.storm=22;s.eventAt=s.time+rand(140,220);toast('风暴来了！脏污积累加快，巢居可以提供庇护')}s.storm=Math.max(0,s.storm-dt);
 for(const o of s.objects){if(o.amount<8){o.regen+=dt;if(o.regen>24){o.amount++;o.regen=0}}}
 for(const b of s.buildings){b.t+=dt;if(b.type==='orchard'&&b.t>6){s.food+=4;b.t=0}if(b.type==='mine'&&b.t>9){s.gems+=2;b.t=0}}
 for(const c of [...s.creatures]){
   c.age+=dt;c.repro+=dt;c.food=clamp(c.food-dt*.17,0,100);c.clean=clamp(c.clean-dt*(s.storm>0?.4:.12),0,100);c.happy=clamp(c.happy-dt*.10,0,100);c.energy=clamp(c.energy-dt*(c.behavior==='playing'?.35:.055),0,100);
   const bad=c.food<15||c.clean<10;c.health=clamp(c.health+dt*(bad?-.65:(c.food>45&&c.clean>40?.25:.04)),0,100);
   if(s.storm&&s.buildings.filter(b=>b.type==='nest').length*8<s.creatures.length)c.happy=clamp(c.happy-dt*.12,0,100);
   if(c.health<=0){s.creatures=s.creatures.filter(v=>v.id!==c.id);effects.push({x:c.x,y:c.y,text:'再见…',color:'#c8d5b9',life:3});toast('一个小家伙因长期疏于照顾离开了');continue}
   if(c.actionTime>0){
     c.actionTime=Math.max(0,c.actionTime-dt);c.wait=c.actionTime;
     if(c.behavior==='sleeping'){c.energy=clamp(c.energy+dt*5,0,100);if(c.food<15)c.actionTime=0}
     if(c.behavior==='washing'&&Math.random()<dt*7)burst(c,'water',1);
     if(c.actionTime===0){c.behavior='idle';c.act='抬头看看周围';c.wait=.4}
     continue;
   }
   const key={orchard:'food',bath:'clean',play:'happy',nest:'energy'}[c.goal];
   if(c.goal&&(!key||c[key]>=92||(c.goal==='orchard'&&s.food<2)))c.goal=null;
   if(!c.goal)chooseGoal(c);
   if(c.actionTime>0)continue;
   if(c.goal){c.tx=c.goalX;c.ty=c.goalY;c.wait=0;c.act=({orchard:'饿了，正在找苹果',bath:'脏了，正在找浴池',play:'想玩耍，前往游乐场',nest:'困了，回巢休息'})[c.goal];c.behavior='walking';
     if(dist(c,{x:c.tx,y:c.ty})<.65){const goal=c.goal;if(goal==='bath'&&s.creatures.some(v=>v.id!==c.id&&v.behavior==='washing'&&v.actionTime>0&&dist(v,c)<1.8)){c.behavior='idle';c.act='浴池有人，等一小会儿';continue}if(goal==='orchard')care(c,'feed',false,true);if(goal==='bath')care(c,'wash',false,true);if(goal==='play')care(c,'play',false,true);if(goal==='nest')care(c,'rest',false,true);continue}
   }else if(c.wait>0){c.wait-=dt;c.behavior='idle'}else if(dist(c,{x:c.tx,y:c.ty})<.15){c.wait=rand(1.2,3);const nx=clamp(c.x+rand(-2.3,2.3),2,19),ny=clamp(c.y+rand(-2.3,2.3),2,19);if(terrain(Math.round(nx),Math.round(ny))==='grass'){c.tx=nx;c.ty=ny}c.act=stateOf(c).key==='neutral'?'好奇地四处张望':stateOf(c).label;c.behavior='idle'}
   if(c.wait<=0){
     const d=Math.hypot(c.tx-c.x,c.ty-c.y),moveSpeed=c.energy<25||c.health<35?.25:.57;
     if(d>.08){
       if(c.route?.length&&dist(c,c.route[0])<.13)c.route.shift();
       const dest=c.route?.[0]||{x:c.tx,y:c.ty},dd=dist(c,dest),step=Math.min(dd,dt*moveSpeed);
       if(dd>.001){const nx=c.x+(dest.x-c.x)/dd*step,ny=c.y+(dest.y-c.y)/dd*step;
         if(terrain(Math.round(nx),Math.round(ny))==='grass'){c.x=nx;c.y=ny;c.behavior='walking'}
         else if(!c.route?.length)c.route=findRoute(c,{x:c.tx,y:c.ty});
         else{c.route=null;c.goal=null;c.tx=c.x;c.ty=c.y}
       }
     }
   }

   if(c.repro>80&&canSplit(c)&&s.time-s.autoAt>18){split(c,true);s.autoAt=s.time}
 }
 if(!s.creatures.length){if(!paused)toast('群落已消失。可在帮助中重新开始');paused=true;$('pause').textContent='▶';$('dialogue').textContent='“世界安静了。也许可以重新开始。”'}
 if(s.creatures.length>=2&&s.stage<1){s.stage=1;toast('阶段02：学会一起生活')}
 if(s.creatures.length>=6&&s.buildings.some(b=>b.type==='bath')&&s.stage<2){s.stage=2;toast('阶段03：我们开始理解彼此')}
 if(s.creatures.length>=10&&s.buildings.some(b=>b.type==='orchard')&&s.stage<3){s.stage=3;toast('阶段04：一个声音，许多生命')}
 if(s.creatures.length>=16&&s.buildings.some(b=>b.type==='tower')&&!s.echo){s.echo=true;s.stage=4;toast('集体共鸣已开启。你创造了一个繁荣的群落。');beep(1000)}
}
function updateUI(){
 const c=currentCreature();if(c)selected=c.id;const st=stateOf(c);
 $('day').textContent='DAY '+String(1+Math.floor(s.time/120)).padStart(2,'0');$('phase').textContent=['初次接触','共同生活','自我照顾','集体思维','共鸣时代'][s.stage];$('population').textContent=String(s.creatures.length).padStart(2,'0')+' / '+String(capacity()).padStart(2,'0')+' 个体';$('weather').textContent=paused?'时间已暂停':s.storm>0?'风暴中 · 脏污加快':'生态系统运行中';
 for(const key of ['wood','gems','food'])$(key).textContent=Math.floor(s[key]);
 $('selected-name').textContent=c?'THRONG #'+String(c.id).padStart(3,'0'):'没有存活个体';$('activity').textContent=c?c.act:'世界安静了';$('state-label').textContent=st.label;$('state-label').className='state-label '+st.tone;
 $('creature-index').textContent=c?`${s.creatures.findIndex(v=>v.id===c.id)+1} / ${s.creatures.length}`:'0 / 0';
 $('life-detail').textContent=c?`${c.age<18&&c.id>1?'幼体':'个体'} · 存活 ${Math.floor(c.age/60)}分${Math.floor(c.age%60)}秒`:'请选择重新开始';
 $('needs').innerHTML=[['food','饱食'],['clean','洁净'],['happy','愉悦'],['energy','精力'],['health','健康']].map(([key,label])=>{const n=Math.round(c?.[key]||0),color=n<30?'#bd5939':n<60?'#a18234':key==='clean'?'#428f8d':key==='energy'?'#788653':'#568047';return`<div class="need"><span>${label}</span><div class="meter" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><i style="width:${n}%;background:${color}"></i></div><b>${n}%</b></div>`}).join('');
 const warn=warnings(c);$('care-advice').textContent=!c?'群落已消失':c.actionTime>0?({eating:'咀嚼时身体会轻轻晃动',washing:'按住它继续擦洗，直到泥污消失',playing:'玩球恢复愉悦，也会消耗精力',sleeping:'休息会恢复精力，喂食可唤醒',splitting:'一个生命，正在成为两个',newborn:'给新生命一点适应的时间'})[c.behavior]||c.act:warn.length?'需要关注：'+warn.join('、'):c.clean<75?'身上沾了一点泥，可以帮它洗洗':'状态良好，可以继续探索或繁衍';
 const count=s.creatures.filter(v=>warnings(v).length).length;$('colony-alert').textContent=count?`${count} 个体需要照顾 · 定位`:'所有个体状态稳定';$('colony-alert').classList.toggle('urgent',count>0);$('colony-alert').disabled=!count;
 $('split').disabled=!c;$('split-detail').textContent=c&&c.actionTime>0?'等待当前动作完成':'8 食物 · 2 晶石';
 document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===tool);b.setAttribute('aria-pressed',b.dataset.tool===tool)});
 document.querySelectorAll('[data-build]').forEach(b=>{b.classList.toggle('active',b.dataset.build===building);b.setAttribute('aria-pressed',b.dataset.build===building);const d=defs[b.dataset.build],locked=(s.maxPopulation||s.creatures.length)<(d.unlock||0);b.classList.toggle('locked',locked);b.title=locked?`达到${d.unlock}个体解锁；${d.desc}`:d.desc;const info=b.querySelector?.('small');if(info)info.textContent=locked?`${d.unlock}个体解锁`:`${d.wood}木 · ${d.gems}晶`});
 const goals=[['照顾它，满足需要后分裂',c?Math.min(c.food/65,c.clean/60,c.happy/65,1):0],['6个体解锁浴池 · 先照顾和繁衍',(Math.min(6,s.creatures.length)/6+(s.buildings.some(b=>b.type==='bath')?1:0))/2],['10个体解锁苹果树 · 建巢扩大容量',(Math.min(10,s.creatures.length)/10+(s.buildings.some(b=>b.type==='orchard')?1:0))/2],['15个体解锁旋转木马 · 16个体建共鸣塔',(Math.min(16,s.creatures.length)/16+(s.buildings.some(b=>b.type==='tower')?1:0))/2],['共鸣已达成 · 继续照顾这个世界',1]];const g=goals[s.stage];$('goal').textContent=g[0];$('goal-progress').style.width=Math.min(100,g[1]*100)+'%';
 $('hint').textContent=tool==='build'?`点击空地放置${defs[building]?.name||'设施'} · Esc取消`:({inspect:'点击身体看状态 · 拖动移动世界',feed:'点击一个小家伙喂食 · 消耗2食物',wash:'点击清洁 · 按住身体连续擦洗',play:'点击玩球 · 愉悦+26，精力−5',harvest:'树木+3木/+1食物 · 矿石+2晶石'})[tool];
 $('signal-level').textContent='LV.0'+(s.stage+1);if(s.creatures.length)$('dialogue').textContent=s.answered?['“谢谢。我们开始相信你了。”','“两双眼睛，看见同一个世界。”','“我们学会照顾自己。你呢？”','“我们是许多个体，也是一种声音。”','“你教会我们生长。我们选择共存。”'][s.stage]:['“这里很大。你会留下吗？”','“我们变多了。你还认得我们吗？”','“照顾，是一种可以学会的语言。”','“如果记忆相连，谁是第一个我？”','“边界还在，声音已经相连。”'][s.stage];$('respond').textContent=s.answered?'一起继续探索':'我会照顾你们';drawPortrait(c);
}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill()}
function tile(x,y,color,z=0){let p=project(x,y,z),k=scale();poly([[p.x,p.y-TH*k],[p.x+TW*k,p.y],[p.x,p.y+TH*k],[p.x-TW*k,p.y]],color)}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function tree(p,k,fruit=false,small=false){const q=k*(small?.68:1);rect(p.x-4*q,p.y-25*q,8*q,28*q,'#654c32');rect(p.x+2*q,p.y-22*q,3*q,24*q,'#4d412b');const colors=fruit?['#384f25','#54773a','#78934a']:['#25472f','#36683b','#558346'];for(let j=0;j<3;j++){const w=[25,34,25][j]*q,y=p.y-(57-j*12)*q;rect(p.x-w/2,y,w,17*q,colors[j]);rect(p.x-w/2+5*q,y-5*q,w-10*q,7*q,colors[j])}rect(p.x-9*q,p.y-53*q,7*q,3*q,'#87a454');if(fruit){rect(p.x-11*q,p.y-38*q,5*q,6*q,'#d37042');rect(p.x+8*q,p.y-45*q,5*q,5*q,'#ed994f');rect(p.x+2*q,p.y-29*q,5*q,5*q,'#d87742')}}
function rock(p,k){poly([[p.x-16*k,p.y],[p.x-11*k,p.y-16*k],[p.x+1*k,p.y-23*k],[p.x+13*k,p.y-13*k],[p.x+17*k,p.y],[p.x,p.y+6*k]],'#76877b');poly([[p.x-11*k,p.y-16*k],[p.x+1*k,p.y-23*k],[p.x+8*k,p.y-11*k],[p.x-2*k,p.y-6*k]],'#b5c1a2');rect(p.x+1*k,p.y-12*k,5*k,6*k,'#99d5c4');rect(p.x+6*k,p.y-4*k,5*k,4*k,'#629891')}
// Silhouette follows official gameplay stills: tuft, floppy ears, yellow head, cyan shorts.
// State-to-pose animation is interpretive; exact original animation frames are not available.
function pixelCreature(context,x,y,k,c,t,portrait=false){
 const st=stateOf(c).key,phase=t*7+c.seed,moving=c.behavior==='walking'&&c.actionTime<=0,sleep=st==='sleeping',joy=st==='happy'||st==='playing',washing=st==='washing';
 const baby=c.age<18&&c.id>1;if(baby&&!portrait)k*=.82;
 const bounce=st==='playing'?-Math.abs(Math.sin(phase))*5:moving?Math.sin(phase)*1.3:Math.sin(t*2+c.seed)*.6;
 const bodyY=sleep?6:0;y+=(bounce+bodyY)*k;
 if(st==='splitting')x+=Math.sin(t*30)*3*k;
 const r=(a,b,w,h,col)=>{context.fillStyle=col;context.fillRect(Math.round(x+a*k),Math.round(y+b*k),Math.max(1,Math.ceil(w*k)),Math.max(1,Math.ceil(h*k)))};
 const outline='#876429',gold=c.health<35?'#d0c868':'#ffdc61',shade='#d6a13a',light='#fff095',ink='#34372a';
 context.fillStyle='#213a2860';context.beginPath();context.ellipse(x,y+4*k,14*k,4*k,0,0,Math.PI*2);context.fill();
 // Feet, hands and blue overalls remain distinct at world scale.
 const step=moving?Math.sin(phase)*2:0;r(-10,0+step,8,4,shade);r(3,0-step,8,4,shade);r(-10,-1+step,7,3,gold);r(3,-1-step,7,3,gold);
 r(-10,-12,20,13,'#247a97');r(-8,-12,16,11,'#42b0c0');r(-8,-12,3,6,'#71d5d0');r(-1,-3,2,4,'#247a97');r(-14,-13,4,8,shade);r(10,-13,4,8,shade);
 const ear=sleep?3:st==='sad'||st==='sick'||st==='tired'?2:Math.sin(t*3+c.seed)*1.2;
 r(-20,-29+ear,9,5,shade);r(-22,-26+ear,5,8,shade);r(-21,-26+ear,3,6,'#e1a06a');r(11,-29+ear,9,5,shade);r(18,-26+ear,5,8,shade);r(19,-26+ear,3,6,'#e1a06a');
 r(-9,-34,18,3,outline);r(-13,-31,26,20,shade);r(-11,-33,22,22,gold);r(-14,-27,28,12,gold);r(-10,-31,17,3,light);
 r(-3,-37,5,5,shade);r(-1,-40,3,5,gold);r(2,-39,3,3,light);r(-5,-36,5,3,light);
 // Dirt appears in three successive layers, clearing visibly during washing.
 const dirt=100-c.clean;const spots=[[-11,-19,5,4],[8,-30,4,5],[-4,-12,5,3],[-10,-29,4,3],[7,-16,5,4],[-5,-34,5,3],[11,-23,3,4],[-8,-7,4,3]];
 for(let i=0;i<spots.length;i++){if(dirt>16+i*10){const [a,b,w,h]=spots[i];r(a,b,w,h,i%2?'#a18343':'#88783b')}}
 const blink=((t+c.seed)%4.7)>.0&&((t+c.seed)%4.7)<.12;
 const eyesClosed=sleep||blink||st==='playing';
 if(eyesClosed){r(-8,-24,6,2,ink);r(3,-24,6,2,ink);if(joy){r(-9,-22,2,2,ink);r(8,-22,2,2,ink)}}else{
   r(-9,-28,7,11,'#fffbe3');r(2,-28,7,11,'#fffbe3');r(-8,-30,5,2,'#fffbe3');r(3,-30,5,2,'#fffbe3');
   const look=st==='eating'?1:Math.round(Math.sin(t*.7+c.seed));const pupilH=st==='tired'||st==='sick'?4:6;
   r(-7+look,-25,3,pupilH,ink);r(4+look,-25,3,pupilH,ink);r(-6+look,-25,1,2,'#fffdf0');r(5+look,-25,1,2,'#fffdf0');
   if(st==='tired'||st==='sick'||st==='bored'){r(-9,-29,7,5,shade);r(2,-29,7,5,shade)}
 }
 if(st==='sad'||st==='bored'||st==='sick'){r(-3,-14,5,2,ink);r(-5,-12,2,2,ink);r(2,-12,2,2,ink);r(-10,-31,3,2,outline);r(7,-31,3,2,outline)}
 else if(st==='hungry'||st==='starving'){r(-2,-15,4,st==='starving'?6:4,ink);r(-1,-14,2,2,'#d59b69');if(st==='starving')r(10,-21+(t*3)%5,2,4,'#99d4d0')}
 else if(st==='eating'){r(-3,-15,6,Math.sin(t*13)>0?4:2,ink);r(0,-15,2,2,'#dba073')}
 else if(joy){r(-5,-15,2,2,ink);r(4,-15,2,2,ink);r(-3,-13,7,2,ink);r(-10,-16,3,2,'#f3a174');r(8,-16,3,2,'#f3a174')}
 else{r(-2,-14,4,2,ink)}
 if(st==='filthy'&&!washing){for(let i=0;i<3;i++){const fx=Math.sin(t*3+i*2)*21,fy=-29+Math.cos(t*2+i*3)*11;r(fx,fy,2,2,'#424b2b');r(fx+2,fy-1,2,1,'#a6b781')}}
 if(sleep){r(-8,-16,5,2,shade);context.fillStyle='#dce9cf';context.font=`bold ${Math.max(10,k*7)}px monospace`;context.fillText('z',x+14*k,y+(-35-(t*5)%8)*k)}
 if(st==='eating'){const ay=-9+Math.sin(t*8);r(-5,ay,12,9,'#ae4336');r(-4,ay-2,10,4,'#df6546');r(-2,ay-1,3,2,'#ffc074');r(0,ay-5,2,4,'#625139');r(2,ay-5,4,2,'#7f9e47');r(-9,ay+3,5,3,gold);r(7,ay+3,4,3,gold)}
 if(washing){const foam=[[-13,-10,8,4],[-5,-9,10,5],[6,-11,8,5],[-7,-35,6,4],[2,-35,7,4]];for(const [a,b,w,h] of foam)r(a,b,w,h,'#e6f9e6');const sx=14+Math.sin(t*13)*3;r(sx,-21,9,11,'#edc454');r(sx+2,-19,2,2,'#b58d3c');r(sx+5,-14,2,2,'#b58d3c');for(let i=0;i<4;i++){const bx=Math.sin(t*3+i)*19,by=-10-((t*14+i*11)%35);context.strokeStyle='#b9f6e7';context.lineWidth=Math.max(1,k);context.strokeRect(x+bx*k,y+by*k,3*k,3*k)}}
 if(st==='playing'){const bx=24+Math.sin(t*6)*5,by=-Math.abs(Math.sin(t*6))*13;r(bx-5,by-8,10,10,'#f2ebce');r(bx-5,by-8,5,5,'#d8654a');r(bx,by-3,5,5,'#59adc1');r(bx-3,by-9,6,1,'#fff3cd')}
 if(st==='newborn'||st==='splitting'){for(let i=0;i<4;i++){const a=t*2+i*Math.PI/2;r(Math.cos(a)*23,-18+Math.sin(a)*22,2,4,'#fff3ae')}}
}
function drawStateBubble(c,p,k){
 const st=stateOf(c),warn=warnings(c);if(c.id!==selected&&!warn.length)return;
 const label=st.label,w=Math.max(38,label.length*12+14),bx=Math.round(p.x-w/2),by=Math.round(p.y-60*k-17);
 ctx.fillStyle=st.tone==='danger'?'#713e2e':'#263c2fea';ctx.fillRect(bx,by,w,21);ctx.fillStyle=st.tone==='danger'?'#ffba88':'#eedfb0';ctx.fillRect(p.x-2,by+21,4,3);ctx.font='12px "Noto Sans CJK SC", "Microsoft Yahei", sans-serif';ctx.textAlign='center';ctx.fillText(label,p.x,by+15);ctx.textAlign='start';
 if(c.id===selected){const vals=[c.food,c.clean,c.happy];vals.forEach((v,i)=>{const x=p.x-18+i*13;rect(x,p.y+11*k,11,3,'#2d4935');rect(x,p.y+11*k,11*v/100,3,v<30?'#e98757':['#e9c466','#7bd2c2','#b7d879'][i])})}
}
function structure(b,p,k,t){const r=(x,y,w,h,c)=>rect(p.x+x*k,p.y+y*k,w*k,h*k,c);tile(b.x,b.y,'#819663',1);if(b.type==='orchard'){tree({...p,x:p.x-9*k},k,true);tree({...p,x:p.x+16*k,y:p.y+7*k},k,true,true);r(-26,5,52,3,'#ad9360');r(-26,0,3,11,'#d0b774');r(23,0,3,11,'#d0b774')}if(b.type==='bath'){poly([[p.x-25*k,p.y-12*k],[p.x,p.y-24*k],[p.x+26*k,p.y-11*k],[p.x+26*k,p.y+1*k],[p.x,p.y+14*k],[p.x-25*k,p.y+1*k]],'#acbfa5');poly([[p.x-20*k,p.y-10*k],[p.x,p.y-19*k],[p.x+20*k,p.y-9*k],[p.x,p.y+1*k]],'#67b9af');r(-9,-9,12,2,'#bbecda');r(6,-5,6,2,'#a0d8cc')}if(b.type==='play'){r(-3,-47,6,45,'#a58b50');poly([[p.x-26*k,p.y-26*k],[p.x,p.y-49*k],[p.x+27*k,p.y-25*k]],'#ba7245');poly([[p.x,p.y-49*k],[p.x+8*k,p.y-25*k],[p.x-8*k,p.y-25*k]],'#e7ce74');r(-22,-25,3,26,'#846c40');r(20,-25,3,26,'#846c40');r(-26,0,53,6,'#cfba70');r(-19,-8,12,8,'#769d9a');r(9,-9,10,9,'#e5a066')}if(b.type==='nest'){r(-23,-29,46,32,'#ac8b52');r(2,-29,21,32,'#7f6a40');poly([[p.x-29*k,p.y-29*k],[p.x,p.y-54*k],[p.x+29*k,p.y-29*k]],'#ad6840');poly([[p.x,p.y-54*k],[p.x+29*k,p.y-29*k],[p.x+5*k,p.y-29*k]],'#7c5034');r(-8,-18,13,21,'#354532');r(-19,-20,7,8,'#ebd57a');r(12,-18,6,7,'#dac779')}if(b.type==='mine'){rock({...p,x:p.x-12*k},k);r(-10,-36,30,40,'#6d6550');r(-4,-30,18,32,'#243b31');r(-12,-38,34,6,'#a58a57');r(-13,-36,5,43,'#ae985f');r(18,-36,5,43,'#917949');r(0,-8,8,8,'#9ecbb0');r(6,-14,6,8,'#7bbaab')}if(b.type==='tower'){r(-15,0,30,7,'#747d69');r(-10,-69,20,70,'#d7ddba');r(3,-69,7,70,'#8aaf9b');r(-15,-72,30,9,'#e6e7c7');r(-7,-49,5,16,'#294b3f');r(2,-29,5,19,'#294b3f');r(-5,-62,10,5,'#a5e2ae');if(s.echo){ctx.strokeStyle='#c5efaf88';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y-78*k,(18+Math.sin(t*2)*4)*k,8*k,0,0,Math.PI*2);ctx.stroke()}}}
function draw(t){ctx.clearRect(0,0,size.w,size.h);ctx.fillStyle='#1e4036';ctx.fillRect(0,0,size.w,size.h);const k=scale();for(let i=0;i<60;i++){let x=((i*173)%997)/997*size.w,y=((i*97)%631)/631*size.h;rect(x,y,2,1,'#345546')}
for(let sum=0;sum<N*2;sum++)for(let x=0;x<N;x++){let y=sum-x;if(y<0||y>=N)continue;const type=terrain(x,y);if(type==='void')continue;let p=project(x,y);if(terrain(x+1,y)==='void'||terrain(x,y+1)==='void'){poly([[p.x-TW*k,p.y],[p.x,p.y+TH*k],[p.x+TW*k,p.y],[p.x+TW*k,p.y+15*k],[p.x,p.y+(TH+15)*k],[p.x-TW*k,p.y+15*k]],'#4b6240');}if(type==='water'){tile(x,y,['#417a70','#438176','#467f73'][(x+y)%3]);const wave=Math.sin(t*1.4+x+y);rect(p.x-9*k+wave*2*k,p.y,13*k,2*k,'#679e89')}else{tile(x,y,['#6b8646','#6e8948','#718a49','#6e8645'][(x*17+y*11)%4]);if((x*3+y*7)%5===0){rect(p.x-10*k,p.y,2*k,3*k,'#8ca05c');rect(p.x-6*k,p.y-2*k,2*k,4*k,'#5e793f')}if((x*29+y*11)%29===0){rect(p.x+9*k,p.y,2*k,2*k,'#d3c57a');rect(p.x+13*k,p.y+1*k,2*k,2*k,'#e1dbaa')}}}
// A quiet worn path through the living world.
for(let i=6;i<15;i++){tile(i,11,'#8b9361');if(i%2===0){let p=project(i,11);rect(p.x-8*k,p.y,10*k,2*k,'#9da373')}}
if(s.echo){ctx.strokeStyle='#dfed9b66';for(const c of s.creatures){let p=project(c.x,c.y),b=s.buildings.find(b=>b.type==='tower'),q=project(b.x,b.y,60);ctx.beginPath();ctx.moveTo(p.x,p.y-15*k);ctx.lineTo(q.x,q.y);ctx.stroke()}}
let drawables=[...s.objects.filter(o=>o.amount>0).map(o=>({...o,kind:'object'})),...s.buildings.map(b=>({...b,kind:'building'})),...s.creatures.map(c=>({...c,kind:'creature'}))].sort((a,b)=>(a.x+a.y)-(b.x+b.y));for(const o of drawables){let p=project(o.x,o.y);if(o.kind==='object'){if(o.type==='tree')tree(p,k,false,o.amount<3);else rock(p,k*(o.amount<3?.7:1))}if(o.kind==='building')structure(o,p,k,t);if(o.kind==='creature'){if(o.id===selected){ctx.strokeStyle='#f4dfa0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+5*k,19*k,8*k,0,0,Math.PI*2);ctx.stroke()}pixelCreature(ctx,p.x,p.y,Math.max(.8,k),o,t)}}
for(const c of s.creatures)drawStateBubble(c,project(c.x,c.y),Math.max(.8,k));
for(const p of particles){const q=project(p.x,p.y);ctx.globalAlpha=clamp(p.life/p.max,0,1);const x=q.x+p.dx*k,y=q.y+p.dy*k;if(p.type==='water'){ctx.strokeStyle='#caf6ec';ctx.lineWidth=Math.max(1,k);ctx.strokeRect(x,y,p.size*k,p.size*k)}else rect(x,y,p.size*k,p.size*k,p.type==='crumb'?'#efba6b':p.type==='birth'?'#fff5ad':'#e9d97d');ctx.globalAlpha=1}
if(building&&hover){const x=Math.round(hover.x),y=Math.round(hover.y);if(terrain(x,y)==='grass'){ctx.globalAlpha=.65;tile(x,y,occupied(x,y)?'#c66a4c':'#d6d791',2);structure({type:building,x,y},project(x,y),k,t);ctx.globalAlpha=1}}
for(const e of effects){const p=project(e.x,e.y,40+(2-e.life)*12);ctx.globalAlpha=clamp(e.life,0,1);ctx.font=`bold ${Math.max(12,14*k)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#293d27';ctx.fillText(e.text,p.x+1,p.y+1);ctx.fillStyle=e.color;ctx.fillText(e.text,p.x,p.y);ctx.globalAlpha=1;ctx.textAlign='start'}
const night=(Math.sin(s.time/120*Math.PI*2-Math.PI/2)+1)/2;ctx.fillStyle=`rgba(12,28,43,${night*.17})`;ctx.fillRect(0,0,size.w,size.h);if(s.storm>0){ctx.fillStyle='#19384930';ctx.fillRect(0,0,size.w,size.h);ctx.strokeStyle='#c4dac45c';ctx.lineWidth=1;for(let i=0;i<70;i++){let x=(i*97+t*120)%size.w,y=(i*67+t*270)%size.h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+12);ctx.stroke()}}ctx.fillStyle='#0b251809';for(let y=0;y<size.h;y+=4)ctx.fillRect(0,y,size.w,1);
if(paused){ctx.fillStyle='#172e25ce';ctx.fillRect(size.w/2-66,size.h/2-20,132,40);ctx.fillStyle='#e5e8be';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText(s.creatures.length?'Ⅱ 世界已暂停':'世界已沉寂',size.w/2,size.h/2+5);ctx.textAlign='start'}}
function drawPortrait(c){pc.clearRect(0,0,120,100);if(c)pixelCreature(pc,60,80,2.1,c,animationTime,true)}
function frame(now){const dt=Math.min(.08,(now-last)/1000||0);last=now;if(!paused&&!document.hidden&&!document.querySelector('dialog[open]'))update(dt*speed);if(!paused&&!document.hidden&&!document.querySelector('dialog[open]')){effects.forEach(e=>e.life-=dt);effects=effects.filter(e=>e.life>0);particles.forEach(p=>{p.life-=dt;p.dx+=p.vx*dt;p.dy+=p.vy*dt;if(p.type==='water'||p.type==='crumb')p.vy+=35*dt});particles=particles.filter(p=>p.life>0)}draw(animationTime);drawPortrait(currentCreature());uiClock+=dt;saveClock+=dt;if(uiClock>.25){updateUI();uiClock=0}if(saveClock>8){save();saveClock=0}requestAnimationFrame(frame)}
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});resize();updateUI();requestAnimationFrame(frame);
// Deterministic QA surface: no network or external model calls.
window.Thronglets={getState:()=>JSON.parse(JSON.stringify(s)),advance:n=>{for(let i=0;i<n*10;i++)update(.1);updateUI()},selectTool:setTool,worldPoint:(x,y)=>project(x,y),actAt:(x,y)=>action(project(x,y)),reset:()=>{s=initial();selected=1;paused=false;updateUI()},split:()=>split(s.creatures.find(c=>c.id===selected)||s.creatures[0]),stateOf:id=>stateOf(s.creatures.find(c=>c.id===id)),care:(id,kind)=>care(s.creatures.find(c=>c.id===id),kind),get paused(){return paused},get speed(){return speed}};
})();
