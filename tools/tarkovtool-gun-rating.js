/*! Tarkov — Weapon multi-metric rating */
(function () {
  "use strict";

  var CAL_LABEL = {
    Caliber9x18PM: "9×18",
    Caliber9x19PARA: "9×19",
    Caliber9x21: "9×21",
    Caliber9x33R: ".357",
    Caliber9x39: "9×39",
    Caliber1143x23ACP: ".45 ACP",
    Caliber46x30: "4.6×30",
    Caliber57x28: "5.7×28",
    Caliber545x39: "5.45×39",
    Caliber556x45NATO: "5.56×45",
    Caliber762x25TT: "7.62×25",
    Caliber762x35: ".300 BLK",
    Caliber762x39: "7.62×39",
    Caliber762x51: "7.62×51",
    Caliber762x54R: "7.62×54R",
    Caliber366TKM: ".366 ТКМ",
    Caliber127x55: "12.7×55",
    Caliber12g: "12/70",
    Caliber20g: "20/70",
    Caliber23x75: "23×75",
    Caliber86x70: ".338 LM"
  };

  var guns = [];
  var ammoByCal = {};
  var rows = [];
  var sortKey = "score";
  var sortDir = -1;

  function esc(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;");
  }

  function itemName(it) {
    if (!it) return "?";
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    return it.shortName || it.name || it.normalizedName || it.id || "?";
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("status");
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = msg || "";
  }

  function asArray(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "object") return Object.values(x);
    return [];
  }

  function fmt(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString("ru-RU");
  }

  function priceOf(it) {
    if (!it) return 0;
    var avg = Number(it.avg24hPrice) || 0;
    if (avg > 0) return avg;
    var last = Number(it.lastLowPrice) || 0;
    if (last > 0) return last;
    var min = 0;
    asArray(it.buyFromTrader).forEach(function (b) {
      var p = Number(b.priceRUB != null ? b.priceRUB : b.price) || 0;
      if (p > 0 && (!min || p < min)) min = p;
    });
    return min || Number(it.basePrice) || 0;
  }

  function calLabel(c) {
    if (!c) return "?";
    if (CAL_LABEL[c]) return CAL_LABEL[c];
    try {
      if (window.TarkovDicts && TarkovDicts.calibers && TarkovDicts.calibers[c])
        return TarkovDicts.calibers[c].label || c;
    } catch (e) {}
    return String(c).replace(/^Caliber/, "");
  }

  function ammoStats(caliber) {
    var list = ammoByCal[caliber] || [];
    if (!list.length) return { n: 0, avgPrice: 0, minPrice: 0 };
    var prices = list.map(priceOf).filter(function (p) {
      return p > 0;
    });
    prices.sort(function (a, b) {
      return a - b;
    });
    var avg = 0;
    if (prices.length) {
      var mid = Math.floor(prices.length / 2);
      avg = prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
    }
    return { n: list.length, avgPrice: avg, minPrice: prices[0] || 0 };
  }

  function modPoolSize(gun) {
    var p = gun.properties || {};
    var slots = asArray(p.slots);
    var seen = {};
    var n = 0;
    slots.forEach(function (s) {
      var f = s.filters || s.filter || {};
      if (Array.isArray(f)) f = f[0] || {};
      asArray(f.allowedItems).forEach(function (id) {
        if (!seen[id]) {
          seen[id] = 1;
          n++;
        }
      });
      asArray(f.allowedCategories).forEach(function (c) {
        var cid = typeof c === "string" ? c : c && c.id;
        if (cid && !seen["cat:" + cid]) {
          seen["cat:" + cid] = 1;
          n += 3;
        }
      });
    });
    return { slots: slots.length, pool: n };
  }

  function buildRows() {
    var q = (document.getElementById("q").value || "").trim().toLowerCase();
    var cal = document.getElementById("cal").value || "";
    var maxPrice = Number(document.getElementById("maxPrice").value) || 0;

    var raw = guns.map(function (g) {
      var p = g.properties || {};
      var caliber = p.caliber || "";
      var am = ammoStats(caliber);
      var mp = modPoolSize(g);
      var price = priceOf(g);
      var ergo = Number(p.ergonomics != null ? p.ergonomics : p.defaultErgonomics) || 0;
      var rv = Number(p.recoilVertical != null ? p.recoilVertical : p.defaultRecoilVertical) || 0;
      var rh = Number(p.recoilHorizontal != null ? p.recoilHorizontal : p.defaultRecoilHorizontal) || 0;
      var recoil = rv + rh;
      var rpm = Number(p.fireRate) || 0;
      return {
        gun: g,
        name: itemName(g),
        cal: caliber,
        calL: calLabel(caliber),
        price: price,
        ammoPrice: am.avgPrice,
        ammoMin: am.minPrice,
        ammoN: am.n,
        slots: mp.slots,
        modPool: mp.pool,
        ergo: ergo,
        recoil: recoil,
        rpm: rpm,
        score: 0
      };
    });

    function maxOf(k) {
      var m = 0;
      raw.forEach(function (r) {
        if (r[k] > m) m = r[k];
      });
      return m || 1;
    }
    var maxPriceG = maxOf("price");
    var maxAmmoP = maxOf("ammoPrice");
    var maxAmmoN = maxOf("ammoN");
    var maxSlots = maxOf("slots");
    var maxPool = maxOf("modPool");
    var maxErgo = maxOf("ergo");
    var maxRecoil = maxOf("recoil");
    var maxRpm = maxOf("rpm");

    raw.forEach(function (r) {
      var cheapGun = 1 - r.price / maxPriceG;
      var cheapAmmo = r.ammoPrice ? 1 - r.ammoPrice / maxAmmoP : 0.3;
      var ammoAvail = r.ammoN / maxAmmoN;
      var slotsN = r.slots / maxSlots;
      var modsN = r.modPool / maxPool;
      var ergoN = r.ergo / maxErgo;
      var recoilN = 1 - r.recoil / maxRecoil;
      var rpmN = r.rpm / maxRpm;
      r.score =
        100 *
        (0.14 * cheapGun +
          0.12 * cheapAmmo +
          0.12 * ammoAvail +
          0.1 * slotsN +
          0.14 * modsN +
          0.14 * ergoN +
          0.14 * recoilN +
          0.1 * rpmN);
    });

    rows = raw.filter(function (r) {
      if (cal && r.cal !== cal) return false;
      if (maxPrice && r.price > maxPrice) return false;
      if (q) {
        var hay = (r.name + " " + (r.gun.normalizedName || "") + " " + r.calL).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });

    rows.sort(function (a, b) {
      var av = a[sortKey];
      var bv = b[sortKey];
      if (sortKey === "name" || sortKey === "cal") {
        return sortDir * String(av).localeCompare(String(bv), "ru");
      }
      return sortDir * ((Number(av) || 0) - (Number(bv) || 0));
    });

    paint();
  }

  function paint() {
    document.getElementById("listCard").hidden = false;
    var tb = document.getElementById("tbody");
    tb.innerHTML = rows
      .slice(0, 150)
      .map(function (r) {
        return (
          '<tr><td class="num"><b>' +
          r.score.toFixed(1) +
          "</b></td><td>" +
          esc(r.name) +
          '</td><td><span class="badge">' +
          esc(r.calL) +
          '</span></td><td class="num">' +
          (r.price ? fmt(r.price) : "—") +
          '</td><td class="num">' +
          (r.ammoPrice ? fmt(r.ammoPrice) : "—") +
          (r.ammoMin && r.ammoMin !== r.ammoPrice
            ? '<div class="muted">min ' + fmt(r.ammoMin) + "</div>"
            : "") +
          '</td><td class="num">' +
          r.ammoN +
          '</td><td class="num">' +
          r.slots +
          '</td><td class="num">' +
          r.modPool +
          '</td><td class="num">' +
          r.ergo +
          '</td><td class="num">' +
          r.recoil +
          '</td><td class="num">' +
          (r.rpm || "—") +
          "</td></tr>"
        );
      })
      .join("");
  }

  function fillCalSelect() {
    var cals = {};
    guns.forEach(function (g) {
      var c = (g.properties || {}).caliber;
      if (c) cals[c] = 1;
    });
    var sel = document.getElementById("cal");
    var cur = sel.value;
    sel.innerHTML =
      '<option value="">Все</option>' +
      Object.keys(cals)
        .sort(function (a, b) {
          return calLabel(a).localeCompare(calLabel(b), "ru");
        })
        .map(function (c) {
          return '<option value="' + esc(c) + '">' + esc(calLabel(c)) + "</option>";
        })
        .join("");
    if (cur) sel.value = cur;
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Loading items…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Items…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var items = asArray(await TarkovAPI.items(mode));
      if (P) P.set(70);
      guns = [];
      ammoByCal = {};
      items.forEach(function (it) {
        var p = it.properties || {};
        var pt = p.propertiesType || "";
        if (pt === "ItemPropertiesWeapon") guns.push(it);
        if (pt === "ItemPropertiesAmmo") {
          var c = p.caliber || "";
          if (!ammoByCal[c]) ammoByCal[c] = [];
          ammoByCal[c].push(it);
        }
      });
      fillCalSelect();
      document.getElementById("filterCard").hidden = false;
      setStatus("Оружие: " + guns.length + " · калибров патронов: " + Object.keys(ammoByCal).length, true);
      if (P) P.done();
      buildRows();
      try {
        if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
      } catch (eB) {}
    } catch (e) {
      setStatus(e.message || String(e), false);
      if (P) P.fail(e.message);
    } finally {
      btn.disabled = false;
    }
  }

  document.getElementById("loadBtn").onclick = load;
  ["q", "cal", "maxPrice"].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener("input", buildRows);
    el.addEventListener("change", buildRows);
  });
  document.querySelectorAll("th[data-k]").forEach(function (th) {
    th.onclick = function () {
      var k = th.getAttribute("data-k");
      if (sortKey === k) sortDir *= -1;
      else {
        sortKey = k;
        sortDir = k === "name" || k === "cal" ? 1 : -1;
      }
      document.querySelectorAll("th[data-k]").forEach(function (t) {
        t.classList.toggle("on", t.getAttribute("data-k") === sortKey);
      });
      buildRows();
    };
  });
})();
