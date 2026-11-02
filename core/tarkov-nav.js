/*! TarkovNav — cross-tool context (item → quest → …) R-2 */
(function (global) {
  "use strict";
  if (global.TarkovNav && global.TarkovNav.__v >= 1) return;

  var KEY = "tt:nav:context";
  var CHANNEL = "tarkov-tools-nav";
  var pageContext = null;
  var routes = Object.freeze({ item: "tarkovtool-item-card.html", quest: "tarkovtool-quests.html", craft: "tarkovtool-crafts.html", barter: "tarkovtool-barter-opt.html", station: "tarkovtool-hideout.html", map: "tarkovtool-map.html", trader: "tarkovtool-trader-flip.html" });

  function entityHref(type, reference) {
    if (!routes[type]) throw Error("Unsupported navigation entity: " + type);
    var entityId = global.TarkovData ? TarkovData.id(reference) : String(reference || "");
    if (!entityId) throw Error("Navigation requires an entity ID");
    var prefix = /\/tools\//.test(location.pathname) ? "" : "tools/";
    var url = href(prefix + routes[type], type, entityId);
    return type === "item" ? url + "&item=" + encodeURIComponent(entityId) : url;
  }

  function href(file, type, id) {
    return file + (file.indexOf("?") >= 0 ? "&" : "?") + "ttType=" + encodeURIComponent(type) + "&ttId=" + encodeURIComponent(id);
  }

  function current(type) { return pageContext && (!type || pageContext.type === type) ? pageContext : null; }

  function matches(row) {
    var ctx = current();
    if (!ctx) return true;
    if (ctx.type === "quest") return row.id === ctx.id;
    if (ctx.type === "craft") return row.craftKey === ctx.id;
    if (ctx.type === "barter") return row.barterKey === ctx.id;
    if (ctx.type === "item") return [row.id, row.itemId, row.productId].indexOf(ctx.id) >= 0;
    return true;
  }

  function storage() {
    try {
      if (global.TarkovStorage && TarkovStorage.getJson) return TarkovStorage;
    } catch (e) { try { console.debug && console.debug("[tt:nav]", e); } catch (_tt) { /* ignore */ } }
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
    } catch (e) { try { console.debug && console.debug("[tt:nav]", e); } catch (_tt) { /* ignore */ } }
    try {
      if (typeof BroadcastChannel !== "undefined") {
        var bc = new BroadcastChannel(CHANNEL);
        bc.postMessage({ type: "nav", context: ctx });
        bc.close();
      }
    } catch (e2) { try { console.debug && console.debug("[tt:nav]", e2); } catch (_tt) { /* ignore */ } }
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
    pageContext = null;
    try {
      var url = new URL(location.href);
      url.searchParams.delete("ttType"); url.searchParams.delete("ttId");
      history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (eUrl) {}
    write(null);
    try { sessionStorage.removeItem(KEY); } catch (e) { try { console.debug && console.debug("[tt:nav]", e); } catch (_tt) { /* ignore */ } }
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
        if (window.parent.__ttHubFrames) {
          window.parent.postMessage({ type: "tt-open-tool", file: href, context: partial || null }, location.origin);
          return;
        }
      }
    } catch (e) { try { console.debug && console.debug("[tt:nav]", e); } catch (_tt) { /* ignore */ } }
    location.href = href;
  }

  /** Apply ?ttType=&ttId= into storage once on load. */
  function bootstrapFromQuery() {
    try {
      var u = new URL(location.href);
      var type = u.searchParams.get("ttType");
      var id = u.searchParams.get("ttId");
      if (type && id) {
        pageContext = set({ type: type, id: id, from: "query" });
      }
    } catch (e) { try { console.debug && console.debug("[tt:nav]", e); } catch (_tt) { /* ignore */ } }
  }

  bootstrapFromQuery();

  global.TarkovNav = {
    __v: 1,
    set: set,
    get: get,
    consume: consume,
    clear: clear,
    openTool: openTool,
    href: href, entityHref: entityHref, current: current, matches: matches
  };
  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    var a = event.target.closest && event.target.closest("a[href]");
    if (!a) return;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin || !u.searchParams.get("ttId")) return;
    event.preventDefault();
    openTool(a.getAttribute("href"));
  });
  document.addEventListener("DOMContentLoaded", function () {
    if (!current()) return;
    var button = document.createElement("button");
    button.type = "button"; button.className = "btn-ghost";
    button.textContent = "Показать всё — убрать фильтр перехода";
    button.addEventListener("click", function () { clear(); button.remove(); if (typeof window.render === "function") window.render(); });
    document.body.prepend(button);
    var load = document.getElementById("loadBtn");
    if (load) load.click();
  });
})(typeof window !== "undefined" ? window : globalThis);
