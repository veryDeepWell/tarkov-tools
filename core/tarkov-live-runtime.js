/*! TarkovLiveRuntime — hub owns the clock for live tool polls.
 * Source of truth: TarkovStorage tarkovPoll.<id> (same as TarkovPoll).
 * Hub: setInterval → when nextAt due → postMessage tt-poll-fire to tool iframe.
 * Tool iframe: TarkovPoll holds onFire and runs work (timers not armed under hub).
 */
(function (global) {
  "use strict";
  if (global.TarkovLiveRuntime && global.TarkovLiveRuntime._ready) return;

  var PREFIX = "tarkovPoll.";
  var tickIv = null;
  var inFlight = Object.create(null);
  var _tickN = 0;

  function readPoll(id) {
    try {
      if (global.TarkovPoll && TarkovPoll.read) return TarkovPoll.read(id);
    } catch (e) {}
    try {
      return JSON.parse(localStorage.getItem(PREFIX + id) || "null") || null;
    } catch (e2) {
      return null;
    }
  }

  function writePoll(id, obj) {
    try {
      if (global.TarkovPoll && TarkovPoll.write) {
        TarkovPoll.write(id, obj);
        return;
      }
    } catch (e) {}
    try {
      if (!obj) localStorage.removeItem(PREFIX + id);
      else localStorage.setItem(PREFIX + id, JSON.stringify(obj));
    } catch (e2) {}
  }

  function toolFileForPoll(id) {
    try {
      if (global.TarkovToolKind && TarkovToolKind.fileForPollId) {
        var f = TarkovToolKind.fileForPollId(id);
        if (f) return f;
      }
    } catch (e) {}
    var st = readPoll(id);
    return (st && st.tool) || null;
  }

  /** Resolve iframe for a tool file. Prefer hub map (window.__ttHubFrames), else DOM. */
  function findFrame(file) {
    if (!file) return null;
    try {
      var map = global.__ttHubFrames;
      if (map && map[file]) return map[file];
      var base0 = String(file).split("/").pop();
      if (map && map[base0]) return map[base0];
    } catch (e) {}
    var pool = document.getElementById("framePool");
    if (!pool) return null;
    var list = pool.querySelectorAll("iframe");
    var base = String(file).split("/").pop();
    for (var i = 0; i < list.length; i++) {
      var ifr = list[i];
      var t = ifr.dataset.tool || ifr.getAttribute("data-tool") || "";
      var src = ifr.getAttribute("src") || "";
      if (t === file || t === base || src.indexOf(base) >= 0 || t.indexOf(base) >= 0) return ifr;
    }
    return null;
  }

  function postToTool(file, msg) {
    var ifr = findFrame(file);
    if (!ifr || !ifr.contentWindow) return false;
    try {
      ifr.contentWindow.postMessage(msg, location.origin);
      return true;
    } catch (e) {
      return false;
    }
  }

  function knownPollIds() {
    var ids = [];
    try {
      if (global.TarkovToolKind && TarkovToolKind.liveEntries) {
        TarkovToolKind.liveEntries().forEach(function (e) {
          if (e.pollId) ids.push(e.pollId);
        });
      }
    } catch (e) {}
    if (!ids.length) ids = ["price-track", "price-alarm", "restock"];
    return ids;
  }

  function tick() {
    var now = Date.now();
    var ids = knownPollIds();
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (inFlight[id]) continue;
      var st = readPoll(id);
      if (!st || !st.on || !st.nextAt) continue;
      var nextAt = Number(st.nextAt) || 0;
      if (nextAt > now) continue;

      var file = st.tool || toolFileForPoll(id);
      if (!file) continue;
      var ifr = findFrame(file);
      if (!ifr) continue; // tool not loaded in hub yet

      inFlight[id] = true;
      var sent = postToTool(file, {
        type: "tt-poll-fire",
        pollId: id,
        ts: now
      });
      if (!sent) {
        delete inFlight[id];
        continue;
      }
      // Safety: clear inFlight if tool never acks (max 120s)
      (function (pollId) {
        setTimeout(function () {
          delete inFlight[pollId];
        }, 120000);
      })(id);
    }

    // Unified 1s loop: keepalive tt-tick (+ occasional status ping) for live iframes
    broadcastUiTicks();
  }

  function isLiveFile(file) {
    try {
      if (global.TarkovToolKind && TarkovToolKind.isLive) return TarkovToolKind.isLive(file);
    } catch (e) {}
    var base = String(file || "").split("/").pop();
    return /price-track|price-alarm|restock/i.test(base);
  }

  function broadcastUiTicks() {
    _tickN++;
    var ping = (_tickN % 15) === 0;
    var map = null;
    try { map = global.__ttHubFrames; } catch (e) {}
    if (!map) return;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      var f = keys[i];
      if (!isLiveFile(f)) continue;
      var ifr = map[f];
      if (!ifr || !ifr.contentWindow) continue;
      try {
        ifr.contentWindow.postMessage({ type: "tt-tick", ts: Date.now() }, location.origin);
        if (ping) ifr.contentWindow.postMessage({ type: "tt-ping-status", ts: Date.now() }, location.origin);
      } catch (e2) {}
    }
  }

  function onMessage(ev) {
    if (ev.origin !== location.origin) return;
    var d = ev.data;
    if (!d || typeof d !== "object") return;

    if (d.type === "tt-poll-register") {
      // Tool registered; ensure next tick can see storage state
      try {
        if (global.TarkovPoll && TarkovPoll.paintAll) TarkovPoll.paintAll();
      } catch (e) {}
      return;
    }

    if (d.type === "tt-poll-done") {
      var id = d.pollId;
      if (id) delete inFlight[id];
      return;
    }

    if (d.type === "tt-poll-stop") {
      var id2 = d.pollId;
      if (id2) delete inFlight[id2];
      return;
    }
  }

  function start() {
    if (tickIv) return;
    try {
      global.addEventListener("message", onMessage);
    } catch (e) {}
    tickIv = setInterval(tick, 1000);
    // tt-tick / tt-ping-status broadcast from tick() — single 1s loop (P1)
  }

  function stop() {
    if (tickIv) {
      clearInterval(tickIv);
      tickIv = null;
    }
  }

  global.TarkovLiveRuntime = {
    _ready: true,
    start: start,
    stop: stop,
    tick: tick,
    readPoll: readPoll,
    findFrame: findFrame
  };

  // Auto-start when DOM ready on hub
  function boot() {
    if (!document.getElementById("framePool")) return;
    start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else setTimeout(boot, 0);
  setTimeout(boot, 500);
})(window);
