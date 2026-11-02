const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const fixture=require('./fixtures/catalog.json');
function domain(){const c={};c.window=c;vm.createContext(c);for(const file of ['tarkov-data','tarkov-item-media','tarkov-key-match','tarkov-prestige'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../core',file+'.js'),'utf8'),c);return c;}
const keyCatalog=fixture.items.filter(i=>i.types.includes('keys')).map(i=>({id:i.id,slug:i.normalizedName,name:i.shortName,aliases:[i.name,i.shortName]}));
test('matching retains uncertainty, exact numbers, localized and English aliases',()=>{
  const m=domain().TarkovKeyMatch;
  for(const text of ['key','room','ключ','Доступ','Даступ','Времянка','Общ 999'])assert.equal(m.best(text,keyCatalog,true),null,text);
  for(const [text,slug] of [['Общ 2@6','dorm-room-206-key'],['Сан104,3','health-resort-west-wing-office-room-104-key'],['Dorm room 114 key','dorm-room-114-key']])
    assert.equal(m.best(text,keyCatalog,true)?.item.slug,slug);
});
test('find and give are one demand; a set of alternatives is one choice',()=>{
  const p=domain().TarkovPrestige;
  const tasks=[{id:'q',minPlayerLevel:1,objectives:[{type:'findItem',count:3,items:['a','b']},{type:'giveItem',count:3,items:['a','b']}]}];
  const d=p.demands(tasks,15);assert.equal(d.length,1);assert.equal(d[0].qty,3);
  const items=['a','b'].map(id=>({id,width:1,height:1,avg24hPrice:10,categories:['food']}));
  const rule={itemFilters:{allowedCategories:['food']}};
  assert.equal(p.plan(items,tasks,{cols:8,rows:8,focus:'quests',rule}).length,3);
  const other={id:'q2',objectives:[{type:'giveItem',count:2,items:['a','b']}]};
  assert.equal(p.plan(items,[...tasks,other],{cols:8,rows:8,focus:'quests',rule}).length,5,'one instance paid multiple quests');
});
test('level cap and explicit transfer restrictions are respected, including exclusions',()=>{
  const p=domain().TarkovPrestige,rule=p.rule(fixture.prestige,6);
  const salewa=fixture.items.find(i=>i.normalizedName==='salewa-first-aid-kit'),resp=fixture.items.find(i=>i.normalizedName==='respirator');
  assert.equal(p.allowed(salewa,rule),false);assert.equal(p.allowed(resp,rule),true);
  assert.equal(p.allowed(resp,{itemFilters:{allowedItems:[resp.id],excludedItems:[resp.id]}}),false);
  assert.equal(p.allowed(resp,null),false);
  assert.equal(p.demands([{id:'late',minPlayerLevel:25,objectives:[{type:'giveItem',count:10,items:[resp.id]}]}],15).length,0);
});
test('all optimization modes produce valid, collision-free, allowed placements without dogtag spam',()=>{
  const p=domain().TarkovPrestige;
  for(let level=1;level<=6;level++)for(const focus of ['balanced','money','quests','kappa','density']){
    const rule=p.rule(fixture.prestige,level),plan=p.plan(fixture.items,fixture.tasks,{cols:rule.gridWidth,rows:rule.gridHeight,focus,maxLevel:15,rule});
    const occupied=new Set();
    for(const x of plan){assert.ok(p.allowed(x.item,rule));assert.ok(!p.excluded(x.item));assert.ok(x.x>=0&&x.y>=0&&x.x+x.w<=rule.gridWidth&&x.y+x.h<=rule.gridHeight);
      for(let yy=x.y;yy<x.y+x.h;yy++)for(let xx=x.x;xx<x.x+x.w;xx++){const cell=xx+','+yy;assert.ok(!occupied.has(cell),'overlap');occupied.add(cell);}}
  }
});
test('weapon preset IDs resolve to real assembled imagery and inventory dimensions',()=>{
  const c=domain();c.TarkovData.ingest('items',{data:[{id:'gun',name:'Gun',types:['gun'],width:4,height:1,properties:{defaultPreset:'assembled'}},{id:'assembled',name:'Preset',types:['preset'],width:5,height:2,image512pxLink:'https://example.invalid/assembled.webp'}]});
  const item=c.TarkovItemMedia.decorate(c.TarkovData.get('item','gun'));
  assert.equal(item.displayIconLink,'https://example.invalid/assembled.webp');assert.equal(item.displayWidth,5);assert.equal(item.displayHeight,2);
});
