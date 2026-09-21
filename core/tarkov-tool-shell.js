/*! Tarkov tool shell — Stage 3 complete: header ?, progress, ui.css, help for all tools */
(function () {
  "use strict";

  function ensureCss() {
    if (document.querySelector('link[href*="tarkov-ui.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    var path = location.pathname || "";
    link.href = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-ui.css?v=3";
    (document.head || document.documentElement).appendChild(link);
  }

  function ensureUiJs() {
    if (window.TarkovUI) return;
    if (document.getElementById("tt-ui-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-ui-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-ui.js";
    (document.head || document.documentElement).appendChild(s);
  }

  function toolIdFromPath() {
    try {
      var p = location.pathname || "";
      var m = p.match(/tarkovtool-([^/]+)\.html/);
      if (m) return m[1];
      var f = p.split("/").pop() || "";
      return f.replace(/^tarkovtool-/, "").replace(/\.html$/, "");
    } catch (e) {
      return "";
    }
  }

  function showHelpLocal(title, body) {
    if (window.TarkovUI && TarkovUI.helpModal) {
      TarkovUI.helpModal({ title: title, body: body });
      return;
    }
    var id = "tt-help-modal";
    var bg = document.getElementById(id);
    if (!bg) {
      bg = document.createElement("div");
      bg.id = id;
      bg.className = "modal-bg";
      bg.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:300;padding:16px";
      bg.innerHTML = '<div class="modal" style="max-width:min(520px,94vw);max-height:80vh;overflow:auto;background:var(--card,#171a21);border:1px solid var(--border,#2a2f3a);border-radius:12px;padding:16px 18px;color:var(--text,#e8eaed)">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:12px"><h2 id="tt-help-title" style="margin:0;font-size:1.15rem"></h2>' +
        '<button type="button" class="btn-ghost" id="tt-help-x" style="min-width:36px!important;padding:0 10px">\u00d7</button></div>' +
        '<div id="tt-help-body" style="color:var(--muted,#8b919a);line-height:1.5;font-size:.95rem"></div></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) { if (e.target === bg) bg.style.display = "none"; });
      document.getElementById("tt-help-x").onclick = function () { bg.style.display = "none"; };
    }
    document.getElementById("tt-help-title").textContent = title || "Help";
    var bodyEl = document.getElementById("tt-help-body");
    bodyEl.innerHTML = String(body || "").split(/\n\n+/).map(function (p) {
      return "<p style=\"margin:0 0 10px\">" + String(p).replace(/</g, "<").replace(/\n/g, "<br>") + "</p>";
    }).join("");
    bg.style.display = "flex";
  }

  function ensureHelp() {
    if (document.getElementById("helpBtn")) return;
    var h1 = document.querySelector(".container h1, main h1, h1");
    if (!h1) {
      var titleEl = document.querySelector(".container .card-title, .card-title");
      if (titleEl) {
        h1 = document.createElement("h1");
        h1.textContent = titleEl.textContent || "Tool";
        h1.style.cssText = "font-size:1.25rem;margin:0 0 8px";
        var box = document.querySelector(".container");
        if (box) box.insertBefore(h1, box.firstChild);
      }
    }
    if (!h1) return;
    var parent = h1.parentNode;
    if (!parent) return;
    if (!(parent.classList && parent.classList.contains("tt-tool-header"))) {
      var wrap = document.createElement("div");
      wrap.className = "tt-tool-header";
      wrap.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px";
      parent.insertBefore(wrap, h1);
      var main = document.createElement("div");
      main.className = "tt-tool-header-main";
      wrap.appendChild(main);
      main.appendChild(h1);
      var next = wrap.nextElementSibling;
      if (next && (next.classList.contains("sub") || next.classList.contains("subtitle"))) {
        main.appendChild(next);
      }
      var act = document.createElement("div");
      act.className = "tt-tool-header-actions";
      wrap.appendChild(act);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "helpBtn";
      btn.className = "btn-ghost tt-help-btn";
      btn.setAttribute("aria-label", "Help");
      btn.textContent = "?";
      btn.style.cssText = "min-width:36px!important;width:36px;min-height:36px;padding:0;border-radius:50%";
      act.appendChild(btn);
    }
    var hb = document.getElementById("helpBtn");
    if (!hb) return;
    var id = toolIdFromPath();
    hb.onclick = function () {
      try {
        var h = { title: id, body: "" };
        try {
          if (window.TarkovUI && TarkovUI.toolHelpFromI18n) h = TarkovUI.toolHelpFromI18n(id);
        } catch (e) {}
        var fallbacks = {
          "ammo": "Таблица патронов: пробитие, урон, цена",
          "armor": "Классы брони и материалы",
          "barter-calc": "Офлайн-калькулятор бартера с налогом flea",
          "barter-live": "Бартер с живыми ценами барахолки",
          "bosses": "Боссы, шансы, карта",
          "btc-farm": "Ферма BTC / доход",
          "compare": "Сравнение предметов",
          "containers": "Ёмкость контейнеров и ценность за слот",
          "crafts": "Крафты убежища и профит",
          "cultist": "Калькулятор обмена в круге",
          "drip": "Внешний вид экипировки",
          "drip-builder": "Сборка drip",
          "drip-loadout": "Drip loadout",
          "food": "Еда и гидрация",
          "gun-budget": "Оружие в бюджете",
          "gun-builder": "Конструктор оружия",
          "helmets": "Шлемы: защита и слоты",
          "hideout": "Модули убежища",
          "hideout-mgmt": "Управление убежищем",
          "item-use": "Применение предметов",
          "keys": "Ключи и локации",
          "lang-search": "Поиск по языкам",
          "loadout-budget": "Лоадаут в бюджете",
          "loadout-builder": "Конструктор лоадаута",
          "loot-slot": "Профит за клетку инвентаря",
          "mags": "Магазины",
          "medkits": "Аптечки и лечение",
          "mods": "Обвесы и моды",
          "my-tarkov": "Личный дашборд",
          "nvg": "ПНВ / тепловизоры",
          "plates": "Бронеплиты и совместимость",
          "price-alarm": "Сирена по цене / офферам",
          "price-track": "График и история flea-цен",
          "quest-items": "Квестовые предметы",
          "quests": "Список квестов",
          "raid-checklist": "Собраться в рейд",
          "random-loadout": "Случайный кит",
          "restock": "Обновление торговцев",
          "scopes": "Кратность и эрго",
          "shortname": "Свои названия",
          "skills": "Прокачка навыков",
          "stim-combos": "Связки стимуляторов",
          "stims": "Бафы и дебафы",
          "streamer-flip": "Ивент-предметы",
          "trader-flip": "Покупка у торговца → flea"
        };
        showHelpLocal(h.title || id || "Help", h.body || fallbacks[id] || "Tarkov Tools utility.");
      } catch (e) {}
    };
  }

  function ensureProgress() {
    if (document.getElementById("progressWrap") || document.getElementById("tt-progress")) return;
    var status = document.getElementById("status");
    var host = status && status.parentNode ? status.parentNode : document.querySelector(".container .card");
    if (!host) return;
    var wrap = document.createElement("div");
    wrap.id = "progressWrap";
    wrap.className = "progress-wrap tt-progress";
    wrap.innerHTML =
      '<div class="progress-track tt-progress-track"><div class="progress-bar tt-progress-bar" id="progressBar"></div></div>' +
      '<div class="progress-label tt-progress-label" id="progressLabel"></div>';
    if (status && status.parentNode === host) host.insertBefore(wrap, status.nextSibling);
    else host.appendChild(wrap);
  }

  function markPrimaryButtons() {
    var ids = ["fetchPricesBtn", "loadBtn", "startBtn", "checkBtn", "snapBtn", "runBtn", "calcBtn", "searchBtn", "refreshBtn", "applyBtn", "saveBtn", "buildBtn", "generateBtn", "filterBtn", "goBtn", "submitBtn"];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.classList && !el.classList.contains("btn-primary")) {
        el.classList.add("btn");
        el.classList.add("btn-primary");
      }
    });
  }

  function boot() {
    ensureCss();
    ensureUiJs();
    ensureHelp();
    ensureProgress();
    markPrimaryButtons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
