const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765');
  await page.locator('#start-btn').click();await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>G.state),'play');
  const pos=()=>page.evaluate(()=>({x:player.x,y:player.y}));
  if(!mobile){
   const a=await pos();await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.up('KeyW');const b=await pos();assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>0.1);
   await page.keyboard.down('Shift');await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>player.crouch),true);await page.keyboard.up('Shift');
   await page.mouse.click(620,330);assert.ok(await page.evaluate(()=>player.cdBaton>0));
   await page.mouse.click(620,330,{button:'right'});assert.ok(await page.evaluate(()=>player.cdLure>0));
   await page.keyboard.press('KeyF');assert.ok(await page.evaluate(()=>player.cdScan>0));
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>G.state),'paused');await page.keyboard.press('Escape');
   results.push('Desktop: WASD, hold crouch, mouse baton/lure, scan, pause/resume PASS');
  }else{
   const cdp=await context.newCDPSession(page);
   const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
   const r=await page.locator('#joystick').boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
   const a=await pos();await touch('touchStart',[[1,x,y]]);await touch('touchMove',[[1,x,y-42]]);await page.waitForTimeout(180);
   const scan=await page.locator('[data-action=scan]').boundingBox();await touch('touchStart',[[1,x,y-42],[2,scan.x+30,scan.y+24]]);await page.waitForTimeout(60);
   assert.ok(await page.evaluate(()=>player.cdScan>0));const b=await pos();assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>0.1);
   await touch('touchEnd',[]);await page.waitForTimeout(80);assert.deepEqual(await page.evaluate(()=>Input.axis),{x:0,y:0});
   await page.locator('[data-action=crouch]').tap();await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>player.crouch),true);
   await page.touchscreen.tap(420,200);assert.equal(await page.evaluate(()=>mouse.on),true);assert.equal(await page.evaluate(()=>player.cdBaton),0);
   await page.locator('[data-action=lure]').tap();assert.ok(await page.evaluate(()=>player.cdLure>0));
   await page.locator('[data-action=baton]').tap();assert.ok(await page.evaluate(()=>player.cdBaton>0));
   await page.locator('[data-action=pause]').tap();assert.equal(await page.evaluate(()=>G.state),'paused');await page.locator('#resume-btn').tap();
   await touch('touchStart',[[1,x,y-40]]);await touch('touchCancel',[]);assert.deepEqual(await page.evaluate(()=>Input.axis),{x:0,y:0});
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>G.state),'paused');assert.ok(await page.locator('#rotate-notice').isVisible());
   await page.setViewportSize({width:844,height:390});await page.locator('#resume-btn').tap();
   // Controlled fixtures exercise original interactions without a full campaign traversal.
   await page.evaluate(()=>{const q=L.props.find(q=>q.act==='container');player.x=q.x+.5;player.y=q.y+1.5;});
   await page.locator('[data-action=interact]').tap();assert.ok(await page.evaluate(()=>G.stats.searched>0));await page.evaluate(()=>closeModals());
   await page.evaluate(()=>openBench());await page.waitForTimeout(70);assert.ok(await page.locator('#bench-close').isVisible());await page.locator('#bench-close').tap();
   await page.evaluate(()=>{player.wires=2;player.relays=1;G.modal='term';Puzzle.open(player,{onClose:()=>G.modal=null,onSolved:onHack});});
   for(let i=0;i<3;i++)await page.locator(`#pcb .gap[data-i="${i}"]`).tap();
   assert.equal(await page.locator('#s1-state').textContent(),'3/3');
   await page.locator('#sl-freq').scrollIntoViewIfNeeded();const sl=await page.locator('#sl-freq').boundingBox();await page.touchscreen.tap(sl.x+sl.width*.6,sl.y+sl.height/2);assert.notEqual(await page.locator('#sl-freq').inputValue(),'2');
   await page.locator('#term-close').tap();assert.equal(await page.evaluate(()=>G.modal),null);
   await page.screenshot({path:'/tmp/null-mobile.png'});
   results.push('Mobile: real emulated multi-touch move+scan, release/cancel, crouch, aim without accidental attack, lure/baton, pause, rotate, container, bench close, puzzle solder+slider+abort PASS');
  }
  assert.deepEqual(errors,[]);results.push((mobile?'Mobile':'Desktop')+': no uncaught JS errors');await context.close();
 }
 console.log(results.join('\n'));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
