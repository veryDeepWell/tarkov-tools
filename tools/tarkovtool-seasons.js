/*! Tarkov — Seasons history (static reference data) */
(function () {
  "use strict";

  var SEASONS = [
    {
      id: "s1-kord-breach",
      num: 1,
      name: "KORD BREACH",
      short: "S1",
      artClass: "s1",
      start: "2026-08-03",
      end: "2026-12-07",
      patch: "1.1.0.0",
      status: "active",
      summary: "Первый сезон. Отдельный seasonal-персонаж, глобальные и личные модификаторы, бесплатный Battle Pass на документах TerraGroup.",
      globalMods: [
        { name: "No Insurance", desc: "Страховка недоступна весь сезон." },
        { name: "Armor Shortage", desc: "Меньше брони у торговцев / в пулах." },
        { name: "Black Division", desc: "Оперативники Black Division встречаются чаще / на большем числе карт." },
        { name: "Seasoned PMCs", desc: "+25% опыта за рейд." },
        { name: "No FiR for Hideout", desc: "Для убежища не нужен статус Found in Raid." },
        { name: "Handyman", desc: "Крафт −50% по времени, навык Crafting старт 51." }
      ],
      personalPos: [
        { pts: 1, name: "Street Tax", desc: "Раз в неделю часть диких платит «дань»." },
        { pts: 1, name: "Diet", desc: "Провизия тратит на 50% меньше ресурса." },
        { pts: 2, name: "Juice Time", desc: "Сок → Painkiller 60 сек." },
        { pts: 2, name: "Marathon Runner", desc: "Стамина рук/ног −20% расхода." },
        { pts: 3, name: "Bushborne", desc: "В растительности −75% шума и замедления." },
        { pts: 4, name: "Underdog", desc: "+4 очка модификаторов (поздний старт)." },
        { pts: 5, name: "Kappa Protocol", desc: "Старт с Kappa (если доступно)." }
      ],
      personalNeg: [
        { pts: 1, name: "Unlucky", desc: "Иногда «невезение» с последствиями." },
        { pts: 2, name: "Hemophilia", desc: "Кровотечения сильнее." },
        { pts: 3, name: "Exhaustion", desc: "Восстановление стамины −20%, макс. −10." },
        { pts: 4, name: "No Flea Market", desc: "Барахолка отключена." },
        { pts: 5, name: "Broken Secure Container", desc: "В контейнер только ключи/доки/догтеги/валюта/спец. контейнеры." },
        { pts: 6, name: "Osteoporosis", desc: "Чаще переломы." }
      ],
      docs: [
        { type: "Financial", maps: "Customs, Streets, Interchange" },
        { type: "PMC personnel files", maps: "Reserve, Lighthouse, Icebreaker" },
        { type: "Project documentation", maps: "Factory, Reserve, Customs" },
        { type: "Blueprints & technical", maps: "Interchange, Factory, Labyrinth" },
        { type: "Test documentation", maps: "Shoreline, Woods, Icebreaker" },
        { type: "User documentation", maps: "Ground Zero, Streets, Labs" },
        { type: "Medical documents", maps: "Labs, Ground Zero, Labyrinth" },
        { type: "Technical documentation", maps: "Shoreline, Woods, Lighthouse" },
        { type: "Classified (paid/hub)", maps: "Заменяет любой тип" }
      ],
      dailyLimits: { seasonal: 30, pvp: 20, pve: 15, note: "Лимит общий на сутки между режимами (счётчик стартует с первого вынесенного дока). Патч 13 авг 2026 поднял с 25/15/10." },
      battlePass: { rewards: 53, pages: 12, totalDocs: 501, shared: true }
    },
    {
      id: "s2-tbd",
      num: 2,
      name: "Season 2",
      short: "S2",
      artClass: "",
      start: null,
      end: null,
      patch: "—",
      status: "upcoming",
      summary: "Ещё не анонсирован. Плашка-заглушка: после старта S2 сюда добавятся модификаторы и BP.",
      globalMods: [],
      personalPos: [],
      personalNeg: [],
      docs: [],
      dailyLimits: null,
      battlePass: null
    }
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso + "T12:00:00").toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return iso;
    }
  }

  function statusBadge(st) {
    if (st === "active") return '<span class="badge">активен</span>';
    if (st === "ended") return '<span class="badge ended">завершён</span>';
    return '<span class="badge upcoming">скоро</span>';
  }

  var selected = null;

  function renderStrip() {
    var box = document.getElementById("strip");
    box.innerHTML = SEASONS.map(function (s) {
      return (
        '<div class="season-tile' +
        (selected && selected.id === s.id ? " on" : "") +
        '" data-id="' +
        esc(s.id) +
        '">' +
        '<div class="season-art ' +
        esc(s.artClass || "") +
        '">' +
        esc(s.short) +
        "</div>" +
        '<div class="season-body">' +
        '<div class="name">' +
        esc(s.name) +
        "</div>" +
        '<div class="dates">' +
        (s.start ? fmtDate(s.start) + " — " + fmtDate(s.end) : "даты TBA") +
        "</div>" +
        statusBadge(s.status) +
        "</div></div>"
      );
    }).join("");
    box.querySelectorAll(".season-tile").forEach(function (el) {
      el.onclick = function () {
        var id = el.getAttribute("data-id");
        selected = SEASONS.find(function (x) {
          return x.id === id;
        });
        renderStrip();
        renderDetail();
      };
    });
  }

  function modsHtml(list, cls) {
    if (!list || !list.length) return '<p class="muted">Нет данных</p>';
    return (
      '<div class="mod-grid">' +
      list
        .map(function (m) {
          return (
            '<div class="mod ' +
            cls +
            '"><div class="t">' +
            (m.pts != null ? '<span class="pts">' + (cls === "pos" ? "−" : "+") + m.pts + "</span>" : "") +
            esc(m.name) +
            '</div><div class="d">' +
            esc(m.desc) +
            "</div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderDetail() {
    var card = document.getElementById("detail");
    var body = document.getElementById("detailBody");
    if (!selected) {
      card.style.display = "none";
      return;
    }
    card.style.display = "block";
    document.getElementById("detailTitle").textContent =
      "Season " + selected.num + " — " + selected.name;

    var html = "";
    html += '<p style="margin:0 0 12px;line-height:1.45">' + esc(selected.summary) + "</p>";
    html +=
      '<div class="chips"><span class="chip">патч ' +
      esc(selected.patch) +
      "</span>" +
      (selected.start
        ? '<span class="chip">' + fmtDate(selected.start) + " → " + fmtDate(selected.end) + "</span>"
        : "") +
      "</div>";

    if (selected.globalMods.length) {
      html += '<h3 style="margin:18px 0 8px;font-size:.9rem">Глобальные модификаторы</h3>';
      html += '<p class="muted" style="margin:0 0 8px">У всех seasonal-персонажей, нельзя отключить.</p>';
      html += modsHtml(selected.globalMods, "glob");
    }
    if (selected.personalPos.length) {
      html += '<h3 style="margin:18px 0 8px;font-size:.9rem">Личные + (тратят очки)</h3>';
      html += modsHtml(selected.personalPos, "pos");
    }
    if (selected.personalNeg.length) {
      html += '<h3 style="margin:18px 0 8px;font-size:.9rem">Личные − (дают очки)</h3>';
      html += modsHtml(selected.personalNeg, "neg");
    }
    if (selected.docs.length) {
      html += '<h3 style="margin:18px 0 8px;font-size:.9rem">Документы TerraGroup (BP)</h3>';
      html +=
        '<table class="doc-table"><thead><tr><th>Тип</th><th>Карты</th></tr></thead><tbody>' +
        selected.docs
          .map(function (d) {
            return "<tr><td>" + esc(d.type) + "</td><td>" + esc(d.maps) + "</td></tr>";
          })
          .join("") +
        "</tbody></table>";
    }
    if (selected.dailyLimits) {
      var L = selected.dailyLimits;
      html +=
        '<h3 style="margin:18px 0 8px;font-size:.9rem">Дневной лимит доков</h3>' +
        '<div class="chips">' +
        '<span class="chip">Seasonal ≤ ' +
        L.seasonal +
        "</span>" +
        "<span class=\"chip\">PvP ≤ " +
        L.pvp +
        "</span>" +
        "<span class=\"chip\">PvE ≤ " +
        L.pve +
        "</span></div>" +
        '<p class="note">' +
        esc(L.note) +
        "</p>";
    }
    if (selected.battlePass) {
      var bp = selected.battlePass;
      html +=
        '<h3 style="margin:18px 0 8px;font-size:.9rem">Battle Pass</h3>' +
        '<div class="chips">' +
        '<span class="chip">' +
        bp.rewards +
        " наград</span>" +
        '<span class="chip">' +
        bp.pages +
        " страниц</span>" +
        '<span class="chip">~' +
        bp.totalDocs +
        " доков на полный проход</span>" +
        (bp.shared ? '<span class="chip">прогресс общий PvP/PvE/Season</span>' : "") +
        "</div>" +
        '<p class="note">Детальный трекинг — инструмент «Боевой пропуск».</p>';
    }
    body.innerHTML = html;
  }

  selected = SEASONS[0];
  renderStrip();
  renderDetail();
})();
