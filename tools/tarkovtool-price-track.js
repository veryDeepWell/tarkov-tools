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
  var snapInFlight = null;

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
    return Math.round(Number(n) || 0).toLocaleString("ru-RU") + " ₽";
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
    if (ms <= 0) return "сейчас";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "ч " + String(m).padStart(2, "0") + "м";
    return m + "м " + String(sec).padStart(2, "0") + "с";
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
    return normalizeItems(json);
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
      req.onsuccess = function () {
        db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.close(); db = null;
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
          itemId: itemId, ts: p.ts, avg: p.avg, low: p.low, high: p.high,
          name: row.name, slug: row.slug, icon: row.icon
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
    for (var i = 0; i < maxN; i++) out.push(hist[Math.round(i * step)]);
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
          itemId: r.itemId, name: r.name, slug: r.slug, icon: r.icon,
          avg: last.avg, low: last.low, high: last.high, ts: last.ts, n: r.points.length
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

    if (run.on && !snapInFlight) {
      var due = Number(run.nextSnapAt) || 0;
      if (!due || due <= Date.now()) {
        takeSnapshot().catch(function () {});
      }
    }

    if (el) {
      el.textContent = run.on
        ? ("Фон ВКЛ · каждые " + mins + " мин · последний " + last + (meta.count != null ? " (" + meta.count + ")" : ""))
        : ("Фон выкл · последний " + last);
    }
    var remainMs = run.on && run.nextSnapAt ? Number(run.nextSnapAt) - Date.now() : null;
    if (cd) {
      if (run.on) {
        if (snapInFlight) {
          cd.textContent = "След.: идёт снимок…";
          cd.className = "countdown on";
        } else {
          cd.textContent = "След.: " + fmtRemain(remainMs);
          cd.className = "countdown on";
        }
      } else {
        cd.textContent = "Отсчёт выкл";
        cd.className = "countdown";
      }
    }
  }

  function startCountdownLoop() {
    if (countdownTimer) return;
    countdownTimer = setInterval(paintStatusUI, 1000);
  }

  function scheduleNext(mins, opts) {
    opts = opts || {};
    mins = Math.max(1, Number(mins) || 30);
    var run = readRun();
    var nextOn = opts.forceOn ? true : (opts.keepOff ? false : !!run.on);
    writeRun(Object.assign({}, run, {
      on: nextOn,
      mins: mins,
      mode: (($("gameMode") || {}).value) || run.mode || "pve",
      nextSnapAt: nextOn ? (Date.now() + mins * 60 * 1000) : null,
      startedAt: run.startedAt || (nextOn ? Date.now() : run.startedAt)
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
    if (snapInFlight) return snapInFlight;
    snapInFlight = doTakeSnapshot().finally(function () { snapInFlight = null; });
    return snapInFlight;
  }
  window.__ttTakeSnapshot = takeSnapshot;
  window.__ttSnapInFlight = function () { return !!snapInFlight; };

  async function doTakeSnapshot() {
    var run0 = readRun();
    var mins0 = Math.max(1, Number(run0.mins) || Number(($("interval") || {}).value) || 30);

    await openDb();
    var mode = (($("gameMode") || {}).value) || run0.mode || "pve";
    var status = $("status");
    if (status) { status.className = "status"; status.textContent = "Fetching…"; }

    var arr;
    try {
      if (window.TarkovAPI && TarkovAPI.getJson) {
        var raw = await Promise.race([
          TarkovAPI.getJson("/" + mode + "/items", { ttl: 60 * 1000 }),
          new Promise(function (_, rej) {
            setTimeout(function () { rej(new Error("API timeout 45s")); }, 45000);
          })
        ]);
        arr = normalizeItems(raw);
      } else {
        arr = await Promise.race([
          fetchItems(mode),
          new Promise(function (_, rej) {
            setTimeout(function () { rej(new Error("API timeout 45s")); }, 45000);
          })
        ]);
      }
    } catch (e) {
      if (run0.on) scheduleNext(mins0, { forceOn: true });
      if (status) {
        status.className = "status err";
        status.textContent = String(e.message || e);
      }
      throw e;
    }
    if (!arr || !arr.length) throw new Error("API 0 items mode=" + mode);

    var now = Date.now();
    var n = 0;
    var existing = await getAllSeries();
    var byId = Object.create(null);
    for (var i = 0; i < existing.length; i++) {
      if (existing[i] && existing[i].itemId) byId[existing[i].itemId] = existing[i];
    }
    existing = null;

    var pending = [];
    for (var j = 0; j < arr.length; j++) {
      var it = arr[j];
      if (!it || !it.id) continue;
      var p = priceOf(it);
      if (p.avg <= 0 && p.low <= 0 && p.high <= 0) continue;
      var row = byId[it.id];
      var points = row && row.points ? row.points.slice() : [];
      points.push({ ts: now, avg: p.avg, low: p.low, high: p.high });
      points = thinPoints(points);
      pending.push({
        itemId: it.id,
        name: itemName(it),
        slug: it.normalizedName || (row && row.slug) || "",
        icon: it.iconLink || (row && row.icon) || "",
        points: points
      });
    }
    arr = null;
    byId = null;

    var CHUNK = 200;
    for (var c = 0; c < pending.length; c += CHUNK) {
      var slice = pending.slice(c, c + CHUNK);
      await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        var os = tx.objectStore(STORE);
        for (var k = 0; k < slice.length; k++) os.put(slice[k]);
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error || new Error("IDB write failed")); };
        tx.onabort = function () { reject(tx.error || new Error("IDB abort")); };
      });
      n += slice.length;
      if (status && c + CHUNK < pending.length) {
        status.textContent = "Saving… " + n + "/" + pending.length;
      }
    }
    pending = null;

    invalidateCache();
    writeMeta({ lastSnap: now, count: n, mode: mode });
    if (readRun().on) scheduleNext(mins0, { forceOn: true });
    else paintStatusUI();

    if (status) {
      status.className = "status ok";
      status.textContent = "Snap " + n + " · " + fmtClock(now);
    }
    await renderList();
    if (selectedId) drawChart(selectedId);
    try {
      if (typeof Notify === "function") {
        Notify({
          title: "Price track",
          body: "Snap " + n + " · " + fmtClock(now),
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
      box.innerHTML = "<p class=meta>Пусто. Сними снимок.</p>";
      return;
    }
    var html = "";
    if (total > LIST_LIMIT && !q) {
      html += "<p class=meta>Топ " + LIST_LIMIT + " / " + total + ". Фильтр — поиск.</p>";
    } else if (q) {
      html += "<p class=meta>" + total + " найдено</p>";
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
    if (!hist || hist.length < 1) { box.hidden = true; box.innerHTML = ""; return; }
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
      "<div class=stat><div class=k>Сейчас</div><div class=v>" + fmtRub(cur) + "</div></div>" +
      "<div class=stat><div class=k>Медиана</div><div class=v>" + fmtRub(med) + "</div></div>" +
      "<div class=stat><div class=k>Мин</div><div class=v>" + fmtRub(mn) + "</div></div>" +
      "<div class=stat><div class=k>Макс</div><div class=v>" + fmtRub(mx) + "</div></div>" +
      "<div class=stat><div class=k>Δ</div><div class=\"v " + dCls + "\">" + dTxt + "</div></div>" +
      "<div class=stat><div class=k>Точек</div><div class=v>" + hist.length + "</div></div>";
  }

  function drawChart(itemId) {
    if (!itemId) return;
    historyFor(itemId).then(function (full) {
      var hist = filterByRange(full);
      lastHist = hist;
      var title = $("chartTitle");
      var meta = $("chartMeta");
      var canvas = $("chart");
      if (!canvas) return;
      var ctx = canvas.getContext("2d");
      if (!hist.length) {
        if (title) title.textContent = "Нет данных в диапазоне";
        if (meta) meta.textContent = full.length ? ("В базе: " + full.length) : "";
        paintStats(null);
        return;
      }
      var last = hist[hist.length - 1];
      if (title) title.textContent = last.name || itemId;
      paintStats(hist);
      if (meta) {
        meta.textContent = hist.length + " т. / " + full.length + " · avg " + fmtRub(last.avg) +
          " · low " + fmtRub(last.low) + " · high " + fmtRub(last.high);
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
        ctx.fillText("Нет цен", 16, H / 2);
        return;
      }
      var min = Math.min.apply(null, vals);
      var max = Math.max.apply(null, vals);
      if (min === max) { min *= 0.95; max = max * 1.05 || 1; }
      var padL = 70, padR = 16, padT = 18, padB = 40;
      var plotW = W - padL - padR, plotH = H - padT - padB;
      function xAt(i) { return padL + (plotW * i) / Math.max(1, slice.length - 1); }
      function yAt(v) { return padT + plotH * (1 - (v - min) / (max - min || 1)); }
      ctx.strokeStyle = "#2a2f3a";
      ctx.lineWidth = 1;
      for (var g = 0; g <= 4; g++) {
        var gy = padT + (plotH * g) / 4;
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
      }
      function strokeSeries(key, color) {
        if (!chartSeries[key]) return;
        ctx.strokeStyle = color;
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
      }
      strokeSeries("high", "#5b8def");
      strokeSeries("avg", "#f0c14b");
      strokeSeries("low", "#3dd68c");
      ctx.fillStyle = "#9aa3b2";
      ctx.font = "11px sans-serif";
      ctx.fillText(fmtRub(max), 4, padT + 10);
      ctx.fillText(fmtRub(min), 4, padT + plotH);
    }).catch(function () {});
  }

  function clearPollTimer() {
    if (timer) { clearTimeout(timer); clearInterval(timer); timer = null; }
  }

  function armPollTimer(mins) {
    clearPollTimer();
    mins = Math.max(1, Number(mins) || 30);
    window.__ttPollMins = mins;
    timer = setInterval(function () {
      var run = readRun();
      if (!run.on) return;
      var next = Number(run.nextSnapAt) || 0;
      if (next && next > Date.now()) return;
      if (snapInFlight) return;
      takeSnapshot().catch(function () {});
    }, 2000);
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
      startedAt: Date.now(),
      nextSnapAt: Date.now() + mins * 60 * 1000
    });
    armPollTimer(mins);
    paintStatusUI();
    takeSnapshot()
      .catch(function (e) {
        var status = $("status");
        if (status) {
          status.className = "status err";
          status.textContent = e && e.message ? e.message : String(e);
        }
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
    armPollTimer(mins);
    var next = Number(run.nextSnapAt) || 0;
    if ((!next || next <= Date.now()) && !snapInFlight) {
      takeSnapshot().catch(function () {});
    }
    paintStatusUI();
  }

  function wireChart() {
    document.querySelectorAll("[data-range]").forEach(function (btn) {
      btn.onclick = function () {
        chartRange = btn.getAttribute("data-range") || "7d";
        document.querySelectorAll("[data-range]").forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
        viewRange = null;
        if (selectedId) drawChart(selectedId);
      };
    });
    document.querySelectorAll("[data-series]").forEach(function (btn) {
      btn.onclick = function () {
        var k = btn.getAttribute("data-series");
        if (!k) return;
        chartSeries[k] = !chartSeries[k];
        btn.classList.toggle("on", !!chartSeries[k]);
        if (selectedId) drawChart(selectedId);
      };
    });
    var rz = $("chartResetZoom");
    if (rz) rz.onclick = function () { viewRange = null; if (selectedId) drawChart(selectedId); };
  }

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
        listFilter = (($("q") || {}).value || "").toLowerCase().trim();
        renderList().catch(function () {});
      };
    }
    wireChart();
    startCountdownLoop();
    openDb()
      .then(function () { return renderList(); })
      .catch(function (e) {
        var status = $("status");
        if (status) {
          status.className = "status err";
          status.textContent = "DB: " + (e && e.message ? e.message : String(e));
        }
      })
      .then(function () {
        resumeIfNeeded();
        paintStatusUI();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
