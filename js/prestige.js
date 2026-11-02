/*! Prestigeinator — R3.21 UX pass */
(function () {
  "use strict";

  var PRESTIGE_GRID = {
    1: { cols: 8, rows: 3 }, 2: { cols: 8, rows: 4 },
    3: { cols: 8, rows: 5 }, 4: { cols: 8, rows: 6 },
    5: { cols: 8, rows: 7 }, 6: { cols: 8, rows: 8 }
  };
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
  var prestigeRules = [];
  function activeRule() { return TarkovPrestige.rule(prestigeRules, $("prestige").value); }
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
  function itemName(it) { return TarkovNames.display(it); }
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
    return TarkovPrestige.value(it);
  }
  function buildQuestNeed(tasks,maxLvl) {
    questNeed=Object.create(null);
    TarkovPrestige.demands(tasks,maxLvl).forEach(function(d){d.ids.forEach(function(id){
      if(!questNeed[id])questNeed[id]={qty:0,quests:[],kappa:false};
      questNeed[id].qty+=d.qty;questNeed[id].quests.push(d.name);questNeed[id].kappa=questNeed[id].kappa||d.kappa;
    });});
  }
  function ensureGrid() {
    if (!window.TarkovItemGrid || !TarkovItemGrid.create) {
      setStatus("Не найден движок сетки TarkovItemGrid", false); return null;
    }
    var host = $("prestigeGrid");
    if (!host) { setStatus("Не найден контейнер сетки", false); return null; }
    var pLvl = Number(($("prestige") && $("prestige").value) || 6);
    var settings=TarkovPrestige.rule(prestigeRules,pLvl);
    var sz = settings ? {cols:settings.gridWidth,rows:settings.gridHeight} : PRESTIGE_GRID[pLvl] || PRESTIGE_GRID[6];
    var key = sz.cols + "x" + sz.rows;
    if (!grid) {
      grid = TarkovItemGrid.create(host, { cols: sz.cols, rows: sz.rows, cellSize: 62, onChange: updateSummary });
      gridDimsKey = key;
    } else if (key !== gridDimsKey) {
      if (!grid.setSize(sz.cols, sz.rows)) {
        $("prestige").value=String(Object.keys(PRESTIGE_GRID).find(function(level){var d=PRESTIGE_GRID[level];return d.cols===grid.cols()&&d.rows===grid.rows();})||6);
        setStatus("Не хватает места для всех предметов. Убери часть перед уменьшением окна.",false);
        return grid;
      }
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
      var node=document.querySelector('[data-uid="'+x.uid+'"]'); if(node)node.classList.toggle("invalid", !demoActive && !!it && !TarkovPrestige.allowed(it,activeRule()));
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
    var groups=new Map();
    list.forEach(function(r){var key=r.id||r.name,old=groups.get(key);if(old)old.qty++;else groups.set(key,Object.assign({},r,{qty:1}));});
    list=Array.from(groups.values());
    var value = 0;
    box.innerHTML = list.map(function (r) {
      value += (Number(r.price) || 0) * r.qty;
      var why = (r.tags || []).map(function (t) { return '<span class="badge">' + esc(t) + "</span>"; }).join(" ");
      if (r.qQty) why = '<span class="badge q">квест ×' + r.qQty + "</span> " + why;
      return '<div style="display:flex;gap:8px;align-items:center;margin:0 0 8px">' +
        (r.icon ? '<img src="' + esc(r.icon) + '" alt="" loading="lazy" style="width:38px;height:34px;object-fit:contain" onerror="this.hidden=true">' : "") +
        '<div><b>' + esc(r.name) + (r.qty>1?' ×'+r.qty:'') + '</b><div class="meta">' + r.w + "×" + r.h + " · " +
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
      if (!TarkovPrestige.allowed(it,activeRule())) return false;
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
    if (!TarkovPrestige.allowed(it,activeRule())) { setStatus("Предмет не разрешён для выбранного престижа",false); return; }
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
    buildQuestNeed(tasksCache,maxLvl);
    var plan=TarkovPrestige.plan(Object.values(itemsById),tasksCache,{cols:grid.cols(),rows:grid.rows(),focus:focus,maxLevel:maxLvl,rule:activeRule()});
    if(!plan.length){setStatus("Нет подходящих предметов для выбранных условий",false);closeOpt();return;}
    grid.clear();
    var placed=plan.map(function(p){
      var r={price:p.price,tags:[p.reason],qQty:p.related.length};
      return grid.addItem({id:p.item.id,name:itemName(p.item),icon:itemIcon(p.item),w:p.w,h:p.h,baseW:dims(p.item).w,baseH:dims(p.item).h,
        meta:p.reason+" · "+fmt(p.price)+" ₽",data:{it:p.item,ranked:r,price:p.price}},p.x,p.y);
    }).filter(Boolean);
    var ranked = placed.map(function (p) {
      var r = p.data && p.data.ranked;
      return { id:p.id, name: p.name, icon: p.icon, w: p.w, h: p.h,
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
      prestigeRules = await TarkovAPI.prestige(selectedMode);
      if (requestId !== loadRequest) return;
      if (!activeRule()) throw Error("Нет правил переноса выбранного престижа");
      tasksCache = taskList;
      ensureGrid();
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
    if (dataReady && dataMode !== ($("gameMode").value||"pve")) { load(); return; }
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
    if (window.TarkovProfile && TarkovProfile.bindRefresh) TarkovProfile.bindRefresh(refresh);
    // Start with real data and an empty, honest state. Demo content is opt-in via its button.
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
