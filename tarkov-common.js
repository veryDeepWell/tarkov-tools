/** Tarkov Tools — shared runtime */
(function (global) {
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
  function get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lang() { return get(KEYS.lang, "ru") === "en" ? "en" : "ru"; }
  function t(key) { const L = I18N[lang()] || I18N.ru; return L[key] || key; }
  function preferredMode() { return get(KEYS.mode, "pve"); }
  function soundEnabled() { return get(KEYS.sound, "1") !== "0"; }
  function soundVolume() { return Math.min(1, Math.max(0, Number(get(KEYS.volume, "0.5")) || 0.5)); }
  function tipsEnabled() { return get(KEYS.tips, "1") !== "0"; }
  function applyAccent() {
    const a = get(KEYS.accent, "gold");
    const c = ACCENTS[a] || ACCENTS.gold;
    document.documentElement.style.setProperty("--accent", c);
  }
  function applyTheme() {
    const th = get(KEYS.theme, "dark");
    document.documentElement.setAttribute("data-theme", th === "light" ? "light" : "dark");
    applyAccent();
  }
  function beep(kind) {
    if (!soundEnabled()) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = beep._ctx || (beep._ctx = new Ctx());
      if (ctx.state === "suspended") ctx.resume();
      const vol = soundVolume();
      const map = { ok: [660, 880], warn: [440, 330], restock: [880, 880, 1175], price: [523, 659, 784] };
      const notes = map[kind] || map.ok;
      const t0 = ctx.currentTime + 0.02;
      notes.forEach(function (freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        const start = t0 + i * 0.12;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12 * vol, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(start); osc.stop(start + 0.12);
      });
    } catch (e) {}
  }
  function exportAll() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("tarkov") === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tarkov-tools-backup.json";
    a.click();
  }
  function importAll(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        Object.keys(data).forEach(function (k) { localStorage.setItem(k, data[k]); });
        alert(t("importOk"));
        location.reload();
      } catch (e) { alert(t("importFail")); }
    };
    reader.readAsText(file);
  }
  function openSettings() {
    let bg = document.getElementById("tt-settings-bg");
    if (!bg) {
      bg = document.createElement("div"); bg.id = "tt-settings-bg"; bg.className = "modal-bg";
      bg.innerHTML = '<div class="modal" id="tt-settings-modal"></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) { if (e.target === bg) bg.classList.remove("show"); });
    }
    const modal = document.getElementById("tt-settings-modal");
    const accent = get(KEYS.accent, "gold");
    const swatches = Object.keys(ACCENTS).map(function (k) {
      return '<button type="button" class="tt-accent-swatch' + (k === accent ? " on" : "") + '" data-accent="' + k + '" title="' + k + '"></button>';
    }).join("");
    modal.innerHTML = '<h2>' + t("settings") + '</h2>' +
      '<p class="meta">' + t("welcomeBody") + '</p>' +
      '<div class="field"><label>' + t("theme") + '</label><select id="tt-set-theme"><option value="dark">' + t("themeDark") + '</option><option value="light">' + t("themeLight") + '</option></select></div>' +
      '<div class="field"><label>' + t("lang") + '</label><select id="tt-set-lang"><option value="ru">RU</option><option value="en">EN</option></select></div>' +
      '<div class="field"><label>' + t("sound") + '</label><select id="tt-set-sound"><option value="1">' + t("soundOn") + '</option><option value="0">' + t("soundOff") + '</option></select></div>' +
      '<div class="field"><label>' + t("volume") + '</label><input type="range" id="tt-set-vol" min="0" max="1" step="0.05" value="' + soundVolume() + '"></div>' +
      '<div class="field"><label>' + t("mode") + '</label><select id="tt-set-mode"><option value="pve">pve</option><option value="regular">regular</option><option value="pvp-season">pvp-season</option></select></div>' +
      '<div class="field"><label>' + t("accent") + '</label><div class="tt-accent-row">' + swatches + '</div></div>' +
      '<div class="field"><label>' + t("tips") + '</label><select id="tt-set-tips"><option value="1">' + t("tipsOn") + '</option><option value="0">' + t("tipsOff") + '</option></select></div>' +
      '<div class="row" style="margin-top:12px"><button type="button" class="btn" id="tt-set-apply">' + t("apply") + '</button>' +
      '<button type="button" class="btn-ghost" id="tt-set-export">' + t("export") + '</button>' +
      '<label class="btn-ghost" style="cursor:pointer">' + t("import") + '<input type="file" id="tt-set-import" accept="application/json" hidden></label>' +
      '<button type="button" class="btn-ghost" id="tt-set-close">' + t("close") + '</button></div>';
    document.getElementById("tt-set-theme").value = get(KEYS.theme, "dark");
    document.getElementById("tt-set-lang").value = lang();
    document.getElementById("tt-set-sound").value = soundEnabled() ? "1" : "0";
    document.getElementById("tt-set-mode").value = preferredMode();
    document.getElementById("tt-set-tips").value = tipsEnabled() ? "1" : "0";
    modal.querySelectorAll(".tt-accent-swatch").forEach(function (btn) {
      btn.onclick = function () {
        modal.querySelectorAll(".tt-accent-swatch").forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
        set(KEYS.accent, btn.getAttribute("data-accent"));
        applyAccent();
      };
    });
    document.getElementById("tt-set-apply").onclick = function () {
      set(KEYS.theme, document.getElementById("tt-set-theme").value);
      set(KEYS.lang, document.getElementById("tt-set-lang").value);
      set(KEYS.sound, document.getElementById("tt-set-sound").value);
      set(KEYS.volume, document.getElementById("tt-set-vol").value);
      set(KEYS.mode, document.getElementById("tt-set-mode").value);
      set(KEYS.tips, document.getElementById("tt-set-tips").value);
      set(KEYS.seen, "1");
      applyTheme();
      if (global.TarkovTools && TarkovTools._paintBar) TarkovTools._paintBar();
      bg.classList.remove("show");
    };
    document.getElementById("tt-set-export").onclick = exportAll;
    document.getElementById("tt-set-import").onchange = function (e) { if (e.target.files[0]) importAll(e.target.files[0]); };
    document.getElementById("tt-set-close").onclick = function () { bg.classList.remove("show"); };
    bg.classList.add("show");
  }
  function isMiniFrame() {
    try {
      if (window.parent && window.parent !== window && window.parent.TarkovHubMini === true) return true;
    } catch (e) {}
    return false;
  }
  function injectBar() {
    if (isMiniFrame()) {
      try {
        document.documentElement.classList.add("tt-mini-frame");
        document.body.classList.add("tt-mini-frame");
      } catch (e) {}
      return;
    }
    if (document.getElementById("tt-global-bar")) return;
    const bar = document.createElement("div"); bar.id = "tt-global-bar"; bar.className = "tt-bar";
    bar.innerHTML = "<button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-settings\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-theme\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-lang\"></button><span class=\"spacer\"></span><a class=\"btn-ghost\" href=\"tarkovtool-hub.html\" id=\"tt-bar-hub\"></a>";
    document.body.insertBefore(bar, document.body.firstChild);
    function paint() {
      document.getElementById("tt-bar-settings").textContent = t("settings");
      document.getElementById("tt-bar-theme").textContent = get(KEYS.theme, "dark") === "light" ? t("themeLight") : t("themeDark");
      document.getElementById("tt-bar-lang").textContent = lang().toUpperCase();
      document.getElementById("tt-bar-hub").textContent = t("hub");
    }
    paint();
    global.TarkovTools._paintBar = paint;
    document.getElementById("tt-bar-settings").onclick = openSettings;
    document.getElementById("tt-bar-theme").onclick = function () {
      set(KEYS.theme, get(KEYS.theme, "dark") === "light" ? "dark" : "light");
      applyTheme(); paint();
    };
    document.getElementById("tt-bar-lang").onclick = function () {
      set(KEYS.lang, lang() === "ru" ? "en" : "ru"); paint();
    };
  }
  function wireGameModeSelects() {
    const def = preferredMode();
    document.querySelectorAll("select#gameMode, select[id*=gameMode], select[id*=GameMode]").forEach(function (sel) {
      if ([].some.call(sel.options, function (o) { return o.value === def; })) sel.value = def;
      sel.addEventListener("change", function () { set(KEYS.mode, sel.value); });
    });
  }
  function enhanceTable(table, filterInput) {
    if (!table || table.dataset.ttEnhanced === "1") return;
    const tbody = table.tBodies[0]; if (!tbody) return;
    table.dataset.ttEnhanced = "1";
    let sortCol = -1, sortDir = 0;
    let originalOrder = [].slice.call(tbody.rows);
    try {
      new MutationObserver(function () {
        if (sortDir === 0) originalOrder = [].slice.call(tbody.rows);
      }).observe(tbody, { childList: true });
    } catch (e) {}
    [].forEach.call(table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells : [], function (th, idx) {
      th.style.cursor = "pointer";
      th.addEventListener("click", function () {
        if (sortCol !== idx) { sortCol = idx; sortDir = -1; }
        else if (sortDir === -1) sortDir = 1;
        else if (sortDir === 1) { sortDir = 0; sortCol = -1; }
        else sortDir = -1;
        [].forEach.call(table.tHead.rows[0].cells, function (h) { h.classList.remove("sorted-asc", "sorted-desc"); });
        if (sortDir !== 0 && sortCol >= 0) {
          var thEl = table.tHead.rows[0].cells[sortCol];
          if (thEl) thEl.classList.add(sortDir > 0 ? "sorted-asc" : "sorted-desc");
        }
        var rows;
        if (sortDir === 0) {
          rows = originalOrder.slice();
          [].forEach.call(tbody.rows, function (r) { if (rows.indexOf(r) < 0) rows.push(r); });
        } else {
          rows = [].slice.call(tbody.rows);
          rows.sort(function (a, b) {
            const ta = (a.cells[idx] && a.cells[idx].textContent || "").trim();
            const tb = (b.cells[idx] && b.cells[idx].textContent || "").trim();
            const na = parseFloat(ta.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
            const nb = parseFloat(tb.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(na) && !Number.isNaN(nb) && /\d/.test(ta) && /\d/.test(tb)) return (na - nb) * sortDir;
            return ta.localeCompare(tb, undefined, { sensitivity: "base", numeric: true }) * sortDir;
          });
        }
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
    if (filterInput) {
      filterInput.addEventListener("input", function () {
        const q = filterInput.value.toLowerCase().trim();
        [].forEach.call(tbody.rows, function (r) { r.style.display = !q || r.textContent.toLowerCase().includes(q) ? "" : "none"; });
      });
    }
  }

  function enhanceAllTables() {
    document.querySelectorAll("table").forEach(function (table) {
      let tools = table.previousElementSibling;
      if (!tools || !tools.classList || !tools.classList.contains("tt-table-tools")) {
        tools = document.createElement("div"); tools.className = "tt-table-tools";
        const inp = document.createElement("input"); inp.type = "search"; inp.placeholder = t("search");
        tools.appendChild(inp);
        table.parentNode.insertBefore(tools, table);
        enhanceTable(table, inp);
      } else {
        enhanceTable(table, tools.querySelector("input"));
      }
    });
  }
  function observeTables() {
    const mo = new MutationObserver(function () { enhanceAllTables(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  function init() {
    try { if (!document.querySelector("link[data-tt-sort]")) { var l=document.createElement("link"); l.rel="stylesheet"; l.href="tarkov-sort.css"; l.dataset.ttSort="1"; document.head.appendChild(l); } } catch(e) {}
    applyTheme(); injectBar(); wireGameModeSelects(); enhanceAllTables(); observeTables();
    if (!isMiniFrame() && get(KEYS.seen, "") !== "1") setTimeout(openSettings, 250);
  }
  global.TarkovTools = { t: t, lang: lang, beep: beep, exportAll: exportAll, importAll: importAll, openSettings: openSettings, preferredMode: preferredMode, soundEnabled: soundEnabled, soundVolume: soundVolume, tipsEnabled: tipsEnabled, enhanceTable: enhanceTable, applyTheme: applyTheme, KEYS: KEYS, _paintBar: null };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  (function loadShared() {
    if (!document.querySelector("script[data-tt-names]")) {
      var n = document.createElement("script"); n.src = "tarkov-names.js"; n.dataset.ttNames = "1"; n.async = false; document.head.appendChild(n);
    }
    if (!document.querySelector("script[data-tt-mini]")) {
      var s = document.createElement("script"); s.src = "tarkov-mini.js"; s.dataset.ttMini = "1"; s.async = false; document.head.appendChild(s);
    }
    if (!document.querySelector("script[data-tt-ui]")) {
      var u = document.createElement("script"); u.src = "tarkov-ui.js"; u.dataset.ttUi = "1"; u.async = false; document.head.appendChild(u);
    }
  })();
})(window);
