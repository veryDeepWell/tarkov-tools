(function () {
  "use strict";
  var POLL_ID = "restock";
  var TOOL = "tarkovtool-restock.html";

  // P0: migrate pre-prefix keys → tarkov* (export-compatible)
  (function migrateRestockKeys() {
    try {
      if (!window.TarkovStorage || !TarkovStorage.migrateKey) return;
      TarkovStorage.migrateKey("restockEnabled", "tarkovRestockEnabled");
      TarkovStorage.migrateKey("restockHistory", "tarkovRestockHistory");
      TarkovStorage.migrateKey("restockFired", "tarkovRestockFired");
      TarkovStorage.migrateKey("restockCycleMs", "tarkovRestockCycleMs");
      TarkovStorage.migrateKey("restockSnapshot", "tarkovRestockSnapshot");
    } catch (e) {}
  })();
  /** Default trader restock period (EFT: most traders every 3h) */
  var DEFAULT_CYCLE_MS = 3 * 60 * 60 * 1000;
  var TRADER_RU = {
    prapor: "Прапор",
    therapist: "Терапевт",
    fence: "Скупщик",
    skier: "Лыжник",
    peacekeeper: "Миротворец",
    mechanic: "Механик",
    ragman: "Барахольщик",
    jaeger: "Егерь",
    ref: "Реф",
    lightkeeper: "Смотритель"
  };
  var ORDER = [
    "prapor",
    "therapist",
    "skier",
    "peacekeeper",
    "mechanic",
    "ragman",
    "jaeger",
    "ref",
    "fence",
    "lightkeeper"
  ];
  var traders = [];
  var fired = {};
  var restockHistory = {};
  var refetchQueued = false;
  var uiTick = null;
  /** key -> last known cycle ms */
  var cycleMs = {};

  var listEl = document.getElementById("list");
  var statusEl = document.getElementById("status");
  var loadBtn = document.getElementById("loadBtn");
  var refreshBtn = document.getElementById("refreshBtn");

  function loadEnabled() {
    if (window.TarkovStorage && TarkovStorage.getJson)
      return TarkovStorage.getJson("tarkovRestockEnabled", {}) || {};
    try { return JSON.parse(localStorage.getItem("tarkovRestockEnabled") || "{}") || {}; } catch (e) { return {}; }
  }
  function saveEnabled() {
    var map = {};
    traders.forEach(function (t) {
      map[t.key] = t.enabled;
    });
    if (window.TarkovStorage) TarkovStorage.setJson("tarkovRestockEnabled", map);
  }
  function loadHistory() {
    var raw =
      (window.TarkovStorage && TarkovStorage.getJson("tarkovRestockHistory", {})) || {};
    restockHistory = {};
    Object.keys(raw).forEach(function (k) {
      var v = raw[k];
      if (v && v.happenedAt)
        restockHistory[k] = {
          key: k,
          name: v.name || k,
          happenedAt: Number(v.happenedAt)
        };
    });
    fired =
      (window.TarkovStorage && TarkovStorage.getJson("tarkovRestockFired", {})) || {};
    cycleMs =
      (window.TarkovStorage && TarkovStorage.getJson("tarkovRestockCycleMs", {})) || {};
  }
  function saveHistory() {
    try {
      if (window.TarkovStorage) {
        TarkovStorage.setJson("tarkovRestockHistory", restockHistory);
        TarkovStorage.setJson("tarkovRestockFired", fired);
        TarkovStorage.setJson("tarkovRestockCycleMs", cycleMs);
      }
    } catch (e) {}
  }

  function formatRemain(ms) {
    if (ms <= 0) return "0с";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "ч " + String(m).padStart(2, "0") + "м";
    if (m > 0) return m + "м " + String(sec).padStart(2, "0") + "с";
    return sec + "с";
  }
  function formatAbs(d) {
    try {
      return d.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }
  function formatAgo(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return "только что";
    if (m < 60) return m + " мин назад";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " ч назад";
    return Math.floor(h / 24) + " дн назад";
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

  function cycleFor(key) {
    var c = Number(cycleMs[key]) || 0;
    if (c >= 30 * 60 * 1000 && c <= 12 * 60 * 60 * 1000) return c;
    return DEFAULT_CYCLE_MS;
  }

  /** Push resetAt forward until it is strictly in the future. */
  function rollForward(t, now) {
    if (!t.resetAt) return;
    var cycle = cycleFor(t.key);
    var ts = t.resetAt.getTime();
    if (ts > now) return;
    // remember previous reset for cycle learning after API refresh
    t._prevResetAt = ts;
    while (ts <= now) ts += cycle;
    t.resetAt = new Date(ts);
    t._rolled = true;
  }

  async function fetchTraders() {
    var modeEl = document.getElementById("gameMode");
    var mode = (modeEl && modeEl.value) || "pve";
    if (mode === "regular") mode = "pvp";
    if (!window.TarkovAPI || !TarkovAPI.traders)
      throw new Error("TarkovAPI.traders missing");
    var list = await TarkovAPI.traders(mode);
    if (!list || !list.length) throw new Error("No traders from API");
    var enabledMap = loadEnabled();
    var now = Date.now();
    var prevByKey = {};
    traders.forEach(function (t) {
      prevByKey[t.key] = t;
    });
    traders = list
      .map(function (t) {
        var key = (t.normalizedName || t.id || "").toLowerCase();
        var resetAt = t.resetTime ? new Date(t.resetTime) : null;
        var enabled = enabledMap[key];
        if (enabled === undefined)
          enabled = key !== "fence" && key !== "lightkeeper";
        var row = {
          id: t.id,
          key: key,
          name: TRADER_RU[key] || t.name || key,
          resetAt: resetAt,
          enabled: !!enabled
        };
        // Learn cycle if we had a previous reset and API gave a new future time
        var prev = prevByKey[key];
        if (prev && prev.resetAt && resetAt && !isNaN(resetAt.getTime())) {
          var oldTs = prev._prevResetAt || prev.resetAt.getTime();
          var newTs = resetAt.getTime();
          if (newTs > now && oldTs < newTs) {
            var delta = newTs - oldTs;
            if (delta >= 30 * 60 * 1000 && delta <= 12 * 60 * 60 * 1000) {
              cycleMs[key] = delta;
            }
          }
        }
        // API still past? roll locally so UI never sticks on «сейчас»
        if (row.resetAt && row.resetAt.getTime() <= now) {
          rollForward(row, now);
        }
        return row;
      })
      .filter(function (t) {
        return t.resetAt && !isNaN(t.resetAt.getTime());
      });
    traders.sort(function (a, b) {
      var ia = ORDER.indexOf(a.key),
        ib = ORDER.indexOf(b.key);
      if (ia === -1 && ib === -1) return a.name.localeCompare(b.name, "ru");
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    try {
      if (window.TarkovStorage) {
        TarkovStorage.setJson("tarkovRestockCycleMs", cycleMs);
        TarkovStorage.setJson("tarkovRestockSnapshot", {
          _v: 1,
          traders: traders.map(function (t) {
            return {
              id: t.id,
              key: t.key,
              name: t.name,
              resetAt: t.resetAt ? t.resetAt.getTime() : 0,
              enabled: !!t.enabled,
              _prevResetAt: t._prevResetAt || null
            };
          })
        });
      }
    } catch (e) {}
  }

  function onRestock(t) {
    var iso = t.resetAt ? t.resetAt.toISOString() : String(Date.now());
    // Use stable fire key from the reset that just passed
    var fireKey = t._prevResetAt ? String(t._prevResetAt) : iso;
    if (fired[t.key] === fireKey) return;
    fired[t.key] = fireKey;
    restockHistory[t.key] = {
      key: t.key,
      name: t.name,
      happenedAt: Date.now()
    };
    saveHistory();
    try {
      if (typeof Notify === "function") {
        Notify({
          title: "Restock: " + t.name,
          body: "Assortment refreshed",
          tool: TOOL,
          kind: "restock",
          i18nTitle: "restock.notifTitle",
          i18nBody: "restock.notifBody",
          i18nParams: { name: t.name }
        });
      } else if (window.TarkovTools && TarkovTools.Notify) {
        TarkovTools.Notify({
          title: "Restock: " + t.name,
          body: "Assortment refreshed",
          tool: TOOL,
          kind: "restock",
          i18nTitle: "restock.notifTitle",
          i18nBody: "restock.notifBody",
          i18nParams: { name: t.name }
        });
      }
    } catch (e) {}
    reportMini(true, "restock " + t.name);
    queueRefetch();
  }

  function queueRefetch() {
    if (refetchQueued) return;
    refetchQueued = true;
    // Quick pull so API next-reset corrects our optimistic roll
    setTimeout(async function () {
      refetchQueued = false;
      try {
        await fetchTraders();
        if (statusEl) {
          statusEl.className = "status ok";
          statusEl.textContent =
            "Новые времена · " + new Date().toLocaleTimeString("ru-RU");
        }
        render();
      } catch (e) {
        if (statusEl) {
          statusEl.className = "status err";
          statusEl.textContent = e.message;
        }
      }
    }, 800);
  }

  function render() {
    var now = Date.now();
    if (!listEl) return;
    if (!traders.length) {
      listEl.innerHTML = '<p class="status">Нет данных</p>';
      renderHistory();
      return;
    }
    listEl.innerHTML = "";
    traders.forEach(function (t) {
      var remain = t.resetAt.getTime() - now;

      // Hit zero → notify once, immediately start next cycle countdown
      if (remain <= 0) {
        if (t.enabled) onRestock(t);
        rollForward(t, now);
        remain = t.resetAt.getTime() - now;
      }

      var label = formatRemain(remain);
      var justFired =
        restockHistory[t.key] &&
        now - restockHistory[t.key].happenedAt < 8000;
      var badge = justFired
        ? ' <span style="color:var(--green)">обновлён</span>'
        : "";

      var div = document.createElement("div");
      div.style.cssText =
        "display:grid;grid-template-columns:28px 1fr auto auto;gap:12px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;opacity:" +
        (t.enabled ? "1" : "0.4");
      div.innerHTML =
        '<input type="checkbox" ' +
        (t.enabled ? "checked" : "") +
        "><div><b>" +
        t.name +
        "</b>" +
        badge +
        '<div class="meta">' +
        t.key +
        '</div></div><div style="font-weight:700;font-variant-numeric:tabular-nums">' +
        label +
        '</div><div class="meta">' +
        formatAbs(t.resetAt) +
        "</div>";
      div.querySelector("input").onchange = function (e) {
        t.enabled = e.target.checked;
        saveEnabled();
        render();
      };
      listEl.appendChild(div);
    });
    renderHistory();
  }

  function renderHistory() {
    var el = document.getElementById("historyList");
    if (!el) return;
    var now = Date.now();
    var entries = Object.keys(restockHistory).map(function (k) {
      return restockHistory[k];
    });
    if (traders.length) {
      entries = entries.filter(function (h) {
        var t = traders.find(function (x) {
          return x.key === h.key;
        });
        return t ? t.enabled : true;
      });
    }
    entries.sort(function (a, b) {
      return b.happenedAt - a.happenedAt;
    });
    if (!entries.length) {
      el.innerHTML = '<p class="status">Пока пусто</p>';
      return;
    }
    el.innerHTML = entries
      .map(function (h) {
        return (
          '<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px"><b>' +
          h.name +
          "</b> · " +
          formatAgo(now - h.happenedAt) +
          "</div>"
        );
      })
      .join("");
  }

  function startUiTick() {
    if (uiTick) return;
    uiTick = setInterval(render, 1000);
  }

  function startPoll() {
    if (!window.TarkovPoll) return;
    TarkovPoll.start(
      POLL_ID,
      1,
      function () {
        return fetchTraders().then(function () {
          render();
        });
      },
      { fireNow: false, label: "restock", tool: TOOL }
    );
  }

  async function doLoad() {
    if (loadBtn) loadBtn.disabled = true;
    if (statusEl) {
      statusEl.className = "status";
      statusEl.textContent = "Гружу…";
    }
    try {
      await fetchTraders();
      if (statusEl) {
        statusEl.className = "status ok";
        statusEl.textContent = "Загружено " + traders.length;
      }
      if (refreshBtn) refreshBtn.disabled = false;
      render();
      startUiTick();
      startPoll();
      reportMini(true, "watching");
    } catch (e) {
      if (statusEl) {
        statusEl.className = "status err";
        statusEl.textContent = e.message;
      }
    } finally {
      if (loadBtn) loadBtn.disabled = false;
    }
  }

  if (loadBtn) loadBtn.onclick = doLoad;
  if (refreshBtn)
    refreshBtn.onclick = async function () {
      refreshBtn.disabled = true;
      try {
        await fetchTraders();
        if (statusEl) {
          statusEl.className = "status ok";
          statusEl.textContent = "Обновлено";
        }
        render();
      } catch (e) {
        if (statusEl) {
          statusEl.className = "status err";
          statusEl.textContent = e.message;
        }
      } finally {
        refreshBtn.disabled = false;
      }
    };
  var clearBtn = document.getElementById("clearHistoryBtn");
  if (clearBtn)
    clearBtn.onclick = function () {
      restockHistory = {};
      fired = {};
      saveHistory();
      renderHistory();
    };
  var notifBtn = document.getElementById("notifBtn");
  if (notifBtn)
    notifBtn.onclick = async function () {
      if (!("Notification" in window)) return;
      var p = await Notification.requestPermission();
      if (statusEl) statusEl.textContent = p === "granted" ? "OK" : "denied";
    };
  var testBtn = document.getElementById("testSoundBtn");
  if (testBtn)
    testBtn.onclick = function () {
      try {
        if (typeof Notify === "function")
          Notify({
            title: "Restock test",
            body: "test",
            tool: TOOL,
            kind: "restock",
            i18nTitle: "restock.testTitle",
            i18nBody: "restock.testBody"
          });
        else if (window.TarkovTools && TarkovTools.beep)
          TarkovTools.beep("restock");
      } catch (e) {}
    };


  function restoreFromSnapshot() {
    try {
      var snap =
        (window.TarkovStorage && TarkovStorage.getJson("tarkovRestockSnapshot", null)) ||
        null;
      if (!snap || !snap.length) return false;
      var enabledMap = loadEnabled();
      var now = Date.now();
      traders = snap
        .map(function (s) {
          var enabled = enabledMap[s.key];
          if (enabled === undefined) enabled = s.enabled;
          var row = {
            id: s.id,
            key: s.key,
            name: s.name || TRADER_RU[s.key] || s.key,
            resetAt: s.resetAt ? new Date(Number(s.resetAt)) : null,
            enabled: !!enabled,
            _prevResetAt: s._prevResetAt || null
          };
          if (row.resetAt && row.resetAt.getTime() <= now) {
            rollForward(row, now);
          }
          return row;
        })
        .filter(function (t) {
          return t.resetAt && !isNaN(t.resetAt.getTime());
        });
      return traders.length > 0;
    } catch (e) {
      return false;
    }
  }

  loadHistory();
  try {
    var st = window.TarkovPoll ? TarkovPoll.status(POLL_ID) : null;
    var restored = restoreFromSnapshot();
    if (restored) {
      render();
      startUiTick();
      startPoll();
      reportMini(true, "watching");
      if (refreshBtn) refreshBtn.disabled = false;
      if (statusEl) {
        statusEl.className = "status ok";
        statusEl.textContent = "Восстановлено " + traders.length + " (фон)";
      }
    } else if (st && st.on) {
      // Poll marked on but no snapshot — soft resume marker for mini
      reportMini(true, "watching");
    }
  } catch (eBoot) {}
  // Do NOT stop poll / uiTick on pagehide — hub used to move iframes (reload)
  // and pagehide would kill background restock. Live tools must keep running.
  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    var d = ev.data;
    if (!d || typeof d !== "object") return;
    // Parent hub heartbeat — keep countdown/notify alive when iframe is under another tool
    if (d.type === "tt-tick") {
      if (traders.length) {
        try {
          render();
        } catch (e) {}
      }
      return;
    }
    if (d.type === "tt-ping-status") {
      var st = window.TarkovPoll ? TarkovPoll.status(POLL_ID) : { on: false };
      var label = "idle";
      if (st.on && traders.length) {
        var now = Date.now();
        var soon = null;
        traders.forEach(function (t) {
          if (!t.enabled || !t.resetAt) return;
          var r = t.resetAt.getTime() - now;
          if (soon == null || r < soon) soon = r;
        });
        label = soon != null ? formatRemain(Math.max(0, soon)) : "watching";
      } else if (st.on) {
        label = "watching";
      }
      reportMini(!!st.on || !!traders.length, label);
    }
  });
})();
