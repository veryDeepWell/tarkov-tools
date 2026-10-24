/*! Prestigeinator — R3.21 UX pass */
(function () {
  "use strict";

  var PRESTIGE_GRID = {
    1: { cols: 8, rows: 3 }, 2: { cols: 8, rows: 4 },
    3: { cols: 8, rows: 5 }, 4: { cols: 8, rows: 6 },
    5: { cols: 8, rows: 7 }, 6: { cols: 8, rows: 8 }
  };
  var PRIORITY = [
    { re: /bitcoin|physical-bitcoin/i, w: 40, tag: "капитал" },
    { re: /gp-coin|g-p-coin/i, w: 28, tag: "GP" },
    { re: /ledx|defibrillator|ophthalmoscope/i, w: 22, tag: "медик-хай" },
    { re: /moonshine|vodka|whiskey/i, w: 12, tag: "алко" },
    { re: /can-of-|squash|beef|slickers|alyonka|water|aquamari/i, w: 18, tag: "еда" },
    { re: /salewa|ifak|cms|splint|bandage|grizzly/i, w: 16, tag: "мед" },
    { re: /morphine|adrenaline|propital|stim|sj[0-9]|etg/i, w: 14, tag: "стимы" },
    { re: /roubles|dollars|euros/i, w: 8, tag: "валюта" },
    { re: /ssd|virtex|graphics-card|tetriz|roler|lion|cat/i, w: 15, tag: "мелкий" }
  ];
  var DEMO = [
    { id: "demo-btc", name: "Bitcoin", w: 1, h: 1, price: 450000 },
    { id: "demo-ledx", name: "LEDX", w: 1, h: 1, price: 600000 },
    { id: "demo-gpu", name: "Graphics card", w: 2, h: 1, price: 280000 },
    { id: "demo-moon", name: "Moonshine", w: 1, h: 2, price: 180000 },
    { id: "demo-salewa", name: "Salewa", w: 1, h: 2, price: 25000 },
    { id: "demo-water", name: "Water", w: 1, h: 2, price: 12000 },
    { id: "demo-ifak", name: "IFAK", w: 1, h: 1, price: 18000 },
    { id: "demo-ssd", name: "SSD", w: 1, h: 1, price: 90000 },
    { id: "demo-sugar", name: "Sugar", w: 1, h: 1, price: 35000 },
    { id: "demo-cord", name: "Cordura", w: 2, h: 1, price: 22000 }
  ];

  var itemsById = Object.create(null);
  var questNeed = Object.create(null);
  var tasksCache = [];
  var grid = null;
  var gridDimsKey = "";
  var dataReady = false;
  var dataMode = "";
  var demoActive = false;
  var suggestTimer = null;
  var loadRequest = 0;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmt(n) { return Math.round(Number(n) || 0).toLocaleString("ru-RU"); }
  function setStatus(msg, ok) {
    var el = $("status");
    if (!el) return;
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = msg || "";
  }
  function asArray(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "object") return Object.values(x);
    return [];
  }
  function itemName(it) {
    if (!it) return "?";
    try { if (window.TarkovItemMedia && TarkovItemMedia.name) return TarkovItemMedia.name(it); } catch (e) {}
    try { if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it); } catch (e2) {}
    return it.shortName || it.name || it.normalizedName || it.id || "?";
  }
  function itemIcon(it) {
    try { if (window.TarkovItemMedia && TarkovItemMedia.icon) return TarkovItemMedia.icon(it); } catch (e) {}
    return it && (it.displayIconLink || it.iconLink || it.gridImageLink || it.image512pxLink) || "";
  }
  function dims(it) {
    var d = window.TarkovItemGrid && TarkovItemGrid.dimsFromItem
      ? TarkovItemGrid.dimsFromItem(it) : { w: Number(it.width || it.w) || 1, h: Number(it.height || it.h) || 1 };
    return { w: Math.max(1, Math.floor(Number(d.w) || 1)), h: Math.max(1, Math.floor(Number(d.h) || 1)) };
  }
  function unitPrice(it) {
    if (!it) return 0;
    return Number(it.price) || Number(it.avg24hPrice) || Number(it.lastLowPrice) ||
      Number(it.low24hPrice) || Number(it.basePrice) || 0;
  }
  function isBulkyCase(it) {
    var p = it.properties || {};
    var nn = String(it.normalizedName || "");
    return p.propertiesType === "ItemPropertiesContainer" || /(^|[-_])(case|thicc|trunk|secure-container|gamma|kappa|epsilon|alpha|beta)([-_]|$)/i.test(nn);
  }
  function priorityBoost(it) {
    var nn = [it.normalizedName, it.shortName, it.name].filter(Boolean).join(" ");
    var tags = [], weight = 0;
    PRIORITY.forEach(function (p) { if (p.re.test(nn)) { weight += p.w; tags.push(p.tag); } });
    return { w: weight, tags: tags };
  }
  function buildQuestNeed(tasks, maxLvl) {
    questNeed = Object.create(null);
    asArray(tasks).forEach(function (t) {
      var lvl = Number(t.minPlayerLevel) || 1;
      if (lvl > maxLvl) return;
      asArray(t.objectives).forEach(function (o) {
        var typ = o.type || "";
        if (typ !== "giveItem" && typ !== "findItem") return;
        var count = Number(o.count) || 1;
        var refs = o.items || o.item || [];
        if (typeof refs === "string") refs = [refs];
        else if (!Array.isArray(refs) && refs && typeof refs === "object") refs = refs.id ? [refs] : Object.values(refs);
        var qn = t.name || t.normalizedName || t.id || "Квест";
        asArray(refs).forEach(function (ref) {
          var id = typeof ref === "string" ? ref : ref && (ref.id || ref.itemId || (ref.item && ref.item.id));
          if (!id) return;
          if (!questNeed[id]) questNeed[id] = { qty: 0, quests: [], kappa: false };
          questNeed[id].qty += count;
          if (t.kappaRequired) questNeed[id].kappa = true;
          if (questNeed[id].quests.indexOf(qn) < 0 && questNeed[id].quests.length < 6) questNeed[id].quests.push(qn);
        });
      });
    });
  }
  function scoreItem(it, focus) {
    var d = dims(it), price = unitPrice(it), slots = d.w * d.h;
    var density = slots ? price / slots : 0;
    var qn = questNeed[it.id], qQty = qn ? qn.qty : 0;
    var boost = priorityBoost(it), stack = Number(it.stackMaxSize) || 1;
    var stackBonus = stack > 1 ? Math.min(12, Math.log2(stack) * 3) : 0;
    var qScore = Math.min(qQty, 40) * 3;
    if (qn && qn.kappa) qScore += 18;
    var score;
    if (focus === "money") score = density / 8000 + boost.w * 0.35 + stackBonus;
    else if (focus === "quests") score = qScore * 2.2 + boost.w * 0.4 + Math.min(10, density / 80000);
    else if (focus === "kappa") score = qScore * 1.6 + (qn && qn.kappa ? 30 : 0) + boost.w;
    else if (focus === "density") score = density / 5000 + stackBonus + boost.w * 0.2;
    else score = qScore + boost.w + stackBonus + Math.min(35, density / 50000);
    return { it: it, id: it.id, name: itemName(it), icon: itemIcon(it), price: price,
      w: d.w, h: d.h, density: density, qQty: qQty, tags: boost.tags, score: score };
  }
  function ensureGrid() {
    if (!window.TarkovItemGrid || !TarkovItemGrid.create) {
      setStatus("Не найден движок сетки TarkovItemGrid", false); return null;
    }
    var host = $("prestigeGrid");
    if (!host) { setStatus("Не найден контейнер сетки", false); return null; }
    var pLvl = Number(($("prestige") && $("prestige").value) || 6);
    var sz = PRESTIGE_GRID[pLvl] || PRESTIGE_GRID[6];
    var key = sz.cols + "x" + sz.rows;
    if (!grid) {
      grid = TarkovItemGrid.create(host, { cols: sz.cols, rows: sz.rows, cellSize: 44, onChange: updateSummary });
      gridDimsKey = key;
    } else if (key !== gridDimsKey) {
      grid.setSize(sz.cols, sz.rows);
      gridDimsKey = key;
    }
    updateSummary();
    return grid;
  }
  function updateSummary() {
    var el = $("gridSummary");
    if (!el || !grid) return;
    var current = grid.getItems(), value = 0, questish = 0;
    current.forEach(function (x) {
      var it = (x.data && x.data.it) || itemsById[x.id];
      value += unitPrice(it) || Number((x.data && x.data.price) || 0);
      if (questNeed[x.id]) questish += 1;
    });
    el.innerHTML = "Слоты: <b>" + grid.usedSlots() + "</b> / " + grid.totalSlots() +
      " · ~<b>" + fmt(value) + "</b> ₽ · квестовых: <b>" + questish + "</b>";
  }
  function paintHints(list) {
    var box = $("packHints");
    if (!box) return;
    if (!list || !list.length) {
      box.textContent = "Выбери «Собрать престиж» для автоматического подбора или добавляй предметы через поиск.";
      return;
    }
    var value = 0;
    box.innerHTML = list.slice(0, 20).map(function (r) {
      value += Number(r.price) || 0;
      var why = (r.tags || []).map(function (t) { return '<span class="badge">' + esc(t) + "</span>"; }).join(" ");
      if (r.qQty) why = '<span class="badge q">квест ×' + r.qQty + "</span> " + why;
      return '<div style="display:flex;gap:8px;align-items:center;margin:0 0 8px">' +
        (r.icon ? '<img src="' + esc(r.icon) + '" alt="" loading="lazy" style="width:38px;height:34px;object-fit:contain" onerror="this.hidden=true">' : "") +
        '<div><b>' + esc(r.name) + '</b><div class="meta">' + r.w + "×" + r.h + " · " +
        (r.price ? fmt(r.price) + " ₽" : "нет цены") + " · " + why + "</div></div></div>";
    }).join("") + '<div class="meta" style="margin-top:8px">Суммарная ориентировочная стоимость: <b>' + fmt(value) + " ₽</b></div>";
  }
  function seedDemo() {
    if (!ensureGrid()) return;
    grid.clear();
    DEMO.forEach(function (d) {
      grid.addItem({ id: d.id, name: d.name, w: d.w, h: d.h, meta: fmt(d.price) + " ₽", data: { it: d, price: d.price } });
    });
    paintHints(DEMO.map(function (d) { return { name: d.name, w: d.w, h: d.h, price: d.price, tags: ["пример"], qQty: 0 }; }));
    demoActive = true;
    setStatus("Демо-режим: это примерная раскладка, а не данные API.", true);
  }
  function searchItems(q) {
    if (!dataReady) return [];
    q = String(q || "").trim().toLowerCase();
    if (q.length < 2) return [];
    return Object.keys(itemsById).map(function (id) { return itemsById[id]; }).filter(function (it) {
      var hay = [it.normalizedName, it.shortName, it.name, it.id].filter(Boolean).join(" ").toLowerCase();
      try { if (window.TarkovNames && TarkovNames.matches) return TarkovNames.matches(it, q); } catch (e) {}
      return hay.indexOf(q) >= 0;
    }).sort(function (a, b) { return unitPrice(b) - unitPrice(a); }).slice(0, 40);
  }
  function renderSuggest(list) {
    var box = $("suggest");
    if (!box) return;
    if (!list.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = list.map(function (it) {
      var d = dims(it), icon = itemIcon(it);
      return '<button type="button" data-id="' + esc(it.id) + '" data-item-id="' + esc(it.id) + '" data-item-name="' + esc(itemName(it)) + '">' +
        (icon ? '<img src="' + esc(icon) + '" alt="" loading="lazy" style="width:40px;height:34px;object-fit:contain;float:left;margin-right:8px" onerror="this.hidden=true">' : "") +
        '<b>' + esc(itemName(it)) + '</b><div class="muted">' + d.w + "×" + d.h + " · " + (unitPrice(it) ? fmt(unitPrice(it)) + " ₽" : "нет цены") + "</div></button>";
    }).join("");
    box.querySelectorAll("button[data-id]").forEach(function (btn) {
      btn.onclick = function () { addById(btn.getAttribute("data-id")); box.hidden = true; if ($("itemSearch")) $("itemSearch").value = ""; };
    });
  }
  function addById(id) {
    if (!ensureGrid() || !id) return;
    var it = itemsById[id];
    if (!it && demoActive) it = DEMO.find(function (d) { return d.id === id; });
    if (!it) { setStatus("Предмет не найден — сначала загрузи данные", false); return; }
    var d = dims(it), name = itemName(it), icon = itemIcon(it);
    var placed = grid.addItem({ id: id, name: name, icon: icon, w: d.w, h: d.h,
      meta: unitPrice(it) ? fmt(unitPrice(it)) + " ₽" : "", data: { it: it, price: unitPrice(it) } });
    setStatus(placed ? "Добавлено: " + name : "Предмет не помещается в оставшееся место", !!placed);
  }
  function openOpt() {
    if (!dataReady) { setStatus("Сначала загрузи данные API. Демо не используется для расчёта.", false); return; }
    var panel = $("optPanel");
    if (panel) { panel.hidden = false; panel.classList.add("show"); }
  }
  function closeOpt() {
    var panel = $("optPanel");
    if (panel) { panel.classList.remove("show"); panel.hidden = true; }
  }
  function runAssemble() {
    if (!ensureGrid() || !dataReady) { setStatus("Невозможно собрать престиж без данных API", false); closeOpt(); return; }
    var focusEl = document.querySelector('input[name="focus"]:checked');
    var focus = focusEl ? focusEl.value : "balanced";
    var maxLvl = Math.max(1, Math.min(50, Number(($("maxLvl") && $("maxLvl").value) || 15)));
    try {
      if (window.TarkovProfile && TarkovProfile.playerLevel) maxLvl = Math.max(maxLvl, Number(TarkovProfile.playerLevel()) || maxLvl);
    } catch (e) {}
    if ($("maxLvl")) $("maxLvl").value = String(maxLvl);
    buildQuestNeed(tasksCache, maxLvl);
    var candidates = [];
    Object.keys(itemsById).forEach(function (id) {
      var it = itemsById[id];
      if (!it || !it.id || isBulkyCase(it)) return;
      var d = dims(it);
      if (d.w > 8 || d.h > 8) return;
      var r = scoreItem(it, focus);
      if (r.score < 2.5 && r.price < 8000 && r.qQty < 1) return;
      candidates.push({ id: r.id, name: r.name, icon: r.icon, w: r.w, h: r.h,
        meta: (r.price ? fmt(r.price) + " ₽" : "") + (r.qQty ? " · квест" : ""),
        data: { it: r.it, ranked: r, price: r.price }, score: r.score });
    });
    candidates.sort(function (a, b) { return b.score - a.score; });
    candidates = candidates.slice(0, 500);
    if (!candidates.length) { setStatus("По выбранному критерию не нашлось кандидатов", false); closeOpt(); return; }
    var placed = grid.pack(candidates, { clear: true });
    var ranked = placed.map(function (p) {
      var r = p.data && p.data.ranked;
      return { name: p.name, icon: p.icon, w: p.w, h: p.h,
        price: (r && r.price) || (p.data && p.data.price) || 0,
        tags: (r && r.tags) || [], qQty: (r && r.qQty) || 0 };
    });
    paintHints(ranked); updateSummary(); closeOpt(); demoActive = false;
    setStatus("Собрано " + placed.length + " предметов · критерий: " + focus + ". Проверь результат и при необходимости скорректируй вручную.", true);
  }
  async function load() {
    var btn = $("loadBtn"), requestId = ++loadRequest;
    if (btn) btn.disabled = true;
    dataReady = false;
    if ($("itemSearch")) $("itemSearch").disabled = true;
    setStatus("Загрузка предметов и квестов…");
    if (!window.TarkovAPI || typeof TarkovAPI.items !== "function") {
      setStatus("TarkovAPI не загружен. Проверь подключение core/tarkov-api.js", false);
      if (btn) btn.disabled = false;
      return;
    }
    var selectedMode = ($("gameMode") && $("gameMode").value) || "pve";
    try {
      var response = await TarkovAPI.items(selectedMode);
      var normalized = asArray(response).filter(function (it) { return it && it.id; });
      if (!normalized.length) throw new Error("API вернул пустой список предметов");
      var taskList = [];
      try { if (typeof TarkovAPI.tasks === "function") taskList = asArray(await TarkovAPI.tasks(selectedMode)); }
      catch (taskError) { console.warn("[tt:prestige] Tasks API unavailable", taskError); }
      if (requestId !== loadRequest) return;
      itemsById = Object.create(null);
      normalized.forEach(function (it) { itemsById[it.id] = it; });
      tasksCache = taskList;
      dataReady = true; dataMode = selectedMode; demoActive = false;
      if ($("itemSearch")) $("itemSearch").disabled = false;
      buildQuestNeed(tasksCache, Number(($("maxLvl") && $("maxLvl").value) || 15));
      renderSuggest([]); updateSummary();
      setStatus("Данные загружены · предметов: " + normalized.length + " · квестов: " + tasksCache.length +
        (tasksCache.length ? "" : " · квестовый приоритет недоступен"), true);
      // If we have no manual/example items yet, leave the board empty. Never silently replace it with demo data.
      if (grid && !grid.getItems().length) paintHints([]);
    } catch (err) {
      if (requestId !== loadRequest) return;
      dataReady = false; itemsById = Object.create(null); tasksCache = []; questNeed = Object.create(null);
      if ($("itemSearch")) { $("itemSearch").disabled = true; $("itemSearch").value = ""; }
      renderSuggest([]);
      setStatus("Не удалось загрузить данные: " + (err && err.message ? err.message : err) + ". Проверь соединение/API и повтори загрузку.", false);
    } finally {
      if (requestId === loadRequest && btn) btn.disabled = false;
    }
  }
  function refresh() {
    ensureGrid();
    buildQuestNeed(tasksCache, Number(($("maxLvl") && $("maxLvl").value) || 15));
    updateSummary();
  }
  function wire() {
    if (!ensureGrid()) return;
    if ($("loadBtn")) $("loadBtn").addEventListener("click", load);
    if ($("prestige")) $("prestige").addEventListener("change", function () { ensureGrid(); updateSummary(); });
    if ($("btnClear")) $("btnClear").addEventListener("click", function () { if (grid) grid.clear(); paintHints([]); setStatus("Окно очищено", true); });
    if ($("btnAssemble")) $("btnAssemble").addEventListener("click", openOpt);
    if ($("btnDemo")) $("btnDemo").addEventListener("click", seedDemo);
    if ($("optCancel")) $("optCancel").addEventListener("click", closeOpt);
    if ($("optRun")) $("optRun").addEventListener("click", runAssemble);
    if ($("optPanel")) $("optPanel").addEventListener("click", function (e) { if (e.target === $("optPanel")) closeOpt(); });
    document.querySelectorAll("#focusList label.focus").forEach(function (lab) {
      lab.addEventListener("click", function () {
        document.querySelectorAll("#focusList label.focus").forEach(function (x) { x.classList.remove("on"); });
        lab.classList.add("on");
        var inp = lab.querySelector("input"); if (inp) inp.checked = true;
      });
    });
    var search = $("itemSearch");
    if (search) {
      search.addEventListener("input", function () {
        clearTimeout(suggestTimer);
        suggestTimer = setTimeout(function () { renderSuggest(searchItems(search.value)); }, 120);
      });
      search.addEventListener("keydown", function (e) {
        if (e.key === "Escape") renderSuggest([]);
        if (e.key === "Enter") { var first = $("suggest") && $("suggest").querySelector("button[data-id]"); if (first) { e.preventDefault(); first.click(); } }
      });
    }
    document.addEventListener("click", function (e) {
      var box = $("suggest"), wrap = document.querySelector(".search-box");
      if (box && wrap && !wrap.contains(e.target)) box.hidden = true;
    });
    if ($("gameMode")) $("gameMode").addEventListener("change", function () { load(); });
    try { if (window.TarkovProfile && TarkovProfile.bindGameMode) TarkovProfile.bindGameMode("gameMode", { fallback: "pve" }); } catch (e) {}
    window.render = refresh;
    window.onProfileRefresh = refresh;
    // Start with real data and an empty, honest state. Demo content is opt-in via its button.
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
