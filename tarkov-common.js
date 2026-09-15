/*! Tarkov Tools common */
(function (global) {
  const KEYS = { theme:"tarkovTheme", lang:"tarkovLang", sound:"tarkovSound", mode:"tarkovPreferredGameMode", seen:"tarkovSettingsSeen", exportPrefix:"tarkov" };
  const I18N = {
    ru: { settings:"Настройки", theme:"Тема", themeDark:"Тёмная", themeLight:"Светлая", lang:"Язык", sound:"Звук", soundOn:"Вкл", soundOff:"Выкл", mode:"Режим по умолчанию", close:"Закрыть", export:"Экспорт", import:"Импорт", importOk:"Импорт выполнен", importFail:"Ошибка импорта", search:"Поиск по таблице…", welcomeTitle:"Настройки Tarkov Tools", welcomeBody:"Тема, язык, звук и режим. Экспорт переносит данные на другой ПК.", apply:"Применить", hub:"Хаб" },
    en: { settings:"Settings", theme:"Theme", themeDark:"Dark", themeLight:"Light", lang:"Language", sound:"Sound", soundOn:"On", soundOff:"Off", mode:"Default mode", close:"Close", export:"Export", import:"Import", importOk:"Import done", importFail:"Import failed", search:"Filter table…", welcomeTitle:"Tarkov Tools settings", welcomeBody:"Theme, language, sound and default mode. Export to move devices.", apply:"Apply", hub:"Hub" }
  };
  function get(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch (e) { return f; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lang() { return get(KEYS.lang, "ru") === "en" ? "en" : "ru"; }
  function t(k) { return (I18N[lang()] || I18N.ru)[k] || k; }
  function applyTheme() { document.documentElement.setAttribute("data-theme", get(KEYS.theme, "dark") === "light" ? "light" : "dark"); }
  function preferredMode() { return get(KEYS.mode, "pve"); }
  function soundEnabled() { return get(KEYS.sound, "0") === "1"; }
  function beep(kind) {
    if (!soundEnabled()) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      const now = ctx.currentTime;
      if (kind === "warn") { o.frequency.value = 420; g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25); o.start(now); o.stop(now + 0.25); }
      else { o.frequency.value = 880; g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12); o.start(now); o.stop(now + 0.12); }
    } catch (e) {}
  }
  function exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("tarkov") || k.startsWith("restock"))) data[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tarkov-tools-export.json"; a.click();
  }
  function importAll(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
          resolve(true);
        } catch (e) { reject(e); }
      };
      r.onerror = reject;
      r.readAsText(file);
    });
  }
  function openSettings() {
    let bg = document.getElementById("tt-settings-bg");
    if (!bg) {
      bg = document.createElement("div"); bg.id = "tt-settings-bg"; bg.className = "modal-bg";
      bg.innerHTML = '<div class="modal" id="tt-settings-modal"></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", e => { if (e.target === bg) bg.classList.remove("show"); });
    }
    const modal = document.getElementById("tt-settings-modal");
    modal.innerHTML = '<h2>' + t("settings") + '</h2>' +
      '<div class="field" style="margin:12px 0"><label>' + t("theme") + '</label><select id="tt-set-theme"><option value="dark">' + t("themeDark") + '</option><option value="light">' + t("themeLight") + '</option></select></div>' +
      '<div class="field" style="margin:12px 0"><label>' + t("lang") + '</label><select id="tt-set-lang"><option value="ru">RU</option><option value="en">EN</option></select></div>' +
      '<div class="field" style="margin:12px 0"><label>' + t("sound") + '</label><select id="tt-set-sound"><option value="0">' + t("soundOff") + '</option><option value="1">' + t("soundOn") + '</option></select></div>' +
      '<div class="field" style="margin:12px 0"><label>' + t("mode") + '</label><select id="tt-set-mode"><option value="pve">PVE</option><option value="regular">PVP</option></select></div>' +
      '<div class="row" style="margin-top:16px"><button type="button" class="btn" id="tt-set-apply">' + t("apply") + '</button>' +
      '<button type="button" class="btn-ghost" id="tt-set-export">' + t("export") + '</button>' +
      '<label class="btn-ghost" style="cursor:pointer">' + t("import") + '<input type="file" id="tt-set-import" accept="application/json" style="display:none"></label>' +
      '<button type="button" class="btn-ghost" id="tt-set-close">' + t("close") + '</button></div>';
    document.getElementById("tt-set-theme").value = get(KEYS.theme, "dark");
    document.getElementById("tt-set-lang").value = lang();
    document.getElementById("tt-set-sound").value = get(KEYS.sound, "0");
    document.getElementById("tt-set-mode").value = preferredMode();
    document.getElementById("tt-set-apply").onclick = () => {
      set(KEYS.theme, document.getElementById("tt-set-theme").value);
      set(KEYS.lang, document.getElementById("tt-set-lang").value);
      set(KEYS.sound, document.getElementById("tt-set-sound").value);
      set(KEYS.mode, document.getElementById("tt-set-mode").value);
      set(KEYS.seen, "1");
      applyTheme(); if (global.TarkovTools._paintBar) global.TarkovTools._paintBar(); beep("ok"); bg.classList.remove("show");
    };
    document.getElementById("tt-set-export").onclick = exportAll;
    document.getElementById("tt-set-import").onchange = async (e) => {
      try { await importAll(e.target.files[0]); alert(t("importOk")); location.reload(); } catch (err) { alert(t("importFail")); }
    };
    document.getElementById("tt-set-close").onclick = () => bg.classList.remove("show");
    bg.classList.add("show");
  }
  function injectBar() {
    if (document.getElementById("tt-global-bar")) return;
    const bar = document.createElement("div"); bar.id = "tt-global-bar"; bar.className = "tt-bar";
    bar.innerHTML = "<button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-settings\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-theme\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-lang\"></button><span class=\"spacer\"></span><a class=\"btn-ghost\" href=\"tarkovtool-hub.html\" id=\"tt-bar-hub\"></a>";
    document.body.insertBefore(bar, document.body.firstChild);
    function paint() {
      document.getElementById("tt-bar-settings").textContent = t("settings");
      document.getElementById("tt-bar-theme").textContent = get(KEYS.theme, "dark") === "light" ? t("themeLight") : t("themeDark");
      document.getElementById("tt-bar-lang").textContent = lang() === "en" ? "EN" : "RU";
      document.getElementById("tt-bar-hub").textContent = t("hub");
    }
    paint(); global.TarkovTools._paintBar = paint;
    document.getElementById("tt-bar-settings").onclick = openSettings;
    document.getElementById("tt-bar-theme").onclick = () => { set(KEYS.theme, get(KEYS.theme, "dark") === "light" ? "dark" : "light"); applyTheme(); paint(); beep("ok"); };
    document.getElementById("tt-bar-lang").onclick = () => { set(KEYS.lang, lang() === "ru" ? "en" : "ru"); paint(); beep("ok"); };
  }
  function wireGameModeSelects() {
    document.querySelectorAll("select#gameMode, select[name=gameMode]").forEach(sel => {
      if (sel.dataset.ttWired) return;
      sel.dataset.ttWired = "1";
      const pref = preferredMode();
      if ([...sel.options].some(o => o.value === pref)) sel.value = pref;
      sel.addEventListener("change", () => set(KEYS.mode, sel.value));
    });
  }
  function enhanceTable(table, filterInput) {
    if (!table || table.dataset.ttEnhanced) return;
    table.dataset.ttEnhanced = "1";
    const tbody = table.tBodies[0]; if (!tbody) return;
    let sortCol = -1, sortDir = 1;
    table.querySelectorAll("th").forEach((th, idx) => {
      th.addEventListener("click", () => {
        if (sortCol === idx) sortDir *= -1; else { sortCol = idx; sortDir = 1; }
        table.querySelectorAll("th").forEach(h => h.classList.remove("sorted-asc", "sorted-desc"));
        th.classList.add(sortDir > 0 ? "sorted-asc" : "sorted-desc");
        const rows = [...tbody.rows];
        rows.sort((a, b) => {
          const ta = (a.cells[idx] && a.cells[idx].textContent || "").trim();
          const tb = (b.cells[idx] && b.cells[idx].textContent || "").trim();
          const na = parseFloat(ta.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
          const nb = parseFloat(tb.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
          if (!Number.isNaN(na) && !Number.isNaN(nb) && /\d/.test(ta) && /\d/.test(tb)) return (na - nb) * sortDir;
          return ta.localeCompare(tb, undefined, { sensitivity: "base", numeric: true }) * sortDir;
        });
        rows.forEach(r => tbody.appendChild(r));
      });
    });
    if (filterInput) {
      filterInput.addEventListener("input", () => {
        const q = filterInput.value.toLowerCase().trim();
        [...tbody.rows].forEach(r => { r.style.display = !q || r.textContent.toLowerCase().includes(q) ? "" : "none"; });
      });
    }
  }
  function enhanceAllTables() {
    document.querySelectorAll("table").forEach(table => {
      let tools = table.previousElementSibling;
      if (!tools || !tools.classList || !tools.classList.contains("tt-table-tools")) {
        tools = document.createElement("div"); tools.className = "tt-table-tools";
        const inp = document.createElement("input"); inp.type = "search"; inp.placeholder = t("search");
        tools.appendChild(inp);
        table.parentNode.insertBefore(tools, table);
        enhanceTable(table, inp);
      } else {
        const inp = tools.querySelector("input");
        enhanceTable(table, inp);
      }
    });
  }
  function observeTables() {
    const mo = new MutationObserver(() => enhanceAllTables());
    mo.observe(document.body, { childList: true, subtree: true });
  }
  function normalizeButtons() {}
  function init() {
    applyTheme(); injectBar(); wireGameModeSelects(); enhanceAllTables(); observeTables();
    if (get(KEYS.seen, "") !== "1") setTimeout(openSettings, 250);
  }
  global.TarkovTools = { t, lang, beep, exportAll, importAll, openSettings, preferredMode, soundEnabled, enhanceTable, applyTheme, KEYS, _paintBar: null };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  (function loadMini() {
    if (document.querySelector('script[data-tt-mini]')) return;
    var s = document.createElement('script');
    s.src = 'tarkov-mini.js';
    s.dataset.ttMini = '1';
    s.async = false;
    document.head.appendChild(s);
  })();
})(window);
