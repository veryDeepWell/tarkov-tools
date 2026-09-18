/*! TarkovUI — shared formatters, flea tax, settings store, table helpers */
(function (global) {
  "use strict";
  if (global.TarkovUI && global.TarkovUI.__v) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
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

  /**
   * Official-ish flea market tax (BSG formula used across tools).
   * @param {number} basePrice - handbook / base
   * @param {number} offerPrice - listing price per unit
   * @param {number} [count=1]
   * @param {{intelCenter3?:boolean, hmLvl?:number}} [opts]
   */
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

  function saveSettings(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {}
  }

  /**
   * Namespaced settings helper.
   * settingsStore('tarkovBarterLiveSettings', { commission: 0 })
   *   .get() / .set(partial) / .getKey(k) / .setKey(k,v) / .reset()
   */
  function settingsStore(namespace, defaults) {
    defaults = defaults || {};
    var key = String(namespace || "tarkovSettings");
    return {
      key: key,
      defaults: defaults,
      get: function () { return loadSettings(key, defaults); },
      set: function (partial) {
        var next = Object.assign({}, loadSettings(key, defaults), partial || {});
        saveSettings(key, next);
        return next;
      },
      getKey: function (k) { return loadSettings(key, defaults)[k]; },
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

  /** Debounced bind: read form fields by id → store on input/change */
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

  global.TarkovUI = {
    __v: 1,
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
    table: enhanceTable
  };

  // Legacy aliases used inside tools
  if (!global.escapeHtml) global.escapeHtml = esc;
  if (!global.formatNum) global.formatNum = fmtNum;
  if (!global.fleaTax) global.fleaTax = fleaTax;
  if (!global.fleaNet) global.fleaNet = fleaNet;
})(window);
