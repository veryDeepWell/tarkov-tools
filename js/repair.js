/*! Tarkov — Repair estimator (wiki coefficients) */
(function () {
  "use strict";

  var MAT = {
    Aramid: { qKit: 1, qTr: 1, dest: 0.1875, c: [0.49, 0.9, 1.08, 1.33], label: "Арамид" },
    UHMWPE: { qKit: 3, qTr: 2.5, dest: 0.3375, c: [0.82, 2.04, 2.45, 3.01], label: "UHMWPE" },
    Combined: { qKit: 0.4, qTr: 0.4, dest: 0.375, c: [0.86, 2.37, 2.84, 3.49], label: "Комбинированные" },
    Titan: { qKit: 0.63, qTr: 0.63, dest: 0.4125, c: [0.89, 2.66, 3.19, 3.93], label: "Титан" },
    Aluminium: { qKit: 0.63, qTr: 0.63, dest: 0.45, c: [0.74, 1.17, 1.41, 1.73], label: "Алюминий" },
    ArmoredSteel: { qKit: 3, qTr: 2.5, dest: 0.525, c: [1, 1.51, 1.81, 2.22], label: "Баллистическая сталь" },
    Ceramic: { qKit: 0.26, qTr: 0.26, dest: 0.6, c: [1.13, 1.27, 1.52, 1.87], label: "Керамика" },
    Glass: { qKit: 0.15, qTr: 0.15, dest: 0.6, c: [0.78, 0.73, 0.87, 1.07], label: "Стекло" }
  };

  var ARMOR_Q = {
    kit: { uhmwpeSteel: 1.33, other: 1.1, cost: 0.4 },
    prapor: { uhmwpeSteel: 0.83, other: 0.83, cost: 0.83 },
    skier: { uhmwpeSteel: 1, other: 1, cost: 1 },
    mechanic: { uhmwpeSteel: 1.43, other: 1.43, cost: 1.23 }
  };

  var GUN_Q = {
    kit: { q: 1.05, cost: 0.5 },
    prapor: { q: 0.83, cost: 0.83 },
    skier: { q: 1, cost: 1 },
    mechanic: { q: 1.43, cost: 1.23 }
  };

  var armorItems = [];
  var guns = [];

  function fmt(n) {
    return Math.round(Number(n) || 0).toLocaleString("ru-RU");
  }

  function itemName(it) {
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    return (it && (it.shortName || it.name || it.normalizedName)) || "?";
  }

  function priceOf(it) {
    if (!it) return 0;
    var avg = Number(it.avg24hPrice) || 0;
    if (avg > 0) return avg;
    return Number(it.lastLowPrice) || Number(it.basePrice) || 0;
  }

  function asArray(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "object") return Object.values(x);
    return [];
  }

  function paintMatTable() {
    var tb = document.getElementById("matBody");
    tb.innerHTML = Object.keys(MAT)
      .map(function (k) {
        var m = MAT[k];
        return (
          "<tr><td>" +
          m.label +
          '</td><td class="num">' +
          m.qKit +
          '</td><td class="num">' +
          m.qTr +
          '</td><td class="num">' +
          m.dest +
          '</td><td class="num">' +
          m.c[0] +
          '</td><td class="num">' +
          m.c[3] +
          "</td></tr>"
        );
      })
      .join("");
  }

  function armorCalc() {
    var matKey = document.getElementById("mat").value;
    var m = MAT[matKey] || MAT.UHMWPE;
    var cur = Number(document.getElementById("curD").value) || 0;
    var maxD = Number(document.getElementById("maxD").value) || 1;
    var tgt = Number(document.getElementById("tgtD").value) || maxD;
    var price = Number(document.getElementById("itemPrice").value) || 0;
    var src = document.getElementById("srcArmor").value;
    var aq = ARMOR_Q[src] || ARMOR_Q.kit;

    tgt = Math.min(tgt, maxD);
    var restore = Math.max(0, tgt - cur);
    if (restore <= 0) {
      document.getElementById("armorOut").textContent = "Нечего чинить";
      document.getElementById("armorDetail").textContent = "";
      return;
    }

    var isSteelU = matKey === "UHMWPE" || matKey === "ArmoredSteel";
    var qRepair = isSteelU ? aq.uhmwpeSteel : aq.other;
    var matQ = src === "kit" ? m.qKit : m.qTr;
    var lossEst = restore / (Math.max(0.2, qRepair) * Math.max(0.15, matQ) * 8);
    var srcIdx = { kit: 0, prapor: 1, skier: 2, mechanic: 3 }[src] || 0;
    var matCost = m.c[srcIdx];
    var costEst = price * matCost * aq.cost * (restore / maxD) * 0.15;
    var newMax = Math.max(1, maxD - lossEst);
    var worth = costEst < price * 0.45;

    document.getElementById("armorOut").textContent =
      "Восстановить " +
      restore.toFixed(1) +
      " dur · оценка ~" +
      fmt(costEst) +
      " ₽ · max ≈ −" +
      lossEst.toFixed(2) +
      " → " +
      newMax.toFixed(1);
    document.getElementById("armorDetail").textContent =
      "Источник: " +
      src +
      " · кач. ремонта " +
      qRepair +
      " · мат. " +
      m.label +
      " (кач. " +
      matQ +
      "). " +
      (worth ? "Ремонт обычно выгоднее нового." : "Сравни с ценой нового (" + fmt(price) + " ₽).");
  }

  function gunCalc() {
    var cur = Number(document.getElementById("gCur").value) || 0;
    var maxD = Number(document.getElementById("gMax").value) || 100;
    var tgt = Math.min(maxD, Number(document.getElementById("gTgt").value) || maxD);
    var price = Number(document.getElementById("gPrice").value) || 0;
    var src = document.getElementById("srcGun").value;
    var gq = GUN_Q[src] || GUN_Q.kit;
    var restore = Math.max(0, tgt - cur);
    if (restore <= 0) {
      document.getElementById("gunOut").textContent = "Нечего чинить";
      document.getElementById("gunDetail").textContent = "";
      return;
    }
    var lossEst = restore / (gq.q * 12);
    var costEst = price * gq.cost * (restore / maxD) * 0.2;
    var newMax = Math.max(1, maxD - lossEst);
    document.getElementById("gunOut").textContent =
      "Восстановить " +
      restore.toFixed(1) +
      " · ~" +
      fmt(costEst) +
      " ₽ · max ≈ −" +
      lossEst.toFixed(2) +
      " → " +
      newMax.toFixed(1);
    document.getElementById("gunDetail").textContent =
      "Кач. " + gq.q + " · коэф. цены " + gq.cost + ". Ниже ~93% dur — зона малфанков.";
  }

  function bindItemPick() {
    document.getElementById("armorQ").addEventListener("change", function () {
      var q = (this.value || "").toLowerCase();
      var hit = armorItems.find(function (it) {
        return itemName(it).toLowerCase() === q || (it.normalizedName || "").toLowerCase() === q;
      });
      if (!hit) {
        hit = armorItems.find(function (it) {
          return itemName(it).toLowerCase().indexOf(q) >= 0;
        });
      }
      if (!hit) return;
      var p = hit.properties || {};
      var dur = Number(p.durability || p.maxDurability) || 0;
      if (dur) {
        document.getElementById("maxD").value = dur;
        document.getElementById("tgtD").value = dur;
        document.getElementById("curD").value = Math.round(dur * 0.5);
      }
      var pr = priceOf(hit);
      if (pr) document.getElementById("itemPrice").value = pr;
      var mat = p.material && (p.material.name || p.material);
      if (mat) {
        var map = {
          Aramid: "Aramid",
          UHMWPE: "UHMWPE",
          Combined: "Combined",
          Titan: "Titan",
          Aluminium: "Aluminium",
          Aluminum: "Aluminium",
          ArmoredSteel: "ArmoredSteel",
          Ceramic: "Ceramic",
          Glass: "Glass"
        };
        var key = map[mat] || map[String(mat).replace(/\s/g, "")];
        if (key) document.getElementById("mat").value = key;
      }
      armorCalc();
    });
    document.getElementById("gunQ").addEventListener("change", function () {
      var q = (this.value || "").toLowerCase();
      var hit = guns.find(function (it) {
        return itemName(it).toLowerCase().indexOf(q) >= 0;
      });
      if (!hit) return;
      var p = hit.properties || {};
      var maxD = Number(p.maxDurability) || 100;
      document.getElementById("gMax").value = maxD;
      document.getElementById("gTgt").value = maxD;
      document.getElementById("gCur").value = Math.round(maxD * 0.85);
      var pr = priceOf(hit) || Number(p.repairCost) || 0;
      if (pr) document.getElementById("gPrice").value = pr;
      gunCalc();
    });
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    var st = document.getElementById("status");
    st.textContent = "Loading…";
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Items…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var items = asArray(await TarkovAPI.items(mode));
      armorItems = [];
      guns = [];
      items.forEach(function (it) {
        var p = it.properties || {};
        var pt = p.propertiesType || "";
        if (pt === "ItemPropertiesWeapon") guns.push(it);
        if (
          pt === "ItemPropertiesArmor" ||
          pt === "ItemPropertiesArmorPlate" ||
          pt === "ItemPropertiesHelmet" ||
          (p.durability && p.class)
        )
          armorItems.push(it);
      });
      document.getElementById("armorList").innerHTML = armorItems
        .slice(0, 400)
        .map(function (it) {
          return '<option value="' + itemName(it).replace(/"/g, "") + '">';
        })
        .join("");
      document.getElementById("gunList").innerHTML = guns
        .slice(0, 300)
        .map(function (it) {
          return '<option value="' + itemName(it).replace(/"/g, "") + '">';
        })
        .join("");
      st.className = "status ok";
      st.textContent = "Броня/плиты: " + armorItems.length + " · стволы: " + guns.length;
      if (P) P.done();
    } catch (e) {
      st.className = "status";
      st.textContent = "API недоступен — ручной режим. " + (e.message || "");
      if (P) P.fail(e.message);
    } finally {
      btn.disabled = false;
    }
  }

  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll(".tabs button").forEach(function (x) {
        x.classList.remove("active");
      });
      b.classList.add("active");
      var t = b.getAttribute("data-tab");
      document.getElementById("panel-armor").hidden = t !== "armor";
      document.getElementById("panel-weapon").hidden = t !== "weapon";
      document.getElementById("panel-skills").hidden = t !== "skills";
    };
  });

  ["mat", "curD", "maxD", "tgtD", "itemPrice", "srcArmor"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", armorCalc);
    document.getElementById(id).addEventListener("change", armorCalc);
  });
  ["gCur", "gMax", "gTgt", "gPrice", "srcGun"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", gunCalc);
    document.getElementById(id).addEventListener("change", gunCalc);
  });
  document.getElementById("loadBtn").onclick = load;
  paintMatTable();
  bindItemPick();
  armorCalc();
  gunCalc();
})();
