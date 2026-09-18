(function () {
  const DB_NAME = "tarkovPriceDB", DB_VER = 1, STORE = "snapshots";
  const RUN_KEY = "tarkovPriceTrackRunning";
  const META_KEY = "tarkovPriceTrackMeta";

  let db = null;
  let timer = null;
  let countdownTimer = null;
  let selectedId = null;
  let chartSeries = { avg: true, low: true, high: true };
  let viewRange = null;
  let lastHist = [];
  let hoverX = null;

  function itemName(it) {
    if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
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
    if (window.TarkovUI && TarkovUI.esc) return TarkovUI.esc(s);
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtRub(n) {
    if (window.TarkovUI && TarkovUI.fmtRub) return TarkovUI.fmtRub(n);
    return Math.round(Number(n) || 0).toLocaleString("ru-RU") + " ₽";
  }

  function fmtClock(ts) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (e) {
      return "—";
    }
  }

  function fmtRemain(ms) {
    if (ms == null || isNaN(ms)) return "—";
    if (ms <= 0) return "сейчас…";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "ч " + String(m).padStart(2, "0") + "м " + String(sec).padStart(2, "0") + "с";
    return m + "м " + String(sec).padStart(2, "0") + "с";
  }

  function readRun() {
    try {
      return JSON.parse(localStorage.getItem(RUN_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function writeRun(o) {
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify(o));
    } catch (e) {}
  }

  function readMeta() {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function writeMeta(patch) {
    var cur = readMeta();
    var next = Object.assign({}, cur, patch || {});
    try {
      localStorage.setItem(META_KEY, JSON.stringify(next));
    } catch (e) {}
    return next;
  }

  function openDb() {
    if (db) return Promise.resolve(db);
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
      req.onsuccess = function () {
        db = req.result;
        resolve(db);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function putSnap(itemId, avg, low, high, name, slug, icon) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add({
        itemId: itemId,
        ts: Date.now(),
        avg: avg,
        low: low,
        high: high,
        name: name,
        slug: slug,
        icon: icon
      });
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error);
      };
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
        resolve(
          Object.keys(map).map(function (k) {
            return map[k];
          })
        );
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function historyFor(itemId) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var idx = tx.objectStore(STORE).index("itemId");
      var req = idx.getAll(IDBKeyRange.only(itemId));
      req.onsuccess = function () {
        var rows = (req.result || []).slice().sort(function (a, b) {
          return a.ts - b.ts;
        });
        resolve(rows);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function paintStatusUI() {
    var run = readRun();
    var meta = readMeta();
    var el = document.getElementById("trackMeta");
    var cd = document.getElementById("countdown");
    var last = meta.lastSnap ? fmtClock(meta.lastSnap) : "ещё не было";
    var mins = Number(run.mins) || Number(document.getElementById("interval").value) || 30;

    if (el) {
      if (run.on) {
        el.textContent =
          "Фон ВКЛ · каждые " +
          mins +
          " мин · mode " +
          (run.mode || "—") +
          " · последний снимок: " +
          last;
      } else {
        el.textContent = "Фон выкл · последний снимок: " + last;
      }
    }

    var remainMs = null;
    if (run.on && run.nextSnapAt) {
      remainMs = Number(run.nextSnapAt) - Date.now();
    }

    if (cd) {
      if (run.on) {
        cd.textContent = "До следующего снимка: " + fmtRemain(remainMs);
        cd.className = "countdown on";
      } else {
        cd.textContent = "Обратный отсчёт: фон выключен";
        cd.className = "countdown";
      }
    }

    // mini status
    var label;
    if (run.on) {
      label = "через " + fmtRemain(remainMs);
      if (meta.lastSnap) label += " · был " + fmtClock(meta.lastSnap);
    } else {
      label = "ожидание";
      if (meta.lastSnap) label += " · был " + fmtClock(meta.lastSnap);
    }
    try {
      if (window.TarkovMini && TarkovMini.reportStatus) {
        TarkovMini.reportStatus({
          running: !!run.on,
          label: label,
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
    var next = Date.now() + mins * 60 * 1000;
    var run = readRun();
    writeRun(
      Object.assign({}, run, {
        on: true,
        mins: mins,
        mode: (document.getElementById("gameMode") || {}).value || run.mode || "pve",
        nextSnapAt: next,
        startedAt: run.startedAt || Date.now()
      })
    );
    window.__ttPollMins = mins;
    paintStatusUI();
    return next;
  }

  async function takeSnapshot() {
    await openDb();
    var mode = (document.getElementById("gameMode") || {}).value || "pve";
    var status = document.getElementById("status");
    if (status) {
      status.className = "status";
      status.textContent = "Снимаю цены…";
    }
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
    var now = Date.now();
    // batch write for speed
    await new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      var os = tx.objectStore(STORE);
      for (var i = 0; i < arr.length; i++) {
        var it = arr[i];
        if (!it || !it.id) continue;
        var avg = Number(it.avg24hPrice) || 0;
        var low = Number(it.lastLowPrice) || 0;
        var high = Number(it.high24hPrice || it.avg24hPrice) || 0;
        if (avg <= 0 && low <= 0) continue;
        os.add({
          itemId: it.id,
          ts: now,
          avg: avg,
          low: low,
          high: high,
          name: itemName(it),
          slug: it.normalizedName || "",
          icon: it.iconLink || ""
        });
        n++;
      }
      tx.oncomplete = resolve;
      tx.onerror = function () {
        reject(tx.error);
      };
    });

    writeMeta({ lastSnap: now, count: n, mode: mode });
    var run = readRun();
    var mins = Number(run.mins) || Number(document.getElementById("interval").value) || 30;
    if (run.on) {
      scheduleNext(mins);
    } else {
      paintStatusUI();
    }

    if (status) {
      status.className = "status ok";
      status.textContent = "Снимок: " + n + " предметов · " + fmtClock(now);
    }
    await renderList();
    if (selectedId) drawChart(selectedId);
    if (typeof Notify === "function") {
      Notify({
        title: "Динамика цен",
        body: "Снимок: " + n + " · " + fmtClock(now),
        tool: "tarkovtool-price-track.html",
        kind: "price"
      });
    }
  }

  async function renderList() {
    await openDb();
    var list = await allLatest();
    var q = ((document.getElementById("q") || {}).value || "").toLowerCase().trim();
    if (q) {
      list = list.filter(function (r) {
        return (
          (r.name || "").toLowerCase().indexOf(q) >= 0 ||
          (r.slug || "").toLowerCase().indexOf(q) >= 0 ||
          (r.itemId || "").toLowerCase().indexOf(q) >= 0
        );
      });
    }
    list.sort(function (a, b) {
      return (a.name || "").localeCompare(b.name || "", "ru");
    });
    var box = document.getElementById("itemList");
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<p class="meta">Пока пусто — нажми «Снять сейчас» или «Старт фона»</p>';
      return;
    }
    box.innerHTML = list
      .map(function (r) {
        var label = r.name || r.slug || r.itemId;
        return (
          '<div class="item-row" data-id="' +
          esc(r.itemId) +
          '">' +
          (r.icon ? '<img src="' + esc(r.icon) + '" alt="">' : "") +
          '<div class="nm">' +
          esc(label) +
          "</div>" +
          '<div class="pr">' +
          fmtRub(r.avg || r.low) +
          "</div></div>"
        );
      })
      .join("");
    box.querySelectorAll(".item-row").forEach(function (el) {
      el.onclick = function () {
        selectedId = el.getAttribute("data-id");
        viewRange = null;
        drawChart(selectedId);
      };
    });
  }

  function drawChart(itemId) {
    if (!itemId) return;
    historyFor(itemId)
      .then(function (hist) {
        lastHist = hist;
        var title = document.getElementById("chartTitle");
        var meta = document.getElementById("chartMeta");
        var tip = document.getElementById("chartTip");
        var canvas = document.getElementById("chart");
        if (!canvas) return;
        var ctx = canvas.getContext("2d");

        if (!hist.length) {
          if (title) title.textContent = "Нет данных";
          if (meta) meta.textContent = "";
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }

        var last = hist[hist.length - 1];
        if (title) title.textContent = last.name || itemId;
        if (meta) {
          meta.textContent =
            hist.length +
            " точек · avg " +
            fmtRub(last.avg) +
            " · low " +
            fmtRub(last.low) +
            " · high " +
            fmtRub(last.high);
        }

        var dpr = window.devicePixelRatio || 1;
        var wrap = canvas.parentElement;
        var cssW = Math.max(
          280,
          canvas.clientWidth || 0,
          wrap ? wrap.clientWidth : 0,
          Math.floor((document.querySelector(".container") || {}).clientWidth || 0) - 48
        );
        var cssH = 320;
        canvas.style.width = cssW + "px";
        canvas.style.height = cssH + "px";
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var W = cssW;
        var H = cssH;

        // background (always visible)
        ctx.fillStyle = "#12151c";
        ctx.fillRect(0, 0, W, H);

        var i0 = 0;
        var i1 = hist.length - 1;
        if (viewRange) {
          i0 = Math.max(0, Math.min(viewRange.i0, hist.length - 1));
          i1 = Math.max(i0, Math.min(viewRange.i1, hist.length - 1));
        }
        var slice = hist.slice(i0, i1 + 1);
        if (slice.length === 1) {
          slice = [slice[0], Object.assign({}, slice[0], { ts: (slice[0].ts || 0) + 60000 })];
        }

        var vals = [];
        slice.forEach(function (h) {
          if (chartSeries.avg && h.avg > 0) vals.push(Number(h.avg));
          if (chartSeries.low && h.low > 0) vals.push(Number(h.low));
          if (chartSeries.high && h.high > 0) vals.push(Number(h.high));
        });
        if (!vals.length) {
          ctx.fillStyle = "#c9a227";
          ctx.font = "14px sans-serif";
          ctx.fillText("Нет ненулевых цен в выбранных рядах", 16, H / 2);
          return;
        }

        var min = Math.min.apply(null, vals);
        var max = Math.max.apply(null, vals);
        if (min === max) {
          min = min * 0.95;
          max = max * 1.05 || 1;
        }
        var padL = 70;
        var padR = 16;
        var padT = 18;
        var padB = 40;
        var plotW = W - padL - padR;
        var plotH = H - padT - padB;

        function xAt(i) {
          return padL + (plotW * i) / Math.max(1, slice.length - 1);
        }
        function yAt(v) {
          return padT + plotH * (1 - (v - min) / (max - min || 1));
        }
        function tLabel(ts) {
          try {
            var d = new Date(ts);
            return (
              d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) +
              " " +
              d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
            );
          } catch (e) {
            return "";
          }
        }

        // grid + Y labels
        ctx.strokeStyle = "#2a3140";
        ctx.lineWidth = 1;
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

        // X labels
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        [0, Math.floor(slice.length / 2), slice.length - 1].forEach(function (idx) {
          if (slice[idx]) ctx.fillText(tLabel(slice[idx].ts), xAt(idx), H - padB + 8);
        });

        function strokeSeries(key, color) {
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          var started = false;
          for (var i = 0; i < slice.length; i++) {
            var v = Number(slice[i][key]) || 0;
            if (v <= 0) continue;
            var x = xAt(i);
            var y = yAt(v);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else ctx.lineTo(x, y);
          }
          if (started) ctx.stroke();
          for (var j = 0; j < slice.length; j++) {
            var v2 = Number(slice[j][key]) || 0;
            if (v2 <= 0) continue;
            ctx.beginPath();
            ctx.arc(xAt(j), yAt(v2), 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (chartSeries.high) strokeSeries("high", "#ff6b7a");
        if (chartSeries.avg) strokeSeries("avg", "#f0c14b");
        if (chartSeries.low) strokeSeries("low", "#3dd68c");

        // border
        ctx.strokeStyle = "#3a4254";
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

        if (hoverX != null && slice.length) {
          var rel = (hoverX - padL) / (plotW || 1);
          var hi = Math.round(rel * (slice.length - 1));
          hi = Math.max(0, Math.min(slice.length - 1, hi));
          var hx = xAt(hi);
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath();
          ctx.moveTo(hx, padT);
          ctx.lineTo(hx, padT + plotH);
          ctx.stroke();
          var h = slice[hi];
          var tipText =
            tLabel(h.ts) +
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
      })
      .catch(function (e) {
        var title = document.getElementById("chartTitle");
        if (title) title.textContent = "Ошибка графика: " + (e.message || e);
      });
  }

  function clearPollTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function armPollTimer(mins) {
    clearPollTimer();
    mins = Math.max(1, Number(mins) || 30);
    timer = setInterval(function () {
      takeSnapshot().catch(function () {});
    }, mins * 60 * 1000);
  }

  function startBg() {
    if (window.__ttStartLock) return;
    window.__ttStartLock = true;
    var saved = Number(readRun().mins);
    var mins = Math.max(1, Number(document.getElementById("interval").value) || saved || 30);
    document.getElementById("interval").value = mins;
    window.__ttPollMins = mins;
    writeRun({
      on: true,
      mins: mins,
      mode: document.getElementById("gameMode").value,
      startedAt: Date.now(),
      nextSnapAt: Date.now() // first snap now
    });
    takeSnapshot()
      .then(function () {
        armPollTimer(mins);
        scheduleNext(mins);
      })
      .catch(function (e) {
        var status = document.getElementById("status");
        if (status) {
          status.className = "status err";
          status.textContent = e.message || String(e);
        }
        // keep on but still schedule
        armPollTimer(mins);
        scheduleNext(mins);
      })
      .finally(function () {
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
      mins: prev.mins || Number(document.getElementById("interval").value) || 30,
      mode: prev.mode || document.getElementById("gameMode").value,
      nextSnapAt: null,
      startedAt: prev.startedAt || null
    });
    paintStatusUI();
  }

  function resumeIfNeeded() {
    var run = readRun();
    if (!run.on) {
      paintStatusUI();
      return;
    }
    var mins = Math.max(1, Number(run.mins) || 30);
    document.getElementById("interval").value = mins;
    if (run.mode) document.getElementById("gameMode").value = run.mode;
    window.__ttPollMins = mins;

    var next = Number(run.nextSnapAt) || 0;
    var now = Date.now();
    if (!next || next <= now) {
      // due now
      takeSnapshot()
        .then(function () {
          armPollTimer(mins);
          scheduleNext(mins);
        })
        .catch(function () {
          armPollTimer(mins);
          scheduleNext(mins);
        });
    } else {
      // wait until nextSnapAt, then regular interval
      var delay = next - now;
      clearPollTimer();
      timer = setTimeout(function () {
        takeSnapshot()
          .then(function () {
            armPollTimer(mins);
            scheduleNext(mins);
          })
          .catch(function () {
            armPollTimer(mins);
            scheduleNext(mins);
          });
      }, delay);
    }
    paintStatusUI();
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
    canvas.addEventListener(
      "wheel",
      function (e) {
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
      },
      { passive: false }
    );
    document.querySelectorAll("[data-series]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-series");
        chartSeries[k] = !chartSeries[k];
        btn.classList.toggle("on", chartSeries[k]);
        if (selectedId) drawChart(selectedId);
      });
    });
    var reset = document.getElementById("chartResetZoom");
    if (reset) {
      reset.onclick = function () {
        viewRange = null;
        if (selectedId) drawChart(selectedId);
      };
    }
    window.addEventListener("resize", function () {
      if (selectedId) drawChart(selectedId);
    });
  }

  document.getElementById("startBtn").onclick = startBg;
  document.getElementById("stopBtn").onclick = stopBg;
  document.getElementById("snapBtn").onclick = function () {
    takeSnapshot().catch(function (e) {
      var status = document.getElementById("status");
      if (status) {
        status.className = "status err";
        status.textContent = e.message || String(e);
      }
    });
  };
  document.getElementById("q").oninput = function () {
    renderList().catch(function () {});
  };

  openDb()
    .then(function () {
      renderList();
      wireChart();
      startCountdownLoop();
      resumeIfNeeded();
    })
    .catch(function (e) {
      var status = document.getElementById("status");
      if (status) {
        status.className = "status err";
        status.textContent = String(e.message || e);
      }
    });
})();
