(function () {
  "use strict";
  var POLL_ID = "price-alarm";
  var RULES_KEY = "tarkovPriceAlarmRules";
  var TOOL = "tarkovtool-price-alarm.html";
  var catalog = [];
  var fired = {};

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "&#39;");
  }

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
    el.className = "status " + (ok === false ? "err" : ok ? "ok" : "");
    el.textContent = msg || "";
  }

  function loadRules() {
    try {
      if (window.TarkovStorage && TarkovStorage.getJson) {
        var r = TarkovStorage.getJson(RULES_KEY, null);
        if (Array.isArray(r)) return r;
      }
    } catch (e) {}
    try {
      return JSON.parse(localStorage.getItem(RULES_KEY) || "[]") || [];
    } catch (e2) {
      return [];
    }
  }

  function saveRules(rules) {
    var ok = false;
    try {
      if (window.TarkovStorage && TarkovStorage.setJson) {
        ok = !!TarkovStorage.setJson(RULES_KEY, rules);
      }
    } catch (e) {}
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(rules));
      ok = true;
    } catch (e2) {}
    return ok;
  }

  function progress() {
    return (window.TarkovUI && TarkovUI.progress) || null;
  }

  function reportMini(running, label) {
    if (window.TarkovPoll && TarkovPoll.reportMini) {
      TarkovPoll.reportMini(TOOL, running, label);
      return;
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "tt-status",
            tool: TOOL,
            running: !!running,
            ready: true,
            label: label || ""
          },
          location.origin
        );
      }
    } catch (e) {}
  }

  async function loadCatalog() {
    var mode = (document.getElementById("gameMode") || {}).value || "pve";
    if (!window.TarkovAPI || !TarkovAPI.items) {
      throw new Error("TarkovAPI missing");
    }
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
      if (
        id === q ||
        name.indexOf(q) >= 0 ||
        String(it.normalizedName || "")
          .toLowerCase()
          .indexOf(q) >= 0
      ) {
        return it;
      }
    }
    return null;
  }

  function evalRule(rule, it) {
    var p = priceOf(it);
    var val =
      rule.metric === "low"
        ? p.low
        : rule.metric === "offers"
          ? p.offers
          : p.avg;
    var thr = Number(rule.threshold) || 0;
    if (rule.op === ">=") return val >= thr;
    return val <= thr;
  }

  function notifyHit(h) {
    var title = "Price Alarm";
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var t = TarkovI18n.t("priceAlarm.notifTitle");
        if (t && t !== "priceAlarm.notifTitle") title = t;
      }
    } catch (e) {}
    var body =
      itemName(h.it) + " " + (h.rule.op || "<=") + " " + h.rule.threshold;
    try {
      if (typeof Notify === "function") {
        Notify({ title: title, body: body, tool: TOOL, kind: "alarm" });
        return;
      }
      if (window.TarkovTools && TarkovTools.Notify) {
        TarkovTools.Notify({ title: title, body: body, tool: TOOL, kind: "alarm" });
      }
    } catch (e) {}
  }

  async function checkOnce() {
    var P = progress();
    try {
      if (P && P.start) P.start({ label: "…" });
      if (P && P.set) P.set(10, "…");
      await loadCatalog();
      if (P && P.set) P.set(55, String(catalog.length));
      var rules = loadRules();
      var hits = [];
      var n = rules.length || 1;
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
          delete fired[idx + ":" + (it.id || rule.q)];
        }
        if (P && P.set) {
          var pct = 55 + Math.floor(((idx + 1) / n) * 40);
          pct = Math.min(95, Math.round(pct / 5) * 5);
          P.set(pct);
        }
      });
      hits.forEach(notifyHit);
      if (P && P.done) P.done();
      status(
        "Check: " + catalog.length + " items, hits " + hits.length,
        true
      );
      var st = window.TarkovPoll ? TarkovPoll.status(POLL_ID) : { on: false };
      if (st.on) {
        reportMini(true, hits.length ? "hits " + hits.length : "ok");
      } else {
        reportMini(false, "idle");
      }
      return hits;
    } catch (e) {
      if (P && P.fail) P.fail(String(e.message || e));
      throw e;
    }
  }
  window.__ttAlarmCheck = checkOnce;

  function renderRules() {
    var box = document.getElementById("rules");
    if (!box) return;
    var rules = loadRules();
    if (!rules.length) {
      box.innerHTML = '<p class="meta">No rules</p>';
      return;
    }
    box.innerHTML = rules
      .map(function (r, i) {
        return (
          '<div class="row" style="gap:8px;margin:6px 0;flex-wrap:wrap;align-items:center">' +
          '<input data-i="' +
          i +
          '" data-k="q" value="' +
          esc(r.q || "") +
          '" placeholder="name or id" style="flex:1;min-width:120px">' +
          '<select data-i="' +
          i +
          '" data-k="metric">' +
          '<option value="avg"' +
          (r.metric !== "low" && r.metric !== "offers" ? " selected" : "") +
          ">avg</option>' +
          '<option value="low"' +
          (r.metric === "low" ? " selected" : "") +
          ">low</option>' +
          '<option value="offers"' +
          (r.metric === "offers" ? " selected" : "") +
          ">offers</option></select>' +
          '<select data-i="' +
          i +
          '" data-k="op">' +
          '<option value="<="' +
          (r.op !== ">=" ? " selected" : "") +
          "><=</option>' +
          '<option value=">="' +
          (r.op === ">=" ? " selected" : "") +
          ">>=</option></select>' +
          '<input type="number" data-i="' +
          i +
          '" data-k="threshold" value="' +
          esc(String(r.threshold != null ? r.threshold : 0)) +
          '" style="width:100px">' +
          '<button type="button" class="btn-ghost" data-del="' +
          i +
          '">\u00d7</button></div>'
        );
      })
      .join("");
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
    var mins = Math.max(
      1,
      Number((document.getElementById("interval") || {}).value) || 5
    );
    if (document.getElementById("interval"))
      document.getElementById("interval").value = mins;
    var mode = (document.getElementById("gameMode") || {}).value || "pve";
    if (!window.TarkovPoll) {
      status("TarkovPoll missing", false);
      return;
    }
    TarkovPoll.start(
      POLL_ID,
      mins,
      function () {
        return checkOnce();
      },
      { fireNow: true, label: "price-alarm", mode: mode, tool: TOOL }
    );
    var cd = document.getElementById("countdown");
    if (cd) TarkovPoll.bindCountdown(cd, POLL_ID);
    status("BG every " + mins + " min", true);
    reportMini(true, "every " + mins + "m");
  }

  function stopBg() {
    if (window.TarkovPoll) TarkovPoll.stop(POLL_ID);
    status("Stopped", true);
    reportMini(false, "idle");
  }

  function boot() {
    renderRules();
    var add = document.getElementById("addRule");
    if (add) {
      add.onclick = function () {
        var rules = loadRules();
        rules.push({ q: "", metric: "avg", op: "<=", threshold: 0 });
        saveRules(rules);
        renderRules();
      };
    }
    var startBtn = document.getElementById("startBtn");
    if (startBtn) startBtn.onclick = startBg;
    var stopBtn = document.getElementById("stopBtn");
    if (stopBtn) stopBtn.onclick = stopBg;
    var checkBtn = document.getElementById("checkBtn");
    if (checkBtn) {
      checkBtn.onclick = function () {
        checkOnce().catch(function (e) {
          status(String(e.message || e), false);
        });
      };
    }
    window.addEventListener("message", function (ev) {
      if (ev.origin !== location.origin) return;
      if (ev.data && ev.data.type === "tt-ping-status") {
        var st = window.TarkovPoll
          ? TarkovPoll.status(POLL_ID)
          : { on: false };
        reportMini(
          !!st.on,
          st.on ? "every " + (st.mins || "?") + "m" : "idle"
        );
      }
    });
    try {
      var st = window.TarkovPoll ? TarkovPoll.status(POLL_ID) : null;
      if (st && st.mins && document.getElementById("interval"))
        document.getElementById("interval").value = st.mins;
      if (st && st.mode && document.getElementById("gameMode"))
        document.getElementById("gameMode").value = st.mode;
      if (st && st.on) startBg();
      else reportMini(false, "idle");
    } catch (e) {
      reportMini(false, "idle");
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
