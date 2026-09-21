(function () {
  "use strict";
  var RUN_KEY = "tarkovPriceAlarmRunning";
  var RULES_KEY = "tarkovPriceAlarmRules";
  var TOOL = "tarkovtool-price-alarm.html";
  var catalog = [];
  var timer = null;
  var fired = {};
  var checkInFlight = null;

  function itemName(it) {
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    if (!it) return "";
    if (typeof it === "string") return it;
    return it.shortName || it.name || it.id || "";
  }

  function status(msg, ok) {
    var el = document.getElementById("status");
    if (!el) return;
    el.className = "status " + (ok === false ? "err" : (ok ? "ok" : ""));
    el.textContent = msg || "";
  }

  function loadRules() {
    return TarkovStorage.getJson(RULES_KEY, []) || [];
  }
  function saveRules(rules) {
    try { TarkovStorage.setJson(RULES_KEY, rules); } catch (e) {}
  }
  function readRun() {
    return TarkovStorage.getJson(RUN_KEY, {}) || {};
  }
  function writeRun(o) {
    try { TarkovStorage.setJson(RUN_KEY, o); } catch (e) {}
  }

  function reportMini(running, label) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: "tt-status",
          tool: TOOL,
          running: !!running,
          ready: true,
          label: label || ""
        }, location.origin);
      }
    } catch (e) {}
  }

  async function loadCatalog() {
    var mode = (document.getElementById("gameMode") || {}).value || "pve";
    catalog = await TarkovAPI.items(mode);
    if (!Array.isArray(catalog)) catalog = [];
  }

  function priceOf(it) {
    return {
      avg: Number(it.avg24hPrice) || 0,
      low: Number(it.lastLowPrice) || Number(it.low24hPrice) || 0,
      offers: Number(it.offerCount) || Number(it.offers) || 0
    };
  }

  function matchItem(rule) {
    var q = (rule.q || "").toLowerCase().trim();
    if (!q) return null;
    for (var i = 0; i < catalog.length; i++) {
      var it = catalog[i];
      if (!it) continue;
      var id = String(it.id || "");
      var name = itemName(it).toLowerCase();
      if (id === q || name.indexOf(q) >= 0 || String(it.normalizedName || "").toLowerCase().indexOf(q) >= 0) {
        return it;
      }
    }
    return null;
  }

  function evalRule(rule, it) {
    var p = priceOf(it);
    var val = rule.metric === "low" ? p.low : (rule.metric === "offers" ? p.offers : p.avg);
    var thr = Number(rule.threshold) || 0;
    if (rule.op === ">=") return val >= thr;
    return val <= thr;
  }

  function notifyHit(h) {
    var title = "Price Alarm";
    var body = itemName(h.it) + " " + (h.rule.op || "<=") + " " + h.rule.threshold;
    try {
      if (typeof Notify === "function") {
        Notify({ title: title, body: body, tool: TOOL, kind: "alarm" });
        return;
      }
    } catch (e) {}
    try {
      if (window.TarkovTools && TarkovTools.Notify) {
        TarkovTools.Notify({ title: title, body: body, tool: TOOL, kind: "alarm" });
        return;
      }
    } catch (e) {}
    try {
      if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("alarm");
      if (window.TarkovState && TarkovState.notify) {
        TarkovState.notify({ title: title, body: body, tool: TOOL, kind: "alarm" });
      }
    } catch (e) {}
  }

  async function checkOnce() {
    if (checkInFlight) return checkInFlight;
    checkInFlight = doCheckOnce().finally(function () { checkInFlight = null; });
    return checkInFlight;
  }

  async function doCheckOnce() {
    await loadCatalog();
    var rules = loadRules();
    var hits = [];
    rules.forEach(function (rule, idx) {
      if (!rule || !rule.q) return;
      var it = matchItem(rule);
      if (!it) return;
      if (evalRule(rule, it)) {
        var key = idx + ":" + (it.id || rule.q);
        if (!fired[key]) {
          fired[key] = true;
          hits.push({ rule: rule, it: it, p: priceOf(it) });
        }
      } else {
        var clearKey = idx + ":" + (it.id || rule.q);
        delete fired[clearKey];
      }
    });
    hits.forEach(notifyHit);
    status("Check: " + catalog.length + " items, hits " + hits.length, true);
    var run = readRun();
    if (run.on) {
      reportMini(true, hits.length ? ("hits " + hits.length) : "ok");
    } else {
      reportMini(false, "idle");
    }
    return hits;
  }
  window.__ttAlarmCheck = checkOnce;

  function renderRules() {
    var box = document.getElementById("rules");
    if (!box) return;
    var rules = loadRules();
    if (!rules.length) {
      box.innerHTML = "<p class=meta>No rules</p>";
      return;
    }
    box.innerHTML = rules.map(function (r, i) {
      return '<div class="row" style="gap:8px;margin:6px 0;flex-wrap:wrap;align-items:center">' +
        '<input data-i="' + i + '" data-k="q" value="' + String(r.q || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '" placeholder="name or id" style="flex:1;min-width:120px">' +
        '<select data-i="' + i + '" data-k="metric">' +
        '<option value="avg"' + (r.metric !== "low" && r.metric !== "offers" ? " selected" : "") + '>avg</option>' +
        '<option value="low"' + (r.metric === "low" ? " selected" : "") + '>low</option>' +
        '<option value="offers"' + (r.metric === "offers" ? " selected" : "") + '>offers</option></select>' +
        '<select data-i="' + i + '" data-k="op">' +
        '<option value="<="' + (r.op !== ">=" ? " selected" : "") + '>&lt;=</option>' +
        '<option value=">="' + (r.op === ">=" ? " selected" : "") + '>&gt;=</option></select>' +
        '<input type="number" data-i="' + i + '" data-k="threshold" value="' + (r.threshold || 0) + '" style="width:100px">' +
        '<button type="button" class="btn-ghost" data-del="' + i + '">\u00d7</button></div>';
    }).join("");
    box.querySelectorAll("input,select").forEach(function (el) {
      el.onchange = el.oninput = function () {
        var rules = loadRules();
        var i = Number(el.getAttribute("data-i"));
        var k = el.getAttribute("data-k");
        if (!rules[i] || !k) return;
        rules[i][k] = el.type === "number" ? Number(el.value) : el.value;
        saveRules(rules);
      };
    });
    box.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.onclick = function () {
        var rules = loadRules();
        rules.splice(Number(btn.getAttribute("data-del")), 1);
        saveRules(rules);
        renderRules();
      };
    });
  }

  function startBg() {
    var mins = Math.max(1, Number((document.getElementById("interval") || {}).value) || 5);
    if (document.getElementById("interval")) document.getElementById("interval").value = mins;
    var mode = (document.getElementById("gameMode") || {}).value || "pve";
    writeRun({ on: true, mins: mins, mode: mode, startedAt: Date.now() });
    if (window.TarkovPoll) {
      TarkovPoll.start("price-alarm", mins, function () { return checkOnce(); }, { fireNow: true, label: "price-alarm" });
      var cd = document.getElementById("countdown");
      if (cd) TarkovPoll.bindCountdown(cd, "price-alarm");
    } else {
      if (timer) clearInterval(timer);
      timer = setInterval(function () {
        checkOnce().catch(function (e) { status(String(e.message || e), false); });
      }, mins * 60 * 1000);
    }
    status("BG every " + mins + " min", true);
    reportMini(true, "every " + mins + "m");
    checkOnce().catch(function (e) { status(String(e.message || e), false); });
  }

  function stopBg() {
    if (timer) { clearInterval(timer); timer = null; }
    try { if (window.TarkovPoll) TarkovPoll.stop("price-alarm"); } catch (e) {}
    var prev = readRun();
    writeRun({ on: false, mins: prev.mins, mode: prev.mode });
    status("Stopped", true);
    reportMini(false, "idle");
  }

  function boot() {
    renderRules();
    var add = document.getElementById("addRule");
    if (add) add.onclick = function () {
      var rules = loadRules();
      rules.push({ q: "", metric: "avg", op: "<=", threshold: 0 });
      saveRules(rules);
      renderRules();
    };
    if (document.getElementById("startBtn")) document.getElementById("startBtn").onclick = startBg;
    if (document.getElementById("stopBtn")) document.getElementById("stopBtn").onclick = stopBg;
    if (document.getElementById("checkBtn")) {
      document.getElementById("checkBtn").onclick = function () {
        checkOnce().catch(function (e) { status(String(e.message || e), false); });
      };
    }
    window.addEventListener("message", function (ev) {
      if (ev.origin !== location.origin) return;
      if (ev.data && ev.data.type === "tt-ping-status") {
        var run = readRun();
        reportMini(!!run.on, run.on ? ("every " + (run.mins || "?") + "m") : "idle");
      }
    });
    try {
      var run = readRun();
      if (run.mins && document.getElementById("interval")) document.getElementById("interval").value = run.mins;
      if (run.mode && document.getElementById("gameMode")) document.getElementById("gameMode").value = run.mode;
      if (run.on) startBg();
      else reportMini(false, "idle");
    } catch (e) {
      reportMini(false, "idle");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
