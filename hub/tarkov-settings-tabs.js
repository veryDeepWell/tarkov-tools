/*! Settings — real tabs: General / Language / Sound / Appearance / Hidden */
(function () {
  "use strict";
  if (!window.TarkovTools || !TarkovTools.openSettings) return;

  function t(key, fb) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    try {
      if (TarkovTools.t) {
        var v2 = TarkovTools.t(key);
        if (v2 && v2 !== key) return v2;
      }
    } catch (e2) {}
    return fb || key;
  }
  function get(k, d) {
    try { return TarkovTools.get(k, d); } catch (e) {
      try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e2) { return d; }
    }
  }
  function set(k, v) {
    try { TarkovTools.set(k, v); } catch (e) {
      try { localStorage.setItem(k, String(v)); } catch (e2) {}
    }
  }

  function escAttr(s) {
    return String(s || "").split('"').join("");
  }
  function escHtml(s) {
    return String(s || "")
      .split(String.fromCharCode(38)).join(String.fromCharCode(38)+"amp;")
      .split(String.fromCharCode(60)).join(String.fromCharCode(38)+"lt;")
      .split(String.fromCharCode(62)).join(String.fromCharCode(38)+"gt;");
  }

  function ensureCss() {
    if (document.getElementById("tt-set-tab-css")) return;
    var s = document.createElement("style");
    s.id = "tt-set-tab-css";
    s.textContent =
      ".tt-set-tabs{display:flex;flex-wrap:wrap;gap:0;border-bottom:1px solid var(--border);margin:0 0 14px;}" +
      "button.tt-set-tab,.tt-set-tab{appearance:none!important;border:0!important;background:transparent!important;" +
      "color:var(--muted)!important;padding:10px 14px!important;font:inherit!important;font-size:.9rem!important;" +
      "cursor:pointer;border-bottom:2px solid transparent!important;border-radius:0!important;box-shadow:none!important;" +
      "min-height:0!important;line-height:1.2!important;}" +
      "button.tt-set-tab:hover,.tt-set-tab:hover{color:var(--text)!important;background:transparent!important;}" +
      "button.tt-set-tab.on,.tt-set-tab.on{color:var(--accent)!important;border-bottom-color:var(--accent)!important;" +
      "background:transparent!important;font-weight:600!important;}" +
      ".tt-set-panel{display:none;}.tt-set-panel.on{display:block;}" +
      ".tt-lang-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);" +
      "border-radius:8px;margin:0 0 8px;cursor:pointer;background:var(--input-bg);}" +
      ".tt-lang-row:hover{border-color:var(--accent);}" +
      ".tt-lang-row.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);}" +
      ".tt-lang-row .pct{font-variant-numeric:tabular-nums;color:var(--muted);font-size:.85rem;}" +
      ".tt-kind-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;padding:8px 0;" +
      "border-bottom:1px solid var(--border);}" +
      ".tt-kind-row:last-child{border-bottom:0;}" +
      ".tt-kind-row label{flex:1;min-width:120px;}" +
      ".tt-kind-row input[type=range]{width:120px;}" +
      ".tt-accent-row{display:flex;flex-wrap:wrap;gap:8px;}" +
      ".tt-accent-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;" +
      "padding:0;min-width:28px!important;min-height:28px!important;}" +
      ".tt-accent-swatch.on{border-color:var(--text);box-shadow:0 0 0 2px var(--accent);}" +
      ".tt-hidden-list{max-height:240px;overflow:auto;}" +
      ".tt-hidden-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}" +
      ".tt-set-modal{max-width:520px;width:min(520px,94vw);}" +
      ".tt-set-modal .tt-set-body{max-height:min(70vh,560px);overflow:auto;padding-right:4px;}";
    document.head.appendChild(s);
  }

  function kindRow(kind, label) {
    var on = get("tarkovSoundKind." + kind, "1") !== "0";
    var kv = get("tarkovSoundKindVol." + kind, "1");
    var vol = isNaN(parseFloat(kv)) ? 1 : Math.min(1, Math.max(0, parseFloat(kv)));
    return '<div class="tt-kind-row">' +
      '<input type="checkbox" class="tt-kind-on" data-kind="' + kind + '"' + (on ? " checked" : "") + '> ' +
      '<label>' + label + '</label>' +
      '<input type="range" class="tt-kind-vol" data-kind="' + kind + '" min="0" max="1" step="0.05" value="' +
      vol + '">' +
      '<button type="button" class="btn-ghost tt-kind-test" data-kind="' + kind +
      '" style="padding:4px 10px;font-size:.8rem">' +
      t("common.testSound", "Test") + "</button></div>";
  }

  var LANGS = [
    { id: "ru", name: "Russian" },
    { id: "en", name: "English" },
    { id: "uk", name: "Ukrainian" },
    { id: "de", name: "Deutsch" },
    { id: "zh-CN", name: "Chinese" }
  ];

  TarkovTools.openSettings = function () {
    ensureCss();
    var bg = document.getElementById("tt-settings-bg");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "tt-settings-bg";
      bg.className = "tt-modal-bg";
      bg.innerHTML =
        '<div class="tt-modal tt-set-modal card" role="dialog" aria-modal="true">' +
        '<div class="tt-modal-head" style="display:flex;align-items:center;gap:8px">' +
        '<strong style="flex:1">' + t("common.settings", "Settings") + "</strong>" +
        '<button type="button" class="btn-ghost" id="tt-set-close" aria-label="Close">X</button></div>' +
        '<div class="tt-set-tabs" id="tt-set-tabs">' +
        '<button type="button" class="tt-set-tab on" data-tab="general">' + t("common.tabGeneral", "General") + "</button>" +
        '<button type="button" class="tt-set-tab" data-tab="lang">' + t("common.tabLang", "Language") + "</button>" +
        '<button type="button" class="tt-set-tab" data-tab="sound">' + t("common.tabSound", "Sound") + "</button>" +
        '<button type="button" class="tt-set-tab" data-tab="look">' + t("common.tabLook", "Look") + "</button>" +
        '<button type="button" class="tt-set-tab" data-tab="hidden">' + t("common.tabHidden", "Hidden") + "</button>" +
        "</div>" +
        '<div class="tt-set-body">' +
        '<div class="tt-set-panel on" data-panel="general">' +
        '<div class="field"><label>' + t("common.gameMode", "Game mode") + '</label>' +
        '<select id="tt-set-mode"><option value="pve">PvE</option><option value="pvp">PvP</option></select></div>' +
        '<div class="field"><label>' + t("common.toolTips", "Tool tips") + '</label>' +
        '<select id="tt-set-tips"><option value="1">' + t("common.on", "On") + '</option>' +
        '<option value="0">' + t("common.off", "Off") + '</option></select></div>' +
        '<div class="field" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn-ghost" id="tt-set-export">' + t("common.export", "Export") + '</button>' +
        '<label class="btn-ghost" style="cursor:pointer">' + t("common.import", "Import") +
        '<input type="file" id="tt-set-import" accept="application/json,.json" style="display:none"></label></div></div>' +
        '<div class="tt-set-panel" data-panel="lang"><div id="tt-set-langs"></div></div>' +
        '<div class="tt-set-panel" data-panel="sound">' +
        '<div class="field"><label>' + t("common.sound", "Sound") + '</label>' +
        '<select id="tt-set-sound"><option value="1">' + t("common.on", "On") + '</option>' +
        '<option value="0">' + t("common.off", "Off") + '</option></select></div>' +
        '<div class="field"><label>' + t("common.volume", "Volume") + ' <span id="tt-vol-label">50%</span></label>' +
        '<input type="range" id="tt-set-vol" min="0" max="1" step="0.05" value="0.5"></div>' +
        '<button type="button" class="btn-ghost" id="tt-set-testsound">' + t("common.testSound", "Test") +
        '</button>' +
        '<p class="meta" style="margin:14px 0 8px">' + t("common.perToolSound", "Per-tool sounds") + "</p>" +
        '<div id="tt-set-kinds">' +
        kindRow("price", t("tool.price-track.title", "Price track")) +
        kindRow("alarm", t("tool.price-alarm.title", "Price alarm")) +
        kindRow("restock", t("tool.restock.title", "Restock")) +
        kindRow("ok", t("common.uiSound", "UI")) +
        "</div></div>" +
        '<div class="tt-set-panel" data-panel="look">' +
        '<div class="field"><label>' + t("common.theme", "Theme") + '</label>' +
        '<select id="tt-set-theme"><option value="dark">' + t("common.themeDark", "Dark") + '</option>' +
        '<option value="light">' + t("common.themeLight", "Light") + '</option></select></div>' +
        '<div class="field" style="margin:10px 0"><label>' + t("common.accent", "Accent") +
        '</label><div class="tt-accent-row" id="tt-accent-row"></div></div></div>' +
        '<div class="tt-set-panel" data-panel="hidden">' +
        '<p class="meta" style="margin:0 0 10px">' + t("common.hiddenHint", "Hidden tools are not shown on the hub") + '</p>' +
        '<div class="tt-hidden-list" id="tt-set-hidden"></div></div>' +
        "</div>" +
        '<div class="tt-modal-foot" style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">' +
        '<button type="button" class="btn-ghost" id="tt-set-cancel">' + t("common.cancel", "Cancel") + '</button>' +
        '<button type="button" class="btn" id="tt-set-save">' + t("common.save", "Save") + '</button></div></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) {
        if (e.target === bg) bg.classList.remove("show");
      });
    }
    var modal = bg.querySelector(".tt-modal");

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

    document.getElementById("tt-set-mode").value = get("tarkovPreferredGameMode", "pve") || "pve";
    document.getElementById("tt-set-tips").value = get("tarkovTips", get("tarkovToolTips", "1")) === "0" ? "0" : "1";
    document.getElementById("tt-set-sound").value = get("tarkovSound", "1") === "0" ? "0" : "1";
    var volEl = document.getElementById("tt-set-vol");
    volEl.value = String(
      Math.min(1, Math.max(0, parseFloat(get("tarkovSoundVol", get("tarkovSoundVolume", "0.5"))) || 0.5))
    );
    var volLab = document.getElementById("tt-vol-label");
    function syncVolLabel() {
      volLab.textContent = Math.round(parseFloat(volEl.value) * 100) + "%";
    }
    syncVolLabel();
    volEl.oninput = syncVolLabel;

    document.getElementById("tt-set-theme").value = get("tarkovTheme", "dark") === "light" ? "light" : "dark";
    var row = document.getElementById("tt-accent-row");
    var accents = TarkovTools.ACCENTS || { gold: "#c9a227", blue: "#5b9fd4", green: "#3dd68c", cyan: "#2ec4b6", purple: "#a78bfa", orange: "#e0a458", red: "#f07178", pink: "#e879a9", slate: "#94a3b8" };
    var curAcc = get("tarkovAccent", "gold");
    row.innerHTML = Object.keys(accents).map(function (k) {
      return '<button type="button" class="tt-accent-swatch' + (k === curAcc ? " on" : "") +
        '" data-acc="' + k + '" style="background:' + accents[k] + '" title="' + k + '"></button>';
    }).join("");
    row.querySelectorAll(".tt-accent-swatch").forEach(function (b) {
      b.onclick = function () {
        row.querySelectorAll(".tt-accent-swatch").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      };
    });

    var langBox = document.getElementById("tt-set-langs");
    var curLang = get("tarkovLang", "ru") || "ru";
    try { if (window.TarkovI18n && TarkovI18n.lang) curLang = TarkovI18n.lang() || curLang; } catch (e) {}
    langBox.innerHTML = LANGS.map(function (L) {
      return '<div class="tt-lang-row' + (L.id === curLang ? " on" : "") + '" data-lang="' + L.id + '">' +
        '<strong style="flex:1">' + L.name + '</strong><span class="pct">' + L.id + '</span></div>';
    }).join("");
    langBox.querySelectorAll(".tt-lang-row").forEach(function (r) {
      r.onclick = function () {
        langBox.querySelectorAll(".tt-lang-row").forEach(function (x) { x.classList.remove("on"); });
        r.classList.add("on");
      };
    });

    var hidBox = document.getElementById("tt-set-hidden");
    var catalog = [];
    try { catalog = window.TarkovHubCATALOG || []; } catch (e) {}
    var hidden = [];
    try { hidden = TarkovTools.hiddenTools() || []; } catch (e) {}
    hidBox.innerHTML = catalog.map(function (tool) {
      var file = tool.file || "";
      var title = tool.title || file;
      try {
        if (window.TarkovI18n && TarkovI18n.toolTitle) {
          var ti = TarkovI18n.toolTitle(file);
          if (ti && ti.indexOf("tool.") !== 0) title = ti;
        }
      } catch (e) {}
      var isHid = hidden.indexOf(file) >= 0 || hidden.indexOf(file.split("/").pop()) >= 0;
      return '<div class="tt-hidden-item"><input type="checkbox" class="tt-hid-cb" data-file="' +
        escAttr(file) + '"' + (isHid ? " checked" : "") + '> <span>' +
        escHtml(title) + '</span></div>';
    }).join("") || ('<p class="meta">' + t("common.noTools", "No tools") + '</p>');

    document.getElementById("tt-set-testsound").onclick = function () {
      var prevVol = get("tarkovSoundVol", get("tarkovSoundVolume", "0.5"));
      var tempVol = volEl.value;
      set("tarkovSoundVol", tempVol);
      set("tarkovSoundVolume", tempVol);
      try {
        if (TarkovTools.beep) TarkovTools.beep("ok");
      } finally {
        set("tarkovSoundVol", prevVol);
        set("tarkovSoundVolume", prevVol);
      }
    };
    modal.querySelectorAll(".tt-kind-test").forEach(function (btn) {
      btn.onclick = function () {
        var kind = btn.getAttribute("data-kind") || "ok";
        var prevVol = get("tarkovSoundVol", get("tarkovSoundVolume", "0.5"));
        var tempVol = volEl.value;
        var kindVolEl = modal.querySelector('.tt-kind-vol[data-kind="' + kind + '"]');
        var prevKindVol = get("tarkovSoundKindVol." + kind, "1");
        set("tarkovSoundVol", tempVol);
        set("tarkovSoundVolume", tempVol);
        if (kindVolEl) set("tarkovSoundKindVol." + kind, kindVolEl.value);
        try {
          if (TarkovTools.beep) TarkovTools.beep(kind === "price" ? "ok" : kind);
        } finally {
          set("tarkovSoundVol", prevVol);
          set("tarkovSoundVolume", prevVol);
          set("tarkovSoundKindVol." + kind, prevKindVol);
        }
      };
    });

    document.getElementById("tt-set-cancel").onclick = function () { bg.classList.remove("show"); };
    document.getElementById("tt-set-close").onclick = function () { bg.classList.remove("show"); };
    document.getElementById("tt-set-save").onclick = function () {
      set("tarkovPreferredGameMode", document.getElementById("tt-set-mode").value);
      set("tarkovTips", document.getElementById("tt-set-tips").value);
      set("tarkovToolTips", document.getElementById("tt-set-tips").value);
      set("tarkovSound", document.getElementById("tt-set-sound").value);
      set("tarkovSoundVol", volEl.value);
      set("tarkovSoundVolume", volEl.value);
      set("tarkovTheme", document.getElementById("tt-set-theme").value);
      var accBtn = row.querySelector(".tt-accent-swatch.on");
      if (accBtn) set("tarkovAccent", accBtn.getAttribute("data-acc") || "gold");
      modal.querySelectorAll(".tt-kind-on").forEach(function (cb) {
        set("tarkovSoundKind." + cb.getAttribute("data-kind"), cb.checked ? "1" : "0");
      });
      modal.querySelectorAll(".tt-kind-vol").forEach(function (r) {
        set("tarkovSoundKindVol." + r.getAttribute("data-kind"), r.value);
      });
      var langRow = langBox.querySelector(".tt-lang-row.on");
      var lang = langRow ? langRow.getAttribute("data-lang") : curLang;
      set("tarkovLang", lang);
      var newHidden = [];
      hidBox.querySelectorAll(".tt-hid-cb").forEach(function (cb) {
        if (cb.checked) newHidden.push(cb.getAttribute("data-file"));
      });
      try { TarkovTools.setHiddenTools(newHidden); } catch (e) {}
      try { if (TarkovTools.applyTheme) TarkovTools.applyTheme(); } catch (e) {}

      function finish() {
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
