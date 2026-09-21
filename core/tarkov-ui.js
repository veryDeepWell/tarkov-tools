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
    var Ti = 0.05,
      Tr = 0.05;
    var PO = Math.log10(bp / op);
    var PR = Math.log10(op / bp);
    if (!isFinite(PO)) PO = 0;
    if (!isFinite(PR)) PR = 0;
    var tax = op * Ti * Math.pow(4, PO) + bp * Tr * Math.pow(4, PR);
    if (opts.noFee) tax = 0;
    tax = Math.max(0, tax) * n;
    return Math.round(tax);
  }

  function fleaNet(basePrice, offerPrice, count, opts) {
    var op = Number(offerPrice) || 0;
    var n = Math.max(1, Number(count) || 1);
    return Math.round(op * n - fleaTax(basePrice, offerPrice, count, opts));
  }

  function loadSettings(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null || raw === "") return fallback != null ? fallback : {};
      return JSON.parse(raw);
    } catch (e) {
      return fallback != null ? fallback : {};
    }
  }

  function saveSettings(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {}
  }

  function settingsStore(ns) {
    return {
      load: function (fb) {
        return loadSettings(ns, fb);
      },
      save: function (obj) {
        saveSettings(ns, obj);
      }
    };
  }

  function bindSettingsForm(root, key, defaults) {
    root = root || document;
    var cur = Object.assign({}, defaults || {}, loadSettings(key, {}));
    root.querySelectorAll("[data-set]").forEach(function (el) {
      var k = el.getAttribute("data-set");
      if (!k) return;
      if (el.type === "checkbox") el.checked = !!cur[k];
      else if (cur[k] != null) el.value = cur[k];
      el.addEventListener("change", function () {
        var s = loadSettings(key, {});
        if (el.type === "checkbox") s[k] = el.checked;
        else if (el.type === "number") s[k] = Number(el.value);
        else s[k] = el.value;
        saveSettings(key, s);
      });
    });
    return cur;
  }

  function enhanceTable(table, filterInput) {
    if (!table) return;
    try {
      if (window.TarkovTools && TarkovTools.enhanceTable && TarkovTools.enhanceTable !== enhanceTable) {
        return TarkovTools.enhanceTable(table, filterInput);
      }
    } catch (e) {}
  }

  var progressAPI = {
    start: function (label) {
      var w = document.getElementById("progressWrap") || document.getElementById("tt-progress");
      if (w) {
        w.classList.add("on");
        w.style.display = "block";
      }
      this.set(0, label);
    },
    set: function (pct, label) {
      var bar = document.getElementById("progressBar");
      var lab = document.getElementById("progressLabel");
      if (bar) bar.style.width = Math.max(0, Math.min(100, Number(pct) || 0)) + "%";
      if (lab && label != null) lab.textContent = label;
    },
    done: function (label) {
      this.set(100, label || "");
      var w = document.getElementById("progressWrap") || document.getElementById("tt-progress");
      if (w)
        setTimeout(function () {
          w.classList.remove("on");
          w.style.display = "none";
        }, 400);
    },
    fail: function (label) {
      var lab = document.getElementById("progressLabel");
      if (lab) lab.textContent = label || "Error";
    }
  };

  function helpModal(opts) {
    opts = opts || {};
    var id = "tt-help-modal";
    var bg = document.getElementById(id);
    if (!bg) {
      bg = document.createElement("div");
      bg.id = id;
      bg.className = "modal-bg";
      bg.style.cssText =
        "display:flex;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:300;padding:16px";
      bg.innerHTML =
        '<div class="modal" style="max-width:min(520px,94vw);max-height:80vh;overflow:auto;background:var(--card,#171a21);border:1px solid var(--border,#2a2f3a);border-radius:12px;padding:16px 18px;color:var(--text,#e8eaed)">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:12px"><h2 id="tt-ui-help-title" style="margin:0;font-size:1.15rem"></h2>' +
        '<button type="button" class="btn-ghost" id="tt-ui-help-x" style="min-width:36px!important;padding:0 10px">\u00d7</button></div>' +
        '<div id="tt-ui-help-body" style="color:var(--muted,#8b919a);line-height:1.5;font-size:.95rem"></div></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) {
        if (e.target === bg) bg.style.display = "none";
      });
      document.getElementById("tt-ui-help-x").onclick = function () {
        bg.style.display = "none";
      };
    }
    document.getElementById("tt-ui-help-title").textContent = opts.title || "Help";
    var bodyEl = document.getElementById("tt-ui-help-body");
    bodyEl.innerHTML = String(opts.body || "")
      .split(/\n\n+/)
      .map(function (p) {
        return "<p style=\"margin:0 0 10px\">" + esc(p).replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
    bg.style.display = "flex";
  }

  function toolHelpFromI18n(id) {
    var title = id,
      body = "";
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var th = TarkovI18n.t("tool." + id + ".title");
        var hh = TarkovI18n.t("tool." + id + ".help");
        var dh = TarkovI18n.t("tool." + id + ".description");
        if (th && th.indexOf("tool.") !== 0) title = th;
        if (hh && hh.indexOf("tool.") !== 0) body = hh;
        else if (dh && dh.indexOf("tool.") !== 0) body = dh;
      }
    } catch (e) {}
    return { title: title, body: body };
  }

  function attachHelpButton() {}
  function toolHeader() {}

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
  if (!global.esc) global.esc = esc;
  if (!global.formatNum) global.formatNum = fmtNum;
  if (!global.fleaTax) global.fleaTax = fleaTax;
  if (!global.fleaNet) global.fleaNet = fleaNet;
  if (!global.loadSettings) global.loadSettings = loadSettings;
  if (!global.saveSettings) global.saveSettings = saveSettings;
})(window);
