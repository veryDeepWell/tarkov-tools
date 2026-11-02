const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto');
const expected=require('./fixtures/keyPic.expected.json');
const {browserSession,fixtureAPI,root}=require('./helpers.cjs');
const out=path.join(root,'artifacts/tests');fs.mkdirSync(out,{recursive:true});

test('Edge: screenshot OCR and prestige workflow', {timeout:180000},async t=>{
  const s=await browserSession(); t.after(()=>s.close());const fixture=await fixtureAPI(s.context);
  await s.context.addInitScript(base=>{window.TarkovOCRConfig={script:base+'/__deps/tesseract.js/dist/tesseract.min.js',worker:{workerPath:base+'/__deps/tesseract.js/dist/worker.min.js',corePath:base+'/__deps/tesseract.js-core',langPath:base+'/tests/fixtures/ocr-models',cacheMethod:'none'}};},s.base);
  await t.test('keyPic.png uses real OCR and catalogue resolution', {timeout:90000},async()=>{
    await s.page.goto(s.base+'/tools/tarkovtool-key-analyzer.html');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,expected.image))).digest('hex'),expected.sha256,'fixture changed without updating its annotation');
    await s.page.locator('#loadCatalogBtn').click();await s.page.waitForFunction(()=>!document.querySelector('#loadCatalogBtn').disabled);
    await s.page.locator('#file').setInputFiles(path.join(root,'tests/keyPic.png'));
    const prepared=await s.page.evaluate(async url=>{const p=await TarkovKeyOCR.prepare(await(await fetch(url)).blob());return {grid:p.grid,cells:p.cells.length};},s.base+'/tests/keyPic.png');
    assert.equal(prepared.cells,48);assert.equal(prepared.grid.cols,11);
    await s.page.locator('#ocrBtn').click();await s.page.waitForFunction(()=>!document.querySelector('#ocrBtn').disabled,null,{timeout:90000});
    const result=await s.page.evaluate(()=>({status:document.querySelector('#status').textContent,text:document.querySelector('#ocrText').value,raw:document.querySelector('#ocrRaw').textContent,rows:[...document.querySelectorAll('#kaBody tr')].map(tr=>({id:tr.querySelector('[data-item-id]')?.dataset.itemId,text:tr.innerText}))}));
    fs.writeFileSync(path.join(out,'key-result.json'),JSON.stringify(result,null,2));
    const resolved=await s.page.evaluate(({text,items})=>text.split('\n').map(line=>TarkovKeyMatch.best(line,items,false)?.item.slug||null),{text:result.text,items:fixture.items.filter(i=>i.types.includes('keys')).map(i=>({slug:i.normalizedName,name:i.shortName,aliases:[i.name,i.shortName]}))});
    assert.equal(resolved.length,expected.slugs.length);
    for(let i=0;i<resolved.length;i++)if(resolved[i])assert.equal(resolved[i],expected.slugs[i],'wrong key in screenshot cell '+i);
    assert.ok(resolved.filter(Boolean).length>=expected.minimumResolved,'OCR coverage regressed');
    for (const image of await s.page.locator('#kaBody img').all()) await image.scrollIntoViewIfNeeded();
    await s.page.waitForFunction(()=>[...document.querySelectorAll('#kaBody img')].every(i=>i.complete&&i.naturalWidth>0));
    await s.page.evaluate(()=>scrollTo(0,0));
    await s.page.screenshot({path:path.join(out,'key-analyzer.png'),fullPage:true});
    assert.ok(result.raw.length>100,'actual OCR result missing');assert.ok(result.rows.length>=30,'too few recognizable screenshot labels: '+result.status);
    for(const slug of ['dorm-room-108-key','dorm-room-206-key','dorm-room-214-key','dorm-room-220-key','tarcone-directors-office-key','terragroup-labs-keycard-yellow','terragroup-labs-keycard-black']){
      const id=fixture.items.find(i=>i.normalizedName===slug)?.id;assert.ok(result.rows.some(r=>r.id===id),'missing '+slug);
    }
    const duplicate=fixture.items.find(i=>i.normalizedName==='dorm-room-108-key').id;
    assert.match(result.rows.find(r=>r.id===duplicate).text,/\t2\t/,'two physical copies lost');
    assert.ok(!result.rows.some(r=>r.id===fixture.items.find(i=>i.normalizedName==='terragroup-labs-access-keycard').id),'ambiguous access labels were guessed');
  });
  await t.test('prestige uses real fixture images and excludes unknown-level dogtags',async()=>{
    await s.page.goto(s.base+'/tools/tarkovtool-prestige.html');await s.page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Данные загружены'));
    await s.page.locator('#btnAssemble').click();await s.page.locator('#optRun').click();
    await s.page.waitForSelector('.tt-igrid-item');await s.page.locator('.tt-igrid-item .tt-ig-icon').first().waitFor();
    await s.page.waitForFunction(()=>[...document.querySelectorAll('.tt-ig-icon')].every(i=>i.complete));
    const rows=await s.page.locator('.tt-igrid-item').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.itemId,name:n.dataset.itemName,icon:n.querySelector('img')?.naturalWidth,fallback:n.querySelector('img')?.dataset.fallback})));
    assert.ok(rows.length>5);assert.ok(rows.every(r=>!fixture.items.find(i=>i.id===r.id)?.normalizedName.includes('dogtag')));
    const valid=await s.page.evaluate(({rows,rules})=>rows.every(row=>TarkovPrestige.allowed(TarkovData.get('item',row.id),TarkovPrestige.rule(rules,6))),{rows,rules:fixture.prestige});
    assert.equal(valid,true,'optimizer ignored server transfer restrictions');
    assert.ok(rows.every(r=>r.icon>0&&!r.fallback),'missing actual item imagery: '+JSON.stringify(rows.filter(r=>!r.icon||r.fallback)));
    await s.page.screenshot({path:path.join(out,'prestige.png'),fullPage:true});
  });
  await t.test('grid: collision, cancellation, rotation, outside drop and resize preserve inventory',async()=>{
    await s.page.evaluate(()=>{
      document.body.innerHTML='<div id="grid"></div>';
      window.g=TarkovItemGrid.create(document.querySelector('#grid'),{cols:3,rows:3,cellSize:64});
      g.addItem({id:'a',name:'A',w:1,h:2},0,0);g.addItem({id:'b',name:'B',w:1,h:2},1,0);g.addItem({id:'c',name:'C',w:1,h:1},2,2);
    });
    const snapshot=()=>s.page.evaluate(()=>g.getItems().map(({id,x,y,w,h})=>({id,x,y,w,h})));
    const original=await snapshot();
    assert.ok(await s.page.locator('#grid button').evaluateAll(nodes=>nodes.every(b=>b.getBoundingClientRect().width<=20&&b.getBoundingClientRect().height<=20)),'global button styles cover the inventory');
    const board=await s.page.locator('.tt-igrid-board').boundingBox();
    async function drag(dx,dy,cancel=false){
      const box=await s.page.locator('[data-item-id="a"]').boundingBox();await s.page.mouse.move(box.x+20,box.y+30);await s.page.mouse.down();
      await s.page.mouse.move(board.x+2+dx*64+20,board.y+2+dy*64+30,{steps:5});
      if(cancel)await s.page.locator('[data-item-id="a"]').dispatchEvent('pointercancel',{pointerId:1});
      await s.page.mouse.up();
    }
    await drag(1,0);assert.deepEqual(await snapshot(),original,'collision mutated state');
    await drag(4,0);assert.deepEqual(await snapshot(),original,'outside drop mutated state');
    await drag(2,0,true);assert.deepEqual(await snapshot(),original,'cancel committed drag');
    await drag(2,0);assert.equal((await snapshot())[0].x,2);
    await s.page.keyboard.press('r');const rotated=(await snapshot())[0];assert.equal(rotated.w,2);assert.equal(rotated.h,1);
    const before=await snapshot();assert.equal(await s.page.evaluate(()=>g.setSize(1,1)),false);assert.deepEqual(await snapshot(),before,'resize silently deleted items');
    await s.page.screenshot({path:path.join(out,'grid-interaction.png')});
  });
  assert.deepEqual(s.errors,[],'uncaught browser errors');
  assert.deepEqual(s.unexpectedRequests,[],'tests attempted external network access');
});
