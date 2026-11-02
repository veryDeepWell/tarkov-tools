/* Contract tests for the application boundary, independent of pages and production API. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let passed = 0;
function env() {
  const memory = new Map([['tarkovLang', 'ru']]);
  const c = { URL, console, Map, Date, fetch: async () => { throw Error('unexpected network'); },
    TarkovStorage: { get: (k, d) => memory.has(k) ? memory.get(k) : d, set: (k, v) => memory.set(k, v),
      keys: p => [...memory.keys()].filter(k => k.startsWith(p)), remove: k => memory.delete(k), getJson: (k, d) => memory.has(k) ? JSON.parse(memory.get(k)) : d } };
  c.window = c; vm.createContext(c);
  for (const f of ['tarkov-data.js', 'tarkov-item-media.js', 'tarkov-api.js']) vm.runInContext(fs.readFileSync(path.join(root, 'core', f), 'utf8'), c);
  return c;
}
async function test(name, run) { await run(); passed++; console.log('PASS ' + name); }
const oid = '54cb57776803fa99248b456e';
const packet = name => ({ data: { items: [{ id: oid, name, shortName: oid + ' ShortName', normalizedName: 'first-aid-kit', properties: { slots: [{ name: 'mod_scope' }], stimEffects: [{ type: 'HealthRate' }] } }] } });
(async () => {
  await test('ingestion owns label policy and preserves identifiers/machine fields', () => {
    const c = env(), source = packet(oid + ' Name');
    const result = c.TarkovData.ingest('items', source, { mode: 'pve', lang: 'ru' });
    assert.equal(result[0].name, 'First Aid Kit'); assert.equal(result[0].shortName, 'First Aid Kit');
    assert.equal(result[0].id, oid); assert.equal(result[0].properties.slots[0].name, 'mod_scope');
    assert.equal(result[0].properties.stimulatorBuffs[0].type, 'HealthRate');
    assert.equal(source.data.items[0].name, oid + ' Name');
  });
  await test('returned models cannot corrupt the registry or another caller', () => {
    const c = env(); const rows = c.TarkovData.ingest('items', packet('Аптечка'), { mode: 'pve', lang: 'ru' });
    rows[0].name = 'corrupt'; rows[0].properties.slots[0].name = 'corrupt';
    const copy = c.TarkovData.get('item', oid); copy.name = 'also corrupt';
    assert.equal(c.TarkovData.label('item', oid), 'Аптечка');
    assert.equal(c.TarkovData.get('item', oid).properties.slots[0].name, 'mod_scope');
  });
  await test('mode and language are isolated; unresolved IDs are data, never display labels', () => {
    const c = env(); c.TarkovData.ingest('items', packet('PvE'), { mode: 'pve', lang: 'ru' });
    c.TarkovData.ingest('items', packet('PvP'), { mode: 'regular', lang: 'ru' });
    assert.equal(c.TarkovData.label('item', oid, { mode: 'pvp', lang: 'ru' }), 'PvP');
    const missing = c.TarkovData.resolve('item', oid, { mode: 'pve', lang: 'de' });
    assert.equal(missing.id, oid); assert.equal(missing.resolved, false); assert.ok(!missing.label.includes(oid));
  });
  await test('invalid shapes and duplicates are rejected atomically; empty is a valid state', () => {
    const c = env(); c.TarkovData.ingest('items', packet('Keep'));
    for (const bad of [{ data: { categories: [] } }, { data: [null] }, { data: [{ name: 'no ID' }] }, { data: [{ id: oid }, { id: oid }] }])
      assert.throws(() => c.TarkovData.ingest('items', bad));
    assert.equal(c.TarkovData.get('item', oid).name, 'Keep');
    c.TarkovData.ingest('items', { data: { items: [] } }); assert.equal(c.TarkovData.status('items').state, 'empty');
  });
  await test('missing names have explicit provenance and remain unresolved', () => {
    const c = env(); c.TarkovData.ingest('items', { data: [{ id: oid, name: oid + ' Name' }] });
    assert.equal(c.TarkovData.resolve('item', oid).resolved, false);
    assert.equal(c.TarkovData.status('items').warnings[0].reason, 'missing-name');
  });
  await test('task-only items resolve without being confused with quest IDs', () => {
    const c = env(); c.TarkovData.ingest('tasks', { data: { tasks: [{ id: 'task', name: 'Задание' }], questItems: [{ id: oid, name: 'Часы' }] } });
    assert.equal(c.TarkovData.label('item', oid), 'Часы'); assert.equal(c.TarkovData.get('quest', oid), null);
    assert.throws(() => c.TarkovData.ingest('tasks', { data: { tasks: [{ id: 'task', name: 'Bad replacement' }], questItems: [null] } }));
    assert.equal(c.TarkovData.label('quest', 'task'), 'Задание');
  });
  await test('load tickets reject stale generation, mode and language', () => {
    const c = env(), channel = c.TarkovData.latest(); const first = channel.begin({ mode: 'pve', lang: 'ru' });
    assert.ok(first.current({ mode: 'pve', lang: 'ru' }));
    assert.ok(!first.current({ mode: 'pvp', lang: 'ru' })); assert.ok(!first.current({ mode: 'pve', lang: 'en' }));
    channel.begin({ mode: 'pve', lang: 'ru' }); assert.ok(!first.active());
    channel.invalidate(); assert.ok(!first.current({ mode: 'pve', lang: 'ru' }));
  });
  await test('simultaneous consumers share transport but receive independent objects', async () => {
    const c = env(); let calls = 0, release;
    c.fetch = async () => { calls++; await new Promise(r => { release = r; }); return { ok: true, json: async () => packet('One') }; };
    const a = c.TarkovAPI.items('pve'), b = c.TarkovAPI.items('pve');
    release(); const [x, y] = await Promise.all([a, b]); assert.equal(calls, 1);
    x[0].properties.slots[0].name = 'bad'; assert.equal(y[0].properties.slots[0].name, 'mod_scope');
  });
  await test('fresh response wins transport cache and registry even when old response arrives last', async () => {
    const c = env(); let old;
    c.fetch = async () => new Promise(r => { old = r; });
    const earlier = c.TarkovAPI.items('pve');
    c.fetch = async () => ({ ok: true, json: async () => packet('Fresh') });
    await c.TarkovAPI.items('pve', { noCache: true });
    old({ ok: true, json: async () => packet('Old') }); await earlier;
    assert.equal(c.TarkovData.get('item', oid).name, 'Fresh');
    assert.equal((await c.TarkovAPI.items('pve'))[0].name, 'Fresh');
  });
  await test('failed transport is visible in the shared state and a retry can recover', async () => {
    const c = env(); c.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(c.TarkovAPI.items('pve'), /503/); assert.equal(c.TarkovData.status('items').state, 'error');
    c.fetch = async () => ({ ok: true, json: async () => packet('Recovered') }); await c.TarkovAPI.items('pve');
    assert.equal(c.TarkovData.status('items').state, 'ready');
  });
  await test('locale failure cannot expose technical objective descriptions or mutate machine enums', async () => {
    const c = env();
    const source = { data: { tasks: [{ id: 'task', name: oid + ' Name', normalizedName: 'first-task', objectives: [{ type: 'findItem', description: oid + ' Description' }] }] }, translations: ['$.data.tasks[*].name', '$.data.tasks[*].objectives[*].description', '$.data.tasks[*].objectives[*].type'] };
    c.fetch = async url => /tasks_ru$/.test(url) ? { ok: false, status: 503 } : { ok: true, json: async () => source };
    const rows = await c.TarkovAPI.tasks('pve');
    assert.equal(rows[0].name, 'First Task'); assert.equal(rows[0].objectives[0].description, '');
    assert.equal(rows[0].objectives[0].type, 'findItem'); assert.equal(source.data.tasks[0].objectives[0].description, oid + ' Description');
  });
  await test('async load retains its captured language instead of registering into the newly selected language', async () => {
    const c = env(); let release;
    const source = packet(oid + ' Name'); source.translations = ['$.data.items[*].name'];
    c.fetch = async url => /items_ru$/.test(url) ? { ok: true, json: async () => ({ data: { [oid + ' Name']: 'Аптечка' } }) } : new Promise(r => { release = r; });
    const task = c.TarkovAPI.items('pve'); c.TarkovStorage.set('tarkovLang', 'en');
    release({ ok: true, json: async () => source }); await task;
    assert.equal(c.TarkovData.get('item', oid, { lang: 'ru' }).name, 'Аптечка');
    assert.equal(c.TarkovData.get('item', oid, { lang: 'en' }), null);
  });
  console.log('Data contracts: PASS (' + passed + ' scenarios)');
})().catch(e => { console.error(e); process.exitCode = 1; });
