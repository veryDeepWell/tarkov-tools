const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {browserSession,fixtureAPI,root}=require('./helpers.cjs');
const out=path.join(root,'artifacts/tests');fs.mkdirSync(out,{recursive:true});

test('hub: card geometry and repeated profile/API interactions', {timeout:60000}, async t=>{
  const s=await browserSession();t.after(()=>s.close());const fixture=await fixtureAPI(s.context);
  await s.page.goto(s.base+'/tarkovtool-hub.html');await s.page.waitForSelector('.tool');
  for(const width of [1440,390]){
    await s.page.setViewportSize({width,height:1000});
    const invalid=await s.page.locator('.tool').evaluateAll(cards=>{
      const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      return cards.flatMap(card=>{
        const box=card.getBoundingClientRect(),title=card.querySelector('h2').getBoundingClientRect(),copy=card.querySelector('.tool-copy').getBoundingClientRect();
        return [...card.querySelectorAll('.tool-help,.tool-pin')].filter(button=>{
          const b=button.getBoundingClientRect();return b.width>33||b.height>33||b.left<box.left||b.right>box.right||overlaps(b,title)||overlaps(b,copy);
        }).map(button=>({title:card.querySelector('h2').textContent,button:button.className}));
      });
    });assert.deepEqual(invalid,[],'hub controls overlap card text at '+width);
    await s.page.screenshot({path:path.join(out,'hub-'+width+'.png'),fullPage:width===390});
  }
  await s.page.setViewportSize({width:1440,height:1000});
  await s.page.evaluate(()=>openToolAsMini('tools/tarkovtool-ammo.html'));
  await s.page.waitForFunction(()=>!!document.querySelector('iframe[data-tool="tools/tarkovtool-ammo.html"]')?.contentWindow?.TarkovProfile);
  const ammo=s.page.frames().find(f=>f.url().includes('tarkovtool-ammo.html'));
  await ammo.waitForFunction(()=>window.TarkovProfile&&window.__ttToolShellLoaded);
  // Profile refreshes must synchronize values without accumulating change listeners.
  await ammo.evaluate(async()=>{
    for(let i=0;i<8;i++){TarkovProfile.flushRefresh({reason:'regression'});await new Promise(r=>setTimeout(r,0));}
    window.profileChanges=0;TarkovProfile.subscribe(event=>{if(event.type==='change')window.profileChanges++;});
  });
  await ammo.locator('#gameMode').selectOption('regular');
  await ammo.evaluate(()=>new Promise(r=>setTimeout(r,30)));
  assert.equal(await ammo.evaluate(()=>window.profileChanges),1,'one mode change triggered multiple profile updates');
  await ammo.locator('#gameMode').selectOption('pve');
  // Catalogue-sized input and a populated profile expose accidental per-row JSON parsing.
  const items=Array.from({length:5500},(_,i)=>Object.assign({},fixture.items[0],{id:i.toString(16).padStart(24,'0')}));
  let requests=0;
  await s.context.route('https://json.tarkov.dev/pve/items',route=>{requests++;return route.fulfill({contentType:'application/json',body:JSON.stringify({data:{items}})});});
  const result=await ammo.evaluate(async()=>{
    TarkovProfile.update({notes:{hideout:'notes '.repeat(20000)},quests:{completed:Array.from({length:500},(_,i)=>'quest-'+i)}});
    await new Promise(r=>setTimeout(r,30));
    let reads=0;const old=TarkovProfile.preferredGameMode;TarkovProfile.preferredGameMode=function(){reads++;return old.apply(this,arguments);};
    const start=performance.now();const items=await TarkovAPI.items('pve');
    TarkovProfile.preferredGameMode=old;
    return {reads,count:items.length,ms:performance.now()-start};
  });
  assert.equal(result.count,5500);assert.ok(result.reads<=4,'profile was parsed for catalogue rows: '+result.reads);
  await s.page.evaluate(()=>openToolAsMini('tools/tarkovtool-armor.html'));
  let armor;
  await s.page.waitForFunction(()=>!!document.querySelector('iframe[data-tool="tools/tarkovtool-armor.html"]')?.contentWindow?.TarkovAPI);
  armor=s.page.frames().find(f=>f.url().includes('tarkovtool-armor.html'));
  assert.equal(await armor.evaluate(async()=>(await TarkovAPI.items('pve')).length),5500);
  assert.equal(requests,1,'iframes downloaded/parsed their own copy of the raw catalogue');
  await armor.evaluate(()=>TarkovAPI.clearCache());
  await ammo.evaluate(()=>TarkovAPI.items('pve'));
  assert.equal(requests,2,'clearing an iframe cache did not clear its shared transport');
  await s.page.evaluate(()=>openToolAsMini('tools/tarkovtool-ammo.html'));
  await ammo.locator('#loadBtn').click();await ammo.waitForFunction(()=>!document.querySelector('#loadBtn').disabled);
  // A subsequent host interaction must remain usable after loading data in multiple tools.
  await s.page.locator('#tt-open-settings').click();
  assert.deepEqual(s.errors,[]);
  fs.writeFileSync(path.join(out,'hub-load.json'),JSON.stringify({result,requests,errors:s.errors},null,2));
});
