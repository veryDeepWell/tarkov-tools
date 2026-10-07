/*! Prestigeinator */
(function () {
  "use strict";

  var PRESTIGE_GRID = {
    1: { cols: 8, rows: 3 },
    2: { cols: 8, rows: 4 },
    3: { cols: 8, rows: 5 },
    4: { cols: 8, rows: 6 },
    5: { cols: 8, rows: 7 },
    6: { cols: 8, rows: 8 }
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

  var itemsById = {};
  var questNeed = {};
  var tasksCache = [];
  var grid = null;
  var dataReady = false;
  var suggestTimer = null;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    try { if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it); } catch (e) {}
    return it.shortName || it.name || it.normalizedName || it.id || "?";
  }

  function dims(it) {
    if (window.TarkovItemGrid && TarkovItemGrid.dimsFromItem) return TarkovItemGrid.dimsFromItem(it);
    return { w: Math.max(1, Number(it.width) || Number(it.w) || 1), h: Math.max(1, Number(it.height) || Number(it.h) || 1) };
  }

  function unitPrice(it) {
    if (!it) return 0;
    if (it.price) return Number(it.price) || 0;
    return Number(it.avg24hPrice) || Number(it.lastLowPrice) || Number(it.low24hPrice) || Number(it.basePrice) || 0;
  }

  function isBulkyCase(it) {
    var p = it.properties || {};
    if (p.propertiesType === "ItemPropertiesContainer") return true;
    var nn = (it.normalizedName || "").toLowerCase();
    return /case|thicc|trunk|secure-container|gamma|kappa|epsilon|alpha|beta/i.test(nn);
  }

  function priorityBoost(it) {
    var nn = (it.normalizedName || "") + " " + (it.shortName || "") + " " + (it.name || "");
    var tags = [], w = 0;
    PRIORITY.forEach(function (p) {
      if (p.re.test(nn)) { w += p.w; tags.push(p.tag); }
    });
    return { w: w, tags: tags };
  }

  function buildQuestNeed(tasks, maxLvl) {
    questNeed = {};
    asArray(tasks).forEach(function (t) {
      var lvl = Number(t.minPlayerLevel) || 1;
      if (lvl > maxLvl) return;
      asArray(t.objectives).forEach(function (o) {
        var typ = o.type || "";
        if (typ !== "giveItem" && typ !== "findItem") return;
        var count = Number(o.count) || 1;
        var items = o.items || o.item || [];
        if (typeof items === "string") items = [items];
        if (!Array.isArray(items) && items && typeof items === "object") {
          items = items.id ? [items.id] : Object.values(items);
        }
        var qn = t.normalizedName || t.name || t.id || "?";
        asArray(items).forEach(function (ref) {
          var id = typeof ref === "string" ? ref : ref && ref.id;
          if (!id) return;
          if (!questNeed[id]) questNeed[id] = { qty: 0, quests: [], kappa: !!t.kappaRequired };
          questNeed[id].qty += count;
          if (t.kappaRequired) questNeed[id].kappa = true;
          if (questNeed[id].quests.indexOf(qn) < 0 && questNeed[id].quests.length < 6) {
            questNeed[id].quests.push(qn);
          }
        });
      });
    });
  }

  function scoreItem(it, focus) {
    var id = it.id;
    var price = unitPrice(it);
    var d = dims(it);
    var slots = d.w * d.h;
    var density = slots ? price / slots : 0;
    var qn = questNeed[id];
    var qQty = qn ? qn.qty : 0;
    var boost = priorityBoost(it);
    var stack = Number(it.stackMaxSize) || 1;
    var stackBonus = stack > 1 ? Math.min(12, Math.log2(stack) * 3) : 0;
    var qScore = Math.min(qQty, 40) * 3;
    if (qn && qn.kappa) qScore += 18;
    var score = 0;
    if (focus === "money") score = density / 8000 + boost.w * 0.35 + stackBonus;
    else if (focus === "quests") score = qScore * 2.2 + boost.w * 0.4 + Math.min(10, density / 80000);
    else if (focus === "kappa") score = qScore * 1.6 + (qn && qn.kappa ? 30 : 0) + boost.w;
    else if (focus === "density") score = density / 5000 + stackBonus + boost.w * 0.2;
    else score = qScore + boost.w + stackBonus + Math.min(35, density / 50000);
    return { it: it, id: id, name: itemName(it), price: price, w: d.w, h: d.h, density: density, qQty: qQty, tags: boost.tags, score: score };
  }

  function ensureGrid() {
    if (!window.TarkovItemGrid || !TarkovItemGrid.create) {
      setStatus("TarkovItemGrid не загружен — проверь core/tarkov-item-grid.js", false);
      return null;
    }
    var host = $("prestigeGrid");
    if (!host) {
      setStatus("Нет #prestigeGrid", false);
      return null;
    }
    var pLvl = Number(($("prestige") && $("prestige").value) || 6);
    var sz = PRESTIGE_GRID[pLvl] || PRESTIGE_GRID[6];
    if (!grid) {
      grid = TarkovItemGrid.create(host, { cols: sz.cols, rows: sz.rows, cellSize: 44, onChange: updateSummary });
    } else {
      grid.setSize(sz.cols, sz.rows);
    }
    updateSummary();
    return grid;
  }

  function updateSummary() {
    var el = $("gridSummary");
    if (!el || !grid) return;
    var items = grid.getItems();
    var value = 0, questish = 0;
    items.forEach(function (x) {
      var it = (x.data && x.data.it) || itemsById[x.id];
      if (it) value += unitPrice(it);
      else if (x.data && x.data.price) value += Number(x.data.price) || 0;
      if (questNeed[x.id]) questish += 1;
    });
    el.innerHTML = "Слоты: <b>" + grid.usedSlots() + "</b> / " + grid.totalSlots() +
      " · ~<b>" + fmt(value) + "</b> ₽ · квестовых: <b>" + questish + "</b>";
  }

  function paintHints(list) {
    var box = $("packHints");
    if (!box) return;
    if (!list || !list.length) {
      box.textContent = "Добавь предметы вручную или «Собрать престиж».";
      return;
    }
    var value = 0;
    box.innerHTML = list.slice(0, 20).map(function (r) {
      value += r.price || 0;
      var why = (r.tags || []).map(function (t) { return '<span class="badge">' + esc(t) + "</span>"; }).join(" ");
      if (r.qQty) why = '<span class="badge q">квест ×' + r.qQty + "</span> " + why;
      return "<div style='margin:0 0 6px'><b>" + esc(r.name) + "</b> · " + r.w + "×" + r.h +
        " · " + (r.price ? fmt(r.price) + " ₽" : "?") + "<div>" + why + "</div></div>";
    }).join("") + "<div style='margin-top:8px'>Σ ~<b>" + fmt(value) + "</b> ₽</div>";
  }

  function seedDemo() {
    if (!grid && !ensureGrid()) return;
    grid.clear();
    DEMO.forEach(function (d) {
      grid.addItem({
        id: d.id, name: d.name, w: d.w, h: d.h,
        meta: fmt(d.price) + " ₽",
        data: { it: d, price: d.price }
      });
    });
    paintHints(DEMO.map(function (d) {
      return { name: d.name, w: d.w, h: d.h, price: d.price, tags: ["demo"], qQty: 0 };
    }));
    setStatus("Демо на сетке. ЛКМ — таскать, R / ⟳ — поворот. «Загрузить» — данные API.", true);
  }

  function searchItems(q) {
    q = String(q || "").trim().toLowerCase();
    if (q.length < 2) return [];
    var out = [];
    if (!dataReady) {
      DEMO.forEach(function (d) {
        if ((d.name + " " + d.id).toLowerCase().indexOf(q) >= 0) out.push(d);
      });
      return out.slice(0, 20);
    }
    Object.keys(itemsById).forEach(function (id) {
      var it = itemsById[id];
      var hay = ((it.normalizedName || "") + " " + (it.shortName || "") + " " + (it.name || "") + " " + id).toLowerCase();
      if (hay.indexOf(q) < 0) return;
      out.push(it);
    });
    out.sort(function (a, b) { return unitPrice(b) - unitPrice(a); });
    return out.slice(0, 40);
  }

  function renderSuggest(list) {
    var box = $("suggest");
    if (!box) return;
    if (!list.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = list.map(function (it) {
      var d = (it.w && it.h) ? { w: it.w, h: it.h } : dims(it);
      return '<button type="button" data-id="' + esc(it.id) + '"><b>' + esc(itemName(it)) +
        '</b><div class="muted">' + d.w + "×" + d.h + " · " +
        (unitPrice(it) ? fmt(unitPrice(it)) + " ₽" : "—") + "</div></button>";
    }).join("");
    box.querySelectorAll("button").forEach(function (btn) {
      btn.onclick = function () {
        addById(btn.getAttribute("data-id"));
        box.hidden = true;
        if ($("itemSearch")) $("itemSearch").value = "";
      };
    });
  }

  function addById(id) {
    if (!grid || !id) return;
    var it = itemsById[id];
    if (!it) {
      for (var i = 0; i < DEMO.length; i++) if (DEMO[i].id === id) { it = DEMO[i]; break; }
    }
    if (!it) { setStatus("Предмет не найден", false); return; }
    var d = (it.w && it.h) ? { w: it.w, h: it.h } : dims(it);
    var placed = grid.addItem({
      id: id, name: itemName(it), w: d.w, h: d.h,
      meta: unitPrice(it) ? fmt(unitPrice(it)) + " ₽" : "",
      data: { it: it, price: unitPrice(it) }
    });
    if (!placed) setStatus("Не влезает / нет места", false);
    else setStatus("Добавлено: " + itemName(it), true);
  }

  function openOpt() {
    var panel = $("optPanel");
    if (!panel) return;
    panel.hidden = false;
    panel.classList.add("show");
  }

  function closeOpt() {
    var panel = $("optPanel");
    if (!panel) return;
    panel.classList.remove("show");
    panel.hidden = true;
  }

  function runAssemble() {
    if (!grid && !ensureGrid()) return;
    var focusEl = document.querySelector('input[name="focus"]:checked');
    var focus = focusEl ? focusEl.value : "balanced";
    var maxLvl = Number(($("maxLvl") && $("maxLvl").value) || 15);
    buildQuestNeed(tasksCache, maxLvl);

    var candidates = [];
    if (dataReady) {
      Object.keys(itemsById).forEach(function (id) {
        var it = itemsById[id];
        if (isBulkyCase(it)) return;
        var r = scoreItem(it, focus);
        if (r.score < 2.5 && r.price < 8000 && r.qQty < 1) return;
        candidates.push({
          id: r.id, name: r.name, w: r.w, h: r.h,
          meta: (r.price ? fmt(r.price) + " ₽" : "") + (r.qQty ? " · квест" : ""),
          data: { it: r.it, ranked: r, price: r.price }, score: r.score
        });
      });
    } else {
      DEMO.forEach(function (d) {
        candidates.push({
          id: d.id, name: d.name, w: d.w, h: d.h, meta: fmt(d.price) + " ₽",
          data: { it: d, price: d.price }, score: d.price / (d.w * d.h)
        });
      });
    }

    var placed = grid.pack(candidates, { clear: true });
    var ranked = placed.map(function (p) {
      var r = p.data && p.data.ranked;
      return {
        name: p.name, w: p.w, h: p.h,
        price: (r && r.price) || (p.data && p.data.price) || 0,
        tags: (r && r.tags) || [], qQty: (r && r.qQty) || 0
      };
    });
    paintHints(ranked);
    updateSummary();
    closeOpt();
    setStatus("Собрано: " + placed.length + " («" + focus + "»)" + (dataReady ? "" : " · демо"), true);
  }

  async function load() {
    var btn = $("loadBtn");
    if (btn) btn.disabled = true;
    setStatus("Загрузка API…");
    if (!window.TarkovAPI || !TarkovAPI.items) {
      setStatus("TarkovAPI нет — демо-режим", false);
      if (btn) btn.disabled = false;
      return;
    }
    try {
      var mode = ($("gameMode") && $("gameMode").value) || "pve";
      var rawItems = await TarkovAPI.items(mode);
      itemsById = {};
      asArray(rawItems).forEach(function (it) { if (it && it.id) itemsById[it.id] = it; });
      try { tasksCache = asArray(await TarkovAPI.tasks(mode)); } catch (eT) { tasksCache = []; }
      buildQuestNeed(tasksCache, Number(($("maxLvl") && $("maxLvl").value) || 15));
      dataReady = true;
      if ($("itemSearch")) $("itemSearch").disabled = false;
      setStatus("OK · items " + Object.keys(itemsById).length + " · tasks " + tasksCache.length, true);
    } catch (e) {
      setStatus("API: " + (e && e.message ? e.message : e) + " — демо работает", false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function wire() {
    try {
      if (!ensureGrid()) return;
    } catch (e) {
      setStatus("Сетка: " + (e && e.message ? e.message : e), false);
      return;
    }

    if ($("loadBtn")) $("loadBtn").onclick = function () { load(); };
    if ($("prestige")) $("prestige").onchange = function () { ensureGrid(); };
    if ($("btnClear")) $("btnClear").onclick = function () { if (grid) grid.clear(); paintHints([]); };
    if ($("btnAssemble")) $("btnAssemble").onclick = openOpt;
    if ($("btnDemo")) $("btnDemo").onclick = seedDemo;
    if ($("optCancel")) $("optCancel").onclick = closeOpt;
    if ($("optRun")) $("optRun").onclick = runAssemble;
    if ($("optPanel")) $("optPanel").addEventListener("click", function (e) {
      if (e.target === $("optPanel")) closeOpt();
    });

    document.querySelectorAll("#focusList label.focus").forEach(function (lab) {
      lab.addEventListener("click", function () {
        document.querySelectorAll("#focusList label.focus").forEach(function (x) { x.classList.remove("on"); });
        lab.classList.add("on");
        var inp = lab.querySelector("input");
        if (inp) inp.checked = true;
      });
    });

    var search = $("itemSearch");
    if (search) {
      search.disabled = false;
      search.addEventListener("input", function () {
        clearTimeout(suggestTimer);
        suggestTimer = setTimeout(function () { renderSuggest(searchItems(search.value)); }, 150);
      });
    }

    document.addEventListener("click", function (e) {
      var box = $("suggest");
      var wrap = document.querySelector(".search-box");
      if (box && wrap && !wrap.contains(e.target)) box.hidden = true;
    });

    seedDemo();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
