/*! Settings tabs: General / Sound / Appearance / Hidden tools */
(function () {
  if (!window.TarkovTools || !TarkovTools.openSettings) return;
  const orig = TarkovTools.openSettings.bind(TarkovTools);

  function get(k, d) {
    try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; }
  }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function hiddenTools() {
    if (TarkovTools.hiddenTools) return TarkovTools.hiddenTools();
    try { return JSON.parse(get("tarkovHiddenTools", "[]")) || []; } catch (e) { return []; }
  }
  function setHidden(arr) {
    if (TarkovTools.setHiddenTools) TarkovTools.setHiddenTools(arr);
    else set("tarkovHiddenTools", JSON.stringify(arr || []));
  }

  const CAT_TITLE = {
    flea: "Барахолка", loadout: "Лоадаут", hideout: "Убежка",
    quests: "Квесты", med: "Мед / еда", util: "Утилиты", other: "Прочее"
  };

  TarkovTools.openSettings = function () {
    const catalog = window.TarkovHubCatalog || [];
    const byCat = {};
    catalog.forEach(function (t) {
      const c = t.cat || "other";
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(t);
    });
    const hidden = hiddenTools();

    let bg = document.getElementById("tt-settings-bg");
    if (!bg) {
      bg = document.createElement("div"); bg.id = "tt-settings-bg"; bg.className = "modal-bg";
      bg.innerHTML = '<div class="modal" id="tt-settings-modal"></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) { if (e.target === bg) bg.classList.remove("show"); });
    }
    const modal = document.getElementById("tt-settings-modal");
    modal.style.maxWidth = "560px";

    let hiddenHtml = '<p class="meta" style="margin-bottom:10px">Выключенные не появляются в хабе и не грузятся.</p>';
    Object.keys(byCat).forEach(function (c) {
      const tools = byCat[c];
      const allH = tools.every(function (x) { return hidden.indexOf(x.file) >= 0; });
      hiddenHtml += '<div style="margin:12px 0 6px;display:flex;align-items:center;gap:8px"><strong style="flex:1">' +
        (CAT_TITLE[c] || c) + '</strong><button type="button" class="btn-ghost tt-hide-cat" data-cat="' + c +
        '" data-hide="' + (allH ? "0" : "1") + '" style="min-width:auto;min-height:28px;padding:0 10px;font-size:.78rem">' +
        (allH ? "Показать категорию" : "Скрыть категорию") + '</button></div>';
      tools.forEach(function (tool) {
        const on = hidden.indexOf(tool.file) < 0;
        hiddenHtml += '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:.9rem;color:var(--text)">' +
          '<input type="checkbox" class="tt-hide-tool" data-file="' + tool.file + '"' + (on ? " checked" : "") + '> ' +
          (tool.title || tool.file) + '</label>';
      });
    });
    if (!catalog.length) hiddenHtml += '<p class="meta">Каталог появится после загрузки хаба.</p>';

    modal.innerHTML = '<h2 style="margin:0 0 10px">Настройки</h2>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap" id="tt-set-tabs">' +
      '<button type="button" class="btn-ghost tt-set-tab" data-tab="general" style="min-width:auto;min-height:34px;padding:0 12px">Общее</button>' +
      '<button type="button" class="btn-ghost tt-set-tab" data-tab="sound" style="min-width:auto;min-height:34px;padding:0 12px">Звук</button>' +
      '<button type="button" class="btn-ghost tt-set-tab" data-tab="look" style="min-width:auto;min-height:34px;padding:0 12px">Внешний вид</button>' +
      '<button type="button" class="btn-ghost tt-set-tab" data-tab="hidden" style="min-width:auto;min-height:34px;padding:0 12px">Скрытые</button></div>' +
      '<div class="tt-set-panel" data-panel="general" style="margin-top:12px">' +
      '<div class="field" style="margin:10px 0"><label>Язык</label><select id="tt-set-lang"><option value="ru">RU</option><option value="en">EN</option></select></div>' +
      '<div class="field" style="margin:10px 0"><label>Режим</label><select id="tt-set-mode"><option value="pve">PVE</option><option value="regular">PVP</option></select></div>' +
      '<div class="field" style="margin:10px 0"><label>Подсказки</label><select id="tt-set-tips"><option value="1">Вкл</option><option value="0">Выкл</option></select></div>' +
      '<div class="row"><button type="button" class="btn-ghost" id="tt-set-export">Экспорт</button>' +
      '<label class="btn-ghost" style="cursor:pointer">Импорт<input type="file" id="tt-set-import" accept="application/json" style="display:none"></label></div></div>' +
      '<div class="tt-set-panel" data-panel="sound" style="display:none;margin-top:12px">' +
      '<div class="field" style="margin:10px 0"><label>Звук</label><select id="tt-set-sound"><option value="0">Выкл</option><option value="1">Вкл</option></select></div>' +
      '<div class="field" style="margin:10px 0"><label>Громкость</label><input type="range" id="tt-set-vol" min="0" max="1" step="0.05" style="width:100%;min-height:auto"></div>' +
      '<button type="button" class="btn-ghost" id="tt-set-testsound">Тест</button></div>' +
      '<div class="tt-set-panel" data-panel="look" style="display:none;margin-top:12px">' +
      '<div class="field" style="margin:10px 0"><label>Тема</label><select id="tt-set-theme"><option value="dark">Тёмная</option><option value="light">Светлая</option></select></div>' +
      '<div class="field" style="margin:10px 0"><label>Акцент</label><div class="tt-accent-row" id="tt-accent-row"></div></div></div>' +
      '<div class="tt-set-panel" data-panel="hidden" style="display:none;margin-top:12px">' + hiddenHtml + '</div>' +
      '<div class="row" style="margin-top:16px">' +
      '<button type="button" class="btn" id="tt-set-apply">Применить</button>' +
      '<button type="button" class="btn-ghost" id="tt-set-close">Закрыть</button></div>';

    try {
      document.getElementById("tt-set-lang").value = get("tarkovLang", "ru") === "en" ? "en" : "ru";
      document.getElementById("tt-set-mode").value = get("tarkovPreferredGameMode", "pve");
      document.getElementById("tt-set-tips").value = get("tarkovToolTips", get("tarkovTips", "1")) !== "0" ? "1" : "0";
      document.getElementById("tt-set-sound").value = get("tarkovSound", "0") === "1" ? "1" : "0";
      document.getElementById("tt-set-vol").value = String(Math.min(1, Math.max(0, parseFloat(get("tarkovSoundVol", get("tarkovSoundVolume", "0.5"))) || 0.5)));
      document.getElementById("tt-set-theme").value = get("tarkovTheme", "dark");
    } catch (e) {}

    const ACCENTS = { gold:"#c9a227", blue:"#5b9fd4", green:"#3dd68c", cyan:"#2ec4b6", purple:"#a78bfa", orange:"#e0a458", red:"#f07178", pink:"#e879a9", slate:"#94a3b8" };
    const row = document.getElementById("tt-accent-row");
    const cur = get("tarkovAccent", "gold");
    if (row) {
      row.innerHTML = Object.keys(ACCENTS).map(function (k) {
        return '<button type="button" class="tt-accent-swatch' + (k === cur ? " on" : "") + '" data-accent="' + k + '" style="background:' + ACCENTS[k] + '"></button>';
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

    function showTab(id) {
      modal.querySelectorAll(".tt-set-panel").forEach(function (p) {
        p.style.display = p.getAttribute("data-panel") === id ? "block" : "none";
      });
      modal.querySelectorAll(".tt-set-tab").forEach(function (b) {
        const on = b.getAttribute("data-tab") === id;
        b.style.borderColor = on ? "var(--accent)" : "";
        b.style.color = on ? "var(--accent)" : "";
      });
    }
    modal.querySelectorAll(".tt-set-tab").forEach(function (b) {
      b.onclick = function () { showTab(b.getAttribute("data-tab")); };
    });
    showTab("general");

    modal.querySelectorAll(".tt-hide-tool").forEach(function (cb) {
      cb.onchange = function () {
        let list = hiddenTools();
        const f = cb.getAttribute("data-file");
        if (cb.checked) list = list.filter(function (x) { return x !== f; });
        else if (list.indexOf(f) < 0) list.push(f);
        setHidden(list);
      };
    });
    modal.querySelectorAll(".tt-hide-cat").forEach(function (btn) {
      btn.onclick = function () {
        const cat = btn.getAttribute("data-cat");
        const hide = btn.getAttribute("data-hide") === "1";
        let list = hiddenTools();
        const files = (byCat[cat] || []).map(function (x) { return x.file; });
        if (hide) files.forEach(function (f) { if (list.indexOf(f) < 0) list.push(f); });
        else list = list.filter(function (f) { return files.indexOf(f) < 0; });
        setHidden(list);
        TarkovTools.openSettings();
      };
    });

    document.getElementById("tt-set-testsound").onclick = function () {
      set("tarkovSound", "1");
      if (TarkovTools.beep) TarkovTools.beep("restock");
    };
    document.getElementById("tt-set-apply").onclick = function () {
      set("tarkovLang", document.getElementById("tt-set-lang").value);
      set("tarkovPreferredGameMode", document.getElementById("tt-set-mode").value);
      set("tarkovToolTips", document.getElementById("tt-set-tips").value);
      set("tarkovTips", document.getElementById("tt-set-tips").value);
      set("tarkovSound", document.getElementById("tt-set-sound").value);
      set("tarkovSoundVol", document.getElementById("tt-set-vol").value);
      set("tarkovSoundVolume", document.getElementById("tt-set-vol").value);
      set("tarkovTheme", document.getElementById("tt-set-theme").value);
      const acc = modal.querySelector(".tt-accent-swatch.on");
      if (acc) set("tarkovAccent", acc.getAttribute("data-accent"));
      set("tarkovSettingsSeen", "1");
      if (TarkovTools.applyTheme) TarkovTools.applyTheme();
      else document.documentElement.setAttribute("data-theme", document.getElementById("tt-set-theme").value === "light" ? "light" : "dark");
      if (TarkovTools._paintBar) TarkovTools._paintBar();
      if (TarkovTools.beep) TarkovTools.beep("ok");
      bg.classList.remove("show");
      try { window.dispatchEvent(new CustomEvent("tt-settings-applied")); } catch (e) {}
    };
    document.getElementById("tt-set-close").onclick = function () { bg.classList.remove("show"); };
    const exp = document.getElementById("tt-set-export");
    if (exp && TarkovTools.exportAll) exp.onclick = TarkovTools.exportAll;
    const imp = document.getElementById("tt-set-import");
    if (imp && TarkovTools.importAll) imp.onchange = function (e) { if (e.target.files[0]) TarkovTools.importAll(e.target.files[0]); };

    bg.classList.add("show");
  };
})();
