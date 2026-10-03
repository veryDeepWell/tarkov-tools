/*! Tarkov — XP reference + raid calculator */
(function () {
  "use strict";

  var CUM = [
    0, 0, 1000, 4017, 8432, 14256, 21477, 30023, 39936, 51204, 63723, 77563, 93279, 115302, 143253,
    177337, 217885, 264432, 316851, 374400, 437465, 505161, 577978, 656347, 741150, 836066, 944133,
    1066259, 1199423, 1343743, 1499338, 1666320, 1846664, 2043349, 2258436, 2492126, 2750217, 3032022,
    3337766, 3663831, 4010401, 4377662, 4765799, 5182399, 5627732, 6102063, 6630287, 7189442, 7779792,
    8401607, 9055144, 9740666, 10458431, 11219666, 12024744, 12874041, 13767918, 14706741, 15690872,
    16720667, 17816442, 19041492, 20360945, 21792266, 23350443, 25098462, 27100775, 29581231, 33028574,
    37953544, 44260543, 51901513, 60887711, 71228846, 82933459, 96009180, 110462910, 126300949, 144924572
  ];

  var TRANSIT_MUL = [1, 2, 2.8, 3.5, 4.2, 4.8, 5.4, 6, 6.5, 7.1, 7.6, 8.1, 8.5, 9, 9.5, 10, 10.6];

  var BASE = {
    scavKill: 55,
    pmcKill: 120,
    scavHs: 1.1,
    pmcHs: 1.2,
    survivedFix: 300,
    miaFix: 200,
    runnerFix: 200,
    transitFix: 300
  };

  function fmt(n) {
    return Math.round(Number(n) || 0).toLocaleString("ru-RU");
  }

  function calc() {
    var pmc = Math.max(0, Number(document.getElementById("pmc").value) || 0);
    var pmcHs = Math.min(pmc, Math.max(0, Number(document.getElementById("pmcHs").value) || 0));
    var scav = Math.max(0, Number(document.getElementById("scav").value) || 0);
    var scavHs = Math.min(scav, Math.max(0, Number(document.getElementById("scavHs").value) || 0));
    var exit = document.getElementById("exit").value;
    var transits = Math.max(0, Math.min(16, Number(document.getElementById("transits").value) || 0));
    var event = document.getElementById("eventMul").value === "event";
    var lib = document.getElementById("lib").value === "1";

    var pmcXp = event ? 600 : BASE.pmcKill;
    var scavXp = event ? 110 : BASE.scavKill;

    var combat = 0;
    combat += (pmc - pmcHs) * pmcXp + pmcHs * pmcXp * BASE.pmcHs;
    combat += (scav - scavHs) * scavXp + scavHs * scavXp * BASE.scavHs;

    var exitMul = 1;
    var fix = 0;
    if (exit === "survived") {
      exitMul = 1.5;
      fix = BASE.survivedFix;
    } else if (exit === "transit") {
      exitMul = TRANSIT_MUL[Math.min(transits, TRANSIT_MUL.length - 1)] || 1;
      fix = BASE.transitFix;
    } else if (exit === "mia") {
      exitMul = 0.75;
      fix = BASE.miaFix;
    } else if (exit === "killed") {
      exitMul = 0.75;
      fix = 0;
    } else if (exit === "runner") {
      exitMul = 0.5;
      fix = BASE.runnerFix;
    } else if (exit === "left") {
      exitMul = 0;
      fix = 0;
    }

    var sub = combat + fix;
    var total = sub * exitMul;
    if (lib) total *= 1.15;

    document.getElementById("xpOut").textContent = "≈ " + fmt(total) + " XP";
    document.getElementById("xpDetail").textContent =
      "Бой " +
      fmt(combat) +
      " + фикс " +
      fmt(fix) +
      " → ×" +
      exitMul +
      (lib ? " ×1.15 Library" : "") +
      (event ? " (ивент-киллы)" : "") +
      ". Без лута/квестов/эксплора — только киллы+исход.";
  }

  function paintLevels() {
    var tb = document.getElementById("lvlBody");
    var html = "";
    for (var L = 1; L < CUM.length; L++) {
      var toNext = L + 1 < CUM.length ? CUM[L + 1] - CUM[L] : "—";
      html +=
        '<tr><td class="num">' +
        L +
        '</td><td class="num">' +
        (typeof toNext === "number" ? fmt(toNext) : toNext) +
        '</td><td class="num">' +
        fmt(CUM[L]) +
        "</td></tr>";
    }
    tb.innerHTML = html;
  }

  function lvlDiff() {
    var a = Math.max(1, Math.min(CUM.length - 1, Number(document.getElementById("lvlFrom").value) || 1));
    var b = Math.max(1, Math.min(CUM.length - 1, Number(document.getElementById("lvlTo").value) || 1));
    if (b < a) {
      var t = a;
      a = b;
      b = t;
    }
    var need = CUM[b] - CUM[a];
    document.getElementById("lvlOut").textContent =
      "С " + a + " → " + b + ": нужно ≈ " + fmt(need) + " XP (накоплено на старте lvl)";
  }

  ["pmc", "pmcHs", "scav", "scavHs", "exit", "transits", "eventMul", "lib"].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener("input", calc);
    el.addEventListener("change", calc);
  });
  ["lvlFrom", "lvlTo"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", lvlDiff);
  });
  paintLevels();
  calc();
  lvlDiff();
})();
