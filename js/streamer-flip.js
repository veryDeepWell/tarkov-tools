/*! Streamer flip — TarkovTableTool */
(function () {
  "use strict";

  var THERAPIST = "54cb57776803fa99248b456e";
  const STREAMER_KEYS = [
      'deadlyslobs-beard-oil',
      'kotton-beanie',
      'pestily-plague-mask',
      'lvndmarks-rat-poison',
      'smoke-balaclava',
      'viibiin-sneaker',
      'fireklean-gun-lube',
      'bakeezy-cook-book',
      'baddies-red-beard',
      '42-signature-blend-english-tea',
      '42nd-signature',
      'golden-rooster-figurine',
      'devildog-mayo',
      'jar-of-devildog',
      'old-firesteel',
      'can-of-sprats',
      'tigzresq',
      'mazoni-golden-dumbbell',
      'lm-kc-130',
      'fake-white-beard',
      'gingy-keychain',
      'wz-wallet',
      'axe', // careful
      'press-pass',
      'mustache',
      'beard-oil',
      'rat-poison',
      'plague-mask',
      'cook-book',
      'gun-lube',
      'english-tea',
      'streamer',
      'twitch',
      // more creator refs often in name
      'pestily',
      'lvndmark',
      'deadlyslob',
      'kotton',
      'viibiin',
      'bakeezy',
      'fireklean',
      'baddie',
      'smeggy',
      'glorious',
      'ghostfreak',
      'willithidden',
      'desmondpilak',
      'hideout-cat-figurine',
      'walking-tank-figurine',
      'prapor-figurine',
      'therapist-figurine',
      'fence-figurine',
      'sk dil-figurine',
      'peacekeeper-figurine',
      'mechanic-figurine',
      'ragman-figurine',
      'jaeger-figurine',
      'lightkeeper-figurine',
      'ref-figurine',
      'btr-figurine',
      'bloodsucker-figurine',
      'petya-crooker',
      'nailhead-figurine',
      'elvisvista',
      'mastichin',
      'tarcoin'
    ];
  const STREAMER_EXACT = new Set([
      'deadlyslobs-beard-oil',
      'kotton-beanie',
      'pestily-plague-mask',
      'lvndmarks-rat-poison',
      'smoke-balaclava',
      'viibiin-sneaker',
      'fireklean-gun-lube',
      'bakeezy-cook-book',
      'baddies-red-beard',
      '42-signature-blend-english-tea',
      'golden-rooster-figurine',
      'devildog-mayo',
      'jar-of-devildog-mayo',
      'old-firesteel',
      'can-of-sprats',
      'fake-white-beard',
      'gingy-keychain',
      'mazoni-golden-dumbbell',
      'desmondpilak-cd',
      'lm-kc-130-model-aircraft',
      'tigzresq-splint'
    ]);

  function isStreamerItem(slug) {
    if (!slug) return false;
    var s = String(slug).toLowerCase();
    if (STREAMER_EXACT.has && STREAMER_EXACT.has(s)) return true;
    if (STREAMER_EXACT instanceof Set && STREAMER_EXACT.has(s)) return true;
    if (Array.isArray(STREAMER_KEYS) && STREAMER_KEYS.indexOf(s) >= 0) return true;
    if (s.endsWith("-figurine") || s.indexOf("figurine") >= 0) return true;
    var keys = [
      "deadlyslob", "pestily", "lvndmark", "kotton", "viibiin", "bakeezy",
      "fireklean", "baddie", "beard-oil", "streamer", "twitch"
    ];
    for (var i = 0; i < keys.length; i++) if (s.indexOf(keys[i]) >= 0) return true;
    return false;
  }

  function formatNum(n) {
    return TarkovTableTool.fmtNum(n);
  }

  ["search", "buyPrice", "onlyProfit"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () { if (window.render) window.render(); });
    el.addEventListener("change", function () { if (window.render) window.render(); });
  });

  var api = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#sfHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#search",
    defaultSort: "profit",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      var only = document.getElementById("onlyProfit");
      if (only && only.checked && !(row.profit > 0)) return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Предмет",
        html: function (r, h) { return TarkovTableTool.nameCell(r, h); }
      },
      { key: "buy", label: "Buy", format: "num" },
      { key: "therapist", label: "Therapist", format: "num" },
      {
        key: "profit",
        label: "Profit",
        html: function (r) {
          if (!r.hasTherapist) return "—";
          var cls = r.profit > 0 ? "pos" : "neg";
          return '<span class="' + cls + '">' + (r.profit > 0 ? "+" : "") + formatNum(r.profit) + "</span>";
        }
      },
      {
        key: "roi",
        label: "ROI%",
        html: function (r) {
          if (!r.hasTherapist || !isFinite(r.roi)) return "—";
          var cls = r.roi > 0 ? "pos" : "neg";
          return '<span class="' + cls + '">' + Number(r.roi).toFixed(1) + "%</span>";
        }
      },
      { key: "offers", label: "Offers", format: "num" }
    ],
    fetch: function () { return Promise.resolve([]); },
    mapItem: function () { return null; },
    afterPaint: function (list, ctx) {
      (ctx.tbody || document.getElementById("tbody")).querySelectorAll("tr").forEach(function (tr, i) {
        if (list[i] && list[i].profit > 0) tr.classList.add("good");
      });
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Streamer items…", indeterminate: true });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var priceMode = (document.getElementById("buyPrice") || {}).value || "avg24h";
      var items = await TarkovAPI.items(mode);
      var rows = [];
      (items || []).forEach(function (it) {
        var slug = it.normalizedName || "";
        if (!isStreamerItem(slug)) return;
        var sell = it.sellToTrader || [];
        var th = sell.find(function (s) { return s.trader === THERAPIST; });
        var therapist = th ? Number(th.priceRUB != null ? th.priceRUB : th.price) || 0 : 0;
        var avg = Number(it.avg24hPrice) || 0;
        var low = Number(it.lastLowPrice) || 0;
        var buy = priceMode === "avg24h" ? avg || low : low || avg;
        var profit = therapist && buy ? therapist - buy : null;
        var roi = profit != null && buy > 0 ? (profit / buy) * 100 : null;
        rows.push({
          id: it.id,
          slug: slug,
          name: TarkovTableTool.itemName(it),
          icon: it.iconLink || it.gridImageLink || "",
          buy: buy,
          avg: avg,
          low: low,
          therapist: therapist,
          profit: profit != null ? profit : -Infinity,
          roi: roi != null ? roi : -Infinity,
          offers: it.lastOfferCount || 0,
          hasTherapist: therapist > 0
        });
      });
      api.setRows(rows);
      var card = document.getElementById("tableCard");
      if (card) card.style.display = "block";
      if (status) {
        status.className = "status ok";
        status.textContent =
          "Стримерских: " +
          rows.length +
          " · с Терапевтом: " +
          rows.filter(function (r) { return r.hasTherapist; }).length;
      }
      if (P) P.done();
    } catch (e) {
      console.error(e);
      if (status) {
        status.className = "status err";
        status.textContent = e.message || String(e);
      }
      if (P) P.fail(e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
})();
