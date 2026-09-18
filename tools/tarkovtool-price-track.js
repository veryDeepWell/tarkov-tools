(function () {
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=String(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s)) {
      var n=String(it.name||'').trim();
      var sl=String(it.normalizedName||'').trim();
      if(n && !/^[a-f0-9]{20,}$/i.test(n)) s=n;
      else if(sl) s=sl;
    }
    return s||it.id||'';
  }

  const DB_NAME = "tarkovPriceDB", DB_VER = 1, STORE = "snapshots", META = "tarkovPriceTrackMeta";
  let db, timer = null, selectedId = null;
  let chartSeries = { avg: true, low: true, high: true };
  let viewRange = null; // {i0, i1} index range for zoom, null = all
  let lastHist = [];
  let hoverX = null;

  function esc(s) {
    if (window.TarkovUI && TarkovUI.esc) return TarkovUI.esc(s);
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function itemLabel(it) {
    if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    var s = (it && (itemName(it))) || "";
    if (window.TarkovNames && TarkovNames.isHashLike && TarkovNames.isHashLike(s))
      return (it && it.name) || s || (it && it.id) || "";
    return s || (it && it.id) || "";
  }
  function fmtRub(n) {
    if (window.TarkovUI && TarkovUI.fmtRub) return TarkovUI.fmtRub(n);
    return Math.round(Number(n) || 0).toLocaleString("ru-RU") + " ₽";
  }
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          var os = d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
          os.createIndex("itemId", "itemId", { unique: false });
          os.createIndex("ts", "ts", { unique: false });
        }
      };
      req.onsuccess = function () { db = req.result; resolve(db); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function putSnap(itemId, avg, low, high, name, slug, icon) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add({
        itemId: itemId, ts: Date.now(), avg: avg, low: low, high: high,
        name: name, slug: slug, icon: icon
      });
      tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error); };
    });
  }
  function allLatest() {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).getAll();
      req.onsuccess = function () {
        var map = {};
        (req.result || []).forEach(function (r) {
          if (!map[r.itemId] || r.ts > map[r.itemId].ts) map[r.itemId] = r;
        });
        resolve(Object.keys(map).map(function (k) { return map[k]; }));
      };
      req.onerror = function () { reject(req.error); };
    });
  }
  function historyFor(itemId) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var idx = tx.objectStore(STORE).index("itemId");
      var req = idx.getAll(IDBKeyRange.only(itemId));
      req.onsuccess = function () {
        var rows = (req.result || []).slice().sort(function (a, b) { return a.ts - b.ts; });
        resolve(rows);
      };
      req.onerror = function () { reject(req.error); };
    });
  }
  function readRun() {
    try { return JSON.parse(localStorage.getItem("tarkovPriceTrackRunning") || "{}"); } catch (e) { return {}; }
  }
  function writeRun(o) {
    try { localStorage.setItem("tarkovPriceTrackRunning", JSON.stringify(o)); } catch (e) {}
  }
  function updateMeta() {
    var el = document.getElementById("trackMeta");
    if (!el) return;
    var r = readRun();
    el.textContent = r.on
      ? ("Фон: каждые " + (r.mins || "?") + " мин · mode " + (r.mode || ""))
      : "Фон выключен";
  }
  async function takeSnapshot() {
    await openDb();
    var mode = document.getElementById("gameMode").value || "pve";
    var arr;
    if (window.TarkovAPI && TarkovAPI.items) arr = await TarkovAPI.items(mode);
    else {
      var res = await fetch("https://json.tarkov.dev/" + mode + "/items", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var json = await res.json();
      var raw = json && json.data && (json.data.items || json.data);
      arr = Array.isArray(raw) ? raw : Object.values(raw || {});
    }
    var n = 0;
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (!it || !it.id) continue;
      var avg = Number(it.avg24hPrice) || 0;
      var low = Number(it.lastLowPrice) || 0;
      var high = Number(it.high24hPrice || it.avg24hPrice) || 0;
      if (avg <= 0 && low <= 0) continue;
      var name = itemLabel(it);
      var slug = it.normalizedName || "";
      await putSnap(it.id, avg, low, high, name, slug, it.iconLink || "");
      n++;
    }
    try {
      localStorage.setItem(META, JSON.stringify({ lastSnap: Date.now(), count: n, mode: mode }));
    } catch (e) {}
    document.getElementById("status").className = "status ok";
    document.getElementById("status").textContent = "Снимок: " + n + " предметов";
    await renderList();
    if (selectedId) drawChart(selectedId);
    if (typeof Notify === "function") {
      Notify({
        title: "Динамика цен",
        body: "Снимок: " + n + " предметов",
        tool: "tarkovtool-price-track.html",
        kind: "price"
      });
    }
  }
  async function renderList() {
    await openDb();
    var list = await allLatest();
    var q = (document.getElementById("q").value || "").toLowerCase().trim();
    if (q) {
      list = list.filter(function (r) {
        return (r.name || "").toLowerCase().indexOf(q) >= 0
          || (r.slug || "").toLowerCase().indexOf(q) >= 0
          || (r.itemId || "").toLowerCase().indexOf(q) >= 0;
      });
    }
    list.sort(function (a, b) { return (a.name || "").localeCompare(b.name || "", "ru"); });
    var box = document.getElementById("itemList");
    if (!list.length) { box.innerHTML = '<p class="meta">Пока пусто — снимите снимок</p>'; return; }
    box.innerHTML = list.map(function (r) {
      var label = r.name || r.slug || r.itemId;
      if (window.TarkovNames && TarkovNames.isHashLike && TarkovNames.isHashLike(label)) {
        label = r.slug || r.itemId || label;
      }
      return '<div class="item-row" data-id="' + esc(r.itemId) + '">' +
        (r.icon ? '<img src="' + esc(r.icon) + '" alt="">' : '') +
        '<div class="nm">' + esc(label) + '</div>' +
        '<div class="pr">' + fmtRub(r.avg || r.low) + '</div></div>';
    }).join("");
    box.querySelectorAll(".item-row").forEach(function (el) {
      el.onclick = function () {
        selectedId = el.getAttribute("data-id");
        viewRange = null;
        drawChart(selectedId);
      };
    });
  }

  function seriesVals(hist, key) {
    return hist.map(function (h) { return Number(h[key]) || 0; });
  }

  function drawChart(itemId) {
    historyFor(itemId).then(function (hist) {
      lastHist = hist;
      var title = document.getElementById("chartTitle");
      var meta = document.getElementById("chartMeta");
      var tip = document.getElementById("chartTip");
      if (!hist.length) {
        title.textContent = "Нет данных";
        meta.textContent = "";
        return;
      }
      var last = hist[hist.length - 1];
      title.textContent = last.name || itemId;
      meta.textContent = hist.length + " точек · avg " + fmtRub(last.avg) +
        " · low " + fmtRub(last.low) + " · high " + fmtRub(last.high);

      var canvas = document.getElementById("chart");
      var ctx = canvas.getContext("2d");
      var dpr = window.devicePixelRatio || 1;
      var cssW = canvas.clientWidth || 900;
      var cssH = 320;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var W = cssW, H = cssH;
      ctx.clearRect(0, 0, W, H);

      var i0 = 0, i1 = hist.length - 1;
      if (viewRange) {
        i0 = Math.max(0, Math.min(viewRange.i0, hist.length - 1));
        i1 = Math.max(i0 + 1, Math.min(viewRange.i1, hist.length - 1));
      }
      var slice = hist.slice(i0, i1 + 1);
      if (slice.length < 2) {
        ctx.fillStyle = "#8b919a";
        ctx.font = "13px sans-serif";
        ctx.fillText("Мало точек для графика", 20, H / 2);
        return;
      }

      var vals = [];
      slice.forEach(function (h) {
        if (chartSeries.avg && h.avg > 0) vals.push(h.avg);
        if (chartSeries.low && h.low > 0) vals.push(h.low);
        if (chartSeries.high && h.high > 0) vals.push(h.high);
      });
      if (!vals.length) {
        ctx.fillStyle = "#8b919a";
        ctx.fillText("Включите хотя бы один ряд (avg/low/high)", 20, H / 2);
        return;
      }
      var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      if (min === max) { min *= 0.95; max *= 1.05; }
      var padL = 64, padR = 16, padT = 16, padB = 36;
      var plotW = W - padL - padR, plotH = H - padT - padB;

      // grid + Y labels
      ctx.strokeStyle = "rgba(42,47,58,0.9)";
      ctx.fillStyle = "#8b919a";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (var g = 0; g <= 4; g++) {
        var gy = padT + plotH * g / 4;
        var gv = max - (max - min) * g / 4;
        ctx.beginPath();
        ctx.moveTo(padL, gy);
        ctx.lineTo(W - padR, gy);
        ctx.stroke();
        ctx.fillText(Math.round(gv).toLocaleString("ru-RU"), padL - 6, gy);
      }

      // X labels (first / mid / last)
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      function xAt(i) {
        return padL + plotW * (i / (slice.length - 1));
      }
      function yAt(v) {
        return padT + plotH * (1 - (v - min) / (max - min || 1));
      }
      function tLabel(ts) {
        try {
          var d = new Date(ts);
          return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) +
            " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        } catch (e) { return ""; }
      }
      [0, Math.floor(slice.length / 2), slice.length - 1].forEach(function (idx) {
        ctx.fillText(tLabel(slice[idx].ts), xAt(idx), H - padB + 6);
      });

      function strokeSeries(key, color) {
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
        ctx.stroke();
        // points
        ctx.fillStyle = color;
        for (var j = 0; j < slice.length; j++) {
          var v2 = Number(slice[j][key]) || 0;
          if (v2 <= 0) continue;
          ctx.beginPath();
          ctx.arc(xAt(j), yAt(v2), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (chartSeries.high) strokeSeries("high", "#f07178");
      if (chartSeries.avg) strokeSeries("avg", "#c9a227");
      if (chartSeries.low) strokeSeries("low", "#3dd68c");

      // hover
      if (hoverX != null) {
        var rel = (hoverX - padL) / (plotW || 1);
        var hi = Math.round(rel * (slice.length - 1));
        hi = Math.max(0, Math.min(slice.length - 1, hi));
        var hx = xAt(hi);
        ctx.strokeStyle = "rgba(232,234,237,0.35)";
        ctx.beginPath();
        ctx.moveTo(hx, padT);
        ctx.lineTo(hx, padT + plotH);
        ctx.stroke();
        var h = slice[hi];
        var tipText = tLabel(h.ts) +
          (chartSeries.avg ? " · avg " + fmtRub(h.avg) : "") +
          (chartSeries.low ? " · low " + fmtRub(h.low) : "") +
          (chartSeries.high ? " · high " + fmtRub(h.high) : "");
        if (tip) {
          tip.style.display = "block";
          tip.textContent = tipText;
        }
      } else if (tip) {
        tip.style.display = "none";
      }
    });
  }

  function startBg() {
    if (window.__ttStartLock || timer) return;
    window.__ttStartLock = true;
    if (timer) { clearInterval(timer); timer = null; }
    var saved = Number(readRun().mins);
    var mins = Math.max(1, Number(document.getElementById("interval").value) || saved || 30);
    document.getElementById("interval").value = mins;
    window.__ttPollMins = mins;
    takeSnapshot().catch(function (e) {
      document.getElementById("status").className = "status err";
      document.getElementById("status").textContent = e.message;
    });
    timer = setInterval(function () {
      takeSnapshot().catch(function () {});
    }, mins * 60 * 1000);
    writeRun({ on: true, mins: mins, mode: document.getElementById("gameMode").value });
    updateMeta();
    if (window.TarkovMini && TarkovMini.reportStatus) {
      TarkovMini.reportStatus({ running: true, label: "каждые " + mins + "м" });
    }
    window.__ttStartLock = false;
  }
  function stopBg() {
    window.__ttStartLock = false;
    if (timer) { clearInterval(timer); timer = null; }
    var prev = readRun();
    writeRun({ on: false, mins: prev.mins, mode: prev.mode });
    updateMeta();
    if (window.TarkovMini && TarkovMini.reportStatus) {
      TarkovMini.reportStatus({ running: false, label: "ожидание" });
    }
  }

  function wireChart() {
    var canvas = document.getElementById("chart");
    if (!canvas) return;
    canvas.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      hoverX = e.clientX - rect.left;
      if (selectedId) drawChart(selectedId);
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
      if (e.deltaY < 0) {
        // zoom in
        span = Math.max(3, Math.floor(span * 0.7));
      } else {
        span = Math.min(len - 1, Math.ceil(span / 0.7));
      }
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
    var reset = document.getElementById("chartResetZoom");
    if (reset) reset.onclick = function () {
      viewRange = null;
      if (selectedId) drawChart(selectedId);
    };
  }

  document.getElementById("startBtn").onclick = startBg;
  document.getElementById("stopBtn").onclick = stopBg;
  document.getElementById("snapBtn").onclick = function () {
    takeSnapshot().catch(function (e) {
      document.getElementById("status").className = "status err";
      document.getElementById("status").textContent = e.message;
    });
  };
  document.getElementById("q").oninput = function () { renderList().catch(function () {}); };
  openDb().then(function () {
    renderList();
    updateMeta();
    wireChart();
    var run = readRun();
    if (run.mins) document.getElementById("interval").value = run.mins;
    if (run.mode) document.getElementById("gameMode").value = run.mode;
    if (run.on) startBg();
    else if (window.TarkovMini && TarkovMini.reportStatus) {
      TarkovMini.reportStatus({ running: false, label: "ожидание" });
    }
  }).catch(function (e) {
    document.getElementById("status").className = "status err";
    document.getElementById("status").textContent = String(e.message || e);
  });
})();
