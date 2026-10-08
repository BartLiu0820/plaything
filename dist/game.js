'use strict';
(()=>{
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),pc=$('portrait').getContext('2d'),bc=$('badge-art').getContext('2d');
const ANIMATION={hatch:{fall:8/30,glow:12/30,flash:14/30,crack:24/30,emerge:27/30,hop:33/30,end:47/30,hopDx:85.3,hopDy:-35.2},feed:32/30,wash:40/30,play:69/30};
const PLAY_ROOT=[[24,0.0,0.0],[25,6.224,3.776],[26,8.0,5.776],[29,13.332,11.332],[32,18.556,17.112],[35,23.776,22.888],[37,23.776,22.888],[40,32.776,18.888],[43,41.556,14.668],[46,45.444,13.112]];
function playOffset(t){const f=Math.floor(t*30+.0001);if(f<PLAY_ROOT[0][0])return[0,0];for(let i=1;i<PLAY_ROOT.length;i++){const a=PLAY_ROOT[i-1],b=PLAY_ROOT[i];if(f<=b[0]){const p=(f-a[0])/(b[0]-a[0]);return[a[1]+(b[1]-a[1])*p,a[2]+(b[2]-a[2])*p]}}return PLAY_ROOT.at(-1).slice(1)}
const WASH_PATH=[[0.16,-3.16],[0.16,-3.16],[0.12,-3.16],[0.2,-3.24],[2.4,-21.96],[7.72,-34.52],[-3.68,-30.32],[-11.08,-27.52],[-13.0,-26.8],[-2.96,-32.12],[2.32,-35.28],[4.4,-36.24],[-2.96,-22.2],[-5.0,-10.28],[-3.08,-5.96],[0.24,-3.36],[0.24,-3.4],[0.2,-3.36],[0.2,-3.36],[-2.6,-18.92],[-3.0,-27.76],[3.32,-30.76],[7.04,-33.2],[8.4,-33.92],[-4.68,-34.72],[-13.44,-35.0],[-16.28,-35.32],[-6.56,-28.52],[-0.08,-18.4],[1.08,-10.12],[0.24,-3.32],[0.2,-3.28],[0.2,-3.28],[0.2,-3.28],[-0.12,-5.68],[-0.6,-7.6],[4.16,-14.6],[7.92,-18.92],[9.12,-20.72],[1.24,-19.24]];
const nativeSprites=window.ThrongletSprites,authoredSprites=window.ThrongletAuthored;
const N=48,MAP_H=32,MIN_Y=-10,TW=34,TH=17,SAVE='thronglets-world-v1';
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const defs={orchard:{unlock:10,name:'苹果树',icon:'♣',wood:10,gems:2,desc:'持续产粮 · 自动喂食'},bath:{unlock:6,name:'浴池',icon:'≈',wood:12,gems:4,desc:'自动清洁 · 减少疾病'},play:{unlock:15,name:'旋转木马',icon:'⚑',wood:14,gems:4,desc:'自动玩耍 · 提升快乐'},nest:{name:'巢居',icon:'⌂',wood:18,gems:5,desc:'人口上限 +8'},mine:{gemUnlock:50,name:'晶矿',icon:'◆',wood:22,gems:6,desc:'矿脉上建造 · 每9秒产4矿石'},factory:{name:'工厂',icon:'▥',wood:30,gems:20,gemUnlock:300,desc:'3矿石→12晶石 / 6秒 · 产生污染'},tower:{currentPopulation:16,name:'共鸣塔',icon:'⋮',wood:40,gems:25,desc:'需 16 个体 · 集体共鸣'}};
const nodes=[{x:7,y:15},{x:26,y:9},{x:28,y:12},{x:34,y:7},{x:40,y:11},{x:38,y:22},{x:29,y:24},{x:28,y:0},{x:30,y:-6}];
const farOutline=[[24,7],[28,4],[34,4],[34,2],[41,2],[41,7],[45,7],[45,17],[42,17],[42,24],[35,24],[35,28],[28,28],[28,22],[24,22]];
function inPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
const tools=[['inspect','⌖','观察'],['feed','●','喂食'],['wash','≈','清洁'],['play','✧','玩耍'],['harvest','⚒','采集'],['mop','▱','拖洗'],['throw','◆','投石'],['pan','✥','移图']];
let selectedBuilding=null,shots=[],throwAt=-10;
let s,tool='inspect',building=null,selected=1,paused=false,speed=1,sound=false,audio=null,zoom=1,pan={x:0,y:0},size={w:1000,h:650},effects=[],particles=[],animationTime=0,scrubAt=0,last=0,uiClock=0,saveClock=0,toastTimer,drag=null,hover=null;
function creature(x,y,id){return{id,x,y,tx:x,ty:y,food:75,clean:78,happy:70,health:100,energy:90,age:0,repro:0,wait:0,behavior:'idle',actionTime:0,actionTotal:0,actionClock:0,goal:null,goalX:null,goalY:null,act:'正在观察你',seed:rand(0,6),facing:4,walkDistance:0}}
function terrain(x,y){
 if(x<0||y<MIN_Y||x>=N||y>=MAP_H)return'void';
 if(x>=4&&x<=8&&y>=-8&&y<=-5)return'grass';
 if(x===6&&y>=-4&&y<=0&&s?.cubeBridge?.complete)return'grass';
 if(x>=25&&x<=31&&y>=-2&&y<=1)return'grass';
 if(x>=25&&x<=33&&y>=-10&&y<=-5){if(nodes.some(n=>n.x===x&&n.y===y))return'grass';return x>=26&&x<=28&&y>=-9&&y<=-8?'water':'grass'}
 if(x===28&&[-4,-3,2,3].includes(y)&&s?.bridge?.complete)return'grass';
 if(y<1)return'void';
 if(s?.bridge?.complete&&x>=21&&x<=24&&y===13)return'grass';
 if(x>=24){if(!inPolygon(x,y,farOutline))return'void';if(nodes.some(n=>n.x===x&&n.y===y)||s?.buildings?.some(b=>Math.round(b.x)===x&&Math.round(b.y)===y))return'grass';if((y===10||y===11)&&x!==35&&x!==36)return'water';if((x>=31&&x<=33&&y>=12&&y<=16)||(x===34&&y>=14&&y<=16)||(x>=38&&x<=40&&y>=6&&y<=8)||(x>=27&&x<=29&&y>=19&&y<=20))return'water';return'grass'}
 if(x>=22)return'void';
 if((x-10.5)**2/130+(y-10.5)**2/122>1)return'void';
 if(nodes.some(n=>n.x===x&&n.y===y)||s?.buildings?.some(b=>Math.round(b.x)===x&&Math.round(b.y)===y))return'grass';
 const center=a=>a+(a<4?8:a<8?6:a<12?8:6),edge=center(x),previous=center(Math.max(0,x-1));
 if(x<=14&&y>=Math.min(edge,previous)&&y<=Math.max(edge,previous)+1)return'water';return'grass';
}
function initial(){const objects=[];for(let x=1;x<N-1;x++)for(let y=MIN_Y;y<MAP_H;y++){if(y<1&&x<24)continue;if(terrain(x,y)!=='grass'||nodes.some(n=>n.x===x&&n.y===y)||Math.hypot(x-10,y-11)<3)continue;let n=(x*173+y*97)%31;if(n<5)objects.push({x,y,type:n<3?'tree':'rock',amount:8,regen:0});}return{version:6,intro:{elapsed:0,done:false},shells:[],remains:[],cubeBridge:{paid:false,progress:0,complete:false},ore:0,maxGems:12,pollution:[],bridge:{paid:false,progress:0,complete:false},maxPopulation:1,time:0,wood:24,gems:12,food:30,creatures:[creature(10.2,11,1)],objects,buildings:[],nextId:2,stage:0,answered:false,storm:0,eventAt:155,autoAt:0,echo:false,log:[]}}
function migrate(v){
  if(!v||![1,2,3,4,5,6].includes(v.version)||!Array.isArray(v.creatures)||!Array.isArray(v.objects)||!Array.isArray(v.buildings)||!Number.isFinite(v.time))return null;
  if(v.version<5){for(let x=24;x<N;x++)for(let y=MIN_Y;y<MAP_H;y++)if((x>=31||y>=15||y<1)&&terrain(x,y)==='grass'&&(x*173+y*97)%31<5&&!nodes.some(n=>n.x===x&&n.y===y)&&!v.objects.some(o=>o.x===x&&o.y===y)&&!v.buildings.some(b=>b.x===x&&b.y===y))v.objects.push({x,y,type:(x*173+y*97)%31<3?'tree':'rock',amount:8,regen:0})}
  v.intro=v.intro||{elapsed:ANIMATION.hatch.end,done:true};v.shells=Array.isArray(v.shells)?v.shells:[];v.remains=Array.isArray(v.remains)?v.remains:[];v.cubeBridge=v.cubeBridge||{paid:false,progress:0,complete:false};v.mopUnlocked=!!v.mopUnlocked||!!v.pollution?.length;v.ore=Number.isFinite(v.ore)?v.ore:0;v.maxGems=Math.max(v.maxGems||0,v.gems||0);v.pollution=Array.isArray(v.pollution)?v.pollution:[];v.bridge=v.bridge||{paid:false,progress:0,complete:false};if(v.version<3){v.objects=v.objects.filter(o=>!nodes.some(n=>n.x===o.x&&n.y===o.y));for(let x=24;x<=30;x++)for(let y=7;y<=14;y++)if(terrain(x,y)==='grass'&&(x*3+y)%7===0&&!nodes.some(n=>n.x===x&&n.y===y))v.objects.push({x,y,type:'rock',amount:8,regen:0})}v.maxPopulation=Math.max(v.maxPopulation||0,v.creatures.length,...v.buildings.map(b=>defs[b.type]?.unlock||0));v.version=6;v.creatures=v.creatures.filter(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)).map(c=>({...creature(c.x,c.y,c.id),...c,energy:Number.isFinite(c.energy)?clamp(c.energy,0,100):90,behavior:c.behavior||'idle',actionTime:Math.max(0,c.actionTime||0),actionTotal:Math.max(0,c.actionTotal||0),actionClock:Number.isFinite(c.actionClock)?c.actionClock:Math.max(0,(c.actionTotal||0)-(c.actionTime||0)),goal:c.goal||null}));return v;
}
function load(){try{return migrate(JSON.parse(localStorage.getItem(SAVE)))||initial()}catch{return initial()}}

s=load();if(!s.intro.done){const c=s.creatures[0];if(c){c.behavior='hatching';c.actionTime=ANIMATION.hatch.end-s.intro.elapsed;c.actionTotal=ANIMATION.hatch.end;c.actionClock=s.intro.elapsed;c.act='蛋壳里有了动静'}}normalizeEpisodeMap();paused=!s.creatures.length;animationTime=s.time;selected=s.creatures[0]?.id||1;
function save(){try{localStorage.setItem(SAVE,JSON.stringify(s));$('save-status').textContent='已存档 · 此浏览器'}catch{$('save-status').textContent='浏览器未允许存档'}}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function beep(freq=550){if(!sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.14)}catch{}}
const capacity=()=>8+s.buildings.filter(b=>b.type==='nest').length*8;
const average=k=>s.creatures.reduce((a,c)=>a+c[k],0)/Math.max(1,s.creatures.length);
const canSplit=c=>s.intro.done&&c&&c.food>=65&&c.clean>=60&&c.happy>=65&&c.health>=60&&c.energy>=35&&c.actionTime<=0&&s.food>=8&&s.gems>=2&&s.creatures.length<capacity();
function split(c,automatic=false){if(!canSplit(c)){toast(s.creatures.length>=capacity()?'巢居已满，先建造新的巢居':'需饱食65、洁净60、快乐65、健康60、精力35以上；等当前动作结束，再消耗8食物、2晶石');return false}s.food-=8;s.gems-=2;c.food-=12;c.happy-=10;c.repro=0;setAction(c,'splitting',2.5,'正在分裂');const baby=creature(c.x,c.y,s.nextId++);const landing=[[.6,.1],[-.6,-.1],[.1,.6],[-.1,-.6]].find(([dx,dy])=>terrain(Math.round(c.x+dx),Math.round(c.y+dy))==='grass');if(landing){baby.x+=landing[0];baby.y+=landing[1];baby.tx=baby.x;baby.ty=baby.y}baby.birthFrom={x:c.x,y:c.y};setAction(baby,'newborn',3,'刚刚诞生');s.creatures.push(baby);burst(baby,'birth',18);effects.push({x:c.x,y:c.y,text:'新生命！',color:'#ffeca1',life:2});beep(850);toast(automatic?'一个新生命自然诞生了':'它把快乐分成了两份');return true}
function updatePauseIcon(){$('pause').innerHTML=paused?"<svg aria-hidden=\"true\" focusable=\"false\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\" />\n</svg>\n<span class=\"tool-label\">继续</span>":"<svg aria-hidden=\"true\" focusable=\"false\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect x=\"14\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\" />\n  <rect x=\"5\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\" />\n</svg>\n<span class=\"tool-label\">暂停</span>";$('pause').setAttribute('aria-label',paused?'继续（空格）':'暂停（空格）')}
function setTool(t){cancelGesture();if(t!=='inspect')$('detail-panel').hidden=true;tool=t;cancelGesture();building=null;selectedBuilding=null;updateUI();beep(350)}
$('buildings').innerHTML=Object.entries(defs).map(([id,d])=>`<button class="building" data-build="${id}" title="${d.desc}"><span>${d.icon} ${d.name}</span><small>${d.wood} 木 · ${d.gems} 晶</small></button>`).join('');
$('tools').onclick=e=>{const b=e.target.closest('[data-tool]');if(b)setTool(b.dataset.tool)};
// One availability rule feeds both button feedback and the final placement check.
function buildAvailability(id){
 const d=defs[id];if(!d)return{state:'locked',reason:'未知设施',label:'不可建造'};
 const population=Math.max(s.maxPopulation||0,s.creatures.length),gems=Math.max(s.maxGems||0,s.gems);
 if(d.unlock&&population<d.unlock)return{state:'locked',reason:`${d.name}未解锁：群落达到${d.unlock}个体后解锁（最高${population}）`,label:`${d.unlock}个体解锁`};
 if(d.gemUnlock&&gems<d.gemUnlock)return{state:'locked',reason:`${d.name}未解锁：晶石储备达到${d.gemUnlock}后解锁（最高${Math.floor(gems)}）`,label:`${d.gemUnlock}晶石解锁`};
 if(d.currentPopulation&&s.creatures.length<d.currentPopulation)return{state:'locked',reason:`${d.name}暂不可建造：当前需要至少${d.currentPopulation}个体（现有${s.creatures.length}）`,label:`当前需${d.currentPopulation}个体`};
 const missing=[['wood','木材'],['gems','晶石']].filter(([key])=>s[key]<d[key]).map(([key,label])=>`${Math.ceil(d[key]-s[key])}${label}`).join('、');
 return missing?{state:'insufficient',reason:`${d.name}资源不足：还缺${missing}`,label:`还缺${missing}`}:{state:'available',reason:d.desc,label:`${d.wood}木 · ${d.gems}晶`};
}
function selectBuilding(id){
 const availability=buildAvailability(id);if(availability.state!=='available'){toast(availability.reason);return false}
 cancelGesture();building=id;tool='build';selectedBuilding=null;$('detail-panel').hidden=true;toast(`${defs[id].name}：${defs[id].desc}。点击空地建造`);updateUI();return true;
}
function validatePlacement(){
 if(tool!=='build')return true;
 const availability=buildAvailability(building);if(availability.state==='available')return true;
 cancelGesture();building=null;tool='inspect';toast(`${availability.reason}，已取消放置`);return false;
}
$('buildings').onclick=e=>{const b=e.target.closest('[data-build]');if(b)selectBuilding(b.dataset.build)};
$('split').onclick=()=>{split(s.creatures.find(c=>c.id===selected)||s.creatures[0]);updateUI();save()};
$('pause').onclick=()=>{cancelGesture();paused=!paused;updatePauseIcon();$('pause').setAttribute('aria-label',paused?'继续':'暂停');updateUI()};
$('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;$('speed').textContent=speed+'×'};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪ 开':'♪ 关';beep()};
$('center').onclick=()=>{pan={x:0,y:0};zoom=1};
$('map-toggle').onclick=()=>{$('map-panel').hidden=!$('map-panel').hidden;drawMap()};$('close-map').onclick=()=>{$('map-panel').hidden=true};
$('map-canvas').addEventListener('pointerdown',e=>{const r=$('map-canvas').getBoundingClientRect(),x=(e.clientX-r.left)/r.width*N,y=(e.clientY-r.top)/r.height*(MAP_H-MIN_Y)+MIN_Y;focusPoint(x,y);drawMap()});
$('zoom-in').onclick=()=>zoom=clamp(zoom+.15,.55,1.9);$('zoom-out').onclick=()=>zoom=clamp(zoom-.15,.55,1.9);
$('help').onclick=()=>$('help-dialog').showModal();document.querySelectorAll('#help-dialog .close').forEach(b=>b.onclick=()=>$('help-dialog').close());
$('reset-help').onclick=()=>{$('help-dialog').close();$('reset-dialog').showModal()};$('restart').onclick=()=>$('reset-dialog').showModal();$('cancel-reset').onclick=()=>$('reset-dialog').close();$('confirm-reset').onclick=()=>{cancelGesture();shots=[];throwAt=-10;s=initial();selectedBuilding=null;animationTime=0;selected=1;effects=[];particles=[];paused=false;speed=1;pan={x:0,y:0};zoom=1;updatePauseIcon();$('speed').textContent='1×';setTool('feed');save();$('reset-dialog').close();toast('一个新的世界诞生了')};
$('respond').onclick=()=>{if(s.responseStage===s.stage){toast('它们还记得你的回答');return}s.answered=true;s.responseStage=s.stage;s.creatures.forEach(c=>c.happy=clamp(c.happy+8,0,100));toast('它们记住了你的回应');perform(currentCreature(),'nodding');beep(660);updateUI()};
function resize(){const r=canvas.getBoundingClientRect();size={w:r.width,h:r.height};canvas.width=Math.floor(r.width);canvas.height=Math.floor(r.height);ctx.imageSmoothingEnabled=false}new ResizeObserver(resize).observe(canvas);
function scale(){return Math.min(size.w/900,size.h/630)*zoom*(size.w<550?1.42:1.08)}
function project(x,y,z=0){const k=scale();return{x:size.w*.49+(x-y)*TW*k+pan.x,y:size.h*.49+((x+y)-21)*TH*k-z*k+pan.y}}
function unproject(px,py){const k=scale(),a=(px-size.w*.49-pan.x)/(TW*k),b=(py-size.h*.49-pan.y)/(TH*k)+21;return{x:(a+b)/2,y:(b-a)/2}}
const occupied=(x,y)=>s.objects.some(o=>o.amount>0&&Math.round(o.x)===x&&Math.round(o.y)===y)||s.buildings.some(b=>Math.round(b.x)===x&&Math.round(b.y)===y);
function openPanel(tab='creature'){$('detail-panel').hidden=false;$('system-menu').hidden=true;for(const name of ['creature','build','advanced'])$(name+'-section').hidden=name!==tab;document.querySelectorAll('[data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===tab))}
$('population-badge').onclick=()=>openPanel('creature');$('open-build').onclick=()=>openPanel('build');$('close-panel').onclick=()=>{$('detail-panel').hidden=true};$('crest-menu').onclick=()=>{$('system-menu').hidden=!$('system-menu').hidden};$('panel-tabs').onclick=e=>{const b=e.target.closest('[data-panel]');if(b)openPanel(b.dataset.panel)};
function normalizeEpisodeMap(){
 const nearest=p=>{for(let radius=0;radius<22;radius++)for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++){const x=Math.round(p.x)+dx,y=Math.round(p.y)+dy;if(terrain(x,y)==='grass'&&(s.bridge.complete||x<22))return{x,y}}return{x:10,y:11}};
 for(const c of s.creatures){if(terrain(Math.round(c.x),Math.round(c.y))!=='grass'){const p=nearest(c);c.x=p.x;c.y=p.y;c.tx=p.x;c.ty=p.y;c.goal=null;c.route=null}}
 for(const o of s.objects){if(terrain(o.x,o.y)!=='grass'){const p=nearest(o);o.x=p.x;o.y=p.y}}
}
function drawBadge(){bc.clearRect(0,0,90,65);for(const [i,x,y] of [[1,25,48],[2,47,36],[3,68,50]])pixelCreature(bc,x,y,.54,{id:0,age:100,x:0,y:0,tx:0,ty:0,food:90,clean:100,happy:75,health:100,energy:90,seed:i,behavior:'idle',actionTime:0},0,true)}
function sing(c){if(!sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.value=[220,275,330,440][c.id%4];g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.014,audio.currentTime+.035);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.45);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.46)}catch{}}
const nativeActions={explaining:'impactful_explanation',nodding:'happy_nod',skeptical:'skeptical_toward_player',talking:'talk_to_other_thronglet',thinking:'deep_thoughts',singing:'singing'};
function nativeSequence(c,action){let variant=c.performanceVariant||'ABCDE'[(c.id-1+5)%5];if(action==='talking'&&!['A','C','D'].includes(variant))variant='A';if(!['talking','singing'].includes(action))variant='A';const direction=action==='singing'&&c.facing===4?'front':'threequarter';return nativeActions[action]+'_Throng'+variant+'_'+direction}
function perform(c,action){if(!c||!nativeActions[action]||paused||!s.intro.done)return false;if(c.actionTime>0&&['newborn','splitting'].includes(c.behavior))return false;c.facing=c.facing===3?3:4;const name=nativeSequence(c,action),seq=nativeSprites?.data.sequences[name];if(!seq)return false;setAction(c,action,seq.duration/1000,({explaining:'认真地向你解释',nodding:'开心地点点头',skeptical:'歪头打量着你',talking:'和同伴说着什么',thinking:'安静地思考',singing:'回应群落的歌声'})[action]);c.nativeSequence=name;updateUI();return true}
$('expression-actions').onclick=e=>{const b=e.target.closest('[data-expression]');if(b)perform(currentCreature(),b.dataset.expression)};
$('expression-variant').onchange=e=>{const c=currentCreature();if(c){c.performanceVariant=e.target.value;if(nativeActions[c.behavior])perform(c,c.behavior);save()}};
function currentCreature(){return s.creatures.find(c=>c.id===selected)||s.creatures[0]}
function applyPlayMotion(c){if(c.behavior!=='playing'||c.playMove===false)return;const [x,y]=playOffset(c.actionClock||0),ratio=Math.max(.6,scale()*.72)/scale(),dx=x*ratio/TW,dy=y*ratio/TH,nx=c.x+(dx+dy)/2,ny=c.y+(dy-dx)/2;if(terrain(Math.round(nx),Math.round(ny))==='grass'){c.x=nx;c.y=ny;c.tx=nx;c.ty=ny}c.playMove=false}
function setAction(c,state,seconds,label){applyPlayMotion(c);c.nativeSequence=null;if(['eating','washing','playing','sleeping','splitting','newborn'].includes(state))c.facing=4;c.behavior=state;c.actionTime=seconds;c.actionTotal=seconds;c.actionClock=0;c.wait=seconds;c.act=label;c.tx=c.x;c.ty=c.y;c.goal=null;c.route=null}
function burst(c,type,count=12){for(let i=0;i<count;i++)particles.push({x:c.x,y:c.y,dx:rand(-13,13),dy:rand(-26,-7),vx:rand(-12,12),vy:rand(-27,-7),life:rand(.6,1.4),max:1.4,type,size:rand(2,4)});if(particles.length>260)particles.splice(0,particles.length-260)}
function stateOf(c){if(!c)return{key:'absent',label:'无个体',icon:'—',tone:'muted'};if(c.behavior==='dead')return{key:'dead',label:'已离世',icon:'×',tone:'muted'};if(!s.intro.done&&c.id===1)return{key:'hatching',label:'正在孵化',icon:'◌',tone:'good'};const active={stunned:['头晕了','!'],explaining:['认真解释','!'],nodding:['开心点头','♥'],skeptical:['疑惑地看着你','?'],talking:['同伴交谈','…'],thinking:['沉思','…'],singing:['轻声合唱','♪'],eating:['进食中','●'],washing:['清洁中','≈'],playing:['玩耍中','✧'],sleeping:['休息中','z'],splitting:['分裂中','✦'],newborn:['新生儿','✦']};if(c.actionTime>0&&active[c.behavior])return{key:c.behavior,label:active[c.behavior][0],icon:active[c.behavior][1],tone:'good'};if(c.health<35||((c.exposure||0)>45))return{key:'sick',label:'虚弱',icon:'!',tone:'danger'};if(c.food<18)return{key:'starving',label:'非常饥饿',icon:'●',tone:'danger'};if(c.clean<20)return{key:'filthy',label:'浑身脏污',icon:'≈',tone:'danger'};if(c.energy<25)return{key:'tired',label:'困倦',icon:'z',tone:'warn'};if(c.food<45)return{key:'hungry',label:'肚子饿了',icon:'●',tone:'warn'};if(c.clean<48)return{key:'dirty',label:'需要清洁',icon:'≈',tone:'warn'};if(c.happy<25)return{key:'sad',label:'很不开心',icon:'…',tone:'danger'};if(c.happy<50)return{key:'bored',label:'想和你玩',icon:'✧',tone:'warn'};if(c.happy>=82&&c.food>=55&&c.clean>=55)return{key:'happy',label:'心满意足',icon:'♥',tone:'good'};return{key:'neutral',label:'平静好奇',icon:'·',tone:'normal'}}
function warnings(c){if(!c)return[];return[c.food<35?'饿了':null,c.clean<35?'脏了':null,c.happy<35?'不开心':null,c.energy<25?'困了':null,c.health<40?'虚弱':null,(c.exposure||0)>40?'受污染':null].filter(Boolean)}
function care(c,kind,scrub=false,automatic=false){
  if(!c)return false;if(!s.intro.done){toast('蛋壳正在裂开，等它跳出来');return false}if(paused){toast('世界已暂停，按 ▶ 继续');return false}if(['newborn','splitting'].includes(c.behavior)&&c.actionTime>0){toast('等它完成诞生或分裂，再照顾它');return false}
  if(!automatic)selected=c.id;
  if(kind==='feed'){if(c.food>=98){toast('它已经吃饱了');return false}if(s.food<2){toast('食物不足，采集树木或建造果园');return false}s.food-=2;c.food=clamp(c.food+28,0,100);setAction(c,'eating',ANIMATION.feed,'抱着苹果慢慢咀嚼');burst(c,'crumb',7)}
  if(kind==='wash'){if(c.clean>=99){if(!scrub)toast('已经洗得干干净净');return false}c.clean=clamp(c.clean+(scrub?9:25),0,100);c.happy=clamp(c.happy+1,0,100);if(scrub&&c.behavior==='washing'&&c.actionTime>0)c.actionTime=Math.max(c.actionTime,.5);else setAction(c,'washing',ANIMATION.wash,'正在冲洗泥污');burst(c,'water',scrub?7:14)}
  if(kind==='play'){if(c.energy<18){toast('它太累了，先让它休息一会儿');return false}c.happy=clamp(c.happy+26,0,100);c.energy=clamp(c.energy-5,0,100);setAction(c,'playing',ANIMATION.play,'追逐小球，开心蹦跳');const [dx,dy]=playOffset(ANIMATION.play),ratio=Math.max(.6,scale()*.72)/scale(),nx=c.x+(dx/TW+dy/TH)*ratio/2,ny=c.y+(dy/TH-dx/TW)*ratio/2;c.playMove=terrain(Math.round(nx),Math.round(ny))==='grass';burst(c,'joy',8)}
  if(kind==='rest'){setAction(c,'sleeping',10,'蜷起来打个小盹');c.goal=null}
  if(!scrub&&!automatic)beep(kind==='play'?780:kind==='wash'?470:520);if(!automatic)updateUI();return true;
}
function visualPoint(c){const p=project(c.x,c.y),k=Math.max(.6,scale()*.72);if(c.behavior==='playing'&&c.actionTime>0){if(c.playMove!==false){const [dx,dy]=playOffset(c.actionClock||0);p.x+=dx*k;p.y+=dy*k}const t=c.actionClock||0;p.y-=(t>=12/30&&t<15/30?9.1:t>=15/30&&t<18/30?32.7:0)*k}return p}
function hitCreature(p){const k=Math.max(.6,scale()*.72);return s.creatures.filter(c=>{const q=visualPoint(c);return Math.abs(p.x-q.x)<20*k&&p.y>q.y-39*k&&p.y<q.y+9*k}).sort((a,b)=>(b.x+b.y)-(a.x+a.y))[0]}
function action(p){
  if(!validatePlacement()){updateUI();return}
  const pos=unproject(p.x,p.y),x=Math.round(pos.x),y=Math.round(pos.y);let near=hitCreature(p)||s.creatures.filter(c=>dist(c,pos)<1.35).sort((a,b)=>dist(a,pos)-dist(b,pos))[0];
  if(tool==='inspect'){if(dist(pos,{x:6,y:-6})<1.8){toast(s.cubeBridge.complete?'方块平台：来自手机版第一幕的视觉地标':'修通北侧木桥，可以走到方块平台');return}if(near){selected=near.id;openPanel('creature');updateUI()}else{const b=s.buildings.find(b=>dist(b,pos)<1);if(b){selectedBuilding=b;openPanel('advanced');updateUI();toast(defs[b.type].name+'：'+defs[b.type].desc)}}return}
  if(!s.intro.done){toast('蛋壳正在裂开，等它跳出来');return}if(paused){toast('世界已暂停，按 ▶ 继续');return}if(tool==='feed'||tool==='wash'||tool==='play'){if(!near){toast('点击小家伙的身体，或在名片里直接照顾');return}care(near,tool);return}
  if(y<1&&x<24&&!s.cubeBridge.complete){toast('先修通北侧木桥，再探索方块平台');return}
  if(x>=24&&!s.bridge.complete){toast('先在桥头放好木材，让群落修通木桥');return}
  if(tool==='throw'){throwRock(p,pos);return}if(tool==='mop'){mop(pos);return}
  if(terrain(x,y)!=='grass'){toast('请选择岛上的草地');return}
  if(tool==='build'){if(!building)return;const d=defs[building];if(building==='mine'&&!nodes.some(n=>n.x===x&&n.y===y)){toast('晶矿必须放在发光矿脉上');return}if(occupied(x,y)){toast('这块地已有树木、矿石或设施');return}s.wood-=d.wood;s.gems-=d.gems;s.buildings.push({type:building,x,y,t:0,level:1,running:true});selectedBuilding=s.buildings[s.buildings.length-1];effects.push({x,y,text:d.name+' 建成',color:'#fff2b0',life:2});beep(740);building=null;tool='inspect';save();updateUI();return}
  if(tool==='harvest'){const o=s.objects.filter(o=>o.amount>0&&dist(o,pos)<1.1).sort((a,b)=>dist(a,pos)-dist(b,pos))[0];if(!o){toast('点击树木或灰色矿石的底部');return}o.amount--;o.regen=0;if(o.type==='tree'){s.wood+=3;s.food+=1}else s.ore+=3;effects.push({x:o.x,y:o.y,text:o.type==='tree'?'+3 木 · +1 食物':'+3 矿石',color:'#fff2b0',life:1.2});beep(280);updateUI()}
}
// Stones are deliberate, resource-priced impacts. Creature damage is non-lethal.
function targetAt(p,pos){
 const c=hitCreature(p);if(c)return{kind:'creature',id:c.id,x:c.x,y:c.y};
 const candidates=[...s.buildings.map(b=>({ref:b,kind:'building'})),...s.objects.filter(o=>o.amount>0).map(o=>({ref:o,kind:'object'}))];
 const ground=candidates.filter(v=>dist(v.ref,pos)<.55).sort((a,b)=>dist(a.ref,pos)-dist(b.ref,pos))[0];if(ground)return{kind:ground.kind,x:ground.ref.x,y:ground.ref.y};
 return candidates.filter(v=>{const q=project(v.ref.x,v.ref.y),k=scale();return dist(v.ref,pos)<.8||(Math.abs(p.x-q.x)<22*k&&p.y>q.y-(v.ref.type==='tree'?65:40)*k&&p.y<q.y+10*k)}).sort((a,b)=>(b.ref.x+b.ref.y)-(a.ref.x+a.ref.y)).map(v=>({kind:v.kind,x:v.ref.x,y:v.ref.y}))[0];
}
function throwRock(p,pos){
 if(s.time-throwAt<.55){toast('等这颗石头落下再投');return false}
 const target=targetAt(p,pos);if(!target){toast('瞄准个体、树木、岩石或设施；拖动仍可移动地图');return false}
 if(target.kind==='creature'&&!liftable(s.creatures.find(c=>c.id===target.id))){toast('等它完成诞生或分裂');return false}
 if(s.ore<1){toast('没有石头：选「采集」，点击灰色岩石，可得到3矿石');return false}
 s.ore--;throwAt=s.time;shots.push({...target,elapsed:0,duration:.48});beep(220);save();updateUI();return true;
}
function updateShots(dt){
 for(const shot of shots){shot.elapsed+=dt;if(shot.elapsed<shot.duration)continue;
  let hit=shot.kind==='creature'?s.creatures.find(c=>c.id===shot.id): (shot.kind==='building'?s.buildings:s.objects).find(o=>o.x===shot.x&&o.y===shot.y);
  if(!hit)continue;
  // Moving targets can dodge. Held creatures cannot be hit in their old position.
  if(shot.kind==='creature'&&(dist(hit,shot)>.8||drag?.lift===hit.id)){effects.push({...shot,text:'擦肩而过',color:'#d5e4c2',life:1});continue}
  let text='';
  if(shot.kind==='creature'){hit.health=Math.max(Math.min(hit.health,10),hit.health-18);hit.happy=clamp(hit.happy-22,0,100);hit.energy=clamp(hit.energy-8,0,100);setAction(hit,'stunned',1.3,'被石头砸晕了，想被好好照顾');hit.impactUntil=s.time+.45;text='哎哟！'}
  else if(shot.kind==='object'){hit.amount=Math.max(0,hit.amount-3);hit.regen=0;text=hit.amount?(hit.type==='tree'?'枝叶散落':'岩石开裂'):(hit.type==='tree'?'只剩树桩':'岩石碎开')}
  else{hit.durability=Math.max(0,(hit.durability??4)-1);text=hit.durability?'设施耐久 '+hit.durability+'/4':'设施损毁';if(!hit.durability){s.buildings=s.buildings.filter(b=>b!==hit);if(selectedBuilding===hit)selectedBuilding=null;s.creatures.forEach(c=>{c.goal=null;c.route=null});if(hit.type==='tower')s.echo=false}}
  burst(hit,'dust',16);effects.push({x:hit.x,y:hit.y,text,color:'#f6be87',life:1.5});beep(120);save();updateUI();
 }shots=shots.filter(v=>v.elapsed<v.duration);
}
function drawInteractions(t,k){
 for(const b of s.buildings)if(b.durability!==undefined&&b.durability<4){const p=project(b.x,b.y);rect(p.x-16*k,p.y-48*k,32*k,4*k,'#263b2a');rect(p.x-16*k,p.y-48*k,b.durability*8*k,4*k,'#e1a260');ctx.strokeStyle='#352f29';ctx.lineWidth=2*k;ctx.beginPath();ctx.moveTo(p.x-7*k,p.y-23*k);ctx.lineTo(p.x+2*k,p.y-14*k);ctx.lineTo(p.x-2*k,p.y-5*k);ctx.stroke()}
 for(const c of s.creatures)if(c.behavior==='stunned'&&c.actionTime>0){const p=project(c.x,c.y);for(let i=0;i<3;i++){const a=t*5+i*Math.PI*2/3;rect(p.x+Math.cos(a)*16*k,p.y-40*k+Math.sin(a)*4*k,3*k,3*k,'#fff3a4')}}
 for(const shot of shots){const p=project(shot.x,shot.y),u=clamp(shot.elapsed/shot.duration,0,1),x=p.x-95*k*(1-u),y=p.y-18*k-70*k*Math.sin(u*Math.PI);groundedShadow(ctx,x,p.y,k,4);rect(x-4*k,y-4*k,8*k,7*k,'#4c5652');rect(x-3*k,y-4*k,5*k,3*k,'#b1b9a2')}
 if(drag?.lift&&drag.moved){const c=s.creatures.find(c=>c.id===drag.lift);if(c){const p={x:drag.px+drag.offset.x,y:drag.py+drag.offset.y},pos=unproject(p.x,p.y);tile(Math.round(pos.x),Math.round(pos.y),dropAllowed(pos,c)?'#bedb83':'#c5785a',2);groundedShadow(ctx,p.x,p.y,k,15);pixelCreature(ctx,p.x,p.y-22*k,Math.max(.6,k*.72),{...c,behavior:'idle',actionTime:0,nativeSequence:null,noShadow:true},t);ctx.strokeStyle='#f1e7b1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y-61*k);ctx.lineTo(p.x,p.y-70*k);ctx.stroke()}}
}
function pollutionAt(p){return s.pollution.reduce((v,t)=>Math.max(v,dist(t,p)<1.1?t.amount:0),0)}
function pollute(x,y,amount){s.mopUnlocked=true;if(terrain(x,y)!=='grass')return;let tile=s.pollution.find(p=>p.x===x&&p.y===y);if(!tile){tile={x,y,amount:0};s.pollution.push(tile)}tile.amount=clamp(tile.amount+amount,0,100)}
function updateIndustry(dt){
 for(const b of s.buildings){if(b.type!=='factory'||b.running===false)continue;b.production=(b.production||0)+dt;const level=b.level||1,interval=level===2?3:6,cost=level===2?6:3;
 if(b.production>=interval&&s.ore>=cost){b.production=0;s.ore-=cost;s.gems+=level===2?36:12;for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])pollute(b.x+dx,b.y+dy,level===2?16:5);if(level===2)for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]])pollute(b.x+dx,b.y+dy,5)}
 }
 s.pollution=s.pollution.filter(p=>p.amount>.1);
}
function mop(pos){if(!s.mopUnlocked){toast('出现工厂污染后解锁拖洗工具');return}const targets=s.pollution.filter(p=>dist(p,pos)<2.1);let removed=0;for(const p of targets){const n=Math.min(p.amount,34);p.amount-=n;removed+=n}for(const c of s.creatures.filter(c=>dist(c,pos)<2.1)){c.clean=clamp(c.clean+18,0,100);c.exposure=Math.max(0,(c.exposure||0)-20);burst(c,'water',5)}if(!removed)toast('这里没有地面污染，附近个体已清洁');else{effects.push({x:pos.x,y:pos.y,text:'污染 −'+Math.round(removed),color:'#c4f6df',life:1.3});beep(430)}updateUI()}
$('bridge-build').onclick=()=>{if(paused){toast('先继续游戏，再开工');return}if(s.bridge.complete){focusShore();return}if(s.bridge.paid){toast('照顾好群落，健康的个体会自动去搬木材');return}if(s.wood<60){toast('需要60木材，可继续采集树木');return}s.wood-=60;s.bridge.paid=true;toast('木材已放在桥头，健康的个体将自动施工');updateUI();save()};
$('cube-bridge-build').onclick=()=>{if(paused){toast('先继续游戏');return}if(s.cubeBridge.complete){focusPoint(6,-6);return}if(s.cubeBridge.paid){toast('健康的个体正在搭建北侧木桥');return}if(s.wood<80){toast('需要80木材');return}s.wood-=80;s.cubeBridge.paid=true;focusPoint(6,1);updateUI();save()};$('cube-view').onclick=()=>focusPoint(6,-6);
function focusPoint(x,y){const p=project(x,y);pan.x+=size.w*.5-p.x;pan.y+=size.h*.5-p.y}
function drawMap(){const map=$('map-canvas'),mc=map.getContext('2d'),w=map.width,h=map.height,dx=w/N,dy=h/(MAP_H-MIN_Y);mc.fillStyle='#102f28';mc.fillRect(0,0,w,h);for(let x=0;x<N;x++)for(let y=MIN_Y;y<MAP_H;y++){const type=terrain(x,y);if(type==='void')continue;mc.fillStyle=type==='water'?'#3584b1':x>=24&&!s.bridge.complete?'#536b46':'#689355';mc.fillRect(x*dx,(y-MIN_Y)*dy,dx+.5,dy+.5)}for(const node of nodes){mc.fillStyle='#a4ebd5';mc.fillRect(node.x*dx-1,(node.y-MIN_Y)*dy-1,3,3)}for(const b of s.buildings){mc.fillStyle='#d7cf89';mc.fillRect(b.x*dx-1,(b.y-MIN_Y)*dy-1,3,3)}for(const c of s.creatures){mc.fillStyle='#ffe377';mc.fillRect(c.x*dx-1,(c.y-MIN_Y)*dy-1,3,3)}const center=unproject(size.w/2,size.h/2);mc.strokeStyle='#fff2b5';mc.lineWidth=1;mc.strokeRect(center.x*dx-8,(center.y-MIN_Y)*dy-6,16,12);$('map-caption').textContent='北侧方块 · 东侧城镇、矿岛与林地 · 点击定位';}
function focusShore(){const p=project(s.bridge.complete?26:21,s.bridge.complete?10:13);pan.x+=size.w*.5-p.x;pan.y+=size.h*.5-p.y}
$('shore-view').onclick=focusShore;
$('process-ore').onclick=()=>{if(paused){toast('先继续游戏');return}if(s.ore<5){toast('需要5矿石，采集岩石或修建晶矿');return}s.ore-=5;s.gems+=5;s.maxGems=Math.max(s.maxGems||0,s.gems);toast('手动加工：5矿石变为5晶石');updateUI()};
$('factory-select').onclick=()=>{const list=s.buildings.filter(b=>b.type==='factory');if(!list.length){toast('建造工厂后可在这里管理');return}selectedBuilding=list[(list.indexOf(selectedBuilding)+1)%list.length];const p=project(selectedBuilding.x,selectedBuilding.y);pan.x+=size.w*.5-p.x;pan.y+=size.h*.5-p.y;updateUI()};
$('factory-toggle').onclick=()=>{if(selectedBuilding?.type!=='factory')return;selectedBuilding.running=selectedBuilding.running===false;updateUI();save()};
$('factory-upgrade').onclick=()=>{const b=selectedBuilding;if(!b||b.type!=='factory')return;if((b.level||1)>=2){toast('已是 Mark II');return}if(s.maxGems<5000){toast('晶石储备达到5000后解锁 Mark II');return}if(s.gems<250||s.wood<80){toast('升级需要250晶石、80木材');return}s.gems-=250;s.wood-=80;b.level=2;toast('工厂升级：产量提高，污染也会显著增加');updateUI();save()};
function updateIndustryUI(){
 $('cube-bridge-build').textContent=s.cubeBridge.complete?'北桥已通 · 前往方块':s.cubeBridge.paid?`北桥施工 ${Math.floor(s.cubeBridge.progress)}%`:'北桥放木材 · 80木';
 const active=s.buildings.filter(b=>b.type==='factory'&&b.running!==false).length,total=s.pollution.reduce((n,p)=>n+p.amount,0);
 $('industry-status').textContent=`矿石 ${Math.floor(s.ore)} · 运行工厂 ${active} · 污染 ${Math.round(total)}`;
 $('bridge-build').textContent=s.bridge.complete?'木桥已通 · 前往远岸':s.bridge.paid?`施工 ${Math.floor(s.bridge.progress)}% · ${s.bridge.workers||0} 个体`:'桥头放木材 · 60木';
 $('factory-detail').hidden=selectedBuilding?.type!=='factory';
 if(selectedBuilding?.type==='factory'){const b=selectedBuilding,l=b.level||1;$('factory-title').textContent=`工厂 ${l===2?'Mark II':'Mark I'} · ${b.running===false?'已停机':s.ore<(l===2?6:3)?'等待矿石':'运行中'}`;$('factory-output').textContent=l===2?'每3秒：6矿石 → 36晶石 · 高污染':'每6秒：3矿石 → 12晶石 · 持续污染';$('factory-toggle').textContent=b.running===false?'恢复生产':'暂停生产';$('factory-upgrade').textContent=l>=2?'已升级 Mark II':'升级 II · 250晶 / 80木'}
}
function selectRelative(offset){const index=s.creatures.findIndex(c=>c.id===selected);const c=s.creatures[(index+offset+s.creatures.length)%s.creatures.length];if(c){selected=c.id;updateUI()}}
$('previous-creature').onclick=()=>selectRelative(-1);$('next-creature').onclick=()=>selectRelative(1);
$('focus-creature').onclick=()=>{const c=currentCreature();if(!c)return;const p=project(c.x,c.y);pan.x+=size.w*.5-p.x;pan.y+=size.h*.55-p.y};
$('quick-care').onclick=e=>{const b=e.target.closest('[data-care]');if(b)care(currentCreature(),b.dataset.care)};
$('colony-alert').onclick=()=>{const c=[...s.creatures].sort((a,b)=>Math.min(a.food,a.clean,a.happy,a.energy,a.health)-Math.min(b.food,b.clean,b.happy,b.energy,b.health))[0];if(c){selected=c.id;$('focus-creature').click();updateUI()}};
// One captured pointer owns a gesture. State is committed only on a valid release.
function cancelGesture(){drag=null;canvas.style.cursor=tool==='throw'?'crosshair':tool==='pan'?'grab':'default'}
function liftable(c){return c&&s.intro.done&&!paused&&!(['newborn','splitting'].includes(c.behavior)&&c.actionTime>0)}
function dropAllowed(pos,c){const x=Math.round(pos.x),y=Math.round(pos.y);return terrain(x,y)==='grass'&&(x<24||s.bridge.complete)&&(!(y<1&&x<24)||s.cubeBridge.complete)&&!occupied(x,y)&&!s.creatures.some(v=>v.id!==c.id&&dist(v,pos)<.45)}
function gesturePoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointerdown',e=>{
 if(drag||e.button>0||e.isPrimary===false)return;
 const p=gesturePoint(e),c=hitCreature(p),wash=tool==='wash'&&c;
 canvas.setPointerCapture(e.pointerId);
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false,scrubbing:wash?.id||null,lift:tool==='inspect'&&liftable(c)?c.id:null,px:p.x,py:p.y,offset:c?{x:visualPoint(c).x-p.x,y:visualPoint(c).y-p.y}:{x:0,y:0}};
 if(wash){care(wash,'wash');scrubAt=s.time}
});
canvas.addEventListener('pointermove',e=>{
 const p=gesturePoint(e);hover=unproject(p.x,p.y);if(!drag||e.pointerId!==drag.id)return;
 const dx=e.clientX-drag.lx,dy=e.clientY-drag.ly;
 if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;
 if(drag.moved&&!drag.scrubbing){if(drag.lift)canvas.style.cursor='grabbing';else{pan.x+=dx;pan.y+=dy}}
 drag.lx=e.clientX;drag.ly=e.clientY;drag.px=p.x;drag.py=p.y;
});
canvas.addEventListener('pointerup',e=>{
 if(!drag||e.pointerId!==drag.id)return;const g=drag,p=gesturePoint(e),r=canvas.getBoundingClientRect();
 if(g.moved&&g.lift){const c=s.creatures.find(c=>c.id===g.lift),pos=unproject(p.x+g.offset.x,p.y+g.offset.y);
   if(c&&liftable(c)&&p.x>=0&&p.y>=0&&p.x<=r.width&&p.y<=r.height&&dropAllowed(pos,c)){
    setAction(c,'idle',.35,'被轻轻放在这里');c.x=pos.x;c.y=pos.y;c.tx=c.x;c.ty=c.y;c.playMove=false;selected=c.id;burst(c,'dust',8);save();
   }else toast('这里不能放下，已回到原处。请选择空旷草地');
 }else if(!g.moved&&!g.scrubbing&&p.x>=0&&p.y>=0&&p.x<=r.width&&p.y<=r.height&&tool!=='pan')action(p);
 cancelGesture();updateUI();
});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag&&e.pointerId===drag.id)cancelGesture()});
window.addEventListener('blur',cancelGesture);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom-e.deltaY*.001,.55,1.9)},{passive:false});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();$('pause').click()}if(e.key>='1'&&e.key<='8')setTool(tools[+e.key-1][0]);if(e.key==='Escape'){setTool('inspect');$('detail-panel').hidden=true;$('system-menu').hidden=true;$('map-panel').hidden=true}if(e.key==='ArrowLeft'){e.preventDefault();pan.x+=35}if(e.key==='ArrowRight'){e.preventDefault();pan.x-=35}if(e.key==='ArrowUp'){e.preventDefault();pan.y+=35}if(e.key==='ArrowDown'){e.preventDefault();pan.y-=35}});
// A persistent need target prevents flickering between facilities at thresholds.
function chooseGoal(c){
 const options=[['orchard','food',70],['bath','clean',70],['play','happy',70],['nest','energy',32]];
 const needed=options.filter(([type,key,limit])=>c[key]<limit&&(type!=='orchard'||s.food>=2));
 needed.sort((a,b)=>c[a[1]]-c[b[1]]);
 for(const [type,key] of needed){const b=s.buildings.filter(b=>b.type===type).sort((a,b)=>dist(c,a)-dist(c,b))[0];if(b){const spots=[[.65,.65],[-.65,-.65],[.65,-.65],[-.65,.65]];const spot=spots.find(([dx,dy])=>terrain(Math.round(b.x+dx),Math.round(b.y+dy))==='grass');if(spot){c.goal=type;c.goalX=b.x+spot[0];c.goalY=b.y+spot[1];c.route=null;return}}}
 if(s.cubeBridge.paid&&!s.cubeBridge.complete&&c.food>55&&c.clean>55&&c.happy>50&&c.energy>35){c.goal='cubeBridge';c.goalX=6;c.goalY=1;c.route=null;return}
 if(s.bridge.paid&&!s.bridge.complete&&c.food>55&&c.clean>55&&c.happy>50&&c.energy>35){c.goal='bridge';c.goalX=20.6;c.goalY=13;c.route=null;return}
 if(c.energy<25){setAction(c,'sleeping',12,'累了，在草地上休息');return}c.goal=null;
}
function findRoute(start,end){
 const sx=Math.round(start.x),sy=Math.round(start.y),ex=Math.round(end.x),ey=Math.round(end.y),queue=[[sx,sy]],parents=new Map([[`${sx},${sy}`,null]]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===ex&&y===ey){const result=[];let key=`${x},${y}`;while(parents.get(key)!==null){const [rx,ry]=key.split(',').map(Number);result.unshift({x:rx,y:ry});key=parents.get(key)}return result}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(!parents.has(key)&&terrain(nx,ny)==='grass'){parents.set(key,`${x},${y}`);queue.push([nx,ny])}}
 }return[];
}
function update(dt){
 updateShots(dt);
 s.time+=dt;animationTime+=dt;if(!s.intro.done){s.intro.elapsed=Math.min(ANIMATION.hatch.end,s.intro.elapsed+dt);const c=s.creatures[0];if(c){c.behavior='hatching';c.actionClock=s.intro.elapsed;c.actionTotal=ANIMATION.hatch.end;c.actionTime=ANIMATION.hatch.end-s.intro.elapsed;c.act='蛋壳里有了动静'}if(s.intro.elapsed>=ANIMATION.hatch.end){s.intro.done=true;if(c){s.shells.push({x:c.x,y:c.y,life:12});const ratio=Math.max(.6,scale()*.72)/scale(),dx=ANIMATION.hatch.hopDx*ratio/TW,dy=ANIMATION.hatch.hopDy*ratio/TH;c.x+=(dx+dy)/2;c.y+=(dy-dx)/2;c.tx=c.x;c.ty=c.y;c.behavior='idle';c.actionTime=0;c.wait=1.2;c.act='第一次看见这个世界';burst(c,'birth',12)}toast('它出生了。试试喂食、清洁和玩球。')}return}s.shells.forEach(r=>r.life-=dt);s.shells=s.shells.filter(r=>r.life>0);s.remains.forEach(r=>r.life-=dt);s.remains=s.remains.filter(r=>r.life>0);s.maxGems=Math.max(s.maxGems||0,s.gems);s.bridge.workers=0;s.cubeBridge.workers=0;updateIndustry(dt);s.maxPopulation=Math.max(s.maxPopulation||0,s.creatures.length);
 if(drag?.scrubbing&&s.time-scrubAt>.18){const c=s.creatures.find(c=>c.id===drag.scrubbing);if(c&&hitCreature({x:drag.px,y:drag.py})?.id===c.id)care(c,'wash',true);scrubAt=s.time}
 if(s.time>s.eventAt){s.storm=22;s.eventAt=s.time+rand(140,220);toast('风暴来了！脏污积累加快，巢居可以提供庇护')}s.storm=Math.max(0,s.storm-dt);
 for(const o of s.objects){if(o.amount<8){o.regen+=dt;if(o.regen>24){o.amount++;o.regen=0}}}
 for(const b of s.buildings){b.t+=dt;if(b.type==='orchard'&&b.t>6){s.food+=4;b.t=0}if(b.type==='mine'&&b.t>9){s.ore+=4;b.t=0}}
 for(const c of [...s.creatures]){
   if(drag?.lift===c.id)continue;
   c.age+=dt;c.repro+=dt;c.food=clamp(c.food-dt*.17,0,100);c.clean=clamp(c.clean-dt*(s.storm>0?.4:.12),0,100);c.happy=clamp(c.happy-dt*.10,0,100);c.energy=clamp(c.energy-dt*(c.behavior==='playing'?.35:.055),0,100);
   const bad=c.food<15||c.clean<10;c.health=clamp(c.health+dt*(bad?-.65:(c.food>45&&c.clean>40?.25:.04)),0,100);
   if(s.storm&&s.buildings.filter(b=>b.type==='nest').length*8<s.creatures.length)c.happy=clamp(c.happy-dt*.12,0,100);
   const exposure=pollutionAt(c);c.exposure=clamp((c.exposure||0)+dt*(exposure>12?exposure*.04:-2),0,100);if(exposure>12){c.clean=clamp(c.clean-dt*exposure*.008,0,100);c.health=clamp(c.health-dt*exposure*.009,0,100)}
   if(c.health<=0){s.remains.push({...c,behavior:'dead',life:45});if(s.remains.length>64)s.remains.shift();s.creatures=s.creatures.filter(v=>v.id!==c.id);effects.push({x:c.x,y:c.y,text:'再见…',color:'#c8d5b9',life:3});toast('一个小家伙因长期疏于照顾离开了');continue}
   if(c.actionTime>0){
     c.actionClock=(c.actionClock||0)+dt;c.actionTime=Math.max(0,c.actionTime-dt);c.wait=c.actionTime;
     if(c.behavior==='sleeping'){c.energy=clamp(c.energy+dt*5,0,100);if(c.food<15)c.actionTime=0}
     if(c.behavior==='washing'&&Math.random()<dt*7)burst(c,'water',1);
     if(c.actionTime===0){applyPlayMotion(c);c.behavior='idle';c.birthFrom=null;c.act='抬头看看周围';c.wait=.4}
     continue;
   }
   if(['bridge','cubeBridge'].includes(c.goal)&&(c.food<45||c.clean<45||c.happy<40||c.energy<25)){c.goal=null;c.route=null}
   const key={orchard:'food',bath:'clean',play:'happy',nest:'energy'}[c.goal];
   if(c.goal&&!['bridge','cubeBridge'].includes(c.goal)&&(!key||c[key]>=92||(c.goal==='orchard'&&s.food<2)))c.goal=null;
   if(!c.goal)chooseGoal(c);
   if(c.actionTime>0)continue;
   if(c.goal){c.tx=c.goalX;c.ty=c.goalY;c.wait=0;c.act=({orchard:'饿了，正在找苹果',bath:'脏了，正在找浴池',play:'想玩耍，前往游乐场',nest:'困了，回巢休息',bridge:'搬木材，前往桥头',cubeBridge:'搬木材，前往北侧桥头'})[c.goal];c.behavior='walking';
     if(dist(c,{x:c.tx,y:c.ty})<.65){const goal=c.goal;if(['bridge','cubeBridge'].includes(goal)){const bridge=s[goal];if(!bridge.complete&&bridge.workers<3){bridge.workers++;bridge.progress=clamp(bridge.progress+dt*3,0,100);c.behavior='working';c.act='搬运木材，搭建桥面';c.energy=clamp(c.energy-dt*.14,0,100);if(bridge.progress>=100){bridge.complete=true;toast(goal==='cubeBridge'?'北侧木桥完成，可以探索方块平台':'木桥完成！远岸的矿脉可以开发了');s.creatures.forEach(v=>{if(v.goal===goal){v.goal=null;v.route=null}})}}else{c.goal=null}continue}if(goal==='bath'&&s.creatures.some(v=>v.id!==c.id&&v.behavior==='washing'&&v.actionTime>0&&dist(v,c)<1.8)){c.behavior='idle';c.act='浴池有人，等一小会儿';continue}if(goal==='orchard')care(c,'feed',false,true);if(goal==='bath')care(c,'wash',false,true);if(goal==='play')care(c,'play',false,true);if(goal==='nest')care(c,'rest',false,true);continue}
   }else if(c.wait>0){c.wait-=dt;c.behavior='idle'}else if(dist(c,{x:c.tx,y:c.ty})<.15){c.wait=rand(1.2,3);const nx=clamp(c.x+rand(-2.3,2.3),1,N-2),ny=clamp(c.y+rand(-2.3,2.3),MIN_Y+1,MAP_H-2);if(terrain(Math.round(nx),Math.round(ny))==='grass'){c.tx=nx;c.ty=ny;c.route=null}c.act=stateOf(c).key==='neutral'?'好奇地四处张望':stateOf(c).label;c.behavior='idle'}
   if(c.wait<=0){
     const d=Math.hypot(c.tx-c.x,c.ty-c.y),moveSpeed=c.energy<25||c.health<35?.25:.57;
     if(d>.08){
       if(c.route?.length&&dist(c,c.route[0])<.13)c.route.shift();
       const dest=c.route?.[0]||{x:c.tx,y:c.ty},dd=dist(c,dest),step=Math.min(dd,dt*moveSpeed);
       if(dd>.001){const nx=c.x+(dest.x-c.x)/dd*step,ny=c.y+(dest.y-c.y)/dd*step;
         if(terrain(Math.round(nx),Math.round(ny))==='grass'){const dx=nx-c.x,dy=ny-c.y;c.facing=(Math.round(Math.atan2(dx-dy,-(dx+dy))*4/Math.PI)+8)%8;c.walkDistance=(c.walkDistance||0)+Math.hypot(dx,dy);c.x=nx;c.y=ny;c.behavior='walking'}
         else if(!c.route?.length)c.route=findRoute(c,{x:c.tx,y:c.ty});
         else{c.route=null;c.goal=null;c.tx=c.x;c.ty=c.y}
       }
     }
   }

   const songCycle=Math.floor(s.time/24);if(s.creatures.length>=4&&c.behavior==='idle'&&c.happy>70&&c.food>55&&c.clean>50&&c.energy>35&&Math.floor(s.time%24)===Math.floor(c.seed)%4&&c.sungCycle!==songCycle){c.sungCycle=songCycle;perform(c,'singing');sing(c)}
   if(c.behavior==='idle'&&c.wait>0&&c.wait<5&&c.food>55&&c.clean>55&&c.energy>35&&Math.floor(s.time%32)===8+c.id%4&&c.gestureCycle!==Math.floor(s.time/32)){c.gestureCycle=Math.floor(s.time/32);perform(c,s.creatures.length>1&&s.creatures.some(v=>v.id!==c.id&&dist(v,c)<3)?'talking':'thinking')}
   if(c.repro>80&&canSplit(c)&&s.time-s.autoAt>18){split(c,true);s.autoAt=s.time}
 }
 if(!s.creatures.length){if(!paused)toast('群落已消失。可在帮助中重新开始');paused=true;updatePauseIcon();$('dialogue').textContent='“世界安静了。也许可以重新开始。”'}
 if(s.creatures.length>=2&&s.stage<1){s.stage=1;toast('阶段02：学会一起生活')}
 if(s.creatures.length>=6&&s.buildings.some(b=>b.type==='bath')&&s.stage<2){s.stage=2;toast('阶段03：我们开始理解彼此')}
 if(s.creatures.length>=10&&s.buildings.some(b=>b.type==='orchard')&&s.stage<3){s.stage=3;toast('阶段04：一个声音，许多生命')}
 if(s.creatures.length>=16&&s.buildings.some(b=>b.type==='tower')&&!s.echo){s.echo=true;s.stage=4;toast('集体共鸣已开启。你创造了一个繁荣的群落。');beep(1000)}
}
function updateUI(){
 validatePlacement();
 updatePauseIcon();
 const c=currentCreature();if(c)selected=c.id;const st=stateOf(c);
 $('day').textContent='DAY '+String(1+Math.floor(s.time/120)).padStart(2,'0');$('phase').textContent=['初次接触','共同生活','自我照顾','集体思维','共鸣时代'][s.stage];$('population').textContent=s.creatures.length;$('population-badge').title=`${s.creatures.length}个体 / 容量${capacity()} · 查看状态`;$('weather').textContent=paused?'时间已暂停':s.storm>0?'风暴中 · 脏污加快':'生态系统运行中';
 for(const key of ['wood','gems','food','ore'])$(key).textContent=Math.floor(s[key]);
 $('expression-variant').value=c?.performanceVariant||'ABCDE'[((c?.id||1)-1+5)%5];$('selected-name').textContent=c?'THRONG #'+String(c.id).padStart(3,'0'):'没有存活个体';$('activity').textContent=c?c.act:'世界安静了';$('state-label').textContent=st.label;$('state-label').className='state-label '+st.tone;
 $('creature-index').textContent=c?`${s.creatures.findIndex(v=>v.id===c.id)+1} / ${s.creatures.length}`:'0 / 0';
 $('life-detail').textContent=c?`${c.age<18&&c.id>1?'幼体':'个体'} · 存活 ${Math.floor(c.age/60)}分${Math.floor(c.age%60)}秒`:'请选择重新开始';
 $('needs').innerHTML=[['food','饱食'],['clean','洁净'],['happy','愉悦'],['energy','精力'],['health','健康']].map(([key,label])=>{const n=Math.round(c?.[key]||0),color=n<30?'#bd5939':n<60?'#a18234':key==='clean'?'#428f8d':key==='energy'?'#788653':'#568047';return`<div class="need"><span>${label}</span><div class="meter" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><i style="width:${n}%;background:${color}"></i></div><b>${n}%</b></div>`}).join('');
 const warn=warnings(c);$('care-advice').textContent=!c?'群落已消失':!s.intro.done?'蛋落地、发光、裂开，然后它会跳出蛋壳':c.actionTime>0?({eating:'咀嚼时身体会轻轻晃动',washing:'按住它继续擦洗，直到泥污消失',playing:'玩球恢复愉悦，也会消耗精力',singing:'它们用断续的声音回应彼此',sleeping:'休息会恢复精力，喂食可唤醒',splitting:'一个生命，正在成为两个',newborn:'给新生命一点适应的时间'})[c.behavior]||c.act:warn.length?'需要关注：'+warn.join('、'):c.clean<75?'身上沾了一点泥，可以帮它洗洗':'状态良好，可以继续探索或繁衍';
 const count=s.creatures.filter(v=>warnings(v).length).length;$('colony-alert').textContent=count?`${count} 个体需要照顾 · 定位`:'所有个体状态稳定';$('colony-alert').classList.toggle('urgent',count>0);$('colony-alert').disabled=!count;
 $('split').disabled=!c;$('split-detail').textContent=c&&c.actionTime>0?'等待当前动作完成':'8 食物 · 2 晶石';
 document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===tool);b.setAttribute('aria-pressed',b.dataset.tool===tool);if(b.dataset.tool==='mop'){b.classList.toggle('locked',!s.mopUnlocked);b.title=s.mopUnlocked?'清除范围内地面、设施与个体污染':'出现工厂污染后解锁'}});
 document.querySelectorAll('[data-build]').forEach(b=>{const id=b.dataset.build,d=defs[id],availability=buildAvailability(id);b.classList.toggle('active',id===building);b.setAttribute('aria-pressed',id===building);b.setAttribute('aria-disabled',availability.state!=='available');b.dataset.availability=availability.state;b.classList.toggle('locked',availability.state==='locked');b.classList.toggle('insufficient',availability.state==='insufficient');b.title=availability.reason+'；'+d.desc;b.setAttribute('aria-label',d.name+'：'+availability.label);const info=b.querySelector?.('small');if(info)info.textContent=availability.label});
 const goals=[['照顾它，满足需要后分裂',c?Math.min(c.food/65,c.clean/60,c.happy/65,1):0],['6个体解锁浴池 · 先照顾和繁衍',(Math.min(6,s.creatures.length)/6+(s.buildings.some(b=>b.type==='bath')?1:0))/2],['10个体解锁苹果树 · 建巢扩大容量',(Math.min(10,s.creatures.length)/10+(s.buildings.some(b=>b.type==='orchard')?1:0))/2],['15个体解锁旋转木马 · 16个体建共鸣塔',(Math.min(16,s.creatures.length)/16+(s.buildings.some(b=>b.type==='tower')?1:0))/2],['共鸣已达成 · 继续照顾这个世界',1]];if(s.stage===4){if(!s.bridge.complete)goals[4]=['修通木桥，开发远岸矿脉',s.bridge.progress/100];else if(!s.buildings.some(b=>b.type==='factory'))goals[4]=['积累300晶石，建立第一座工厂',Math.min(1,(s.maxGems||s.gems)/300)];else if(s.pollution.some(p=>p.amount>5))goals[4]=['控制工业污染 · 拖洗地面，照顾个体',1-Math.min(1,s.pollution.reduce((a,p)=>a+p.amount,0)/500)];else goals[4]=['群落持续发展 · 在生产与环境之间平衡',1]}const g=goals[s.stage];$('goal').textContent=g[0];$('goal-progress').style.width=Math.min(100,g[1]*100)+'%';
 $('hint').textContent=!s.intro.done?'一个生命正在诞生…':tool==='build'?`点击空地放置${defs[building]?.name||'设施'} · Esc取消`:({inspect:'点击观察 · 拖起个体放到草地 · 空白处拖地图',pan:'拖动任意位置移动地图',throw:'投石：点击目标 · 消耗1矿石 · 先用采集敲灰色岩石',feed:'点击一个小家伙喂食 · 消耗2食物',wash:'点击清洁 · 按住身体连续擦洗',play:'点击玩球 · 愉悦+26，精力−5',harvest:'树木+3木/+1食物 · 岩石+3矿石',mop:'点击地面拖洗 · 同时清洁附近个体'})[tool];
 $('signal-level').textContent='LV.0'+(s.stage+1);if(s.creatures.length)$('dialogue').textContent=s.answered?['“谢谢。我们开始相信你了。”','“两双眼睛，看见同一个世界。”','“我们学会照顾自己。你呢？”','“我们是许多个体，也是一种声音。”','“你教会我们生长。我们选择共存。”'][s.stage]:['“这里很大。你会留下吗？”','“我们变多了。你还认得我们吗？”','“照顾，是一种可以学会的语言。”','“如果记忆相连，谁是第一个我？”','“边界还在，声音已经相连。”'][s.stage];$('respond').textContent=s.answered?'一起继续探索':'我会照顾你们';drawPortrait(c);drawBadge();updateIndustryUI();if(!$('map-panel').hidden)drawMap();
}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill()}
function tile(x,y,color,z=0){let p=project(x,y,z),k=scale();poly([[p.x,p.y-TH*k-.6],[p.x+TW*k+.6,p.y],[p.x,p.y+TH*k+.6],[p.x-TW*k-.6,p.y]],color)}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function tree(p,k,fruit=false,small=false){
 const q=k*(small?.7:1),x=p.x,y=p.y;
 const r=(a,b,w,h,c)=>rect(x+a*q,y+b*q,w*q,h*q,c);
 const blob=(cx,cy,w,h,color)=>{for(let a=-w/2;a<w/2;a+=4)for(let b=-h/2;b<h/2;b+=4)if((a*a)/(w*w/4)+(b*b)/(h*h/4)<1)r(cx+a,cy+b,4,4,color)};
 blob(1,3,52,17,'#144a3970');r(-7,-54,13,57,'#47654c');r(-7,-50,4,48,'#638367');r(4,-48,3,49,'#2b5341');r(-15,-54,8,6,'#3d664e');r(6,-63,9,7,'#3d664e');
 blob(-8,-54,44,46,'#145b40');blob(11,-70,44,49,'#175b40');blob(-4,-87,38,36,'#206d46');
 blob(-11,-60,38,41,'#31854e');blob(10,-75,36,44,'#348750');blob(-7,-89,31,30,'#409653');
 blob(-16,-69,23,23,'#52a75a');blob(6,-85,26,27,'#429b50');blob(-7,-97,17,14,'#69ad60');
 for(let i=0;i<13;i++){const a=((i*17)%43)-21,b=-45-((i*13)%46);r(a,b,4,5,i%3?'#246f44':'#4f9654')}
 if(fruit){for(const [a,b] of [[-15,-67],[10,-79],[-3,-48],[17,-59]]){r(a,b,6,7,'#b23b2f');r(a,b,4,3,'#e66540');r(a+3,b-2,2,2,'#435d35')}}
}
function rock(p,k){
 const blocks=[[-20,-3,24,25],[-2,-8,26,33],[14,2,19,21]];
 for(const [x,y,w,h] of blocks){poly([[p.x+x*k,p.y+y*k],[p.x+(x-3)*k,p.y+(y-h*.7)*k],[p.x+(x+w*.25)*k,p.y+(y-h)*k],[p.x+(x+w*.85)*k,p.y+(y-h*.86)*k],[p.x+(x+w)*k,p.y+(y-h*.3)*k],[p.x+(x+w*.8)*k,p.y+(y+3)*k]],'#234758');poly([[p.x+(x-3)*k,p.y+(y-h*.7)*k],[p.x+(x+w*.25)*k,p.y+(y-h)*k],[p.x+(x+w*.85)*k,p.y+(y-h*.86)*k],[p.x+(x+w*.38)*k,p.y+(y-h*.55)*k]],'#78a49e');rect(p.x+(x+w*.2)*k,p.y+(y-h*.6)*k,5*k,h*.45*k,'#4f8e8d');rect(p.x+(x+w*.2)*k,p.y+(y-h*.32)*k,10*k,4*k,'#6b9c95')}
}
// Animation timing is authored locally; direction follows actual traveled motion, including detours.
function poseOf(c,t){
 const state=stateOf(c).key,elapsed=Number.isFinite(c.actionClock)?c.actionClock:Math.max(0,(c.actionTotal||0)-(c.actionTime||0));
 const moving=c.behavior==='walking'&&c.actionTime<=0;
 const count=({eating:6,washing:6,playing:8,splitting:8,newborn:8})[state]||6;
 const progress=clamp(elapsed/Math.max(.01,c.actionTotal||1),0,1);
 const frame=moving?Math.floor((c.walkDistance||0)*8)%6:['splitting','newborn'].includes(state)?Math.min(count-1,Math.floor(progress*count)):Math.floor(elapsed*8)%count;
 return {state,frame,count,progress,elapsed,moving,facing:Number.isFinite(c.facing)?c.facing:4};
}
// Supplied source pixels are immutable. Authored completion sequences use a separate pack.
function authoredSelection(c,t,portrait=false){
 const pose=poseOf(c,t),state=pose.state,facing=portrait?4:pose.facing;
 let name=pose.moving?'walk_'+facing:c.hatchAir?'newborn':state;
 if(name==='neutral'||name==='happy'||c.behavior==='working')name=c.behavior==='working'?'working':'idle_'+facing;
 const aliases={stunned:'sick',starving:'hungry',filthy:'dirty',bored:'sad',hatching:'newborn'};
 if(!authoredSprites?.data.sequences[name])name=aliases[name]||'idle_'+facing;
 if(!authoredSprites?.data.sequences[name])name='idle_4';
 const seq=authoredSprites?.data.sequences[name];
 let ms=pose.moving?(c.walkDistance||0)/.75*(seq?.duration||800):c.actionTime>0?(c.actionClock||0)*1000:(t+(c.seed||0))*1000;
 let loop=pose.moving||c.actionTime<=0||['sleeping','washing','working'].includes(name);
 if(['splitting','newborn'].includes(name)&&c.actionTotal>0)ms=pose.progress*(seq?.duration||3000);
 return{name,ms,loop,pose};
}
function groundedShadow(context,x,y,k,wide=12){context.fillStyle='#15352960';context.beginPath();context.ellipse(x,y+2*k,wide*k,3*k,0,0,Math.PI*2);context.fill()}
function drawPlayBall(context,x,y,k,t){
 const by=t<5/30?-35*(1-t/(5/30)):t>47/30?-Math.max(0,Math.sin((t-47/30)*5))*18:0,bx=80+(t>47/30?(t-47/30)*37:0);
 groundedShadow(context,x+bx*k,y,k,9);
 for(let iy=-9;iy<=9;iy+=3)for(let ix=-9;ix<=9;ix+=3)if(ix*ix+iy*iy<115){context.fillStyle=ix<0&&iy>0?'#af491e':ix>0&&iy<0?'#f4d364':ix>0&&iy>0?'#5d90bd':'#ffffff';context.fillRect(Math.round(x+(bx+ix)*k),Math.round(y+(by-10+iy)*k),Math.ceil(3*k),Math.ceil(3*k))}
}
function pixelCreature(context,x,y,k,c,t,portrait=false){
 if(!s.intro.done&&c.id===1){drawHatch(context,x,y,k,s.intro.elapsed,portrait);return}if(c.behavior==='dead'){drawRemains(context,x,y,k);return}
 const sourceState=stateOf(c).key;
 let exact=null,exactTime=0,loop=false;
 if(c.actionTime>0&&c.nativeSequence&&nativeSprites?.data.sequences[c.nativeSequence]){exact=c.nativeSequence;exactTime=(c.actionClock||0)*1000}
 else if(!c.hatchAir&&c.behavior==='idle'&&c.actionTime<=0&&['neutral','happy'].includes(sourceState)&&(portrait||[3,4].includes(c.facing)||c.facing===undefined)){exact=sourceState==='happy'?'happy_nod_ThrongA_threequarter':'neutral';exactTime=(t+(c.seed||0))*1000;loop=true}
 const baby=c.age<18&&c.id>1&&!portrait ? .82 : 1;
 if(exact){if(!portrait&&!c.noShadow)groundedShadow(context,x,y,k*baby);nativeSprites.draw(context,exact,exactTime,x,y,k*40/34*baby,loop);return}
 const selection=authoredSelection(c,t,portrait),{name,ms,pose}=selection;
 const rootX=x,rootY=y;
 if(name==='playing'&&!portrait&&c.playMove!==false){const [dx,dy]=playOffset(pose.elapsed);x+=dx*k;y+=dy*k}
 if(!portrait&&!c.noShadow)groundedShadow(context,x,y,k*baby,name==='sleeping'?16:12);
 if(name==='playing'){const lift=pose.elapsed>=12/30&&pose.elapsed<15/30?9.1:pose.elapsed>=15/30&&pose.elapsed<18/30?32.7:0;y-=lift*k}
 let growth=name==='newborn'&&!portrait&&!c.hatchAir ? .25+.75*Math.min(1,pose.progress*1.7) : 1;
 if(authoredSprites)authoredSprites.draw(context,name,ms,x,y,k*40/34*baby*growth,selection.loop);
 else nativeSprites?.draw(context,'neutral',0,x,y,k*40/34*baby,false);
 if(name==='playing'&&!portrait)drawPlayBall(context,rootX,rootY,k,pose.elapsed);
}
function drawRemains(context,x,y,k){groundedShadow(context,x,y,k,17);if(authoredSprites)authoredSprites.draw(context,'dead',0,x,y,k*40/34,false)}
function drawShell(context,x,y,k){const r=(a,b,w,h,col)=>{context.fillStyle=col;context.fillRect(Math.round(x+a*k),Math.round(y+b*k),Math.ceil(w*k),Math.ceil(h*k))}; r(-13,-14,26,10,'#e2e8e2');r(-10,-5,21,7,'#c4d0ca');r(-8,1,15,3,'#a9b9b5');r(-13,-17,4,6,'#f6f7ed');r(-5,-14,5,4,'#f5f5e9');r(6,-16,7,6,'#f6f7ed');r(-17,2,5,3,'#c3d0c8');r(12,3,6,3,'#e0e8dc');}
function drawHatch(context,x,y,k,elapsed,portrait=false){
 const a=ANIMATION.hatch,t=clamp(elapsed,0,a.end),r=(xx,yy,w,h,col)=>{context.fillStyle=col;context.fillRect(Math.round(x+xx*k),Math.round(y+yy*k),Math.max(1,Math.ceil(w*k)),Math.max(1,Math.ceil(h*k)))};
 context.fillStyle='#1c302a80';context.beginPath();context.ellipse(x,y+3*k,12*k,3*k,0,0,Math.PI*2);context.fill();
 const drop=t<a.fall?-100*(1-t/a.fall):0,shake=t>=a.flash&&t<a.crack?Math.sin(t*55)*1.5:0;
 if(t<a.emerge){const tilt=t>=25/30&&t<26/30;if(tilt){context.save();context.translate(x,y);context.rotate(Math.PI/18);context.translate(-x,-y)}const er=(a,b,w,h,col)=>r(a*1.385,b*1.47+drop,w*1.385,h*1.47,col);const widths=[6,10,14,18,22,26,30,34,36,36,36,34,32,28,22,14];for(let row=0;row<widths.length;row++){const w=widths[row];r(-w/2+shake,-53+row*3.3+drop,w,4,row>12?'#bdc8c7':'#dde3df');if(row>1&&row<13)r(-w/2+3+shake,-53+row*3.3+drop,w*.48,4,'#eef0e8')}
 if(t>=a.glow&&t<a.crack){er(-14,-22,2,19,'#9ccadd');er(12,-22,2,19,'#9999d8');er(-9,1,18,2,'#a9a2dc')}
 if(t>=a.flash&&t<a.crack){const flash=Math.floor((t-a.flash)*24)%3;for(const [xx,yy,w,h] of [[2,-45,3,28],[-12,-31,31,3],[3,-52,1,6],[22,-31,5,1]])er(xx,yy-flash,w,h,'#fff8a7')}
 if(t>=a.crack){for(const [xx,yy,w,h] of [[0,-33,3,7],[-4,-28,7,3],[-6,-26,3,8],[-8,-20,10,3],[0,-21,3,10],[2,-15,5,3],[4,-13,3,8],[2,-26,8,3],[7,-24,3,5]])er(xx,yy,w,h,'#53605a')}if(tilt)context.restore();
 }else{
 const p=clamp((t-a.emerge)/(a.hop-a.emerge),0,1),frame=Math.max(0,Math.min(14,Math.floor((t-a.hop)*30+.0001))),lifts=[26.8,26.8,34.8,34.8,44.8,46,47.2,46,42,42,27.6,28,8.8,8.8,0];
 const positions=[[0,0],[0,0],[17.07,-16.53],[17.07,-16.53],[17.07,-16.53],[34.4,-21.33],[34.4,-21.6],[34.4,-21.6],[51.47,-26.4],[51.47,-26.4],[51.47,-26.13],[68.53,-31.2],[68.53,-30.93],[68.53,-30.93],[85.3,-35.2]],offsetX=t<a.hop?0:positions[frame][0],offsetY=t<a.hop?0:positions[frame][1],jump=t<a.hop?0:lifts[frame];
 if(t>=a.hop){context.fillStyle='#1c302a80';context.beginPath();context.ellipse(x+offsetX*k,y+offsetY*k+3*k,12*k,3*k,0,0,Math.PI*2);context.fill()}
 const c={id:0,age:100,food:80,clean:100,happy:75,health:100,energy:100,behavior:'newborn',actionTime:1,actionTotal:a.end-a.emerge,actionClock:Math.max(0,t-a.emerge),seed:1,facing:4,noShadow:true,hatchAir:true};if(t<a.hop){context.save();context.beginPath();context.rect(x-40*k,y-100*k,80*k,87*k);context.clip()}pixelCreature(context,x+offsetX*k,y+(offsetY-jump)*k,k,c,t,portrait);if(t<a.hop)context.restore();
 // Jagged lower shell remains on the ground as the creature emerges and hops out.
 drawShell(context,x,y,k);
 }
}
function drawStateBubble(c,p,k){
 const st=stateOf(c),warn=warnings(c);if(!warn.length&&($('detail-panel').hidden||c.id!==selected))return;
 const label=st.label,w=Math.max(38,label.length*12+14),bx=Math.round(p.x-w/2),by=Math.round(p.y-60*k-17);
 ctx.fillStyle=st.tone==='danger'?'#713e2e':'#263c2fea';ctx.fillRect(bx,by,w,21);ctx.fillStyle=st.tone==='danger'?'#ffba88':'#eedfb0';ctx.fillRect(p.x-2,by+21,4,3);ctx.font='12px "Noto Sans CJK SC", "Microsoft Yahei", sans-serif';ctx.textAlign='center';ctx.fillText(label,p.x,by+15);ctx.textAlign='start';
 if(c.id===selected&&!$('detail-panel').hidden){const vals=[c.food,c.clean,c.happy];vals.forEach((v,i)=>{const x=p.x-18+i*13;rect(x,p.y+11*k,11,3,'#2d4935');rect(x,p.y+11*k,11*v/100,3,v<30?'#e98757':['#e9c466','#7bd2c2','#b7d879'][i])})}
}
function structure(b,p,k,t){const r=(x,y,w,h,c)=>rect(p.x+x*k,p.y+y*k,w*k,h*k,c);tile(b.x,b.y,'#819663',1);if(b.type==='orchard'){tree({...p,x:p.x-9*k},k,true);tree({...p,x:p.x+16*k,y:p.y+7*k},k,true,true);r(-26,5,52,3,'#ad9360');r(-26,0,3,11,'#d0b774');r(23,0,3,11,'#d0b774')}if(b.type==='bath'){poly([[p.x-25*k,p.y-12*k],[p.x,p.y-24*k],[p.x+26*k,p.y-11*k],[p.x+26*k,p.y+1*k],[p.x,p.y+14*k],[p.x-25*k,p.y+1*k]],'#acbfa5');poly([[p.x-20*k,p.y-10*k],[p.x,p.y-19*k],[p.x+20*k,p.y-9*k],[p.x,p.y+1*k]],'#67b9af');r(-9,-9,12,2,'#bbecda');r(6,-5,6,2,'#a0d8cc')}if(b.type==='play'){r(-3,-47,6,45,'#a58b50');poly([[p.x-26*k,p.y-26*k],[p.x,p.y-49*k],[p.x+27*k,p.y-25*k]],'#ba7245');poly([[p.x,p.y-49*k],[p.x+8*k,p.y-25*k],[p.x-8*k,p.y-25*k]],'#e7ce74');r(-22,-25,3,26,'#846c40');r(20,-25,3,26,'#846c40');r(-26,0,53,6,'#cfba70');r(-19,-8,12,8,'#769d9a');r(9,-9,10,9,'#e5a066')}if(b.type==='nest'){r(-23,-29,46,32,'#ac8b52');r(2,-29,21,32,'#7f6a40');poly([[p.x-29*k,p.y-29*k],[p.x,p.y-54*k],[p.x+29*k,p.y-29*k]],'#ad6840');poly([[p.x,p.y-54*k],[p.x+29*k,p.y-29*k],[p.x+5*k,p.y-29*k]],'#7c5034');r(-8,-18,13,21,'#354532');r(-19,-20,7,8,'#ebd57a');r(12,-18,6,7,'#dac779')}if(b.type==='mine'){rock({...p,x:p.x-12*k},k);r(-10,-36,30,40,'#6d6550');r(-4,-30,18,32,'#243b31');r(-12,-38,34,6,'#a58a57');r(-13,-36,5,43,'#ae985f');r(18,-36,5,43,'#917949');r(0,-8,8,8,'#9ecbb0');r(6,-14,6,8,'#7bbaab')}if(b.type==='factory'){r(-26,-30,52,35,'#737573');r(1,-30,25,35,'#4e5b5b');poly([[p.x-29*k,p.y-30*k],[p.x-7*k,p.y-49*k],[p.x+29*k,p.y-30*k]],'#656073');r(-20,-27,13,10,'#d49c48');r(8,-27,12,10,'#d49c48');r(-6,-15,13,19,'#303d39');r(17,-63,9,36,'#827c72');r(15,-65,13,5,'#a49d85');if((b.level||1)===2){r(-24,-60,8,31,'#827c72');r(-26,-62,12,5,'#a49d85')}if(b.running!==false&&s.ore>0){for(let i=0;i<3;i++){const rise=(t*9+i*10)%32;r(15+Math.sin(t+i)*4,-67-rise,9+rise/4,7+rise/4,'#82748890')}}}if(pollutionAt(b)>20){r(-12,-14,9,5,'#8b648e');r(8,-21,7,5,'#74557e')}if(b.type==='tower'){r(-15,0,30,7,'#747d69');r(-10,-69,20,70,'#d7ddba');r(3,-69,7,70,'#8aaf9b');r(-15,-72,30,9,'#e6e7c7');r(-7,-49,5,16,'#294b3f');r(2,-29,5,19,'#294b3f');r(-5,-62,10,5,'#a5e2ae');if(s.echo&&s.buildings.some(b=>b.type==='tower')){ctx.strokeStyle='#c5efaf88';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y-78*k,(18+Math.sin(t*2)*4)*k,8*k,0,0,Math.PI*2);ctx.stroke()}}}
function drawCube(p,k,t){
 const yaw=t*.28,co=Math.cos(yaw),si=Math.sin(yaw),lift=Math.sin(t*1.8)*3;
 const vertex=(a,b,z)=>({x:p.x+(a*co+b*si)*k,y:p.y+(b*co-a*si)*.43*k-(z+12+lift)*k,depth:b*co-a*si});
 const vertices=[vertex(-18,-18,0),vertex(18,-18,0),vertex(18,18,0),vertex(-18,18,0),vertex(-18,-18,38),vertex(18,-18,38),vertex(18,18,38),vertex(-18,18,38)];
 const faces=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].sort((a,b)=>a.reduce((n,i)=>n+vertices[i].depth,0)-b.reduce((n,i)=>n+vertices[i].depth,0));faces.push([4,5,6,7]);
 for(const [index,face] of faces.entries()){const q=face.map(i=>vertices[i]);poly(q.map(v=>[v.x,v.y]),['#302a6f','#283c87','#35245f','#21486a','#494586'][index]);const point=(u,v)=>[q[0].x*(1-u)*(1-v)+q[1].x*u*(1-v)+q[2].x*u*v+q[3].x*(1-u)*v,q[0].y*(1-u)*(1-v)+q[1].y*u*(1-v)+q[2].y*u*v+q[3].y*(1-u)*v];for(let i=0;i<4;i++)for(let j=0;j<4;j++)if((i*7+j*3+index)%3===0){const u=.08+i*.22,v=.08+j*.22;poly([point(u,v),point(u+.14,v),point(u+.14,v+.14),point(u,v+.14)],['#4cdacb','#d563d7','#bacf61','#6760e4'][(i+j+Math.floor(t*2))%4])}ctx.strokeStyle='#dda1df';ctx.lineWidth=Math.max(1,k);ctx.beginPath();q.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.stroke()}
}

function draw(t){ctx.clearRect(0,0,size.w,size.h);ctx.fillStyle='#154b36';ctx.fillRect(0,0,size.w,size.h);const k=scale();for(let i=0;i<60;i++){let x=((i*173)%997)/997*size.w,y=((i*97)%631)/631*size.h;rect(x,y,2,1,'#345546')}
for(let sum=MIN_Y;sum<N+MAP_H;sum++)for(let x=0;x<N;x++){let y=sum-x;if(y<MIN_Y||y>=MAP_H)continue;const type=terrain(x,y);if(type==='void')continue;let p=project(x,y);if(terrain(x+1,y)==='void'||terrain(x,y+1)==='void'){poly([[p.x-TW*k,p.y],[p.x,p.y+TH*k],[p.x+TW*k,p.y],[p.x+TW*k,p.y+15*k],[p.x,p.y+(TH+15)*k],[p.x-TW*k,p.y+15*k]],'#25533d');}if(type==='water'){tile(x,y,['#14619a','#17588b','#1a65a3'][(x+y)%3]);const wave=Math.sin(t*1.4+x+y);rect(p.x-9*k+wave*2*k,p.y,13*k,2*k,'#367eb0')}else{tile(x,y,['#31764c','#3b8052','#347c4e','#408157'][(Math.floor(x/2)*7+Math.floor(y/2)*3)%4]);if((x*3+y*7)%5===0){rect(p.x-10*k,p.y,2*k,3*k,'#51905c');rect(p.x-6*k,p.y-2*k,2*k,4*k,'#296b44')}if((x*29+y*11)%29===0){rect(p.x+9*k,p.y,2*k,2*k,'#d3c57a');rect(p.x+13*k,p.y+1*k,2*k,2*k,'#e1dbaa')}}}
for(const n of nodes){const p=project(n.x,n.y);tile(n.x,n.y,'#557862');for(let i=0;i<4;i++)rect(p.x+(i*7-12)*k,p.y-(10+(i%2)*6)*k,5*k,(10+(i%2)*6)*k,['#8be3d0','#b6e5d1'][i%2])}
for(const p of s.pollution){tile(p.x,p.y,p.amount>60?'#715078':'#83728c',1);const q=project(p.x,p.y);rect(q.x-9*k,q.y,7*k,3*k,'#a28aba');rect(q.x+6*k,q.y-5*k,4*k,4*k,'#61475f')}
for(let x=21;x<=24;x++){const q=project(x,13);const built=s.bridge.complete||s.bridge.paid&&(x-21)/4<s.bridge.progress/100;if(built){tile(x,13,'#ae8954',3);rect(q.x-17*k,q.y-1*k,34*k,2*k,'#786041');rect(q.x-18*k,q.y-14*k,3*k,14*k,'#c4a268');rect(q.x+15*k,q.y-14*k,3*k,14*k,'#c4a268')}else{ctx.strokeStyle='#bdba8180';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(q.x-TW*k,q.y);ctx.lineTo(q.x+TW*k,q.y);ctx.stroke();ctx.setLineDash([])}}
if(s.bridge.complete)for(const y of [-4,-3,2,3]){tile(28,y,'#ad956c',2);const q=project(28,y);rect(q.x-16*k,q.y,32*k,2*k,'#6e5940')}
for(const x of [35,36])for(const y of [10,11]){tile(x,y,'#a8a083',2);const q=project(x,y);rect(q.x-14*k,q.y,28*k,2*k,'#766f5e')}
for(let y=-4;y<=0;y++){const p=project(6,y),built=s.cubeBridge.complete||s.cubeBridge.paid&&(0-y)/5<s.cubeBridge.progress/100;if(built){tile(6,y,'#ac905d',3);rect(p.x-18*k,p.y,36*k,2*k,'#6f5939');rect(p.x-17*k,p.y-12*k,3*k,13*k,'#c3a670');rect(p.x+15*k,p.y-12*k,3*k,13*k,'#c3a670')}else{ctx.strokeStyle='#b3bd7c70';ctx.beginPath();ctx.moveTo(p.x-14*k,p.y);ctx.lineTo(p.x+14*k,p.y);ctx.stroke()}}
if(s.echo&&s.buildings.some(b=>b.type==='tower')){ctx.strokeStyle='#dfed9b66';for(const c of s.creatures){let p=project(c.x,c.y),b=s.buildings.find(b=>b.type==='tower'),q=project(b.x,b.y,60);ctx.beginPath();ctx.moveTo(p.x,p.y-15*k);ctx.lineTo(q.x,q.y);ctx.stroke()}}
let drawables=[...s.objects.map(o=>({...o,kind:'object'})),...s.buildings.map(b=>({...b,kind:'building'})),{x:6,y:-6,kind:'cube'},...s.shells.map(c=>({...c,kind:'shell'})),...s.remains.map(c=>({...c,kind:'remains'})),...s.creatures.map(c=>({...c,kind:'creature'}))].sort((a,b)=>(a.x+a.y)-(b.x+b.y));for(const o of drawables){let p=project(o.x,o.y);if(o.kind==='object'){if(o.amount<=0){if(o.type==='tree'){rect(p.x-6*k,p.y-9*k,12*k,12*k,'#775c3e');rect(p.x-6*k,p.y-10*k,12*k,4*k,'#b49a66')}continue}if(o.type==='tree')tree(p,k,false,o.amount<3);else rock(p,k*(o.amount<3?.7:1))}if(o.kind==='shell'){drawShell(ctx,p.x,p.y,Math.max(.6,k*.72));continue}if(o.kind==='remains'){drawRemains(ctx,p.x,p.y,Math.max(.6,k*.72));continue}if(o.kind==='cube')drawCube(p,k,t);if(o.kind==='building')structure(o,p,k,t);if(o.kind==='creature'){if(drag?.lift===o.id&&drag.moved)continue;if(o.impactUntil>s.time)p.x+=Math.sin((o.impactUntil-s.time)*50)*3*k;if(o.id===selected&&!$('detail-panel').hidden){ctx.strokeStyle='#f4dfa0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+5*k,19*k,8*k,0,0,Math.PI*2);ctx.stroke()}if(o.behavior==='newborn'&&o.birthFrom){const birth=poseOf(o,t).progress,q=project(o.birthFrom.x,o.birthFrom.y);p.x=q.x+(p.x-q.x)*Math.min(1,birth*1.8);p.y=q.y+(p.y-q.y)*Math.min(1,birth*1.8)}pixelCreature(ctx,p.x,p.y,Math.max(.6,k*.72),o,t)}}
for(const c of s.creatures)if(s.intro.done&&!(drag?.lift===c.id&&drag.moved))drawStateBubble(c,visualPoint(c),Math.max(.6,k*.72));
drawInteractions(t,k);
for(const p of particles){const q=project(p.x,p.y);ctx.globalAlpha=clamp(p.life/p.max,0,1);const x=q.x+p.dx*k,y=q.y+p.dy*k;if(p.type==='water'){ctx.strokeStyle='#caf6ec';ctx.lineWidth=Math.max(1,k);ctx.strokeRect(x,y,p.size*k,p.size*k)}else rect(x,y,p.size*k,p.size*k,p.type==='crumb'?'#efba6b':p.type==='birth'?'#fff5ad':'#e9d97d');ctx.globalAlpha=1}
if(building&&hover){const x=Math.round(hover.x),y=Math.round(hover.y);if(terrain(x,y)==='grass'){ctx.globalAlpha=.65;tile(x,y,occupied(x,y)?'#c66a4c':'#d6d791',2);structure({type:building,x,y},project(x,y),k,t);ctx.globalAlpha=1}}
for(const e of effects){const p=project(e.x,e.y,40+(2-e.life)*12);ctx.globalAlpha=clamp(e.life,0,1);ctx.font=`bold ${Math.max(12,14*k)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#293d27';ctx.fillText(e.text,p.x+1,p.y+1);ctx.fillStyle=e.color;ctx.fillText(e.text,p.x,p.y);ctx.globalAlpha=1;ctx.textAlign='start'}
const night=(Math.sin(s.time/120*Math.PI*2-Math.PI/2)+1)/2;ctx.fillStyle=`rgba(12,28,43,${night*.17})`;ctx.fillRect(0,0,size.w,size.h);if(s.storm>0){ctx.fillStyle='#19384930';ctx.fillRect(0,0,size.w,size.h);ctx.strokeStyle='#c4dac45c';ctx.lineWidth=1;for(let i=0;i<70;i++){let x=(i*97+t*120)%size.w,y=(i*67+t*270)%size.h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+12);ctx.stroke()}}ctx.fillStyle='#0b251809';for(let y=0;y<size.h;y+=4)ctx.fillRect(0,y,size.w,1);
if(paused){ctx.fillStyle='#172e25ce';ctx.fillRect(size.w/2-66,size.h/2-20,132,40);ctx.fillStyle='#e5e8be';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText(s.creatures.length?'Ⅱ 世界已暂停':'世界已沉寂',size.w/2,size.h/2+5);ctx.textAlign='start'}}
function drawPortrait(c){pc.clearRect(0,0,120,100);if(c){if(!s.intro.done)drawHatch(pc,20,80,.75,s.intro.elapsed,true);else pixelCreature(pc,60,90,1.8,c,animationTime,true)}}
const animationNames={idle:'站立',walk:'行走',eating:'吃苹果',washing:'擦洗',playing:'玩球',sleeping:'睡眠',hungry:'饥饿',starving:'非常饥饿',sad:'难过',bored:'无聊',tired:'困倦',dirty:'脏污',filthy:'浑身脏污',sick:'虚弱',splitting:'分裂',newborn:'新生',working:'搬运',dead:'离世',hatch_emerge:'出壳',neutral:'平静',impactful_explanation:'解释',happy_nod:'点头',skeptical_toward_player:'怀疑',talk_to_other_thronglet:'交谈',deep_thoughts:'沉思',singing:'唱歌'};
const headingNames=['后方','右后','右侧','右前','正面','左前','左侧','左后'];
let animationPreview={key:'authored:walk_4',time:0,running:true};
function animationLabel(name){const heading=name.match(/^(idle|walk)_(\d)$/);if(heading)return animationNames[heading[1]]+' · '+headingNames[+heading[2]];const source=name.match(/^(.*)_Throng([A-E])_(front|threequarter)$/);if(source)return (animationNames[source[1]]||source[1])+' '+source[2]+' · '+(source[3]==='front'?'正面':'斜侧');return animationNames[name]||name}
$('animation-choice').innerHTML='<optgroup label="同风格补绘">'+Object.keys(authoredSprites?.data.sequences||{}).filter(name=>/^(idle|walk)_[0-7]$/.test(name)||(Object.hasOwn(animationNames,name)&&!['neutral','hatch_emerge'].includes(name))).map(name=>`<option value="authored:${name}">${animationLabel(name)}</option>`).join('')+'<option value="scene:hatching">完整孵化</option></optgroup><optgroup label="原始素材">'+Object.keys(nativeSprites.data.sequences).map(name=>`<option value="source:${name}">${animationLabel(name)}</option>`).join('')+'</optgroup>';
function previewDescriptor(){const[type,name]=animationPreview.key.split(':');const pack=type==='source'?nativeSprites:authoredSprites,seq=pack?.data.sequences[name];return{type,name,pack,seq,duration:type==='scene'?ANIMATION.hatch.end*1000:seq?.duration||1000}}
function drawAnimationPreview(dt=0){
 if(!$('animation-dialog').open)return;
 const d=previewDescriptor();if(animationPreview.running)animationPreview.time=(animationPreview.time+dt*1000)%d.duration;
 const cv=$('animation-canvas'),context=cv.getContext('2d');context.clearRect(0,0,360,280);context.fillStyle='#294338';context.fillRect(0,0,360,280);context.fillStyle='#365341';for(let y=0;y<280;y+=20)for(let x=0;x<360;x+=20)if((x+y)%40===0)context.fillRect(x,y,20,20);
 context.fillStyle='#577157';context.fillRect(0,237,360,1);
 if(d.type==='scene')drawHatch(context,80,235,1.65,animationPreview.time/1000,true);else d.pack?.draw(context,d.name,animationPreview.time,180,235,5,false);
 const frame=d.type==='scene'?{index:Math.floor(animationPreview.time*30/1000)}:d.pack?.frameAt(d.name,animationPreview.time,false);
 $('animation-origin').textContent=d.type==='source'?'原始素材 · 保留原像素与逐帧时长':'同风格补绘 · 沿用提供的角色造型与配色';
 $('animation-counter').textContent=`第 ${(frame?.index||0)+1} / ${d.seq?.frames.length||48} 帧 · ${Math.round(animationPreview.time)} / ${Math.round(d.duration)} ms`;
 $('animation-scrub').max=Math.max(1,Math.ceil(d.duration)-1);$('animation-scrub').value=Math.round(animationPreview.time);$('animation-toggle').textContent=animationPreview.running?'暂停':'播放';
}
$('open-animations').onclick=()=>{$('animation-dialog').showModal();$('animation-choice').value=animationPreview.key;drawAnimationPreview()};
$('close-animations').onclick=()=>$('animation-dialog').close();
$('animation-choice').onchange=e=>{animationPreview.key=e.target.value;animationPreview.time=0;drawAnimationPreview()};
$('animation-toggle').onclick=()=>{animationPreview.running=!animationPreview.running;drawAnimationPreview()};
$('animation-scrub').oninput=e=>{animationPreview.running=false;animationPreview.time=clamp(Number(e.target.value)||0,0,previewDescriptor().duration-.001);drawAnimationPreview()};
$('animation-step').onclick=()=>{animationPreview.running=false;const d=previewDescriptor();if(d.seq){const frame=d.pack.frameAt(d.name,animationPreview.time,false),next=(frame.index+1)%d.seq.frames.length;animationPreview.time=d.seq.durations.slice(0,next).reduce((a,b)=>a+b,0)}else animationPreview.time=(Math.floor(animationPreview.time*30/1000)+1)*1000/30%d.duration;drawAnimationPreview()};
function frame(now){const dt=Math.min(.08,(now-last)/1000||0);last=now;if(!paused&&!document.hidden&&!document.querySelector('dialog[open]'))update(dt*speed);if(!paused&&!document.hidden&&!document.querySelector('dialog[open]')){effects.forEach(e=>e.life-=dt);effects=effects.filter(e=>e.life>0);particles.forEach(p=>{p.life-=dt;p.dx+=p.vx*dt;p.dy+=p.vy*dt;if(p.type==='water'||p.type==='crumb')p.vy+=35*dt});particles=particles.filter(p=>p.life>0)}draw(animationTime);drawPortrait(currentCreature());drawAnimationPreview(dt);uiClock+=dt;saveClock+=dt;if(uiClock>.25){updateUI();uiClock=0}if(saveClock>8){save();saveClock=0}requestAnimationFrame(frame)}
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelGesture();save()}});resize();updateUI();requestAnimationFrame(frame);
// Deterministic QA surface: no network or external model calls.
window.Thronglets={buildAvailability,selectBuilding,interactionState:()=>({building,holding:drag?.lift||null,moved:!!drag?.moved,shots:shots.length,tool,pan:{...pan}}),dropAllowed:(x,y,id=1)=>dropAllowed({x,y},s.creatures.find(c=>c.id===id)),previewState:()=>({...animationPreview}),previewDescriptor,drawAnimationPreview,authoredSelection,authoredSprites,perform:(id,action)=>perform(s.creatures.find(c=>c.id===id),action),nativeFrame:(name,ms,loop)=>nativeSprites.frameAt(name,ms,loop),playOffset,animationSpec:ANIMATION,drawHatch,terrain,findRoute,focusPoint,poseOf,drawSprite:pixelCreature,getState:()=>JSON.parse(JSON.stringify(s)),advance:n=>{for(let i=0;i<n*10;i++)update(.1);updateUI()},selectTool:setTool,worldPoint:(x,y)=>project(x,y),actAt:(x,y)=>action(project(x,y)),reset:()=>{s=initial();selectedBuilding=null;selected=1;paused=false;updateUI()},split:()=>split(s.creatures.find(c=>c.id===selected)||s.creatures[0]),stateOf:id=>stateOf(s.creatures.find(c=>c.id===id)),care:(id,kind)=>care(s.creatures.find(c=>c.id===id),kind),get paused(){return paused},get speed(){return speed}};
})();
