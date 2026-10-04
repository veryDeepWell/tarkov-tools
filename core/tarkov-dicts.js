/*! TarkovDicts — single source of truth for traders, calibers, armor zones and basic formatters */
(function (global) {
  "use strict";
  if (global.TarkovDicts) return;

  var TRADERS = [
    { id: "54cb50c76803fa8b248b4571", key: "prapor", name: "Prapor", ru: "Прапор", cultistMult: 0.50 },
    { id: "54cb57776803fa99248b456e", key: "therapist", name: "Therapist", ru: "Терапевт", cultistMult: 0.63 },
    { id: "579dc571d53a0658a154fbec", key: "fence", name: "Fence", ru: "Скупщик", cultistMult: 0.40 },
    { id: "58330581ace78e27b8b10cee", key: "skier", name: "Skier", ru: "Лыжник", cultistMult: 0.49 },
    { id: "5935c25fb3acc3127c3d8cd9", key: "peacekeeper", name: "Peacekeeper", ru: "Миротворец", cultistMult: 0.45 },
    { id: "5a7c2eca46aef81a7ca2145d", key: "mechanic", name: "Mechanic", ru: "Механик", cultistMult: 0.56 },
    { id: "5ac3b934156ae10c4430e83c", key: "ragman", name: "Ragman", ru: "Барахольщик", cultistMult: 0.62 },
    { id: "5c0647fdd443bc2504c2d371", key: "jaeger", name: "Jaeger", ru: "Егерь", cultistMult: 0.60 },
    { id: "6617beeaa9cfa777ca915b7c", key: "ref", name: "Ref", ru: "Реф", cultistMult: 0.60 },
    { id: "638b0f368010941e6201b109", key: "lightkeeper", name: "Lightkeeper", ru: "Смотритель", cultistMult: 0.50 },
    { id: "65649eb400d4d9189309ec99", key: "btr", name: "BTR Driver", ru: "БТР", cultistMult: 0.50 }
  ];

  var TRADER_BY_ID = Object.create(null);
  var TRADER_BY_KEY = Object.create(null);

  TRADERS.forEach(function (t) {
    TRADER_BY_ID[t.id] = t;
    TRADER_BY_KEY[t.key] = t;
  });

  var CALIBERS = {
    Caliber9x18PM: { key: "Caliber9x18PM", label: "9×18 ПМ", en: "9x18 PM" },
    Caliber9x19PARA: { key: "Caliber9x19PARA", label: "9×19", en: "9x19" },
    Caliber9x21: { key: "Caliber9x21", label: "9×21", en: "9x21" },
    Caliber9x33R: { key: "Caliber9x33R", label: ".357 Mag", en: ".357 Mag" },
    Caliber9x39: { key: "Caliber9x39", label: "9×39", en: "9x39" },
    Caliber1143x23ACP: { key: "Caliber1143x23ACP", label: ".45 ACP", en: ".45 ACP" },
    Caliber46x30: { key: "Caliber46x30", label: "4.6×30", en: "4.6x30" },
    Caliber57x28: { key: "Caliber57x28", label: "5.7×28", en: "5.7x28" },
    Caliber545x39: { key: "Caliber545x39", label: "5.45×39", en: "5.45x39" },
    Caliber556x45NATO: { key: "Caliber556x45NATO", label: "5.56×45", en: "5.56x45 NATO" },
    Caliber762x25TT: { key: "Caliber762x25TT", label: "7.62×25 ТТ", en: "7.62x25 TT" },
    Caliber762x35: { key: "Caliber762x35", label: ".300 BLK", en: ".300 BLK" },
    Caliber762x39: { key: "Caliber762x39", label: "7.62×39", en: "7.62x39" },
    Caliber762x51: { key: "Caliber762x51", label: "7.62×51", en: "7.62x51" },
    Caliber762x54R: { key: "Caliber762x54R", label: "7.62×54R", en: "7.62x54R" },
    Caliber366TKM: { key: "Caliber366TKM", label: ".366 ТКМ", en: ".366 TKM" },
    Caliber127x33: { key: "Caliber127x33", label: ".50 AE", en: ".50 AE" },
    Caliber127x55: { key: "Caliber127x55", label: "12.7×55", en: "12.7x55" },
    Caliber127x99: { key: "Caliber127x99", label: ".50 BMG", en: ".50 BMG" },
    Caliber12g: { key: "Caliber12g", label: "12/70", en: "12/70" },
    Caliber20g: { key: "Caliber20g", label: "20/70", en: "20/70" },
    Caliber23x75: { key: "Caliber23x75", label: "23×75", en: "23x75" },
    Caliber26x75: { key: "Caliber26x75", label: "26×75", en: "26x75" },
    Caliber40x46: { key: "Caliber40x46", label: "40×46", en: "40x46" },
    Caliber40mmRU: { key: "Caliber40mmRU", label: "40 мм", en: "40mm RU" },
    Caliber86x70: { key: "Caliber86x70", label: ".338 LM", en: ".338 LM" },
    Caliber20x1mm: { key: "Caliber20x1mm", label: "20×1 мм", en: "20x1 mm" }
  };

  var ARMOR_KINDS = {
    armor: { ru: "Броник", en: "Body armor" },
    rig: { ru: "Разгруз / carrier", en: "Armored rig" },
    helmet: { ru: "Шлем", en: "Helmet" },
    plate: { ru: "Плита", en: "Plate" },
    glasses: { ru: "Очки", en: "Glasses" },
    other: { ru: "Другое", en: "Other" }
  };

  function currentLang() {
    try {
      if (global.TarkovI18n && TarkovI18n.lang) return TarkovI18n.lang();
    } catch (e) {}
    try {
      if (global.TarkovTools && TarkovTools.lang) return TarkovTools.lang();
    } catch (e) {}
    return "ru";
  }

  function trader(idOrKey) {
    if (!idOrKey) return null;
    var s = String(idOrKey).trim();
    return TRADER_BY_ID[s] || TRADER_BY_KEY[s.toLowerCase()] || null;
  }

  function traderName(idOrKey, lang) {
    var t = trader(idOrKey);
    if (!t) return String(idOrKey || "");
    var l = lang || currentLang();
    return (l === "en" ? t.name : t.ru) || t.name;
  }

  function traderCultistMult(idOrKey) {
    var t = trader(idOrKey);
    return t && t.cultistMult != null ? t.cultistMult : 0.50;
  }

  function caliberLabel(calKey, lang) {
    if (!calKey) return "";
    var c = CALIBERS[calKey];
    if (c) {
      var l = lang || currentLang();
      return l === "en" ? (c.en || c.label) : c.label;
    }
    return String(calKey).replace(/^Caliber/, "");
  }

  function armorKindLabel(kindKey, lang) {
    var k = ARMOR_KINDS[kindKey];
    if (k) {
      var l = lang || currentLang();
      return l === "en" ? k.en : k.ru;
    }
    return String(kindKey || "");
  }

  function simplifyZones(zones) {
    var tags = [];
    (zones || []).forEach(function (z) {
      var s = String(z);
      var tag = "";
      if (/Head|Parietal|Nape|Ear|Jaw|Face|Eyes|Top of the Head|Collider Type Head/i.test(s)) tag = "голова";
      else if (/Neck/i.test(s)) tag = "шея";
      else if (/chest|Thorax|RibcageUp|SpineTop|Plate_.*chest/i.test(s)) tag = "грудь";
      else if (/back|SpineDown|Plate_.*back/i.test(s)) tag = "спина";
      else if (/Side|LeftSide|RightSide|side_left|side_right/i.test(s)) tag = "бока";
      else if (/Arm|Shoulder/i.test(s)) tag = "руки";
      else if (/Pelvis|Groin|Stomach|RibcageLow/i.test(s)) tag = "живот/таз";
      else if (/Leg|Thigh/i.test(s)) tag = "ноги";

      if (tag && tags.indexOf(tag) < 0) tags.push(tag);
    });
    return tags;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function humanize(slug) {
    if (!slug) return "?";
    return String(slug)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }

  function fmtNum(n, digits) {
    var x = Number(n);
    if (!isFinite(x)) return "—";
    if (digits != null) {
      return x.toLocaleString("ru-RU", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
    }
    return Math.round(x).toLocaleString("ru-RU");
  }

  function fmtRub(n) {
    return fmtNum(n) + " \u20bd";
  }

  function syncGameMode(onChange) {
    var KEY = "tarkovPreferredGameMode";
    var current = "pve";
    try {
      if (global.TarkovStorage && TarkovStorage.get) {
        current = TarkovStorage.get(KEY, "pve") || "pve";
      }
    } catch (e) {}

    var selects = document.querySelectorAll('select#gameMode, select[id*="gameMode"], select[id*="GameMode"]');
    selects.forEach(function (sel) {
      var options = Array.prototype.slice.call(sel.options);
      if (options.some(function (o) { return o.value === current; })) {
        sel.value = current;
      }
      if (sel.ttGameModeBound) return;   // idempotent: shell may sync more than once
      sel.ttGameModeBound = true;
      sel.addEventListener("change", function () {
        var val = sel.value;
        try {
          if (global.TarkovStorage && TarkovStorage.set) {
            TarkovStorage.set(KEY, val);
          }
        } catch (e2) {}
        selects.forEach(function (other) {
          if (other !== sel && other.value !== val) other.value = val;
        });
        if (typeof onChange === "function") onChange(val);
      });
    });
    return current;
  }

  global.TarkovDicts = {
    traders: TRADERS.slice(),
    trader: trader,
    traderName: traderName,
    traderCultistMult: traderCultistMult,
    calibers: CALIBERS,
    caliberLabel: caliberLabel,
    armorKinds: ARMOR_KINDS,
    armorKindLabel: armorKindLabel,
    simplifyZones: simplifyZones,
    esc: esc,
    humanize: humanize,
    fmtNum: fmtNum,
    fmtRub: fmtRub,
    syncGameMode: syncGameMode
  };

  if (global.TarkovTools) {
    global.TarkovTools.Dicts = global.TarkovDicts;
  }
})(typeof window !== "undefined" ? window : globalThis);
