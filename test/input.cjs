// Dependency-free logic regression; DOM/canvas are stubs, NOT a browser test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const noop=()=>{};
function element(id=''){
 const classes=new Set(),listeners={},capture=new Set();
 return {id,style:{},dataset:{},children:[],classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,v)=>{v=v??!classes.has(x);v?classes.add(x):classes.delete(x);return v}},
 addEventListener:(t,f)=>(listeners[t]??=[]).push(f),fire(t,e={}){for(const f of listeners[t]||[])f({preventDefault:noop,pointerType:'touch',...e});},
 setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),releasePointerCapture:id=>capture.delete(id),
 getBoundingClientRect:()=>({left:0,top:0,width:124,height:124}),setAttribute:noop,appendChild:noop,removeChild:noop,remove:noop,
 querySelector:()=>element(),querySelectorAll:()=>[],getContext:()=>new Proxy({measureText:()=>({width:30}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop})};
}
const els=new Map(),get=id=>{if(!els.has(id))els.set(id,element(id));return els.get(id)};
const buttons=['scan','lure','baton','crouch','interact','pause','map','zoomIn','zoomOut'].map(a=>{const e=element();e.dataset.action=a;return e});get('mobile-controls').querySelectorAll=()=>buttons;
const w=element();Object.assign(w,{innerWidth:844,innerHeight:390,devicePixelRatio:1});
const sandbox={console,Math,Float32Array,Int32Array,Int16Array,Uint8Array,performance:{now:()=>0},setTimeout:()=>0,clearTimeout:noop,setInterval:()=>0,requestAnimationFrame:noop,cancelAnimationFrame:noop,window:w,innerWidth:844,innerHeight:390,navigator:{maxTouchPoints:1},matchMedia:()=>({matches:true}),document:Object.assign(element(),{getElementById:get,createElement:element,createElementNS:(_,tag)=>element(tag),querySelector:()=>element(),querySelectorAll:()=>[],body:element()})};
const c=vm.createContext(sandbox);const run=s=>vm.runInContext(s,c);const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const [,f]of html.matchAll(/<script src="([^"]+)"/g))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
run('startGame();Mobile.sync()');assert.equal(run('G.state'),'play');
// Move at an open spawn corridor using real updatePlayer; compare desktop and touch speed.
run('keys.KeyW=true');const original=run('({x:player.x,y:player.y})');run('updatePlayer(.05)');const distance=run(`Math.hypot(player.x-${original.x},player.y-${original.y})`);assert.ok(distance>0);
run(`player.x=${original.x};player.y=${original.y};Input.clear();Input.axis.y=-1;updatePlayer(.05)`);assert.ok(Math.abs(run(`Math.hypot(player.x-${original.x},player.y-${original.y})`)-distance)<1e-9);
run('Input.clear();keys.ShiftLeft=true;updatePlayer(.01)');assert.equal(run('player.crouch'),true);run('Input.clear()');
get('joystick').fire('pointerdown',{pointerId:1,clientX:62,clientY:20});assert.ok(run('Input.axis.y<0'));
buttons.find(b=>b.dataset.action==='scan').fire('pointerdown',{pointerId:2});assert.ok(run('player.cdScan>0'));assert.ok(run('Input.axis.y<0'));
get('joystick').fire('pointercancel',{pointerId:1});assert.equal(run('Input.axis.y'),0);
buttons.find(b=>b.dataset.action==='crouch').fire('pointerdown');run('updatePlayer(.01)');assert.equal(run('player.crouch'),true);
get('game').fire('pointerdown',{pointerId:3,clientX:420,clientY:200});assert.equal(run('mouse.on'),true);assert.equal(run('player.cdBaton'),0);
buttons.find(b=>b.dataset.action==='lure').fire('pointerdown');assert.ok(run('player.cdLure>0'));const n=run('bolts.length');run("Input.perform('lure')");assert.equal(run('bolts.length'),n);
buttons.find(b=>b.dataset.action==='baton').fire('pointerdown');assert.ok(run('player.cdBaton>0'));
run("G.modal='log';Mobile.sync();Input.perform('scan')");assert.equal(run('Input.axis.y'),0);assert.ok(get('mobile-controls').classList.contains('hidden'));
run("G.modal=null;Mobile.sync();Input.perform('pause')");assert.equal(run('G.state'),'paused');run('setPaused(false)');
c.innerWidth=390;c.innerHeight=844;run('Mobile.sync()');assert.equal(run('G.state'),'paused');assert.equal(get('rotate-notice').classList.contains('hidden'),false);
c.innerWidth=844;c.innerHeight=390;run('Mobile.sync();setPaused(false);Mobile.sync()');
get('joystick').fire('pointerdown',{pointerId:4,clientX:100,clientY:62});w.fire('blur');assert.equal(run('Input.axis.x'),0);assert.equal(run('G.state'),'paused');
console.log('PASS: all 12 game scripts boot; shared dispatch; desktop/touch speed parity; SHIFT; simultaneous move/scan; pointercancel; crouch toggle; aim without baton; lure cooldown; baton; modal reset; pause/resume; portrait pause; blur reset. DOM/canvas mocked.');
