/** Hub notification panel — binds #notifBell / #notifPanel */
(function () {
  "use strict";

  function allNotifications() {
    try {
      if (window.TarkovStorage && TarkovStorage.getJson) {
        var list = TarkovStorage.getJson("tarkovNotifications.v1", []) || [];
        return Array.isArray(list) ? list : [];
      }
    } catch (e0) {}
    try {
      return JSON.parse(localStorage.getItem("tarkovNotifications.v1") || "[]") || [];
    } catch (e) {
      return [];
    }
  }

  function totalUnread() {
    return allNotifications().filter(function (n) {
      return !n.read;
    }).length;
  }

  function updateNotifBell() {
    var el = document.getElementById("notifCount");
    var btn = document.getElementById("notifBell") || document.getElementById("btnNotif");
    var n = totalUnread();
    if (el) el.textContent = String(n);
    if (btn) {
      if (n > 0) {
        btn.classList.add("has-unread");
        btn.hidden = false;
        btn.removeAttribute("hidden");
      } else {
        btn.classList.remove("has-unread");
        btn.hidden = false;
        btn.removeAttribute("hidden");
      }
    }
  }

  function esc(s) {
    var amp = String.fromCharCode(38);
    return String(s || "")
      .replace(/&/g, amp + "amp;")
      .replace(/</g, amp + "lt;")
      .replace(/>/g, amp + "gt;")
      .replace(/"/g, amp + "quot;");
  }

  function tt(key, fb) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fb || key;
  }

  function renderNotifPanel() {
    var box = document.getElementById("notifList");
    if (!box) return;
    var list = allNotifications()
      .slice()
      .sort(function (a, b) {
        return (b.ts || 0) - (a.ts || 0);
      });
    if (!list.length) {
      box.innerHTML = '<p class="meta">' + esc(tt("hub.notifEmpty", "Пока пусто")) + "</p>";
      return;
    }
    box.innerHTML = list
      .map(function (n) {
        var when = "";
        if (n.ts) {
          try {
            var loc = "ru-RU";
            try {
              if (window.TarkovI18n && TarkovI18n.lang) {
                var lg = TarkovI18n.lang();
                if (lg === "en") loc = "en-US";
                else if (lg === "uk") loc = "uk-UA";
                else if (lg === "de") loc = "de-DE";
                else if (lg === "zh-CN") loc = "zh-CN";
              }
            } catch (eL) {}
            when = new Date(n.ts).toLocaleString(loc);
          } catch (eD) {
            when = new Date(n.ts).toLocaleString();
          }
        }
        var tool = String(n.tool || "")
          .replace(/^.*\//, "")
          .replace("tarkovtool-", "")
          .replace(".html", "");
        var cls = n.read ? "" : " unread";
        return (
          '<div class="n-row' +
          cls +
          '"><div class="n-title">' +
          esc(n.title || "—") +
          "</div>" +
          (n.body ? '<div class="n-body">' + esc(n.body) + "</div>" : "") +
          '<div class="n-meta">' +
          esc(when) +
          (tool ? " · " + esc(tool) : "") +
          "</div></div>"
        );
      })
      .join("");
  }

  function openNotifPanel() {
    renderNotifPanel();
    var panel = document.getElementById("notifPanel");
    if (!panel) return;
    panel.hidden = false;
    panel.removeAttribute("hidden");
    panel.classList.add("show");
    panel.style.display = "block";
  }

  function closeNotifPanel() {
    var panel = document.getElementById("notifPanel");
    if (!panel) return;
    panel.hidden = true;
    panel.setAttribute("hidden", "");
    panel.classList.remove("show");
    panel.style.display = "none";
  }

  function markAllRead() {
    try {
      var list = allNotifications().map(function (n) {
        return Object.assign({}, n, { read: true });
      });
      if (window.TarkovStorage && TarkovStorage.setJson) TarkovStorage.setJson("tarkovNotifications.v1", list);
      else localStorage.setItem("tarkovNotifications.v1", JSON.stringify(list));
    } catch (e) {}
    try {
      if (window.TarkovState && TarkovState.getMiniTabs) {
        (TarkovState.getMiniTabs() || []).forEach(function (t) {
          if (TarkovState.markToolRead) TarkovState.markToolRead(t.file || t);
        });
      }
    } catch (e) {}
    renderNotifPanel();
    updateNotifBell();
    try {
      if (typeof renderMiniList === "function") renderMiniList();
    } catch (e) {}
  }

  if (typeof expandTab === "function") {
    var _expand = expandTab;
    window.expandTab = function (file) {
      var saved = null;
      if (window.TarkovState && TarkovState.markToolRead) {
        saved = TarkovState.markToolRead;
        TarkovState.markToolRead = function () {};
      }
      try {
        return _expand(file);
      } finally {
        if (saved) TarkovState.markToolRead = saved;
      }
    };
  }

  function refreshNotifUI() {
    updateNotifBell();
    var panel = document.getElementById("notifPanel");
    if (panel && !panel.hidden && panel.classList.contains("show")) {
      try {
        renderNotifPanel();
      } catch (e) {}
    }
    try {
      if (typeof renderMiniList === "function") renderMiniList();
    } catch (e) {}
  }

  try {
    if (window.TarkovState && TarkovState.on) {
      TarkovState.on("notification", refreshNotifUI);
    }
  } catch (e) {}
  try {
    window.addEventListener("storage", function (e) {
      if (e.key === "tarkovNotifications.v1") refreshNotifUI();
    });
  } catch (e) {}
  try {
    window.addEventListener("message", function (ev) {
      if (ev.origin !== location.origin) return;
      if (!ev.data || typeof ev.data !== "object") return;
      if (ev.data.type === "tt-notify") {
        refreshNotifUI();
        if (ev.data.silent !== true) {
          try {
            var k = ev.data.kind || "ok";
            var tool = ev.data.tool || "";
            if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep(k, tool);
            else if (typeof beep === "function") beep(k, tool);
          } catch (eB) {}
        }
      }
      if (ev.data.type === "tt-beep" && ev.data.kind) {
        try {
          var tool2 = ev.data.tool || "";
          if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep(ev.data.kind, tool2);
          else if (typeof beep === "function") beep(ev.data.kind, tool2);
        } catch (eB2) {}
      }
    });
  } catch (e) {}

  function bind() {
    var btn = document.getElementById("notifBell") || document.getElementById("btnNotif");
    if (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var panel = document.getElementById("notifPanel");
        if (panel && !panel.hidden && panel.classList.contains("show")) closeNotifPanel();
        else openNotifPanel();
      };
    }
    var close = document.getElementById("notifClose");
    if (close) close.onclick = closeNotifPanel;
    var mark =
      document.getElementById("notifClear") ||
      document.getElementById("notifMarkAll");
    if (mark) mark.onclick = markAllRead;
    document.addEventListener("click", function (e) {
      var panel = document.getElementById("notifPanel");
      var bell = document.getElementById("notifBell") || document.getElementById("btnNotif");
      if (!panel || panel.hidden) return;
      if (panel.contains(e.target)) return;
      if (bell && bell.contains(e.target)) return;
      closeNotifPanel();
    });
    updateNotifBell();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
  setTimeout(bind, 100);
  setTimeout(bind, 500);
  setInterval(function () {
    updateNotifBell();
    try {
      if (typeof renderMiniList === "function") renderMiniList();
    } catch (e) {}
  }, 2000);

  window.updateNotifBell = updateNotifBell;
})();
