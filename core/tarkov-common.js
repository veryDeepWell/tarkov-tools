/** Tarkov Tools — shared runtime */
(function (global) {

  /** Resolve URL relative to site root (works from /tools/* and /). */
  function ttRoot() {
    try {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src || "";
        var m = src.match(/^(.*\/)(?:core\/)?tarkov-common\.js(?:\?.*)?$/);
        if (m) {
          var base = m[1];
          if (/\/core\/$/.test(base)) base = base.replace(/\/core\/$/, "/");
          return base;
        }
      }
    } catch (e) {}
    try {
      var path = location.pathname || "/";
      if (path.indexOf("/tools/") >= 0) return path.replace(/\/tools\/[^/]*$/, "/");
      if (path.indexOf("/hub/") >= 0) return path.replace(/\/hub\/[^/]*$/, "/");
      return path.replace(/\/[^/]*$/, "/");
    } catch (e2) { return "/"; }
  }
  function ttUrl(rel) {
    var root = ttRoot();
    rel = String(rel || "").replace(/^\//, "");
    return root + rel;
  }
  const KEYS = {
    theme: "tarkovTheme",
    lang: "tarkovLang",
    sound: "tarkovSound",
    volume: "tarkovSoundVolume",
    mode: "tarkovPreferredGameMode",
    accent: "tarkovAccent",
    tips: "tarkovTips",
    seen: "tarkovSettingsSeen"
  };
  const ACCENTS = {
    gold: "#c9a227", blue: "#5b9fd4", green: "#3dd68c", cyan: "#2ec4b6",
    purple: "#a78bfa", orange: "#e0a458", red: "#f07178", pink: "#e879a9", slate: "#94a3b8"
  };
  const I18N = {
    ru: { settings:"Настройки", theme:"Тема", themeDark:"Тёмная", themeLight:"Светлая", lang:"Язык", sound:"Звук", soundOn:"Вкл", soundOff:"Выкл", mode:"Режим по умолчанию", close:"Закрыть", export:"Экспорт", import:"Импорт", importOk:"Импорт выполнен", importFail:"Ошибка импорта", search:"Поиск по таблице…", welcomeTitle:"Настройки Tarkov Tools", welcomeBody:"Тема, язык, звук, режим и акцент.", apply:"Применить", hub:"Хаб", accent:"Акцент", tips:"Подсказки тулзов", tipsOn:"Вкл", tipsOff:"Выкл", volume:"Громкость", testSound:"Тест" },
    en: { settings:"Settings", theme:"Theme", themeDark:"Dark", themeLight:"Light", lang:"Language", sound:"Sound", soundOn:"On", soundOff:"Off", mode:"Default mode", close:"Close", export:"Export", import:"Import", importOk:"Import done", importFail:"Import failed", search:"Filter table…", welcomeTitle:"Tarkov Tools settings", welcomeBody:"Theme, language, sound, mode and accent.", apply:"Apply", hub:"Hub", accent:"Accent", tips:"Tool tips", tipsOn:"On", tipsOff:"Off", volume:"Volume", testSound:"Test" }
  };

  function get(k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; }
  }
  function set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  function lang() {
    var v = get(KEYS.lang, "ru") || "ru";
    var known = ["en", "ru", "uk", "de", "zh-CN"];
    if (known.indexOf(v) >= 0) return v;
    var low = String(v).toLowerCase();
    if (low === "zh" || low.indexOf("zh") === 0) return "zh-CN";
    if (known.indexOf(low) >= 0) return low;
    return "ru";
  }
  function t(key) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t("common." + key);
        if (v && v !== "common." + key && v !== key) return v;
        v = TarkovI18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    var pack = I18N[lang()] || I18N.ru;
    return pack[key] != null ? pack[key] : (I18N.en[key] || key);
  }

  function soundEnabled() { return get(KEYS.sound, "1") !== "0"; }
  function volume() {
    var v = parseFloat(get(KEYS.volume, get("tarkovSoundVol", "0.5")));
    return isNaN(v) ? 0.5 : Math.min(1, Math.max(0, v));
  }
  function preferredMode() { return get(KEYS.mode, "pve") || "pve"; }
  function tipsEnabled() { return get(KEYS.tips, get("tarkovToolTips", "1")) !== "0"; }

  function applyTheme() {
    var th = get(KEYS.theme, "dark") === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", th);
    var acc = get(KEYS.accent, "gold");
    if (ACCENTS[acc]) document.documentElement.style.setProperty("--accent", ACCENTS[acc]);
  }

  function beep(kind) {
    if (!soundEnabled()) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = beep._ctx || (beep._ctx = new Ctx());
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      var now = ctx.currentTime;
      var vol = volume() * 0.15;
      if (kind === "ok") { o.frequency.value = 880; g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12); o.start(now); o.stop(now + 0.12); }
      else if (kind === "restock") { o.frequency.value = 660; g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25); o.start(now); o.stop(now + 0.25); }
      else { o.frequency.value = 440; g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); o.start(now); o.stop(now + 0.08); }
    } catch (e) {}
  }

  function exportAll() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("tarkov") === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tarkov-tools-settings.json";
    a.click();
  }
  function importAll(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        Object.keys(data).forEach(function (k) {
          if (k.indexOf("tarkov") === 0) localStorage.setItem(k, data[k]);
        });
        applyTheme();
        if (TarkovTools._paintBar) TarkovTools._paintBar();
        alert(t("importOk"));
      } catch (e) { alert(t("importFail")); }
    };
    reader.readAsText(file);
  }

  function openSettings() {
    var bg = document.getElementById("tt-settings-bg");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "tt-settings-bg";
      bg.className = "modal-bg";
      bg.innerHTML = '<div class="modal" id="tt-settings-modal"></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) { if (e.target === bg) bg.classList.remove("show"); });
    }
    var modal = document.getElementById("tt-settings-modal");
    modal.innerHTML =
      "<h2>" + t("settings") + "</h2>" +
      '<div class="field"><label>' + t("theme") + '</label><select id="tt-set-theme"><option value="dark">' + t("themeDark") + '</option><option value="light">' + t("themeLight") + '</option></select></div>' +
      '<div class="field"><label>' + t("lang") + '</label><select id="tt-set-lang"><option value="ru">RU</option><option value="en">EN</option></select></div>' +
      '<div class="field"><label>' + t("sound") + '</label><select id="tt-set-sound"><option value="1">' + t("soundOn") + '</option><option value="0">' + t("soundOff") + '</option></select></div>' +
      '<div class="field"><label>' + t("volume") + '</label><input type="range" id="tt-set-vol" min="0" max="1" step="0.05"></div>' +
      '<div class="field"><label>' + t("mode") + '</label><select id="tt-set-mode"><option value="pve">pve</option><option value="regular">regular</option><option value="pvp-season">pvp-season</option></select></div>' +
      '<div class="field"><label>' + t("tips") + '</label><select id="tt-set-tips"><option value="1">' + t("tipsOn") + '</option><option value="0">' + t("tipsOff") + '</option></select></div>' +
      '<div class="row" style="margin-top:12px"><button type="button" class="btn" id="tt-set-apply">' + t("apply") + '</button>' +
      '<button type="button" class="btn-ghost" id="tt-set-export">' + t("export") + '</button>' +
      '<label class="btn-ghost" style="cursor:pointer">' + t("import") + '<input type="file" id="tt-set-import" accept="application/json" hidden></label>' +
      '<button type="button" class="btn-ghost" id="tt-set-close">' + t("close") + '</button></div>';
    document.getElementById("tt-set-theme").value = get(KEYS.theme, "dark");
    document.getElementById("tt-set-lang").value = lang() === "en" ? "en" : "ru";
    document.getElementById("tt-set-sound").value = soundEnabled() ? "1" : "0";
    document.getElementById("tt-set-vol").value = String(volume());
    document.getElementById("tt-set-mode").value = preferredMode();
    document.getElementById("tt-set-tips").value = tipsEnabled() ? "1" : "0";
    document.getElementById("tt-set-apply").onclick = function () {
      set(KEYS.theme, document.getElementById("tt-set-theme").value);
      set(KEYS.lang, document.getElementById("tt-set-lang").value);
      set(KEYS.sound, document.getElementById("tt-set-sound").value);
      set(KEYS.volume, document.getElementById("tt-set-vol").value);
      set(KEYS.mode, document.getElementById("tt-set-mode").value);
      set(KEYS.tips, document.getElementById("tt-set-tips").value);
      applyTheme();
      if (TarkovTools._paintBar) TarkovTools._paintBar();
      bg.classList.remove("show");
    };
    document.getElementById("tt-set-export").onclick = exportAll;
    document.getElementById("tt-set-import").onchange = function (e) { if (e.target.files[0]) importAll(e.target.files[0]); };
    document.getElementById("tt-set-close").onclick = function () { bg.classList.remove("show"); };
    bg.classList.add("show");
  }

  function isMiniFrame() {
    try { return !!(window.parent && window.parent !== window && window.parent.TarkovHubMini); } catch (e) { return false; }
  }

  function injectBar() {
    if (document.getElementById("tt-bar")) return;
    if (isMiniFrame()) return;
    var bar = document.createElement("div");
    bar.id = "tt-bar";
    bar.className = "tt-bar";
    bar.innerHTML = "<button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-settings\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-theme\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-lang\"></button><span class=\"spacer\"></span><a class=\"btn-ghost\" href=\"tarkovtool-hub.html\" id=\"tt-bar-hub\"></a>";
    document.body.insertBefore(bar, document.body.firstChild);
    function paint() {
      document.getElementById("tt-bar-settings").textContent = t("settings");
      document.getElementById("tt-bar-theme").textContent = get(KEYS.theme, "dark") === "light" ? t("themeLight") : t("themeDark");
      document.getElementById("tt-bar-lang").textContent = lang().toUpperCase();
      document.getElementById("tt-bar-hub").textContent = t("hub");
      var hub = document.getElementById("tt-bar-hub");
      if (hub) hub.href = ttUrl("tarkovtool-hub.html");
    }
    TarkovTools._paintBar = paint;
    paint();
    document.getElementById("tt-bar-settings").onclick = function () { TarkovTools.openSettings(); };
    document.getElementById("tt-bar-theme").onclick = function () {
      set(KEYS.theme, get(KEYS.theme, "dark") === "light" ? "dark" : "light");
      applyTheme(); paint();
    };
    document.getElementById("tt-bar-lang").onclick = function () {
      var order = ["ru", "en", "uk", "de", "zh-CN"];
      var cur = lang();
      var i = order.indexOf(cur);
      var next = order[(i + 1) % order.length];
      set(KEYS.lang, next);
      if (window.TarkovI18n && TarkovI18n.setLang) {
        TarkovI18n.setLang(next).then(function () {
          try { TarkovI18n.applyDom(document); } catch (e) {}
          paint();
          try { window.dispatchEvent(new CustomEvent("tt-lang-changed", { detail: { lang: next } })); } catch (e) {}
        }).catch(paint);
      } else paint();
    };
  }

  function wireGameModeSelects() {
    var def = preferredMode();
    document.querySelectorAll("select#gameMode, select[id*=gameMode], select[id*=GameMode]").forEach(function (sel) {
      if ([].some.call(sel.options, function (o) { return o.value === def; })) sel.value = def;
      sel.addEventListener("change", function () { set(KEYS.mode, sel.value); });
    });
  }

  function enhanceTable(table, filterInput) {
    if (!table || table._ttEnhanced) return;
    table._ttEnhanced = true;
    var sortState = { col: -1, dir: 0 };
    function rows() {
      return [].slice.call(table.tBodies[0] ? table.tBodies[0].rows : []);
    }
    function applyFilter() {
      var q = (filterInput && filterInput.value || "").toLowerCase().trim();
      rows().forEach(function (r) {
        r.style.display = !q || r.textContent.toLowerCase().indexOf(q) >= 0 ? "" : "none";
      });
    }
    if (filterInput) filterInput.addEventListener("input", applyFilter);
    new MutationObserver(function () { applyFilter(); }).observe(table.tBodies[0] || table, { childList: true, subtree: true });
    [].forEach.call(table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells : [], function (th, idx) {
      th.style.cursor = "pointer";
      th.addEventListener("click", function () {
        if (sortState.col === idx) sortState.dir = sortState.dir === 1 ? -1 : (sortState.dir === -1 ? 0 : 1);
        else { sortState.col = idx; sortState.dir = 1; }
        [].forEach.call(table.tHead.rows[0].cells, function (c) {
          c.classList.remove("sorted-asc", "sorted-desc");
          c.removeAttribute("aria-sort");
        });
        if (sortState.dir === 0) { applyFilter(); return; }
        th.classList.add(sortState.dir === 1 ? "sorted-asc" : "sorted-desc");
        th.setAttribute("aria-sort", sortState.dir === 1 ? "ascending" : "descending");
        var sorted = rows().slice().sort(function (a, b) {
          var av = (a.cells[idx] && a.cells[idx].textContent || "").trim();
          var bv = (b.cells[idx] && b.cells[idx].textContent || "").trim();
          var an = parseFloat(av.replace(/[^\d.-]/g, ""));
          var bn = parseFloat(bv.replace(/[^\d.-]/g, ""));
          var cmp = (!isNaN(an) && !isNaN(bn)) ? (an - bn) : av.localeCompare(bv, undefined, { numeric: true });
          return sortState.dir === 1 ? cmp : -cmp;
        });
        var body = table.tBodies[0];
        sorted.forEach(function (r) { body.appendChild(r); });
      });
    });
  }

  function hiddenTools() {
    try { return JSON.parse(get("tarkovHiddenTools", "[]")) || []; } catch (e) { return []; }
  }
  function setHiddenTools(arr) {
    set("tarkovHiddenTools", JSON.stringify(arr || []));
    try { window.dispatchEvent(new CustomEvent("tt-hidden-changed")); } catch (e) {}
  }

  global.TarkovTools = {
    KEYS: KEYS,
    ACCENTS: ACCENTS,
    get: get,
    set: set,
    lang: lang,
    t: t,
    soundEnabled: soundEnabled,
    volume: volume,
    preferredMode: preferredMode,
    tipsEnabled: tipsEnabled,
    applyTheme: applyTheme,
    beep: beep,
    exportAll: exportAll,
    importAll: importAll,
    openSettings: openSettings,
    enhanceTable: enhanceTable,
    hiddenTools: hiddenTools,
    setHiddenTools: setHiddenTools,
    ttRoot: ttRoot,
    ttUrl: ttUrl
  };

  applyTheme();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      injectBar();
      wireGameModeSelects();
    });
  } else {
    injectBar();
    wireGameModeSelects();
  }
})(window);
