/* Real headless Chromium/Edge audit. Uses an isolated context, never the user's browser profile. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts', 'browser-audit');
fs.mkdirSync(out, { recursive: true });
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + (['.html', '.js', '.css', '.json', '.svg'].includes(path.extname(file)) ? '; charset=utf-8' : ''));
    res.end(data);
  });
});
let browser, base;
const results = [], resources = [], snapshots = new Map();
const snapshotDir = path.join(out, 'snapshots');
fs.mkdirSync(snapshotDir, { recursive: true });
const phase = process.argv[2] || 'all';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function record(name, fn) {
  if (process.env.AUDIT_CASES && !new RegExp(process.env.AUDIT_CASES).test(name)) return;
  const start = Date.now();
  try { const detail = await fn(); results.push({ name, status: 'pass', ms: Date.now() - start, detail }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, status: 'fail', ms: Date.now() - start, error: error.stack }); console.log('FAIL ' + name + ': ' + error.message.split('\n')[0]); }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ at: new Date().toISOString(), results, resources }, null, 2));
  fs.writeFileSync(path.join(out, 'results-' + phase + '.json'), JSON.stringify({ at: new Date().toISOString(), results, resources }, null, 2));
}
function assert(condition, message) { if (!condition) throw Error(message); }
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ru-RU' });
  await ctx.addInitScript(() => {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    localStorage.setItem('tt:settings:sound', '0');
    localStorage.setItem('tt:settings:lang', 'ru');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.__testClipboard = text; }, readText: async () => window.__testClipboard || ''
    } });
  });
  ctx.on('page', page => {
    page.auditErrors = [];
    page.on('pageerror', error => page.auditErrors.push(error.stack || error.message));
    page.on('console', message => { if (message.type() === 'error') resources.push({ page: page.url(), console: message.text().slice(0, 350) }); });
    page.on('response', response => { if (response.status() >= 400) resources.push({ page: page.url(), status: response.status(), url: response.url() }); });
    page.on('dialog', async dialog => { await dialog.accept(dialog.type() === 'prompt' ? 'Headless PMC' : undefined); });
  });
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (snapshots.has(req.url())) {
      const value = snapshots.get(req.url());
      await route.fulfill({ status: value.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: value.body }); return;
    }
    // Media loading is tested separately; avoid thousands of unrelated image downloads during interaction sweeps.
    if (!options.realImages && req.resourceType() === 'image' && url.origin !== base) {
      await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#555"/></svg>' }); return;
    }
    await route.continue();
  });
  return ctx;
}
function toolFiles() {
  return fs.readdirSync(path.join(root, 'tools')).filter(f => /^tarkovtool-.*\.html$/.test(f));
}
async function inspectTools() {
  const only = process.env.AUDIT_TOOLS && process.env.AUDIT_TOOLS.split(',');
  for (const file of toolFiles().filter(f => !only || only.includes(f.replace('tarkovtool-', '').replace('.html', '')))) {
    const ctx = await context(), page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    await record('tool: ' + file, async () => {
      await page.goto(base + '/tools/' + file, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await pause(350);
      assert(page.auditErrors.length === 0, page.auditErrors.join('\n'));
      const initial = await page.evaluate(() => ({
        buttons: [...document.querySelectorAll('button')].filter(b => b.offsetParent && b.id).map(b => ({ id: b.id, text: b.textContent.trim().slice(0, 65) })),
        controls: [...document.querySelectorAll('input, select')].filter(b => b.offsetParent && b.id).map(b => ({ id: b.id, type: b.type, value: b.value })),
        stub: /пока заглушка|— заглушка|будет реализован/i.test(document.body.innerText)
      }));
      const load = page.locator('#loadBtn, #loadCatalogBtn, #btnLoad, #loadData, #fetchBtn').filter({ visible: true }).first();
      let clicked = false;
      if (await load.count() && await load.isEnabled()) {
        await load.click(); clicked = true;
        await page.waitForFunction(() => ![...document.querySelectorAll('#loadBtn, #loadCatalogBtn, #btnLoad, #loadData, #fetchBtn')].some(b => b.disabled), null, { timeout: 20000 });
        await pause(350);
      }
      const checks = phase === 'exercise' || phase === 'all' ? await exerciseTool(page, file) : [];
      const hashLabels = await page.locator('tbody').evaluateAll(tables => tables
        .filter(t => t.offsetParent).flatMap(t => (t.innerText.match(/\b[a-f0-9]{24}\b/gi) || [])));
      assert(!hashLabels.length, 'Raw entity IDs in visible table labels: ' + [...new Set(hashLabels)].join(', '));
      const detail = await page.evaluate(() => ({
        status: [...document.querySelectorAll('.status')].filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean),
        rows: [...document.querySelectorAll('tbody')].map(e => ({ id: e.id, rows: e.querySelectorAll('tr').length, visible: !!e.offsetParent })),
        brokenLocalImages: [...document.images].filter(i => i.src.startsWith(location.origin) && i.complete && !i.naturalWidth).length,
        body: document.body.innerText.slice(-1600)
      }));
      detail.initial = initial; detail.loaded = clicked;
      detail.checks = checks;
      if (page.auditErrors.length) detail.errors = page.auditErrors;
      fs.writeFileSync(path.join(out, file + '.json'), JSON.stringify(detail, null, 2));
      if (page.auditErrors.length || detail.status.some(s => /ошибк|is not (a function|defined)|cannot read|HTTP (404|500)/i.test(s))) {
        await page.screenshot({ path: path.join(out, file + '.png'), fullPage: true });
        throw Error(page.auditErrors.join('\n') || detail.status.join(' | '));
      }
      assert(!detail.brokenLocalImages, 'Broken local images: ' + detail.brokenLocalImages);
      return detail;
    });
    if (results[results.length - 1]?.status === 'fail') {
      await page.screenshot({ path: path.join(out, file + '-failed.png'), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(out, file + '-failed.json'), JSON.stringify(await page.evaluate(() => ({ body: document.body.innerText, errors: window.__auditErrors || [] })).catch(() => ({})), null, 2));
    }
    await ctx.close();
  }
}
async function exerciseTool(page, file) {
  const slug = file.replace('tarkovtool-', '').replace('.html', ''), checks = [];
  const click = async selector => { await page.locator(selector).first().click(); await pause(180); checks.push('click ' + selector); };
  const has = selector => page.locator(selector).count();
  const text = selector => page.locator(selector).first().innerText();
  const tables = ['ammo','armor','barter-opt','containers','crafts','drip','effects','food','gun-rating','headphones','helmets','hideout-mgmt','mags','medkits','mods','nvg','plates','quests','quest-items','scopes','stims','streamer-flip','keys','trader-flip'];
  if (tables.includes(slug)) {
    const tbody = page.locator('tbody').filter({ visible: true }).first();
    assert(await tbody.count(), 'No visible results table');
    const before = await tbody.locator('tr').count();
    assert(before > 0, 'Successful load produced no visible rows'); checks.push('nonempty results: ' + before);
    const search = page.locator('#q, #search').filter({ visible: true }).first();
    if (await search.count()) {
      await search.fill('__HEADLESS_NO_SUCH_ITEM_123456__'); await pause(250);
      assert(await tbody.locator('tr').count() < before || /нет|не найден|no result|пусто/i.test(await tbody.innerText()), 'Search did not filter results');
      await search.fill(''); await pause(200);
      assert(await tbody.locator('tr').count() > 0, 'Clearing search did not restore rows'); checks.push('search and reset');
    }
    const header = page.locator('th[data-k], th[data-s]').filter({ visible: true }).first();
    if (await header.count()) { await header.click(); await header.click(); checks.push('sort both directions'); }
  }
  switch (slug) {
    case 'bosses': await click('#refreshGoons'); assert((await text('#status')).length > 0, 'Boss refresh failed'); break;
    case 'cultist': await click('#fill350'); await click('#fill400'); await click('#clearBtn'); break;
    case 'desk': await click('#addBtn'); await page.locator('#pq').fill('патрон'); await click('#plist [data-file], #plist a'); assert(await page.locator('#body iframe').count() > 0, 'Desk widget not opened'); break;
    case 'hideout': {
      const id = Object.values(data('hideout')).find(station => station.normalizedName === 'heating').id;
      const control = page.locator('select[data-level="' + id + '"]');
      await control.selectOption('1'); await page.reload({ waitUntil: 'domcontentloaded' }); await click('#loadBtn');
      await page.waitForSelector('select[data-level="' + id + '"]'); assert(await page.locator('select[data-level="' + id + '"]').inputValue() === '1', 'Station level not saved'); checks.push('station persists'); break;
    }
    case 'item-card': case 'item-use': {
      const id = Object.keys(data('items'))[0]; await page.locator('#q').fill(id); await click('#openBtn');
      assert((await text('#cardId')) === id, 'Item card did not resolve ID'); checks.push('open exact item'); break;
    }
    case 'key-analyzer': await page.locator('#ocrText').fill('key'); await click('#matchBtn'); assert(await page.locator('#kaBody tr').count() === 0, 'Ambiguous key accepted'); break;
    case 'lang-search': await page.locator('#q').fill('salewa'); await pause(300); assert(await page.locator('#tbody tr').count() > 0, 'Multilingual search empty'); checks.push('multilingual lookup'); break;
    case 'loot-slot': await page.locator('#q').fill('salewa'); await pause(200); await click('#suggest > div'); assert((await text('#out')).includes('Salewa') || await page.locator('#out tbody tr').count() > 0, 'Loot value not shown'); break;
    case 'marathon': await click('#superBtn'); assert(Number(await text('#sMaps')) > 1, 'Marathon route not built'); await click('#clearBtn'); assert(Number(await text('#sMaps')) === 0, 'Route not cleared'); break;
    case 'my-tarkov': assert(await page.locator('#profileSelect option').count() > 0, 'Default profile missing'); await click('#loadContent'); await page.waitForFunction(() => document.querySelector('#contentStatus').textContent.includes('Доступность')); checks.push('available content'); break;
    case 'price-alarm': await click('#addRule'); assert(await page.locator('.rule-card').count() === 1, 'Rule not added'); await click('[data-del]'); assert(await page.locator('.rule-card').count() === 0, 'Rule not removed'); break;
    case 'price-track': assert(await page.locator('#snapBtn').isEnabled(), 'Snapshots unavailable'); checks.push('snapshot controls ready; full history scenario in flows'); break;
    case 'quest-cheese': await page.locator('#q').fill('salewa'); await pause(200); await click('#suggest > *'); assert((await text('#results')).length > 20, 'Quest alternatives not shown'); break;
    case 'shopping-list': await page.locator('#q').fill('salewa'); await pause(200); await click('#suggest button'); await page.locator('#qty').fill('2'); await click('#addBtn'); assert((await text('#list')).length > 10, 'Shopping entry not added'); await page.reload({ waitUntil: 'domcontentloaded' }); assert((await text('#list')).length > 10, 'Shopping entry not saved'); checks.push('list persists'); break;
    case 'sources': assert(await page.locator('a[href^="http"]').count() > 0, 'No reference links'); checks.push('reference links'); break;
    case 'map-admin': assert(await page.locator('#adminGate').isVisible() && !(await page.locator('#adminApp').isVisible()), 'Editor not gated'); checks.push('anonymous access blocked; authenticated edit tested separately'); break;
    case 'drip-builder': case 'loadout-budget': assert(/заглушка/i.test(await page.locator('body').innerText()), 'Unimplemented feature not labelled'); checks.push('declared stub'); break;
    case 'barter-calc': {
      const before = await page.locator('.item-row').count(); await click('#addItemBtn');
      assert(await page.locator('.item-row').count() > before, 'Ingredient not added');
      await page.locator('.item-price').last().fill('1000'); await page.locator('.item-qty').last().fill('2');
      await click('.remove-btn:last-child'); break;
    }
    case 'barter-live': await click('#fetchPricesBtn'); await pause(1200); await click('#addItemBtn'); break;
    case 'battle-pass': {
      const checkbox = page.locator('input[type=checkbox]').first();
      assert(await checkbox.count(), 'No progress controls'); await checkbox.check(); await page.reload({ waitUntil: 'domcontentloaded' });
      assert(await page.locator('input[type=checkbox]').first().isChecked(), 'Battle-pass progress not saved'); checks.push('progress persists'); break;
    }
    case 'btc-farm': { const before = await text('tbody'); await page.locator('#btcPrice').fill('900000'); await click('#recalcBtn'); assert(await text('tbody') !== before, 'Price did not change ROI table'); await click('#priceBtn'); await pause(500); break; }
    case 'challenge': await click('#rollBtn'); await page.waitForFunction(() => !document.querySelector('#doneBtn').disabled); await click('#doneBtn'); assert((await text('#xpLabel')) !== '0 / 100 XP', 'Challenge reward not recorded'); break;
    case 'compare': {
      const input = page.locator('#search').filter({ visible: true }).first(); await input.fill('ak'); await pause(250);
      const choice = page.locator('[data-id]').filter({ visible: true }).first(); if (await choice.count()) await choice.click();
      await click('#clearSel'); break;
    }
    case 'cases': await click('.case-card'); assert(await page.locator('#modalBg').isVisible(), 'Case details did not open'); await click('#modalClose'); break;
    case 'drip-loadout': case 'random-loadout': await click('#btnGo'); await page.waitForFunction(() => document.querySelector('#paperdoll').children.length > 0); checks.push('generated loadout'); break;
    case 'gun-budget': await click('#gunList > *'); await click('#buildBtn'); assert(await page.locator('#result').isVisible(), 'Budget build not shown'); break;
    case 'gun-builder': {
      await page.locator('#weaponQ').fill('ak'); await pause(250); await click('#weaponSuggest > *');
      assert(await page.locator('#buildCard').isVisible(), 'Weapon selection failed'); await click('#zoomIn'); await click('#zoomReset');
      await click('#abScan'); await pause(500); assert((await text('#abStatus')).length > 0, 'No Auto Build result'); break;
    }
    case 'hitboxes': {
      const before = await page.locator('body').innerText(); await click('#bodySvg [data-zone], #bodySvg [data-part]');
      assert((await page.locator('body').innerText()) !== before, 'Hit did not affect health'); await click('#btnHeal'); await click('#btnReset'); break;
    }
    case 'loadout-builder': await page.locator('#presetName').fill('Headless preset'); await click('#btnSave'); await page.reload({ waitUntil: 'domcontentloaded' }); assert((await text('#presetList')).includes('Headless preset'), 'Preset did not persist'); break;
    case 'names': await page.locator('#count').fill('3'); await click('#btnGen'); assert((await page.locator('#out').inputValue()).split('\n').length >= 3, 'Names not generated'); await click('#btnCopy'); break;
    case 'prestige': await click('#btnDemo'); await click('#btnAssemble'); await click('#optRun'); await pause(350); assert((await page.locator('body').innerText()).length > 100, 'No prestige result'); await click('#btnClear'); break;
    case 'raid-checklist': await page.locator('#name').fill('Headless meds'); await click('#addBtn'); assert((await page.locator('body').innerText()).includes('Headless meds'), 'Checklist entry not added'); await click('#checkAll'); await click('#uncheckAll'); break;
    case 'random-fact': await click('#nextBtn'); assert((await text('#fact')).length > 10, 'No fact'); await click('#refreshDyn'); await pause(1000); break;
    case 'repair': { const before = await page.locator('body').innerText(); await page.locator('#curD').fill('10'); await pause(250); assert((await page.locator('body').innerText()) !== before, 'Repair calculation not updated'); break; }
    case 'shortname': await page.locator('#qLong').fill('ak'); await pause(250); assert((await page.locator('#list .item').count()) > 0, 'Name search returned no results'); break;
    case 'skills': await page.locator('#skillList input').first().fill('12'); await click('#saveSkills'); await page.reload({ waitUntil: 'domcontentloaded' }); assert(await page.locator('#skillList input').first().inputValue() === '12', 'Skill not saved'); break;
    case 'stash-packer': {
      await page.locator('.container-check').first().check(); await page.locator('.container-quantity').first().fill('2'); await page.locator('.container-quantity').first().blur(); await click('#packBtn');
      assert((await text('#resultSummary')).includes('2'), 'Copies were not packed'); assert(await page.locator('.stash-piece').count() > 0, 'No visual packing result'); break;
    }
    case 'strength-calc': await click('#preset21'); assert((await text('#outEff')).includes('51'), 'Stim preset did not reach 51'); break;
    case 'xp': { const before = await text('#xpOut'); await page.locator('#pmc').fill('3'); await pause(150); assert(await text('#xpOut') !== before, 'XP did not update'); break; }
    case 'restock': await click('#refreshBtn'); await pause(500); checks.push('refresh traders'); break;
    case 'stim-combos': assert((await page.locator('body').innerText()).includes('SJ'), 'No stim combinations rendered'); break;
    case 'map': await page.waitForSelector('.leaflet-container'); await click('#btnFilters'); await click('#btnNone'); await click('#btnAll'); await click('#btnFit'); break;
    case 'events': assert((await text('#status')).includes('пуста'), 'Empty editorial data not explained'); break;
    case 'seasons': assert((await page.locator('body').innerText()).includes('KORD'), 'Season reference missing'); break;
  }
  assert(page.auditErrors.length === 0, page.auditErrors.join('\n'));
  return checks;
}
function data(kind) { const j = JSON.parse(snapshots.get('https://json.tarkov.dev/pve/' + kind).body); return j.data[kind] || j.data; }
async function workflows() {
  const rawItems = data('items'), rawTasks = Object.values(data('tasks'));
  const chain = rawTasks.map(task => ({ task, ids: [...new Set((task.objectives || []).flatMap(o => (o.items || []).concat(o.item || [])).map(r => typeof r === 'string' ? r : r.id || r.item))].filter(id => rawItems[id]) })).find(x => x.ids.length > 1);
  const [itemA, itemB] = chain.ids, taskId = chain.task.id;
  await record('flow: item → quest → another item → quest → original item', async () => {
    const ctx = await context(), page = await ctx.newPage(); page.setDefaultTimeout(15000);
    try {
      await page.goto(base + '/tools/tarkovtool-item-card.html?item=' + itemA);
      await page.locator('#listQuestUse a[href*="ttId=' + taskId + '"]').click();
      await page.waitForURL('**/tarkovtool-quests.html?**');
      await page.locator('#questItemLinks a[data-item-id="' + itemB + '"]').click();
      await page.waitForFunction(id => document.getElementById('cardId')?.textContent === id, itemB);
      await page.locator('#listQuestUse a[href*="ttId=' + taskId + '"]').click();
      await page.locator('#questItemLinks a[data-item-id="' + itemA + '"]').click();
      await page.waitForFunction(id => document.getElementById('cardId')?.textContent === id, itemA);
      assert(page.auditErrors.length === 0, page.auditErrors.join('\n'));
      await page.screenshot({ path: path.join(out, 'chain-complete.png') });
      return { itemA, itemB, taskId, transitions: 4 };
    } finally { await ctx.close(); }
  });
  await record('flow: same item/quest round trip inside hub mini-tabs', async () => {
    const ctx = await context(), page = await ctx.newPage(); page.setDefaultTimeout(15000);
    try {
      await page.goto(base);
      const card = page.locator('[data-open="tools/tarkovtool-item-card.html"]');
      await card.click();
      const frame = page.frameLocator('iframe[data-tool="tools/tarkovtool-item-card.html"]');
      await frame.locator('#loadBtn').click();
      await frame.locator('#loadBtn').waitFor({ state: 'visible' });
      await page.waitForFunction(() => !document.querySelector('iframe[data-tool="tools/tarkovtool-item-card.html"]').contentDocument.querySelector('#loadBtn').disabled);
      await frame.locator('#q').fill(itemA); await frame.locator('#openBtn').click();
      await frame.locator('#listQuestUse a[href*="ttId=' + taskId + '"]').click();
      const quest = page.frameLocator('iframe[data-tool="tools/tarkovtool-quests.html"]');
      await quest.locator('#questItemLinks a[data-item-id="' + itemB + '"]').click();
      await page.waitForFunction(id => document.querySelector('iframe[data-tool="tools/tarkovtool-item-card.html"]').contentDocument.querySelector('#cardId')?.textContent === id, itemB);
      const identity = await page.locator('iframe[data-tool]').evaluateAll(frames => frames.map(f => ({ tool: f.dataset.tool, pathname: new URL(f.src).pathname.split('/').pop() })));
      assert(identity.every(f => f.tool.endsWith(f.pathname)), 'Iframe identity diverged: ' + JSON.stringify(identity));
      assert((await page.url()).includes('tarkovtool-hub.html'), 'Hub navigated away');
      assert(page.auditErrors.length === 0, page.auditErrors.join('\n')); return { identity };
    } finally { await ctx.close(); }
  });
  for (const [type, target, index, idField] of [['craft','crafts','craftsAsInput','craftKey'], ['barter','barter-opt','bartersAsInput','barterKey'], ['station','hideout','hideoutRequiring','stationId']]) {
    await record('flow: item → ' + type + ' with exact entity ID', async () => {
      const ctx = await context(), page = await ctx.newPage(); page.setDefaultTimeout(15000);
      try {
        const candidates = type === 'station' ? Object.values(data('hideout')).flatMap(s => s.levels.flatMap(l => l.itemRequirements || [])) : data(type === 'craft' ? 'crafts' : 'barters').flatMap(c => c.requiredItems || []);
        const id = candidates.map(r => typeof r.item === 'string' ? r.item : r.item?.id).find(id => rawItems[id]);
        await page.goto(base + '/tools/tarkovtool-item-card.html?item=' + id);
        await page.waitForFunction(() => window.TarkovItemGraph?.isBuilt());
        const expected = await page.evaluate(({ id, index, idField }) => TarkovItemGraph.links(id)[index][0][idField], { id, index, idField });
        const list = type === 'craft' ? '#listCraftIn' : type === 'barter' ? '#listBarterIn' : '#listHideout';
        await page.locator(list + ' a').first().click();
        await page.waitForURL('**/tarkovtool-' + target + '.html?**');
        await page.waitForFunction(() => !document.querySelector('#loadBtn').disabled);
        assert(new URL(page.url()).searchParams.get('ttId') === expected, 'Target ID lost');
        if (type !== 'station') { await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0); assert(await page.locator('tbody tr').count() === 1, 'Target did not narrow to one row'); }
        else assert(await page.locator('#detail').innerText().catch(() => page.locator('#main').innerText()), 'Station details missing');
        assert(!page.auditErrors.length, page.auditErrors.join('\n')); return { id, expected };
      } finally { await ctx.close(); }
    });
  }
  await record('profile: edit, cross-tab mode/skills, export/import and active selection', async () => {
    const ctx = await context(), page = await ctx.newPage(), skills = await ctx.newPage();
    try {
      await page.goto(base + '/tools/tarkovtool-my-tarkov.html');
      await page.locator('#pmcName').fill('Headless primary'); await page.locator('#level').fill('30'); await page.locator('#saveProfile').click();
      await skills.goto(base + '/tools/tarkovtool-skills.html');
      await skills.locator('[data-id="strength"]').fill('21'); await skills.locator('#saveSkills').click();
      await page.waitForFunction(() => document.querySelector('[data-skill="strength"]').value === '21');
      await page.locator('#gameMode').selectOption('pvp');
      const downloadPromise = page.waitForEvent('download'); await page.locator('#exportAllProfiles').click();
      const download = await downloadPromise; const filename = path.join(out, 'test-profiles.json'); await download.saveAs(filename);
      const exported = JSON.parse(fs.readFileSync(filename, 'utf8')); assert(exported.profiles.some(p => p.level === 30 && p.gameMode === 'pvp' && p.skills.strength === 21), 'Profile export lost progress');
      await page.locator('#newProfile').click(); await page.locator('#importFile').setInputFiles(filename);
      await page.waitForFunction(() => document.querySelector('#pmcName').value === 'Headless primary');
      assert(!page.auditErrors.length && !skills.auditErrors.length, [...page.auditErrors,...skills.auditErrors].join('\n')); return { profileCount: await page.locator('#profileSelect option').count() };
    } finally { await ctx.close(); }
  });
  await record('key analyzer: names, duplicates, manual ID selection and ambiguous text', async () => {
    const ctx = await context(), page = await ctx.newPage();
    try {
      await page.goto(base + '/tools/tarkovtool-key-analyzer.html'); await page.locator('#loadCatalogBtn').click();
      await page.waitForFunction(() => !document.querySelector('#loadCatalogBtn').disabled);
      const choice = await page.locator('#keyOptions option').first().getAttribute('value');
      await page.locator('#manualKey').fill(choice); await page.locator('#manualQty').fill('2'); await page.locator('#addManualKey').click();
      assert(await page.locator('#kaBody tr').count() === 1 && (await page.locator('#totalSum').innerText()).includes('2'), 'Manual quantity lost');
      await page.locator('#ocrText').fill('key'); await page.locator('#matchBtn').click(); assert(await page.locator('#kaBody tr').count() === 0, 'Generic text accepted as a key');
      assert(!page.auditErrors.length, page.auditErrors.join('\n'));
      return { sample: choice };
    } finally { await ctx.close(); }
  });
  await record('alerts: dashboard rule → live alarm → notification → stop', async () => {
    const ctx = await context(), dashboard = await ctx.newPage(), alarm = await ctx.newPage();
    try {
      await dashboard.goto(base + '/tools/tarkovtool-my-tarkov.html');
      await dashboard.locator('#alertSlug').fill(itemA); await dashboard.locator('#alertTarget').fill('1000000000'); await dashboard.locator('#alertDir').selectOption('below'); await dashboard.locator('#addAlert').click();
      await alarm.goto(base + '/tools/tarkovtool-price-alarm.html');
      await alarm.waitForSelector('.rule-card'); await alarm.locator('#checkBtn').click();
      await alarm.waitForFunction(() => window.TarkovState.notifications().some(n => n.kind === 'alarm'));
      await alarm.locator('#startBtn').click(); await alarm.waitForFunction(() => TarkovPoll.status('price-alarm').on);
      await alarm.locator('#stopBtn').click(); await alarm.waitForFunction(() => !TarkovPoll.status('price-alarm').on);
      await dashboard.locator('#alertList button').first().click();
      await alarm.waitForFunction(() => document.querySelectorAll('.rule-card').length === 0);
      assert(!alarm.auditErrors.length, alarm.auditErrors.join('\n')); return { notification: true, stop: true, sharedDeletion: true };
    } finally { await ctx.close(); }
  });
  await record('price tracker: snapshot → item search → chart → reload', async () => {
    const ctx = await context(), page = await ctx.newPage();
    try {
      await page.goto(base + '/tools/tarkovtool-price-track.html'); await page.locator('#snapBtn').click();
      await page.waitForSelector('.item-row', { timeout: 20000 });
      await page.locator('#itemFilter').fill(itemA);
      await page.locator('.item-row').first().click();
      await page.waitForSelector('canvas');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.item-row');
      assert(!page.auditErrors.length, page.auditErrors.join('\n')); return { historyPersists: true };
    } finally { await ctx.close(); }
  });
  await record('key analyzer: real Tesseract OCR on generated readable screenshot', async () => {
    const ctx = await context(), imagePage = await ctx.newPage(), page = await ctx.newPage();
    try {
      const key = Object.values(rawItems).find(item => item.normalizedName === 'dorm-room-114-key');
      const words = key.normalizedName.replace(/-/g, ' ');
      await imagePage.setContent('<div style="font:36px Arial;background:white;color:black;padding:40px;width:700px">' + words + '</div>');
      const png = await imagePage.locator('div').screenshot();
      await page.goto(base + '/tools/tarkovtool-key-analyzer.html'); await page.locator('#loadCatalogBtn').click();
      await page.waitForFunction(() => !document.querySelector('#loadCatalogBtn').disabled);
      await page.locator('#file').setInputFiles({ name: 'keys.png', mimeType: 'image/png', buffer: png });
      await page.locator('#ocrBtn').click();
      await page.waitForFunction(() => !document.querySelector('#ocrBtn').disabled, null, { timeout: 90000 });
      const recognized = await page.locator('#ocrText').inputValue();
      assert(/114/.test(recognized), 'OCR did not read text: ' + await page.locator('#status').innerText());
      await page.locator('#matchBtn').click();
      assert(await page.locator('#kaBody tr').count() === 1, 'OCR text did not resolve to a key: ' + recognized);
      return { input: words, recognized: recognized.trim(), realGameScreenshot: false };
    } finally { await ctx.close(); }
  });
  await record('navigation: keyboard item link and inspector dialog', async () => {
    const ctx = await context(), page = await ctx.newPage();
    try {
      await page.goto(base + '/tools/tarkovtool-ammo.html'); await page.locator('#loadBtn').click();
      await page.waitForSelector('tbody .item-details-link');
      await page.locator('tbody .name-cell').first().dblclick();
      await page.waitForSelector('#tt-item-inspector-dialog[open]');
      await page.keyboard.press('Escape');
      const link = page.locator('tbody .item-details-link').first(); const expected = new URL(await link.getAttribute('href'), page.url()).searchParams.get('item');
      await link.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(id => document.querySelector('#cardId')?.textContent === id, expected);
      assert(!page.auditErrors.length, page.auditErrors.join('\n')); return { expected, keyboardNavigation: true };
    } finally { await ctx.close(); }
  });
  await record('media: real remote item image in isolated browser', async () => {
    const ctx = await context({ realImages: true }), page = await ctx.newPage();
    try {
      await page.goto(base + '/tools/tarkovtool-item-card.html?item=' + itemA);
      await page.waitForFunction(() => { const img = document.querySelector('#cardIcon'); return img?.complete && img.naturalWidth > 0; });
      const image = await page.locator('#cardIcon').evaluate(img => ({ src: img.src, width: img.naturalWidth, height: img.naturalHeight }));
      assert(!image.src.startsWith(base), 'Test used a local placeholder');
      await page.screenshot({ path: path.join(out, 'item-real-image.png') }); return image;
    } finally { await ctx.close(); }
  });
  await record('mode: profile change in another tab reloads loaded key catalog for PvP', async () => {
    const ctx = await context(), keys = await ctx.newPage(), profile = await ctx.newPage(); const requests = [];
    keys.on('request', r => { if (/json.tarkov.dev\/(pve|regular)\/items$/.test(r.url())) requests.push(r.url()); });
    try {
      await keys.goto(base + '/tools/tarkovtool-keys.html'); await keys.locator('#loadBtn').click(); await keys.waitForSelector('#tbody tr');
      await profile.goto(base + '/tools/tarkovtool-my-tarkov.html'); await profile.locator('#gameMode').selectOption('pvp');
      await keys.waitForFunction(() => document.querySelector('#gameMode').value === 'regular');
      await keys.waitForFunction(() => !document.querySelector('#loadBtn').disabled && document.querySelectorAll('#tbody tr').length > 0);
      assert(requests.some(url => url.includes('/regular/')), 'Loaded table did not request new mode');
      assert(!keys.auditErrors.length, keys.auditErrors.join('\n')); return { requests };
    } finally { await ctx.close(); }
  });
  await record('map admin: authenticated fixture edits, saves and exports marker', async () => {
    const ctx = await context(), page = await ctx.newPage();
    // Authentication itself is covered by the anonymous gate check; no password is read or persisted.
    await ctx.addInitScript(() => { window.TarkovSessionGate = { __v: 1, isElevated: () => true, isAdmin: () => true, subscribe: () => () => {} }; });
    try {
      await page.goto(base + '/tools/tarkovtool-map-admin.html'); await page.waitForSelector('#adminApp', { state: 'visible' });
      await page.locator('#btnAddMark').click(); await page.locator('#map').click({ position: { x: 350, y: 300 } });
      await page.locator('.leaflet-marker-icon').filter({ hasText: 'Новая метка' }).click();
      await page.locator('#ae-name').fill('Headless marker'); await page.locator('#ae-ok').click(); await page.locator('#btnSaveOv').click();
      const downloadPromise = page.waitForEvent('download'); await page.locator('#btnExportOv').click();
      const download = await downloadPromise; const filename = path.join(out, 'test-map-overrides.json'); await download.saveAs(filename);
      assert(fs.readFileSync(filename, 'utf8').includes('Headless marker'), 'Marker missing from export');
      assert(!page.auditErrors.length, page.auditErrors.join('\n')); return { authenticatedFixture: true, exported: true };
    } finally { await ctx.close(); }
  });
  await record('failure: empty item response does not crash and malformed profile import preserves state', async () => {
    const ctx = await context(), page = await ctx.newPage();
    await ctx.route('https://json.tarkov.dev/pve/items', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"data":{"items":{}}}' }));
    try {
      await page.goto(base + '/tools/tarkovtool-armor.html'); await page.locator('#loadBtn').click(); await page.waitForFunction(() => !document.querySelector('#loadBtn').disabled);
      assert(!page.auditErrors.length, page.auditErrors.join('\n'));
      await page.goto(base + '/tools/tarkovtool-my-tarkov.html'); const before = await page.locator('#profileSelect option').count();
      await page.locator('#importFile').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
      await pause(300); assert(await page.locator('#profileSelect option').count() === before, 'Malformed import changed profiles');
      return { emptyResponse: true, malformedImport: true };
    } finally { await ctx.close(); }
  });
  await record('failure: API HTTP 500 shows error and load button can retry', async () => {
    const ctx = await context(), page = await ctx.newPage(); let fail = true;
    await ctx.route('https://json.tarkov.dev/pve/items', route => fail ? route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, body: '{}' }) : route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: snapshots.get('https://json.tarkov.dev/pve/items').body }));
    try {
      await page.goto(base + '/tools/tarkovtool-armor.html'); await page.locator('#loadBtn').click();
      await page.waitForFunction(() => !document.querySelector('#loadBtn').disabled);
      assert(/500/.test(await page.locator('#status').innerText()), 'No meaningful error');
      fail = false; await page.locator('#loadBtn').click(); await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0);
      assert(!page.auditErrors.length, page.auditErrors.join('\n')); return { retried: true };
    } finally { await ctx.close(); }
  });
}
async function fetchSnapshots(ctx) {
  const urls = ['pve', 'regular'].flatMap(mode => ['items', 'tasks', 'crafts', 'barters', 'hideout', 'traders', 'maps'].map(kind => 'https://json.tarkov.dev/' + mode + '/' + kind));
  urls.push(...['pve','regular'].flatMap(mode => ['items','tasks','maps','traders','hideout'].flatMap(kind => ['ru','en'].map(lang => 'https://json.tarkov.dev/' + mode + '/' + kind + '_' + lang))));
  for (const url of urls) {
    const file = path.join(snapshotDir, url.replace(/^https:\/\//, '').replace(/[^a-z0-9.-]/gi, '_') + '.json');
    let value;
    if (fs.existsSync(file)) value = JSON.parse(fs.readFileSync(file, 'utf8'));
    else {
      const response = await ctx.request.get(url, { timeout: 30000 });
      value = { url, fetchedAt: new Date().toISOString(), status: response.status(), body: await response.text() };
      fs.writeFileSync(file, JSON.stringify(value));
    }
    snapshots.set(url, value);
    if (value.status !== 200) console.log('DATA ' + value.status + ' ' + url);
  }
  console.log('DATA snapshots ready: ' + snapshots.size + ' endpoints');
}
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  const edge = process.env.PLAYWRIGHT_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser = await playwright.chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}) });
  const ctx = await context();
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  await record('headless launch and local hub', async () => {
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.openToolAsMini === 'function');
    return { title: await page.title(), catalog: await page.locator('[data-open]').count(), errors: page.auditErrors };
  });
  await record('live data API connectivity', async () => {
    const data = await page.evaluate(async () => {
      const r = await fetch('https://json.tarkov.dev/pve/items');
      const j = await r.json();
      return { status: r.status, sampleKeys: Object.keys(j).slice(0, 5), array: Array.isArray(j), count: Array.isArray(j) ? j.length : Object.keys(j.data || j).length };
    });
    assert(data.status === 200, 'API status ' + data.status); return data;
  });
  await fetchSnapshots(ctx);
  if (phase === 'snapshots') {
    console.log('Snapshot item structure: ' + JSON.stringify(Object.keys(JSON.parse(snapshots.get('https://json.tarkov.dev/pve/items').body).data)));
    await ctx.close(); return;
  }
  if (['all', 'smoke', 'exercise'].includes(phase)) await inspectTools();
  if (phase === 'all' || phase === 'flows') await workflows();
  await page.screenshot({ path: path.join(out, 'hub.png'), fullPage: true });
  await ctx.close();
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  console.log('Report: ' + path.join(out, 'results.json'));
  if (results.some(r => r.status === 'fail')) process.exitCode = 1;
});
