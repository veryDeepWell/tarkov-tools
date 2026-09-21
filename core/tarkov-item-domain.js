/*! TarkovItemDomain - pure item classification, projections and relations */
(function (global) {
  "use strict";
  if (global.TarkovItemDomain) return;

  var ARMOR_TYPES = {
    ItemPropertiesArmor: "armor",
    ItemPropertiesChestRig: "rig",
    ItemPropertiesHelmet: "helmet",
    ItemPropertiesArmorAttachment: "plate",
    ItemPropertiesGlasses: "glasses"
  };

  function props(item) {
    return item && item.properties && typeof item.properties === "object" ? item.properties : {};
  }

  function types(item) {
    var value = item && item.types;
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  function number(value, fallback) {
    var result = Number(value);
    return isFinite(result) ? result : (fallback || 0);
  }

  function name(item) {
    if (!item) return "";
    return String(item.shortName || item.name || item.normalizedName || item.id || "");
  }

  function slug(item) {
    return String(item && (item.normalizedName || item.id) || "");
  }

  function classifyItem(item) {
    var p = props(item);
    var itemTypes = types(item);
    if (itemTypes.indexOf("armorPlate") >= 0 || p.propertiesType === "ItemPropertiesArmorAttachment") return "plate";
    if (p.propertiesType === "ItemPropertiesHelmet" || itemTypes.indexOf("helmet") >= 0) return "helmet";
    if (p.propertiesType === "ItemPropertiesChestRig" || itemTypes.indexOf("rig") >= 0) return "rig";
    if (p.propertiesType === "ItemPropertiesArmor" || itemTypes.indexOf("armor") >= 0) return "armor";
    if (p.propertiesType === "ItemPropertiesGlasses") return "glasses";
    return "other";
  }

  function bestTraderOffer(item) {
    var offers = Array.isArray(item && item.buyFromTrader) ? item.buyFromTrader : [];
    var best = null;
    offers.forEach(function (offer) {
      var price = number(offer && (offer.priceRUB != null ? offer.priceRUB : offer.price));
      if (!price || (best && price >= best.price)) return;
      best = {
        price: price,
        trader: String(offer.trader || ""),
        traderLevel: number(offer.minTraderLevel),
        quest: !!offer.taskUnlock
      };
    });
    return best;
  }

  function baseModel(item) {
    var p = props(item);
    var offer = bestTraderOffer(item);
    var avg = number(item && item.avg24hPrice);
    var low = number(item && item.lastLowPrice);
    return {
      id: String(item && item.id || ""),
      slug: slug(item),
      name: name(item),
      icon: String(item && (item.iconLink || item.gridImageLink) || ""),
      kind: classifyItem(item),
      class: number(p.class),
      durability: number(p.durability, number(item && item.maxDurability)),
      material: String(p.material || ""),
      avg: avg,
      low: low,
      onFlea: avg > 0 || low > 0,
      trader: offer
    };
  }

  function armorModel(item) {
    var p = props(item);
    var model = baseModel(item);
    var plateIds = [];
    (p.armorSlots || []).forEach(function (slot) {
      (slot && slot.allowedPlates || []).forEach(function (id) {
        if (plateIds.indexOf(id) < 0) plateIds.push(id);
      });
    });
    model.zones = Array.isArray(p.zones) ? p.zones.slice() : [];
    model.armorType = String(p.armorType || "");
    model.speedPenalty = Math.abs(number(p.speedPenalty));
    model.turnPenalty = Math.abs(number(p.turnPenalty));
    model.ergoPenalty = Math.abs(number(p.ergoPenalty));
    model.plateIds = plateIds;
    model.plateSlots = Array.isArray(p.armorSlots) ? p.armorSlots.length : 0;
    model.capacity = number(p.capacity);
    model.rating = armorRating(model);
    return model;
  }

  function plateModel(item) {
    var p = props(item);
    var model = baseModel(item);
    model.weight = Math.max(number(item && item.weight), 0.1);
    model.repairCost = number(p.repairCost);
    model.penalty = Math.abs(number(p.speedPenalty)) + Math.abs(number(p.ergoPenalty)) + Math.abs(number(p.turnPenalty));
    model.score = plateScore(model);
    return model;
  }

  function armorRating(model) {
    var penalty = 1 + model.speedPenalty * 5 + model.turnPenalty * 5 + model.ergoPenalty * 5;
    return model.class > 0 ? (model.class * model.class * Math.sqrt(Math.max(model.durability, 1))) / penalty : 0;
  }

  function plateScore(model) {
    return ((model.class * model.class * 15 + model.durability * 0.4) / model.weight) - model.repairCost / 5000 - model.penalty * 5;
  }

  function buildCompatibility(items) {
    var armorToPlates = Object.create(null);
    var plateToArmor = Object.create(null);
    var byId = Object.create(null);
    var unresolved = [];
    (items || []).forEach(function (item) {
      if (item && item.id) byId[item.id] = item;
    });
    (items || []).forEach(function (item) {
      var model = baseModel(item);
      if (["armor", "rig", "helmet"].indexOf(model.kind) < 0) return;
      var armor = armorModel(item);
      if (!armor.plateIds.length) return;
      armorToPlates[armor.id] = armor.plateIds.slice();
      armor.plateIds.forEach(function (plateId) {
        if (!plateToArmor[plateId]) plateToArmor[plateId] = [];
        plateToArmor[plateId].push(armor.id);
        if (!byId[plateId]) unresolved.push({ armorId: armor.id, plateId: plateId });
      });
    });
    return {
      armorToPlates: armorToPlates,
      plateToArmor: plateToArmor,
      unresolved: unresolved
    };
  }

  function filter(models, specification) {
    specification = specification || {};
    var query = String(specification.search || "").toLowerCase().trim();
    return (models || []).filter(function (model) {
      if (specification.kinds && specification.kinds.length && specification.kinds.indexOf(model.kind) < 0) return false;
      if (specification.classes && specification.classes.length && model.class && specification.classes.indexOf(model.class) < 0) return false;
      if (specification.onlyFlea && !model.onFlea) return false;
      if (query && (model.name + " " + model.slug + " " + model.material).toLowerCase().indexOf(query) < 0) return false;
      return true;
    });
  }

  global.TarkovItemDomain = {
    armorTypes: ARMOR_TYPES,
    classifyItem: classifyItem,
    baseModel: baseModel,
    armorModel: armorModel,
    plateModel: plateModel,
    armorRating: armorRating,
    plateScore: plateScore,
    buildCompatibility: buildCompatibility,
    filter: filter
  };
})(window);
