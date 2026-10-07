/*! Prestigeinator — prestige transfer window + optimizer */
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
    { re: /ledx|defibrillator|ophthalmoscope|transilluminator/i, w: 22, tag: "медик-хай" },
    { re: /moonshine|vodka|whiskey|jackiel/i, w: 12, tag: "бартер/алко" },
    { re: /can-of-|squash|beef|herring|porridge|slickers|alyonka|crackers|water|aquamari/i, w: 18, tag: "еда" },
    { re: /salewa|ifak|cms|splint|esmarch|bandage|ai-2|grizzly/i, w: 16, tag: "мед" },
    { re: /morphine|adrenaline|propital|sj[0-9]|etg|zagustin|stim/i, w: 14, tag: "стимы" },
    { re: /roubles|dollars|euros/i, w: 8, tag: "валюта" },
    { re: /ssd|sas|virtex|graphics-card|tetriz|coffee|chainlet|roler|lion|cat|horse/i, w: 15, tag: "мелкий ценный" }
  ];

  var itemsById = {};
  var questNeed = {};
  var tasksCache = [];
  var grid = null;
  var suggestTimer = null;

  function esc(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function itemName(it) {
    if (!it) return "?";
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    return it.shortName || it.name || it.normalizedName || it.id || "?";
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("status");
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

  function fmt(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString("ru-RU");
  }

  function dims(it) {
    if (window.TarkovItemGrid && TarkovItemGrid.dimsFromItem) return TarkovItemGrid.dimsFromItem(it);
    var w = Number(it && it.width) || 1;
    var h = Number(it && it.height) || 1;
    var p = (it && it.properties) || {};
    if (p.width) w = Number(p.width) || w;
    if (p.height) h = Number(p.height) || h;
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  function unitPrice(it) {
    var avg = Number(it.avg24hPrice) || 0;
    var last = Number(it.lastLowPrice) || 0;
    var low = Number(it.low24hPrice) || 0;
    if (avg > 0) return avg;
    if (last > 0) return last;
    if (low > 0) return low;
    return Number(it.basePrice) || 0;
  }

  function isBulkyCase(it) {
    var p = it.properties || {};
    if (p.propertiesType === "ItemPropertiesContainer") return true;
    var nn = (it.normalizedName || "").toLowerCase();
    return /case|thicc|trunk|secure-container|gamma|kappa|epsilon|alpha|beta/i.test(nn);
  }

  function priorityBoost(it) {
    var nn = (it.normalizedName || "") + " " + (it.shortName || "") + " " + (it.name || "");
    var tags = [];
    var w = 0;
    PRIORITY.forEach(function (p) {
      if (p.re.test(nn)) {
        w += p.w;
        tags.push(p.tag);
      }
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

  function scoreItem(it, focus, maxLvl) {
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
    if (qQty > 100) qScore = 5;
    if (qn && qn.kappa) qScore += 18;

    var score = 0;
    if (focus === "money") {
      score = density / 8000 + boost.w * 0.35 + stackBonus;
    } else if (focus === "quests") {
      score = qScore * 2.2 + boost.w * 0.4 + Math.min(10, density / 80000);
    } else if (focus === "kappa") {
      score = qScore * 1.6 + (qn && qn.kappa ? 30 : 0) + boost.w + Math.min(12, density / 60000);
    } else if (focus === "density") {
      score = density / 5000 + stackBonus + boost.w * 0.2;
    } else {
      /* balanced */
      score = qScore + boost.w + stackBonus + Math.min(35, density / 50000);
    }
    return {
      it: it,
      id: id,
      price: price,
      w: d.w,
      h: d.h,
      slots: slots,
      density: density,
      qQty: qQty,
      quests: qn ? qn.quests : [],
      tags: boost.tags,
      score: score,
      stack: stack
    };
  }

  function ensureGrid() {
    var host = document.getElementById("prestigeGrid");
    if (!host) return;
    var pLvl = Number(document.getElementById("prestige").value) || 6;
    var sz = PRESTIGE_GRID[pLvl] || PRESTIGE_GRID[6];
    if (!grid) {
      grid = TarkovItemGrid.create(host, {
        cols: sz.cols,
        rows: sz.rows,
        cellSize: 40,
        onChange: updateSummary
      });
    } else {
      grid.setSize(sz.cols, sz.rows);
    }
    updateSummary();
  }

  function updateSummary() {
    var el = document.getElementById("gridSummary");
    if (!el || !grid) return;
    var items = grid.getItems();
    var value = 0;
    var questish = 0;
    items.forEach(function (x) {
      var it = x.data && x.data.it ? x.data.it : itemsById[x.id];
      if (it) value += unitPrice(it);
      if (questNeed[x.id]) questish += 1;
    });
    el.innerHTML =
      "Слоты: <b>" +
      grid.usedSlots() +
      "</b> / " +
      grid.totalSlots() +
      " · ~<b>" +
      fmt(value) +
      "</b> ₽ · квестовых позиций: <b>" +
      questish +
      "</b>";
  }

  function paintHints(rankedPlaced) {
    var box = document.getElementById("packHints");
    if (!box) return;
    if (!rankedPlaced || !rankedPlaced.length) {
      box.innerHTML = "Окно пустое или набор ещё не собран.";
      return;
    }
    var value = 0;
    var html = rankedPlaced
      .slice(0, 24)
      .map(function (r) {
        value += r.price || 0;
        var why = [];
        if (r.qQty) why.push('<span class="badge q">квест ×' + r.qQty + "</span>");
        (r.tags || []).forEach(function (t) {
          why.push('<span class="badge">' + esc(t) + "</span>");
        });
        if (r.density > 100000) why.push('<span class="badge v">плотность</span>');
        return (
          "<div style='margin:0 0 6px'><b>" +
          esc(r.name || itemName(r.it)) +
          "</b> · " +
          r.w +
          "×" +
          r.h +
          " · " +
          (r.price ? fmt(r.price) + " ₽" : "?") +
          "<div>" +
          why.join(" ") +
          "</div></div>"
        );
      })
      .join("");
    box.innerHTML =
      "<div style='margin-bottom:8px'>В окне ~<b>" +
      fmt(value) +
      "</b> ₽ · позиций: " +
      rankedPlaced.length +
      "</div>" +
      html;
  }

  function searchItems(q) {
    q = String(q || "").trim().toLowerCase();
    if (q.length < 2) return [];
    var out = [];
    Object.keys(itemsById).forEach(function (id) {
      var it = itemsById[id];
      var hay = ((it.normalizedName || "") + " " + (it.shortName || "") + " " + (it.name || "") + " " + id).toLowerCase();
      if (hay.indexOf(q) < 0) return;
      out.push(it);
    });
    out.sort(function (a, b) {
      return unitPrice(b) - unitPrice(a);
    });
    return out.slice(0, 40);
  }

  function renderSuggest(list) {
    var box = document.getElementById("suggest");
    if (!box) return;
    if (!list.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = list
      .map(function (it) {
        var d = dims(it);
        return (
          '<button type="button" data-id="' +
          esc(it.id) +
          '"><b>' +
          esc(itemName(it)) +
          '</b><div class="muted">' +
          d.w +
          "×" +
          d.h +
          " · " +
          (unitPrice(it) ? fmt(unitPrice(it)) + " ₽" : "—") +
          "</div></button>"
        );
      })
      .join("");
    box.querySelectorAll("button").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-id");
        addItemById(id);
        box.hidden = true;
        document.getElementById("itemSearch").value = "";
      };
    });
  }

  function addItemById(id) {
    if (!grid || !id || !itemsById[id]) return;
    var it = itemsById[id];
    var d = dims(it);
    var placed = grid.addItem({
      id: id,
      name: itemName(it),
      w: d.w,
      h: d.h,
      meta: unitPrice(it) ? fmt(unitPrice(it)) + " ₽" : "",
      data: { it: it }
    });
    if (!placed) {
      setStatus("Не влезает в окно (или нет места).", false);
      return;
    }
    setStatus("Добавлено: " + itemName(it), true);
    updateSummary();
  }

  function openOpt() {
    if (!Object.keys(itemsById).length) {
      setStatus("Сначала загрузи данные.", false);
      return;
    }
    var panel = document.getElementById("optPanel");
    panel.hidden = false;
    panel.classList.add("show");
  }

  function closeOpt() {
    var panel = document.getElementById("optPanel");
    panel.classList.remove("show");
    panel.hidden = true;
  }

  function runAssemble() {
    var focusEl = document.querySelector('input[name="focus"]:checked');
    var focus = focusEl ? focusEl.value : "balanced";
    var maxLvl = Number(document.getElementById("maxLvl").value) || 15;
    buildQuestNeed(tasksCache, maxLvl);

    var candidates = [];
    Object.keys(itemsById).forEach(function (id) {
      var it = itemsById[id];
      if (isBulkyCase(it)) return;
      var r = scoreItem(it, focus, maxLvl);
      if (r.score < 2.5 && r.price < 8000 && r.qQty < 1) return;
      if (r.w > grid.cols() || r.h > grid.rows()) {
        if (!(r.h <= grid.cols() && r.w <= grid.rows())) return;
      }
      candidates.push({
        id: r.id,
        name: itemName(r.it),
        w: r.w,
        h: r.h,
        meta: (r.price ? fmt(r.price) + " ₽" : "") + (r.qQty ? " · квест" : ""),
        data: { it: r.it, ranked: r },
        score: r.score
      });
    });

    var placed = grid.pack(candidates, { clear: true });
    var rankedPlaced = placed.map(function (p) {
      var r = (p.data && p.data.ranked) || scoreItem(itemsById[p.id], focus, maxLvl);
      return {
        it: itemsById[p.id],
        name: p.name,
        w: p.w,
        h: p.h,
        price: r.price,
        density: r.density,
        qQty: r.qQty,
        tags: r.tags,
        score: r.score
      };
    });
    paintHints(rankedPlaced);
    updateSummary();
    closeOpt();
    setStatus("Собрано: " + placed.length + " предметов («" + focus + "»).", true);
    try {
      if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
    } catch (e) {}
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Загрузка…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Items…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var rawItems = await TarkovAPI.items(mode);
      if (P) P.set(40);
      itemsById = {};
      asArray(rawItems).forEach(function (it) {
        if (it && it.id) itemsById[it.id] = it;
      });
      if (P) P.set(55, "Tasks…");
      tasksCache = asArray(await TarkovAPI.tasks(mode));
      buildQuestNeed(tasksCache, Number(document.getElementById("maxLvl").value) || 15);
      document.getElementById("itemSearch").disabled = false;
      document.getElementById("btnAssemble").disabled = false;
      setStatus(
        "Предметов: " +
          Object.keys(itemsById).length +
          " · квестов: " +
          tasksCache.length +
          " · квест-предметов: " +
          Object.keys(questNeed).length,
        true
      );
      if (P) P.done();
      try {
        if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
      } catch (eB) {}
    } catch (e) {
      setStatus(String(e && e.message ? e.message : e), false);
      if (P) P.fail && P.fail(e);
    } finally {
      btn.disabled = false;
    }
  }

  function wire() {
    ensureGrid();
    document.getElementById("btnAssemble").disabled = true;

    document.getElementById("loadBtn").onclick = load;
    document.getElementById("prestige").onchange = function () {
      ensureGrid();
    };
    document.getElementById("btnClear").onclick = function () {
      if (grid) grid.clear();
      paintHints([]);
      updateSummary();
    };
    document.getElementById("btnAssemble").onclick = openOpt;
    document.getElementById("optCancel").onclick = closeOpt;
    document.getElementById("optRun").onclick = runAssemble;
    document.getElementById("optPanel").addEventListener("click", function (e) {
      if (e.target === document.getElementById("optPanel")) closeOpt();
    });

    document.querySelectorAll("#focusList label.focus").forEach(function (lab) {
      lab.addEventListener("click", function () {
        document.querySelectorAll("#focusList label.focus").forEach(function (x) {
          x.classList.remove("on");
        });
        lab.classList.add("on");
        var inp = lab.querySelector("input");
        if (inp) inp.checked = true;
      });
    });

    var search = document.getElementById("itemSearch");
    search.addEventListener("input", function () {
      clearTimeout(suggestTimer);
      suggestTimer = setTimeout(function () {
        renderSuggest(searchItems(search.value));
      }, 180);
    });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.getElementById("suggest").hidden = true;
      }
    });
    document.addEventListener("click", function (e) {
      var box = document.getElementById("suggest");
      var wrap = document.querySelector(".search-box");
      if (box && wrap && !wrap.contains(e.target)) box.hidden = true;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
