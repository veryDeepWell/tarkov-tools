   (function () {
  function itemName(it) {
    try { if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it); } catch (e) {}
    if (!it) return "";
    if (typeof it === "string") return it;
    return it.shortName || it.name || it.id || "";
  }
  const RUN_KEY = "tarkovPriceAlarmRunning";
  const RULES_KEY = "tarkovPriceAlarmRules";
  let catalog = [], timer = null, fired = {};

  function status(msg, ok) {
    var el = document.getElementById("status");
    if (!el) return;
    el.className = "status " + (ok ? "ok" : "err");
    el.textContent = msg || "";
  }
  function loadRules() {
    try { return JSON.parse(localStorage.getItem(RULES_KEY) || "[]") || []; } catch (e) { return []; }
  }
  function saveRules(rules) {
    try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch (e) {}
  }
  function reportMini(running, label) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: "tt-status",
          tool: "tarkovtool-price-alarm.html",
          running: !!running,
          ready: true,
          label: label || ""
        }, location.origin);
      }
    } catch (e) {}
  }

  async function loadCatalog() {
    var mode = document.getElementById("gameMode").value || "pve";
    var res = await fetch("https://json.tarkov.dev/" + mode + "/items", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var json = await res.json();
    var raw = json && json.data && json.data.items != null ? json.data.items : (json && json.data) || json;
    if (Array.isArray(raw)) catalog = raw;
    else if (raw && typeof raw === "object") catalog = Object.values(raw);
    else catalog = [];
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
      if (id === q || name.indexOf(q) >= 0 || String(it.normalizedName || "").toLowerCase().indexOf(q) >= 0) return it;
    }
    return null;
  }

  function evalRule(rule, it) {
    var p = priceOf(it);
    var val = rule.metric === "low" ? p.low : (rule.metric === "offers" ? p.offers : p.avg);
    var thr = Number(rule.threshold) || 0;
    if (rule.op === ">=") return val >= thr;
    if (rule.op === "<=") return val <= thr;
    return val <= thr;
  }

  async function checkOnce() {
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
      }
    });
    hits.forEach(function (h) {
      try {
        if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("restock");
        if (window.TarkovState && TarkovState.notify) {
          TarkovState.notify({
            title: "Price Alarm",
            body: itemName(h.it) + " " + (h.rule.op || "<=") + " " + h.rule.threshold,
            tool: "tarkovtool-price-alarm.html"
          });
        }
      } catch (e) {}
    });
    status("Проверка: " + catalog.length + " items, hits " + hits.length, true);
    reportMini(true, hits.length ? ("hits " + hits.length) : "ok");
    return hits;
  }

  function renderRules() {
    var box = document.getElementById("rules");
    if (!box) return;
    var rules = loadRules();
    if (!rules.length) {
      box.innerHTML = "<p class=meta>Нет правил</p>";
      return;
    }
    box.innerHTML = rules.map(function (r, i) {
      return '<div class="row" style="gap:8px;margin:6px 0;flex-wrap:wrap;align-items:center">' +
        '<input data-i="' + i + '" data-k="q" value="' + (r.q || "") + '" placeholder="имя или id" style="flex:1;min-width:120px">' +
        '<select data-i="' + i + '" data-k="metric"><option value="avg"' + (r.metric === "avg" || !r.metric ? " selected" : "") + '>avg</option>' +
        '<option value="low"' + (r.metric === "low" ? " selected" : "") + '>low</option>' +
        '<option value="offers"' + (r.metric === "offers" ? " selected" : "") + '>offers</option></select>' +
        '<select data-i="' + i + '" data-k="op"><option value="<="' + (r.op !== ">=" ? " selected" : "") + '><=</option>' +
        '<option value=">="' + (r.op === ">=" ? " selected" : "") + '>>=</option></select>' +
        '<input type="number" data-i="' + i + '" data-k="threshold" value="' + (r.threshold || 0) + '" style="width:100px">' +
        '<button type="button" class="btn-ghost del" data-del="' + i + '">×</button></div>';
    }).join("");
    box.querySelectorAll("[data-k]").forEach(function (el) {
      el.onchange = el.oninput = function () {
        var rules = loadRules();
        var i = Number(el.getAttribute("data-i"));
        var k = el.getAttribute("data-k");
        if (!rules[i]) return;
        rules[i][k] = el.value;
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
    var mins = Math.max(1, Number(document.getElementById("interval").value) || 5);
    document.getElementById("interval").value = mins;
    try { localStorage.setItem(RUN_KEY, JSON.stringify({ on: true, mins: mins, mode: document.getElementById("gameMode").value })); } catch (e) {}
    if (window.TarkovPoll) {
      TarkovPoll.start("price-alarm", mins, function () { return checkOnce(); }, { fireNow: true, label: "price-alarm" });
      var cd = document.getElementById("countdown");
      if (cd) TarkovPoll.bindCountdown(cd, "price-alarm");
    } else {
      timer = setInterval(function () { checkOnce().catch(function (e) { status(String(e.message || e), false); }); }, mins * 60 * 1000);
    }
    status("Фон каждые " + mins + " мин", true);
    reportMini(true, "каждые " + mins + "м");
    checkOnce().catch(function (e) { status(String(e.message || e), false); });
  }
  function stopBg() {
    if (timer) clearInterval(timer); timer = null;
    try { if (window.TarkovPoll) TarkovPoll.stop("price-alarm"); } catch (e) {}
    try { var prev = {}; try { prev = JSON.parse(localStorage.getItem(RUN_KEY) || "{}"); } catch (e) {} localStorage.setItem(RUN_KEY, JSON.stringify({ on: false, mins: prev.mins, mode: prev.mode })); } catch (e) {}
    status("Стоп", true);
    reportMini(false, "idle");
  }

  function boot() {
    renderRules();
    document.getElementById("addRule").onclick = function () {
      var rules = loadRules();
      rules.push({ q: "", metric: "avg", op: "<=", threshold: 0 });
      saveRules(rules);
      renderRules();
    };
    document.getElementById("startBtn").onclick = startBg;
    document.getElementById("stopBtn").onclick = stopBg;
    document.getElementById("checkBtn").onclick = function () {
      checkOnce().catch(function (e) { status(String(e.message || e), false); });
    };
    try {
      var run = JSON.parse(localStorage.getItem(RUN_KEY) || "{}");
      if (run.mins) document.getElementById("interval").value = run.mins;
      if (run.mode) document.getElementById("gameMode").value = run.mode;
      if (run.on) startBg();
    } catch (e) {}
    reportMini(false, "idle");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
