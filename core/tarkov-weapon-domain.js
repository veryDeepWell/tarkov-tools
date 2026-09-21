/*! TarkovWeaponDomain - pure weapon/mod compatibility projections */
(function (global) {
  "use strict";
  if (global.TarkovWeaponDomain) return;

  var CATEGORIES = [
    "mod_pistol_grip", "mod_stock", "mod_barrel", "mod_handguard", "mod_muzzle",
    "mod_foregrip", "mod_scope", "mod_sight_rear", "mod_sight_front", "mod_magazine",
    "mod_charge", "mod_gas_block", "mod_reciever", "mod_mount", "mod_tactical",
    "mod_bipod", "mod_launcher", "other"
  ];

  function props(item) { return item && item.properties && typeof item.properties === "object" ? item.properties : {}; }
  function types(item) { return Array.isArray(item && item.types) ? item.types : []; }
  function slug(item) { return String(item && (item.normalizedName || item.id) || ""); }
  function name(item) { return String(item && (item.shortName || item.name || item.normalizedName || item.id) || ""); }
  function number(value) { var n = Number(value); return isFinite(n) ? n : 0; }

  function normalizeSlot(value) {
    var slot = String(value || "").toLowerCase().replace(/_\d+$/, "");
    if (slot === "mod_pistolgrip") slot = "mod_pistol_grip";
    if (/^mod_tactical/.test(slot)) slot = "mod_tactical";
    if (/^mod_mount/.test(slot)) slot = "mod_mount";
    if (/^mod_stock/.test(slot)) slot = "mod_stock";
    if (/^mod_charge/.test(slot)) slot = "mod_charge";
    return CATEGORIES.indexOf(slot) >= 0 ? slot : "other";
  }

  function isWeapon(item) { return props(item).propertiesType === "ItemPropertiesWeapon"; }
  function isMod(item) {
    var type = props(item).propertiesType;
    return type === "ItemPropertiesWeaponMod" || type === "ItemPropertiesBarrel" || type === "ItemPropertiesScope" || type === "ItemPropertiesMagazine" || types(item).indexOf("mods") >= 0 || types(item).indexOf("magazine") >= 0;
  }

  function buildCompatibility(items) {
    var byId = Object.create(null);
    var modToWeapons = Object.create(null);
    var modToSlots = Object.create(null);
    (items || []).forEach(function (item) { if (item && item.id) byId[item.id] = item; });
    function add(modId, slot, weaponId) {
      if (!modId) return;
      if (!modToWeapons[modId]) modToWeapons[modId] = [];
      if (!modToSlots[modId]) modToSlots[modId] = [];
      if (weaponId && modToWeapons[modId].indexOf(weaponId) < 0) modToWeapons[modId].push(weaponId);
      if (modToSlots[modId].indexOf(slot) < 0) modToSlots[modId].push(slot);
    }
    function walk(parent, weaponId, depth) {
      if (!parent || depth > 1) return;
      props(parent).slots && props(parent).slots.forEach(function (slot) {
        var slotName = normalizeSlot(slot.nameId || slot.name || slot.id);
        var allowed = slot.filters && slot.filters.allowedItems || [];
        allowed.forEach(function (modId) {
          add(modId, slotName, weaponId);
          if (depth < 1) walk(byId[modId], weaponId, depth + 1);
        });
      });
    }
    (items || []).filter(isWeapon).forEach(function (weapon) { walk(weapon, weapon.id, 0); });
    return { byId: byId, modToWeapons: modToWeapons, modToSlots: modToSlots };
  }

  function rating(item) {
    var p = props(item);
    var recoil = number(p.recoilModifier);
    return number(p.ergonomics) * 2.5 + (-recoil * 100) * 2 + number(p.accuracyModifier) * 100 * 0.3;
  }

  function modModel(item, compatibility) {
    var p = props(item);
    var id = String(item && item.id || "");
    var slots = compatibility && compatibility.modToSlots[id] || ["other"];
    var category = "other";
    for (var i = 0; i < CATEGORIES.length; i++) if (slots.indexOf(CATEGORIES[i]) >= 0) { category = CATEGORIES[i]; break; }
    if (types(item).indexOf("pistolGrip") >= 0) category = "mod_pistol_grip";
    if (types(item).indexOf("suppressor") >= 0) category = "mod_muzzle";
    var avg = number(item && item.avg24hPrice);
    var low = number(item && item.lastLowPrice);
    return {
      id: id,
      slug: slug(item),
      name: name(item),
      icon: String(item && (item.iconLink || item.gridImageLink) || ""),
      cat: category,
      slots: slots.slice(),
      ergo: number(p.ergonomics),
      recoil: number(p.recoilModifier),
      acc: number(p.accuracyModifier),
      recoilPct: number(p.recoilModifier) * 100,
      fits: compatibility && compatibility.modToWeapons[id] ? compatibility.modToWeapons[id].length : 0,
      weaponIds: compatibility && compatibility.modToWeapons[id] ? compatibility.modToWeapons[id].slice() : [],
      avg: avg,
      onFlea: avg > 0 || low > 0,
      noFlea: types(item).indexOf("noFlea") >= 0,
      rating: rating(item),
      capacity: number(p.capacity)
    };
  }

  global.TarkovWeaponDomain = {
    categories: CATEGORIES.slice(),
    normalizeSlot: normalizeSlot,
    isWeapon: isWeapon,
    isMod: isMod,
    buildCompatibility: buildCompatibility,
    modModel: modModel
  };
})(window);
