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
    if (p.propertiesType === "ItemPropertiesHelmet" || p.propertiesType === "ItemPropertiesHeadwear" ||
      itemTypes.indexOf("helmet") >= 0) return "helmet";
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

  function fleaTax(basePrice, offerPrice, count, options) {
    options = options || {};
    var base = number(basePrice);
    var offer = number(offerPrice);
    var quantity = Math.max(1, number(count, 1));
    if (base <= 0 || offer <= 0) return 0;
    var purchase = 0.05;
    var revenue = 0.05;
    var purchaseExponent = Math.log10(base / offer);
    var revenueExponent = Math.log10(offer / base);
    if (offer < base) purchaseExponent = Math.pow(purchaseExponent, 1.08);
    else revenueExponent = Math.pow(revenueExponent, 1.08);
    var tax = (base * purchase * Math.pow(4, purchaseExponent) +
      offer * revenue * Math.pow(4, revenueExponent)) * quantity;
    if (options.intelCenter3) {
      var hideoutLevel = Math.max(0, Math.min(50, number(options.hmLvl)));
      tax *= 1 - Math.min(0.45, 0.30 + hideoutLevel * 0.003);
    }
    return Math.max(0, Math.ceil(tax));
  }

  function fleaNet(basePrice, offerPrice, count, options) {
    var quantity = Math.max(1, number(count, 1));
    return number(offerPrice) * quantity - fleaTax(basePrice, offerPrice, quantity, options);
  }

  function evaluateProfit(basePrice, offerPrice, count, cost, options) {
    options = options || {};
    var quantity = Math.max(1, number(count, 1));
    var gross = number(offerPrice) * quantity;
    var tax = 0;
    if (number(basePrice) > 0 && number(offerPrice) > 0) tax = fleaTax(basePrice, offerPrice, quantity, options);
    else if (number(options.commissionPercent) > 0) {
      tax = Math.ceil(gross * number(options.commissionPercent) / 100);
    }
    var revenue = gross - tax;
    var totalCost = number(cost);
    var profit = revenue - totalCost;
    return {
      tax: tax,
      revenue: revenue,
      profit: profit,
      roi: totalCost > 0 ? profit / totalCost * 100 : 0
    };
  }

  function gridArea(item) {
    var p = props(item);
    var width = Math.max(number(item && item.width, number(p.width)), 0);
    var height = Math.max(number(item && item.height, number(p.height)), 0);
    return width && height ? width * height : 0;
  }

  function qualityValue(item, kind) {
    var p = props(item);
    if (kind === "food") {
      var restore = Math.max(0, number(p.energy)) + Math.max(0, number(p.hydration));
      return restore * (number(p.energy) > 0 && number(p.hydration) > 0 ? 1.15 : 1);
    }
    var model = kind === "plate" ? plateModel(item) : armorModel(item);
    if (!model.class && kind === "rig" && model.plateSlots) {
      return (model.plateSlots * 50 + model.capacity * 2 + model.zones.length * 5) /
        (1 + model.speedPenalty + model.turnPenalty + model.ergoPenalty);
    }
    if (!model.class) return 0;
    var coverage = Math.max(1, model.zones ? model.zones.length : 0);
    var base = model.class * model.class * Math.sqrt(Math.max(model.durability, 1));
    if (kind === "plate") return base / (1 + model.penalty + model.weight * 0.08);
    var mobilityPenalty = model.speedPenalty + model.turnPenalty + model.ergoPenalty;
    var ricochet = kind === "helmet"
      ? (number(p.ricochetX) + number(p.ricochetY) + number(p.ricochetZ)) / 12
      : 0;
    var slots = p.armorSlots || p.slots || [];
    var slotBenefit = Math.min(Array.isArray(slots) ? slots.length : 0, 5) * 0.03;
    var blindProtection = kind === "helmet" ? Math.max(0, number(p.blindnessProtection)) * 0.1 : 0;
    return base * (1 + Math.min(coverage, 8) * 0.06 + ricochet + slotBenefit + blindProtection) /
      (1 + mobilityPenalty * 5);
  }

  function itemAvailability(item) {
    var trader = bestTraderOffer(item);
    var flea = number(item && item.avg24hPrice) > 0 || number(item && item.lastLowPrice) > 0;
    var traderScore = trader
      ? Math.max(0, 55 - Math.max(0, trader.traderLevel - 1) * 8 - (trader.quest ? 20 : 0))
      : 0;
    return Math.min(100, traderScore + (flea ? 45 : 0));
  }

  function effectivePrice(item) {
    var trader = bestTraderOffer(item);
    var flea = number(item && item.lastLowPrice) || number(item && item.avg24hPrice);
    if (trader && flea) return Math.min(trader.price, flea);
    return trader ? trader.price : flea;
  }

  function percentile(values, higherIsBetter) {
    var valid = values.filter(function (value) { return value != null && isFinite(value); });
    if (!valid.length) return values.map(function () { return 50; });
    var min = Infinity;
    var max = -Infinity;
    valid.forEach(function (value) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    });
    return values.map(function (value) {
      if (value == null || !isFinite(value)) return 50;
      if (max === min) return 50;
      var score = (value - min) / (max - min) * 100;
      return higherIsBetter ? score : 100 - score;
    });
  }

  function scoreItems(items) {
    var candidates = (items || []).filter(function (item) {
      var kind = classifyItem(item);
      var p = props(item);
      if (p.propertiesType === "ItemPropertiesHeadwear" && !p.class && !p.ricochetX) return false;
      return kind === "armor" || kind === "rig" || kind === "helmet" || kind === "plate" ||
        p.propertiesType === "ItemPropertiesFoodDrink";
    });
    var groups = Object.create(null);
    candidates.forEach(function (item) {
      var kind = props(item).propertiesType === "ItemPropertiesFoodDrink" ? "food" : classifyItem(item);
      if (!groups[kind]) groups[kind] = [];
      groups[kind].push(item);
    });
    var scores = Object.create(null);
    Object.keys(groups).forEach(function (kind) {
      var group = groups[kind];
      var quality = group.map(function (item) { return qualityValue(item, kind); });
      var access = group.map(itemAvailability);
      var liquidityScores = percentile(group.map(function (item) {
        var count = number(item.lastOfferCount);
        return count > 0 ? count : null;
      }), true);
      var prices = group.map(function (item, index) {
        var price = effectivePrice(item);
        return price > 0 && quality[index] > 0 ? price / quality[index] : null;
      });
      var burden = group.map(function (item) {
        var weight = Math.max(0, number(item.weight));
        var area = gridArea(item);
        return weight > 0 || area > 0 ? weight + area * 0.25 : null;
      });
      var qualityScores = percentile(quality, true);
      var priceScores = percentile(prices, false);
      var burdenScores = percentile(burden, false);
      group.forEach(function (item, index) {
        var trader = bestTraderOffer(item);
        var fleaPrice = number(item.lastLowPrice) || number(item.avg24hPrice);
        var weight = Math.max(0, number(item.weight));
        var area = gridArea(item);
        var components = {
          quality: Math.round(qualityScores[index]),
          accessibility: Math.round(access[index] * 0.8 + liquidityScores[index] * 0.2),
          value: Math.round(priceScores[index]),
          load: Math.round(burdenScores[index])
        };
        var score = components.quality * 0.5 +
          components.accessibility * 0.2 +
          components.value * 0.15 +
          components.load * 0.15;
        scores[item.id] = {
          score: Math.round(score * 10) / 10,
          components: components,
          price: effectivePrice(item),
          availability: components.accessibility,
          details: {
            fleaPrice: fleaPrice,
            traderPrice: trader ? trader.price : 0,
            traderLevel: trader ? trader.traderLevel : 0,
            questLocked: trader ? trader.quest : false,
            listingCount: number(item.lastOfferCount),
            liquidity: Math.round(liquidityScores[index]),
            weight: weight,
            size: area
          }
        };
      });
    });
    return scores;
  }

  function itemScore(item, items) {
    if (!item || !item.id) return null;
    var source = Array.isArray(items) ? items : [item];
    var scores = scoreItems(source);
    return scores[item.id] || null;
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
        if (plateToArmor[plateId].indexOf(armor.id) < 0) plateToArmor[plateId].push(armor.id);
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
    fleaTax: fleaTax,
    fleaNet: fleaNet,
    evaluateProfit: evaluateProfit,
    scoreItems: scoreItems,
    itemScore: itemScore,
    buildCompatibility: buildCompatibility,
    filter: filter
  };
})(window);
