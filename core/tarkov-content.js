/*! Profile-aware content index. Checks progression, not ownership of ingredients. */
(function (global) {
  "use strict";
  var pack = null, loadedMode = "", pending = null, generation = 0;
  function id(ref) { return typeof ref === "string" ? ref : ref && (ref.id || id(ref.item)) || ""; }
  function label(ref) { return TarkovData.label("entity", ref); }
  function load() {
    var mode = TarkovProfile.preferredGameMode();
    if (pack && loadedMode === mode) return Promise.resolve(pack);
    if (pending && loadedMode === mode) return pending;
    pack = null;
    loadedMode = mode;
    var token = ++generation;
    pending = Promise.all([TarkovAPI.tasks(mode), TarkovAPI.barters(mode), TarkovAPI.crafts(mode), TarkovAPI.hideout(mode), TarkovAPI.traders(mode), TarkovAPI.items(mode)])
      .then(function (data) { if (token !== generation) return null; pack = data; pending = null; return pack; }, function (e) {
        if (token === generation) { pending = null; pack = null; } throw e;
      });
    return pending;
  }
  function available() {
    if (!pack || loadedMode !== TarkovProfile.preferredGameMode()) return [];
    var p = TarkovProfile.getActive(), out = [];
    var names = Object.create(null);
    [pack[3], pack[4], pack[5]].forEach(function (list) {
      (list || []).forEach(function (entity) { names[entity.id] = label(entity); });
    });
    function resolved(ref) { return names[id(ref)] || label(ref) || id(ref); }
    function add(kind, entity, text, file, type, entityId) {
      out.push({ key: kind + ":" + (entityId || id(entity)), kind: kind, id: entityId || id(entity), text: text, file: file, type: type });
    }
    function stationLevel(stationId) { return Number((p.hideout[stationId] || {}).level) || 0; }
    function requirementsMet(entity) {
      if (TarkovProfile.offerGate(entity).locked) return false;
      return (entity.skillRequirements || []).every(function (r) {
        return Number(p.skills[TarkovProfile.skillKey(r.skill || r.name)] || 0) >= Number(r.level || 0);
      }) && (entity.stationLevelRequirements || []).every(function (r) {
        return stationLevel(id(r.station)) >= Number(r.level || 0);
      });
    }
    (pack[0] || []).forEach(function (task) {
      if (!TarkovProfile.isQuestCompleted(task.id) && !TarkovProfile.taskGate(task).locked)
        add("quest", task, label(task), "tarkovtool-quests.html", "quest");
    });
    (pack[1] || []).forEach(function (b) {
      if (requirementsMet(b)) add("barter", b, resolved(b.trader) + " · " + (b.rewardItems || (b.offeredItem ? [b.offeredItem] : [])).map(function (r) { return resolved(r.item); }).join(", "), "tarkovtool-barter-opt.html", "barter");
    });
    (pack[2] || []).forEach(function (c) {
      if (requirementsMet(c) && stationLevel(id(c.station)) >= Number(c.level || 1))
        add("craft", c, resolved(c.station) + " · " + (c.rewardItems || (c.productItem ? [c.productItem] : [])).map(function (r) { return resolved(r.item); }).join(", "), "tarkovtool-crafts.html", "craft");
    });
    (pack[3] || []).forEach(function (station) {
      (station.levels || []).forEach(function (lv) {
        if (Number(lv.level) === stationLevel(station.id) + 1 && requirementsMet(lv) &&
            (!lv.minPlayerLevel || p.level >= lv.minPlayerLevel) &&
            (lv.traderRequirements || []).every(function (r) { return !TarkovProfile.offerGate({ trader: r.trader, minTraderLevel: r.level }).locked; }))
          add("hideout", station, label(station) + " · " + lv.level, "tarkovtool-hideout.html", "station", station.id + ":" + lv.level);
      });
    });
    (pack[4] || []).forEach(function (trader) {
      var key = global.TarkovDicts && TarkovDicts.traderKey ? TarkovDicts.traderKey(trader.id) : trader.normalizedName;
      var next = Number(p.traders[key] || 1) + 1, stats = p.traderStats[key];
      if (!stats || stats.reputation == null || stats.spent == null) return;
      (trader.levels || []).forEach(function (lv) {
        var needLevel = lv.requiredPlayerLevel != null ? lv.requiredPlayerLevel : lv.minPlayerLevel;
        var needRep = lv.requiredReputation != null ? lv.requiredReputation : lv.requiredStanding;
        var needSales = lv.requiredCommerce != null ? lv.requiredCommerce : lv.requiredSales;
        if (Number(lv.level) === next && needLevel != null && needRep != null && needSales != null &&
            p.level >= Number(needLevel) && stats.reputation >= Number(needRep) && stats.spent >= Number(needSales))
          add("trader", trader, label(trader) + " · доступен УЛ " + next, "tarkovtool-trader-flip.html", "trader", key);
      });
    });
    (pack[5] || []).forEach(function (item) {
      var offers = item.buyFromTrader || item.buyFor || [];
      var trader = offers.some(function (offer) { return !TarkovProfile.offerGate(offer).locked; });
      var flea = p.level >= 15 && !(item.types || []).includes("noFlea") && Number(item.avg24hPrice || item.lastLowPrice) > 0;
      if (trader || flea) add("item", item, label(item), "tarkovtool-item-card.html", "item");
    });
    return out;
  }
  global.TarkovContent = { load: load, available: available };
})(typeof window !== "undefined" ? window : globalThis);
