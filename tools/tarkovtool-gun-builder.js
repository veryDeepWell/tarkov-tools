/*! Tarkov — Gun Builder (schema L←R muzzle→stock, regions, zoom, Auto Build) */
(function () {
  "use strict";

  var byId = {};
  var weapons = [];
  var mods = [];
  var baseWeapon = null;
  /** @type {Record<string, string>} */
  var installed = {};
  var abGoal = "balanced";
  var abBuilds = [];
  var schemaZoom = 1;
  var dragState = null;

  var SLOT_LABEL = {
    mod_pistol_grip: "Пистолетная рукоять",
    mod_pistolgrip: "Пистолетная рукоять",
    mod_stock: "Приклад",
    mod_barrel: "Ствол",
    mod_handguard: "Цевьё",
    mod_muzzle: "ДТК / дульный",
    mod_scope: "Прицел",
    mod_sight_rear: "Целик",
    mod_sight_front: "Мушка",
    mod_magazine: "Магазин",
    mod_charge: "Рукоятка взведения",
    mod_gas_block: "Газблок",
    mod_reciever: "Ресивер",
    mod_receiver: "Ресивер",
    mod_mount: "Крепление",
    mod_tactical: "Тактический",
    mod_foregrip: "Рукоять",
    mod_bipod: "Сошки",
    mod_launcher: "Подствольник"
  };

  var REGION_ORDER = ["FRONT", "FRONT_BOTTOM", "RECEIVER", "TOP", "BOTTOM", "REAR", "OTHER"];

  var FILL_ORDER = [
    "mod_barrel", "mod_reciever", "mod_receiver", "mod_gas_block", "mod_handguard",
    "mod_pistol_grip", "mod_pistolgrip", "mod_stock", "mod_muzzle", "mod_foregrip",
    "mod_mount", "mod_scope", "mod_sight_rear", "mod_sight_front", "mod_tactical",
    "mod_magazine", "mod_charge", "mod_bipod", "mod_launcher"
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

  function fmt(n) {
    return Math.round(Number(n) || 0).toLocaleString("ru-RU");
  }

  function itemName(it) {
    if (!it) return "?";
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    return it.shortName || it.name || it.normalizedName || it.id || "?";
  }

  function humanize(slug) {
    try {
      if (window.TarkovDicts && TarkovDicts.humanize) return TarkovDicts.humanize(slug);
    } catch (e) {}
    return String(slug || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      });
  }

  function asArray(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "object") return Object.values(x);
    return [];
  }

  function isWeapon(it) {
    if (!it || !it.properties) return false;
    var t = it.properties.propertiesType || "";
    if (t === "ItemPropertiesWeapon") return true;
    return asArray(it.categories).some(function (c) {
      return /weapon|assault|smg|shotgun|sniper|pistol|marksman|machinegun/.test(
        (c.normalizedName || c.name || "").toLowerCase()
      );
    });
  }

  function isMod(it) {
    if (!it || !it.properties) return false;
    var t = it.properties.propertiesType || "";
    if (/WeaponMod|Magazine|Barrel|Stock|Scope|Muzzle|Mount|Grip|Handguard|Flashlight|Tactical/.test(t))
      return true;
    if (t === "ItemPropertiesWeapon") return false;
    return !!(it.properties.slots || it.properties.ergonomics != null || it.properties.recoil != null);
  }

  function itemPrice(it) {
    if (!it) return 0;
    var avg = Number(it.avg24hPrice) || 0;
    if (avg > 0) return avg;
    var low = Number(it.lastLowPrice) || 0;
    if (low > 0) return low;
    var min = Infinity;
    asArray(it.buyFor || it.buyFromTrader).forEach(function (b) {
      var p = Number(b.priceRUB != null ? b.priceRUB : b.price) || 0;
      if (p > 0 && p < min) min = p;
    });
    return min === Infinity ? 0 : min;
  }

  function isBuyable(it) {
    if (!it) return false;
    if (Number(it.avg24hPrice) > 0 || Number(it.lastLowPrice) > 0) return true;
    return asArray(it.buyFor || it.buyFromTrader).some(function (b) {
      return (Number(b.priceRUB != null ? b.priceRUB : b.price) || 0) > 0;
    });
  }

  function slotBase(nameId) {
    var s = String(nameId || "").toLowerCase().replace(/_\d+$/, "");
    if (s === "mod_pistolgrip") s = "mod_pistol_grip";
    if (s.indexOf("mod_tactical") === 0) s = "mod_tactical";
    if (s.indexOf("mod_mount") === 0) s = "mod_mount";
    if (s === "mod_receiver") s = "mod_reciever";
    return s;
  }

  function slotLabel(nameId) {
    var b = slotBase(nameId);
    return SLOT_LABEL[b] || SLOT_LABEL[nameId] || humanize(nameId);
  }

  function fillPriority(nameId) {
    var i = FILL_ORDER.indexOf(slotBase(nameId));
    return i < 0 ? 100 : i;
  }

  function getRegion(nameId) {
    var s = String(nameId || "").toLowerCase();
    if (/muzzle|flash.?hider|suppressor|silencer/.test(s)) return "FRONT";
    if (/barrel/.test(s)) return "FRONT";
    if (/gas.?block|gas.?tube/.test(s)) return "FRONT";
    if (/handguard|hand_guard/.test(s)) return "FRONT_BOTTOM";
    if (/foregrip|fore_grip|bipod|launcher|ubgl/.test(s)) return "FRONT_BOTTOM";
    if (/tactical|flashlight|laser|peq/.test(s)) return "FRONT_BOTTOM";
    if (/scope|optic|collimator|reflex|holograph|magnif/.test(s)) return "TOP";
    if (/sight_rear|rear.?sight|sight_front|front.?sight|cover|dust/.test(s)) return "TOP";
    if (/\bsight\b/.test(s) && !/laser/.test(s)) return "TOP";
    if (/mount/.test(s)) return "TOP";
    if (/stock|buffer|butt/.test(s)) return "REAR";
    if (/charge|charging|cock/.test(s)) return "REAR";
    if (/reciever|receiver|frame|upper|lower/.test(s)) return "RECEIVER";
    if (/magazine|mag_/.test(s) || s === "mod_magazine") return "BOTTOM";
    if (/pistol_grip|pistolgrip/.test(s)) return "BOTTOM";
    if (/grip/.test(s)) return "BOTTOM";
    return "OTHER";
  }

  function isOpticSlot(nameId) {
    var s = String(nameId || "").toLowerCase();
    return /scope|optic|collimator|reflex|holograph|magnif|sight/.test(s) && !/laser/.test(s);
  }

  function isOpticItem(it) {
    if (!it) return false;
    var n = (itemName(it) + " " + (it.normalizedName || "") + " " + ((it.properties || {}).propertiesType || "")).toLowerCase();
    return /scope|optic|collimator|reflex|holograph|magnif|sight|рефлекс|коллиматор|оптик|прицел/.test(n);
  }

  function allowedForSlot(filters) {
    if (!filters) return [];
    var allowed = new Set(asArray(filters.allowedItems).map(String));
    var cats = new Set(asArray(filters.allowedCategories).map(String));
    var excluded = new Set(asArray(filters.excludedItems).map(String));
    var list = [];
    mods.forEach(function (m) {
      if (excluded.has(m.id)) return;
      if (allowed.has(m.id)) {
        list.push(m);
        return;
      }
      if (cats.size) {
        var mc = asArray(m.categories).map(function (c) {
          return String(c.id || c);
        });
        if (mc.some(function (id) {
          return cats.has(id);
        }))
          list.push(m);
      }
    });
    if (!list.length && allowed.size) {
      allowed.forEach(function (id) {
        if (byId[id]) list.push(byId[id]);
      });
    }
    return list;
  }

  function collectSlots(map) {
    map = map || installed;
    var result = [];
    if (!baseWeapon) return result;
    var queue = [baseWeapon];
    var seen = new Set();
    while (queue.length) {
      var parent = queue.shift();
      if (!parent || seen.has(parent.id)) continue;
      seen.add(parent.id);
      asArray(parent.properties && parent.properties.slots).forEach(function (s) {
        var nameId = s.nameId || s.name || s.id;
        var key = parent.id + "::" + nameId;
        result.push({
          parentId: parent.id,
          nameId: nameId,
          key: key,
          required: !!s.required,
          filters: s.filters || {},
          region: getRegion(nameId),
          isOptic: isOpticSlot(nameId)
        });
        var childId = map[key];
        if (childId && byId[childId]) queue.push(byId[childId]);
      });
    }
    return result;
  }

  function conflictSet(map) {
    map = map || installed;
    var set = new Set();
    Object.keys(map).forEach(function (k) {
      var it = byId[map[k]];
      if (!it) return;
      asArray(it.conflictingItems).forEach(function (c) {
        set.add(typeof c === "string" ? c : c.id);
      });
      asArray((it.properties || {}).conflictingItems).forEach(function (c) {
        set.add(typeof c === "string" ? c : c.id);
      });
    });
    return set;
  }

  function hasConflict(map, itemId) {
    if (!itemId) return false;
    if (conflictSet(map).has(itemId)) return true;
    var it = byId[itemId];
    if (!it) return false;
    var mine = new Set();
    asArray(it.conflictingItems).forEach(function (c) {
      mine.add(typeof c === "string" ? c : c.id);
    });
    asArray((it.properties || {}).conflictingItems).forEach(function (c) {
      mine.add(typeof c === "string" ? c : c.id);
    });
    return Object.keys(map).some(function (k) {
      return mine.has(map[k]);
    });
  }

  function computeStats(map) {
    map = map || installed;
    if (!baseWeapon) return null;
    var p = baseWeapon.properties || {};
    var ergo = Number(p.ergonomics) || Number(p.defaultErgonomics) || 0;
    var recV = Number(p.recoilVertical) || Number(p.defaultRecoilVertical) || 0;
    var recH = Number(p.recoilHorizontal) || Number(p.defaultRecoilHorizontal) || 0;
    var weight = Number(baseWeapon.weight) || Number(p.weight) || 0;
    var cost = itemPrice(baseWeapon);
    var parts = [{ it: baseWeapon, slot: "base" }];
    var sight = Number(p.sightingRange) || Number(p.effectiveDistance) || 0;
    var hasOptic = false;

    Object.keys(map).forEach(function (key) {
      var it = byId[map[key]];
      if (!it) return;
      parts.push({ it: it, slot: key.split("::")[1] });
      if (isOpticItem(it) || isOpticSlot(key.split("::")[1])) hasOptic = true;
      var mp = it.properties || {};
      if (mp.ergonomics != null) ergo += Number(mp.ergonomics) || 0;
      else if (mp.ergonomicsModifier != null) ergo += Number(mp.ergonomicsModifier) || 0;
      var r = mp.recoil != null ? Number(mp.recoil) : mp.recoilModifier != null ? Number(mp.recoilModifier) : null;
      if (r != null && !isNaN(r)) {
        recV *= 1 + r / 100;
        recH *= 1 + r / 100;
      }
      weight += Number(it.weight) || Number(mp.weight) || 0;
      cost += itemPrice(it);
      var sr = Number(mp.sightingRange) || Number(mp.zoom) || 0;
      if (sr > sight) sight = sr;
    });

    return {
      ergo: Math.round(ergo * 10) / 10,
      recV: Math.round(recV * 10) / 10,
      recH: Math.round(recH * 10) / 10,
      weight: Math.round(weight * 100) / 100,
      cost: Math.round(cost),
      sight: Math.round(sight),
      hasOptic: hasOptic,
      parts: parts
    };
  }

  function scoreBuild(st, goal, budget, forceOptic) {
    if (!st) return -Infinity;
    if (budget > 0 && st.cost > budget) return -Infinity;
    if (forceOptic && !st.hasOptic) return -Infinity;
    var ergo = st.ergo;
    var rec = st.recV + 0.5 * st.recH;
    if (goal === "maxErgo") return ergo - rec * 0.02;
    if (goal === "minRecoil") return -rec + ergo * 0.05;
    if (goal === "budget") return ergo * 2 - rec - st.cost / 50000;
    return ergo * 1.2 - rec * 0.8;
  }

  function removeSlotCascade(key, map) {
    map = map || installed;
    var id = map[key];
    delete map[key];
    if (!id || !byId[id]) return;
    (function walk(item) {
      asArray(item.properties && item.properties.slots).forEach(function (s) {
        var k = item.id + "::" + (s.nameId || s.name || s.id);
        var child = map[k];
        if (child) {
          delete map[k];
          if (byId[child]) walk(byId[child]);
        }
      });
    })(byId[id]);
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("status");
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = msg || "";
  }

  function applyZoom() {
    var inner = document.getElementById("schemaInner");
    var label = document.getElementById("zoomVal");
    if (inner) inner.style.transform = "scale(" + schemaZoom + ")";
    if (label) label.textContent = Math.round(schemaZoom * 100) + "%";
  }

  function setZoom(z) {
    schemaZoom = Math.max(0.45, Math.min(2.2, z));
    applyZoom();
  }

  function placeSlotBox(s, conf) {
    var child = installed[s.key] ? byId[installed[s.key]] : null;
    var bad = child && conf.has(child.id);
    var box = document.createElement("div");
    box.className =
      "slot-box" +
      (child ? " has" : " empty") +
      (s.required ? " req" : "") +
      (bad ? " conflict" : "") +
      (s.isOptic && !child ? " optic-forced" : "");
    var label = slotLabel(s.nameId);
    if (child) {
      box.innerHTML =
        '<div class="slot-label">' +
        esc(label) +
        "</div>" +
        (child.iconLink || child.gridImageLink
          ? '<img src="' + esc(child.iconLink || child.gridImageLink) + '" alt="">'
          : "") +
        '<div class="mod-name">' +
        esc(itemName(child)) +
        "</div>";
    } else {
      box.innerHTML =
        '<div class="slot-label">' +
        esc(label) +
        (s.required ? " *" : "") +
        (s.isOptic ? " ◎" : "") +
        '</div><div class="meta">пусто</div>';
    }
    box.onclick = function () {
      openSlot(s);
    };
    return box;
  }

  var REGION_TITLE = {
    FRONT: "Дуло / ствол",
    FRONT_BOTTOM: "Цевьё / обвес",
    RECEIVER: "Ресивер",
    TOP: "Прицелы",
    BOTTOM: "Магазин / рукоять",
    REAR: "Приклад / взведение",
    OTHER: "Прочее"
  };

  function renderSchematic() {
    var root = document.getElementById("schematic");
    if (!root) return;
    root.innerHTML = "";
    if (!baseWeapon) return;

    var slots = collectSlots();
    var conf = conflictSet();
    var byRegion = {
      FRONT: [],
      FRONT_BOTTOM: [],
      RECEIVER: [],
      TOP: [],
      BOTTOM: [],
      REAR: [],
      OTHER: []
    };
    slots.forEach(function (s) {
      var r = s.region || "OTHER";
      if (!byRegion[r]) byRegion[r] = [];
      byRegion[r].push(s);
    });
    Object.keys(byRegion).forEach(function (r) {
      byRegion[r].sort(function (a, b) {
        return fillPriority(a.nameId) - fillPriority(b.nameId);
      });
    });

    function makeRegion(key, slotsArr, nested) {
      if (!slotsArr.length && key !== "RECEIVER") return null;
      var reg = document.createElement("div");
      reg.className = "region";
      reg.innerHTML = '<div class="region-label">' + esc(REGION_TITLE[key] || key) + "</div>";
      var body = document.createElement("div");
      body.className = nested ? "nested" : "region-col";
      slotsArr.forEach(function (s) {
        body.appendChild(placeSlotBox(s, conf));
      });
      reg.appendChild(body);
      return reg;
    }

    var front = makeRegion("FRONT", byRegion.FRONT, false);
    if (front) root.appendChild(front);

    var fb = makeRegion("FRONT_BOTTOM", byRegion.FRONT_BOTTOM, true);
    if (fb) root.appendChild(fb);

    var mid = document.createElement("div");
    mid.className = "region-col";
    mid.style.gap = "8px";

    var top = makeRegion("TOP", byRegion.TOP, true);
    if (top) mid.appendChild(top);

    var coreWrap = document.createElement("div");
    coreWrap.className = "region";
    coreWrap.innerHTML = '<div class="region-label">Оружие</div>';
    var core = document.createElement("div");
    core.className = "slot-box core has";
    core.innerHTML =
      '<div class="slot-label">база</div>' +
      (baseWeapon.iconLink || baseWeapon.gridImageLink
        ? '<img src="' + esc(baseWeapon.iconLink || baseWeapon.gridImageLink) + '" alt="">'
        : "") +
      '<div class="mod-name">' +
      esc(itemName(baseWeapon)) +
      "</div>";
    coreWrap.appendChild(core);
    var recv = byRegion.RECEIVER;
    if (recv.length) {
      var nest = document.createElement("div");
      nest.className = "nested";
      nest.style.marginTop = "8px";
      recv.forEach(function (s) {
        nest.appendChild(placeSlotBox(s, conf));
      });
      coreWrap.appendChild(nest);
    }
    mid.appendChild(coreWrap);

    var bottom = makeRegion("BOTTOM", byRegion.BOTTOM, true);
    if (bottom) mid.appendChild(bottom);

    root.appendChild(mid);

    var rear = makeRegion("REAR", byRegion.REAR, false);
    if (rear) root.appendChild(rear);

    var other = makeRegion("OTHER", byRegion.OTHER, true);
    if (other) root.appendChild(other);
  }

  function renderStats() {
    var st = computeStats();
    var el = document.getElementById("stats");
    if (!st) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML =
      '<div class="stat"><div class="v">' +
      st.ergo +
      '</div><div class="l">Ergonomics</div></div>' +
      '<div class="stat"><div class="v">' +
      st.recV +
      '</div><div class="l">V. Recoil</div></div>' +
      '<div class="stat"><div class="v">' +
      st.recH +
      '</div><div class="l">H. Recoil</div></div>' +
      '<div class="stat"><div class="v">' +
      st.weight +
      ' кг</div><div class="l">Вес</div></div>' +
      '<div class="stat"><div class="v">' +
      fmt(st.cost) +
      ' ₽</div><div class="l">Цена</div></div>' +
      '<div class="stat"><div class="v">' +
      (st.sight || "—") +
      '</div><div class="l">Дальность</div></div>' +
      '<div class="stat"><div class="v">' +
      (st.hasOptic ? "да" : "нет") +
      '</div><div class="l">Прицел</div></div>';
  }

  function renderSlots() {
    var box = document.getElementById("slotList");
    var slots = collectSlots();
    var conf = conflictSet();
    if (!slots.length) {
      box.innerHTML = '<p class="muted">Нет слотов</p>';
      return;
    }
    slots.sort(function (a, b) {
      var ra = REGION_ORDER.indexOf(a.region);
      var rb = REGION_ORDER.indexOf(b.region);
      if (ra !== rb) return ra - rb;
      return fillPriority(a.nameId) - fillPriority(b.nameId);
    });
    box.innerHTML = slots
      .map(function (s) {
        var mod = s.key in installed ? byId[installed[s.key]] : null;
        var bad = mod && conf.has(mod.id);
        return (
          '<div class="slot' +
          (s.required ? " req" : "") +
          (bad ? " conflict" : "") +
          '" data-key="' +
          esc(s.key) +
          '"><div><div class="slot-name">' +
          esc(slotLabel(s.nameId)) +
          (s.isOptic ? " ◎" : "") +
          '</div><div class="slot-meta">' +
          esc(REGION_TITLE[s.region] || s.region) +
          " · " +
          (mod ? esc(itemName(mod)) + " · " + fmt(itemPrice(mod)) + " ₽" : "пусто") +
          (bad ? " · конфликт" : "") +
          '</div></div><div class="slot-actions">' +
          '<button type="button" class="btn-sm accent" data-a="pick">Выбрать</button>' +
          (mod ? '<button type="button" class="btn-sm" data-a="clr">Снять</button>' : "") +
          "</div></div>"
        );
      })
      .join("");

    box.querySelectorAll(".slot").forEach(function (row) {
      var key = row.getAttribute("data-key");
      var slot = slots.find(function (x) {
        return x.key === key;
      });
      row.querySelectorAll("button").forEach(function (b) {
        b.onclick = function () {
          if (b.getAttribute("data-a") === "clr") {
            removeSlotCascade(key);
            paint();
          }
          if (b.getAttribute("data-a") === "pick" && slot) openSlot(slot);
        };
      });
    });
  }

  function openSlot(s) {
    document.getElementById("modalTitle").textContent =
      slotLabel(s.nameId) + (s.required ? " (обяз.)" : "") + (s.isOptic ? " · прицел" : "");
    document.getElementById("modal").classList.add("show");
    var filterInp = document.getElementById("modalFilter");
    filterInp.value = "";
    function draw() {
      var q = (filterInp.value || "").toLowerCase().trim();
      var list = allowedForSlot(s.filters).slice();
      var conf = conflictSet();
      list.sort(function (a, b) {
        var oa = isOpticItem(a) ? 1 : 0;
        var ob = isOpticItem(b) ? 1 : 0;
        if (s.isOptic && oa !== ob) return ob - oa;
        return (Number((b.properties || {}).ergonomics) || 0) - (Number((a.properties || {}).ergonomics) || 0);
      });
      if (q) {
        list = list.filter(function (m) {
          return (
            (itemName(m) + " " + (m.shortName || "") + " " + (m.normalizedName || ""))
              .toLowerCase()
              .indexOf(q) >= 0
          );
        });
      }
      var box = document.getElementById("modalList");
      if (!list.length) {
        box.innerHTML = '<p class="muted">Нет совместимых модов</p>';
        return;
      }
      box.innerHTML = list
        .slice(0, 80)
        .map(function (m) {
          var mp = m.properties || {};
          var ergo = mp.ergonomics != null ? Number(mp.ergonomics) : null;
          var rec = mp.recoil != null ? Number(mp.recoil) : null;
          var bad = conf.has(m.id) || hasConflict(installed, m.id);
          return (
            '<div class="mod-pick" data-id="' +
            esc(m.id) +
            '">' +
            (m.iconLink
              ? '<img class="ico" src="' + esc(m.iconLink) + '" alt="">'
              : '<div class="ico"></div>') +
            "<div><div><b>" +
            esc(itemName(m)) +
            "</b>" +
            (bad ? ' <span class="muted">конфликт</span>' : "") +
            '</div><div class="muted">' +
            fmt(itemPrice(m)) +
            " ₽" +
            (ergo != null ? " · ergo " + ergo : "") +
            (rec != null ? " · rec " + rec + "%" : "") +
            "</div></div></div>"
          );
        })
        .join("");
      box.querySelectorAll(".mod-pick").forEach(function (row) {
        row.onclick = function () {
          var id = row.getAttribute("data-id");
          if (installed[s.key]) removeSlotCascade(s.key);
          installed[s.key] = id;
          document.getElementById("modal").classList.remove("show");
          paint();
        };
      });
    }
    filterInp.oninput = draw;
    draw();
  }

  function paint() {
    renderSchematic();
    renderStats();
    renderSlots();
  }

  function candidateRank(m, goal, preferOptic) {
    var mp = m.properties || {};
    var ergo = Number(mp.ergonomics) || 0;
    var rec = Number(mp.recoil != null ? mp.recoil : mp.recoilModifier) || 0;
    var bonus = preferOptic && isOpticItem(m) ? 50 : 0;
    if (goal === "maxErgo") return ergo * 3 + bonus;
    if (goal === "minRecoil") return -rec * 3 + ergo * 0.3 + bonus;
    if (goal === "budget") return ergo - rec * 0.5 - itemPrice(m) / 20000 + bonus;
    return ergo * 1.5 - rec * 1.2 + bonus;
  }

  function greedyFill(goal, budget, onlyBuyable, forceOptic) {
    var map = {};
    var guard = 0;
    while (guard++ < 28) {
      var empty = collectSlots(map).filter(function (s) {
        return !map[s.key];
      });
      if (!empty.length) break;
      empty.sort(function (a, b) {
        if (forceOptic) {
          if (a.isOptic !== b.isOptic) return a.isOptic ? -1 : 1;
        }
        return fillPriority(a.nameId) - fillPriority(b.nameId);
      });
      var s = empty[0];
      var cands = allowedForSlot(s.filters).filter(function (m) {
        if (onlyBuyable && !isBuyable(m)) return false;
        if (hasConflict(map, m.id)) return false;
        if (budget > 0) {
          var trial = Object.assign({}, map);
          trial[s.key] = m.id;
          if (computeStats(trial).cost > budget) return false;
        }
        return true;
      });
      if (forceOptic && s.isOptic) {
        var optics = cands.filter(isOpticItem);
        if (optics.length) cands = optics;
      }
      if (!cands.length) {
        if (!s.required) {
          empty.shift();
          if (!empty.length) break;
          continue;
        }
        break;
      }
      cands.sort(function (a, b) {
        return candidateRank(b, goal, forceOptic && s.isOptic) - candidateRank(a, goal, forceOptic && s.isOptic);
      });
      map[s.key] = cands[0].id;
    }
    return map;
  }

  function scanBuilds(goal, budget, onlyBuyable, forceOptic) {
    var results = [];
    var seen = new Set();
    function keyOf(map) {
      return Object.keys(map)
        .sort()
        .map(function (k) {
          return k + "=" + map[k];
        })
        .join("|");
    }
    function pushMap(map) {
      var k = keyOf(map);
      if (seen.has(k)) return;
      seen.add(k);
      var st = computeStats(map);
      var sc = scoreBuild(st, goal, budget, forceOptic);
      if (sc === -Infinity) return;
      results.push({ map: map, stats: st, score: sc });
    }
    pushMap(greedyFill(goal, budget, onlyBuyable, forceOptic));
    var base = greedyFill(goal, budget, onlyBuyable, forceOptic);
    var slots = collectSlots(base).filter(function (s) {
      return base[s.key];
    });
    slots.sort(function (a, b) {
      return fillPriority(a.nameId) - fillPriority(b.nameId);
    });
    slots.slice(0, 8).forEach(function (s) {
      var cands = allowedForSlot(s.filters).filter(function (m) {
        return !(onlyBuyable && !isBuyable(m));
      });
      if (forceOptic && s.isOptic) {
        var optics = cands.filter(isOpticItem);
        if (optics.length) cands = optics;
      }
      cands.sort(function (a, b) {
        return candidateRank(b, goal, forceOptic && s.isOptic) - candidateRank(a, goal, forceOptic && s.isOptic);
      });
      cands.slice(0, 4).forEach(function (m) {
        var map = {};
        map[s.key] = m.id;
        Object.keys(base).forEach(function (k) {
          if (k !== s.key && !hasConflict(map, base[k])) map[k] = base[k];
        });
        var guard = 0;
        while (guard++ < 20) {
          var empty = collectSlots(map).filter(function (x) {
            return !map[x.key];
          });
          if (!empty.length) break;
          empty.sort(function (a, b) {
            if (forceOptic && a.isOptic !== b.isOptic) return a.isOptic ? -1 : 1;
            return fillPriority(a.nameId) - fillPriority(b.nameId);
          });
          var slot = empty[0];
          var opts = allowedForSlot(slot.filters).filter(function (mm) {
            if (onlyBuyable && !isBuyable(mm)) return false;
            if (hasConflict(map, mm.id)) return false;
            if (budget > 0) {
              var t = Object.assign({}, map);
              t[slot.key] = mm.id;
              if (computeStats(t).cost > budget) return false;
            }
            return true;
          });
          if (forceOptic && slot.isOptic) {
            var o2 = opts.filter(isOpticItem);
            if (o2.length) opts = o2;
          }
          if (!opts.length) break;
          opts.sort(function (a, b) {
            return (
              candidateRank(b, goal, forceOptic && slot.isOptic) -
              candidateRank(a, goal, forceOptic && slot.isOptic)
            );
          });
          map[slot.key] = opts[0].id;
        }
        pushMap(map);
      });
    });
    results.sort(function (a, b) {
      return b.score - a.score;
    });
    return results.slice(0, 24);
  }

  function renderChart(builds) {
    var svg = document.getElementById("abChart");
    if (!builds.length) {
      svg.innerHTML = "";
      return;
    }
    var xs = builds.map(function (b) {
      return b.stats.ergo;
    });
    var ys = builds.map(function (b) {
      return b.stats.recV;
    });
    var minX = Math.min.apply(null, xs),
      maxX = Math.max.apply(null, xs),
      minY = Math.min.apply(null, ys),
      maxY = Math.max.apply(null, ys);
    if (maxX === minX) maxX = minX + 1;
    if (maxY === minY) maxY = minY + 1;
    var pad = 16,
      w = 400,
      h = 180;
    function px(x) {
      return pad + ((x - minX) / (maxX - minX)) * (w - pad * 2);
    }
    function py(y) {
      return pad + ((y - minY) / (maxY - minY)) * (h - pad * 2);
    }
    svg.innerHTML =
      '<text x="8" y="14" fill="#888" font-size="10">ergo →</text><text x="8" y="170" fill="#888" font-size="10">recoil ↓</text>' +
      builds
        .map(function (b, i) {
          return (
            '<circle cx="' +
            px(b.stats.ergo).toFixed(1) +
            '" cy="' +
            py(b.stats.recV).toFixed(1) +
            '" r="' +
            (i === 0 ? 5 : 3.5) +
            '" fill="' +
            (i === 0 ? "var(--accent,#c9a227)" : "#7ec8ff") +
            '" opacity=".9"/>'
          );
        })
        .join("");
  }

  function renderAbResults(builds) {
    abBuilds = builds;
    var box = document.getElementById("abResults");
    if (!builds.length) {
      box.innerHTML = '<p class="muted">Нет сборок</p>';
      renderChart([]);
      return;
    }
    box.innerHTML = builds
      .map(function (b, i) {
        return (
          '<div class="ab-card' +
          (i === 0 ? " on" : "") +
          '" data-i="' +
          i +
          '"><div class="t">#' +
          (i + 1) +
          " · ergo " +
          b.stats.ergo +
          " · V.rec " +
          b.stats.recV +
          " · " +
          fmt(b.stats.cost) +
          ' ₽</div><div class="m">' +
          Object.keys(b.map).length +
          " модов · вес " +
          b.stats.weight +
          " кг · прицел: " +
          (b.stats.hasOptic ? "да" : "нет") +
          "</div></div>"
        );
      })
      .join("");
    box.querySelectorAll(".ab-card").forEach(function (card) {
      card.onclick = function () {
        var i = Number(card.getAttribute("data-i"));
        var b = abBuilds[i];
        if (!b) return;
        installed = Object.assign({}, b.map);
        paint();
        box.querySelectorAll(".ab-card").forEach(function (c) {
          c.classList.toggle("on", c === card);
        });
        document.getElementById("abStatus").textContent = "Применена сборка #" + (i + 1);
      };
    });
    renderChart(builds);
  }

  function runAutoBuild() {
    if (!baseWeapon) return;
    var budget = Math.max(0, Number(document.getElementById("abBudget").value) || 0);
    var onlyBuyable = document.getElementById("abBuyable").value === "1";
    var forceOptic = document.getElementById("abForceOptic").checked;
    document.getElementById("abStatus").textContent = "Сканирование…";
    setTimeout(function () {
      try {
        var builds = scanBuilds(abGoal, budget, onlyBuyable, forceOptic);
        renderAbResults(builds);
        document.getElementById("abStatus").textContent = builds.length
          ? "Найдено: " + builds.length + ". Кликни, чтобы применить."
          : "Пусто — ослабь бюджет или сними «обязательный прицел».";
      } catch (e) {
        document.getElementById("abStatus").textContent = e.message || String(e);
      }
    }, 30);
  }

  function bindZoom() {
    document.getElementById("zoomIn").onclick = function () {
      setZoom(schemaZoom + 0.15);
    };
    document.getElementById("zoomOut").onclick = function () {
      setZoom(schemaZoom - 0.15);
    };
    document.getElementById("zoomReset").onclick = function () {
      setZoom(1);
      var vp = document.getElementById("schemaViewport");
      if (vp) {
        vp.scrollLeft = 0;
        vp.scrollTop = 0;
      }
    };
    var vp = document.getElementById("schemaViewport");
    if (!vp) return;
    vp.addEventListener(
      "wheel",
      function (e) {
        if (!baseWeapon) return;
        e.preventDefault();
        var delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom(schemaZoom + delta);
      },
      { passive: false }
    );
    vp.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      dragState = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
      vp.classList.add("dragging");
    });
    window.addEventListener("mousemove", function (e) {
      if (!dragState) return;
      vp.scrollLeft = dragState.sl - (e.clientX - dragState.x);
      vp.scrollTop = dragState.st - (e.clientY - dragState.y);
    });
    window.addEventListener("mouseup", function () {
      dragState = null;
      vp.classList.remove("dragging");
    });
  }

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Loading…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Items…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var items = asArray(await TarkovAPI.items(mode));
      byId = {};
      weapons = [];
      mods = [];
      items.forEach(function (it) {
        if (!it || !it.id) return;
        byId[it.id] = it;
        if (isWeapon(it)) weapons.push(it);
        if (isMod(it)) mods.push(it);
      });
      setStatus("Оружие: " + weapons.length + " · моды: " + mods.length, true);
      document.getElementById("pickCard").style.display = "block";
      if (P) P.done();
    } catch (e) {
      setStatus(e.message || String(e), false);
      if (P) P.fail(e.message);
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById("weaponQ").addEventListener("input", function () {
    var q = this.value.toLowerCase().trim();
    var box = document.getElementById("weaponSuggest");
    if (!q || q.length < 2) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    var hits = weapons
      .filter(function (w) {
        return (
          (itemName(w) + " " + (w.shortName || "") + " " + (w.normalizedName || ""))
            .toLowerCase()
            .indexOf(q) >= 0
        );
      })
      .slice(0, 15);
    if (!hits.length) {
      box.style.display = "none";
      return;
    }
    box.innerHTML = hits
      .map(function (w) {
        return (
          '<button type="button" data-id="' +
          esc(w.id) +
          '"><b>' +
          esc(itemName(w)) +
          '</b> <span class="muted">' +
          esc(w.shortName || "") +
          "</span></button>"
        );
      })
      .join("");
    box.style.display = "block";
    box.querySelectorAll("button").forEach(function (btn) {
      btn.onclick = function () {
        baseWeapon = byId[btn.getAttribute("data-id")];
        installed = {};
        document.getElementById("weaponQ").value = itemName(baseWeapon);
        box.style.display = "none";
        document.getElementById("buildCard").style.display = "block";
        document.getElementById("mainLayout").style.display = "grid";
        setZoom(1);
        paint();
        document.getElementById("abResults").innerHTML = "";
        document.getElementById("abChart").innerHTML = "";
      };
    });
  });

  document.getElementById("clearBuild").onclick = function () {
    installed = {};
    paint();
  };
  document.getElementById("copyBuild").onclick = function () {
    var st = computeStats();
    if (!st) return;
    var lines = st.parts.map(function (p) {
      return (p.slot === "base" ? "WEAPON" : p.slot) + ": " + itemName(p.it);
    });
    lines.push(
      "— ergo " + st.ergo + " | V " + st.recV + " | H " + st.recH + " | " + fmt(st.cost) + " ₽ | optic " + (st.hasOptic ? "yes" : "no")
    );
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join("\n"));
      setStatus("Скопировано", true);
    }
  };
  document.getElementById("abGoal").onclick = function (ev) {
    var t = ev.target;
    if (!t.getAttribute || !t.getAttribute("data-g")) return;
    abGoal = t.getAttribute("data-g");
    document.querySelectorAll("#abGoal .chip").forEach(function (c) {
      c.classList.toggle("on", c.getAttribute("data-g") === abGoal);
    });
  };
  document.getElementById("abScan").onclick = runAutoBuild;
  document.getElementById("modalClose").onclick = function () {
    document.getElementById("modal").classList.remove("show");
  };
  document.getElementById("modal").onclick = function (e) {
    if (e.target.id === "modal") e.target.classList.remove("show");
  };

  bindZoom();
})();
