(function () {
  "use strict";
  var POLL_ID = "restock";
  var TOOL = "tarkovtool-restock.html";
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

  function itemName(it) {
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    if (!it) return "";
    if (typeof it === "string") return it;
    var s = String(it.shortName || it.name || "").trim();
    if (!s || /^[a-f0-9]{20,}$/i.test(s)) {
      var n = String(it.name || "").trim();
      var sl = String(it.normalizedName || "").trim();
      if (n && !/^[a-f0-9]{20,}$/i.test(n)) s = n;
      else if (sl) s = sl.replace(/[-_]+/g, " ");
    }
    return s || it.id || "";
  }

  var listEl = document.getElementById("list");
  var statusEl = document.getElementById("status");
  var loadBtn = document.getElementById("loadBtn");
  var refreshBtn = document.getElementById("refreshBtn");

  function loadEnabled() {
    return (window.TarkovStorage && TarkovStorage.getJson("restockEnabled", {})) || {};
  }
  function saveEnabled() {
    var map = {};
    traders.forEach(function (t) {
      map[t.key] = t.enabled;
    });
    if (window.TarkovStorage) TarkovStorage.setJson("restockEnabled", map);
  }
  function loadHistory() {
    var raw =
      (window.TarkovStorage && TarkovStorage.getJson("restockHistory", {})) || {};
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
      (window.TarkovStorage && TarkovStorage.getJson("restockFired", {})) || {};
  }
  function saveHistory() {
    try {
      if (window.TarkovStorage) {
        TarkovStorage.setJson("restockHistory", restockHistory);
        TarkovStorage.setJson("restockFired", fired);
      }
    } catch (e) {}
  }

  function formatRemain(ms) {
    if (ms <= 0) return "сейчас";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "ч " + String(m).padStart(2, "0") + "м";
    return m + "м " + String(sec).padStart(2, "0") + "с";
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

  async function fetchTraders() {
    var modeEl = document.getElementById("gameMode");
    var mode = (modeEl && modeEl.value) || "pve";
    if (mode === "regular") mode = "pvp";
    if (!window.TarkovAPI || !TarkovAPI.traders)
      throw new Error("TarkovAPI.traders missing");
    var list = await TarkovAPI.traders(mode);
    if (!list || !list.length) throw new Error("No traders from API");
    var enabledMap = loadEnabled();
    traders = list
      .map(function (t) {
        var key = (t.normalizedName || t.id || "").toLowerCase();
        var resetAt = t.resetTime ? new Date(t.resetTime) : null;
        var enabled = enabledMap[key];
        if (enabled === undefined)
          enabled = key !== "fence" && key !== "lightkeeper";
        return {
          id: t.id,
          key: key,
          name: TRADER_RU[key] || t.name || key,
          resetAt: resetAt,
          enabled: !!enabled
        };
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
  }

  function onRestock(t) {
    var iso = t.resetAt.toISOString();
    if (fired[t.key] === iso) return;
    fired[t.key] = iso;
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
          kind: "restock"
        });
      } else if (window.TarkovTools && TarkovTools.Notify) {
        TarkovTools.Notify({
          title: "Restock: " + t.name,
          body: "Assortment refreshed",
          tool: TOOL,
          kind: "restock"
        });
      }
    } catch (e) {}
    reportMini(true, "restock " + t.name);
    queueRefetch();
  }

  function queueRefetch() {
    if (refetchQueued) return;
    refetchQueued = true;
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
    }, 2500);
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
      var badge = "";
      var label = formatRemain(remain);
      if (remain <= 0) {
        label = "РЕСТОК";
        badge = ' <span style="color:var(--green)">сейчас</span>';
        if (t.enabled) onRestock(t);
      }
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
            kind: "restock"
          });
        else if (window.TarkovTools && TarkovTools.beep)
          TarkovTools.beep("restock");
      } catch (e) {}
    };

  loadHistory();
  window.addEventListener("pagehide", function () {
    if (uiTick) {
      clearInterval(uiTick);
      uiTick = null;
    }
    try {
      if (window.TarkovPoll) TarkovPoll.stop(POLL_ID);
    } catch (e) {}
  });
  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    if (ev.data && ev.data.type === "tt-ping-status") {
      var st = window.TarkovPoll ? TarkovPoll.status(POLL_ID) : { on: false };
      reportMini(!!st.on, st.on ? "watching" : "idle");
    }
  });
})();
