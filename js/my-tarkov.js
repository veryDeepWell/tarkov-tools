/* My Tarkov — dashboard over TarkovProfile (1.1) */
(function () {
  "use strict";

  function esc(s) {
    if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function traderLabel(key) {
    try {
      if (window.TarkovDicts && TarkovDicts.trader) {
        var t = TarkovDicts.trader(key);
        if (t) return t.ru || t.name || key;
      }
    } catch (e) {}
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
          esc(m.name) + " · L" + (m.level || 1) + "</option>";
      }).join("");
    }

    document.getElementById("pmcName").value = p.name || "";
    document.getElementById("level").value = p.level || 1;
    document.getElementById("gameMode").value = p.gameMode || "pve";
    document.getElementById("prestigeLevel").value = (p.prestige && p.prestige.level) || 0;
    document.getElementById("hideoutNotes").value = (p.notes && p.notes.hideout) || "";

    document.getElementById("stats").innerHTML =
      '<div class="stat"><div class="v">' + esc(p.name || "ЧВК") + '</div><div class="l">имя</div></div>' +
      '<div class="stat"><div class="v">' + (p.level || 1) + '</div><div class="l">уровень</div></div>' +
      '<div class="stat"><div class="v">' + esc(p.gameMode || "pve") + '</div><div class="l">режим</div></div>' +
      '<div class="stat"><div class="v">' + ((p.prestige && p.prestige.level) || 0) + '</div><div class="l">престиж</div></div>';

    var tradersEl = document.getElementById("traders");
    tradersEl.innerHTML = TarkovProfile.TRADER_KEYS.map(function (k) {
      var ll = (p.traders && p.traders[k]) || 1;
      return '<label class="trader-row"><span>' + esc(traderLabel(k)) + '</span>' +
        '<select data-trader="' + esc(k) + '">' +
        [1, 2, 3, 4].map(function (n) {
          return '<option value="' + n + '"' + (n === ll ? " selected" : "") + ">УЛ " + n + "</option>";
        }).join("") +
        "</select></label>";
    }).join("");

    var completed = (p.quests && p.quests.completed) || [];
    var active = (p.quests && p.quests.active) || [];
    document.getElementById("questStats").innerHTML =
      '<div class="stat"><div class="v">' + completed.length + '</div><div class="l">сдано</div></div>' +
      '<div class="stat"><div class="v">' + active.length + '</div><div class="l">активных</div></div>';
    document.getElementById("questCompleted").value = completed.join("\n");
    document.getElementById("questActive").value = active.join("\n");

    var canDo = [];
    TarkovProfile.TRADER_KEYS.forEach(function (k) {
      var ll = (p.traders && p.traders[k]) || 1;
      if (ll < 4) canDo.push("Поднятие УЛ " + traderLabel(k) + " → " + (ll + 1));
    });
    if (p.level < 15) canDo.push("Дойти до 15 ур. (барахолка / ранние квесты)");
    if (p.level >= 15 && p.level < 20) canDo.push("Уровень 20+ для части контента");
    if (!completed.length) canDo.push("Отметить сданные квесты (id или имена, по одному в строке)");
    canDo.push("Сверить прогресс убежища в трекере");
    document.getElementById("canDo").innerHTML = canDo.map(function (x) {
      return "<li>" + esc(x) + "</li>";
    }).join("");

    var st = null;
    try { st = TarkovState.get(); } catch (e) {}
    var alerts = (st && st.alerts && st.alerts.prices) || [];
    document.getElementById("alertList").innerHTML = alerts.length ? alerts.map(function (a, i) {
      return '<div class="meta" style="padding:4px 0;display:flex;justify-content:space-between;gap:8px">' +
        "<span>" + esc(a.slug) + " " + (a.dir === "above" ? "≥" : "≤") + " " +
        Number(a.target).toLocaleString("ru-RU") + " ₽</span>" +
        '<button type="button" class="btn-ghost" data-i="' + i + '" style="min-height:28px!important;min-width:auto!important">×</button></div>';
    }).join("") : '<span class="meta">Нет алертов</span>';

    document.querySelectorAll("#alertList button").forEach(function (b) {
      b.onclick = function () {
        var st2 = TarkovState.get();
        var arr = ((st2.alerts && st2.alerts.prices) || []).slice();
        arr.splice(+b.dataset.i, 1);
        TarkovState.set({ alerts: { prices: arr } });
        paint();
      };
    });

    var ns = [];
    try { ns = TarkovState.notifications().slice(0, 10); } catch (e) {}
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
      traders: traderPatch,
      prestige: { level: Number(document.getElementById("prestigeLevel").value) || 0 },
      quests: { completed: lines("questCompleted"), active: lines("questActive") },
      notes: { hideout: document.getElementById("hideoutNotes").value || "" }
    });
    try {
      if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
    } catch (e) {}
    paint();
  }

  function bind() {
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
          alert("Не удалось импортировать: " + err.message);
        }
      };
      reader.readAsText(f);
      this.value = "";
    };

    document.getElementById("addAlert").onclick = function () {
      var slug = (document.getElementById("alertSlug").value || "").trim();
      var target = Number(document.getElementById("alertTarget").value);
      if (!slug || !target) return;
      var st = TarkovState.get();
      var arr = ((st.alerts && st.alerts.prices) || []).slice();
      arr.push({ slug: slug, target: target, dir: document.getElementById("alertDir").value });
      TarkovState.set({ alerts: { prices: arr } });
      document.getElementById("alertSlug").value = "";
      document.getElementById("alertTarget").value = "";
      paint();
    };
    document.getElementById("clearN").onclick = function () {
      TarkovState.clearNotifications();
      paint();
    };

    TarkovProfile.subscribe(function () { paint(); });
    paint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
