/* Offline regression tests. No browser, network, or application storage is used. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let failures = 0;
async function probe(name, fn) {
  try { await fn(); console.log('PASS: ' + name); }
  catch (e) { failures++; console.log('FAIL: ' + name + ' — ' + e.message); }
}
function expect(value, message) { if (!value) throw Error(message); }
function environment() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: id === 'gameMode' ? 'pve' : '', style: {}, dataset: {}, children: [],
      textContent: '', innerHTML: '', listeners: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      querySelectorAll() { return []; }, querySelector() { return null; },
      classList: { add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}
    });
    return elements.get(id);
  };
  const values = new Map();
  const ctx = {
    console: { debug() {}, warn() {} }, URL, URLSearchParams,
    location: { search: '', pathname: '/tools/test.html', hash: '', href: 'https://test/tools/test.html' },
    history: { replaceState() {} },
    document: { readyState: 'loading', getElementById: element,
      querySelectorAll() { return []; }, querySelector() { return null; },
      addEventListener() {}, documentElement: { setAttribute() {} } },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, CustomEvent: function () {},
    TarkovStorage: {
      get: (k, d) => values.has(k) ? values.get(k) : d,
      set: (k, v) => values.set(k, v), remove: k => values.delete(k),
      getJson: (k, d) => values.has(k) ? JSON.parse(values.get(k)) : d,
      setJson: (k, v) => values.set(k, JSON.stringify(v))
      , keys: prefix => [...values.keys()].filter(k => !prefix || k.startsWith(prefix))
    }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('core/tarkov-data.js'), ctx, { filename: 'core/tarkov-data.js' });
  vm.runInContext(read('core/tarkov-names.js'), ctx, { filename: 'core/tarkov-names.js' });
  vm.runInContext(read('core/tarkov-item-media.js'), ctx, { filename: 'core/tarkov-item-media.js' });
  vm.runInContext(read('core/tarkov-key-match.js'), ctx, { filename: 'core/tarkov-key-match.js' });
  return { ctx, element, run(file) { vm.runInContext(read(file), ctx, { filename: file }); } };
}
(async () => {
  await probe('Display: trader references resolve to labels, including current and legacy IDs', () => {
    const e = environment(); e.run('core/tarkov-dicts.js');
    const d = e.ctx.TarkovDicts;
    expect(d.traderName('638f541a29ffd1183d187f57', 'ru') === 'Смотритель', 'Lightkeeper ID unresolved');
    expect(d.traderName('656f0f98d80a697f855d34b1', 'ru') === 'Водитель БТР', 'BTR ID unresolved');
    expect(d.traderName('65649eb400d4d9189309ec99', 'ru') === 'Водитель БТР', 'legacy BTR reference lost');
    for (const t of d.traders) expect(!/[a-f0-9]{24}/i.test(d.traderName(t.id, 'ru')), 'Raw trader ID displayed');
  });
  await probe('API: translation paths localize labels without changing entity IDs; real stim fields normalized', async () => {
    const e = environment(); e.ctx.TarkovStorage.set('tarkovLang', 'ru');
    const raw = { data: { items: { stim: { id: 'stim', name: 'stim Name', shortName: 'stim ShortName', properties: { stimEffects: [{ type: 'HealthRate', value: 1 }] } } } }, translations: ['$.data.items.*.name', '$.data.items.*.shortName', '$.data.items.*.properties.stimEffects[*].type'] };
    e.ctx.fetch = async url => ({ ok: true, json: async () => url.endsWith('items_ru') ? { data: { 'stim Name': 'Стимулятор', 'stim ShortName': 'Стим', HealthRate: 'Восстановление здоровья', stim: 'Must not replace ID' } } : raw });
    e.run('core/tarkov-api.js'); const items = await e.ctx.TarkovAPI.items('pve');
    expect(items[0].id === 'stim' && items[0].name === 'Стимулятор' && items[0].shortName === 'Стим', 'translations/IDs incorrect');
    expect(items[0].properties.stimulatorBuffs.length === 1, 'stimEffects not adapted');
    expect(items[0].properties.stimulatorBuffs[0].type === 'HealthRate', 'machine enum translated');
    expect(raw.data.items.stim.name === 'stim Name', 'raw API snapshot mutated');
  });
  await probe('API: oversized responses stay in memory, preserving profile storage', async () => {
    const e = environment(); e.ctx.TarkovStorage.setJson('tt:profile:data:keep', { level: 30 });
    e.ctx.fetch = async () => ({ ok: true, json: async () => [{ id: 'large', description: 'x'.repeat(550000) }] });
    e.run('core/tarkov-api.js'); await e.ctx.TarkovAPI.items('pve');
    expect(e.ctx.TarkovStorage.keys('tt:api:').length === 0, 'oversized cache persisted');
    expect(e.ctx.TarkovStorage.getJson('tt:profile:data:keep').level === 30, 'profile evicted for cache');
  });
  await probe('Alerts: both real HTML entry points load the shared service before tool code', () => {
    for (const slug of ['price-alarm', 'my-tarkov']) {
      const html = read('tools/tarkovtool-' + slug + '.html');
      const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1].split('?')[0]);
      const index = scripts.indexOf('../core/tarkov-alerts.js');
      expect(index > scripts.indexOf('../core/tarkov-state.js') && index < scripts.indexOf('../js/' + slug + '.js'), slug + ' shared service missing or loaded too late');
    }
  });
  await probe('Content: prerequisites, station progress and profile switch change availability', async () => {
    const e = environment(); e.run('core/tarkov-profile.js');
    e.ctx.TarkovAPI = { tasks: async () => [{ id: 'next', minPlayerLevel: 2, taskRequirements: [{ task: { id: 'first' }, status: ['complete'] }] }],
      barters: async () => [], crafts: async () => [{ id: 'craft', station: { id: 'station' }, level: 1 }],
      hideout: async () => [], traders: async () => [], items: async () => [] };
    e.run('core/tarkov-content.js'); await e.ctx.TarkovContent.load();
    expect(e.ctx.TarkovContent.available().length === 0, 'locked progression shown');
    e.ctx.TarkovProfile.update({ level: 3, hideout: { station: { level: 1 } }, quests: { completed: ['first'] } });
    const unlocked = e.ctx.TarkovContent.available();
    expect(unlocked.some(r => r.id === 'next') && unlocked.some(r => r.id === 'craft'), 'new content missing');
    e.ctx.TarkovProfile.create({ name: 'Fresh PMC', activate: true });
    expect(e.ctx.TarkovContent.available().length === 0, 'old profile content leaked');
  });
  await probe('Item-card: late response from previous mode cannot overwrite new graph', async () => {
    const e = environment(); let release;
    e.ctx.TarkovAPI = { items: mode => mode === 'pve' ? new Promise(resolve => { release = resolve; }) : Promise.resolve([{ id: 'new-mode' }]),
      tasks: async () => [], crafts: async () => [] };
    e.run('core/tarkov-item-graph.js'); e.run('js/item-card.js');
    const first = e.element('loadBtn').listeners.click();
    e.element('gameMode').value = 'regular'; await e.element('loadBtn').listeners.click();
    release([{ id: 'old-mode' }]); await first;
    expect(e.ctx.TarkovItemGraph.get('new-mode') && !e.ctx.TarkovItemGraph.get('old-mode'), 'late old-mode graph won');
  });
  await probe('Keys: shared quest index handles object references and removes duplicate task links', () => {
    const e = environment(); e.run('core/tarkov-keys-rating.js');
    const index = e.ctx.TarkovKeysRating.questIndex([{ id: 'quest', neededKeys: [{ keys: [{ id: 'key' }] }], objectives: [{ type: 'findItem', item: { id: 'key' } }] }]);
    expect(index.key.length === 1, 'duplicate/object reference lost');
    const score = e.ctx.TarkovKeysRating.assessment({ id: 'key', avg24hPrice: 10000, properties: { uses: 10 } }, 1);
    expect(score.score > 0 && score.basis.includes('не доход'), 'estimate not labelled');
  });
  await probe('Price Alarm: failed notification retries, missing price never means free item', async () => {
    const e = environment(); let delivered = 0, attempts = 0, price = 100;
    e.ctx.Notify = () => { if (++attempts === 1) throw Error('transport failed'); delivered++; };
    e.ctx.TarkovAPI = { items: async () => [{ id: 'item-1', avg24hPrice: price }] };
    e.ctx.TarkovSchema = { readJson: () => ({ rules: [{ id: 'item-1', threshold: 150, op: '<=' }] }), listOf: d => d.rules };
    e.ctx.TarkovDicts = { esc: String, fmtRub: String }; e.run('js/price-alarm.js');
    await e.ctx.__ttAlarmCheck(); await e.ctx.__ttAlarmCheck();
    expect(delivered === 1, 'failed delivery suppressed retry');
    price = 0; expect((await e.ctx.__ttAlarmCheck()).length === 0, 'missing price triggered rule');
  });
  await probe('Profile: quest dependencies require completed predecessor', () => {
    const e = environment(); e.run('core/tarkov-profile.js');
    e.ctx.TarkovProfile.update({ level: 30 });
    const task = { minPlayerLevel: 10, taskRequirements: [{ task: { id: 'before' }, status: ['complete'] }] };
    expect(e.ctx.TarkovProfile.taskGate(task).locked, 'predecessor ignored');
    e.ctx.TarkovProfile.markQuestComplete('before');
    expect(!e.ctx.TarkovProfile.taskGate(task).locked, 'completed predecessor still locked');
  });
  await probe('Profile: legacy hideout belongs to one PMC, survives export', () => {
    const e = environment(); e.run('core/tarkov-profile.js');
    e.ctx.TarkovStorage.setJson('tarkovHideoutProgress', { station: { level: 2 } });
    const owner = e.ctx.TarkovProfile.getActive().id;
    expect(e.ctx.TarkovProfile.hideoutProgress().station.level === 2, 'legacy lost');
    e.ctx.TarkovProfile.create({ name: 'Other', activate: true });
    expect(!e.ctx.TarkovProfile.hideoutProgress().station, 'progress leaked to second PMC');
    e.ctx.TarkovProfile.setActive(owner);
    expect(e.ctx.TarkovProfile.exportProfile().profile.hideout.station.level === 2, 'export lost station');
  });
  await probe('Profile: event bursts coalesce and unsubscribe cancels refresh', async () => {
    const e = environment(); e.run('core/tarkov-profile.js'); e.ctx.TarkovProfile.getActive();
    let calls = 0;
    const unsubscribe = e.ctx.TarkovProfile.bindRefresh(() => calls++);
    e.ctx.TarkovProfile.update({ level: 10 });
    await Promise.resolve(); expect(calls === 1, 'duplicate refresh: ' + calls);
    e.ctx.TarkovProfile.update({ level: 11 }); unsubscribe();
    await Promise.resolve(); expect(calls === 1, 'refresh after unsubscribe');
  });
  await probe('API: mode aliases share endpoint and fresh request bypasses cache', async () => {
    const e = environment(); const urls = []; let price = 100;
    e.ctx.fetch = async url => { urls.push(url); return { ok: true, json: async () => [{ id: 'key', avg24hPrice: price }] }; };
    e.run('core/tarkov-profile.js'); e.run('core/tarkov-api.js');
    await e.ctx.TarkovAPI.items('pvp'); await e.ctx.TarkovAPI.items('regular');
    expect(urls.length === 1 && urls[0].endsWith('/regular/items'), urls.join(','));
    price = 200;
    const fresh = await e.ctx.TarkovAPI.items('pvp', { noCache: true, httpCache: 'no-store' });
    expect(urls.length === 2 && fresh[0].avg24hPrice === 200, 'fresh price lost');
  });
  await probe('Alerts: migrate once, preserve stable rule IDs, delete from shared store', () => {
    const e = environment(); e.run('core/tarkov-schema.js');
    let state = { alerts: { prices: [{ slug: 'key', target: 100, dir: 'above' }] } };
    e.ctx.TarkovState = { get: () => state, set: patch => { state = { ...state, ...patch }; } };
    e.run('core/tarkov-alerts.js');
    const first = e.ctx.TarkovAlerts.read(); const again = e.ctx.TarkovAlerts.read();
    expect(first.length === 1 && again.length === 1 && first[0].ruleId === again[0].ruleId, 'migration duplicated rule');
    expect(first[0].op === '>=' && state.alerts.prices.length === 0, 'legacy not migrated');
    e.ctx.TarkovAlerts.remove(first[0].ruleId);
    expect(e.ctx.TarkovAlerts.read().length === 0, 'dashboard deletion not shared');
  });
  await probe('Item graph: needed keys, barter quantities and container filters', () => {
    const e = environment(); e.run('core/tarkov-item-graph.js');
    e.ctx.TarkovItemGraph.build({ items: [{ id: 'key', width: 1, height: 1 }, { id: 'denied', width: 1, height: 1 },
      { id: 'docs', properties: { grids: [{ width: 2, height: 2, filters: { allowedItems: ['key'] } }] } }],
      tasks: [{ id: 'quest', neededKeys: [{ keys: [{ id: 'key' }] }] }],
      barters: [{ id: 'barter', requiredItems: [{ item: { id: 'key' }, count: 5 }], rewardItems: [] }] });
    const links = e.ctx.TarkovItemGraph.links('key');
    expect(links.questsUsing[0].taskId === 'quest', 'neededKeys missing');
    expect(links.bartersAsInput[0].count === 5, 'barter count lost');
    expect(links.usedInContainers.includes('docs'), 'allowed key missing');
    expect(!e.ctx.TarkovItemGraph.links('denied').usedInContainers.includes('docs'), 'filter ignored');
  });
  await probe('Weapon graph: same caliber alone does not make magazine compatible', () => {
    const e = environment(); e.run('core/tarkov-weapon-domain.js'); e.run('core/tarkov-item-graph.js');
    e.ctx.TarkovItemGraph.build({ items: [
      { id: 'gun', properties: { propertiesType: 'ItemPropertiesWeapon', caliber: 'same', slots: [{ nameId: 'mod_magazine', filters: { allowedItems: ['good'] } }] } },
      { id: 'good', properties: { propertiesType: 'ItemPropertiesMagazine', caliber: 'same' } },
      { id: 'wrong', properties: { propertiesType: 'ItemPropertiesMagazine', caliber: 'same' } }
    ] });
    const mags = e.ctx.TarkovItemGraph.links('gun').magsFor;
    expect(mags.includes('good') && !mags.includes('wrong'), JSON.stringify(mags));
  });
  await probe('Navigation: ID survives reload, excludes other entities, clear releases filter', () => {
    const e = environment(); e.ctx.location.href = 'https://test/tools/quests.html?ttType=quest&ttId=quest-1';
    e.run('core/tarkov-nav.js');
    expect(e.ctx.TarkovNav.matches({ id: 'quest-1' }) && !e.ctx.TarkovNav.matches({ id: 'quest-2' }), 'ID not applied');
    expect(e.ctx.TarkovNav.href('quests.html', 'quest', 'a&b').includes('a%26b'), 'ID not encoded');
    e.ctx.TarkovNav.clear(); expect(e.ctx.TarkovNav.matches({ id: 'quest-2' }), 'filter not cleared');
  });
  await probe('Names: mixed count=1 can select later faction and emits one name', () => {
    const e = environment(); e.ctx.Math = Object.create(Math); e.ctx.Math.random = () => 0;
    e.ctx.document.querySelectorAll = () => [{ value: 'scav' }, { value: 'bd' }];
    e.element('count').value = '1'; e.element('order').value = 'mixed';
    e.run('js/names.js');
    expect(e.element('out').value === 'Unit', e.element('out').value);
  });
  await probe('R-2/R-3a: PvP profile selects PvP in legacy mode control', () => {
    const e = environment(); e.run('core/tarkov-profile.js');
    e.ctx.TarkovProfile.update({ gameMode: 'pvp' });
    const control = e.element('gameMode');
    control.options = [{ value: 'pve' }, { value: 'regular' }];
    e.ctx.TarkovProfile.bindGameMode(control);
    expect(control.value === 'regular', 'PvP profile selected ' + control.value);
  });
  await probe('R-2/R-3a: selecting PvP must preserve PvP in profile', () => {
    const e = environment(); e.run('core/tarkov-profile.js');
    const control = e.element('gameMode');
    control.options = [{ value: 'pve' }, { value: 'regular' }];
    e.ctx.TarkovProfile.bindGameMode(control);
    control.value = 'regular'; control.listeners.change();
    expect(e.ctx.TarkovProfile.getActive().gameMode === 'pvp',
      'PvP selection wrote ' + e.ctx.TarkovProfile.getActive().gameMode);
  });
  await probe('R-2: completed quest unlocks its trader offer', () => {
    const e = environment(); e.run('core/tarkov-profile.js');
    e.ctx.TarkovProfile.update({ quests: { completed: ['quest-1'] } });
    const gate = e.ctx.TarkovProfile.offerGate({ trader: 'prapor', minTraderLevel: 1,
      taskUnlock: { id: 'quest-1', name: 'Test quest' } });
    expect(!gate.locked, 'offer remains locked: ' + gate.reason);
  });
  await probe('R-2: profile export/import preserves selected profile', () => {
    const e = environment(); e.run('core/tarkov-profile.js');
    e.ctx.TarkovProfile.getActive();
    const a = e.ctx.TarkovProfile.create({ name: 'A', activate: true });
    e.ctx.TarkovProfile.create({ name: 'B' });
    const data = e.ctx.TarkovProfile.exportAllProfiles();
    // List metadata is insertion ordered; select a non-first entry explicitly.
    e.ctx.TarkovProfile.setActive(a.id);
    data.activeId = a.id;
    e.ctx.TarkovProfile.importAllProfiles(data);
    expect(e.ctx.TarkovProfile.getActive().name === 'A',
      'selected ' + e.ctx.TarkovProfile.getActive().name + ' instead of A');
  });
  await probe('R-3: item-card search suggestions', async () => {
    const e = environment();
    e.ctx.TarkovAPI = { items: async () => [{ id: 'item-1', name: 'Test key' }],
      tasks: async () => [], crafts: async () => [] };
    e.run('core/tarkov-item-graph.js');
    e.run('js/item-card.js');
    await e.element('loadBtn').listeners.click();
    e.element('q').value = 'Test';
    e.element('q').listeners.input();
  });
  await probe('R-3a: duplicate physical keys contribute to total cost', async () => {
    const e = environment();
    e.ctx.TarkovAPI = { items: async () => [{ id: 'key-1', types: ['keys'],
      normalizedName: 'dorm-room-114-key', name: 'Dorm room 114 key', avg24hPrice: 100 }],
      tasks: async () => [] };
    e.ctx.TarkovTableTool = { create: () => ({ setRows() {} }),
      itemName: it => it.name, fmtNum: String, esc: String };
    e.run('js/key-analyzer.js');
    await e.element('loadCatalogBtn').onclick();
    e.element('ocrText').value = 'Dorm room 114 key\nDorm room 114 key';
    e.element('matchBtn').onclick();
    expect(e.element('totalSum').textContent.startsWith('200'), e.element('totalSum').textContent);
  });
  await probe('R-3a: generic OCR text must not identify an arbitrary key', async () => {
    const e = environment(); let rows;
    e.ctx.TarkovAPI = { items: async () => [{ id: 'key-1', types: ['keys'],
      normalizedName: 'dorm-room-114-key', name: 'Dorm room 114 key', avg24hPrice: 100 }],
      tasks: async () => [] };
    e.ctx.TarkovTableTool = { create: () => ({ setRows(r) { rows = r; } }),
      itemName: it => it.name, fmtNum: String, esc: String };
    e.run('js/key-analyzer.js');
    await e.element('loadCatalogBtn').onclick();
    e.element('ocrText').value = 'key'; e.element('matchBtn').onclick();
    expect(rows.length === 0, '"key" matched ' + (rows[0] && rows[0].name));
    e.element('ocrText').value = 'Dorm room 110 key'; e.element('matchBtn').onclick();
    expect(rows.length === 0, 'wrong room number was accepted');
  });
  await probe('R-3a: English OCR resolves normalized slug with Russian display names', async () => {
    const e = environment(); let rows;
    e.ctx.TarkovAPI = { items: async () => [{ id: 'key', types: ['keys'], normalizedName: 'dorm-room-114-key', name: 'Ключ от комнаты 114', avg24hPrice: 100 }], tasks: async () => [] };
    e.ctx.TarkovTableTool = { create: () => ({ setRows(r) { rows = r; } }), itemName: it => it.name, fmtNum: String, esc: String };
    e.run('js/key-analyzer.js'); await e.element('loadCatalogBtn').onclick();
    e.element('ocrText').value = 'dorm room 114 key'; e.element('matchBtn').onclick();
    expect(rows.length === 1 && rows[0].id === 'key', 'localized key did not match English OCR');
  });
  await probe('Price Alarm: threshold hit sends notification', async () => {
    const e = environment(); let notifications = 0;
    e.ctx.Notify = () => notifications++;
    e.ctx.TarkovAPI = { items: async () => [{ id: 'item-1', name: 'Test', avg24hPrice: 100 }] };
    e.ctx.TarkovSchema = { readJson: () => ({ rules: [{ id: 'item-1', threshold: 150, op: '<=' }] }),
      listOf: d => d.rules };
    e.ctx.TarkovDicts = { esc: String, fmtRub: String };
    e.run('js/price-alarm.js');
    const hits = await e.ctx.__ttAlarmCheck();
    expect(hits.length === 1 && notifications === 1, 'hits=' + hits.length + ', notifications=' + notifications);
  });
  await probe('Price Alarm: subsequent poll refreshes market data', async () => {
    const e = environment(); let requests = 0;
    e.ctx.TarkovAPI = { items: async () => { requests++; return [{ id: 'item-1', avg24hPrice: 100 }]; } };
    e.ctx.TarkovSchema = { readJson: () => ({ rules: [] }), listOf: d => d.rules };
    e.run('js/price-alarm.js');
    await e.ctx.__ttAlarmCheck(); await e.ctx.__ttAlarmCheck();
    expect(requests === 2, 'API calls after two polls: ' + requests);
  });
  console.log('Offline regression suite: ' + failures + ' failure(s)');
  process.exitCode = failures ? 1 : 0;
})();
