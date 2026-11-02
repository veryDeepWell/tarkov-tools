/* My Tarkov — dashboard over TarkovProfile (1.1) */
(function () {
  "use strict";

  function esc(s) {
    if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var PROFILE_ICONS = ["util", "loadout", "flea", "hideout", "quests", "med", "other"];
  var contentRows = null, contentMode = "", contentVersion = 0;
  var unlockBaseline = Object.create(null), newUnlocks = Object.create(null);
  var SKILLS = { strength: "Сила", endurance: "Выносливость", metabolism: "Метаболизм", health: "Здоровье", vitality: "Жизнеспособность", stress: "Стрессоустойчивость", attention: "Внимательность", perception: "Восприятие", search: "Поиск", crafting: "Крафт", hidemgmt: "Управление убежищем" };
  async function loadContent() {
    var token = ++contentVersion;
    var status = document.getElementById("contentStatus");
    status.textContent = "Загрузка контента…";
    try {
      var loaded = await TarkovContent.load();
      if (!loaded || token !== contentVersion) return;
      contentMode = TarkovProfile.preferredGameMode();
      contentRows = TarkovContent.available();
      status.textContent = "Доступность по прогрессу. Наличие расходников и денег не учитывается. Следующий УЛ рассчитывается только при введённой репутации и обороте в валюте торговца.";
      paint();
    } catch (e) { status.textContent = "Не удалось загрузить контент: " + e.message; }
  }
  function iconUrl(id) {
    return "../assets/icons/" + id + ".svg";
  }

  function traderLabel(key) {
    try {
      if (window.TarkovDicts && TarkovDicts.trader) {
        var t = TarkovDicts.trader(key);
        if (t) return t.ru || t.name || key;
      }
    } catch (e) { try { console.debug && console.debug("[tt:my-tarkov]", e); } catch (_tt) { /* ignore */ } }
    var map = {
      prapor: "Прапор", therapist: "Терапевт", fence: "Скупщик", skier: "Лыжник",
      peacekeeper: "Миротворец", mechanic: "Механик", ragman: "Барахольщик",
      jaeger: "Егерь", lightkeeper: "Смотритель"
    };
    return map[key] || key;
  }

  function paint() {
    var p = TarkovProfile.getActive();
    var list = TarkovProfile.list();

    var sel = document.getElementById("profileSelect");
    if (sel) {
      sel.innerHTML = list.map(function (m) {
        return '<option value="' + esc(m.id) + '"' +
          (m.id === p.id ? " selected" : "") + ">" +
          esc(m.name) + " · L" + (m.level || 1) + (m.icon ? " · " + m.icon : "") + "</option>";
      }).join("");
    }

    document.getElementById("pmcName").value = p.name || "";
    document.getElementById("level").value = p.level || 1;
    document.getElementById("gameMode").value = p.gameMode || "pve";
    document.getElementById("prestigeLevel").value = (p.prestige && p.prestige.level) || 0;
    document.getElementById("hideoutNotes").value = (p.notes && p.notes.hideout) || "";
    var skillBox = document.getElementById("profileSkills");
    var skillNames = Object.assign({}, SKILLS);
    Object.keys(p.skills || {}).forEach(function (k) { if (!skillNames[k]) skillNames[k] = k; });
    skillBox.innerHTML = Object.keys(skillNames).map(function (key) {
      return '<label class="field">' + esc(skillNames[key]) + '<input type="number" min="0" max="51" step="0.01" data-skill="' + esc(key) + '" value="' + (Number(p.skills[key]) || 0) + '"></label>';
    }).join("");
    skillBox.querySelectorAll("[data-skill]").forEach(function (input) {
      input.addEventListener("change", function () {
        var patch = {}; patch[input.dataset.skill] = Math.max(0, Math.min(51, Number(input.value) || 0));
        TarkovProfile.update({ skills: patch });
      });
    });

    var ico = p.icon || "util";
    var iconHidden = document.getElementById("pmcIcon");
    if (iconHidden) iconHidden.value = ico;
    var grid = document.getElementById("iconGrid");
    if (grid) {
      grid.innerHTML = PROFILE_ICONS.map(function (id) {
        return '<button type="button" class="icon-pick' + (id === ico ? ' is-on' : '') +
          '" data-icon="' + esc(id) + '" title="' + esc(id) + '">' +
          '<img src="' + iconUrl(id) + '" alt="">' +
          '</button>';
      }).join("");
      grid.querySelectorAll(".icon-pick").forEach(function (btn) {
        btn.onclick = function () {
          var id = btn.getAttribute("data-icon");
          if (iconHidden) iconHidden.value = id;
          grid.querySelectorAll(".icon-pick").forEach(function (b) {
            b.classList.toggle("is-on", b.getAttribute("data-icon") === id);
          });
        };
      });
    }

    document.getElementById("stats").innerHTML =
      '<div class="stat"><div class="v"><img class="stat-ico" src="' + iconUrl(ico) + '" alt="">' + esc(p.name || "ЧВК") + '</div><div class="l">имя</div></div>' +
      '<div class="stat"><div class="v">' + (p.level || 1) + '</div><div class="l">уровень</div></div>' +
      '<div class="stat"><div class="v">' + esc(p.gameMode || "pve") + '</div><div class="l">режим</div></div>' +
      '<div class="stat"><div class="v">' + ((p.prestige && p.prestige.level) || 0) + '</div><div class="l">престиж</div></div>';

    var tradersEl = document.getElementById("traders");
    tradersEl.innerHTML = TarkovProfile.TRADER_KEYS.map(function (k) {
      var ll = (p.traders && p.traders[k]) || 1;
      return '<div class="trader-row"><span>' + esc(traderLabel(k)) + '</span>' +
        '<select data-trader="' + esc(k) + '">' +
        [1, 2, 3, 4].map(function (n) {
          return '<option value="' + n + '"' + (n === ll ? " selected" : "") + ">УЛ " + n + "</option>";
        }).join("") +
        "</select></div>";
    }).join("");
    try {
      if (TarkovProfile.bindTraderLL) TarkovProfile.bindTraderLL(tradersEl);
    } catch (eBind) { try { console.debug && console.debug("[tt:my-tarkov]", eBind); } catch (_tt) { /* ignore */ } }
    tradersEl.querySelectorAll("select[data-trader]").forEach(function (select) {
      var key = select.dataset.trader, stats = p.traderStats[key] || {};
      ["reputation", "spent"].forEach(function (field) {
        var label = document.createElement("label"), input = document.createElement("input");
        label.textContent = field === "reputation" ? "Репутация" : "Оборот (валюта торговца)";
        input.type = "number"; input.step = field === "reputation" ? "0.01" : "1";
        input.value = stats[field] == null ? "" : stats[field];
        input.addEventListener("change", function () {
          var patch = {}, updated = Object.assign({}, TarkovProfile.getActive().traderStats[key] || {});
          updated[field] = input.value === "" ? null : Number(input.value);
          if (updated[field] != null && !Number.isFinite(updated[field])) return;
          patch[key] = updated; TarkovProfile.update({ traderStats: patch });
        });
        label.appendChild(input); select.parentNode.appendChild(label);
      });
    });

    var completed = (p.quests && p.quests.completed) || [];
    var active = (p.quests && p.quests.active) || [];
    document.getElementById("questStats").innerHTML =
      '<div class="stat"><div class="v">' + completed.length + '</div><div class="l">сдано</div></div>' +
      '<div class="stat"><div class="v">' + active.length + '</div><div class="l">активных</div></div>';
    document.getElementById("questCompleted").value = completed.join("\n");
    document.getElementById("questActive").value = active.join("\n");

    var canDoItems = [];
    try {
      if (TarkovProfile.suggestActions) canDoItems = TarkovProfile.suggestActions();
    } catch (eSug) { canDoItems = []; }
    if (!canDoItems.length) {
      canDoItems = [{ kind: "hint", text: "Заполни уровень, УЛ и квесты — здесь появятся подсказки" }];
    }
    canDoItems.push({ kind: "hideout", text: "Сверить прогресс убежища в трекере" });
    document.getElementById("canDo").innerHTML = canDoItems.map(function (a) {
      var line = typeof a === "string" ? a : (a.text || "");
      var extra = "";
      if (a && a.kind === "quest" && a.quest) {
        extra = ' <a class="link" data-nav-type="quest" data-nav-id="' + esc(a.quest) + '" href="' + esc(TarkovNav.entityHref("quest", a.quest)) + '">→ квесты</a>';
      } else if (a && a.kind === "prestige") {
        extra = ' <a class="link" href="tarkovtool-prestige.html">→ престиж</a>';
      } else if (a && a.kind === "trader") {
        extra = ' <a class="link" href="tarkovtool-trader-flip.html">→ trader flip</a>';
      } else if (a && a.kind === "hideout") {
        extra = ' <a class="link" href="tarkovtool-hideout.html">→ убежище</a>';
      } else if (a && a.kind === "level") {
        extra = ' <a class="link" href="tarkovtool-quests.html">→ квесты</a>';
      }
      return "<li>" + esc(line) + extra + "</li>";
    }).join("") || "<li class=\"meta\">Пока пусто</li>";
    if (contentRows && contentMode === p.gameMode) {
      contentRows = TarkovContent.available();
      var keys = contentRows.map(function (row) { return row.key; });
      var before = unlockBaseline[p.id];
      var signature = JSON.stringify([p.level, p.gameMode, p.traders, p.traderStats, p.quests, p.skills, p.hideout]);
      if (before && before.signature !== signature) newUnlocks[p.id] = contentRows.filter(function (row) { return before.keys.indexOf(row.key) < 0; });
      unlockBaseline[p.id] = { keys: keys, signature: signature };
      function contentLi(row) {
        var entityId = row.type === "station" ? row.id.split(":")[0] : row.id;
        return '<li><a href="' + esc(TarkovNav.entityHref(row.type, entityId)) + '">' + esc(row.kind + " · " + row.text) + '</a></li>';
      }
      var query = document.getElementById("contentSearch").value.toLowerCase();
      var matching = contentRows.filter(function (row) { return (row.kind + " " + row.text + " " + row.id).toLowerCase().includes(query); });
      document.getElementById("contentCount").textContent = "Найдено: " + matching.length + ". Показано первых " + Math.min(100, matching.length) + ".";
      document.getElementById("canDo").innerHTML = matching.slice(0, 100).map(contentLi).join("") || '<li>Нет доступного контента по введённому прогрессу</li>';
      var discoveries = newUnlocks[p.id] || [];
      document.getElementById("newUnlocks").innerHTML = discoveries.slice(0, 100).map(contentLi).join("") || '<li class="meta">Новых открытий нет</li>';
      if (discoveries.length > 100) document.getElementById("newUnlocks").innerHTML += '<li>Всего новых открытий: ' + discoveries.length + '. Используй поиск доступного контента.</li>';
    } else {
      document.getElementById("newUnlocks").innerHTML = "";
    }
    document.querySelectorAll("#canDo [data-nav-type]").forEach(function (a) {
      a.addEventListener("click", function () {
        if (!window.TarkovNav) return;
        TarkovNav.set({
          type: a.getAttribute("data-nav-type"),
          id: a.getAttribute("data-nav-id") || "",
          name: a.getAttribute("data-nav-id") || "",
          from: "my-tarkov"
        });
      });
    });

    var st = null;
    try { st = TarkovState.get(); } catch (e) { try { console.debug && console.debug("[tt:my-tarkov]", e); } catch (_tt) { /* ignore */ } }
    var alerts = TarkovAlerts.read();
    document.getElementById("alertList").innerHTML = alerts.length ? alerts.map(function (a, i) {
      return '<div class="meta" style="padding:4px 0;display:flex;justify-content:space-between;gap:8px">' +
        "<span>" + esc(a.q || a.id) + " " + (a.op === ">=" ? "≥" : "≤") + " " +
        Number(a.threshold).toLocaleString("ru-RU") + " ₽</span>" +
        '<button type="button" class="btn-ghost" data-i="' + i + '" style="min-height:28px!important;min-width:auto!important">×</button></div>';
    }).join("") : '<span class="meta">Нет алертов</span>';

    document.querySelectorAll("#alertList button").forEach(function (b) {
      b.onclick = function () {
        TarkovAlerts.remove(alerts[+b.dataset.i].ruleId);
        paint();
      };
    });

    var ns = [];
    try { ns = TarkovState.notifications().slice(0, 10); } catch (e) { try { console.debug && console.debug("[tt:my-tarkov]", e); } catch (_tt) { /* ignore */ } }
    document.getElementById("notifs").innerHTML = ns.length ? ns.map(function (n) {
      return '<div style="padding:6px 0;border-bottom:1px solid var(--border)">' +
        "<strong>" + esc(n.title) + '</strong><div class="meta">' + esc(n.body) + "</div></div>";
    }).join("") : '<span class="meta">Пусто</span>';
  }

  function saveMain() {
    var lines = function (id) {
      return (document.getElementById(id).value || "").split(/\n+/).map(function (s) {
        return s.trim();
      }).filter(Boolean);
    };
    var traderPatch = {};
    document.querySelectorAll("#traders select[data-trader]").forEach(function (sel) {
      traderPatch[sel.getAttribute("data-trader")] = Number(sel.value) || 1;
    });
    TarkovProfile.update({
      name: (document.getElementById("pmcName").value || "ЧВК").trim(),
      level: Number(document.getElementById("level").value) || 1,
      gameMode: document.getElementById("gameMode").value,
      icon: (document.getElementById("pmcIcon") && document.getElementById("pmcIcon").value) || "util",
      traders: traderPatch,
      prestige: {
        level: Math.max(0, Number(document.getElementById("prestigeLevel").value) || 0),
        carried: (TarkovProfile.getActive().prestige && TarkovProfile.getActive().prestige.carried) || []
      },
      quests: {
        completed: lines("questCompleted"),
        active: lines("questActive"),
        itemDone: (TarkovProfile.getActive().quests && TarkovProfile.getActive().quests.itemDone) || {}
      },
      notes: { hideout: document.getElementById("hideoutNotes").value || "" }
    });
    try {
      if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
    } catch (e) { try { console.debug && console.debug("[tt:my-tarkov]", e); } catch (_tt) { /* ignore */ } }
    paint();
  }

  function bind() {
    window.addEventListener("tt-alerts-changed", paint);
    window.addEventListener("storage", function (event) {
      if (event.key === TarkovStorage.canonicalKey("tarkovPriceAlarmRules")) paint();
    });
    document.getElementById("loadContent").onclick = loadContent;
    document.getElementById("contentSearch").addEventListener("input", paint);
    document.getElementById("saveProfile").onclick = saveMain;
    document.getElementById("saveNotes").onclick = saveMain;

    document.getElementById("profileSelect").onchange = function () {
      TarkovProfile.setActive(this.value);
      paint();
    };
    document.getElementById("newProfile").onclick = function () {
      var name = prompt("Имя ЧВК", "ЧВК");
      if (name == null) return;
      TarkovProfile.create({ name: name.trim() || "ЧВК", activate: true });
      paint();
    };
    document.getElementById("deleteProfile").onclick = function () {
      var p = TarkovProfile.getActive();
      if (!confirm("Удалить профиль «" + p.name + "»?")) return;
      TarkovProfile.remove(p.id);
      paint();
    };
    document.getElementById("exportAllProfiles").onclick = function () {
      var data = TarkovProfile.exportAllProfiles();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pmc-profiles-all.json";
      a.click();
    };
    document.getElementById("exportProfile").onclick = function () {
      var data = TarkovProfile.exportProfile();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pmc-profile-" + (data.profile.name || "pmc").replace(/\s+/g, "_") + ".json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    };
    document.getElementById("importProfile").onclick = function () {
      document.getElementById("importFile").click();
    };
    document.getElementById("importFile").onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          if (parsed && parsed.profiles) TarkovProfile.importAllProfiles(parsed, { activate: true });
          else TarkovProfile.importProfile(parsed, { activate: true });
          paint();
        } catch (err) {
          (window.TarkovUI && TarkovUI.softAlert ? TarkovUI.softAlert.bind(TarkovUI) : function(m){ var el=document.getElementById("status"); if(el){el.textContent=m;el.className="status err";}})("Не удалось импортировать: " + err.message, { tone: "err" });
        }
      };
      reader.readAsText(f);
      this.value = "";
    };

    document.getElementById("addAlert").onclick = function () {
      var slug = (document.getElementById("alertSlug").value || "").trim();
      var target = Number(document.getElementById("alertTarget").value);
      if (!slug || !target) return;
      TarkovAlerts.add({ q: slug, id: "", threshold: target, metric: "avg", op: document.getElementById("alertDir").value === "above" ? ">=" : "<=" });
      document.getElementById("alertSlug").value = "";
      document.getElementById("alertTarget").value = "";
      paint();
    };
    document.getElementById("clearN").onclick = function () {
      TarkovState.clearNotifications();
      paint();
    };

  window.render = paint;
  window.paint = paint;
  if (TarkovProfile.bindRefresh) {
      TarkovProfile.bindRefresh(function () {
        paint();
        if (contentRows && contentMode !== TarkovProfile.preferredGameMode()) loadContent();
      });
  }
    paint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
