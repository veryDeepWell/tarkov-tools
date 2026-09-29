/*! Tarkov — Prestige transfer optimizer */
(function () {
  "use strict";

  var PRESTIGE_SLOTS = { 1: 24, 2: 32, 3: 40, 4: 48, 5: 56, 6: 64 };

  var PRIORITY = [
    { re: /bitcoin|physical-bitcoin/i, w: 40, tag: "капитал" },
    { re: /gp-coin|g-p-coin/i, w: 28, tag: "GP" },
    { re: /ledx|defibrillator|ophthalmoscope|transilluminator/i, w: 22, tag: "медик-хай" },
    { re: /moonshine|vodka|whiskey|jackiel/i, w: 12, tag: "бартер/алко" },
    { re: /can-of-|squash|beef|herring|porridge|slickers|alyonka|crackers|water|aquamari/i, w: 18, tag: "еда (Егерь)" },
    { re: /salewa|ifak|cms|splint|esmarch|bandage|ai-2|grizzly/i, w: 16, tag: "мед квесты" },
    { re: /morphine|adrenaline|propital|sj[0-9]|etg|zagustin|stim/i, w: 14, tag: "стимы" },
    { re: /roubles|dollars|euros/i, w: 8, tag: "валюта" },
    { re: /ssd|sas|virtex|graphics-card|tetriz|coffee|chainlet|roler|lion|cat|horse|bitcoin/i, w: 15, tag: "ценный мелкий" }
  ];

  var itemsById = {};
  var questNeed = {};
  var ranked = [];

  function esc(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;");
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

  function slotsOf(it) {
    var w = Number(it.width) || 1;
    var h = Number(it.height) || 1;
    var p = it.properties || {};
    if (p.width) w = Number(p.width) || w;
    if (p.height) h = Number(p.height) || h;
    if (p.propertiesType === "ItemPropertiesContainer") return Math.max(w * h, 4);
    return Math.max(1, w * h);
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
    var nn = (it.normalizedName || "") + " " + (it.shortName || "");
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
      if (t.kappaRequired) return;
      var qn = t.normalizedName || t.id || "?";
      asArray(t.objectives).forEach(function (o) {
        var typ = o.type || "";
        if (typ !== "giveItem" && typ !== "findItem") return;
        var count = Number(o.count) || 1;
        var items = o.items || o.item || [];
        if (typeof items === "string") items = [items];
        if (!Array.isArray(items) && items && typeof items === "object") {
          items = items.id ? [items.id] : Object.values(items);
        }
        asArray(items).forEach(function (ref) {
          var id = typeof ref === "string" ? ref : ref && ref.id;
          if (!id) return;
          if (!questNeed[id]) questNeed[id] = { qty: 0, quests: [] };
          questNeed[id].qty += count;
          if (questNeed[id].quests.indexOf(qn) < 0 && questNeed[id].quests.length < 6) {
            questNeed[id].quests.push(qn);
          }
        });
      });
    });
  }

  function rank() {
    var maxLvl = Number(document.getElementById("maxLvl").value) || 15;
    var q = (document.getElementById("q").value || "").trim().toLowerCase();
    var sort = document.getElementById("sort").value || "score";
    var pLvl = Number(document.getElementById("prestige").value) || 6;
    var grid = PRESTIGE_SLOTS[pLvl] || 64;

    if (window.__TT_PRESTIGE_TASKS) buildQuestNeed(window.__TT_PRESTIGE_TASKS, maxLvl);

    ranked = [];
    Object.keys(itemsById).forEach(function (id) {
      var it = itemsById[id];
      if (isBulkyCase(it)) return;
      var price = unitPrice(it);
      var slots = slotsOf(it);
      var density = slots ? price / slots : 0;
      var qn = questNeed[id];
      var qQty = qn ? qn.qty : 0;
      var qScore = Math.min(qQty, 40) * 3;
      if (qQty > 100) qScore = 5;

      var boost = priorityBoost(it);
      var stack = Number(it.stackMaxSize) || 1;
      var stackBonus = stack > 1 ? Math.min(12, Math.log2(stack) * 3) : 0;

      var score = qScore + boost.w + stackBonus + Math.min(35, density / 50000);

      if (q) {
        var hay = ((it.normalizedName || "") + " " + (it.shortName || "") + " " + itemName(it)).toLowerCase();
        if (hay.indexOf(q) < 0) return;
      }
      if (score < 3 && price < 5000 && qQty < 1) return;

      ranked.push({
        it: it,
        id: id,
        price: price,
        slots: slots,
        density: density,
        qQty: qQty,
        quests: qn ? qn.quests : [],
        tags: boost.tags,
        score: score,
        stack: stack
      });
    });

    ranked.sort(function (a, b) {
      if (sort === "quest") return b.qQty - a.qQty || b.score - a.score;
      if (sort === "density") return b.density - a.density;
      if (sort === "value") return b.price - a.price;
      return b.score - a.score;
    });

    paintList();
    paintPack(grid);
  }

  function paintList() {
    var tb = document.getElementById("tbody");
    document.getElementById("listCard").hidden = false;
    tb.innerHTML = ranked
      .slice(0, 100)
      .map(function (r, i) {
        var why = [];
        if (r.qQty) why.push('<span class="badge q">квест ×' + r.qQty + "</span>");
        r.tags.forEach(function (t) {
          why.push('<span class="badge">' + esc(t) + "</span>");
        });
        if (r.density > 100000) why.push('<span class="badge v">плотность</span>');
        if (r.stack > 1) why.push('<span class="badge s">stack ' + r.stack + "</span>");
        var qlist = r.quests.length
          ? '<div class="muted">' + esc(r.quests.slice(0, 3).join(", ")) + "</div>"
          : "";
        return (
          '<tr><td class="num">' +
          (i + 1) +
          "</td><td><b>" +
          esc(itemName(r.it)) +
          "</b>" +
          qlist +
          '</td><td class="num">' +
          r.slots +
          '</td><td class="num">' +
          (r.price ? fmt(r.price) : "—") +
          '</td><td class="num">' +
          (r.density ? fmt(r.density) : "—") +
          '</td><td class="num">' +
          (r.qQty || "—") +
          '</td><td class="num">' +
          r.score.toFixed(1) +
          "</td><td>" +
          why.join(" ") +
          "</td></tr>"
        );
      })
      .join("");
  }

  function paintPack(grid) {
    document.getElementById("packCard").hidden = false;
    var used = 0;
    var pack = [];
    var value = 0;
    ranked.forEach(function (r) {
      if (used >= grid) return;
      var need = r.slots;
      if (need > grid - used) return;
      pack.push(r);
      used += need;
      value += r.price;
    });
    var body = document.getElementById("packBody");
    body.innerHTML =
      "<h3>Слоты: " +
      used +
      " / " +
      grid +
      " · оценка ~" +
      fmt(value) +
      ' ₽</h3><ol style="margin:0;padding-left:18px;font-size:.88rem">' +
      pack
        .map(function (r) {
          return (
            "<li><b>" +
            esc(itemName(r.it)) +
            "</b> — " +
            r.slots +
            " сл. · " +
            (r.price ? fmt(r.price) + " ₽" : "?") +
            (r.qQty ? " · квест" : "") +
            "</li>"
          );
        })
        .join("") +
      '</ol><p class="muted" style="margin-top:8px">Жадный набор по скору/слоту — не единственно верный. Подстрой вручную под свои квесты и FIR.</p>';
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Loading…");
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
      var tasks = asArray(await TarkovAPI.tasks(mode));
      window.__TT_PRESTIGE_TASKS = tasks;
      buildQuestNeed(tasks, Number(document.getElementById("maxLvl").value) || 15);
      document.getElementById("cfgCard").hidden = false;
      setStatus(
        "Предметов: " +
          Object.keys(itemsById).length +
          " · квестов: " +
          tasks.length +
          " · квест-предметов (≤lvl): " +
          Object.keys(questNeed).length,
        true
      );
      if (P) P.done();
      rank();
      try {
        if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
      } catch (eB) {}
    } catch (e) {
      setStatus(e.message || String(e), false);
      if (P) P.fail(e.message);
    } finally {
      btn.disabled = false;
    }
  }

  document.getElementById("loadBtn").onclick = load;
  ["prestige", "maxLvl", "q", "sort"].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener("input", rank);
    el.addEventListener("change", rank);
  });
})();
