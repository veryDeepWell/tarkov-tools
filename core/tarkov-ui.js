/*! TarkovUI — shared formatters, flea tax, settings store, table helpers, progress, help */
(function (global) {
  "use strict";
  if (global.TarkovUI && global.TarkovUI.__v >= 3) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "&#39;");
  }

  function fmtNum(n, opts) {
    opts = opts || {};
    var x = Number(n);
    if (!isFinite(x)) x = 0;
    if (opts.digits != null) {
      return x.toLocaleString("ru-RU", {
        minimumFractionDigits: opts.digits,
        maximumFractionDigits: opts.digits
      });
    }
    return Math.round(x).toLocaleString("ru-RU");
  }

  function fmtRub(n, opts) {
    return fmtNum(n, opts) + " \u20bd";
  }

  function fleaTax(basePrice, offerPrice, count, opts) {
    opts = opts || {};
    var bp = Number(basePrice) || 0;
    var op = Number(offerPrice) || 0;
    var n = Math.max(1, Number(count) || 1);
    if (bp <= 0 || op <= 0) return 0;
    var Ti = 0.05, Tr = 0.05;
    var PO = Math.log10(bp / op);
    var PR = Math.log10(op / bp);
    if (op < bp) PO = Math.pow(PO, 1.08);
    if (op >= bp) PR = Math.pow(PR, 1.08);
    var tax = (bp * Ti * Math.pow(4, PO) + op * Tr * Math.pow(4, PR)) * n;
    if (opts.intelCenter3) {
      var hm = Math.max(0, Math.min(50, Number(opts.hmLvl) || 0));
      var reduction = Math.min(0.45, 0.30 + hm * 0.003);
      tax *= (1 - reduction);
    }
    return Math.max(0, Math.ceil(tax));
  }

  function fleaNet(basePrice, offerPrice, count, opts) {
    var gross = (Number(offerPrice) || 0) * Math.max(1, Number(count) || 1);
    return gross - fleaTax(basePrice, offerPrice, count, opts);
  }

  function loadSettings(key, defaults) {
    defaults = defaults || {};
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return Object.assign({}, defaults);
      return Object.assign({}, defaults, JSON.parse(raw));
    } catch (e) {
      return Object.assign({}, defaults);
    }
  }

  function saveSettings(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  function settingsStore(key, defaults) {
    return {
      key: key,
      defaults: Object.assign({}, defaults || {}),
      get: function () { return loadSettings(key, defaults); },
      set: function (patch) {
        var next = Object.assign(loadSettings(key, defaults), patch || {});
        saveSettings(key, next);
        return next;
      },
      setKey: function (k, v) {
        var o = {};
        o[k] = v;
        return this.set(o);
      },
      reset: function () {
        saveSettings(key, Object.assign({}, defaults));
        return Object.assign({}, defaults);
      }
    };
  }

  function bindSettingsForm(store, fieldIds, onChange) {
    fieldIds = fieldIds || [];
    function read() {
      var o = {};
      fieldIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.type === "checkbox") o[id] = !!el.checked;
        else if (el.type === "number") o[id] = el.value === "" ? "" : Number(el.value);
        else o[id] = el.value;
      });
      return o;
    }
    function write(s) {
      s = s || store.get();
      fieldIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || s[id] == null) return;
        if (el.type === "checkbox") el.checked = !!s[id];
        else el.value = s[id];
      });
    }
    write(store.get());
    fieldIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        store.set(read());
        if (onChange) onChange(store.get());
      });
      el.addEventListener("input", function () {
        store.set(read());
        if (onChange) onChange(store.get());
      });
    });
    return { read: read, write: write, store: store };
  }

  function enhanceTable(table, filterInput) {
    if (global.TarkovTools && typeof TarkovTools.enhanceTable === "function") {
      return TarkovTools.enhanceTable(table, filterInput);
    }
  }

  var progressState = { host: null, bar: null, label: null, pct: 0 };

  function progressEnsure(host) {
    host = host || document.getElementById("tt-progress") || document.getElementById("progressWrap");
    if (!host) {
      host = document.createElement("div");
      host.id = "tt-progress";
      host.className = "tt-progress";
      var main = document.querySelector(".container, .tt-tool, main, body");
      if (main && main !== document.body) main.insertBefore(host, main.firstChild);
      else document.body.appendChild(host);
    }
    if (!host.querySelector(".tt-progress-track") && !host.querySelector(".progress-track")) {
      host.innerHTML =
        '<div class="tt-progress-track"><div class="tt-progress-bar" id="tt-progress-bar"></div></div>' +
        '<div class="tt-progress-label" id="tt-progress-label"></div>';
    }
    progressState.host = host;
    progressState.bar = host.querySelector(".tt-progress-bar, .progress-bar") || document.getElementById("tt-progress-bar") || document.getElementById("progressBar");
    progressState.label = host.querySelector(".tt-progress-label, .progress-label") || document.getElementById("tt-progress-label") || document.getElementById("progressLabel");
    return host;
  }

  function progressStart(opts) {
    opts = opts || {};
    var host = progressEnsure(opts.host);
    host.classList.add("visible", "tt-progress-visible");
    host.classList.remove("tt-progress-fail");
    progressState.pct = 0;
    if (progressState.bar) {
      progressState.bar.classList.remove("indeterminate", "fail");
      progressState.bar.style.width = "0%";
    }
    if (progressState.label) progressState.label.textContent = opts.label || "";
    return progressAPI;
  }

  function progressSet(pct, label) {
    progressEnsure();
    var p = Math.max(0, Math.min(100, Number(pct) || 0));
    progressState.pct = p;
    if (progressState.bar) {
      progressState.bar.classList.remove("indeterminate");
      progressState.bar.style.width = p + "%";
    }
    if (label != null && progressState.label) progressState.label.textContent = label;
    return progressAPI;
  }

  function progressDone(label) {
    progressSet(100, label != null ? label : "");
    setTimeout(function () {
      if (progressState.host) progressState.host.classList.remove("visible", "tt-progress-visible");
      if (progressState.bar) progressState.bar.style.width = "0%";
    }, 320);
    return progressAPI;
  }

  function progressFail(label) {
    progressEnsure();
    if (progressState.host) progressState.host.classList.add("tt-progress-fail", "visible");
    if (progressState.bar) {
      progressState.bar.classList.add("fail");
      progressState.bar.style.width = (progressState.pct || 100) + "%";
    }
    if (label != null && progressState.label) progressState.label.textContent = label;
    return progressAPI;
  }

  var progressAPI = {
    start: progressStart,
    set: progressSet,
    done: progressDone,
    fail: progressFail,
    ensure: progressEnsure
  };

  function helpModal(opts) {
    opts = opts || {};
    var title = opts.title || "Help";
    var body = opts.body || opts.html || "";
    var id = "tt-help-modal";
    var bg = document.getElementById(id);
    if (!bg) {
      bg = document.createElement("div");
      bg.id = id;
      bg.className = "modal-bg tt-help-bg";
      bg.innerHTML =
        '<div class="modal tt-help-modal" role="dialog" aria-modal="true">' +
        '<div class="tt-help-head"><h2 id="tt-help-title"></h2>' +
        '<button type="button" class="btn-ghost tt-help-close" aria-label="Close">\u00d7</button></div>' +
        '<div class="tt-help-body" id="tt-help-body"></div></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) {
        if (e.target === bg) bg.style.display = "none";
      });
      bg.querySelector(".tt-help-close").onclick = function () { bg.style.display = "none"; };
    }
    document.getElementById("tt-help-title").textContent = title;
    var bodyEl = document.getElementById("tt-help-body");
    if (opts.html) bodyEl.innerHTML = body;
    else {
      bodyEl.innerHTML = String(body)
        .split(/\n\n+/)
        .map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; })
        .join("");
    }
    bg.style.display = "flex";
    return bg;
  }

  function toolHelpFromI18n(toolId) {
    var id = String(toolId || "").replace(/^tarkovtool-/, "").replace(/\.html$/, "");
    var title = id;
    var body = "";
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var tTitle = TarkovI18n.t("tool." + id + ".title");
        var tHelp = TarkovI18n.t("tool." + id + ".help");
        var tDesc = TarkovI18n.t("tool." + id + ".description");
        if (tTitle && tTitle.indexOf("tool.") !== 0) title = tTitle;
        if (tHelp && tHelp.indexOf("tool.") !== 0) body = tHelp;
        else if (tDesc && tDesc.indexOf("tool.") !== 0) body = tDesc;
      }
    } catch (e) {}
    return { title: title, body: body };
  }

  function attachHelpButton(host, toolId) {
    host = typeof host === "string" ? document.querySelector(host) : host;
    if (!host) return null;
    var btn = host.querySelector(".tt-help-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-ghost tt-help-btn";
      btn.setAttribute("aria-label", "Help");
      btn.textContent = "?";
      host.appendChild(btn);
    }
    btn.onclick = function () {
      var h = toolHelpFromI18n(toolId);
      if (!h.body) {
        h.body = "Tool: " + String(toolId || "") + "\n\nHelp text will appear when tool.<id>.help is set in locales.";
      }
      helpModal({ title: h.title, body: h.body });
    };
    return btn;
  }

  function toolHeader(opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "tt-tool-header";
    el.innerHTML =
      '<div class="tt-tool-header-main">' +
      "<h1>" + esc(opts.title || "") + "</h1>" +
      (opts.sub ? '<p class="sub">' + esc(opts.sub) + "</p>" : "") +
      "</div>" +
      '<div class="tt-tool-header-actions"></div>';
    if (opts.toolId) attachHelpButton(el.querySelector(".tt-tool-header-actions"), opts.toolId);
    return el;
  }

  global.TarkovUI = {
    __v: 3,
    esc: esc,
    escapeHtml: esc,
    fmtNum: fmtNum,
    formatNum: fmtNum,
    fmtRub: fmtRub,
    fleaTax: fleaTax,
    fleaNet: fleaNet,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    settingsStore: settingsStore,
    bindSettingsForm: bindSettingsForm,
    enhanceTable: enhanceTable,
    table: enhanceTable,
    progress: progressAPI,
    helpModal: helpModal,
    attachHelpButton: attachHelpButton,
    toolHeader: toolHeader,
    toolHelpFromI18n: toolHelpFromI18n
  };

  if (!global.escapeHtml) global.escapeHtml = esc;
  if (!global.formatNum) global.formatNum = fmtNum;
  if (!global.fleaTax) global.fleaTax = fleaTax;
  if (!global.fleaNet) global.fleaNet = fleaNet;
})(window);
