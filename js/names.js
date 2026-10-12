/* Bot / scav name browser + generator (1.1 E) */
(function () {
  "use strict";

  var FIRST = ['Саша', 'Вася', 'Коля', 'Петя', 'Серёга', 'Дима', 'Андрюха', 'Жора', 'Толян', 'Костян', 'Лёха', 'Гриша', 'Миша', 'Юрец', 'Паша', 'Рома', 'Витек', 'Славик', 'Боря', 'Федя', 'Игорь', 'Олег', 'Макс', 'Тимур', 'Руслан', 'Денис', 'Артём', 'Кирилл', 'Владик', 'Женёк', 'Шурик', 'Тоха', 'Гоша', 'Семён', 'Ярик', 'Даня', 'Стас', 'Эдик', 'Вадим', 'Глеб', 'Sasha', 'Vasya', 'Kolya', 'Petya', 'Seryoga', 'Dima', 'Andryukha', 'Zhora', 'Tolyan', 'Kostyan'];
  var SECOND = ['Болт', 'Кабан', 'Шило', 'Топор', 'Крот', 'Пуля', 'Дым', 'Ржавый', 'Гвоздь', 'Шрам', 'Волк', 'Ёжик', 'Чифир', 'Батя', 'Седой', 'Хром', 'Ствол', 'Нож', 'Пёс', 'Сухарь', 'Кирпич', 'Мазут', 'Искра', 'Тень', 'Клин', 'Змей', 'Сокол', 'Бугор', 'Хан', 'Ящер', 'Bolt', 'Boar', 'Awl', 'Axe', 'Mole', 'Bullet', 'Smoke', 'Rusty', 'Nail', 'Scar', 'Wolf', 'Hedgehog', 'Chifir', 'Batya', 'Gray', 'Chrome', 'Barrel', 'Knife', 'Dog', 'Cracker'];
  var RAIDERS = ['Ace', 'Blackjack', 'Flash', 'Ghost', 'Hawk', 'Ice', 'Joker', 'Knight', 'Loki', 'Maverick', 'Nova', 'Onyx', 'Phantom', 'Raven', 'Shadow', 'Titan', 'Viper', 'Wolf', 'Xray', 'Zero', 'Alpha', 'Bravo', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo'];
  var BD = ['Unit', 'Operator', 'Ghost', 'Spectre', 'Reaper', 'Wraith', 'Shade', 'Cipher', 'Vector', 'Nova', 'Apex', 'Blade', 'Coil', 'Drift', 'Echo', 'Frost', 'Grid', 'Hex', 'Ion', 'Jolt'];
  var BOSSES = {'Reshala': ['Решала'], 'Killa': ['Килла'], 'Glukhar': ['Глухарь'], 'Shturman': ['Штурман'], 'Sanitar': ['Санитар'], 'Tagilla': ['Тагилла'], 'Knight': ['Knight', 'Рыцарь'], 'Big Pipe': ['Big Pipe'], 'Birdeye': ['Birdeye'], 'Kaban': ['Кабан'], 'Kollontay': ['Коллонтай'], 'Partisan': ['Партизан'], 'Zryachiy': ['Зрячий']};

  var SUITE = {
    Tagilla: ["Заводской"],
    Shturman: ["Светлоозерский"],
    Reshala: ["Охранник"],
    Glukhar: ["Штурмовик", "Стрелок", "Разведчик"]
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function rnd(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function genScav() {
    return rnd(FIRST) + " " + rnd(SECOND);
  }

  function genList(faction, count, shuffleMix) {
    count = Math.max(1, Math.min(200, count | 0));
    var out = [];
    var i;
    if (faction === "scav") {
      for (i = 0; i < count; i++) out.push(genScav());
    } else if (faction === "raider") {
      for (i = 0; i < count; i++) out.push(rnd(RAIDERS));
    } else if (faction === "bd") {
      for (i = 0; i < count; i++) out.push(rnd(BD));
    } else if (faction === "boss") {
      var keys = Object.keys(BOSSES);
      for (i = 0; i < count; i++) {
        var k = rnd(keys);
        out.push(BOSSES[k][0] + (SUITE[k] ? " (" + rnd(SUITE[k]) + " — свита)" : ""));
      }
    } else if (faction === "mix") {
      var fns = [genScav, function () { return rnd(RAIDERS); }, function () { return rnd(BD); }];
      for (i = 0; i < count; i++) out.push(rnd(fns)());
    }
    if (shuffleMix) {
      for (i = out.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = out[i]; out[i] = out[j]; out[j] = t;
      }
    }
    return out;
  }

  function paintRef() {
    document.getElementById("refBosses").innerHTML = Object.keys(BOSSES).map(function (k) {
      return "<li><strong>" + esc(k) + "</strong>: " + esc(BOSSES[k].join(", ")) +
        (SUITE[k] ? ' <span class="meta">свита: ' + esc(SUITE[k].join(", ")) + "</span>" : "") +
        "</li>";
    }).join("");
    document.getElementById("refScav").textContent =
      "Часть 1: " + FIRST.length + " · Часть 2: " + SECOND.length +
      " → пример: " + genScav();
  }

  function run() {
    var factions = [];
    document.querySelectorAll("input[name=fac]:checked").forEach(function (el) {
      factions.push(el.value);
    });
    if (!factions.length) factions = ["scav"];
    var count = Number(document.getElementById("count").value) || 10;
    var order = document.getElementById("order").value;
    var all = [];
    if (order === "mixed" && factions.length > 1) {
      // generate combined pool
      var per = Math.ceil(count / factions.length);
      factions.forEach(function (f) {
        all = all.concat(genList(f, per, false));
      });
      all = all.slice(0, count);
      for (var i = all.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = all[i]; all[i] = all[j]; all[j] = tmp;
      }
    } else {
      factions.forEach(function (f) {
        all.push("--- " + f + " ---");
        all = all.concat(genList(f, count, false));
      });
    }
    document.getElementById("out").value = all.join("\n");
  }

  document.getElementById("btnGen").onclick = run;
  document.getElementById("btnCopy").onclick = function () {
    var t = document.getElementById("out");
    t.select();
    try {
      navigator.clipboard.writeText(t.value);
    } catch (e) {
      document.execCommand("copy");
    }
  };
  paintRef();
  run();
})();
