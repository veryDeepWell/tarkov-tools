/*! Keys — TarkovTableTool + map chips + TarkovKeysRating */
(function () {
  "use strict";

  var MAP_ORDER = [
    "factory",
    "ground-zero",
    "customs",
    "woods",
    "shoreline",
    "interchange",
    "reserve",
    "lighthouse",
    "streets",
    "labs",
    "labyrinth",
    "other"
  ];
  var MAP_RU = {
    factory: "Factory",
    "ground-zero": "Ground Zero",
    customs: "Customs",
    woods: "Woods",
    shoreline: "Shoreline",
    interchange: "Interchange",
    reserve: "Reserve",
    lighthouse: "Lighthouse",
    streets: "Streets",
    labs: "The Lab",
    labyrinth: "Labyrinth",
    other: "Прочее"
  };
  var MAP_RULES = [
    ["labs", /labs|terragroup|lab-|\blab\b/],
    ["labyrinth", /labyrinth/],
    ["factory", /factory/],
    ["ground-zero", /ground-zero|groundzero|science-campus|nexus/],
    ["customs", /customs|customs-/],
    ["woods", /woods|sawmill|scav-house/],
    ["shoreline", /shoreline|health-resort|resort|cottage/],
    ["interchange", /interchange|ultra|oli|idea|goshan/],
    ["reserve", /reserve|bunker|d-2|d2|rb-/],
    ["lighthouse", /lighthouse|water-treatment|rogue/],
    ["streets", /streets|lexos|cardinal|chek/]
  ];

  var activeMap = "customs";
  var tableApi = null;

  function detectMap(slug) {
    slug = String(slug || "").toLowerCase();
    for (var i = 0; i < MAP_RULES.length; i++) {
      if (MAP_RULES[i][1].test(slug)) return MAP_RULES[i][0];
    }
    return "other";
  }

  function personalRating(it) {
    try {
      if (window.TarkovKeysRating) {
        var s = TarkovKeysRating.getScore(it.id);
        if (s == null && it.normalizedName)
          s = TarkovKeysRating.getScore(it.normalizedName);
        return s;
      }
    } catch (e) {}
    return null;
  }

  function paintMaps(counts) {
    var box = document.getElementById("maps");
    if (!box) return;
    box.innerHTML = MAP_ORDER.map(function (m) {
      var n = counts[m] || 0;
      if (!n && m !== "other") return "";
      var on = m === activeMap ? " on" : "";
      return (
        '<button type="button" class="chip' +
        on +
        '" data-map="' +
        m +
        '">' +
        (MAP_RU[m] || m) +
        " (" +
        n +
        ")</button>"
      );
    }).join("");
    box.querySelectorAll("[data-map]").forEach(function (btn) {
      btn.onclick = function () {
        activeMap = btn.getAttribute("data-map");
        var title = document.getElementById("tableTitle");
        if (title) title.textContent = MAP_RU[activeMap] || activeMap;
        box.querySelectorAll("[data-map]").forEach(function (b) {
          b.classList.toggle("on", b.getAttribute("data-map") === activeMap);
        });
        if (window.render) window.render();
      };
    });
  }

  var hq = document.getElementById("hideQuest");
  if (hq)
    hq.addEventListener("change", function () {
      if (window.render) window.render();
    });

  tableApi = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#keysHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#search",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (row.map !== activeMap) return false;
      var hideQuest = document.getElementById("hideQuest");
      if (hideQuest && hideQuest.checked && row.quest) return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Ключ",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "uses", label: "Uses", format: "num" },
      { key: "avg", label: "avg 24ч", format: "num" },
      {
        key: "perUse",
        label: "₽/use",
        format: "num"
      },
      {
        key: "score",
        label: "Score",
        html: function (r, h) {
          if (r.score == null) return '<span class="meta">—</span>';
          return "<strong>" + h.esc(String(r.score)) + "</strong>";
        }
      },
      {
        key: "quest",
        label: "Quest",
        html: function (r) {
          return r.quest ? "✓" : "";
        }
      }
    ],
    fetch: function () {
      return Promise.resolve([]);
    },
    mapItem: function () {
      return null;
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Keys…" });
      try {
        if (window.TarkovKeysRating) await TarkovKeysRating.load();
      } catch (eR) {}
      var modeGame = (document.getElementById("gameMode") || {}).value || "pve";
      var items = await TarkovAPI.items(modeGame);
      var tasks = [];
      try {
        tasks = await TarkovAPI.tasks(modeGame);
      } catch (eT) {}
      var questKeyIds = {};
      (tasks || []).forEach(function (t) {
        (t.neededKeys || []).forEach(function (block) {
          (block.keys || []).forEach(function (id) {
            questKeyIds[id] = 1;
          });
        });
        (t.objectives || []).forEach(function (o) {
          if (o.type === "giveItem" || o.type === "findItem") {
            if (typeof o.item === "string") questKeyIds[o.item] = 1;
            (o.items || []).forEach(function (x) {
              if (typeof x === "string") questKeyIds[x] = 1;
              else if (x && x.id) questKeyIds[x.id] = 1;
            });
          }
        });
      });
      var rows = [];
      var counts = {};
      MAP_ORDER.forEach(function (m) {
        counts[m] = 0;
      });
      (items || []).forEach(function (it) {
        if (!(it.types || []).includes("keys")) return;
        var p = it.properties || {};
        var uses = Number(p.uses) || 1;
        var avg = Number(it.avg24hPrice) || 0;
        var isQuest = !!questKeyIds[it.id];
        var slug = it.normalizedName || "";
        var map = detectMap(slug);
        var score = personalRating(it);
        var row = {
          id: it.id,
          slug: slug,
          name: TarkovTableTool.itemName(it),
          icon: it.iconLink || it.gridImageLink || "",
          uses: uses,
          avg: avg,
          perUse: uses > 0 ? avg / uses : avg,
          score: score,
          quest: isQuest,
          map: map
        };
        rows.push(row);
        counts[map] = (counts[map] || 0) + 1;
      });
      tableApi.setRows(rows);
      paintMaps(counts);
      var mapsCard = document.getElementById("mapsCard");
      var tableCard = document.getElementById("tableCard");
      if (mapsCard) mapsCard.style.display = "block";
      if (tableCard) tableCard.style.display = "block";
      var title = document.getElementById("tableTitle");
      if (title) title.textContent = MAP_RU[activeMap] || activeMap;
      if (status) {
        status.className = "status ok";
        status.textContent = "Ключей: " + rows.length;
      }
      if (P) P.done("OK");
    } catch (e) {
      if (status) {
        status.className = "status err";
        status.textContent = e.message || String(e);
      }
      if (P) P.fail(e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
    } catch (e0) {}
    try {
      if (tableApi && tableApi.setRows && tableApi.getRows) tableApi.setRows(tableApi.getRows());
      else if (tableApi && tableApi.paint) tableApi.paint();
    } catch (e1) {}
  };
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () {
      window.render();
    });
  }
})();
