/*! TarkovItemViewModels - pure table projections for item tools */
(function (global) {
  "use strict";
  if (global.TarkovItemViewModels) return;

  function domain() { return global.TarkovItemDomain; }
  function humanize(value) {
    return value ? String(value).replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : "?";
  }
  function number(value) {
    var result = Number(value);
    return isFinite(result) ? result : 0;
  }
  function zones(values) {
    var result = [];
    (values || []).forEach(function (value) {
      var text = String(value);
      var label = /Head|Parietal|Nape|Ear|Jaw|Face|Eyes|Top of the Head|Collider Type Head/i.test(text) ? "head"
        : /Neck/i.test(text) ? "neck"
        : /chest|Thorax|RibcageUp|SpineTop|Plate_.*chest/i.test(text) ? "chest"
        : /back|SpineDown|Plate_.*back/i.test(text) ? "back"
        : /Side|LeftSide|RightSide|side_left|side_right/i.test(text) ? "sides"
        : /Arm|Shoulder/i.test(text) ? "arms"
        : /Pelvis|Groin|Stomach|RibcageLow/i.test(text) ? "abdomen"
        : /Leg|Thigh/i.test(text) ? "legs" : "";
      if (label && result.indexOf(label) < 0) result.push(label);
    });
    return result;
  }
  function trader(model, options) {
    if (!model.trader) return { price: 0, name: "", level: 0, quest: false };
    var label = options && options.traderLabel;
    return {
      price: model.trader.price,
      name: label ? label(model.trader.trader) : model.trader.trader,
      level: model.trader.traderLevel,
      quest: model.trader.quest
    };
  }
  function size(item) {
    var width = number(item && item.width);
    var height = number(item && item.height);
    return width > 0 && height > 0 ? width * height : 0;
  }

  function armor(items, options) {
    var d = domain();
    var compatibility = d.buildCompatibility(items || []);
    var scores = d.scoreItems(items || []);
    var plateById = Object.create(null);
    var armorById = Object.create(null);
    (items || []).forEach(function (item) {
      if (d.classifyItem(item) === "plate") {
        var plate = d.plateModel(item);
        plateById[plate.id] = {
          id: plate.id,
          name: humanize(plate.slug || plate.name),
          slug: plate.slug,
          icon: plate.icon,
          class: plate.class,
          dur: plate.durability,
          material: plate.material,
          avg: plate.avg,
          low: plate.low
        };
        return;
      }
      var armorModel = d.armorModel(item);
      if (["armor", "rig", "helmet"].indexOf(armorModel.kind) >= 0) {
        armorById[armorModel.id] = {
          id: armorModel.id,
          name: humanize(armorModel.slug || armorModel.name),
          icon: armorModel.icon
        };
      }
    });

    var rows = [];
    (items || []).forEach(function (item) {
      var model = d.armorModel(item);
      if (["armor", "rig", "helmet", "plate"].indexOf(model.kind) < 0) return;
      if (model.kind === "plate" && !model.class) return;
      if (model.kind === "rig" && !model.class && !model.plateSlots) return;
      var buy = trader(model, options || {});
      var score = scores[model.id];
      rows.push({
        id: model.id,
        slug: model.slug,
        name: humanize(model.slug || model.name),
        icon: model.icon,
        class: model.class,
        dur: model.durability,
        kind: model.kind,
        armorType: model.armorType,
        material: model.material,
        zones: zones(model.zones),
        avg: model.avg,
        low: model.low,
        onFlea: model.onFlea,
        traderPrice: buy.price,
        traderName: buy.name,
        traderLL: buy.level,
        quest: buy.quest,
        plateSlots: model.plateSlots,
        plateIds: (compatibility.armorToPlates[model.id] || []).slice(),
        compatibleArmors: (compatibility.plateToArmor[model.id] || []).map(function (id) {
          return armorById[id] || { id: id, name: id, icon: "" };
        }),
        capacity: model.capacity,
        weight: Math.max(number(item.weight), 0),
        size: size(item),
        speedPenalty: model.speedPenalty,
        rating: model.rating,
        score: score ? score.score : 0,
        scoreComponents: score ? score.components : null,
        scoreDetails: score ? score.details : null,
        blunt: number(item.properties && item.properties.bluntThroughput)
      });
    });
    return { rows: rows, platesById: plateById, compatibility: compatibility };
  }

  function plates(items) {
    var d = domain();
    var compatibility = d.buildCompatibility(items || []);
    var scores = d.scoreItems(items || []);
    var armorById = Object.create(null);
    (items || []).forEach(function (item) {
      var model = d.armorModel(item);
      if (["armor", "rig", "helmet"].indexOf(model.kind) < 0) return;
      armorById[model.id] = {
        id: model.id,
        name: humanize(model.slug || model.name),
        icon: model.icon
      };
    });
    return (items || []).reduce(function (result, item) {
      var model = d.plateModel(item);
      if (model.kind !== "plate") return result;
      var score = scores[model.id];
      result.push({
        id: model.id,
        slug: model.slug,
        name: humanize(model.slug || model.name),
        icon: model.icon,
        avg: model.avg,
        low: model.low,
        onFlea: model.onFlea,
        cls: model.class,
        dur: model.durability,
        weight: model.weight,
        repair: model.repairCost,
        pen: model.penalty,
        score: score ? score.score : 0,
        scoreComponents: score ? score.components : null,
        scoreDetails: score ? score.details : null,
        compatibleArmors: (compatibility.plateToArmor[model.id] || []).map(function (id) {
          return armorById[id] || { id: id, name: id, icon: "" };
        })
      });
      return result;
    }, []).sort(function (a, b) { return b.score - a.score; });
  }

  function helmets(items) {
    var d = domain();
    var scores = d.scoreItems(items || []);
    return (items || []).reduce(function (rows, item) {
      var p = item.properties || {};
      var type = p.propertiesType;
      if (type !== "ItemPropertiesHelmet" && type !== "ItemPropertiesHeadwear") return rows;
      if (type === "ItemPropertiesHeadwear" && !p.class && !p.ricochetX) return rows;
      var model = d.armorModel(item);
      var score = scores[item.id];
      rows.push({
        id: model.id,
        slug: model.slug,
        name: model.name,
        icon: model.icon,
        class: model.class,
        cls: model.class,
        dur: model.durability,
        mat: model.material,
        zones: zones(model.zones),
        ergo: model.ergoPenalty,
        turn: model.turnPenalty,
        speed: model.speedPenalty,
        blind: p.blindnessProtection == null ? null : number(p.blindnessProtection),
        avg: model.avg,
        low: model.low,
        onFlea: model.onFlea,
        traderPrice: model.trader ? model.trader.price : 0,
        quest: model.trader ? model.trader.quest : false,
        weight: Math.max(number(item.weight), 0),
        size: size(item),
        rx: p.ricochetX,
        ry: p.ricochetY,
        rz: p.ricochetZ,
        blunt: p.bluntThroughput,
        repair: p.repairCost,
        blocksEye: !!p.blocksEyewear,
        blocksHead: !!p.blocksHeadwear,
        armorType: p.armorType || "",
        slotCount: (p.armorSlots || p.slots || []).length || 0,
        score: score ? score.score : 0,
        scoreComponents: score ? score.components : null,
        scoreDetails: score ? score.details : null
      });
      return rows;
    }, []);
  }

  function food(items) {
    var d = domain();
    var scores = d.scoreItems(items || []);
    return (items || []).reduce(function (rows, item) {
      var p = item.properties || {};
      if (p.propertiesType !== "ItemPropertiesFoodDrink") return rows;
      var energy = Math.max(0, number(p.energy));
      var hydration = Math.max(0, number(p.hydration));
      if (!energy && !hydration) return rows;
      var kind = energy > 0 && hydration === 0 ? "food"
        : hydration > 0 && energy === 0 ? "drink" : "both";
      var avg = number(item.avg24hPrice) || number(item.lastLowPrice);
      var score = scores[item.id];
      rows.push({
        id: item.id,
        name: String(item.shortName || item.name || item.normalizedName || item.id),
        full: String(item.name || ""),
        slug: String(item.normalizedName || item.name || ""),
        icon: String(item.iconLink || item.gridImageLink || ""),
        kind: kind,
        energy: energy,
        hydration: hydration,
        units: number(p.units),
        avg: avg,
        onFlea: number(item.avg24hPrice) > 0 || number(item.lastLowPrice) > 0,
        perPoint: energy + hydration && avg ? Math.round(avg / (energy + hydration)) : 0,
        score: score ? score.score : 0,
        scoreComponents: score ? score.components : null,
        scoreDetails: score ? score.details : null
      });
      return rows;
    }, []);
  }

  global.TarkovItemViewModels = {
    armor: armor,
    plates: plates,
    helmets: helmets,
    food: food,
    zones: zones
  };
})(window);
