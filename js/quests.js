/*! Quests — TarkovTableTool (table view) */
(function () {
  "use strict";
  var loadedMode = null, loadVersion = 0;

  var enLoc = {};
  var ruLoc = {};
  var mapName = {};
  var itemsById = {}, selectedQuest = null;
  function itemId(ref) { return typeof ref === "string" ? ref : ref && (ref.id || itemId(ref.item)) || ""; }
  function showQuest(task) {
    selectedQuest = task;
    var panel = document.getElementById("questDetail");
    if (!panel) return;
    panel.hidden = false;
    document.getElementById("questDetailTitle").textContent = task.name || task.normalizedName || task.id;
    var links = Object.create(null);
    function add(ref, reason) {
      var id = itemId(ref); if (!id) return;
      if (!links[id]) links[id] = [];
      if (!links[id].includes(reason)) links[id].push(reason);
    }
    (task.objectives || []).forEach(function (o) {
      if (o.item) add(o.item, "Цель задания");
      (o.items || []).forEach(function (r) { add(r, "Цель задания"); });
    });
    (task.neededKeys || []).forEach(function (b) { (b.keys || []).forEach(function (r) { add(r, "Ключ для задания"); }); });
    [task.startRewards, task.finishRewards].forEach(function (reward, i) {
      (reward && reward.items || []).forEach(function (r) { add(r, i ? "Награда" : "Выдаётся для задания"); });
    });
    document.getElementById("questObjectives").innerHTML = (task.objectives || []).map(function (o) {
      return '<li>' + esc(o.description || o.type || "Цель") + (o.count ? " ×" + Number(o.count) : "") + '</li>';
    }).join("");
    document.getElementById("questItemLinks").innerHTML = Object.keys(links).map(function (id) {
      var item = itemsById[id];
      var name = item ? TarkovTableTool.itemName(item) : id;
      return '<li><a class="item-link" data-item-id="' + esc(id) + '" href="' + esc(TarkovNav.href("tarkovtool-item-card.html", "item", id)) + '">' + esc(name) + '</a> · ' + esc(links[id].join(", ")) + '</li>';
    }).join("") || '<li>Связанных предметов в данных API нет</li>';
    var prerequisites = (task.taskRequirements || []).map(function (r) {
      var ref = r.task || r, id = itemId(ref);
      return '<li><a href="' + esc(TarkovNav.href("tarkovtool-quests.html", "quest", id)) + '">' + esc(typeof ref === "object" ? ref.name || id : id) + '</a></li>';
    });
    document.getElementById("questPrerequisites").innerHTML = prerequisites.join("") || '<li>Нет предшествующих заданий</li>';
    var button = document.getElementById("questDone");
    var done = TarkovProfile.isQuestCompleted(task.id);
    button.textContent = done ? "Снять отметку выполнения" : "Отметить выполненным";
    button.onclick = function () { TarkovProfile.markQuestComplete(task.id, !TarkovProfile.isQuestCompleted(task.id)); };
  }

  function esc(s) {
    return TarkovTableTool.esc(s);
  }
  function tName(id, slug) {
    try {
      if (enLoc && enLoc[id]) return enLoc[id];
      if (enLoc && enLoc[id + " name"]) return enLoc[id + " name"];
      if (enLoc && slug && enLoc[slug]) return enLoc[slug];
    } catch (e) {}
    return (
      (window.TarkovDicts && TarkovDicts.humanize && TarkovDicts.humanize(slug)) ||
      slug ||
      id
    );
  }
  function tNameRu(id, slug) {
    try {
      if (ruLoc && ruLoc[id]) return ruLoc[id];
      if (ruLoc && ruLoc[id + " name"]) return ruLoc[id + " name"];
      if (ruLoc && slug && ruLoc[slug]) return ruLoc[slug];
    } catch (e) {}
    return tName(id, slug);
  }
  function mapsOfTask(task) {
    var maps = [];
    (task.maps || []).forEach(function (m) {
      if (typeof m === "string") maps.push(mapName[m] || m);
      else if (m && m.name) maps.push(m.name);
      else if (m && m.id) maps.push(mapName[m.id] || m.id);
    });
    (task.objectives || []).forEach(function (o) {
      (o.maps || []).forEach(function (m) {
        var label =
          typeof m === "string" ? mapName[m] || m : (m && (m.name || mapName[m.id])) || "";
        if (label && maps.indexOf(label) < 0) maps.push(label);
      });
    });
    return maps;
  }
  function traderKey(task) {
    var tr = task.trader;
    if (!tr) return "";
    if (typeof tr === "string") return tr;
    return tr.normalizedName || tr.name || tr.id || "";
  }

  ["q", "mapFilter", "traderFilter", "onlyAvailable", "hideProfileDone"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      if (window.render) window.render();
    });
    el.addEventListener("change", function () {
      if (window.render) window.render();
    });
  });

  var api = TarkovTableTool.create({
    autoLoad: false,
    tbody: "#questBody",
    thead: "#questHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#q",
    defaultSort: "name",
    defaultSortDir: 1,
    progress: true,
    filterRow: function (row, q) {
      var mapF = (document.getElementById("mapFilter") || {}).value || "";
      var trF = (document.getElementById("traderFilter") || {}).value || "";
      var onlyAvail = !!(document.getElementById("onlyAvailable") || {}).checked;
      var hideDone = !!(document.getElementById("hideProfileDone") || {}).checked;
      if (trF && row.trader !== trF && row.traderKey !== trF) return false;
      if (mapF && (row.maps || []).indexOf(mapF) < 0 && (row.mapIds || []).indexOf(mapF) < 0)
        return false;
      if (window.TarkovProfile) {
        if (
          hideDone &&
          TarkovProfile.isQuestCompleted &&
          (TarkovProfile.isQuestCompleted(row.id) ||
            TarkovProfile.isQuestCompleted(row.slug) ||
            TarkovProfile.isQuestCompleted(row.name))
        )
          return false;
        if (onlyAvail && (TarkovProfile.isQuestCompleted(row.id) || TarkovProfile.taskGate(row.task).locked))
          return false;
      }
      if (!q) return true;
      var hay = (row.name || "") + " " + (row.nameRu || "") + " " + (row.slug || "");
      return hay.toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Квест",
        html: function (r, h) {
          return (
            "<div><div class=\"name\">" +
            h.esc(r.name) +
            '</div><div class="meta">' +
            h.esc(r.nameRu || r.slug || "") +
            '</div><button type="button" class="btn-ghost" data-quest-detail="' + h.esc(r.id) + '">Цели и предметы</button></div>'
          );
        }
      },
      { key: "trader", label: "Торговец" },
      { key: "minLevel", label: "Lvl", format: "num" },
      {
        key: "maps",
        label: "Карты",
        html: function (r, h) {
          return (r.maps || [])
            .map(function (m) {
              return '<span class="tag map">' + h.esc(m) + "</span>";
            })
            .join(" ");
        }
      },
      {
        key: "objectives",
        label: "Цели",
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
      if (!tb || !window.TarkovProfile || !TarkovProfile.gate) return;
      tb.querySelectorAll("[data-quest-detail]").forEach(function (button) {
        button.onclick = function () { var row = list.find(function (r) { return r.id === button.dataset.questDetail; }); if (row) showQuest(row.task); };
      });
      var navQuest = window.TarkovNav && TarkovNav.current("quest");
      var selected = list.find(function (r) { return r.id === (navQuest ? navQuest.id : selectedQuest && selectedQuest.id); });
      if (selected) showQuest(selected.task);
      list.forEach(function (r, i) {
        var tr = tb.querySelectorAll("tr")[i];
        if (!tr) return;
        try {
          var g = TarkovProfile.taskGate(r.task);
          TarkovProfile.applyLockToElement(tr, g);
        } catch (e) {}
      });
      var count = document.getElementById("count") || document.getElementById("tt-count-placeholder");
      if (count) count.textContent = "Показано: " + list.length;
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var version = ++loadVersion;
    var st = document.getElementById("status");
    var btn = document.getElementById("loadBtn");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Quests…", indeterminate: true });
      if (st) {
        st.className = "status";
        st.textContent = "Гружу…";
      }
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      loadedMode = mode;
      var dataPack = await Promise.all([TarkovAPI.tasks(mode), TarkovAPI.items(mode)]);
      var jt = dataPack[0];
      var jm = [];
      try {
        jm = await TarkovAPI.maps(mode);
      } catch (eM) {}
      try {
        enLoc = await TarkovAPI.locale("tasks", mode, "en");
        ruLoc = await TarkovAPI.locale("tasks", mode, "ru");
      } catch (eL) {
        enLoc = {};
        ruLoc = {};
      }
      if (version !== loadVersion) return;
      itemsById = {};
      dataPack[1].forEach(function (item) { itemsById[item.id] = item; });
      mapName = {};
      (jm || []).forEach(function (m) {
        if (m && m.id)
          mapName[m.id] =
            (window.TarkovDicts && TarkovDicts.humanize
              ? TarkovDicts.humanize(m.normalizedName || m.nameId || m.id)
              : m.name) || m.id;
      });

      // fill filters once
      var mapSel = document.getElementById("mapFilter");
      var trSel = document.getElementById("traderFilter");
      if (mapSel && mapSel.options.length <= 1) {
        Object.keys(mapName)
          .map(function (id) {
            return mapName[id];
          })
          .filter(function (v, i, a) {
            return a.indexOf(v) === i;
          })
          .sort()
          .forEach(function (name) {
            var o = document.createElement("option");
            o.value = name;
            o.textContent = name;
            mapSel.appendChild(o);
          });
      }

      var traders = {};
      var rows = (jt || []).map(function (task) {
        var slug = task.normalizedName || "";
        var name = tName(task.id, slug);
        var nameRu = tNameRu(task.id, slug);
        var tr = traderKey(task);
        traders[tr] = 1;
        var maps = mapsOfTask(task);
        return {
          id: task.id,
          task: task,
          slug: slug,
          name: name,
          nameRu: nameRu,
          trader: window.TarkovDicts && TarkovDicts.traderName ? TarkovDicts.traderName(tr) || tr : tr,
          traderKey: tr,
          minLevel: Number(task.minPlayerLevel) || 0,
          maps: maps,
          objectives: (task.objectives || []).length
        };
      });

      if (trSel && trSel.options.length <= 1) {
        Object.keys(traders)
          .filter(Boolean)
          .sort()
          .forEach(function (tr) {
            var o = document.createElement("option");
            o.value = tr;
            o.textContent =
              window.TarkovDicts && TarkovDicts.traderName
                ? TarkovDicts.traderName(tr) || tr
                : tr;
            trSel.appendChild(o);
          });
      }

      api.setRows(rows);
      var ui = document.getElementById("ui");
      if (ui) ui.style.display = "block";
      // ensure table exists in list area
      var list = document.getElementById("list");
      if (list && !document.getElementById("questBody")) {
        list.innerHTML =
          '<div class="table-wrap"><table class="data"><thead id="questHead"><tr></tr></thead><tbody id="questBody"></tbody></table></div>';
        // recreate API binding to new nodes — setRows already painted if tbody existed; re-call
        api.setRows(rows);
      }
      if (st) {
        st.className = "status ok";
        st.textContent = "Квестов: " + rows.length;
      }
      if (P) P.done();
    } catch (e) {
      console.error(e);
      if (st) {
        st.className = "status err";
        st.textContent = e.message || String(e);
      }
      if (P) P.fail(e.message);
    } finally {
      if (btn && version === loadVersion) btn.disabled = false;
    }
  };


  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
      if (loadedMode && loadedMode !== document.getElementById("gameMode").value) { api.setRows([]); document.getElementById("loadBtn").onclick(); return; }
    } catch (e0) {}
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
