/*! Tarkov Tools common */
(function (global) {
  const KEYS = { theme:"tarkovTheme", lang:"tarkovLang", sound:"tarkovSound", mode:"tarkovPreferredGameMode", seen:"tarkovSettingsSeen", exportPrefix:"tarkov" };
  const I18N = {
    ru: { settings:"Настройки", theme:"Тема", themeDark:"Тёмная", themeLight:"Светлая", lang:"Язык", sound:"Звук", soundOn:"Вкл", soundOff:"Выкл", mode:"Режим по умолчанию", close:"Закрыть", export:"Экспорт", import:"Импорт", importOk:"Импорт выполнен", importFail:"Ошибка импорта", search:"Поиск по таблице…", welcomeTitle:"Настройки Tarkov Tools", welcomeBody:"Тема, язык, звук и режим. Экспорт переносит данные на другой ПК.", apply:"Применить", hub:"Хаб" },
    en: { settings:"Settings", theme:"Theme", themeDark:"Dark", themeLight:"Light", lang:"Language", sound:"Sound", soundOn:"On", soundOff:"Off", mode:"Default mode", close:"Close", export:"Export", import:"Import", importOk:"Import done", importFail:"Import failed", search:"Filter table…", welcomeTitle:"Tarkov Tools settings", welcomeBody:"Theme, language, sound and default mode. Export to move devices.", apply:"Apply", hub:"Hub" }
  };
  const BTN_NORM = [
    [/^\s*загрузить(\s+данные)?\s*$/i, "Загрузить"],
    [/^\s*получить\s*$/i, "Загрузить"],
    [/^\s*пересчитать\s*$/i, "Пересчитать"],
    [/^\s*сохранить\s*$/i, "Сохранить"],
    [/^\s*сбросить(\s+моды)?\s*$/i, "Сбросить"],
    [/^\s*очистить(\s+список)?\s*$/i, "Очистить"],
    [/^\s*копировать(\s+список)?\s*$/i, "Копировать"],
    [/^\s*в рейд\s*$/i, "В рейд"],
    [/^\s*отменить таймер\s*$/i, "Отменить"],
    [/^\s*цены с барахолки\s*$/i, "Цены с барахолки"]
  ];
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
      o.type = "sine"; o.frequency.value = kind === "ok" ? 660 : kind === "err" ? 220 : 440;
      g.gain.value = 0.04; o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.stop(ctx.currentTime + 0.16); setTimeout(() => ctx.close(), 300);
    } catch (e) {}
  }
  function exportAll() {
    const data = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(KEYS.exportPrefix)) data[k] = localStorage.getItem(k); } } catch (e) {}
    const blob = new Blob([JSON.stringify({ v: 1, ts: Date.now(), data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tarkov-tools-backup.json"; a.click();
    URL.revokeObjectURL(a.href); beep("ok");
  }
  function importAll(obj) {
    try {
      const payload = typeof obj === "string" ? JSON.parse(obj) : obj;
      const data = payload.data || payload;
      Object.keys(data).forEach(k => { if (k.startsWith(KEYS.exportPrefix)) localStorage.setItem(k, data[k]); });
      applyTheme(); beep("ok"); return true;
    } catch (e) { beep("err"); return false; }
  }
  function wireGameModeSelects() {
    const mode = preferredMode();
    document.querySelectorAll("select#gameMode, select[data-tt-mode]").forEach(sel => {
      if ([...sel.options].some(o => o.value === mode)) sel.value = mode;
      sel.addEventListener("change", () => set(KEYS.mode, sel.value));
    });
  }
  function normalizeButtons() {
    document.querySelectorAll("button, input[type=button], input[type=submit]").forEach(btn => {
      if (btn.classList.contains("del") || btn.classList.contains("copy-btn") || btn.classList.contains("map-chip") || btn.classList.contains("chip") || btn.classList.contains("tab") || (btn.id && btn.id.startsWith("tt-bar"))) return;
      const raw = (btn.textContent || btn.value || "").trim();
      for (const [re, label] of BTN_NORM) {
        if (re.test(raw)) { if (btn.tagName === "INPUT") btn.value = label; else btn.textContent = label; break; }
      }
      const cls = btn.className || "";
      if (!/\bbtn\b/.test(cls) && !/\bbtn-ghost\b/.test(cls) && !/\bbtn-raid\b/.test(cls)) {
        if (/ghost|secondary|outline/i.test(cls) || btn.id === "modalClose") btn.classList.add("btn-ghost");
        else btn.classList.add("btn");
      }
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
      if (!table.tHead || table.dataset.ttEnhanced) return;
      const wrap = table.closest(".table-wrap") || table.parentElement;
      let tools = wrap && wrap.previousElementSibling;
      if (!tools || !tools.classList || !tools.classList.contains("tt-table-tools")) {
        tools = document.createElement("div");
        tools.className = "tt-table-tools";
        const inp = document.createElement("input");
        inp.type = "search"; inp.placeholder = t("search");
        tools.appendChild(inp);
        if (wrap && wrap.parentElement) {
          if (wrap.classList && wrap.classList.contains("table-wrap")) wrap.parentElement.insertBefore(tools, wrap);
          else wrap.insertBefore(tools, table);
        }
        enhanceTable(table, inp);
      } else enhanceTable(table, tools.querySelector("input"));
    });
  }
  function observeTables() {
    const obs = new MutationObserver(() => {
      document.querySelectorAll("table").forEach(table => {
        if (table.tHead && !table.dataset.ttEnhanced) enhanceAllTables();
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  function openSettings() {
    let bg = document.getElementById("tt-settings-modal");
    if (!bg) {
      bg = document.createElement("div"); bg.id = "tt-settings-modal"; bg.className = "modal-bg";
      bg.innerHTML = "<div class=\"modal\"><h2 id=\"tt-set-title\"></h2><p class=\"meta\" id=\"tt-set-body\"></p><div class=\"field\" style=\"margin-top:12px\"><label id=\"tt-lab-theme\"></label><select id=\"tt-theme\"><option value=\"dark\"></option><option value=\"light\"></option></select></div><div class=\"field\" style=\"margin-top:8px\"><label id=\"tt-lab-lang\"></label><select id=\"tt-lang\"><option value=\"ru\">Русский</option><option value=\"en\">English</option></select></div><div class=\"field\" style=\"margin-top:8px\"><label id=\"tt-lab-sound\"></label><select id=\"tt-sound\"><option value=\"0\"></option><option value=\"1\"></option></select></div><div class=\"field\" style=\"margin-top:8px\"><label id=\"tt-lab-mode\"></label><select id=\"tt-mode\"><option value=\"pve\">pve</option><option value=\"regular\">regular</option><option value=\"pvp-season\">pvp-season</option></select></div><div class=\"row\" style=\"margin-top:16px\"><button type=\"button\" class=\"btn\" id=\"tt-apply\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-export\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-import\"></button><input type=\"file\" id=\"tt-import-file\" accept=\"application/json,.json\" hidden></div><div class=\"row\"><button type=\"button\" class=\"btn-ghost\" id=\"tt-close\"></button></div></div>";
      document.body.appendChild(bg);
      bg.addEventListener("click", e => { if (e.target === bg) bg.classList.remove("show"); });
      document.getElementById("tt-close").onclick = () => bg.classList.remove("show");
      document.getElementById("tt-apply").onclick = () => {
        set(KEYS.theme, document.getElementById("tt-theme").value);
        set(KEYS.lang, document.getElementById("tt-lang").value);
        set(KEYS.sound, document.getElementById("tt-sound").value);
        set(KEYS.mode, document.getElementById("tt-mode").value);
        set(KEYS.seen, "1"); applyTheme(); wireGameModeSelects(); beep("ok"); bg.classList.remove("show");
        if (global.TarkovTools._paintBar) global.TarkovTools._paintBar();
        document.querySelectorAll(".tt-table-tools input").forEach(inp => { inp.placeholder = t("search"); });
      };
      document.getElementById("tt-export").onclick = exportAll;
      document.getElementById("tt-import").onclick = () => document.getElementById("tt-import-file").click();
      document.getElementById("tt-import-file").onchange = async (e) => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const ok = importAll(await f.text()); alert(ok ? t("importOk") : t("importFail")); if (ok) location.reload();
      };
    }
    document.getElementById("tt-set-title").textContent = t("welcomeTitle");
    document.getElementById("tt-set-body").textContent = t("welcomeBody");
    document.getElementById("tt-lab-theme").textContent = t("theme");
    document.getElementById("tt-lab-lang").textContent = t("lang");
    document.getElementById("tt-lab-sound").textContent = t("sound");
    document.getElementById("tt-lab-mode").textContent = t("mode");
    const th = document.getElementById("tt-theme"); th.options[0].text = t("themeDark"); th.options[1].text = t("themeLight"); th.value = get(KEYS.theme, "dark");
    document.getElementById("tt-lang").value = lang();
    const so = document.getElementById("tt-sound"); so.options[0].text = t("soundOff"); so.options[1].text = t("soundOn"); so.value = get(KEYS.sound, "0");
    document.getElementById("tt-mode").value = preferredMode();
    document.getElementById("tt-apply").textContent = t("apply");
    document.getElementById("tt-export").textContent = t("export");
    document.getElementById("tt-import").textContent = t("import");
    document.getElementById("tt-close").textContent = t("close");
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
    document.getElementById("tt-bar-lang").onclick = () => { set(KEYS.lang, lang() === "ru" ? "en" : "ru"); paint(); beep("ok"); document.querySelectorAll(".tt-table-tools input").forEach(inp => { inp.placeholder = t("search"); }); };
  }
  function init() {
    applyTheme(); injectBar(); wireGameModeSelects(); normalizeButtons(); enhanceAllTables(); observeTables();
    if (get(KEYS.seen, "") !== "1") setTimeout(openSettings, 250);
  }
  global.TarkovTools = { t, lang, beep, exportAll, importAll, openSettings, preferredMode, soundEnabled, enhanceTable, applyTheme, KEYS, _paintBar: null };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
