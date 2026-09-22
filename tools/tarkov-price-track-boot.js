/** Price-track boot: mini status + i18n from TarkovPoll */
(function () {
  var POLL_ID = "price-track";
  var META_KEY = "tarkovPriceTrackMeta";

  function readMeta() {
    try {
      return (window.TarkovStorage && TarkovStorage.getJson(META_KEY, {})) || {};
    } catch (e) {
      return {};
    }
  }

  function tt(key, fallback, params) {
    var text = fallback || key;
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) text = v;
      }
    } catch (e) {}
    if (params) {
      Object.keys(params).forEach(function (k) {
        text = String(text).split("{" + k + "}").join(String(params[k]));
      });
    }
    return text;
  }

  function fmtClock(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }

  function fmtRemain(ms) {
    if (ms == null || isNaN(ms)) return "—";
    var isRu = (document.documentElement.lang || "").indexOf("ru") === 0;
    if (ms <= 0) return isRu ? "сейчас" : "now";
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    if (m >= 60) {
      var h = Math.floor(m / 60);
      m = m % 60;
      return isRu ? h + "ч " + m + "м" : h + "h " + String(m).padStart(2, "0") + "m";
    }
    return isRu
      ? m + "м " + String(sec).padStart(2, "0") + "с"
      : m + "m " + String(sec).padStart(2, "0") + "s";
  }

  function reportMini(running, label) {
    if (window.TarkovPoll && TarkovPoll.reportMini) {
      TarkovPoll.reportMini("tarkovtool-price-track.html", running, label);
      return;
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "tt-status",
            tool: "tarkovtool-price-track.html",
            running: !!running,
            label: label || ""
          },
          location.origin
        );
      }
    } catch (e) {}
  }

  function paintStatus() {
    var st = window.TarkovPoll
      ? TarkovPoll.status(POLL_ID)
      : { on: false, mins: 30, remainMs: null };
    var meta = readMeta();
    var el = document.getElementById("trackMeta");
    var cd = document.getElementById("countdown");
    var mins = st.mins || Number((document.getElementById("interval") || {}).value) || 30;
    var last = meta.lastSnap ? fmtClock(meta.lastSnap) : "-";
    var countStr = meta.count != null ? " (" + meta.count + ")" : "";
    if (el) {
      el.textContent = st.on
        ? tt("priceTrack.bgOn", "BG ON · every {mins} min · last {last}{count}", {
            mins: mins,
            last: last,
            count: countStr
          })
        : tt("priceTrack.bgOff", "BG off · last {last}", { last: last });
    }
    if (cd) {
      if (st.on) {
        var inFlight = st.inFlight;
        try {
          if (!inFlight && window.__ttSnapInFlight)
            inFlight = window.__ttSnapInFlight();
        } catch (e) {}
        if (inFlight) {
          cd.textContent = tt("priceTrack.fetching", "Fetching…");
        } else {
          cd.textContent = tt("priceTrack.next", "Next: {remain}", {
            remain: fmtRemain(st.remainMs)
          });
        }
        cd.className = "countdown on";
      } else {
        cd.textContent = tt("priceTrack.countdownOff", "Countdown off");
        cd.className = "countdown";
      }
    }
    if (st.on) {
      reportMini(
        true,
        tt("priceTrack.next", "Next: {remain}", {
          remain: fmtRemain(st.remainMs)
        })
      );
    } else {
      reportMini(false, tt("priceTrack.idle", "idle"));
    }
  }

  function applyI18n() {
    try {
      if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
    } catch (e) {}
    paintStatus();
  }

  setInterval(paintStatus, 1000);
  function bootI18n() {
    if (window.TarkovI18n && TarkovI18n.ready) {
      (typeof TarkovI18n.ready === "function"
        ? TarkovI18n.ready()
        : Promise.resolve(TarkovI18n.ready)
      ).then(applyI18n);
    } else {
      applyI18n();
    }
  }
  bootI18n();
  setTimeout(bootI18n, 600);
  window.addEventListener("tt-lang-changed", applyI18n);
})();
