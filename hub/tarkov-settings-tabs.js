/*! Settings — real tabs: General / Language / Sound / Appearance / Hidden */
(function () {
  "use strict";
  if (!window.TarkovTools || !TarkovTools.openSettings) return;

  function get(k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; }
  }
  function set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  function catalog() {
    return window.TarkovHubCATALOG || window.TarkovHubCatalog || [];
  }

  function hiddenTools() {
    if (TarkovTools.hiddenTools) return TarkovTools.hiddenTools();
    try { return JSON.parse(get("tarkovHiddenTools", "[]")) || []; } catch (e) { return []; }
  }
  function setHidden(arr) {
    if (TarkovTools.setHiddenTools) TarkovTools.setHiddenTools(arr);
    else set("tarkovHiddenTools", JSON.stringify(arr || []));
  }

  function t(key, fallback) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback != null ? fallback : key;
  }

  function catTitle(id) {
    try {
      if (window.TarkovI18n && TarkovI18n.catTitle) return TarkovI18n.catTitle(id);
    } catch (e) {}
    var map = {
      flea: "Барахолка", loadout: "Лоадаут", hideout: "Убежка",
      quests: "Квесты", med: "Мед / еда", util: "Утилиты", other: "Прочее"
    };
    return map[id] || id;
  }

  function ensureStyles() {
    if (document.getElementById("tt-set-tab-css")) return;
    var s = document.createElement("style");
    s.id = "tt-set-tab-css";
    s.textContent =
      ".tt-set-tabs{display:flex;flex-wrap:wrap;gap:0;border-bottom:1px solid var(--border);margin:0 0 14px;}" +
      ".tt-set-tab{appearance:none;border:0!important;background:transparent!important;color:var(--muted)!important;" +
      "padding:10px 14px!important;min-width:auto!important;min-height:auto!important;border-radius:0!important;" +
      "border-bottom:2px solid transparent!important;cursor:pointer;font-size:.9rem;font-weight:600;}" +
      ".tt-set-tab:hover{color:var(--text)!important;}" +
      ".tt-set-tab.on{color:var(--accent)!important;border-bottom-color:var(--accent)!important;}" +
      ".tt-set-panel{display:none;}" +
      ".tt-set-panel.on{display:block;}" +
      ".tt-lang-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;" +
      "border:1px solid var(--border);border-radius:10px;margin:6px 0;cursor:pointer;background:var(--input-bg);}" +
      ".tt-lang-row:hover{border-color:var(--accent);}" +
      ".tt-lang-row.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);}" +
      ".tt-lang-row .pct{font-variant-numeric:tabular-nums;color:var(--muted);font-size:.85rem;}" +
      ".tt-lang-row .nm{font-weight:600;}" +
      ".tt-lang-row .sub{font-size:.78rem;color:var(--muted);}";
    document.head.appendChild(s);
  }

  function buildLangPanel() {
    var cur = get("tarkovLang", "ru");
    var html = '<p class="meta" style="margin:0 0 10px">' +
      t("common.langHint", "Пропущенные ключи подставляются из English. Готовность — относительно EN.") +
      "</p>";
    var list = [];
    try {
      if (window.TarkovI18n && TarkovI18n.listLocales) list = TarkovI18n.listLocales() || [];
    } catch (e) {}
    if (!list.length) {
      list = [
        { code: "ru", nativeName: "Русский", name: "Russian", pct: 100 },
        { code: "en", nativeName: "English", name: "English", pct: 100 },
        { code: "uk", nativeName: "Українська", name: "Ukrainian", pct: 0 },
        { code: "de", nativeName: "Deutsch", name: "German", pct: 0 },
        { code: "zh-CN", nativeName: "简体中文", name: "Chinese", pct: 0 }
      ];
    }
    list.forEach(function (loc) {
      var on = loc.code === cur ? " on" : "";
      html += '<div class="tt-lang-row' + on + '" data-lang="' + loc.code + '">' +
        '<div><div class="nm">' + (loc.nativeName || loc.name || loc.code) + "</div>" +
        '<div class="sub">' + (loc.name || "") + " · " + loc.code + "</div></div>" +
        '<div class="pct">' + (loc.pct != null ? loc.pct + "%" : "") + "</div></div>";
    });
    return html;
  }

  function buildHiddenPanel() {
    var cat = catalog();
    var byCat = {};
    cat.forEach(function (tool) {
      var c = tool.cat || "other";
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(tool);
    });
    var hidden = hiddenTools();
    var html = '<p class="meta" style="margin:0 0 10px">' +
      t("common.hiddenHint", "Выключенные не появляются в хабе.") + "</p>";
    Object.keys(byCat).forEach(function (c) {
      var tools = byCat[c];
      var allH = tools.every(function (x) { return hidden.indexOf(x.file) >= 0; });
      html += '<div style="margin:12px 0 6px;display:flex;align-items:center;gap:8px">' +
        "<strong style=\"flex:1\">" + catTitle(c) + "</strong>" +
        '<button type="button" class="btn-ghost tt-hide-cat" data-cat="' + c +
        '" data-hide="' + (allH ? "0" : "1") +
        '" style="min-width:auto;min-height:28px;padding:0 10px;font-size:.78rem">' +
        (allH ? t("common.showAllCat", "Показать категорию") : t("common.hideAllCat", "Скрыть категорию")) +
        "</button></div>";
      tools.forEach(function (tool) {
        var on = hidden.indexOf(tool.file) < 0;
        html += '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:.9rem">' +
          '<input type="checkbox" class="tt-hide-tool" data-file="' + tool.file + '"' +
          (on ? " checked" : "") + "> " + (tool.title || tool.file) + "</label>";
      });
    });
    if (!cat.length) html += '<p class="meta">Каталог ещё не загружен.</p>';
    return html;
  }

  TarkovTools.openSettings = function () {
    ensureStyles();

    var bg = document.getElementById("tt-settings-bg");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "tt-settings-bg";
      bg.className = "modal-bg";
      bg.innerHTML = '<div class="modal" id="tt-settings-modal"></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) {
        if (e.target === bg) bg.classList.remove("show");
      });
    }
    var modal = document.getElementById("tt-settings-modal");
    modal.style.maxWidth = "580px";

    modal.innerHTML =
      '<h2 style="margin:0 0 12px" data-i18n="common.settings">' + t("common.settings", "Настройки") + "</h2>" +
      '<div class="tt-set-tabs" id="tt-set-tabs">' +
      '<button type="button" class="tt-set-tab on" data-tab="general">' + t("common.tabGeneral", "Общее") + "</button>" +
      '<button type="button" class="tt-set-tab" data-tab="lang">' + t("common.tabLang", "Язык") + "</button>" +
      '<button type="button" class="tt-set-tab" data-tab="sound">' + t("common.tabSound", "Звук") + "</button>" +
      '<button type="button" class="tt-set-tab" data-tab="look">' + t("common.tabLook", "Внешний вид") + "</button>" +
      '<button type="button" class="tt-set-tab" data-tab="hidden">' + t("common.tabHidden", "Скрытые") + "</button>" +
      "</div>" +

      '<div class="tt-set-panel on" data-panel="general">' +
      '<div class="field" style="margin:10px 0"><label>' + t("common.mode", "Режим") + "</label>" +
      '<select id="tt-set-mode"><option value="pve">PVE</option><option value="regular">PVP</option></select></div>' +
      '<div class="field" style="margin:10px 0"><label>' + t("common.tips", "Подсказки") + "</label>" +
      '<select id="tt-set-tips"><option value="1">' + t("common.tipsOn", "Вкл") +
      '</option><option value="0">' + t("common.tipsOff", "Выкл") + "</option></select></div>" +
      '<div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn-ghost" id="tt-set-export">' + t("common.export", "Экспорт") + "</button>" +
      '<label class="btn-ghost" style="cursor:pointer">' + t("common.import", "Импорт") +
      '<input type="file" id="tt-set-import" accept="application/json" style="display:none"></label></div></div>' +

      '<div class="tt-set-panel" data-panel="lang">' + buildLangPanel() + "</div>" +

      '<div class="tt-set-panel" data-panel="sound">' +
      '<div class="field" style="margin:10px 0"><label>' + t("common.sound", "Звук") + "</label>" +
      '<select id="tt-set-sound"><option value="1">' + t("common.soundOn", "Вкл") +
      '</option><option value="0">' + t("common.soundOff", "Выкл") + "</option></select></div>" +
      '<div class="field" style="margin:10px 0"><label>' + t("common.volume", "Громкость") +
      '</label><input type="range" id="tt-set-vol" min="0" max="1" step="0.05" style="width:100%"></div>' +
      '<button type="button" class="btn-ghost" id="tt-set-testsound">' + t("common.testSound", "Тест") +
      "</button></div>" +

      '<div class="tt-set-panel" data-panel="look">' +
      '<div class="field" style="margin:10px 0"><label>' + t("common.theme", "Тема") + "</label>" +
      '<select id="tt-set-theme"><option value="dark">' + t("common.themeDark", "Тёмная") +
      '</option><option value="light">' + t("common.themeLight", "Светлая") + "</option></select></div>" +
      '<div class="field" style="margin:10px 0"><label>' + t("common.accent", "Акцент") +
      '</label><div class="tt-accent-row" id="tt-accent-row"></div></div></div>' +

      '<div class="tt-set-panel" data-panel="hidden">' + buildHiddenPanel() + "</div>" +

      '<div class="row" style="margin-top:16px;gap:8px">' +
      '<button type="button" class="btn" id="tt-set-apply">' + t("common.apply", "Применить") + "</button>" +
      '<button type="button" class="btn-ghost" id="tt-set-close">' + t("common.close", "Закрыть") +
      "</button></div>";

    function showTab(id) {
      modal.querySelectorAll(".tt-set-panel").forEach(function (p) {
        p.classList.toggle("on", p.getAttribute("data-panel") === id);
      });
      modal.querySelectorAll(".tt-set-tab").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-tab") === id);
      });
    }
    modal.querySelectorAll(".tt-set-tab").forEach(function (b) {
      b.onclick = function () { showTab(b.getAttribute("data-tab")); };
    });

    try {
      document.getElementById("tt-set-mode").value = get("tarkovPreferredGameMode", "pve");
      document.getElementById("tt-set-tips").value = get("tarkovTips", get("tarkovToolTips", "1"));
      document.getElementById("tt-set-sound").value = get("tarkovSound", "1") === "0" ? "0" : "1";
      document.getElementById("tt-set-vol").value = String(
        Math.min(1, Math.max(0, parseFloat(get("tarkovSoundVol", get("tarkovSoundVolume", "0.5"))) || 0.5))
      );
      document.getElementById("tt-set-theme").value = get("tarkovTheme", "dark") === "light" ? "light" : "dark";
    } catch (e) {}

    var ACCENTS = {
      gold: "#c9a227", blue: "#5b9fd4", green: "#3dd68c", cyan: "#2ec4b6",
      purple: "#a78bfa", orange: "#e0a458", red: "#f07178", pink: "#e879a9", slate: "#94a3b8"
    };
    var row = document.getElementById("tt-accent-row");
    var curAcc = get("tarkovAccent", "gold");
    if (row) {
      row.innerHTML = Object.keys(ACCENTS).map(function (k) {
        return '<button type="button" class="tt-accent-swatch' + (k === curAcc ? " on" : "") +
          '" data-accent="' + k + '" style="background:' + ACCENTS[k] + '" title="' + k + '"></button>';
      }).join("");
      row.querySelectorAll(".tt-accent-swatch").forEach(function (b) {
        b.onclick = function () {
          row.querySelectorAll(".tt-accent-swatch").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          set("tarkovAccent", b.getAttribute("data-accent"));
          document.documentElement.style.setProperty("--accent", ACCENTS[b.getAttribute("data-accent")]);
        };
      });
    }

    modal.querySelectorAll(".tt-lang-row").forEach(function (rowEl) {
      rowEl.onclick = function () {
        modal.querySelectorAll(".tt-lang-row").forEach(function (x) { x.classList.remove("on"); });
        rowEl.classList.add("on");
        set("tarkovLang", rowEl.getAttribute("data-lang"));
      };
    });

    modal.querySelectorAll(".tt-hide-tool").forEach(function (cb) {
      cb.onchange = function () {
        var list = hiddenTools();
        var f = cb.getAttribute("data-file");
        if (cb.checked) list = list.filter(function (x) { return x !== f; });
        else if (list.indexOf(f) < 0) list.push(f);
        setHidden(list);
        try { window.dispatchEvent(new CustomEvent("tt-hidden-changed")); } catch (e) {}
      };
    });
    modal.querySelectorAll(".tt-hide-cat").forEach(function (btn) {
      btn.onclick = function () {
        var cat = btn.getAttribute("data-cat");
        var hide = btn.getAttribute("data-hide") === "1";
        var list = hiddenTools();
        var files = catalog().filter(function (x) { return (x.cat || "other") === cat; }).map(function (x) { return x.file; });
        if (hide) files.forEach(function (f) { if (list.indexOf(f) < 0) list.push(f); });
        else list = list.filter(function (f) { return files.indexOf(f) < 0; });
        setHidden(list);
        try { window.dispatchEvent(new CustomEvent("tt-hidden-changed")); } catch (e) {}
        TarkovTools.openSettings();
        showTab("hidden");
      };
    });

    document.getElementById("tt-set-testsound").onclick = function () {
      set("tarkovSound", "1");
      if (TarkovTools.beep) TarkovTools.beep("restock");
    };

    document.getElementById("tt-set-apply").onclick = function () {
      var lang = get("tarkovLang", "ru");
      var picked = modal.querySelector(".tt-lang-row.on");
      if (picked) lang = picked.getAttribute("data-lang") || lang;
      set("tarkovLang", lang);
      set("tarkovPreferredGameMode", document.getElementById("tt-set-mode").value);
      set("tarkovToolTips", document.getElementById("tt-set-tips").value);
      set("tarkovTips", document.getElementById("tt-set-tips").value);
      set("tarkovSound", document.getElementById("tt-set-sound").value);
      set("tarkovSoundVol", document.getElementById("tt-set-vol").value);
      set("tarkovSoundVolume", document.getElementById("tt-set-vol").value);
      set("tarkovTheme", document.getElementById("tt-set-theme").value);
      var acc = modal.querySelector(".tt-accent-swatch.on");
      if (acc) set("tarkovAccent", acc.getAttribute("data-accent"));
      set("tarkovSettingsSeen", "1");

      if (TarkovTools.applyTheme) TarkovTools.applyTheme();
      else document.documentElement.setAttribute(
        "data-theme",
        document.getElementById("tt-set-theme").value === "light" ? "light" : "dark"
      );

      function finish() {
        if (TarkovTools._paintBar) TarkovTools._paintBar();
        if (TarkovTools.beep) TarkovTools.beep("ok");
        bg.classList.remove("show");
        try { window.dispatchEvent(new CustomEvent("tt-settings-applied")); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent("tt-lang-changed", { detail: { lang: lang } })); } catch (e) {}
      }

      if (window.TarkovI18n && TarkovI18n.setLang) {
        TarkovI18n.setLang(lang).then(function () {
          try { TarkovI18n.applyDom(document); } catch (e) {}
          finish();
        }).catch(finish);
      } else {
        finish();
      }
    };

    document.getElementById("tt-set-close").onclick = function () { bg.classList.remove("show"); };
    var exp = document.getElementById("tt-set-export");
    if (exp && TarkovTools.exportAll) exp.onclick = function () { TarkovTools.exportAll(); };
    var imp = document.getElementById("tt-set-import");
    if (imp && TarkovTools.importAll) {
      imp.onchange = function (e) {
        if (e.target.files[0]) TarkovTools.importAll(e.target.files[0]);
      };
    }

    bg.classList.add("show");
    showTab("general");
  };
})();
