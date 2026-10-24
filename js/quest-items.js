/*! Quest items — TarkovTableTool */
(function () {
  "use strict";

  var WANT_TYPES = [
    "findItem", "giveItem", "buildWeapon", "mark", "plantItem", "sellItem",
    "findQuestItem", "giveQuestItem", "plantQuestItem"
  ];
  var TYPE_RU = {
    findItem: "Найти",
    giveItem: "Сдать",
    buildWeapon: "Собрать",
    mark: "Метка",
    plantItem: "Заложить",
    sellItem: "Продать",
    findQuestItem: "Найти квестовый предмет",
    giveQuestItem: "Сдать квестовый предмет",
    plantQuestItem: "Заложить квестовый предмет"
  };
  var activeTypes = null;
  var done = {};

  function loadDone() {
    try {
      if (window.TarkovProfile && TarkovProfile.migrateQuestItemDoneFromStorage) {
        TarkovProfile.migrateQuestItemDoneFromStorage();
      }
      if (window.TarkovProfile && TarkovProfile.getActive) {
        var profile = TarkovProfile.getActive();
        var map = (profile && profile.quests && profile.quests.itemDone) || {};
        done = Object.assign({}, map);
      } else if (window.TarkovStorage && TarkovStorage.getJson) {
        done = Object.assign({}, TarkovStorage.getJson("tarkovQuestItemsDone", {}) || {});
      } else {
        done = {};
      }
    } catch (e) {
      done = {};
      try { console.debug && console.debug("[tt:quest-items] loadDone", e); } catch (_e) {}
    }
  }

  function setDoneKey(key, isDone) {
    if (!key) return;
    if (isDone) done[key] = true;
    else delete done[key];
    try {
      if (window.TarkovProfile && TarkovProfile.setQuestItemDone) {
        TarkovProfile.setQuestItemDone(key, !!isDone);
        return;
      }
      if (window.TarkovStorage && TarkovStorage.setJson) {
        TarkovStorage.setJson("tarkovQuestItemsDone", done);
      }
    } catch (e) {
      try { console.debug && console.debug("[tt:quest-items] setDoneKey", e); } catch (_e) {}
    }
  }

  function clearAllDone() {
    done = {};
    try {
      if (window.TarkovProfile && TarkovProfile.clearQuestItemDone) {
        TarkovProfile.clearQuestItemDone();
        return;
      }
      if (window.TarkovStorage && TarkovStorage.setJson) {
        TarkovStorage.setJson("tarkovQuestItemsDone", done);
      }
    } catch (e) {
      try { console.debug && console.debug("[tt:quest-items] clearAllDone", e); } catch (_e) {}
    }
  }

  loadDone();

  function paintTypes(rows) {
    var set = {};
    rows.forEach(function (r) {
      set[r.type] = (set[r.type] || 0) + 1;
    });
    if (!activeTypes) {
      activeTypes = {};
      Object.keys(set).forEach(function (k) {
        activeTypes[k] = true;
      });
    }
    var chips = document.getElementById("typeChips");
    if (!chips) return;
    chips.innerHTML = Object.keys(set)
      .map(function (t) {
        var on = activeTypes[t] ? " active" : "";
        return (
          '<span class="chip' +
          on +
          '" data-type="' +
          t +
          '">' +
          (TYPE_RU[t] || t) +
          " (" +
          set[t] +
          ")</span>"
        );
      })
      .join("");
    chips.querySelectorAll("[data-type]").forEach(function (c) {
      c.onclick = function () {
        var ty = c.getAttribute("data-type");
        activeTypes[ty] = !activeTypes[ty];
        c.classList.toggle("active", !!activeTypes[ty]);
        if (window.render) window.render();
      };
    });
  }

  ["search", "onlyFir", "hideDone", "hideLocked"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      if (window.render) window.render();
    });
    el.addEventListener("change", function () {
      if (window.render) window.render();
    });
  });

  var clearBtn = document.getElementById("clearDone");
  if (clearBtn)
    clearBtn.onclick = function () {
      clearAllDone();
      if (window.render) window.render();
    };

  var api = TarkovTableTool.create({
    autoLoad: false,
    tbody: "#tbody",
    thead: "#qiHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#search",
    defaultSort: "questName",
    defaultSortDir: 1,
    progress: true,
    filterRow: function (row, q) {
      if (activeTypes && !activeTypes[row.type]) return false;
      var onlyFir = document.getElementById("onlyFir");
      if (onlyFir && onlyFir.checked && !row.fir) return false;
      var hideDone = document.getElementById("hideDone");
      if (hideDone && hideDone.checked) {
        if (done[row.key]) return false;
        if (
          window.TarkovProfile &&
          TarkovProfile.isQuestItemDone &&
          TarkovProfile.isQuestItemDone(row.key)
        )
          return false;
      }
      var hideLocked = document.getElementById("hideLocked");
      if (hideLocked && hideLocked.checked && row.locked) return false;
      if (!q) return true;
      var hay =
        (row.itemName || "") +
        " " +
        (row.questName || "") +
        " " +
        (row.slugs || []).join(" ");
      return hay.toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "done",
        label: "✓",
        sort: false,
        html: function (r, h) {
          var checked = done[r.key] ? " checked" : "";
          return (
            '<input type="checkbox" class="qi-done" data-key="' +
            h.esc(r.key) +
            '"' +
            checked +
            ">"
          );
        }
      },
      {
        key: "itemName",
        label: "Предмет",
        html: function (r, h) {
          return TarkovTableTool.nameCell(
            { name: r.itemName, slug: (r.slugs && r.slugs[0]) || "", icon: r.icon },
            h
          );
        }
      },
      {
        key: "type",
        label: "Тип",
        html: function (r) {
          return TYPE_RU[r.type] || r.type;
        }
      },
      { key: "count", label: "×", format: "num" },
      {
        key: "fir",
        label: "FIR",
        html: function (r) {
          return r.fir ? "FIR" : "";
        }
      },
      { key: "questName", label: "Квест" },
      { key: "trader", label: "Торговец" },
      { key: "minLvl", label: "Lvl", format: "num" },
      {
        key: "avg",
        label: "Flea",
        format: "num"
      }
    ],
    fetch: function () {
      return Promise.resolve([]);
    },
    mapItem: function () {
      return null;
    },
    afterPaint: function (list, ctx) {
      var tb = ctx.tbody;
      if (!tb) return;
      tb.querySelectorAll(".qi-done").forEach(function (cb) {
        cb.onchange = function () {
          var key = cb.getAttribute("data-key");
          setDoneKey(key, cb.checked);
        };
      });
      list.forEach(function (r, i) {
        var tr = tb.querySelectorAll("tr")[i];
        if (!tr) return;
        if (window.TarkovProfile && TarkovProfile.gate) {
          try {
            var g = TarkovProfile.gate({
              minLevel: r.minLvl,
              questLocked: false
            });
            if (g && g.locked) TarkovProfile.applyLockToElement(tr, g);
          } catch (e) {}
        }
      });
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Quest items…", indeterminate: true });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var tasks = await TarkovAPI.tasks(mode);
      var items = await TarkovAPI.items(mode);
      var byId = {};
      (items || []).forEach(function (i) {
        if (i && i.id) byId[i.id] = i;
      });

      var rows = [];
      (tasks || []).forEach(function (task) {
        var qName = TarkovTableTool.itemName
          ? task.name ||
            (window.TarkovDicts && TarkovDicts.humanize
              ? TarkovDicts.humanize(task.normalizedName)
              : task.normalizedName) ||
            task.id
          : task.normalizedName || task.id;
        try {
          if (window.TarkovNames && task.name) qName = task.name;
        } catch (e) {}
        var qSlug = task.normalizedName || "";
        var trader =
          (task.trader && (task.trader.name || task.trader.normalizedName || task.trader.id)) ||
          task.traderName ||
          "";
        if (typeof task.trader === "string") trader = task.trader;
        try {
          if (window.TarkovDicts && TarkovDicts.traderName && trader)
            trader = TarkovDicts.traderName(trader) || trader;
        } catch (e2) {}
        var minLvl = Number(task.minPlayerLevel) || 0;
        (task.objectives || []).forEach(function (o) {
          if (!WANT_TYPES.includes(o.type)) return;
          var ids = [];
          function addItemRef(ref) {
            if (typeof ref === "string" && ref) {
              ids.push(ref);
              return;
            }
            if (!ref || typeof ref !== "object") return;
            if (typeof ref.id === "string" && ref.id) ids.push(ref.id);
            else if (ref.item) addItemRef(ref.item);
          }
          addItemRef(o.item);
          if (Array.isArray(o.items)) o.items.forEach(addItemRef);
          if (!ids.length) return;
          var names = [];
          var slugs = [];
          var first = null;
          var avg = 0;
          ids.forEach(function (id) {
            var it = byId[id];
            if (!it) {
              names.push(id.slice(0, 8));
              return;
            }
            if (!first) first = it;
            names.push(TarkovTableTool.itemName(it));
            slugs.push(it.normalizedName || "");
            avg = Math.max(avg, Number(it.avg24hPrice) || 0);
          });
          var count = Number(o.count) || 1;
          var fir = !!(o.foundInRaid || o.fir);
          var optional = !!o.optional;
          var key = task.id + "|" + (o.id || ids[0]);
          var locked = false;
          if (window.TarkovProfile && TarkovProfile.meetsLevel && minLvl) {
            locked = !TarkovProfile.meetsLevel(minLvl);
          }
          rows.push({
            key: key,
            taskId: task.id,
            objId: o.id,
            itemName: names[0] + (names.length > 1 ? " (+" + (names.length - 1) + ")" : ""),
            itemNames: names,
            slugs: slugs,
            icon: (first && (first.iconLink || first.gridImageLink)) || "",
            count: count,
            fir: fir,
            optional: optional,
            type: o.type,
            questName: qName,
            questSlug: qSlug,
            trader: trader,
            minLvl: minLvl,
            avg: avg,
            locked: locked
          });
        });
      });

      activeTypes = null;
      paintTypes(rows);
      api.setRows(rows);
      var card = document.getElementById("tableCard");
      if (card) card.style.display = "block";
      if (status) {
        status.className = "status ok";
        status.textContent = "Строк: " + rows.length;
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


  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
      loadDone();
    } catch (e0) {
      try { console.debug && console.debug("[tt:quest-items] render", e0); } catch (_e) {}
    }
    try {
      if (typeof api !== "undefined" && api && typeof api.setRows === "function") {
        if (typeof api.getRows === "function") api.setRows(api.getRows());
        else if (typeof api.paint === "function") api.paint();
      }
    } catch (e1) {}
  };
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () {
      window.render();
    });
  }

})();
