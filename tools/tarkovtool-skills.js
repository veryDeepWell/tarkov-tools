(function () {
  "use strict";

  var SKILLS = [
    {
      id: "strength",
      name: "Strength",
      cat: "Physical",
      tip: "Перегруз (жёлтая зона), прыжки, мили, гранаты.",
      cheese:
        "Таскай тяжёлый рюкзак почти каждый рейд. Жёлтого перегруза хватает. Гранаты и мили по Scav — бонус. MULE поднимает лимит веса → можно качать strength дольше.",
      soft:
        "После 1–2 порций перегрузочного бега множитель падает. Лучше чуть каждый рейд. Чередуй со Endurance: скинул рюкзак → бег на лёгком."
    },
    {
      id: "endurance",
      name: "Endurance",
      cat: "Physical",
      tip: "Спринт и прыжки без перегруза; задержка дыхания в ADS.",
      cheese:
        "Лёгкий кит + длинные перебежки. ADS + hold breath между спринтами. Не качается от стояния. SJ6 / Meldonin — временный буст; если скилл не Elite, стим выше 51 может блокировать XP в рейде.",
      soft:
        "Спринт до отвала в одном рейде быстро упирается в красную стрелку — чередуй с лутом / strength."
    },
    {
      id: "vitality",
      name: "Vitality",
      cat: "Physical",
      tip: "Получать урон и выживать; резисты к кровотечениям.",
      cheese:
        "Обычные файты. Чиз: костёр на Reserve/Shoreline (не в голову), потом хил. На обезболе часть источников не считает. Колючая проволока — нет.",
      soft: "Много мелкого урона за рейд ≠ много XP после 1–2 очков."
    },
    {
      id: "health",
      name: "Health",
      cat: "Physical",
      tip: "Хил медками; пассивный реген.",
      cheese:
        "Обжечься / тик урона → хилить AI-2 / Car / Grizzly пачками. Пассивно растёт от других Physical.",
      soft: "Спам хила в одном сидении режется усталостью — 1 серия за «волну»."
    },
    {
      id: "metabolism",
      name: "Metabolism",
      cat: "Physical",
      tip: "Восстановление energy/hydration едой и водой только в рейде.",
      cheese:
        "Поинты = сколько восстановил недостающих шкалы (не факт «съел»). В стейше UI врёт. Mayo (+100/−99) → сразу вода; Ibuprofen (−17 hyd, много юзов) по рейду → допей; Golden Star (−19 energy); Trimadol жрёт обе шкалы ~180 с. Сначала еда, потом вода. Junkie +2, A Life Lesson +1.",
      soft:
        "Быстро ловит кап. Не залпом всю бутылку — порция, пауза ~200 с или другой скилл. Elite 51: нет урона от истощения/обезвоживания. Нужен lvl 3 для Nutrition Unit 3."
    },
    {
      id: "stress",
      name: "Stress Resistance",
      cat: "Physical",
      tip: "Бой на низком HP, тремор/паника.",
      cheese:
        "Оставайся в бою на красном HP осознанно. Квесты Survivalist дают уровни — не сдавай на нуле, если хочешь максимум от награды.",
      soft: "Редко пачкой — обычно 1 очко за жёсткий файд."
    },
    {
      id: "immunity",
      name: "Immunity",
      cat: "Physical",
      tip: "Дебаффы от стимов/еды/ядов — XP после окончания дебаффа.",
      cheese:
        "Переживи дебафф до конца. Бюджетно: Max Energy (Stress −1 ~300 с). Длинный хвост = больше XP, но умер/вышел раньше — 0. Метаболизм укорачивает дебаффы → меньше XP с иммунитета.",
      soft: "Один дожданный дебафф за рейд эффективнее трёх прерванных."
    },
    {
      id: "magdrills",
      name: "Mag Drills",
      cat: "Practical",
      tip: "Зарядка/разрядка магазинов.",
      cheese:
        "В рейде набивай/опустошай маг между поинтами. В схроне тоже крутят, надёжнее in-raid привычка.",
      soft: "После пары пачек за рейд XP режется — не сиди 10 минут на спавне."
    },
    {
      id: "search",
      name: "Search",
      cat: "Practical",
      tip: "Обыск контейнеров и трупов.",
      cheese: "Не скипай ящики и карманы. Attention рядом. Elite — два контейнера сразу.",
      soft: "Массовый лут одного типа упрётся в кап очков за рейд."
    },
    {
      id: "attention",
      name: "Attention",
      cat: "Mental",
      tip: "Поиск / осмотр, связан с Search.",
      cheese: "Лутай осознанно, не только быстрый лут если качаешь.",
      soft: "Как у Search — распределяй по рейдам."
    },
    {
      id: "perception",
      name: "Perception",
      cat: "Mental",
      tip: "Слышимость, «игра ушами».",
      cheese: "Естественный прогресс от движения и боёв. Отдельного дешёвого чиза почти нет.",
      soft: "—"
    },
    {
      id: "covert",
      name: "Covert Movement",
      cat: "Practical",
      tip: "Тихое движение <~25% скорости.",
      cheese:
        "Тихий шаг в опасных зонах (общаги, молл). AFK-ходьба в углу работает, но скучно и ловит кап.",
      soft: "Долгий стрейф на 1% в одном рейде быстро краснеет."
    },
    {
      id: "surgery",
      name: "Surgery",
      cat: "Practical",
      tip: "CMS / Surv12 на чёрных конечностях.",
      cheese:
        "На выходе: тиммейт выбивает ноги → CMS. Соло: падение с высоты без блэка груди/головы. Elite: быстрее и меньше штраф max HP.",
      soft: "Сильный софт-кап: 1–2 операции за рейд. Пять CMS подряд ≈ первое очко жирное, остальное почти мусор."
    },
    {
      id: "aim",
      name: "Aim Drills",
      cat: "Combat",
      tip: "ADS, удержание дыхания, стрельба с прицела.",
      cheese: "Просто играй от ADS. Отдельный чиз почти не нужен.",
      soft: "Качается медленно и «само»."
    },
    {
      id: "recoil",
      name: "Recoil Control",
      cat: "Combat",
      tip: "Очереди и контроль.",
      cheese: "Бои, не стрельба в стену 10 минут.",
      soft: "Как combat — лучше равномерно."
    },
    {
      id: "troubleshooting",
      name: "Troubleshooting",
      cat: "Combat",
      tip: "Осечки / устранение неисправностей.",
      cheese: "Грязное оружие / плохие патроны. Редко стоит чизить специально.",
      soft: "—"
    },
    {
      id: "crafting",
      name: "Crafting",
      cat: "Practical",
      tip: "Время крафтов в убежище.",
      cheese:
        "Держи станции занятыми. XP от суммарного времени крафта. Library +30% Practical. Handyman (сезон) стартует Crafting на 51.",
      soft: "Не рейдовый софт-кап, а долгий гринд часами крафта."
    },
    {
      id: "hidemgmt",
      name: "Hideout Management",
      cat: "Practical",
      tip: "Крафты, апгрейды, топливо/фильтры.",
      cheese:
        "Завершённый цикл крафта + апгрейд модуля + жжёное топливо/фильтры. Дешёвые циклы по станциям.",
      soft: "Апгрейды разовые. Дальше — поток крафтов."
    }
  ];

  var CAT_CLASS = {
    Physical: "phys",
    Practical: "prac",
    Combat: "combat",
    Mental: "mental"
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function load() {
    return (
      (window.TarkovStorage && TarkovStorage.getJson("tarkovSkillLevels", {})) ||
      {}
    );
  }

  function render() {
    var el = document.getElementById("skillList");
    if (!el) return;
    var st = load();
    el.innerHTML = "";
    SKILLS.forEach(function (sk) {
      var div = document.createElement("div");
      div.className = "skill-row";
      div.innerHTML =
        "<div><div class=\"name\">" +
        esc(sk.name) +
        '</div><span class="tag ' +
        (CAT_CLASS[sk.cat] || "") +
        '">" +
        esc(sk.cat) +
        '</span></div><label class="meta">ур.<br><input type="number" min="0" max="51" data-id="' +
        esc(sk.id) +
        '" value="' +
        (st[sk.id] != null ? st[sk.id] : 0) +
        '"></label><div><div class="meta">' +
        esc(sk.tip) +
        '</div><div class="cheese"><b>Чиз:</b> ' +
        esc(sk.cheese) +
        '</div><div class="soft"><strong>Софт-кап:</strong> ' +
        esc(sk.soft) +
        "</div></div>";
      el.appendChild(div);
    });
  }

  var saveBtn = document.getElementById("saveSkills");
  if (saveBtn)
    saveBtn.onclick = function () {
      var st = {};
      document.querySelectorAll("#skillList input[data-id]").forEach(function (inp) {
        st[inp.dataset.id] = Number(inp.value) || 0;
      });
      if (window.TarkovStorage) TarkovStorage.setJson("tarkovSkillLevels", st);
      if (window.TarkovUI && TarkovUI.toast) TarkovUI.toast("Сохранено");
      else alert("Сохранено");
    };

  var resetBtn = document.getElementById("resetSkills");
  if (resetBtn)
    resetBtn.onclick = function () {
      if (!confirm("Сбросить все уровни в трекере?")) return;
      if (window.TarkovStorage) TarkovStorage.remove("tarkovSkillLevels");
      render();
    };

  render();
})();
