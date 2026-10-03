/*! Tarkov — Quest cheese: craft / other-quest sources for quest items */
(function () {
  "use strict";

  var itemsById = {};
  var tasksList = [];
  var craftsList = [];
  var craftByProduct = {};
  var rewardByItem = {};
  var needByItem = {};
  var modeSearch = "item";

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
    if (!it) return "";
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    return it.shortName || it.name || it.normalizedName || it.id || "";
  }

  function taskName(t) {
    if (!t) return "";
    try {
      if (window.TarkovNames && TarkovNames.display) {
        var n = TarkovNames.display(t);
        if (n && n !== t.id) return n;
      }
    } catch (e) {}
    if (t.normalizedName) {
      try {
        if (window.TarkovDicts && TarkovDicts.humanize) return TarkovDicts.humanize(t.normalizedName);
      } catch (e2) {}
      return t.normalizedName;
    }
    return String(t.name || t.id || "");
  }

  function stationLabel(id) {
    try {
      if (window.TarkovDicts && TarkovDicts.hideoutStation) return TarkovDicts.hideoutStation(id);
    } catch (e) {}
    try {
      if (window.TarkovDicts && TarkovDicts.humanize) return TarkovDicts.humanize(id);
    } catch (e2) {}
    return id ? String(id).slice(0, 8) : "?";
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

  function buildIndexes() {
    craftByProduct = {};
    rewardByItem = {};
    needByItem = {};
    craftsList.forEach(function (c) {
      var prod = c.productItem;
      var pid = prod && (prod.item || prod.id || prod);
      if (typeof pid === "object") pid = pid.id;
      if (!pid) return;
      if (!craftByProduct[pid]) craftByProduct[pid] = [];
      craftByProduct[pid].push({ type: "craft", craft: c, count: Number(prod.count) || 1 });
    });
    tasksList.forEach(function (t) {
      var fr = t.finishRewards || {};
      asArray(fr.items).forEach(function (rw) {
        var iid = rw.item || rw.id;
        if (typeof iid === "object") iid = iid.id;
        if (!iid) return;
        if (!rewardByItem[iid]) rewardByItem[iid] = [];
        rewardByItem[iid].push({ type: "reward", task: t, count: Number(rw.count) || 1 });
      });
      asArray(t.objectives).forEach(function (o) {
        if (!o || (o.type !== "giveItem" && o.type !== "findItem")) return;
        var ids = o.items || (o.item ? [o.item] : []);
        ids.forEach(function (iid) {
          if (typeof iid === "object") iid = iid.id;
          if (!iid) return;
          if (!needByItem[iid]) needByItem[iid] = [];
          needByItem[iid].push({
            type: "need",
            task: t,
            objective: o,
            count: Number(o.count) || 1,
            fir: !!o.foundInRaid,
            optional: !!o.optional
          });
        });
      });
    });
  }

  function searchItems(q) {
    q = (q || "").toLowerCase().trim();
    if (q.length < 2) return [];
    var out = [];
    var ids = Object.keys(itemsById);
    for (var i = 0; i < ids.length && out.length < 30; i++) {
      var it = itemsById[ids[i]];
      var hay = (itemName(it) + " " + (it.normalizedName || "") + " " + (it.shortName || "")).toLowerCase();
      if (hay.indexOf(q) >= 0) out.push(it);
    }
    return out;
  }

  function searchTasks(q) {
    q = (q || "").toLowerCase().trim();
    if (q.length < 2) return [];
    var out = [];
    for (var i = 0; i < tasksList.length && out.length < 30; i++) {
      var t = tasksList[i];
      var hay = (taskName(t) + " " + (t.normalizedName || "")).toLowerCase();
      if (hay.indexOf(q) >= 0) out.push(t);
    }
    return out;
  }

  function renderSuggest() {
    var box = document.getElementById("suggest");
    var q = document.getElementById("q").value;
    var list = modeSearch === "item" ? searchItems(q) : searchTasks(q);
    if (!list.length) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    box.style.display = "block";
    box.innerHTML = list
      .map(function (x) {
        if (modeSearch === "item") {
          return (
            '<div data-id="' +
            esc(x.id) +
            '">' +
            esc(itemName(x)) +
            ' <span class="muted">' +
            esc(x.normalizedName || "") +
            "</span></div>"
          );
        }
        return (
          '<div data-id="' +
          esc(x.id) +
          '">' +
          esc(taskName(x)) +
          ' <span class="muted">' +
          esc(x.normalizedName || "") +
          "</span></div>"
        );
      })
      .join("");
    box.querySelectorAll("[data-id]").forEach(function (el) {
      el.onclick = function () {
        var id = el.getAttribute("data-id");
        if (modeSearch === "item") selectItem(id);
        else selectQuest(id);
        box.style.display = "none";
      };
    });
  }

  function sourcesForItem(itemId) {
    return {
      crafts: craftByProduct[itemId] || [],
      rewards: rewardByItem[itemId] || [],
      needs: needByItem[itemId] || []
    };
  }

  function selectItem(id) {
    var it = itemsById[id];
    document.getElementById("q").value = itemName(it) || id;
    var src = sourcesForItem(id);
    var html = "<h3>" + esc(itemName(it)) + "</h3>";
    html += renderSources(src, id);
    document.getElementById("results").innerHTML = html;
  }

  function selectQuest(id) {
    var task = tasksList.filter(function (t) {
      return t.id === id;
    })[0];
    document.getElementById("q").value = taskName(task) || id;
    var html = "<h3>" + esc(taskName(task)) + "</h3>";
    html += '<p class="muted">Предметы, которые квест просит (give/find), и чем их закрыть.</p>';
    var seen = {};
    asArray(task.objectives).forEach(function (o) {
      if (!o || (o.type !== "giveItem" && o.type !== "findItem")) return;
      var ids = o.items || (o.item ? [o.item] : []);
      ids.forEach(function (iid) {
        if (typeof iid === "object") iid = iid.id;
        if (!iid || seen[iid]) return;
        seen[iid] = true;
        var it = itemsById[iid];
        var src = sourcesForItem(iid);
        html +=
          '<div class="src-row"><img class="ico" src="' +
          esc((it && (it.iconLink || it.gridImageLink)) || "") +
          '" alt=""><div><b>' +
          esc(itemName(it) || iid) +
          "</b> ×" +
          (Number(o.count) || 1) +
          (o.foundInRaid ? ' <span class="badge need">FIR</span>' : "") +
          '<div class="muted">' +
          esc(o.type) +
          "</div></div></div>";
        html += renderSources(src, iid, true);
      });
    });
    if (!Object.keys(seen).length) html += '<p class="empty">Нет giveItem/findItem в целях.</p>';
    document.getElementById("results").innerHTML = html;
  }

  function renderSources(src, itemId, nested) {
    var parts = [];
    if (src.crafts.length) {
      parts.push("<h3>Крафт в убежке</h3>");
      src.crafts.forEach(function (c) {
        var craft = c.craft;
        var reqs = asArray(craft.requiredItems)
          .map(function (r) {
            var iid = r.item || r.id;
            if (typeof iid === "object") iid = iid.id;
            var it = itemsById[iid];
            var tool = r.attributes && r.attributes.tool;
            return esc(itemName(it) || iid) + "×" + (r.count || 1) + (tool ? " (tool)" : "");
          })
          .join(", ");
        parts.push(
          '<div class="src-row"><span class="badge craft">craft</span><div>Lv' +
            (craft.level || "?") +
            " · " +
            esc(stationLabel(craft.station)) +
            ' <span class="muted">→ ×' +
            c.count +
            '</span><div class="muted">' +
            reqs +
            "</div></div></div>"
        );
      });
    }
    if (src.rewards.length) {
      parts.push("<h3>Награда с других квестов</h3>");
      src.rewards.forEach(function (r) {
        parts.push(
          '<div class="src-row"><span class="badge reward">reward</span><div>' +
            esc(taskName(r.task)) +
            ' <span class="muted">×' +
            r.count +
            "</span></div></div>"
        );
      });
    }
    if (!nested && src.needs.length) {
      parts.push("<h3>Где требуется</h3>");
      src.needs.forEach(function (n) {
        parts.push(
          '<div class="src-row"><span class="badge need">need</span><div>' +
            esc(taskName(n.task)) +
            " ×" +
            n.count +
            (n.fir ? " FIR" : "") +
            (n.optional ? " (opt)" : "") +
            "</div></div>"
        );
      });
    }
    if (!parts.length) return '<p class="empty">Нет крафта и квестовых наград для этого предмета.</p>';
    return parts.join("");
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Loading…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Tasks / crafts / items…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var tasksP = TarkovAPI.tasks ? TarkovAPI.tasks(mode) : TarkovAPI.getJson("/" + mode + "/tasks");
      var craftsP = TarkovAPI.crafts ? TarkovAPI.crafts(mode) : TarkovAPI.getJson("/" + mode + "/crafts");
      var itemsP = TarkovAPI.items(mode);
      var pack = await Promise.all([tasksP, craftsP, itemsP]);
      if (P) P.set(50);
      var tasksRaw = pack[0];
      var craftsRaw = pack[1];
      var itemsRaw = pack[2];
      if (tasksRaw && tasksRaw.tasks) tasksList = asArray(tasksRaw.tasks);
      else if (tasksRaw && tasksRaw.data && tasksRaw.data.tasks) tasksList = asArray(tasksRaw.data.tasks);
      else tasksList = asArray(tasksRaw);
      craftsList = asArray(craftsRaw && craftsRaw.data ? craftsRaw.data : craftsRaw);
      var items = asArray(itemsRaw && itemsRaw.data && itemsRaw.data.items ? itemsRaw.data.items : itemsRaw);
      itemsById = {};
      items.forEach(function (it) {
        if (it && it.id) itemsById[it.id] = it;
      });
      buildIndexes();
      if (P) P.set(95);
      document.getElementById("searchCard").hidden = false;
      setStatus(
        "Tasks: " + tasksList.length + " · crafts: " + craftsList.length + " · items: " + Object.keys(itemsById).length,
        true
      );
      if (P) P.done();
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
  document.getElementById("q").oninput = renderSuggest;
  document.getElementById("tabItem").onclick = function () {
    modeSearch = "item";
    document.getElementById("tabItem").classList.add("active");
    document.getElementById("tabQuest").classList.remove("active");
    document.getElementById("searchLabel").textContent = "Предмет";
    document.getElementById("results").innerHTML = "";
    document.getElementById("q").value = "";
  };
  document.getElementById("tabQuest").onclick = function () {
    modeSearch = "quest";
    document.getElementById("tabQuest").classList.add("active");
    document.getElementById("tabItem").classList.remove("active");
    document.getElementById("searchLabel").textContent = "Квест";
    document.getElementById("results").innerHTML = "";
    document.getElementById("q").value = "";
  };
})();
