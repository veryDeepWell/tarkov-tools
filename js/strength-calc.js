/*! Strength calculator — R3.4 */
(function () {
  "use strict";

  /** Elite Strength soft skill level */
  var ELITE = 51;

  /**
   * Approximate thresholds (kg) — community / wiki oriented model.
   * Soft overweight (yellow) and hard (red) scale with Strength.
   * Values are estimates for planning; verify in-game after patches.
   */
  function thresholds(level) {
    var L = Math.max(0, Math.min(ELITE, Number(level) || 0));
    // Baseline at 0 ≈ 20 kg yellow / 30 kg red (order of magnitude for PMC kit era)
    // Elite stretches thresholds significantly.
    var t = L / ELITE;
    var yellow = 20 + t * 25; // ~20 → ~45
    var red = 30 + t * 35;    // ~30 → ~65
    return {
      level: L,
      yellow: Math.round(yellow * 10) / 10,
      red: Math.round(red * 10) / 10,
      elite: L >= ELITE
    };
  }

  /** Temporary Strength buffs from common stims (points of skill) */
  var STIMS = [
    { id: "sj1", name: "SJ1 TGLabs", delta: 20, note: "Combat stim, +20 Strength" },
    { id: "meldonin", name: "Meldonin", delta: 10, note: "+10 Strength (also other buffs)" },
    { id: "3btg", name: "3-(b-TG)", delta: 15, note: "Approx. combat/physical package" },
    { id: "adrenaline", name: "Adrenaline", delta: 0, note: "Pain / mobility — not Strength levels" },
    { id: "mule", name: "M.U.L.E.", delta: 0, note: "Weight capacity buff, not Strength skill" },
    { id: "obdolbos", name: "Obdolbos", delta: 0, note: "Random — do not plan around" }
  ];

  function esc(s) {
    return window.TarkovDicts && TarkovDicts.esc
      ? TarkovDicts.esc(s)
      : String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  function readLevel() {
    var el = document.getElementById("strLevel");
    return Math.max(0, Math.min(ELITE, Number(el && el.value) || 0));
  }

  function selectedStimDelta() {
    var sum = 0;
    var names = [];
    STIMS.forEach(function (s) {
      var cb = document.getElementById("stim_" + s.id);
      if (cb && cb.checked && s.delta) {
        sum += s.delta;
        names.push(s.name + " (+" + s.delta + ")");
      }
    });
    return { sum: sum, names: names };
  }

  function paint() {
    var base = readLevel();
    var stim = selectedStimDelta();
    var effective = Math.min(ELITE + 20, base + stim.sum); // allow temporary above elite display
    var thBase = thresholds(base);
    var thEff = thresholds(Math.min(ELITE, effective));

    document.getElementById("outBase").textContent = String(base);
    document.getElementById("outEff").textContent = String(base + stim.sum) +
      (stim.sum ? " (base " + base + " + stim " + stim.sum + ")" : "");
    document.getElementById("outYellow").textContent = thBase.yellow + " кг";
    document.getElementById("outRed").textContent = thBase.red + " кг";
    document.getElementById("outYellowEff").textContent = thEff.yellow + " кг";
    document.getElementById("outRedEff").textContent = thEff.red + " кг";

    var eliteMsg = document.getElementById("eliteMsg");
    var need = ELITE - base;
    if (base >= ELITE) {
      eliteMsg.textContent = "Уже elite Strength (" + ELITE + ").";
      eliteMsg.className = "status ok";
    } else if (base + stim.sum >= ELITE) {
      eliteMsg.textContent = "С выбранными стимами эффективная сила ≥ " + ELITE +
        " (временно elite). " + (stim.names.join(" + ") || "");
      eliteMsg.className = "status ok";
    } else {
      eliteMsg.textContent = "До elite не хватает " + need + " ур. силы (или " +
        (ELITE - base - stim.sum) + " с учётом стимов). Классика: 21 + SJ1(+20) + Meldonin(+10) = 51.";
      eliteMsg.className = "status";
    }

    // table
    var tbody = document.getElementById("tbody");
    tbody.innerHTML = "";
    for (var L = 0; L <= ELITE; L += (L < 20 ? 5 : L < 40 ? 5 : 1)) {
      if (L > ELITE) break;
    }
    // denser near elite
    var levels = [];
    for (var i = 0; i <= 20; i += 5) levels.push(i);
    for (i = 25; i <= 45; i += 5) levels.push(i);
    for (i = 46; i <= ELITE; i++) levels.push(i);
    if (levels.indexOf(base) < 0) levels.push(base);
    levels.sort(function (a, b) { return a - b; });

    levels.forEach(function (L) {
      var t = thresholds(L);
      var tr = document.createElement("tr");
      if (L === base) tr.style.outline = "1px solid var(--accent)";
      tr.innerHTML =
        "<td>" + L + (L >= ELITE ? " ★" : "") + "</td>" +
        "<td>" + t.yellow + "</td>" +
        "<td>" + t.red + "</td>";
      tbody.appendChild(tr);
    });
  }

  function buildStimUi() {
    var box = document.getElementById("stimBox");
    box.innerHTML = STIMS.map(function (s) {
      return '<label class="stim-row"><input type="checkbox" id="stim_' + s.id + '"> <strong>' +
        esc(s.name) + "</strong> " +
        (s.delta ? '<span class="tag good">+' + s.delta + "</span>" : '<span class="tag">—</span>') +
        ' <span class="meta">' + esc(s.note) + "</span></label>";
    }).join("");
    STIMS.forEach(function (s) {
      var cb = document.getElementById("stim_" + s.id);
      if (cb) cb.addEventListener("change", paint);
    });
  }

  document.getElementById("strLevel").addEventListener("input", paint);
  document.getElementById("preset21").addEventListener("click", function () {
    document.getElementById("strLevel").value = 21;
    var sj = document.getElementById("stim_sj1");
    var me = document.getElementById("stim_meldonin");
    if (sj) sj.checked = true;
    if (me) me.checked = true;
    paint();
  });

  buildStimUi();
  paint();

  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
    } catch (e) {}
    paint();
  };
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () { window.render(); });
  }
})();
