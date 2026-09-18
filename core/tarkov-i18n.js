/*! Tarkov Tools i18n — locale packs + completion % (Prism-style) */
(function (global) {
  const STORAGE_KEY = "tarkovLang";
  const BASE = "en";
  const KNOWN = ["en", "ru", "uk", "de", "zh-CN"];

  const cache = Object.create(null);
  let current = null;
  let ready = null;
  const listeners = [];

  function flatten(obj, prefix, acc) {
    acc = acc || Object.create(null);
    if (!obj || typeof obj !== "object") return acc;
    Object.keys(obj).forEach(function (k) {
      if (k === "_meta") return;
      const path = prefix ? prefix + "." + k : k;
      const v = obj[k];
      if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, path, acc);
      else acc[path] = v == null ? "" : String(v);
    });
    return acc;
  }

  function getByPath(obj, path) {
    if (!obj) return undefined;
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, params) {
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, function (_, k) {
      return params[k] != null ? String(params[k]) : "{" + k + "}";
    });
  }

  function normalizeCode(code) {
    if (!code) return BASE;
    const c = String(code).trim();
    if (KNOWN.indexOf(c) >= 0) return c;
    const lower = c.toLowerCase();
    if (lower === "zh" || lower === "zh-cn" || lower === "zh_cn") return "zh-CN";
    if (KNOWN.indexOf(lower) >= 0) return lower;
    const short = lower.split(/[-_]/)[0];
    if (KNOWN.indexOf(short) >= 0) return short;
    return BASE;
  }

  function loadLocale(code) {
    code = normalizeCode(code);
    if (cache[code]) return Promise.resolve(cache[code]);
    const url = (location.pathname.indexOf('/tools/')>=0?'../locales/':'locales/') + "" + code + ".json";
    return fetch(url, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("locale " + code + " " + r.status);
        return r.json();
      })
      .then(function (data) {
        cache[code] = data;
        return data;
      })
      .catch(function () {
        if (code === BASE) {
          cache[BASE] = { _meta: { code: BASE, name: "English", nativeName: "English" } };
          return cache[BASE];
        }
        return loadLocale(BASE);
      });
  }

  function completeness(code) {
    code = normalizeCode(code);
    const baseFlat = flatten(cache[BASE] || {});
    const total = Object.keys(baseFlat).length || 1;
    if (code === BASE) return { code: code, done: total, total: total, pct: 100 };
    const locFlat = flatten(cache[code] || {});
    let done = 0;
    Object.keys(baseFlat).forEach(function (k) {
      if (locFlat[k] != null && String(locFlat[k]).length > 0) done++;
    });
    return {
      code: code,
      done: done,
      total: total,
      pct: Math.round((100 * done) / total)
    };
  }

  function listLocales() {
    return KNOWN.map(function (code) {
      const data = cache[code];
      const meta = (data && data._meta) || { code: code, name: code, nativeName: code };
      const c = completeness(code);
      return {
        code: code,
        name: meta.name || code,
        nativeName: meta.nativeName || meta.name || code,
        done: c.done,
        total: c.total,
        pct: c.pct
      };
    });
  }

  function t(key, params) {
    if (!key) return "";
    const lang = current || BASE;
    let val = getByPath(cache[lang], key);
    if (val == null || val === "") val = getByPath(cache[BASE], key);
    if (val == null || val === "") {
      if (key.indexOf(".") < 0) {
        val = getByPath(cache[lang], "common." + key);
        if (val == null || val === "") val = getByPath(cache[BASE], "common." + key);
      }
    }
    if (val == null || val === "") return key;
    return interpolate(val, params);
  }

  function toolIdFromFile(file) {
    return String(file || "")
      .replace(/^tarkovtool-/, "")
      .replace(/\.html$/, "");
  }

  function toolTitle(file) {
    return t("tool." + toolIdFromFile(file) + ".title");
  }

  function toolDesc(file) {
    return t("tool." + toolIdFromFile(file) + ".description");
  }

  function catTitle(id) {
    return t("cat." + id);
  }

  function applyDom(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const attr = el.getAttribute("data-i18n-attr");
      const text = t(key);
      if (attr) el.setAttribute(attr, text);
      else el.textContent = text;
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    root.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
  }

  function setLang(code, opts) {
    code = normalizeCode(code);
    opts = opts || {};
    return loadLocale(BASE)
      .then(function () {
        return loadLocale(code);
      })
      .then(function () {
        current = code;
        try {
          localStorage.setItem(STORAGE_KEY, code);
        } catch (e) {}
        try {
          document.documentElement.lang = code === "zh-CN" ? "zh-CN" : code;
        } catch (e) {}
        applyDom(document);
        listeners.forEach(function (fn) {
          try {
            fn(code);
          } catch (e) {}
        });
        return code;
      });
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function () {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function storedLang() {
    try {
      return normalizeCode(localStorage.getItem(STORAGE_KEY) || "ru");
    } catch (e) {
      return "ru";
    }
  }

  function init() {
    if (ready) return ready;
    const want = storedLang();
    ready = loadLocale(BASE)
      .then(function () {
        return Promise.all(
          KNOWN.map(function (c) {
            return loadLocale(c).catch(function () {});
          })
        );
      })
      .then(function () {
        return setLang(want);
      });
    return ready;
  }

  const api = {
    BASE: BASE,
    KNOWN: KNOWN.slice(),
    init: init,
    t: t,
    setLang: setLang,
    lang: function () {
      return current || storedLang();
    },
    listLocales: listLocales,
    completeness: completeness,
    applyDom: applyDom,
    onChange: onChange,
    toolTitle: toolTitle,
    toolDesc: toolDesc,
    catTitle: catTitle,
    toolIdFromFile: toolIdFromFile,
    ready: function () {
      return ready || init();
    }
  };

  global.TarkovI18n = api;
  global.t = function (key, params) {
    return api.t(key, params);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);
