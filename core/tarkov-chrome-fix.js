/*! Hub chrome — settings/lang/FAQ in .tt-bar only; theme only in settings */
(function () {
  "use strict";

  function isHub() {
    try {
      var p = location.pathname || "";
      return /tarkovtool-hub\.html$/i.test(p) || /\/$/.test(p) || /index\.html$/i.test(p);
    } catch (e) {
      return false;
    }
  }

  function callOpenSettings() {
    try {
      if (window.TarkovTools && typeof TarkovTools.openSettings === "function") {
        TarkovTools.openSettings();
        return;
      }
    } catch (e) {}
  }

  function openFaq() {
    var bg = document.getElementById("tt-faq-bg");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "tt-faq-bg";
      bg.className = "modal-bg";
      bg.innerHTML =
        '<div class="modal" style="max-width:min(560px,94vw)">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px">' +
        '<h2 style="margin:0">FAQ</h2>' +
        '<button type="button" class="btn-ghost" id="tt-faq-x" style="min-width:36px!important;padding:0 10px">×</button></div>' +
        '<div id="tt-faq-body" style="color:var(--muted);line-height:1.5;font-size:.95rem"></div></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) {
        if (e.target === bg) {
          bg.classList.remove("show");
          bg.hidden = true;
          bg.style.display = "none";
        }
      });
      var x = document.getElementById("tt-faq-x");
      if (x)
        x.onclick = function () {
          bg.classList.remove("show");
          bg.hidden = true;
          bg.style.display = "none";
        };
    }
    var body = document.getElementById("tt-faq-body");
    if (body) {
      var html = "";
      try {
        if (window.TarkovI18n && TarkovI18n.t) {
          var b = TarkovI18n.t("hub.faqBody");
          if (b && b.indexOf("hub.") !== 0) html = b;
        }
      } catch (e) {}
      if (!html) {
        html =
          "<p><b style=\"color:var(--text)\">Что это?</b><br>" +
          "Tarkov Tools — набор утилит для Escape from Tarkov: цены, бартер, лоадауты, убежище и т.д. Всё в одном хабе.</p>" +
          "<p><b style=\"color:var(--text)\">Как открыть инструмент?</b><br>" +
          "Клик по карточке открывает мини-вкладку. Правый клик по чипу MINI — закрыть. Ctrl/Cmd+клик — в новой вкладке.</p>" +
          "<p><b style=\"color:var(--text)\">Что такое MINI?</b><br>" +
          "Панель фоновых/открытых инструментов. Live-тулзы (трекер цен, сирена, ресток) могут работать в фоне.</p>" +
          "<p><b style=\"color:var(--text)\">Где настройки?</b><br>" +
          "Кнопка Settings в шапке. Тема, язык, звук и скрытие тулзов — только там.</p>" +
          "<p><b style=\"color:var(--text)\">Локализация</b><br>" +
          "Язык в настройках. Недостающие строки подставляются из English.</p>";
      }
      body.innerHTML = html;
    }
    var titleEl = document.getElementById("tt-faq-title");
    if (titleEl) {
      try {
        if (window.TarkovI18n && TarkovI18n.t) {
          var ti = TarkovI18n.t("hub.faqTitle");
          if (ti && ti.indexOf("hub.") !== 0) titleEl.textContent = ti;
        }
      } catch (e) {}
    }
    bg.hidden = false;
    bg.classList.add("show");
    bg.style.display = "flex";
  }

  function wireHubBar() {
    try {
      var float = document.getElementById("tt-tools-bar");
      if (float) float.remove();
    } catch (e) {}

    if (!isHub()) return;

    var bar = document.querySelector(".tt-bar");
    if (!bar) return;

    try {
      var oldT = document.getElementById("tt-bar-theme");
      if (oldT) oldT.remove();
    } catch (e) {}

    try {
      var dup = document.getElementById("tt-bar-faq");
      if (dup) dup.remove();
    } catch (e) {}

    if (!document.getElementById("tt-open-settings")) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn-ghost";
      b.id = "tt-open-settings";
      b.textContent = "Settings";
      bar.appendChild(b);
    }
    if (!document.getElementById("tt-open-faq") && !document.getElementById("tt-bar-faq")) {
      var f = document.createElement("button");
      f.type = "button";
      f.className = "btn-ghost";
      f.id = "tt-open-faq";
      f.textContent = "FAQ";
      bar.appendChild(f);
    }
    if (!document.getElementById("tt-bar-lang")) {
      var l = document.createElement("button");
      l.type = "button";
      l.className = "btn-ghost";
      l.id = "tt-bar-lang";
      l.title = "Language";
      l.textContent = "🌐";
      bar.appendChild(l);
    }

    var btnS = document.getElementById("tt-open-settings");
    var btnF = document.getElementById("tt-open-faq") || document.getElementById("tt-bar-faq");
    var btnL = document.getElementById("tt-bar-lang");
    if (btnS)
      btnS.onclick = function (e) {
        e.preventDefault();
        callOpenSettings();
      };
    if (btnF)
      btnF.onclick = function (e) {
        e.preventDefault();
        openFaq();
      };
    if (btnL)
      btnL.onclick = function (e) {
        e.preventDefault();
        try {
          var cur =
            (window.TarkovI18n && TarkovI18n.lang && TarkovI18n.lang()) ||
            localStorage.getItem("tarkovLang") ||
            "ru";
          var next = cur === "ru" ? "en" : "ru";
          localStorage.setItem("tarkovLang", next);
          if (window.TarkovI18n && TarkovI18n.setLang) TarkovI18n.setLang(next);
          else location.reload();
        } catch (err) {}
      };
  }

  function boot() {
    wireHubBar();
    setTimeout(wireHubBar, 200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
