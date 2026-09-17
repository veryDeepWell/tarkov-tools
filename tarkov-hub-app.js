window.TarkovHubMini = true;

const CATALOG = [{"file":"tarkovtool-my-tarkov.html","title":"My Tarkov","description":"Дашборд: профиль, алерты цен."},{"file":"tarkovtool-cultist.html","title":"Круг культистов","description":"Base 350k/400k, бартер-цепочки."},{"file":"tarkovtool-price-track.html","title":"Динамика цен","description":"Снимки flea, графики."},{"file":"tarkovtool-price-alarm.html","title":"Price Alarm","description":"Алерты: цена ≤/≥ N, офферы, интервал."},{"file":"tarkovtool-nvg.html","title":"ПНВ","description":"ПНВ score."},{"file":"tarkovtool-helmets.html","title":"Шлемы","description":"Класс, зоны, штрафы."},{"file":"tarkovtool-ammo.html","title":"Патроны","description":"Пробитие по калибрам."},{"file":"tarkovtool-armor.html","title":"Броня","description":"Рейтинг брони."},{"file":"tarkovtool-barter-calc.html","title":"Бартер (ручной)","description":"Калькулятор бартера."},{"file":"tarkovtool-barter-live.html","title":"Бартер (live)","description":"Бартер с API."},{"file":"tarkovtool-bosses.html","title":"Боссы и гуны","description":"Боссы и ротации."},{"file":"tarkovtool-btc-farm.html","title":"Биткоин-ферма","description":"ROI майнинга."},{"file":"tarkovtool-compare.html","title":"Сравнение","description":"Сравнение предметов."},{"file":"tarkovtool-containers.html","title":"Разгрузки и рюкзаки","description":"Контейнеры."},{"file":"tarkovtool-crafts.html","title":"Крафты убежища","description":"ROI крафтов."},{"file":"tarkovtool-drip.html","title":"Дрип по цветам","description":"Экип по цветам."},{"file":"tarkovtool-gun-budget.html","title":"Сборка за N ₽","description":"Оружие под бюджет."},{"file":"tarkovtool-gun-builder.html","title":"Gun Builder","description":"Сборка по слотам."},{"file":"tarkovtool-hideout-mgmt.html","title":"Качатель Hideout Management","description":"Крафты на скилл."},{"file":"tarkovtool-hideout.html","title":"Трекер убежища","description":"Станции и шоплист."},{"file":"tarkovtool-item-use.html","title":"Что с предметом","description":"Продажа, крафт, квесты."},{"file":"tarkovtool-keys.html","title":"Ключи","description":"Ключи по картам."},{"file":"tarkovtool-lang-search.html","title":"EN ↔ RU поиск","description":"Двойной поиск."},{"file":"tarkovtool-loot-slot.html","title":"Лут ₽/слот","description":"Цена за клетку."},{"file":"tarkovtool-mags.html","title":"Магазины","description":"Магазины."},{"file":"tarkovtool-medkits.html","title":"Аптечки","description":"Медицина."},{"file":"tarkovtool-mods.html","title":"Моды","description":"Рейтинг обвесов."},{"file":"tarkovtool-plates.html","title":"Плиты","description":"Бронеплиты."},{"file":"tarkovtool-quest-items.html","title":"Квест-предметы","description":"FIR для квестов."},{"file":"tarkovtool-quests.html","title":"Квесты · карты","description":"Глоссарий квестов."},{"file":"tarkovtool-raid-checklist.html","title":"Чек-лист рейда","description":"Сборки под карты."},{"file":"tarkovtool-restock.html","title":"Таймер рестока","description":"Ресток торговцев."},{"file":"tarkovtool-scopes.html","title":"Прицелы","description":"Оптика."},{"file":"tarkovtool-shortname.html","title":"Короткие имена","description":"Short name."},{"file":"tarkovtool-skills.html","title":"Скиллы + чизы","description":"Трекер скиллов."},{"file":"tarkovtool-stim-combos.html","title":"Комбо стимуляторов","description":"Связки стимов."},{"file":"tarkovtool-stims.html","title":"Стимуляторы","description":"Рейтинг инъекторов."},{"file":"tarkovtool-streamer-flip.html","title":"Стример-флип","description":"Стримерские предметы."},{"file":"tarkovtool-trader-flip.html","title":"Трейдер-флип","description":"Перепродажа от торговца."}];
const CHANGELOG = [{"date":"2026-09-17","items":["Горизонтальная мини-панель","Живые iframe","Null-safe render"]},{"date":"2026-09-15","items":["Мини-табы","Акцент"]},{"date":"2026-09-09","items":["Хаб"]}];
const ICONS = [[/btc|bitcoin/i,"₿"],[/cultist/i,"⛧"],[/my-tarkov/i,"👤"],[/helmet/i,"🪖"],[/nvg/i,"🌑"],[/price-track/i,"📈"],[/price-alarm/i,"🔔"],[/ammo/i,"🔫"],[/armor/i,"🛡️"],[/barter/i,"🧮"],[/boss/i,"👹"],[/compare/i,"⚖️"],[/container/i,"🎒"],[/craft/i,"🔧"],[/drip/i,"🕶️"],[/gun-budget/i,"💰"],[/gun-builder/i,"🛠️"],[/hideout-mgmt/i,"🏠"],[/hideout/i,"🏗️"],[/key/i,"🔑"],[/lang/i,"🌐"],[/loot/i,"📦"],[/item-use/i,"💡"],[/mag/i,"📟"],[/medkit/i,"💊"],[/mods/i,"🔩"],[/plate/i,"🧱"],[/quest-item/i,"📋"],[/quest/i,"📜"],[/raid/i,"✅"],[/restock/i,"⏰"],[/scope/i,"🔭"],[/shortname/i,"🏷️"],[/skill/i,"📈"],[/stim/i,"💉"],[/streamer/i,"📺"],[/trader/i,"🏪"]];

let expanded = null;
const frames = {};
const statusMap = {};

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
  try {
    const tabs = TarkovState.getMiniTabs();
    const t = tabs.find(x => x.file === file);
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
  ifr.style.cssText = "border:0;width:100%;height:100%;position:absolute;inset:0;background:var(--bg)";
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
  try { tabs = (window.TarkovState && TarkovState.getMiniTabs) ? TarkovState.getMiniTabs() : []; }
  catch (e) { tabs = []; }
  if (!tabs.length) {
    bar.hidden = true;
    list.innerHTML = "";
    return;
  }
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
  let statusLine;
  if (!frames[file]) statusLine = "не загружен";
  else if (!st.ready) statusLine = "загрузка…";
  else if (st.running) statusLine = "● запущен" + (st.label ? " · " + st.label : "");
  else statusLine = "загружен (фон)";
  let html = '<div class="tip-title">' + esc(title) + '</div>';
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
  if (expanded && expanded !== file && frames[expanded]) {
    const prev = frames[expanded];
    const pool = document.getElementById("framePool");
    if (pool) pool.appendChild(prev);
    poolStyle(prev);
  }
  ensureFrame(file);
  expanded = file;
  try { TarkovState.markToolRead(file); } catch (e) {}
  const host = document.getElementById("expandHost");
  const ifr = frames[file];
  if (host && ifr) {
    host.appendChild(ifr);
    expandStyle(ifr);
  }
  const exp = document.getElementById("hubExpand");
  if (exp) exp.classList.add("open");
  const et = document.getElementById("expandTitle");
  if (et) et.textContent = titleOf(file);
  renderMiniList();
}

function collapseExpand() {
  if (!expanded) return;
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
  if (expanded === file) collapseExpand();
  destroyFrame(file);
  try {
    TarkovState.removeMiniTab(file);
    TarkovState.markToolRead(file);
  } catch (e) {}
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
  if (!window.TarkovState) {
    setTimeout(bootMini, 40);
    return;
  }
  let tabs = [];
  try { tabs = TarkovState.getMiniTabs() || []; } catch (e) {}
  tabs.forEach(function (t) { try { ensureFrame(t.file); } catch (e) {} });
  renderMiniList();
  const m = (location.hash || "").match(/mini=([^&]+)/);
  if (m) {
    const f = decodeURIComponent(m[1]);
    if (tabs.some(function (t) { return t.file === f; })) {
      setTimeout(function () { expandTab(f); }, 80);
    }
  }
}

window.addEventListener("message", function (ev) {
  const d = ev.data;
  if (!d || typeof d !== "object") return;
  if (d.type === "tt-notify") { renderMiniList(); return; }
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
document.getElementById("btnCloseExpand").onclick = function () {
  if (expanded) closeTab(expanded);
};

const PINS_KEY = "tarkovHubPins";
function loadPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || "[]"); } catch (e) { return []; }
}
function savePins(pins) {
  try { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); } catch (e) {}
}
function togglePin(file, ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  let pins = loadPins();
  if (pins.includes(file)) pins = pins.filter(function (f) { return f !== file; });
  else pins.push(file);
  savePins(pins);
  if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
  renderCatalog();
}
function cardHtml(t, pinned) {
  const pinTitle = pinned ? "Открепить" : "Закрепить";
  return '<div class="tool" data-open="' + esc(t.file) + '" role="link" tabindex="0">' +
    '<button type="button" class="tool-pin ' + (pinned ? "on" : "") + '" data-pin="' + esc(t.file) + '" title="' + pinTitle + '">' +
    (pinned ? "📌" : "📍") + "</button>" +
    '<div class="tool-head">' +
      '<div class="tool-ico">' + iconFor(t.file, t.title) + "</div>" +
      '<div style="padding-right:28px"><h2>' + esc(t.title) + "</h2><p>" + esc(t.description || "") + "</p></div>" +
    "</div></div>";
}
function renderCatalog() {
  const qEl = document.getElementById("q");
  const q = (qEl && qEl.value || "").toLowerCase().trim();
  const pins = loadPins();
  let list = CATALOG.slice();
  if (q) list = list.filter(function (t) {
    return (t.title + t.description).toLowerCase().includes(q);
  });
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
      if (e.ctrlKey || e.metaKey) {
        window.open(card.getAttribute("data-open"), "_blank");
        return;
      }
      openToolAsMini(card.getAttribute("data-open"));
    };
    card.onkeydown = function (e) {
      if (e.key === "Enter") openToolAsMini(card.getAttribute("data-open"));
    };
  });
}
function renderChangelog() {
  const el = document.getElementById("changelog");
  if (!el) return;
  el.innerHTML = "<h3>Что изменилось</h3>" + CHANGELOG.map(function (b) {
    return '<div style="margin-bottom:12px"><strong>' + esc(b.date) + "</strong><ul>" +
      b.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>";
  }).join("");
}

const qInput = document.getElementById("q");
if (qInput) qInput.addEventListener("input", renderCatalog);
renderCatalog();
renderChangelog();
bootMini();
