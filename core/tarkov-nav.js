/*! TarkovNav — cross-tool context (item → quest → …) R-2 */
(function (global) {
  "use strict";
  if (global.TarkovNav && global.TarkovNav.__v >= 1) return;

  var KEY = "tt:nav:context";
  var CHANNEL = "tarkov-tools-nav";

  function storage() {
    try {
      if (global.TarkovStorage && TarkovStorage.getJson) return TarkovStorage;
    } catch (e) {}
    return null;
  }

  function read() {
    try {
      var s = storage();
      if (s) return s.getJson(KEY, null);
      return JSON.parse(sessionStorage.getItem(KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function write(ctx) {
    try {
      var s = storage();
      if (s && s.setJson) s.setJson(KEY, ctx);
      else sessionStorage.setItem(KEY, JSON.stringify(ctx));
    } catch (e) {}
    try {
      if (typeof BroadcastChannel !== "undefined") {
        var bc = new BroadcastChannel(CHANNEL);
        bc.postMessage({ type: "nav", context: ctx });
        bc.close();
      }
    } catch (e2) {}
  }

  /**
   * @param {object} partial
   *  type: 'item'|'quest'|'trader'|'map'|'build'|string
   *  id: string
   *  name?: string
   *  from?: string tool id
   *  extra?: object
   */
  function set(partial) {
    if (!partial || !partial.type) return null;
    var ctx = {
      type: String(partial.type),
      id: partial.id != null ? String(partial.id) : "",
      name: partial.name || "",
      from: partial.from || "",
      extra: partial.extra || {},
      at: Date.now()
    };
    write(ctx);
    return ctx;
  }

  function get() {
    return read();
  }

  /** Read and optionally clear (default: keep). */
  function consume(opts) {
    opts = opts || {};
    var ctx = read();
    if (opts.clear) clear();
    return ctx;
  }

  function clear() {
    write(null);
    try { sessionStorage.removeItem(KEY); } catch (e) {}
  }

  function openTool(file, partial) {
    if (partial) set(Object.assign({ from: partial.from || "" }, partial));
    var href = file;
    if (partial && partial.id) {
      var q = "ttType=" + encodeURIComponent(partial.type || "") +
        "&ttId=" + encodeURIComponent(partial.id || "");
      href += (file.indexOf("?") >= 0 ? "&" : "?") + q;
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "tt-open-tool", file: file, context: partial || null }, "*");
      }
    } catch (e) {}
    location.href = href;
  }

  /** Apply ?ttType=&ttId= into storage once on load. */
  function bootstrapFromQuery() {
    try {
      var u = new URL(location.href);
      var type = u.searchParams.get("ttType");
      var id = u.searchParams.get("ttId");
      if (type && id) {
        set({ type: type, id: id, from: "query" });
        u.searchParams.delete("ttType");
        u.searchParams.delete("ttId");
        history.replaceState({}, "", u.pathname + u.search + u.hash);
      }
    } catch (e) {}
  }

  bootstrapFromQuery();

  global.TarkovNav = {
    __v: 1,
    set: set,
    get: get,
    consume: consume,
    clear: clear,
    openTool: openTool
  };
})(typeof window !== "undefined" ? window : globalThis);
