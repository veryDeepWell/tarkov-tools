/*! Tarkov — Hitboxes & damage simulator (Zhbobyh mechanics + interactive dummy) */
(function () {
  "use strict";

  var PARTS = [
    { id: "head", name: "Голова", max: 35, transferMul: 1.0 },
    { id: "thorax", name: "Грудь", max: 85, transferMul: 1.0 },
    { id: "stomach", name: "Живот", max: 70, transferMul: 1.5 },
    { id: "leftArm", name: "Л. рука", max: 60, transferMul: 0.7 },
    { id: "rightArm", name: "П. рука", max: 60, transferMul: 0.7 },
    { id: "leftLeg", name: "Л. нога", max: 65, transferMul: 1.0 },
    { id: "rightLeg", name: "П. нога", max: 65, transferMul: 1.0 }
  ];

  var BLACK_RECV_MUL = 0.7; // общий множитель урона от чёрных частей

  // Curated common ammo (flesh dmg / pen approx for display)
  var AMMO = [
    { id: "545_ps", name: "5.45 PS gs", dmg: 50, pen: 28, cal: "5.45x39" },
    { id: "545_bt", name: "5.45 BT gs", dmg: 44, pen: 37, cal: "5.45x39" },
    { id: "545_bs", name: "5.45 BS gs", dmg: 40, pen: 51, cal: "5.45x39" },
    { id: "545_igolnik", name: "5.45 Igolnik", dmg: 37, pen: 62, cal: "5.45x39" },
    { id: "556_m855", name: "5.56 M855", dmg: 50, pen: 28, cal: "5.56x45" },
    { id: "556_m855a1", name: "5.56 M855A1", dmg: 45, pen: 40, cal: "5.56x45" },
    { id: "556_m995", name: "5.56 M995", dmg: 40, pen: 53, cal: "5.56x45" },
    { id: "762_ps", name: "7.62 PS gzh", dmg: 57, pen: 33, cal: "7.62x39" },
    { id: "762_bp", name: "7.62 BP gzh", dmg: 48, pen: 47, cal: "7.62x39" },
    { id: "76251_lps", name: "7.62x51 M80", dmg: 80, pen: 41, cal: "7.62x51" },
    { id: "76251_m61", name: "7.62x51 M61", dmg: 70, pen: 68, cal: "7.62x51" },
    { id: "76254_lps", name: "7.62x54R LPS Gzh", dmg: 81, pen: 42, cal: "7.62x54R" },
    { id: "76254_snb", name: "7.62x54R SNB", dmg: 75, pen: 62, cal: "7.62x54R" },
    { id: "9_pst", name: "9x19 Pst gzh", dmg: 50, pen: 20, cal: "9x19" },
    { id: "9_ap", name: "9x19 AP 6.3", dmg: 52, pen: 30, cal: "9x19" },
    { id: "45_fmj", name: ".45 FMJ", dmg: 72, pen: 19, cal: ".45 ACP" },
    { id: "45_ap", name: ".45 AP", dmg: 70, pen: 38, cal: ".45 ACP" },
    { id: "12_7mm", name: "12/70 7mm Buck", dmg: 35, pen: 3, cal: "12ga", pellets: 8 },
    { id: "12_ap20", name: "12/70 AP-20", dmg: 164, pen: 37, cal: "12ga" },
    { id: "338_fmj", name: ".338 FMJ", dmg: 122, pen: 47, cal: ".338 Lapua" },
    { id: "338_ap", name: ".338 AP", dmg: 115, pen: 79, cal: ".338 Lapua" }
  ];

  var PRESETS = [
    { id: "pmc", name: "PMC", scale: 1 },
    { id: "scav", name: "Scav", scale: 1 },
    { id: "raider", name: "Raider ×1.2", scale: 1.2 },
    { id: "boss", name: "Boss ×1.5", scale: 1.5 },
    { id: "tank", name: "Танк ×2", scale: 2 }
  ];

  var state = {
    hp: {},
    max: {},
    effects: { fracture: {}, bleedL: {}, bleedH: {} },
    dead: false,
    history: [],
    ammoId: "545_bt"
  };

  function initHp(scale) {
    scale = scale || 1;
    PARTS.forEach(function (p) {
      state.max[p.id] = Math.round(p.max * scale);
      state.hp[p.id] = state.max[p.id];
    });
    state.effects = { fracture: {}, bleedL: {}, bleedH: {} };
    state.dead = false;
  }

  function partById(id) {
    return PARTS.find(function (p) { return p.id === id; });
  }

  function isBlack(id) {
    return state.hp[id] <= 0;
  }

  function livingParts() {
    return PARTS.filter(function (p) { return state.hp[p.id] > 0; });
  }

  function totalMaxLiving() {
    return livingParts().reduce(function (s, p) { return s + state.max[p.id]; }, 0);
  }

  function currentAmmo() {
    return AMMO.find(function (a) { return a.id === state.ammoId; }) || AMMO[0];
  }

  // Apply damage to a living part; returns actual taken
  function applyToPart(id, rawDmg) {
    if (state.hp[id] <= 0) return 0;
    var taken = Math.min(state.hp[id], rawDmg);
    state.hp[id] = Math.max(0, state.hp[id] - rawDmg);
    // keep fractional internal — we store floats
    if (state.hp[id] < 0.0001) state.hp[id] = 0;
    return taken;
  }

  /**
   * Simulate one hit on partId with given flesh damage.
   * Mechanics from Zhbobyh notes:
   * - damage always applied even without pen (we always apply flesh here)
   * - one bullet once per hitbox (we only hit the clicked one + transfer)
   * - blacked → transfer with part mul * BLACK_RECV_MUL, proportional to max HP of living
   * - head/thorax at 0 → death on hit or transfer into them
   */
  function simulateHit(partId) {
    if (state.dead) {
      pushHist("Труп", "Попадание в труп — урон не симулируем (тело-укрытие).", null);
      return;
    }

    var ammo = currentAmmo();
    var part = partById(partId);
    if (!part) return;

    var dmg = ammo.dmg * (ammo.pellets || 1); // buck: sum-ish for teaching
    var log = {
      part: part.name,
      ammo: ammo.name,
      dmg: dmg,
      lines: [],
      effects: []
    };

    if (isBlack(partId)) {
      // Transfer path
      if (partId === "head" || partId === "thorax") {
        state.dead = true;
        log.lines.push("Часть уже выбита (голова/грудь) → смерть");
        pushHist(log.part, log.lines.join("; "), log);
        renderAll();
        return;
      }

      var mul = part.transferMul * BLACK_RECV_MUL;
      var transferPool = dmg * mul;
      log.lines.push(
        "Чёрная «" + part.name + "»: перенос " +
        dmg.toFixed(0) + " × " + part.transferMul + " × 0.7 = " + transferPool.toFixed(1)
      );

      var living = livingParts();
      var sumMax = totalMaxLiving();
      if (!living.length || sumMax <= 0) {
        state.dead = true;
        log.lines.push("Нет живых частей → смерть");
        pushHist(log.part, log.lines.join("; "), log);
        renderAll();
        return;
      }

      living.forEach(function (lp) {
        var share = (state.max[lp.id] / sumMax) * transferPool;
        var before = state.hp[lp.id];
        applyToPart(lp.id, share);
        log.lines.push(
          "→ " + lp.name + ": −" + share.toFixed(1) +
          " (" + before.toFixed(1) + " → " + state.hp[lp.id].toFixed(1) + ")"
        );
        if (state.hp[lp.id] <= 0 && (lp.id === "head" || lp.id === "thorax")) {
          state.dead = true;
          log.lines.push("Выбита " + lp.name + " переносом → смерть");
        }
      });
    } else {
      // Direct hit
      var maxHp = state.max[partId];
      var before = state.hp[partId];
      var ratio = dmg / maxHp;
      applyToPart(partId, dmg);
      log.lines.push(
        "Прямой урон −" + dmg.toFixed(0) +
        " (" + before.toFixed(1) + " → " + state.hp[partId].toFixed(1) +
        ", " + (ratio * 100).toFixed(0) + "% max)"
      );

      // Effects (threshold + soft random ~70% if threshold met)
      if (ratio >= 0.3 && Math.random() < 0.75) {
        state.effects.fracture[partId] = true;
        log.effects.push("перелом");
      }
      if (ratio >= 0.5 && Math.random() < 0.7) {
        state.effects.bleedH[partId] = true;
        delete state.effects.bleedL[partId];
        log.effects.push("тяж. кровотечение");
      } else if (ratio >= 0.35 && Math.random() < 0.7) {
        if (!state.effects.bleedH[partId]) {
          state.effects.bleedL[partId] = true;
          log.effects.push("лёгк. кровотечение");
        }
      }

      // If this hit blacked head/thorax → death
      if (state.hp[partId] <= 0 && (partId === "head" || partId === "thorax")) {
        state.dead = true;
        log.lines.push("Выбита " + part.name + " → смерть");
      }

      // Excess over black doesn't transfer on the same direct hit in simplified model
      // (real game may; for teaching we transfer only on subsequent hits to black)
    }

    pushHist(log.part, log.lines.join("; ") + (log.effects.length ? " | " + log.effects.join(", ") : ""), log);
    renderAll();
  }

  function pushHist(title, detail, full) {
    state.history.unshift({
      t: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      title: title,
      detail: detail,
      full: full
    });
    if (state.history.length > 40) state.history.pop();
  }

  function displayHp(v, max) {
    // UI rounding from notes: >50% remaining → floor, <50% → ceil
    if (v <= 0) return 0;
    var rem = v / max;
    if (rem > 0.5) return Math.floor(v);
    return Math.ceil(v);
  }

  function renderBody() {
    PARTS.forEach(function (p) {
      var el = document.querySelector('.hit-zone[data-part="' + p.id + '"]');
      var lbl = document.getElementById("lbl-" + p.id);
      if (!el || !lbl) return;
      var hp = state.hp[p.id];
      var max = state.max[p.id];
      el.classList.toggle("blacked", hp <= 0);
      el.classList.toggle("hurt", hp > 0 && hp < max);
      lbl.textContent = displayHp(hp, max);
      lbl.classList.toggle("dim", hp <= 0);
    });
  }

  function renderEffects() {
    var box = document.getElementById("effects");
    var html = "";
    if (state.dead) html += '<span class="eff dead">МЁРТВ</span>';
    PARTS.forEach(function (p) {
      if (state.effects.fracture[p.id]) html += '<span class="eff fracture">' + p.name + ": перелом</span>";
      if (state.effects.bleedH[p.id]) html += '<span class="eff bleed-h">' + p.name + ": тяж. кровот.</span>";
      else if (state.effects.bleedL[p.id]) html += '<span class="eff bleed-l">' + p.name + ": лёгк. кровот.</span>";
    });
    box.innerHTML = html || '<span class="muted" style="font-size:.8rem">Нет эффектов</span>';
  }

  function renderPartsGrid() {
    var box = document.getElementById("partsGrid");
    box.innerHTML = PARTS.map(function (p) {
      var hp = state.hp[p.id];
      return (
        '<div class="part-row' + (hp <= 0 ? " blacked" : "") + '">' +
        '<span class="name">' + p.name + "</span>" +
        '<span><input type="number" min="0" step="0.1" data-part="' + p.id + '" value="' +
        (Math.round(hp * 10) / 10) +
        '"> / ' + state.max[p.id] + "</span></div>"
      );
    }).join("");
    box.querySelectorAll("input").forEach(function (inp) {
      inp.onchange = function () {
        var id = inp.getAttribute("data-part");
        var v = Math.max(0, Number(inp.value) || 0);
        state.hp[id] = Math.min(v, state.max[id]);
        if (state.hp[id] > 0 && (id === "head" || id === "thorax")) state.dead = false;
        // if healed all critical, clear dead? only if head+thorax >0
        if (state.hp.head > 0 && state.hp.thorax > 0) state.dead = false;
        renderAll();
      };
    });
  }

  function renderHistory() {
    var box = document.getElementById("history");
    if (!state.history.length) {
      box.innerHTML = '<div class="history-item"><div class="d">Кликни по части тела</div></div>';
      return;
    }
    box.innerHTML = state.history
      .map(function (h) {
        return (
          '<div class="history-item"><div class="t">' +
          h.t + " · " + h.title +
          '</div><div class="d">' +
          h.detail +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderAmmo() {
    var a = currentAmmo();
    document.getElementById("ammoInfo").innerHTML =
      "<strong>" + a.cal + "</strong> · урон " + a.dmg +
      (a.pellets ? " ×" + a.pellets + " дробин" : "") +
      " · пробитие " + a.pen +
      " · в симуляции flesh = " + (a.dmg * (a.pellets || 1));
  }

  function renderAll() {
    renderBody();
    renderEffects();
    renderPartsGrid();
    renderHistory();
    renderAmmo();
  }

  // Tabs
  document.querySelectorAll("#tabs .tab").forEach(function (btn) {
    btn.onclick = function () {
      document.querySelectorAll("#tabs .tab").forEach(function (b) { b.classList.remove("on"); });
      document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("on"); });
      btn.classList.add("on");
      document.getElementById("panel-" + btn.getAttribute("data-tab")).classList.add("on");
    };
  });

  // Ammo select
  var sel = document.getElementById("ammoSelect");
  sel.innerHTML = AMMO.map(function (a) {
    return '<option value="' + a.id + '">' + a.name + " (" + a.dmg + " dmg)</option>";
  }).join("");
  sel.value = state.ammoId;
  sel.onchange = function () {
    state.ammoId = sel.value;
    renderAmmo();
  };

  // Body clicks
  document.querySelectorAll(".hit-zone").forEach(function (el) {
    el.addEventListener("click", function () {
      simulateHit(el.getAttribute("data-part"));
    });
  });

  document.getElementById("btnHeal").onclick = function () {
    PARTS.forEach(function (p) { state.hp[p.id] = state.max[p.id]; });
    state.effects = { fracture: {}, bleedL: {}, bleedH: {} };
    state.dead = false;
    pushHist("Лечение", "Все части восстановлены, эффекты сняты", null);
    renderAll();
  };

  document.getElementById("btnReset").onclick = function () {
    initHp(1);
    pushHist("Сброс", "Стандартный PMC", null);
    renderAll();
  };

  document.getElementById("btnClearHist").onclick = function () {
    state.history = [];
    renderHistory();
  };

  // Presets
  var presetsBox = document.getElementById("presets");
  presetsBox.innerHTML = PRESETS.map(function (pr) {
    return '<button type="button" class="btn-sm" data-preset="' + pr.id + '">' + pr.name + "</button>";
  }).join("");
  presetsBox.querySelectorAll("button").forEach(function (b) {
    b.onclick = function () {
      var pr = PRESETS.find(function (x) { return x.id === b.getAttribute("data-preset"); });
      if (!pr) return;
      initHp(pr.scale);
      pushHist("Пресет", pr.name + " (scale ×" + pr.scale + ")", null);
      renderAll();
    };
  });

  initHp(1);
  renderAll();
})();
