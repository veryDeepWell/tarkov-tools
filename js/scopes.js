/*! Scopes — TarkovTableTool */
(function () {
  "use strict";

  const COMMUNITY = [
      { match: 'vortex-razor-hd-gen-ii-1-6x24', tier: 'S', nvg: 'good', scroll: 'smooth', role: 'lpvo', note: 'Часто #1 meta LPVO; тонкая сетка, мало bloom в ПНВ' },
      { match: 'eotech-vudu-1-6x24', tier: 'S', nvg: 'ok', scroll: 'smooth', role: 'lpvo', note: 'Красная сетка, любимчик многих; чуть ярче Razor в ПНВ' },
      { match: 'sig-sauer-tango6t-1-6x24', tier: 'S', nvg: 'ok', scroll: 'smooth', role: 'lpvo', note: '1–6 meta, рядом с Razor/Vudu' },
      { match: 'schmidt-bender-pm-ii-1-8x24', tier: 'S', nvg: 'ok', scroll: 'smooth', role: 'lpvo', note: '1–8, чуть дальше LPVO; сильный sniper/DMR' },
      { match: 'schmidt-bender-pm-ii-3-20x50', tier: 'S', nvg: 'ok', scroll: 'smooth', role: 'sniper', note: 'Дальний meta; часто с дальномером сверху' },
      { match: 'nightforce-atacr-7-35x56', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Экстремальная кратность 7–35; нишевый ультра-лонг' },
      { match: 'march-tactical-3-24x42', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: '3–24; min 3x уже юзабелен на открытых картах' },
      { match: 'hensoldt-ff-4-16x56', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: '4–16 классика дальнего' },
      { match: 'leupold-mark-4-lr-6-5-20x50', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: '6.5–20 long range' },
      { match: 'leupold-mark-5hd', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Сильный long-range LP/MR' },
      { match: 'burris-fullfield-tac30', tier: 'B', nvg: 'bad', scroll: 'smooth', role: 'lpvo', note: '1–4 ок днём; «red ring of death» в ПНВ' },
      { match: 'valday-ps-320', tier: 'B', nvg: 'good', scroll: 'stepped', role: 'lpvo', note: 'Бюджетный 1/6; сетка без сильного bloom' },
      { match: 'elcan-specterdr', tier: 'A', nvg: 'good', scroll: 'stepped', role: 'assault', note: '1/4 workhorse; мирный в ПНВ; Peacekeeper barter' },
      { match: 'elcan-specter-os4x', tier: 'B', nvg: 'ok', scroll: 'fixed', role: 'assault', note: 'Фикс 4x Specter' },
      { match: 'sig-sauer-bravo4', tier: 'A', nvg: 'ok', scroll: 'fixed', role: 'assault', note: 'Чистый 4x assault' },
      { match: 'trijicon-acog-ta01nsn', tier: 'A', nvg: 'good', scroll: 'fixed', role: 'assault', note: 'ACOG; норм под NVG' },
      { match: 'trijicon-acog-ta11d', tier: 'B', nvg: 'ok', scroll: 'fixed', role: 'assault', note: '3.5x ACOG' },
      { match: 'leupold-mark-4-hamr', tier: 'B', nvg: 'bad', scroll: 'fixed', role: 'assault', note: 'HAMR; толстая подсветка, ПНВ страдает' },
      { match: 'primary-arms-compact-prism', tier: 'B', nvg: 'ok', scroll: 'fixed', role: 'assault', note: 'Prism 2.5x budget' },
      { match: 'swampfox-trihawk', tier: 'B', nvg: 'ok', scroll: 'fixed', role: 'assault', note: 'Budget prism, часто хвалят за цену' },
      { match: 'ncstar-ado-p4', tier: 'C', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Жалобы на FPS / картинку' },
      { match: 'npz-usp-1', tier: 'C', nvg: 'unknown', scroll: 'fixed', role: 'assault', note: 'Жёсткий штраф эрги (−10)' },
      { match: 'kmz-1p59', tier: 'C', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Тяжёлый, эрга боль' },
      { match: 'kmz-1p69', tier: 'C', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Тяжёлый, эрга боль' },
      { match: 'pso-1', tier: 'C', nvg: 'ok', scroll: 'fixed', role: 'sniper', note: 'Бюджет SVD/AK; узкая картинка' },
      { match: 'pilad', tier: 'D', nvg: 'bad', scroll: 'fixed', role: 'assault', note: 'Слабая оптика' },
      { match: 'monstrum', tier: 'D', nvg: 'unknown', scroll: 'fixed', role: 'assault', note: 'Budget entry' },
      { match: 'pu-3-5x', tier: 'C', nvg: 'ok', scroll: 'fixed', role: 'sniper', note: 'Мосин-старт' },
      { match: 'flir-rs-32', tier: 'A', nvg: 'good', scroll: 'fixed', role: 'sniper', note: 'Термал — другая мета' },
      { match: 'thermal', tier: 'A', nvg: 'good', scroll: 'fixed', role: 'sniper', note: 'Термал' },
      { match: 'vulcan-mg', tier: 'B', nvg: 'good', scroll: 'fixed', role: 'sniper', note: 'ПНВ-прицел' }
    ];

  const TIER_SCORE = { S: 100, A: 80, B: 60, C: 40, D: 20, '?': 0 };

  function parseZoom(p) {
    var min = Number(p.zoomMin != null ? p.zoomMin : p.magnification) || 0;
    var max = Number(p.zoomMax != null ? p.zoomMax : p.magnification) || min;
    if (!min && p.zoomLevels && p.zoomLevels.length) {
      min = Number(p.zoomLevels[0]) || 0;
      max = Number(p.zoomLevels[p.zoomLevels.length - 1]) || min;
    }
    var label = min && max && min !== max ? min + "–" + max + "×" : min ? min + "×" : "—";
    return { min: min, max: max, label: label };
  }

  function findCommunity(slug) {
    slug = String(slug || "").toLowerCase();
    for (var i = 0; i < COMMUNITY.length; i++) {
      if (slug.indexOf(COMMUNITY[i].match) >= 0) return COMMUNITY[i];
    }
    return null;
  }

  function guessRole(zoom, range) {
    if (zoom.max != null && zoom.min != null && zoom.min <= 1.5 && zoom.max >= 4) return "lpvo";
    if (zoom.max != null && zoom.max >= 8) return "sniper";
    if (range >= 800 && zoom.max >= 3) return "sniper";
    return "assault";
  }

  var roleFilter = "all";
  var onlyMeta = false;
  var nvgOk = false;

  function wireFilters(api) {
    var chips = document.getElementById("roleChips");
    if (chips) {
      chips.addEventListener("click", function (e) {
        var t = e.target;
        if (!t || !t.getAttribute) return;
        var role = t.getAttribute("data-role");
        if (!role) return;
        roleFilter = role;
        chips.querySelectorAll("[data-role]").forEach(function (el) {
          el.classList.toggle("on", el.getAttribute("data-role") === role);
        });
        if (window.render) window.render();
      });
    }
    ["onlyMeta", "nvgOk"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        onlyMeta = !!(document.getElementById("onlyMeta") || {}).checked;
        nvgOk = !!(document.getElementById("nvgOk") || {}).checked;
        if (window.render) window.render();
      });
    });
    // search field id is #search on scopes page
    var search = document.getElementById("search");
    if (search) {
      search.addEventListener("input", function () {
        if (window.render) window.render();
      });
    }
  }

  var api = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#scopesHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#search",
    defaultSort: "tierScore",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (roleFilter !== "all" && row.role !== roleFilter) return false;
      if (onlyMeta && !row.hasMeta) return false;
      if (nvgOk && row.nvg !== "good" && row.nvg !== "ok") return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Прицел",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "zoomLabel", label: "Zoom" },
      { key: "range", label: "Range", format: "num" },
      { key: "ergo", label: "Ergo", format: "num" },
      {
        key: "tier",
        label: "Tier",
        html: function (r, h) {
          return "<strong>" + h.esc(r.tier || "?") + "</strong>";
        }
      },
      {
        key: "nvg",
        label: "ПНВ",
        html: function (r) {
          if (r.nvg === "good") return '<span class="tag ok">ПНВ+</span>';
          if (r.nvg === "ok") return '<span class="tag warn">ПНВ~</span>';
          if (r.nvg === "bad") return '<span class="tag bad">ПНВ−</span>';
          return '<span class="tag">ПНВ?</span>';
        }
      },
      { key: "role", label: "Role" },
      { key: "avg", label: "avg 24ч", format: "num" },
      {
        key: "note",
        label: "Note",
        sort: false,
        html: function (r, h) {
          return h.esc(r.note || "");
        }
      }
    ],
    fetch: function (mode, API) {
      return API.items(mode);
    },
    mapItem: function (it) {
      var p = it.properties || {};
      if (p.propertiesType !== "ItemPropertiesScope") return null;
      var zoom = parseZoom(p);
      var range = Number(p.sightingRange) || 0;
      var ergo = Number(p.ergonomics) || 0;
      var avg = Number(it.avg24hPrice) || 0;
      var slug = it.normalizedName || "";
      var com = findCommunity(slug);
      var tier = com ? com.tier : "?";
      return {
        id: it.id,
        slug: slug,
        name: TarkovTableTool.itemName(it),
        icon: it.iconLink || it.gridImageLink || "",
        zoomMin: zoom.min,
        zoomMax: zoom.max,
        zoomLabel: zoom.label,
        range: range,
        ergo: ergo,
        avg: avg,
        tier: tier,
        tierScore: TIER_SCORE[tier] != null ? TIER_SCORE[tier] : 0,
        nvg: com ? com.nvg : "unknown",
        scroll: com ? com.scroll : zoom.min !== zoom.max ? "smooth?" : "fixed?",
        role: com ? com.role : guessRole(zoom, range),
        note: com ? com.note : "",
        hasMeta: !!com
      };
    },
    onLoaded: function () {
      var f = document.getElementById("filters");
      var c = document.getElementById("tableCard");
      if (f) f.style.display = "block";
      if (c) c.style.display = "block";
    }
  });

  wireFilters(api);
})();
