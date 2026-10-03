/*! Tarkov — Barter optimizer (buy-side budget) */
(function () {
  "use strict";

  var TRADER = {
    "54cb50c76803fa8b248b4571": "Прапор",
    "54cb57776803fa99248b456e": "Терапевт",
    "579dc571d53a0658a154fbec": "Скупщик",
    "58330581ace78e27b8b10cee": "Лыжник",
    "5935c25fb3acc3127c3d8cd9": "Миротворец",
    "5a7c2eca46aef81a7ca2145d": "Механик",
    "5ac3b934156ae10c4430e83c": "Барахольщик",
    "5c064c2f86f77447f049e2c7": "Егерь",
    "6617beeaa9cfa777ca915b7c": "Реф"
  };

  var itemsById = {};
  var barters = [];
  var rows = [];

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

  function traderName(id) {
    return TRADER[id] || (id ? String(id).slice(0, 8) : "?");
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

  function unitPrice(it) {
    if (!it) return { price: 0, source: "none", flea: 0, trader: 0 };
    var avg = Number(it.avg24hPrice) || 0;
    var last = Number(it.lastLowPrice) || 0;
    var low = Number(it.low24hPrice) || 0;
    var high = Number(it.high24hPrice) || 0;

    var flea = 0;
    var src = "none";
    if (avg > 0) {
      flea = avg;
      src = "avg24h";
    } else if (last > 0) {
      flea = last;
      src = "lastLow";
    } else if (low > 0) {
      flea = high > low ? Math.round((low * 2 + high) / 3) : low;
      src = "low24h~";
    }

    if (flea > 0 && high > 0 && flea < high * 0.05) {
      flea = Math.round(high * 0.35);
      src = "outlier→~35%high";
    }

    var traderBest = 0;
    var traderSrc = "";
    asArray(it.buyFromTrader).forEach(function (b) {
      var p = Number(b.priceRUB != null ? b.priceRUB : b.price) || 0;
      if (p <= 0) return;
      if (!traderBest || p < traderBest) {
        traderBest = p;
        traderSrc = "trader LL" + (b.minTraderLevel || "?");
      }
    });

    var price = flea;
    var finalSrc = src;
    if (traderBest > 0 && (price <= 0 || traderBest < price)) {
      price = traderBest;
      finalSrc = traderSrc + (flea ? " (flea " + src + " " + fmt(flea) + ")" : "");
    } else if (price > 0 && traderBest > 0) {
      finalSrc = src + " · trader " + fmt(traderBest);
    }

    return { price: price, source: finalSrc || "n/a", flea: flea, trader: traderBest };
  }

  function resolveItemRef(ref) {
    if (!ref) return null;
    if (typeof ref === "string") return itemsById[ref] || null;
    if (typeof ref === "object") {
      if (ref.id && itemsById[ref.id]) return itemsById[ref.id];
      if (ref.item) {
        if (typeof ref.item === "string") return itemsById[ref.item] || null;
        if (ref.item.id) return itemsById[ref.item.id] || ref.item;
      }
    }
    return null;
  }

  function matchQuery(it, q) {
    if (!q) return true;
    var hay = (
      (it.normalizedName || "") +
      " " +
      (it.shortName || "") +
      " " +
      (it.name || "") +
      " " +
      itemName(it)
    ).toLowerCase();
    return hay.indexOf(q) >= 0;
  }

  function buildRows() {
    var q = (document.getElementById("q").value || "").trim().toLowerCase();
    var budget = Number(document.getElementById("budget").value) || 0;
    var maxLL = Number(document.getElementById("maxLL").value) || 4;
    var sort = document.getElementById("sort").value || "cost";

    rows = [];
    barters.forEach(function (b) {
      var ll = Number(b.minTraderLevel) || 1;
      if (ll > maxLL) return;

      var offeredRef = b.offeredItem;
      var offeredCount = 1;
      var offeredItem = null;
      if (offeredRef && typeof offeredRef === "object") {
        offeredCount = Number(offeredRef.count) || 1;
        offeredItem = resolveItemRef(offeredRef.item != null ? offeredRef.item : offeredRef);
      } else {
        offeredItem = resolveItemRef(offeredRef);
      }
      if (!offeredItem) return;
      if (q && !matchQuery(offeredItem, q)) return;

      var ingredients = [];
      var total = 0;
      var missing = 0;
      asArray(b.requiredItems).forEach(function (req) {
        var count = Number(req.count) || 1;
        var it = resolveItemRef(req.item != null ? req.item : req);
        var up = unitPrice(it);
        var line = up.price * count;
        if (!up.price) missing++;
        total += line;
        ingredients.push({
          item: it,
          count: count,
          unit: up.price,
          line: line,
          source: up.source
        });
      });

      var fleaReward = unitPrice(offeredItem).flea || 0;
      rows.push({
        barter: b,
        offered: offeredItem,
        offeredCount: offeredCount,
        ingredients: ingredients,
        total: total,
        missing: missing,
        ll: ll,
        trader: b.trader,
        taskUnlock: b.taskUnlock,
        margin: budget > 0 ? budget - total : 0,
        fleaReward: fleaReward
      });
    });

    rows.sort(function (a, b) {
      if (sort === "name") {
        return itemName(a.offered).localeCompare(itemName(b.offered), "ru");
      }
      if (sort === "margin") {
        return b.margin - a.margin;
      }
      var ab = budget > 0 && a.total > 0 && a.total <= budget ? 0 : 1;
      var bb = budget > 0 && b.total > 0 && b.total <= budget ? 0 : 1;
      if (ab !== bb) return ab - bb;
      if (a.total !== b.total) return a.total - b.total;
      return itemName(a.offered).localeCompare(itemName(b.offered), "ru");
    });

    paint();
  }

  function paint() {
    var el = document.getElementById("results");
    var budget = Number(document.getElementById("budget").value) || 0;
    if (!rows.length) {
      el.innerHTML = '<p class="muted">Нет бартеров по фильтру. Уточни поиск или подними LL.</p>';
      return;
    }
    el.innerHTML = rows
      .slice(0, 80)
      .map(function (r) {
        var inB = budget > 0 && r.total > 0 && r.total <= budget;
        var over = budget > 0 && r.total > budget;
        var costCls = inB ? "ok" : over ? "bad" : "";
        var badges =
          '<span class="badge ll">LL ' +
          r.ll +
          "</span>" +
          '<span class="badge">' +
          esc(traderName(r.trader)) +
          "</span>" +
          (r.taskUnlock ? '<span class="badge quest">квест</span>' : "");
        var ingRows = r.ingredients
          .map(function (g) {
            return (
              "<tr><td>" +
              esc(itemName(g.item)) +
              '</td><td class="num">×' +
              g.count +
              '</td><td class="num">' +
              (g.unit ? fmt(g.unit) : "—") +
              '</td><td class="num">' +
              (g.line ? fmt(g.line) : "—") +
              '</td><td class="muted">' +
              esc(g.source) +
              "</td></tr>"
            );
          })
          .join("");
        return (
          '<div class="bcard ' +
          (inB ? "in-budget" : over ? "over-budget" : "") +
          '"><div class="bhead"><div><div class="btitle">' +
          esc(itemName(r.offered)) +
          (r.offeredCount > 1 ? " ×" + r.offeredCount : "") +
          '</div><div class="meta-line">' +
          badges +
          (r.fleaReward ? " · flea reward ~" + fmt(r.fleaReward) : "") +
          (r.missing ? " · ⚠ нет цены у " + r.missing + " поз." : "") +
          '</div></div><div class="bcost ' +
          costCls +
          '">' +
          (r.total ? fmt(r.total) + " ₽" : "?—") +
          (budget
            ? '<div class="meta-line">' +
              (inB
                ? "в бюджете, запас " + fmt(r.margin)
                : over
                  ? "сверх бюджета на " + fmt(-r.margin)
                  : "") +
              "</div>"
            : "") +
          '</div></div><table class="ing"><thead><tr><th>Ингредиент</th><th>Кол-во</th><th>Цена/шт</th><th>Сумма</th><th>Источник</th></tr></thead><tbody>' +
          ingRows +
          "</tbody></table></div>"
        );
      })
      .join("");
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Loading items + barters…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Items…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var rawItems = await TarkovAPI.items(mode);
      if (P) P.set(40);
      var items = asArray(rawItems);
      itemsById = {};
      items.forEach(function (it) {
        if (it && it.id) itemsById[it.id] = it;
      });
      if (P) P.set(55, "Barters…");
      var rawBarters = await TarkovAPI.barters(mode);
      barters = asArray(rawBarters);
      document.getElementById("filterCard").hidden = false;
      setStatus("Предметов: " + items.length + " · бартеров: " + barters.length, true);
      if (P) P.done();
      buildRows();
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
  ["q", "budget", "maxLL", "sort"].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener("input", buildRows);
    el.addEventListener("change", buildRows);
  });
})();
