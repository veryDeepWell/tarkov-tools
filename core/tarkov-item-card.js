/*! TarkovItemCard — R3.1a view helpers for item card sections */
(function (global) {
  "use strict";
  if (global.TarkovItemCard && global.TarkovItemCard.__v >= 1) return;

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function pushStat(arr, label, value, suffix) {
    if (value == null || value === "" || value === false) return;
    if (typeof value === "number" && !isFinite(value)) return;
    arr.push({ label: label, value: value, suffix: suffix || "" });
  }

  /** Key stats from item.properties — no full dump */
  function stats(item) {
    var out = [];
    if (!item) return out;
    var p = item.properties || {};
    var type = p.propertiesType || "";

    pushStat(out, "Weight", num(item.weight != null ? item.weight : p.weight), " kg");
    if (item.width != null && item.height != null) {
      pushStat(out, "Size", item.width + "×" + item.height, "");
    }
    pushStat(out, "Slots", num(p.capacity != null ? p.capacity : p.grid?.slots), "");

    if (type === "ItemPropertiesAmmo" || (item.types || []).indexOf("ammo") >= 0) {
      pushStat(out, "Caliber", p.caliber, "");
      pushStat(out, "Pen", num(p.penetrationPower), "");
      pushStat(out, "Damage", num(p.damage), "");
      pushStat(out, "Armor dmg", num(p.armorDamage), "%");
      pushStat(out, "Frag", num(p.fragmentationChance) != null ? Math.round(p.fragmentationChance * 100) : null, "%");
      pushStat(out, "Velocity", num(p.initialSpeed), " m/s");
    } else if (/Armor|ChestRig|Helmet/i.test(type) || (item.types || []).some(function (t) {
      return /armor|helmet|rig/i.test(t);
    })) {
      pushStat(out, "Class", num(p.class || p.armorClass), "");
      pushStat(out, "Durability", num(p.durability), "");
      pushStat(out, "Material", p.material && (p.material.name || p.material), "");
      pushStat(out, "Zones", Array.isArray(p.zones) ? p.zones.join(", ") : p.zones, "");
      pushStat(out, "Ergo", num(p.ergonomics || p.ergoPenalty), "");
      pushStat(out, "Turn/Move", [num(p.turnPenalty), num(p.speedPenalty)].filter(function (x) { return x != null; }).join(" / "), "");
    } else if (/Weapon/i.test(type) || (item.types || []).indexOf("gun") >= 0) {
      pushStat(out, "Caliber", p.caliber, "");
      pushStat(out, "Ergo", num(p.ergonomics), "");
      pushStat(out, "Recoil V/H", [num(p.recoilVertical), num(p.recoilHorizontal)].filter(function (x) { return x != null; }).join(" / "), "");
      pushStat(out, "Fire rate", num(p.fireRate), " rpm");
      pushStat(out, "Effective dist", num(p.effectiveDistance || p.ergonomics), "");
    } else if (/Magazine/i.test(type)) {
      pushStat(out, "Capacity", num(p.capacity), "");
      pushStat(out, "Ergo", num(p.ergonomics), "");
      pushStat(out, "Load/Unload", [num(p.loadModifier), num(p.ammoCheckModifier)].filter(function (x) { return x != null; }).join(" / "), "");
    } else if (/Meds|Stim/i.test(type) || (item.types || []).some(function (t) { return /med|stim/i.test(t); })) {
      pushStat(out, "Use time", num(p.useTime), " s");
      pushStat(out, "HP", num(p.hitpoints || p.hp), "");
      if (Array.isArray(p.stimulatorBuffs)) {
        pushStat(out, "Buffs", p.stimulatorBuffs.length, " effects");
      }
    } else if (/Key/i.test(type)) {
      pushStat(out, "Uses", num(p.uses), "");
    } else {
      // generic leftover numbers
      ["ergo", "capacity", "durability", "accuracy"].forEach(function (k) {
        if (p[k] != null) pushStat(out, k, num(p[k]) != null ? num(p[k]) : p[k], "");
      });
    }
    return out;
  }

  function prices(item) {
    var domain = global.TarkovItemDomain;
    var result = {
      flea: null,
      fleaTax: null,
      bestBuy: null,
      avg24h: item && item.avg24hPrice != null ? Number(item.avg24hPrice) : null,
      lastLow: item && item.lastLowPrice != null ? Number(item.lastLowPrice) : null
    };
    if (!item || !domain) return result;
    try {
      if (domain.fleaPrice) result.flea = domain.fleaPrice(item);
      if (domain.bestBuy) result.bestBuy = domain.bestBuy(item);
      if (domain.fleaTax && result.flea) {
        result.fleaTax = domain.fleaTax(item.basePrice || item.avg24hPrice, result.flea);
      }
    } catch (e) {}
    return result;
  }

  function wikiUrl(item) {
    if (!item) return "";
    if (item.wikiLink) return item.wikiLink;
    var slug = item.normalizedName || item.name;
    if (!slug) return "";
    return "https://escapefromtarkov.fandom.com/wiki/" + encodeURIComponent(String(slug).replace(/ /g, "_"));
  }

  global.TarkovItemCard = {
    __v: 1,
    stats: stats,
    prices: prices,
    wikiUrl: wikiUrl
  };
})(typeof window !== "undefined" ? window : globalThis);
