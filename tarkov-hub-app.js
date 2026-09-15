window.TarkovHubMini = true;

const CATALOG = [
  {"file":"tarkovtool-my-tarkov.html","title":"My Tarkov","description":"Дашборд: профиль, алерты цен."},
  {"file":"tarkovtool-cultist.html","title":"Круг культистов","description":"Base 350k/400k, бартер-цепочки."},
  {"file":"tarkovtool-price-track.html","title":"Динамика цен","description":"Снимки flea, графики."},
  {"file":"tarkovtool-nvg.html","title":"ПНВ","description":"ПНВ score."},
  {"file":"tarkovtool-helmets.html","title":"Шлемы","description":"Класс, зоны, штрафы."},
  {"file":"tarkovtool-ammo.html","title":"Патроны","description":"Пробитие по калибрам."},
  {"file":"tarkovtool-armor.html","title":"Броня","description":"Рейтинг брони."},
  {"file":"tarkovtool-barter-calc.html","title":"Бартер (ручной)","description":"Калькулятор бартера."},
  {"file":"tarkovtool-barter-live.html","title":"Бартер (live)","description":"Бартер с API."},
  {"file":"tarkovtool-bosses.html","title":"Боссы и гуны","description":"Боссы и ротации."},
  {"file":"tarkovtool-btc-farm.html","title":"Биткоин-ферма","description":"ROI майнинга."},
  {"file":"tarkovtool-compare.html","title":"Сравнение","description":"Сравнение предметов."},
  {"file":"tarkovtool-containers.html","title":"Разгрузки и рюкзаки","description":"Контейнеры."},
  {"file":"tarkovtool-crafts.html","title":"Крафты убежища","description":"ROI крафтов."},
  {"file":"tarkovtool-drip.html","title":"Дрип по цветам","description":"Экип по цветам."},
  {"file":"tarkovtool-gun-budget.html","title":"Сборка за N ₽","description":"Оружие под бюджет."},
  {"file":"tarkovtool-gun-builder.html","title":"Gun Builder","description":"Сборка по слотам."},
  {"file":"tarkovtool-hideout-mgmt.html","title":"Качатель Hideout Management","description":"Крафты на скилл."},
  {"file":"tarkovtool-hideout.html","title":"Трекер убежища","description":"Станции и шоплист."},
  {"file":"tarkovtool-item-use.html","title":"Что с предметом","description":"Продажа, крафт, квесты."},
  {"file":"tarkovtool-keys.html","title":"Ключи","description":"Ключи по картам."},
  {"file":"tarkovtool-lang-search.html","title":"EN ↔ RU поиск","description":"Двойной поиск."},
  {"file":"tarkovtool-loot-slot.html","title":"Лут ₽/слот","description":"Цена за клетку."},
  {"file":"tarkovtool-mags.html","title":"Магазины","description":"Магазины."},
  {"file":"tarkovtool-medkits.html","title":"Аптечки","description":"Медицина."},
  {"file":"tarkovtool-mods.html","title":"Моды","description":"Рейтинг обвесов."},
  {"file":"tarkovtool-plates.html","title":"Плиты","description":"Бронеплиты."},
  {"file":"tarkovtool-quest-items.html","title":"Квест-предметы","description":"FIR для квестов."},
  {"file":"tarkovtool-quests.html","title":"Квесты · карты","description":"Глоссарий квестов."},
  {"file":"tarkovtool-raid-checklist.html","title":"Чек-лист рейда","description":"Сборки под карты."},
  {"file":"tarkovtool-restock.html","title":"Таймер рестока","description":"Ресток торговцев."},
  {"file":"tarkovtool-scopes.html","title":"Прицелы","description":"Оптика."},
  {"file":"tarkovtool-shortname.html","title":"Короткие имена","description":"Short name."},
  {"file":"tarkovtool-skills.html","title":"Скиллы + чизы","description":"Трекер скиллов."},
  {"file":"tarkovtool-stim-combos.html","title":"Комбо стимуляторов","description":"Связки стимов."},
  {"file":"tarkovtool-stims.html","title":"Стимуляторы","description":"Рейтинг инъекторов."},
  {"file":"tarkovtool-streamer-flip.html","title":"Стример-флип","description":"Стримерские предметы."},
  {"file":"tarkovtool-trader-flip.html","title":"Трейдер-флип","description":"Перепродажа от торговца."}
];
const CHANGELOG = [
  {"date":"2026-09-15","items":["Мини-панель: иконки + hover","Expand только над рабочей зоной","Акцент в настройках","Открытие с хаба без сброса"]},
  {"date":"2026-09-11","items":["Единый дизайн","Тема / RU-EN","Импорт-экспорт"]},
  {"date":"2026-09-09","items":["Хаб для GitHub Pages"]}
];
const ICONS = [
  [/btc|bitcoin/i,"₿"],[/cultist/i,"⛧"],[/my-tarkov/i,"👤"],[/helmet/i,"🪖"],[/nvg/i,"🌑"],[/price-track/i,"📈"],[/ammo/i,"🔫"],[/armor/i,"🛡️"],[/barter/i,"🧮"],
  [/boss/i,"👹"],[/compare/i,"⚖️"],[/container/i,"🎒"],[/craft/i,"🔧"],[/drip/i,"🕶️"],[/gun-budget/i,"💰"],[/gun-builder/i,"🛠️"],
  [/hideout-mgmt/i,"🏠"],[/hideout/i,"🏗️"],[/key/i,"🔑"],[/lang/i,"🌐"],[/loot/i,"📦"],[/item-use/i,"💡"],[/mag/i,"📟"],[/medkit/i,"💊"],
  [/mods/i,"🔩"],[/plate/i,"🧱"],[/quest-item/i,"📋"],[/quest/i,"📜"],[/raid/i,"✅"],[/restock/i,"⏰"],[/scope/i,"🔭"],[/shortname/i,"🏷️"],
  [/skill/i,"📈"],[/stim/i,"💉"],[/streamer/i,"📺"],[/trader/i,"🏪"]
];

let expanded = null;
const frames = {};

function iconFor(file, title) {
  const hay = file + " " + title;
  for (const [re, emo] of ICONS) if (re.test(hay)) return emo;
  return "📎";
}
function esc(s) {
  return String(s || "").replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/>/g, "\u0026gt;").replace(/"/g, "\u0026quot;");
}
function titleOf(file) {
  const c = CATALOG.find(x => x.file === file);
  if (c) return c.title;
  const tabs = TarkovState.getMiniTabs();
  const t = tabs.find(x => x.file === file);
  return (t && t.title) || file;
}
function unreadCount(file) { return TarkovState.unreadForTool(file).length; }
function unreadItems(file) { return TarkovState.unreadForTool(file).slice(0, 8); }

function ensureFrame(file) {
  if (frames[file]) return frames[file];
  const ifr = document.createElement('iframe');
  ifr.src = file;
  ifr.title = titleOf(file);
  ifr.dataset.file = file;
  ifr.style.cssText = 'border:0;width:100%;height:100%;background:var(--bg)';
  document.getElementById('framePool').appendChild(ifr);
  frames[file] = ifr;
  return ifr;
}
function destroyFrame(file) {
  const ifr = frames[file];
  if (ifr) { ifr.remove(); delete frames[file]; }
}

function renderMiniList() {
  const tabs = TarkovState.getMiniTabs();
  const list = document.getElementById('miniList');
  const empty = document.getElementById('miniEmpty');
  empty.style.display = tabs.length ? 'none' : 'block';
  list.innerHTML = tabs.map(t => {
    const n = unreadCount(t.file);
    const act = expanded === t.file ? ' active' : '';
    const title = t.title || titleOf(t.file);
    return '<button type="button" class="mini-chip' + act + '" data-file="' + esc(t.file) + '" title="' + esc(title) + '">' +
      '<span class="ico">' + iconFor(t.file, title) + '</span>' +
      '<span class="label">' + esc(title) + '</span>' +
      (n ? '<span class="badge" data-tip="' + esc(t.file) + '">' + n + '</span>' : '') +
      '<span class="x" data-close="' + esc(t.file) + '" title="Закрыть">×</span>' +
    '</button>';
  }).join('');
  list.querySelectorAll('.mini-chip').forEach(btn => {
    btn.onclick = (e) => {
      const close = e.target.getAttribute('data-close');
      if (close) { e.stopPropagation(); closeTab(close); return; }
      expandTab(btn.getAttribute('data-file'));
    };
  });
  list.querySelectorAll('.badge').forEach(b => {
    b.onmouseenter = (e) => showTip(e, b.getAttribute('data-tip'));
    b.onmouseleave = hideTip;
  });
}

function showTip(e, file) {
  const items = unreadItems(file);
  const tip = document.getElementById('miniTip');
  if (!items.length) { tip.style.display = 'none'; return; }
  tip.innerHTML = items.map(n =>
    '<div class="row-n"><div class="t">' + esc(n.title) + '</div><div class="b">' + esc(n.body || '') + '</div></div>'
  ).join('');
  tip.style.display = 'block';
  tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 300) + 'px';
  tip.style.top = Math.min(e.clientY + 12, window.innerHeight - 120) + 'px';
}
function hideTip() { document.getElementById('miniTip').style.display = 'none'; }

function expandTab(file) {
  if (expanded && expanded !== file && frames[expanded]) {
    const prev = frames[expanded];
    document.getElementById('framePool').appendChild(prev);
    prev.style.width = '0';
    prev.style.height = '0';
    prev.style.position = '';
  }
  ensureFrame(file);
  expanded = file;
  TarkovState.markToolRead(file);
  const host = document.getElementById('expandHost');
  const ifr = frames[file];
  host.appendChild(ifr);
  ifr.style.width = '100%';
  ifr.style.height = '100%';
  ifr.style.position = 'absolute';
  ifr.style.inset = '0';
  document.getElementById('hubExpand').classList.add('open');
  document.getElementById('expandTitle').textContent = titleOf(file);
  renderMiniList();
}

function collapseExpand() {
  if (!expanded) return;
  const ifr = frames[expanded];
  if (ifr) {
    document.getElementById('framePool').appendChild(ifr);
    ifr.style.width = '0';
    ifr.style.height = '0';
    ifr.style.position = '';
  }
  expanded = null;
  document.getElementById('hubExpand').classList.remove('open');
  renderMiniList();
}

function closeTab(file) {
  if (expanded === file) collapseExpand();
  destroyFrame(file);
  TarkovState.removeMiniTab(file);
  TarkovState.markToolRead(file);
  renderMiniList();
  TarkovState.getMiniTabs().forEach(t => ensureFrame(t.file));
}

function openToolAsMini(file) {
  const title = titleOf(file);
  TarkovState.addMiniTab({ file: file, title: title });
  ensureFrame(file);
  expandTab(file);
  renderMiniList();
}

function bootMini() {
  if (!window.TarkovState) {
    setTimeout(bootMini, 30);
    return;
  }
  const tabs = TarkovState.getMiniTabs() || [];
  tabs.forEach(t => { try { ensureFrame(t.file); } catch (e) {} });
  renderMiniList();
  const m = (location.hash || '').match(/mini=([^&]+)/);
  if (m) {
    const f = decodeURIComponent(m[1]);
    if (tabs.some(t => t.file === f)) setTimeout(() => expandTab(f), 50);
  }
}

window.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'tt-notify') renderMiniList();
});
window.addEventListener('storage', () => renderMiniList());
if (window.TarkovState && TarkovState.on) {
  TarkovState.on('notification', () => renderMiniList());
  TarkovState.on('mini', () => bootMini());
}

document.getElementById('btnCollapse').onclick = collapseExpand;
document.getElementById('btnCloseExpand').onclick = () => { if (expanded) closeTab(expanded); };

const PINS_KEY = 'tarkovHubPins';
function loadPins() { try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]'); } catch (e) { return []; } }
function savePins(pins) { try { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); } catch (e) {} }
function togglePin(file, ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  let pins = loadPins();
  if (pins.includes(file)) pins = pins.filter(f => f !== file); else pins.push(file);
  savePins(pins);
  if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep('ok');
  renderCatalog();
}
function cardHtml(t, pinned) {
  const pinTitle = pinned ? 'Открепить' : 'Закрепить';
  return '<div class="tool" data-open="' + esc(t.file) + '" role="link" tabindex="0">' +
    '<button type="button" class="tool-pin ' + (pinned ? 'on' : '') + '" data-pin="' + esc(t.file) + '" title="' + pinTitle + '">' + (pinned ? '📌' : '📍') + '</button>' +
    '<div class="tool-head">' +
      '<div class="tool-ico">' + iconFor(t.file, t.title) + '</div>' +
      '<div style="padding-right:28px"><h2>' + esc(t.title) + '</h2><p>' + esc(t.description || '') + '</p></div>' +
    '</div></div>';
}
function renderCatalog() {
  const q = (document.getElementById('q').value || '').toLowerCase().trim();
  const pins = loadPins();
  let list = CATALOG.slice();
  if (q) list = list.filter(t => (t.title + t.description).toLowerCase().includes(q));
  const pinned = list.filter(t => pins.includes(t.file));
  const rest = list.filter(t => !pins.includes(t.file));
  pinned.sort((a, b) => pins.indexOf(a.file) - pins.indexOf(b.file));
  document.getElementById('count').textContent = list.length + ' / ' + CATALOG.length;
  let html = '';
  if (pinned.length) {
    html += '<div class="pins-label" style="grid-column:1/-1">Закреплённые</div>';
    html += pinned.map(t => cardHtml(t, true)).join('');
    if (rest.length) html += '<div class="pins-label" style="grid-column:1/-1">Все инструменты</div>';
  }
  html += rest.map(t => cardHtml(t, false)).join('');
  document.getElementById('grid').innerHTML = html;
  document.querySelectorAll('.tool-pin').forEach(btn => {
    btn.onclick = (e) => togglePin(btn.getAttribute('data-pin'), e);
  });
  document.querySelectorAll('.tool[data-open]').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('.tool-pin')) return;
      if (e.ctrlKey || e.metaKey) {
        window.open(card.getAttribute('data-open'), '_blank');
        return;
      }
      openToolAsMini(card.getAttribute('data-open'));
    };
    card.onkeydown = (e) => {
      if (e.key === 'Enter') openToolAsMini(card.getAttribute('data-open'));
    };
  });
}
function renderChangelog() {
  document.getElementById('changelog').innerHTML = '<h3>Что изменилось</h3>' + CHANGELOG.map(b =>
    '<div style="margin-bottom:12px"><strong>' + esc(b.date) + '</strong><ul>' +
    b.items.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>'
  ).join('');
}
document.getElementById('q').addEventListener('input', renderCatalog);
renderCatalog();
renderChangelog();
bootMini();
