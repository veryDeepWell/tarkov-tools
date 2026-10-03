/*! Tarkov — Raid Challenge generator (roadmap E / D) */
(function () {
  "use strict";

  var STORE_KEY = "tarkovChallengeState";
  var SCHEMA_V = 1;
  var current = null;
  var pool = null; // optional items from API

  var MAPS = [
    "Factory", "Customs", "Woods", "Shoreline", "Interchange",
    "Reserve", "Lighthouse", "Streets of Tarkov", "Ground Zero", "Lab"
  ];

  /** Normal tasks: templates with {n} filled at roll time */
  var TASKS = [
    { id: "pmc_n", text: "Убить {n} ЧВК", n: [1, 2, 3], base: 2 },
    { id: "scav_n", text: "Убить {n} диких", n: [3, 5, 8], base: 1 },
    { id: "scav_dist", text: "Убить {n} диких с дистанции ≥ {d} м", n: [2, 3], d: [40, 60, 80], base: 3 },
    { id: "extract", text: "Выйти живым с {n} слотами лута", n: [4, 6, 8], base: 2 },
    { id: "no_armor", text: "Рейд без брони корпуса", n: null, base: 3 },
    { id: "pistol", text: "Только пистолеты (основное — пистолет)", n: null, base: 3 },
    { id: "headshots", text: "Сделать {n} убийств в голову", n: [2, 3, 4], base: 3 },
    { id: "survive_time", text: "Провести в рейде ≥ {n} минут и выйти", n: [15, 20, 25], base: 2 }
  ];

  var SPECIALS = [
    {
      id: "zero_to_hero",
      title: "Zero-to-Hero",
      text: "Никакого принесённого гира. Только то, что найдёшь в рейде.",
      stripGear: true,
      difficulty: 5,
      xp: 80
    },
    {
      id: "triple_transit",
      title: "Три перехода",
      text: "Соверши 3 перехода на другие локации за один «заход» (как позволит вайп).",
      stripGear: false,
      difficulty: 4,
      xp: 60
    },
    {
      id: "double_quest",
      title: "Два задания",
      text: "Закрой 2 квестовые цели в одном рейде.",
      stripGear: false,
      difficulty: 4,
      xp: 55
    },
    {
      id: "naked_boss",
      title: "Босс налегке",
      text: "Убить босса карты. Броня не выше класса 3.",
      stripGear: false,
      difficulty: 5,
      xp: 70
    }
  ];

  var GEAR_TIERS = [
    { id: "budget", label: "Бюджет", difficulty: 1 },
    { id: "mid", label: "Средний", difficulty: 2 },
    { id: "chad", label: "Тяжёлый", difficulty: 3 }
  ];

  function esc(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickN(arr, n) {
    var a = arr.slice();
    var out = [];
    while (out.length < n && a.length) {
      out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
    }
    return out;
  }

  function loadState() {
    var doc = null;
    try {
      if (window.TarkovSchema && TarkovSchema.readJson) {
        doc = TarkovSchema.readJson(STORE_KEY, SCHEMA_V, { listKey: "history" });
      }
    } catch (e) {}
    if (!doc) {
      try {
        if (window.TarkovStorage && TarkovStorage.getJson) doc = TarkovStorage.getJson(STORE_KEY, null);
      } catch (e2) {}
    }
    if (!doc || typeof doc !== "object") {
      doc = { _v: SCHEMA_V, xp: 0, level: 1, history: [] };
    }
    if (doc._v == null) doc._v = SCHEMA_V;
    if (!Array.isArray(doc.history)) doc.history = [];
    doc.xp = Number(doc.xp) || 0;
    doc.level = Number(doc.level) || 1;
    return doc;
  }

  function saveState(doc) {
    doc._v = SCHEMA_V;
    try {
      if (window.TarkovSchema && TarkovSchema.writeJson) {
        TarkovSchema.writeJson(STORE_KEY, doc);
        return;
      }
    } catch (e) {}
    try {
      if (window.TarkovStorage && TarkovStorage.setJson) TarkovStorage.setJson(STORE_KEY, doc);
    } catch (e2) {}
  }

  function xpForLevel(lvl) {
    return 80 + (lvl - 1) * 40;
  }

  function applyXp(doc, amount) {
    doc.xp = (Number(doc.xp) || 0) + amount;
    var need = xpForLevel(doc.level);
    while (doc.xp >= need) {
      doc.xp -= need;
      doc.level += 1;
      need = xpForLevel(doc.level);
    }
  }

  function paintProfile() {
    var doc = loadState();
    var need = xpForLevel(doc.level);
    document.getElementById("lvlBadge").textContent = "Lvl " + doc.level;
    document.getElementById("xpLabel").textContent = doc.xp + " / " + need + " XP";
    var pct = Math.min(100, Math.round((doc.xp / need) * 100));
    document.getElementById("xpFill").style.width = pct + "%";
    paintHistory(doc);
  }

  function paintHistory(doc) {
    var box = document.getElementById("history");
    if (!doc.history.length) {
      box.innerHTML = '<p class="muted">Пока пусто.</p>';
      return;
    }
    box.innerHTML = doc.history
      .slice(0, 40)
      .map(function (h) {
        var st = h.done ? "✓" : h.skipped ? "—" : "?";
        return (
          '<div class="hist-row"><span>' +
          esc(st) +
          "</span><span>" +
          esc(h.map || "") +
          "</span><span class=\"muted\">" +
          esc(h.task || "") +
          '</span><span class="spacer"></span><span class="badge">' +
          esc(String(h.xp || 0)) +
          " XP</span></div>"
        );
      })
      .join("");
  }

  function fillTemplate(tpl) {
    var text = tpl.text;
    var n = tpl.n ? pick(tpl.n) : null;
    var d = tpl.d ? pick(tpl.d) : null;
    if (n != null) text = text.replace("{n}", String(n));
    if (d != null) text = text.replace("{d}", String(d));
    return { text: text, base: tpl.base, id: tpl.id };
  }

  function syntheticLoadout(tier) {
    if (tier.id === "budget") {
      return ["Пистолет / дробовик", "Без брони или класс 1–2", "Малый рюкзак", "Аптечка"];
    }
    if (tier.id === "chad") {
      return ["Штурмовая винтовка + обвес", "Броня 5–6 + плиты", "Шлем + наушники", "Большой рюкзак"];
    }
    return ["Карабин / АКМ-класс", "Броня 3–4", "Каска или уши", "Средний рюкзак"];
  }

  function loadoutFromPool(tier) {
    if (!pool || !pool.length) return syntheticLoadout(tier);
    function byType(t) {
      return pool.filter(function (it) {
        return (it.types || []).indexOf(t) >= 0;
      });
    }
    var guns = byType("gun");
    var armor = byType("armor");
    var helmet = byType("helmet");
    var bag = pool.filter(function (it) {
      return (it.types || []).indexOf("backpack") >= 0;
    });
    function name(it) {
      try {
        if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
      } catch (e) {}
      return (it && (it.shortName || it.name)) || "—";
    }
    function price(it) {
      return Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0;
    }
    function pickTier(arr, lo, hi) {
      var band = arr.filter(function (it) {
        var p = price(it);
        return p >= lo && p <= hi;
      });
      if (!band.length) band = arr;
      return band.length ? name(pick(band)) : "—";
    }
    if (tier.id === "budget") {
      return [
        "Оружие: " + pickTier(guns, 0, 25000),
        "Броня: " + pickTier(armor, 0, 40000),
        "Шлем: " + pickTier(helmet, 0, 30000),
        "Рюкзак: " + pickTier(bag, 0, 20000)
      ];
    }
    if (tier.id === "chad") {
      return [
        "Оружие: " + pickTier(guns, 80000, 9e9),
        "Броня: " + pickTier(armor, 100000, 9e9),
        "Шлем: " + pickTier(helmet, 50000, 9e9),
        "Рюкзак: " + pickTier(bag, 30000, 9e9)
      ];
    }
    return [
      "Оружие: " + pickTier(guns, 25000, 90000),
      "Броня: " + pickTier(armor, 40000, 120000),
      "Шлем: " + pickTier(helmet, 20000, 60000),
      "Рюкзак: " + pickTier(bag, 15000, 50000)
    ];
  }

  function roll() {
    var special = Math.random() < 0.18 ? pick(SPECIALS) : null;
    var map = pick(MAPS);
    var task = fillTemplate(pick(TASKS));
    var tier = pick(GEAR_TIERS);
    var gear = special && special.stripGear ? ["Нет принесённого гира (Zero-to-Hero)"] : loadoutFromPool(tier);

    var difficulty = (task.base || 2) + (tier.difficulty || 1) + (map === "Lab" ? 1 : 0);
    if (special) difficulty += special.difficulty;
    difficulty = Math.min(12, difficulty);
    var xp = special ? special.xp : 15 + difficulty * 8;

    current = {
      id: "c" + Date.now(),
      map: map,
      task: task.text,
      taskId: task.id,
      tier: tier.label,
      gear: gear,
      special: special ? special.title : null,
      specialText: special ? special.text : null,
      difficulty: difficulty,
      xp: xp,
      ts: Date.now()
    };

    var box = document.getElementById("result");
    box.hidden = false;
    box.innerHTML =
      '<div class="block"><h3>Карта</h3><div class="val">' +
      esc(current.map) +
      "</div></div>" +
      '<div class="block"><h3>Сложность</h3><div class="val"><span class="badge' +
      (difficulty >= 7 ? " hard" : "") +
      '">' +
      difficulty +
      " / 12</span> · " +
      current.xp +
      " XP</div></div>" +
      '<div class="block" style="grid-column:1/-1"><h3>Задание</h3><div class="val">' +
      esc(current.task) +
      "</div>" +
      (current.special
        ? '<div class="meta"><span class="badge special">' +
          esc(current.special) +
          "</span> " +
          esc(current.specialText) +
          "</div>"
        : "") +
      "</div>" +
      '<div class="block" style="grid-column:1/-1"><h3>Лоадаут (' +
      esc(current.tier) +
      ")</h3><ul class=\"loadout-list\">" +
      current.gear
        .map(function (g) {
          return "<li>" + esc(g) + "</li>";
        })
        .join("") +
      "</ul></div>";

    document.getElementById("doneBtn").disabled = false;
    document.getElementById("skipBtn").disabled = false;
    setStatus("Челлендж готов. Честность — на тебе.", true);
    try {
      if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
    } catch (e) {}
  }

  function finish(done) {
    if (!current) return;
    var doc = loadState();
    var entry = {
      id: current.id,
      map: current.map,
      task: current.task,
      special: current.special,
      difficulty: current.difficulty,
      xp: done ? current.xp : 0,
      done: !!done,
      skipped: !done,
      ts: Date.now()
    };
    if (done) applyXp(doc, current.xp);
    doc.history.unshift(entry);
    doc.history = doc.history.slice(0, 100);
    saveState(doc);
    current = null;
    document.getElementById("doneBtn").disabled = true;
    document.getElementById("skipBtn").disabled = true;
    paintProfile();
    setStatus(done ? "Засчитано. +" + entry.xp + " XP" : "Пропущено.", true);
    try {
      if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep(done ? "ok" : "alarm");
    } catch (e) {}
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("status");
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = msg || "";
  }

  async function warmPool() {
    try {
      if (!window.TarkovAPI || !TarkovAPI.items) return;
      setStatus("Подгружаю предметы для лоадаута…");
      var mode = "pve";
      try {
        if (window.TarkovTools && TarkovTools.preferredMode) mode = TarkovTools.preferredMode();
      } catch (e) {}
      var items = await TarkovAPI.items(mode);
      if (!Array.isArray(items)) items = items ? Object.values(items) : [];
      pool = items;
      setStatus("Pool: " + pool.length + " items. Можно роллить.", true);
    } catch (e) {
      pool = null;
      setStatus("API недоступен — текстовый лоадаут. " + (e.message || ""), false);
    }
  }

  document.getElementById("rollBtn").onclick = function () {
    roll();
  };
  document.getElementById("doneBtn").onclick = function () {
    finish(true);
  };
  document.getElementById("skipBtn").onclick = function () {
    finish(false);
  };
  document.getElementById("resetBtn").onclick = function () {
    if (!confirm("Сбросить уровень, XP и историю?")) return;
    saveState({ _v: SCHEMA_V, xp: 0, level: 1, history: [] });
    paintProfile();
    setStatus("Прогресс сброшен.", true);
  };

  paintProfile();
  warmPool();
})();
