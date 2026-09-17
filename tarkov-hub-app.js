window.TarkovHubMini = true;

const CATALOG = [{"file":"tarkovtool-my-tarkov.html","title":"My Tarkov","description":"Личный дашборд: заметки, быстрые ссылки и сводка по прогрессу","icon":"my-tarkov"},{"file":"tarkovtool-cultist.html","title":"Круг культистов","description":"Калькулятор обмена в круге: слоты, порог 350k, подбор предметов","icon":"cultist"},{"file":"tarkovtool-price-track.html","title":"Динамика цен","description":"График и история flea-цен по предметам, опрос по таймеру, уведомления","icon":"price-track"},{"file":"tarkovtool-price-alarm.html","title":"Price Alarm","description":"Сирена: цена ≤/≥ N или число офферов — пилик в фоне","icon":"price-alarm"},{"file":"tarkovtool-food.html","title":"Еда и вода","description":"Пища / вода / оба: цена, голод/жажда, итоговый рейтинг","icon":"food"},{"file":"tarkovtool-random-loadout.html","title":"Рандомный лоадаут","description":"Случайный ган (без модов), броня, разгрузка — paperdoll","icon":"random-loadout"},{"file":"tarkovtool-drip-loadout.html","title":"Дрип-лоадаут","description":"Случайный вид по стилю: дикий, профи, лесное чучело…","icon":"drip-loadout"},{"file":"tarkovtool-drip-builder.html","title":"Дрип-билдер","description":"Поиск обвесов по цветам (заглушка — в разработке)","icon":"drip-builder"},{"file":"tarkovtool-loadout-budget.html","title":"Лоадаут за N ₽","description":"Кит под бюджет: ган + броня + разгрузка (заглушка)","icon":"loadout-budget"},{"file":"tarkovtool-loadout-builder.html","title":"Лоадаут-билдер","description":"Сборка экипа по слотам как в игре, сохранение пресетов","icon":"loadout-builder"},{"file":"tarkovtool-nvg.html","title":"ПНВ","description":"Сравнение приборов ночного видения: слот, вес, цена","icon":"nvg"},{"file":"tarkovtool-helmets.html","title":"Шлемы","description":"Рейтинг шлемов: класс, зоны, рикошет, цена","icon":"helmets"},{"file":"tarkovtool-ammo.html","title":"Патроны","description":"Таблица патронов: урон, бронепробитие, фраг, цена","icon":"ammo"},{"file":"tarkovtool-armor.html","title":"Броня","description":"Бронежилеты: класс, зоны, прочность, цена за защиту","icon":"armor"},{"file":"tarkovtool-barter-calc.html","title":"Бартер (ручной)","description":"Калькулятор бартера с ручными ценами и комиссией flea","icon":"barter-calc"},{"file":"tarkovtool-barter-live.html","title":"Бартер (live)","description":"Бартеры с API: профит, курс, актуальные цены","icon":"barter-live"},{"file":"tarkovtool-bosses.html","title":"Боссы","description":"Шансы спавна боссов, карта, лут и свита","icon":"bosses"},{"file":"tarkovtool-btc-farm.html","title":"Биткоин-ферма","description":"Доходность GPU-фермы: слоты, электричество, ₽/сутки","icon":"btc-farm"},{"file":"tarkovtool-compare.html","title":"Сравнение","description":"Сравнить 2–4 предмета бок о бок по характеристикам","icon":"compare"},{"file":"tarkovtool-containers.html","title":"Контейнеры","description":"Контейнеры: слоты, ₽/клетка, что выгоднее носить","icon":"containers"},{"file":"tarkovtool-crafts.html","title":"Крафты","description":"Крафты убежища: время, ингредиенты, профит после крафта","icon":"crafts"},{"file":"tarkovtool-drip.html","title":"Дрип","description":"Подбор одежды и экипа по цветовой гамме","icon":"drip"},{"file":"tarkovtool-gun-budget.html","title":"Сборка за N","description":"Сборка оружия под бюджет: база + ключевые моды","icon":"gun-budget"},{"file":"tarkovtool-gun-builder.html","title":"Gun Builder","description":"Конструктор ствола: обвесы, эргономика, отдача, цена","icon":"gun-builder"},{"file":"tarkovtool-hideout-mgmt.html","title":"Hideout Mgmt","description":"Управление модулями убежища и требованиями к скиллам","icon":"hideout-mgmt"},{"file":"tarkovtool-hideout.html","title":"Трекер убежища","description":"Прогресс модулей: что строить, ресурсы, очереди","icon":"hideout"},{"file":"tarkovtool-item-use.html","title":"Что с предметом","description":"Куда уходит предмет: квесты, крафты, бартеры, убежище","icon":"item-use"},{"file":"tarkovtool-keys.html","title":"Ключи","description":"Ключи от дверей: карта, редкость, цена, стоит ли тащить","icon":"keys"},{"file":"tarkovtool-lang-search.html","title":"EN↔RU поиск","description":"Поиск предмета по английскому или русскому имени","icon":"lang-search"},{"file":"tarkovtool-loot-slot.html","title":"Лут ₽/слот","description":"Ценность лута за клетку инвентаря — что брать в первую очередь","icon":"loot-slot"},{"file":"tarkovtool-mags.html","title":"Магазины","description":"Магазины: ёмкость, эрго, совместимость, цена","icon":"mags"},{"file":"tarkovtool-medkits.html","title":"Аптечки","description":"Аптечки: HP, эффекты, цена лечения","icon":"medkits"},{"file":"tarkovtool-mods.html","title":"Моды","description":"Обвесы оружия: слоты, бонусы, цена","icon":"mods"},{"file":"tarkovtool-plates.html","title":"Плиты","description":"Бронеплиты: класс, зоны, вес, цена","icon":"plates"},{"file":"tarkovtool-quest-items.html","title":"Квест-предметы","description":"FIR-предметы для квестов: где найти, сколько нужно","icon":"quest-items"},{"file":"tarkovtool-quests.html","title":"Квесты","description":"Цепочки квестов, требования, награды, торговцы","icon":"quests"},{"file":"tarkovtool-raid-checklist.html","title":"Чек-лист рейда","description":"Собраться в рейд: мед, патроны, ключи, галочки","icon":"raid-checklist"},{"file":"tarkovtool-restock.html","title":"Таймер рестока","description":"Когда обновятся торговцы; уведомление в фоне","icon":"restock"},{"file":"tarkovtool-scopes.html","title":"Прицелы","description":"Оптика и коллиматоры: кратность, эрго, цена","icon":"scopes"},{"file":"tarkovtool-shortname.html","title":"Короткие имена","description":"Свои короткие названия предметов — используются во всех тулзах","icon":"shortname"},{"file":"tarkovtool-skills.html","title":"Скиллы","description":"Прокачка навыков: формулы, бонусы, что качать","icon":"skills"},{"file":"tarkovtool-stim-combos.html","title":"Комбо стимов","description":"Связки стимуляторов: эффекты, конфликты, цена забега","icon":"stim-combos"},{"file":"tarkovtool-stims.html","title":"Стимуляторы","description":"Инъекторы: бафы, дебафы, длительность, цена","icon":"stims"},{"file":"tarkovtool-streamer-flip.html","title":"Стример-флип","description":"Предметы со стримерских ивентов: скупка / перепродажа","icon":"streamer-flip"},{"file":"tarkovtool-trader-flip.html","title":"Трейдер-флип","description":"Покупка у торговца → продажа на flea: маржа и лимиты","icon":"trader-flip"}];
const CHANGELOG = [{"date":"2026-09-17","items":["Мини-табы, уведомления, soft-state","Категории каталога","Понятные описания тулзов","Price Alarm, еда, лоадауты","Иконки: TarkovIcons + assets/icons/","TarkovAPI, TarkovNames"]}];
const ICONS = [[/btc/i,"₿"],[/cultist/i,"⛧"],[/my-tarkov/i,"👤"],[/helmet/i,"🪖"],[/nvg/i,"🌑"],[/price-track/i,"📈"],[/price-alarm/i,"🔔"],[/food/i,"🍖"],[/random-loadout/i,"🎲"],[/loadout-budget/i,"💰"],[/loadout-builder/i,"🧰"],[/drip-builder/i,"🎨"],[/drip-loadout/i,"✨"],[/ammo/i,"🔫"],[/armor/i,"🛡️"],[/barter/i,"🧮"],[/boss/i,"👹"],[/compare/i,"⚖️"],[/container/i,"🎒"],[/craft/i,"🔧"],[/drip/i,"🕶️"],[/gun/i,"🛠️"],[/hideout/i,"🏗️"],[/key/i,"🔑"],[/lang/i,"🌐"],[/loot/i,"📦"],[/item-use/i,"💡"],[/mag/i,"📟"],[/med/i,"💊"],[/mods/i,"🔩"],[/plate/i,"🧱"],[/quest/i,"📜"],[/raid/i,"✅"],[/restock/i,"⏰"],[/scope/i,"🔭"],[/short/i,"🏷️"],[/skill/i,"📈"],[/stim/i,"💉"],[/streamer/i,"📺"],[/trader/i,"🏪"]];

let expanded = null;
const frames = {};
const statusMap = {};

function iconFor(file, title) {
  if (window.TarkovIcons && typeof TarkovIcons.html === "function") {
    return TarkovIcons.html(file, title);
  }
  const hay = file + " " + (title || "");
  for (const [re, emo] of ICONS) if (re.test(hay)) return emo;
  return "📎";
}
function esc(s) {
  return String(s || "").replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/>/g, "\u0026gt;").replace(/"/g, "\u0026quot;");
}
function titleOf(file) {
  const c = CATALOG.find(x => x.file === file);
  if (c) return c.title;
  try {
    const t = TarkovState.getMiniTabs().find(x => x.file === file);
    return (t && t.title) || file;
  } catch (e) { return file; }
}
function unreadCount(file) {
  try { return TarkovState.unreadForTool(file).length; } catch (e) { return 0; }
}
function unreadItems(file) {
  try { return TarkovState.unreadForTool(file).slice(0, 8); } catch (e) { return []; }
}
function poolStyle(ifr) {
  ifr.style.cssText = "border:0;width:1100px;height:800px;background:var(--bg)";
}
function expandStyle(ifr) {
  ifr.style.cssText = "border:0;width:100%;height:100%;flex:1 1 auto;min-height:0;max-height:100%;display:block;background:var(--bg)";
  ifr.setAttribute("scrolling", "yes");
}
function ensureFrame(file) {
  if (frames[file]) return frames[file];
  const pool = document.getElementById("framePool");
  if (!pool) return null;
  const ifr = document.createElement("iframe");
  ifr.src = file;
  ifr.title = titleOf(file);
  ifr.dataset.file = file;
  ifr.setAttribute("loading", "eager");
  ifr.setAttribute("scrolling", "yes");
  poolStyle(ifr);
  pool.appendChild(ifr);
  frames[file] = ifr;
  statusMap[file] = statusMap[file] || { ready: false, running: false, label: "", ts: 0 };
  ifr.addEventListener("load", function () {
    statusMap[file] = Object.assign({}, statusMap[file], { ready: true, ts: Date.now() });
    try { ifr.contentWindow.postMessage({ type: "tt-ping-status" }, "*"); } catch (e) {}
    renderMiniList();
  });
  return ifr;
}
function destroyFrame(file) {
  const ifr = frames[file];
  if (ifr) { ifr.remove(); delete frames[file]; }
  delete statusMap[file];
}
function frameStatus(file) {
  return statusMap[file] || { ready: false, running: false, label: "", ts: 0 };
}
function renderMiniList() {
  const list = document.getElementById("miniList");
  const bar = document.getElementById("miniBar");
  if (!list || !bar) return;
  let tabs = [];
  try { tabs = (window.TarkovState && TarkovState.getMiniTabs) ? TarkovState.getMiniTabs() : []; } catch (e) {}
  if (!tabs.length) { bar.hidden = true; list.innerHTML = ""; return; }
  bar.hidden = false;
  list.innerHTML = tabs.map(function (t) {
    const n = unreadCount(t.file);
    const st = frameStatus(t.file);
    const act = expanded === t.file ? " active" : "";
    const run = st.running ? " running" : "";
    const title = t.title || titleOf(t.file);
    return '<button type="button" class="mini-chip' + act + run + '" data-file="' + esc(t.file) + '">' +
      '<span class="ico">' + iconFor(t.file, title) + '</span>' +
      (n ? '<span class="badge">' + n + '</span>' : '') +
      (st.running ? '<span class="dot-run"></span>' : '') +
      '</button>';
  }).join("");
  list.querySelectorAll(".mini-chip").forEach(function (btn) {
    const file = btn.getAttribute("data-file");
    btn.onclick = function () { expandTab(file); };
    btn.onmouseenter = function (e) { showChipTip(e, file); };
    btn.onmouseleave = hideTip;
  });
}
function showChipTip(e, file) {
  const tip = document.getElementById("miniTip");
  if (!tip) return;
  const st = frameStatus(file);
  const items = unreadItems(file);
  const title = titleOf(file);
  var statusLine;
  if (!frames[file]) statusLine = "не загружен";
  else if (!st.ready) statusLine = "загрузка…";
  else if (st.running) statusLine = "● запущен" + (st.label ? " · " + st.label : "");
  else statusLine = "загружен (фон)";
  var html = '<div class="tip-title">' + esc(title) + '</div>';
  html += '<div class="tip-status' + (st.running ? " on" : "") + '">' + esc(statusLine) + '</div>';
  if (items.length) {
    html += items.map(function (n) {
      return '<div class="row-n"><div class="t">' + esc(n.title) + '</div><div class="b">' + esc(n.body || "") + '</div></div>';
    }).join("");
  } else {
    html += '<div class="b" style="color:var(--muted)">Нет непрочитанных</div>';
  }
  tip.innerHTML = html;
  tip.style.display = "block";
  tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 320) + "px";
  tip.style.top = Math.min(e.clientY + 14, window.innerHeight - 160) + "px";
}
function hideTip() {
  const tip = document.getElementById("miniTip");
  if (tip) tip.style.display = "none";
}
function expandTab(file) {
  try { hideTip(); } catch (e) {}
  try {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.body.classList.add("tt-expand-open");
    document.documentElement.style.overflow = "hidden";
  } catch (e) {}
  if (expanded && expanded !== file && frames[expanded]) {
    const prev = frames[expanded];
    const pool = document.getElementById("framePool");
    if (pool) pool.appendChild(prev);
    poolStyle(prev);
  }
  ensureFrame(file);
  expanded = file;
  const host = document.getElementById("expandHost");
  const ifr = frames[file];
  if (host && ifr) { host.appendChild(ifr); expandStyle(ifr); }
  const exp = document.getElementById("hubExpand");
  if (exp) exp.classList.add("open");
  const et = document.getElementById("expandTitle");
  if (et) et.textContent = titleOf(file);
  renderMiniList();
}
function collapseExpand() {
  if (!expanded) return;
  try {
    document.body.classList.remove("tt-expand-open");
    document.documentElement.style.overflow = "";
  } catch (e) {}
  const ifr = frames[expanded];
  if (ifr) {
    const pool = document.getElementById("framePool");
    if (pool) pool.appendChild(ifr);
    poolStyle(ifr);
  }
  expanded = null;
  const exp = document.getElementById("hubExpand");
  if (exp) exp.classList.remove("open");
  renderMiniList();
}
function closeTab(file) {
  try { hideTip(); } catch (e) {}
  if (expanded === file) collapseExpand();
  destroyFrame(file);
  try { TarkovState.removeMiniTab(file); TarkovState.markToolRead(file); } catch (e) {}
  renderMiniList();
}
function openToolAsMini(file) {
  const title = titleOf(file);
  try { TarkovState.addMiniTab({ file: file, title: title }); } catch (e) {}
  ensureFrame(file);
  expandTab(file);
  renderMiniList();
}
function bootMini() {
  if (!window.TarkovState) { setTimeout(bootMini, 40); return; }
  let tabs = [];
  try { tabs = TarkovState.getMiniTabs() || []; } catch (e) {}
  tabs.forEach(function (t) { try { ensureFrame(t.file); } catch (e) {} });
  renderMiniList();
  const m = (location.hash || "").match(/mini=([^&]+)/);
  if (m) {
    const f = decodeURIComponent(m[1]);
    if (tabs.some(function (t) { return t.file === f; })) setTimeout(function () { expandTab(f); }, 80);
  }
}
window.addEventListener("message", function (ev) {
  const d = ev.data;
  if (!d || typeof d !== "object") return;
  if (d.type === "tt-notify") {
    try {
      if (d.title && window.TarkovState && TarkovState.notify) {
        var tool = (d.tool || "").split("/").pop();
        var list = TarkovState.notifications ? TarkovState.notifications() : [];
        var recent = list.filter(function (n) {
          return n.tool === tool && n.title === d.title && !n.read && (Date.now() - (n.ts || 0)) < 3000;
        });
        if (!recent.length) {
          TarkovState.notify({ title: d.title, body: d.body || "", tool: tool, kind: d.kind || "ok" });
        }
      }
    } catch (e) {}
    renderMiniList();
    return;
  }
  if (d.type === "tt-status") {
    const tool = (d.tool || "").split("/").pop();
    if (!tool) return;
    statusMap[tool] = { ready: true, running: !!d.running, label: d.label || "", ts: Date.now() };
    renderMiniList();
  }
});
try {
  const _bc = new BroadcastChannel("tarkov-tools");
  _bc.onmessage = function (ev) {
    const d = ev.data;
    if (!d) return;
    if (d.type === "tt-status") {
      const tool = (d.tool || "").split("/").pop();
      if (!tool) return;
      statusMap[tool] = { ready: true, running: !!d.running, label: d.label || "", ts: Date.now() };
      renderMiniList();
    }
    if (d.type === "notification" || d.type === "mini") renderMiniList();
  };
} catch (e) {}
window.addEventListener("storage", function () { renderMiniList(); });
if (window.TarkovState && TarkovState.on) {
  TarkovState.on("notification", function () { renderMiniList(); });
  TarkovState.on("mini", function () { bootMini(); });
}
document.getElementById("btnCollapse").onclick = collapseExpand;
document.getElementById("btnCloseExpand").onclick = function () { if (expanded) closeTab(expanded); };
const PINS_KEY = "tarkovHubPins";
function loadPins() { try { return JSON.parse(localStorage.getItem(PINS_KEY) || "[]"); } catch (e) { return []; } }
function savePins(pins) { try { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); } catch (e) {} }
function togglePin(file, ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  let pins = loadPins();
  if (pins.includes(file)) pins = pins.filter(function (f) { return f !== file; }); else pins.push(file);
  savePins(pins);
  if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
  renderCatalog();
}
function cardHtml(t, pinned) {
  return '<div class="tool" data-open="' + esc(t.file) + '" role="link" tabindex="0">' +
    '<button type="button" class="tool-pin ' + (pinned ? "on" : "") + '" data-pin="' + esc(t.file) + '" title="' + (pinned ? "Открепить" : "Закрепить") + '">' + (pinned ? "📌" : "📍") + '</button>' +
    '<div class="tool-head"><div class="tool-ico">' + iconFor(t.file, t.title) + '</div>' +
    '<div style="padding-right:28px"><h2>' + esc(t.title) + '</h2><p>' + esc(t.description || '') + '</p></div></div></div>';
}
function renderCatalog() {
  const qEl = document.getElementById("q");
  const q = (qEl && qEl.value || "").toLowerCase().trim();
  const pins = loadPins();
  let list = CATALOG.slice();
  if (q) list = list.filter(function (t) { return (t.title + t.description).toLowerCase().includes(q); });
  const pinned = list.filter(function (t) { return pins.includes(t.file); });
  const rest = list.filter(function (t) { return !pins.includes(t.file); });
  pinned.sort(function (a, b) { return pins.indexOf(a.file) - pins.indexOf(b.file); });
  const count = document.getElementById("count");
  if (count) count.textContent = list.length + " / " + CATALOG.length;
  let html = "";
  if (pinned.length) {
    html += '<div class="pins-label" style="grid-column:1/-1">Закреплённые</div>';
    html += pinned.map(function (t) { return cardHtml(t, true); }).join("");
    if (rest.length) html += '<div class="pins-label" style="grid-column:1/-1">Все инструменты</div>';
  }
  html += rest.map(function (t) { return cardHtml(t, false); }).join("");
  const grid = document.getElementById("grid");
  if (grid) grid.innerHTML = html;
  document.querySelectorAll(".tool-pin").forEach(function (btn) {
    btn.onclick = function (e) { togglePin(btn.getAttribute("data-pin"), e); };
  });
  document.querySelectorAll(".tool[data-open]").forEach(function (card) {
    card.onclick = function (e) {
      if (e.target.closest(".tool-pin")) return;
      if (e.ctrlKey || e.metaKey) { window.open(card.getAttribute("data-open"), "_blank"); return; }
      openToolAsMini(card.getAttribute("data-open"));
    };
    card.onkeydown = function (e) { if (e.key === "Enter") openToolAsMini(card.getAttribute("data-open")); };
  });
}
function renderChangelog() {
  const el = document.getElementById("changelog");
  if (!el) return;
  el.innerHTML = "<h3>Что изменилось</h3>" + CHANGELOG.map(function (b) {
    return '<div style="margin-bottom:12px"><strong>' + esc(b.date) + '</strong><ul>' +
      b.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
  }).join('');
}
const qInput = document.getElementById("q");
if (qInput) qInput.addEventListener("input", renderCatalog);
renderCatalog();
renderChangelog();
bootMini();
setInterval(function () {
  Object.keys(frames).forEach(function (file) {
    try {
      var ifr = frames[file];
      if (ifr && ifr.contentWindow) ifr.contentWindow.postMessage({ type: "tt-ping-status" }, "*");
    } catch (e) {}
  });
}, 10000);
