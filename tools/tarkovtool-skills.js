(function () {
  "use strict";

  var SKILLS = [
    {
      id: "strength",
      name: "Strength",
      cat: "Physical",
      how: "Жёлтый перегруз + ходьба/бег, прыжки, мили, гранаты. MULE помогает таскать дольше."
    },
    {
      id: "endurance",
      name: "Endurance",
      cat: "Physical",
      how: "Спринт и прыжки на лёгком весе, hold breath в ADS. Не качается стоя."
    },
    {
      id: "vitality",
      name: "Vitality",
      cat: "Physical",
      how: "Получать урон и выживать. Костёр (не в голову) → хил. На обезболе часть урона не считает."
    },
    {
      id: "health",
      name: "Health",
      cat: "Physical",
      how: "Лечить урон медками (AI-2 / Car / Grizzly). Пассивно растёт от других Physical."
    },
    {
      id: "metabolism",
      name: "Metabolism",
      cat: "Physical",
      how: "Только в рейде: восстановить недостающие energy/hydration. Mayo→вода, или Ibu/стим слив → доесть/допить. В стейше не считается."
    },
    {
      id: "stress",
      name: "Stress Resistance",
      cat: "Physical",
      how: "Бой на низком HP. Квесты Survivalist дают уровни — лучше не на нуле."
    },
    {
      id: "immunity",
      name: "Immunity",
      cat: "Physical",
      how: "Пережить дебафф еды/стима до конца (XP после окончания). Бюджетно: Max Energy."
    },
    {
      id: "magdrills",
      name: "Mag Drills",
      cat: "Practical",
      how: "Заряжай/разряжай магазины в рейде между точками."
    },
    {
      id: "search",
      name: "Search",
      cat: "Practical",
      how: "Лутай контейнеры и трупы каждый рейд. Elite — два контейнера сразу."
    },
    {
      id: "attention",
      name: "Attention",
      cat: "Mental",
      how: "Обыск и осмотр предметов (рядом с Search)."
    },
    {
      id: "perception",
      name: "Perception",
      cat: "Mental",
      how: "Естественно от движения и боёв. Отдельного чиза почти нет."
    },
    {
      id: "covert",
      name: "Covert Movement",
      cat: "Practical",
      how: "Тихий шаг (<~25% скорости) в опасных зонах."
    },
    {
      id: "surgery",
      name: "Surgery",
      cat: "Practical",
      how: "CMS/Surv12 на чёрной конечности. 1–2 операции за рейд из‑за капа."
    },
    {
      id: "aim",
      name: "Aim Drills",
      cat: "Combat",
      how: "ADS и стрельба с прицела. Качается само от игры."
    },
    {
      id: "recoil",
      name: "Recoil Control",
      cat: "Combat",
      how: "Очереди в бою, не стрельба в стену."
    },
    {
      id: "troubleshooting",
      name: "Troubleshooting",
      cat: "Combat",
      how: "Осечки на грязном оружии / плохих патронах."
    },
    {
      id: "crafting",
      name: "Crafting",
      cat: "Practical",
      how: "Держи крафты в убежище занятыми. Library +30% Practical."
    },
    {
      id: "hidemgmt",
      name: "Hideout Management",
      cat: "Practical",
      how: "Циклы крафта, апгрейды модулей, расход топлива/фильтров."
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
    try {
      if (window.TarkovStorage && TarkovStorage.getJson)
        return TarkovStorage.getJson("tarkovSkillLevels", {}) || {};
    } catch (e) {}
    return {};
  }

  function render() {
    var el = document.getElementById("skillList");
    if (!el) return;
    var st = load();
    var html = "";
    SKILLS.forEach(function (sk) {
      var lvl = st[sk.id] != null ? st[sk.id] : 0;
      html +=
        '<div class="skill-row">' +
        "<div><div class=\"name\">" +
        esc(sk.name) +
        '</div><span class="tag ' +
        (CAT_CLASS[sk.cat] || "") +
        '">' +
        esc(sk.cat) +
        "</span></div>" +
        '<label class="meta">ур.<br><input type="number" min="0" max="51" data-id="' +
        esc(sk.id) +
        '" value="' +
        esc(String(lvl)) +
        '"></label>' +
        '<div class="how"><b>Как качать:</b> ' +
        esc(sk.how) +
        "</div></div>";
    });
    el.innerHTML = html;
  }

  function bind() {
    var saveBtn = document.getElementById("saveSkills");
    if (saveBtn)
      saveBtn.onclick = function () {
        var st = {};
        document.querySelectorAll("#skillList input[data-id]").forEach(function (inp) {
          st[inp.dataset.id] = Number(inp.value) || 0;
        });
        if (window.TarkovStorage) TarkovStorage.setJson("tarkovSkillLevels", st);
        alert("Сохранено");
      };

    var resetBtn = document.getElementById("resetSkills");
    if (resetBtn)
      resetBtn.onclick = function () {
        if (!confirm("Сбросить все уровни?")) return;
        if (window.TarkovStorage) TarkovStorage.remove("tarkovSkillLevels");
        render();
      };
  }

  function init() {
    render();
    bind();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
