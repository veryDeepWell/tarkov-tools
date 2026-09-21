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
      var label = /Head|Parietal|Nape|Ear|Jaw|Face|Eyes|Top of the Head|Collider Type Head/i.test(text) ? "голова"
        : /Neck/i.test(text) ? "шея"
        : /chest|Thorax|RibcageUp|SpineTop|Plate_.*chest/i.test(text) ? "грудь"
        : /back|SpineDown|Plate_.*back/i.test(text) ? "спина"
        : /Side|LeftSide|RightSide|side_left|side_right/i.test(text) ? "бока"
        : /Arm|Shoulder/i.test(text) ? "руки"
        : /Pelvis|Groin|Stomach|RibcageLow/i.test(text) ? "живот/таз"
        : /Leg|Thigh/i.test(text) ? "ноги" : "";
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

  function armor(items, options) {
    var d = domain();
    var compatibility = d.buildCompatibility(items || []);
    var plateById = Object.create(null);
    (items || []).forEach(function (item) {
      if (d.classifyItem(item) !== "plate") return;
      var model = d.plateModel(item);
      plateById[model.id] = {
        id: model.id,
        name: humanize(model.slug || model.name),
        slug: model.slug,
        class: model.class,
        dur: model.durability,
        material: model.material,
        avg: model.avg
      };
    });
    var rows = [];
    (items || []).forEach(function (item) {
      var model = d.armorModel(item);
      if (["armor", "rig", "helmet", "plate"].indexOf(model.kind) < 0) return;
      if (model.kind === "plate" && !model.class) return;
      if (model.kind === "rig" && !model.class && !model.plateSlots) return;
      var buy = trader(model, options || {});
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
        capacity: model.capacity,
        speedPenalty: model.speedPenalty,
        rating: model.rating,
        blunt: number(item.properties && item.properties.bluntThroughput)
      });
    });
    return { rows: rows, platesById: plateById, compatibility: compatibility };
  }

  function plates(items) {
    var d = domain();
    return (items || []).reduce(function (result, item) {
      var model = d.plateModel(item);
      if (model.kind !== "plate") return result;
      result.push({
        id: model.id,
        slug: model.slug,
        name: humanize(model.slug || model.name),
        icon: model.icon,
        avg: model.avg,
        cls: model.class,
        dur: model.durability,
        weight: model.weight,
        repair: model.repairCost,
        pen: model.penalty,
        score: Math.round(model.score * 10) / 10
      });
      return result;
    }, []).sort(function (a, b) { return b.score - a.score; });
  }

  global.TarkovItemViewModels = {
    armor: armor,
    plates: plates,
    zones: zones
  };
})(window);
