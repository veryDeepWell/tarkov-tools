(function () {
  "use strict";
  var DB_NAME = "tarkovPriceDB";
  var DB_VER = 5;
  var STORE = "series";
  var RUN_KEY = "tarkovPriceTrackRunning";
  var META_KEY = "tarkovPriceTrackMeta";
  var MAX_POINTS = 672;
  var LIST_LIMIT = 100;
  var DRAW_MAX = 240;
  var RANGE_MS = { "1d": 86400000, "3d": 259200000, "7d": 604800000, "all": 0 };

  var db = null;
  var timer = null;
  var countdownTimer = null;
  var selectedId = null;
  var chartSeries = { avg: true, low: true, high: true };
  var chartRange = "7d";
  var viewRange = null;
  var lastHist = [];
  var hoverX = null;
  var hoverRaf = 0;
  var latestCache = null;
  var listFilter = "";

  function $(id) { return document.getElementById(id); }

  function itemName(it) {
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    if (!it) return "";
    if (typeof it === "string") return it;
    var id = it.id || it.itemId || "";
    var short = String(it.shortName || "").trim();
    var name = String(it.name || "").trim();
    var slug = String(it.normalizedName || it.slug || "").trim();
    function bad(s) {
      if (!s) return true;
      if (/^[a-f0-9]{20,}$/i.test(s)) return true;
      if (id && s.indexOf(id) === 0) return true;
      if (/\s(Name|ShortName)$/i.test(s)) return true;
      return false;
    }
    if (short && !bad(short)) return short;
    if (name && !bad(name)) return name;
    if (slug) {
      return slug.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, function (c) {
        return c.toUpperCase();
      });
    }
    return id || "";
  }

  function esc(s) {
    var amp = String.fromCharCode(38);
    return String(s || "")
      .replace(/&/g, amp + "amp;")
      .replace(/</g, amp + "lt;")
      .replace(/>/g, amp + "gt;")
      .replace(/"/g, amp + "quot;");
  }

  function fmtRub(n) {
    return Math.round(Number(n) || 0).toLocaleString("ru-RU") + " RUB";
  }

  function fmtClock(ts) {
    if (!ts) return "-";
    try {
      return new Date(ts).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    } catch (e) { return "-"; }
  }

  function fmtRemain(ms) {
    if (ms == null || isNaN(ms)) return "-";
    if (ms <= 0) return "now";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "h " + String(m).padStart(2, "0") + "m";
    return m + "m " + String(sec).padStart(2, "0") + "s";
  }

  function median(arr) {
    if (!arr || !arr.length) return 0;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  function readRun() {
    try { return JSON.parse(localStorage.getItem(RUN_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function writeRun(o) {
    try { localStorage.setItem(RUN_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function writeMeta(patch) {
    var next = Object.assign({}, readMeta(), patch || {});
    try { localStorage.setItem(META_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function normalizeItems(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "object") return [];
    if (raw.data) {
      if (raw.data.items != null) return normalizeItems(raw.data.items);
      if (Array.isArray(raw.data)) return raw.data;
    }
    if (raw.items != null) return normalizeItems(raw.items);
    var vals = Object.values(raw);
    if (!vals.length) return [];
    var withId = 0;
    for (var i = 0; i < Math.min(vals.length, 20); i++) {
      if (vals[i] && typeof vals[i] === "object" && (vals[i].id || vals[i].avg24hPrice != null)) withId++;
    }
    if (withId >= Math.min(3, vals.length)) return vals;
    return [];
  }

  async function fetchItems(mode) {
    mode = mode || "pve";
    var res = await fetch("https://json.tarkov.dev/" + mode + "/items", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var json = await res.json();
    var arr = normalizeItems(json);
    json = null;
    return arr;
  }

  function openDb() {
    if (db) return Promise.resolve(db);
    return new Promise(function (resolve, reject) {
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VER); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function () {
        var d = req.result;
        try {
          if (d.objectStoreNames.contains("snapshots")) d.deleteObjectStore("snapshots");
        } catch (e) {}
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "itemId" });
        }
      };
      req.onblocked = function () {
        var st = $("status");
        if (st) { st.className = "status err"; st.textContent = "IndexedDB blocked"; }
      };
      req.onsuccess = function () {
        db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.close();
          db = null;
          reject(new Error("series store missing"));
          return;
        }
        db.onversionchange = function () { try { db.close(); } catch (e) {} db = null; };
        resolve(db);
      };
      req.onerror = function () { reject(req.error || new Error("IDB open failed")); };
    });
  }

  function getSeries(itemId) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).get(itemId);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function getAllSeries() {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function thinPoints(points) {
    if (!points || points.length <= MAX_POINTS) return points || [];
    var out = points.slice();
    while (out.length > MAX_POINTS) {
      var keep = [];
      var tail = Math.min(96, Math.floor(out.length * 0.25));
      var head = out.slice(0, out.length - tail);
      var rest = out.slice(out.length - tail);
      for (var i = 0; i < head.length; i++) {
        if (i % 2 === 0) keep.push(head[i]);
      }
      out = keep.concat(rest);
    }
    return out;
  }

  function historyFor(itemId) {
    return getSeries(itemId).then(function (row) {
      if (!row || !row.points) return [];
      return row.points.map(function (p) {
        return {
          itemId: itemId,
          ts: p.ts,
          avg: p.avg,
          low: p.low,
          high: p.high,
          name: row.name,
          slug: row.slug,
          icon: row.icon
        };
      });
    });
  }

  function filterByRange(hist) {
    if (!hist || !hist.length) return [];
    var ms = RANGE_MS[chartRange] || 0;
    if (!ms) return hist;
    var cut = Date.now() - ms;
    return hist.filter(function (h) { return h.ts >= cut; });
  }

  function downsample(hist, maxN) {
    if (!hist || hist.length <= maxN) return hist;
    var out = [];
    var step = (hist.length - 1) / (maxN - 1);
    for (var i = 0; i < maxN; i++) {
      out.push(hist[Math.round(i * step)]);
    }
    return out;
  }

  function allLatest() {
    if (latestCache) return Promise.resolve(latestCache);
    return getAllSeries().then(function (rows) {
      var list = [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!r || !r.points || !r.points.length) continue;
        var last = r.points[r.points.length - 1];
        list.push({
          itemId: r.itemId,
          name: r.name,
          slug: r.slug,
          icon: r.icon,
          avg: last.avg,
          low: last.low,
          high: last.high,
          ts: last.ts,
          n: r.points.length
        });
      }
      latestCache = list;
      return list;
    });
  }

  function invalidateCache() { latestCache = null; }

  function paintStatusUI() {
    var run = readRun();
    var meta = readMeta();
    var el = $("trackMeta");
    var cd = $("countdown");
    var last = meta.lastSnap ? fmtClock(meta.lastSnap) : "-";
    var mins = Number(run.mins) || Number(($("interval") || {}).value) || 30;
    if (el) {
      el.textContent = run.on
        ? ("BG ON every " + mins + " min last " + last + (meta.count != null ? " (" + meta.count + ")" : ""))
        : ("BG off last " + last);
    }
    var remainMs = run.on && run.nextSnapAt ? Number(run.nextSnapAt) - Date.now() : null;
    if (cd) {
      if (run.on) {
        cd.textContent = "Next: " + fmtRemain(remainMs);
        cd.className = "countdown on";
      } else {
        cd.textContent = "Countdown off";
        cd.className = "countdown";
      }
    }
    try {
      if (window.TarkovMini && TarkovMini.reportStatus) {
        TarkovMini.reportStatus({
          running: !!run.on,
          label: run.on ? ("in " + fmtRemain(remainMs)) : "idle",
          tool: "tarkovtool-price-track.html"
        });
      }
    } catch (e) {}
  }

  function startCountdownLoop() {
    if (countdownTimer) return;
    countdownTimer = setInterval(paintStatusUI, 1000);
  }

  function scheduleNext(mins) {
    mins = Math.max(1, Number(mins) || 30);
    var run = readRun();
    writeRun(Object.assign({}, run, {
      on: true,
      mins: mins,
      mode: (($("gameMode") || {}).value) || run.mode || "pve",
      nextSnapAt: Date.now() + mins * 60 * 1000,
      startedAt: run.startedAt || Date.now()
    }));
    window.__ttPollMins = mins;
    paintStatusUI();
  }

  function priceOf(it) {
    var avg = Number(it.avg24hPrice) || 0;
    var low = Number(it.lastLowPrice) || Number(it.low24hPrice) || 0;
    var high = Number(it.high24hPrice) || avg || 0;
    return { avg: avg, low: low, high: high };
  }

  async function takeSnapshot() {
    await openDb();
    var mode = (($("gameMode") || {}).value) || "pve";
    var status = $("status");
    if (status) { status.className = "status"; status.textContent = "Fetching..."; }
    var arr = await fetchItems(mode);
    if (!arr.length) throw new Error("API 0 items mode=" + mode);
    var now = Date.now();
    var n = 0;
    var existing = await getAllSeries();
    var byId = {};
    for (var i = 0; i < existing.length; i++) byId[existing[i].itemId] = existing[i];
    existing = null;
    await new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      var os = tx.objectStore(STORE);
      for (var j = 0; j < arr.length; j++) {
        var it = arr[j];
        if (!it || !it.id) continue;
        var p = priceOf(it);
        if (p.avg <= 0 && p.low <= 0 && p.high <= 0) continue;
        var row = byId[it.id];
        var points = row && row.points ? row.points.slice() : [];
        points.push({ ts: now, avg: p.avg, low: p.low, high: p.high });
        points = thinPoints(points);
        os.put({
          itemId: it.id,
          name: itemName(it),
          slug: it.normalizedName || (row && row.slug) || "",
          icon: it.iconLink || (row && row.icon) || "",
          points: points
        });
        n++;
      }
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error || new Error("IDB write failed")); };
    });
    arr = null;
    byId = null;
    invalidateCache();
    writeMeta({ lastSnap: now, count: n, mode: mode });
    var run = readRun();
    var mins = Number(run.mins) || Number(($("interval") || {}).value) || 30;
    if (run.on) scheduleNext(mins); else paintStatusUI();
    if (status) {
      status.className = "status ok";
      status.textContent = "Snap " + n + " items (cap " + MAX_POINTS + " pts) " + fmtClock(now);
    }
    await renderList();
    if (selectedId) drawChart(selectedId);
    try {
      if (typeof Notify === "function") {
        Notify({
          title: "Price track",
          body: "Snap " + n + " " + fmtClock(now),
          tool: "tarkovtool-price-track.html",
          kind: "price"
        });
      }
    } catch (e) {}
  }

  async function renderList() {
    await openDb();
    var list = await allLatest();
    var q = listFilter || ((($("q") || {}).value) || "").toLowerCase().trim();
    listFilter = q;
    if (q) {
      list = list.filter(function (r) {
        return (r.name || "").toLowerCase().indexOf(q) >= 0
          || (r.slug || "").toLowerCase().indexOf(q) >= 0
          || (r.itemId || "").toLowerCase().indexOf(q) >= 0;
      });
    }
    list.sort(function (a, b) { return (b.avg || 0) - (a.avg || 0); });
    var total = list.length;
    var shown = list.slice(0, LIST_LIMIT);
    var box = $("itemList");
    if (!box) return;
    if (!total) {
      box.innerHTML = "<p class=meta>Empty. Click Snap.</p>";
      return;
    }
    var html = "";
    if (total > LIST_LIMIT && !q) {
      html += "<p class=meta>Top " + LIST_LIMIT + " / " + total + " by price. Type to search.</p>";
    } else if (q) {
      html += "<p class=meta>" + total + " match</p>";
    }
    for (var i = 0; i < shown.length; i++) {
      var r = shown[i];
      html += "<div class=item-row data-id=\"" + esc(r.itemId) + "\">"
        + (r.icon ? "<img loading=lazy src=\"" + esc(r.icon) + "\" alt=\"\">" : "")
        + "<div class=nm>" + esc(r.name || r.slug || r.itemId) + "</div>"
        + "<div class=pr>" + fmtRub(r.avg || r.low) + "</div></div>";
    }
    box.innerHTML = html;
    box.onclick = function (ev) {
      var row = ev.target && ev.target.closest ? ev.target.closest(".item-row") : null;
      if (!row) return;
      selectedId = row.getAttribute("data-id");
      viewRange = null;
      drawChart(selectedId);
    };
  }

  function paintStats(hist) {
    var box = $("chartStats");
    if (!box) return;
    if (!hist || hist.length < 1) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    var avgs = [];
    for (var i = 0; i < hist.length; i++) {
      var a = Number(hist[i].avg) || 0;
      if (a > 0) avgs.push(a);
    }
    var cur = Number(hist[hist.length - 1].avg) || Number(hist[hist.length - 1].low) || 0;
    var first = Number(hist[0].avg) || Number(hist[0].low) || 0;
    var med = median(avgs);
    var mn = avgs.length ? Math.min.apply(null, avgs) : 0;
    var mx = avgs.length ? Math.max.apply(null, avgs) : 0;
    var delta = first > 0 ? ((cur - first) / first) * 100 : 0;
    var dCls = delta > 0.5 ? "up" : (delta < -0.5 ? "down" : "");
    var dTxt = (delta >= 0 ? "+" : "") + delta.toFixed(1) + "%";
    box.hidden = false;
    box.innerHTML =
      "<div class=stat><div class=k>Now</div><div class=v>" + fmtRub(cur) + "</div></div>" +
      "<div class=stat><div class=k>Median</div><div class=v>" + fmtRub(med) + "</div></div>" +
      "<div class=stat><div class=k>Min</div><div class=v>" + fmtRub(mn) + "</div></div>" +
      "<div class=stat><div class=k>Max</div><div class=v>" + fmtRub(mx) + "</div></div>" +
      "<div class=stat><div class=k>Change</div><div class=\"v " + dCls + "\">" + dTxt + "</div></div>" +
      "<div class=stat><div class=k>Points</div><div class=v>" + hist.length + "</div></div>";
  }

  function drawChart(itemId) {
    if (!itemId) return;
    historyFor(itemId).then(function (full) {
      var hist = filterByRange(full);
      lastHist = hist;
      var title = $("chartTitle");
      var meta = $("chartMeta");
      var tip = $("chartTip");
      var canvas = $("chart");
      if (!canvas) return;
      var ctx = canvas.getContext("2d");
      if (!hist.length) {
        if (title) title.textContent = "No data in range";
        if (meta) meta.textContent = full.length ? ("Stored: " + full.length + " — change range") : "";
        paintStats(null);
        return;
      }
      var last = hist[hist.length - 1];
      if (title) title.textContent = last.name || itemId;
      paintStats(hist);
      if (meta) {
        meta.textContent = hist.length + " pts in range / " + full.length + " stored · avg "
          + fmtRub(last.avg) + " · low " + fmtRub(last.low) + " · high " + fmtRub(last.high);
      }

      var drawHist = hist;
      if (viewRange) {
        var i0 = Math.max(0, Math.min(viewRange.i0, hist.length - 1));
        var i1 = Math.max(i0, Math.min(viewRange.i1, hist.length - 1));
        drawHist = hist.slice(i0, i1 + 1);
      }
      var slice = downsample(drawHist, DRAW_MAX);
      if (slice.length === 1) {
        slice = [slice[0], Object.assign({}, slice[0], { ts: (slice[0].ts || 0) + 60000 })];
      }

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var wrap = canvas.parentElement;
      var cssW = Math.max(280, canvas.clientWidth || 0, wrap ? wrap.clientWidth : 0, 400);
      var cssH = 320;
      if (canvas._cssW !== cssW) {
        canvas._cssW = cssW;
        canvas.style.width = cssW + "px";
        canvas.style.height = cssH + "px";
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var W = cssW, H = cssH;
      ctx.fillStyle = "#12151c";
      ctx.fillRect(0, 0, W, H);

      var vals = [];
      for (var vi = 0; vi < slice.length; vi++) {
        var h = slice[vi];
        if (chartSeries.avg && h.avg > 0) vals.push(Number(h.avg));
        if (chartSeries.low && h.low > 0) vals.push(Number(h.low));
        if (chartSeries.high && h.high > 0) vals.push(Number(h.high));
      }
      if (!vals.length) {
        ctx.fillStyle = "#f0c14b";
        ctx.font = "14px sans-serif";
        ctx.fillText("No prices", 16, H / 2);
        return;
      }
      var min = Math.min.apply(null, vals);
      var max = Math.max.apply(null, vals);
      if (min === max) { min *= 0.95; max = max * 1.05 || 1; }
      var padL = 70, padR = 16, padT = 18, padB = 40;
      var plotW = W - padL - padR, plotH = H - padT - padB;
      function xAt(i) { return padL + (plotW * i) / Math.max(1, slice.length - 1); }
      function yAt(v) { return padT + plotH * (1 - (v - min) / (max - min || 1)); }
      function tLabel(ts) {
        try {
          var d = new Date(ts);
          return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
            + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        } catch (e) { return ""; }
      }
      ctx.strokeStyle = "#2a3140";
      ctx.fillStyle = "#9aa3b2";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (var g = 0; g <= 4; g++) {
        var gy = padT + (plotH * g) / 4;
        var gv = max - ((max - min) * g) / 4;
        ctx.beginPath();
        ctx.moveTo(padL, gy);
        ctx.lineTo(W - padR, gy);
        ctx.stroke();
        ctx.fillText(Math.round(gv).toLocaleString("ru-RU"), padL - 8, gy);
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      [0, Math.floor(slice.length / 2), slice.length - 1].forEach(function (idx) {
        if (slice[idx]) ctx.fillText(tLabel(slice[idx].ts), xAt(idx), H - padB + 8);
      });
      function strokeSeries(key, color) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        var started = false;
        for (var i = 0; i < slice.length; i++) {
          var v = Number(slice[i][key]) || 0;
          if (v <= 0) continue;
          var x = xAt(i), y = yAt(v);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        if (started) ctx.stroke();
        if (slice.length <= 80) {
          for (var j = 0; j < slice.length; j++) {
            var v2 = Number(slice[j][key]) || 0;
            if (v2 <= 0) continue;
            ctx.beginPath();
            ctx.arc(xAt(j), yAt(v2), 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      if (chartSeries.high) strokeSeries("high", "#ff6b7a");
      if (chartSeries.avg) strokeSeries("avg", "#f0c14b");
      if (chartSeries.low) strokeSeries("low", "#3dd68c");
      ctx.strokeStyle = "#3a4254";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      if (hoverX != null && slice.length) {
        var rel = (hoverX - padL) / (plotW || 1);
        var hi = Math.max(0, Math.min(slice.length - 1, Math.round(rel * (slice.length - 1))));
        var hx = xAt(hi);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(hx, padT);
        ctx.lineTo(hx, padT + plotH);
        ctx.stroke();
        var hp = slice[hi];
        var tipText = tLabel(hp.ts)
          + (chartSeries.avg ? " avg " + fmtRub(hp.avg) : "")
          + (chartSeries.low ? " low " + fmtRub(hp.low) : "")
          + (chartSeries.high ? " high " + fmtRub(hp.high) : "");
        if (tip) { tip.style.display = "block"; tip.textContent = tipText; }
      } else if (tip) {
        tip.style.display = "none";
      }
    }).catch(function (e) {
      var title = $("chartTitle");
      if (title) title.textContent = "Chart error: " + (e && e.message ? e.message : e);
    });
  }

  function clearPollTimer() {
    if (timer) { clearTimeout(timer); clearInterval(timer); timer = null; }
  }
  function armPollTimer(mins) {
    clearPollTimer();
    mins = Math.max(1, Number(mins) || 30);
    timer = setInterval(function () { takeSnapshot().catch(function () {}); }, mins * 60 * 1000);
  }

  function startBg() {
    if (window.__ttStartLock) return;
    window.__ttStartLock = true;
    var mins = Math.max(1, Number(($("interval") || {}).value) || Number(readRun().mins) || 30);
    if ($("interval")) $("interval").value = mins;
    window.__ttPollMins = mins;
    writeRun({
      on: true, mins: mins,
      mode: (($("gameMode") || {}).value) || "pve",
      startedAt: Date.now(), nextSnapAt: Date.now()
    });
    takeSnapshot()
      .then(function () { armPollTimer(mins); scheduleNext(mins); })
      .catch(function (e) {
        var status = $("status");
        if (status) {
          status.className = "status err";
          status.textContent = e && e.message ? e.message : String(e);
        }
        armPollTimer(mins);
        scheduleNext(mins);
      })
      .then(function () {
        window.__ttStartLock = false;
        paintStatusUI();
      });
  }

  function stopBg() {
    window.__ttStartLock = false;
    clearPollTimer();
    var prev = readRun();
    writeRun({
      on: false,
      mins: prev.mins || Number(($("interval") || {}).value) || 30,
      mode: prev.mode || (($("gameMode") || {}).value) || "pve",
      nextSnapAt: null,
      startedAt: prev.startedAt || null
    });
    paintStatusUI();
  }

  function resumeIfNeeded() {
    var run = readRun();
    if (!run.on) { paintStatusUI(); return; }
    var mins = Math.max(1, Number(run.mins) || 30);
    if ($("interval")) $("interval").value = mins;
    if (run.mode && $("gameMode")) $("gameMode").value = run.mode;
    window.__ttPollMins = mins;
    var next = Number(run.nextSnapAt) || 0;
    var now = Date.now();
    if (!next || next <= now) {
      takeSnapshot()
        .then(function () { armPollTimer(mins); scheduleNext(mins); })
        .catch(function () { armPollTimer(mins); scheduleNext(mins); });
    } else {
      clearPollTimer();
      timer = setTimeout(function () {
        takeSnapshot()
          .then(function () { armPollTimer(mins); scheduleNext(mins); })
          .catch(function () { armPollTimer(mins); scheduleNext(mins); });
      }, next - now);
    }
    paintStatusUI();
  }

  function wireChart() {
    var canvas = $("chart");
    if (!canvas) return;
    canvas.addEventListener("mousemove", function (e) {
      hoverX = e.clientX - canvas.getBoundingClientRect().left;
      if (hoverRaf) return;
      hoverRaf = requestAnimationFrame(function () {
        hoverRaf = 0;
        if (selectedId) drawChart(selectedId);
      });
    });
    canvas.addEventListener("mouseleave", function () {
      hoverX = null;
      if (selectedId) drawChart(selectedId);
    });
    canvas.addEventListener("wheel", function (e) {
      if (!lastHist.length || lastHist.length < 4) return;
      e.preventDefault();
      var len = lastHist.length;
      var i0 = viewRange ? viewRange.i0 : 0;
      var i1 = viewRange ? viewRange.i1 : len - 1;
      var span = i1 - i0;
      var mid = (i0 + i1) / 2;
      if (e.deltaY < 0) span = Math.max(3, Math.floor(span * 0.7));
      else span = Math.min(len - 1, Math.ceil(span / 0.7));
      i0 = Math.max(0, Math.round(mid - span / 2));
      i1 = Math.min(len - 1, i0 + span);
      viewRange = { i0: i0, i1: i1 };
      if (i0 === 0 && i1 === len - 1) viewRange = null;
      if (selectedId) drawChart(selectedId);
    }, { passive: false });
    document.querySelectorAll("[data-series]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-series");
        chartSeries[k] = !chartSeries[k];
        btn.classList.toggle("on", chartSeries[k]);
        if (selectedId) drawChart(selectedId);
      });
    });
    document.querySelectorAll("[data-range]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        chartRange = btn.getAttribute("data-range") || "7d";
        document.querySelectorAll("[data-range]").forEach(function (b) {
          b.classList.toggle("on", b.getAttribute("data-range") === chartRange);
        });
        viewRange = null;
        if (selectedId) drawChart(selectedId);
      });
    });
    var reset = $("chartResetZoom");
    if (reset) {
      reset.onclick = function () {
        viewRange = null;
        if (selectedId) drawChart(selectedId);
      };
    }
    var resizeT;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        if ($("chart")) $("chart")._cssW = 0;
        if (selectedId) drawChart(selectedId);
      }, 120);
    });
  }

  var searchT = 0;
  function boot() {
    if ($("startBtn")) $("startBtn").onclick = startBg;
    if ($("stopBtn")) $("stopBtn").onclick = stopBg;
    if ($("snapBtn")) {
      $("snapBtn").onclick = function () {
        takeSnapshot().catch(function (e) {
          var status = $("status");
          if (status) {
            status.className = "status err";
            status.textContent = e && e.message ? e.message : String(e);
          }
        });
      };
    }
    if ($("q")) {
      $("q").oninput = function () {
        clearTimeout(searchT);
        var v = $("q").value;
        searchT = setTimeout(function () {
          listFilter = (v || "").toLowerCase().trim();
          renderList().catch(function () {});
        }, 200);
      };
    }
    openDb()
      .then(function () { return renderList(); })
      .then(function () {
        wireChart();
        startCountdownLoop();
        resumeIfNeeded();
        return allLatest().then(function (list) {
          if (!list.length) {
            var st = $("status");
            if (st) {
              st.className = "status";
              st.textContent = "DB empty - auto snap...";
            }
            return takeSnapshot().catch(function (e) {
              if (st) {
                st.className = "status err";
                st.textContent = e && e.message ? e.message : String(e);
              }
            });
          }
        });
      })
      .catch(function (e) {
        var status = $("status");
        if (status) {
          status.className = "status err";
          status.textContent = "DB: " + (e && e.message ? e.message : e);
        }
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
