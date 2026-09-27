/*! Tarkov — Headphones ranking (roadmap B) */
(function () {
  "use strict";

  var rows = [];
  var sortKey = "score";
  var sortDir = -1;
  var tipEl = null;

  function esc(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(n) {
    if (n == null || !isFinite(n)) return "—";
    return Math.round(n).toLocaleString("ru-RU");
  }

  function itemName(it) {
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    if (!it) return "";
    return it.shortName || it.name || it.normalizedName || it.id || "";
  }

  function traderBuy(it) {
    var list = it.buyFromTrader || it.buyFor || [];
    if (!Array.isArray(list) || !list.length) return null;
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var rub = Number(b.priceRUB != null ? b.priceRUB : b.price) || 0;
      if (!best || (rub > 0 && rub < best.rub)) {
        best = {
          rub: rub,
          level: Number(b.minTraderLevel) || 0,
          taskUnlock: b.taskUnlock || null,
          trader: b.trader || b.vendor || ""
        };
      }
    }
    return best;
  }

  /** Higher = better hearing value for the ruble (heuristic, not hard game formula). */
  function scoreOf(r) {
    var dist = Number(r.dist) || 1;
    var distort = Number(r.distort);
    if (!isFinite(distort)) distort = 0.2;
    var weight = Number(r.weight) || 0.01;
    var price = Number(r.avg) || Number(r.traderRub) || 0;
    // distance dominates; distortion and weight penalize; price in denominator for value
    var perf = dist * 100 - distort * 40 - weight * 15;
    if (price > 0) return Math.round((perf * 1000) / Math.sqrt(price) * 10) / 10;
    return Math.round(perf * 10) / 10;
  }

  function mapItem(it) {
    var p = it.properties || {};
    if (p.propertiesType !== "ItemPropertiesHeadphone" && (it.types || []).indexOf("headphones") < 0) {
      return null;
    }
    var buy = traderBuy(it);
    var r = {
      id: it.id,
      name: itemName(it),
      slug: it.normalizedName || it.shortName || "",
      icon: it.iconLink || it.gridImageLink || "",
      dist: Number(p.distanceModifier) || 1,
      distort: Number(p.distortion),
      ambient: Number(p.ambientVolume),
      dry: Number(p.dryVolume),
      cAttack: p.compressorAttack,
      cGain: p.compressorGain,
      cRelease: p.compressorRelease,
      cThresh: p.compressorThreshold,
      weight: Number(it.weight) || 0,
      width: Number(it.width) || 1,
      height: Number(it.height) || 1,
      avg: Number(it.avg24hPrice) || 0,
      low: Number(it.lastLowPrice) || 0,
      traderRub: buy ? buy.rub : 0,
      traderLvl: buy ? buy.level : 0,
      questLock: !!(buy && buy.taskUnlock),
      types: it.types || []
    };
    r.slots = r.width * r.height;
    r.score = scoreOf(r);
    return r;
  }

  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "tip";
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function showTip(r, e) {
    var el = ensureTip();
    var grid = [
      ["Distance modifier", r.dist],
      ["Distortion", r.distort],
      ["Ambient volume", r.ambient],
      ["Dry volume", r.dry],
      ["Compressor attack", r.cAttack],
      ["Compressor gain", r.cGain],
      ["Compressor release", r.cRelease],
      ["Compressor threshold", r.cThresh],
      ["Weight", r.weight],
      ["Grid", r.width + "×" + r.height],
      ["avg 24h", r.avg ? fmt(r.avg) : "—"],
      ["Trader RUB", r.traderRub ? fmt(r.traderRub) : "—"],
      ["Trader LL", r.traderLvl || "—"],
      ["Quest lock", r.questLock ? "yes" : "no"],
      ["Score", r.score]
    ];
    el.innerHTML =
      '<div class="tip-title">' +
      esc(r.name) +
      '</div><div class="tip-grid">' +
      grid
        .map(function (pair) {
          return (
            '<span class="k">' +
            esc(pair[0]) +
            '</span><span class="v">' +
            esc(String(pair[1] != null ? pair[1] : "—")) +
            "</span>"
          );
        })
        .join("") +
      "</div>";
    el.style.display = "block";
    var x = e.clientX + 14;
    var y = e.clientY + 14;
    el.style.left = x + "px";
    el.style.top = y + "px";
    var rect = el.getBoundingClientRect();
    if (x + rect.width > innerWidth - 8) el.style.left = innerWidth - rect.width - 8 + "px";
    if (y + rect.height > innerHeight - 8) el.style.top = innerHeight - rect.height - 8 + "px";
  }

  function hideTip() {
    if (tipEl) tipEl.style.display = "none";
  }

  function filtered() {
    var q = (document.getElementById("q").value || "").toLowerCase().trim();
    var minDist = Number(document.getElementById("minDist").value) || 0;
    var maxDistort = Number(document.getElementById("maxDistort").value);
    if (!isFinite(maxDistort)) maxDistort = 1;
    var maxPrice = Number(document.getElementById("maxPrice").value) || 0;
    return rows.filter(function (r) {
      if (r.dist < minDist) return false;
      if (isFinite(r.distort) && r.distort > maxDistort) return false;
      if (maxPrice > 0 && r.avg > maxPrice) return false;
      if (!q) return true;
      return (r.name + " " + r.slug).toLowerCase().indexOf(q) >= 0;
    });
  }

  function render() {
    var list = filtered();
    list.sort(function (a, b) {
      var av = a[sortKey];
      var bv = b[sortKey];
      if (typeof av === "string") {
        return sortDir * String(av).localeCompare(String(bv), "ru");
      }
      av = Number(av);
      bv = Number(bv);
      if (!isFinite(av)) av = 0;
      if (!isFinite(bv)) bv = 0;
      return sortDir * (av - bv);
    });
    var body = document.getElementById("tbody");
    body.innerHTML = list
      .map(function (r) {
        var traderCell = r.traderRub
          ? fmt(r.traderRub) +
            (r.traderLvl ? ' <span class="meta">LL' + r.traderLvl + "</span>" : "") +
            (r.questLock ? ' <span class="quest">quest</span>' : "")
          : "—";
        return (
          "<tr data-id=\"" +
          esc(r.id) +
          "\">" +
          '<td class="score">' +
          esc(String(r.score)) +
          "</td>" +
          "<td><div class=\"name-cell\" data-tip=\"1\">" +
          (r.icon
            ? '<img class="ico" src="' + esc(r.icon) + '" loading="lazy" alt="">'
            : "") +
          "<div><div class=\"name\">" +
          esc(r.name) +
          '</div><div class="meta">' +
          esc(r.slug) +
          "</div></div></div></td>" +
          "<td>" +
          esc(String(r.dist)) +
          "</td>" +
          "<td>" +
          (isFinite(r.distort) ? esc(String(r.distort)) : "—") +
          "</td>" +
          "<td>" +
          (isFinite(r.ambient) ? esc(String(r.ambient)) : "—") +
          "</td>" +
          "<td>" +
          (isFinite(r.dry) ? esc(String(r.dry)) : "—") +
          "</td>" +
          "<td>" +
          esc(r.weight.toFixed(3)) +
          "</td>" +
          "<td>" +
          esc(String(r.slots)) +
          "</td>" +
          "<td>" +
          (r.avg ? fmt(r.avg) : "—") +
          "</td>" +
          "<td>" +
          traderCell +
          "</td>" +
          '<td><button type="button" class="btn-ghost copy-btn" data-n="' +
          esc(r.slug || r.name) +
          '">copy</button></td>' +
          "</tr>"
        );
      })
      .join("");

    body.querySelectorAll("[data-tip]").forEach(function (cell) {
      var tr = cell.closest("tr");
      var id = tr && tr.getAttribute("data-id");
      var r = rows.filter(function (x) {
        return x.id === id;
      })[0];
      if (!r) return;
      cell.onmouseenter = function (e) {
        showTip(r, e);
      };
      cell.onmousemove = function (e) {
        showTip(r, e);
      };
      cell.onmouseleave = hideTip;
    });
    body.querySelectorAll(".copy-btn").forEach(function (btn) {
      btn.onclick = function () {
        try {
          navigator.clipboard.writeText(btn.getAttribute("data-n") || "");
        } catch (e) {}
      };
    });
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("status");
    if (!el) return;
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = msg || "";
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    if (btn) btn.disabled = true;
    setStatus("Loading…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Items…" });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var items = await TarkovAPI.items(mode);
      if (P) P.set(40, "Filter headphones…");
      if (!Array.isArray(items)) {
        if (items && typeof items === "object") items = Object.values(items);
        else items = [];
      }
      rows = [];
      for (var i = 0; i < items.length; i++) {
        var r = mapItem(items[i]);
        if (r) rows.push(r);
      }
      rows.sort(function (a, b) {
        return b.score - a.score;
      });
      if (P) P.set(90);
      document.getElementById("tableCard").hidden = false;
      render();
      setStatus("Headphones: " + rows.length, true);
      if (P) P.done();
      try {
        if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
      } catch (eB) {}
    } catch (e) {
      setStatus(e.message || String(e), false);
      if (P) P.fail(e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.getElementById("loadBtn").onclick = load;
  ["q", "minDist", "maxDistort", "maxPrice"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.oninput = render;
      el.onchange = render;
    }
  });
  document.querySelectorAll("th[data-k]").forEach(function (th) {
    th.onclick = function () {
      var k = th.getAttribute("data-k");
      if (sortKey === k) sortDir *= -1;
      else {
        sortKey = k;
        sortDir = k === "name" ? 1 : -1;
      }
      document.querySelectorAll("th[data-k]").forEach(function (t) {
        t.classList.toggle("sorted", t.getAttribute("data-k") === sortKey);
      });
      render();
    };
  });
})();
