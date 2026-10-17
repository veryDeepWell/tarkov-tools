/*! TarkovItemGraph — R3.0 item relationship indexes (IDs only, no item payload copy) */
(function (global) {
  "use strict";
  if (global.TarkovItemGraph && global.TarkovItemGraph.__v >= 3) return;

  function emptyLists() {
    return {
      byId: Object.create(null),
      questsUsing: Object.create(null),
      questsRewarding: Object.create(null),
      craftsAsInput: Object.create(null),
      craftsAsProduct: Object.create(null),
      bartersAsInput: Object.create(null),
      bartersAsReward: Object.create(null),
      soldBy: Object.create(null),
      usedInContainers: Object.create(null),
      family: Object.create(null),
      taskById: Object.create(null),
      craftByKey: Object.create(null),
      hideoutRequiring: Object.create(null),
      ammoFor: Object.create(null),
      magsFor: Object.create(null),
      modsFor: Object.create(null)
    };
  }

  var state = emptyLists();
  var built = false;

  function push(map, key, value) {
    if (!key) return;
    key = String(key);
    if (!map[key]) map[key] = [];
    map[key].push(value);
  }

  function itemIdOf(ref) {
    if (ref == null) return "";
    if (typeof ref === "string" || typeof ref === "number") return String(ref);
    if (typeof ref === "object") {
      return String(ref.id || ref.item || ref.itemId || (ref.item && ref.item.id) || "");
    }
    return "";
  }

  function taskIdOf(task) {
    if (!task) return "";
    return String(task.id || task.taskId || task._id || "");
  }

  function craftKey(c, idx) {
    if (c && c.id) return String(c.id);
    var st = c && c.station ? (c.station.id || c.station) : "st";
    var lvl = c && c.level != null ? c.level : 0;
    var prod = itemIdOf(c && (c.rewardItems && c.rewardItems[0]) || c.product || c.productItem);
    return String(st) + ":" + lvl + ":" + prod + ":" + (idx || 0);
  }

  /**
   * @param {object} ctx
   * @param {Array} ctx.items
   * @param {Array} [ctx.tasks]
   * @param {Array} [ctx.crafts]
   * @param {Array} [ctx.barters] optional
   * @param {Array} [ctx.hideout]
   */
  function build(ctx) {
    ctx = ctx || {};
    state = emptyLists();
    var items = Array.isArray(ctx.items) ? ctx.items : [];
    var tasks = Array.isArray(ctx.tasks) ? ctx.tasks : [];
    var crafts = Array.isArray(ctx.crafts) ? ctx.crafts : [];
    var barters = Array.isArray(ctx.barters) ? ctx.barters : [];
    var i, j, it, id;

    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (!it || !it.id) continue;
      id = String(it.id);
      state.byId[id] = it;

      var offers = it.buyFromTrader || it.buyFor || [];
      for (j = 0; j < offers.length; j++) {
        var o = offers[j];
        if (!o) continue;
        push(state.soldBy, id, {
          trader: o.trader && (o.trader.id || o.trader.key || o.trader) || o.vendor,
          minTraderLevel: o.minTraderLevel || o.loyaltyLevel || o.ll,
          price: o.priceRUB != null ? o.priceRUB : o.price,
          currency: o.currency,
          taskUnlock: o.taskUnlock ? (o.taskUnlock.id || o.taskUnlock) : null
        });
      }
    }

    for (i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      var tid = taskIdOf(task);
      if (!tid) continue;
      state.taskById[tid] = task;
      var objs = task.objectives || [];
      for (j = 0; j < objs.length; j++) {
        var o = objs[j];
        if (!o) continue;
        var type = o.type || o.objectiveType || "";
        var count = o.count != null ? o.count : (o.required != null ? o.required : 1);
        var candidates = [];
        if (o.item) candidates.push(o.item);
        if (o.items) candidates = candidates.concat(o.items);
        if (o.targetItem) candidates.push(o.targetItem);
        if (o.targetItems) candidates = candidates.concat(o.targetItems);
        for (var k = 0; k < candidates.length; k++) {
          var iid = itemIdOf(candidates[k]);
          if (!iid) continue;
          push(state.questsUsing, iid, {
            taskId: tid,
            objectiveType: type,
            count: count
          });
        }
      }
      var rewards = task.finishRewards || task.rewards || {};
      var rItems = rewards.items || rewards.Items || [];
      if (Array.isArray(task.startRewards) && task.startRewards.items) {
        /* ignore start for rewarding index */
      }
      for (j = 0; j < rItems.length; j++) {
        var rid = itemIdOf(rItems[j] && (rItems[j].item || rItems[j]));
        if (rid) push(state.questsRewarding, rid, tid);
      }
    }

    for (i = 0; i < crafts.length; i++) {
      var c = crafts[i];
      var ck = craftKey(c, i);
      state.craftByKey[ck] = c;
      var reqs = c.requiredItems || c.requirements || c.ingredients || [];
      for (j = 0; j < reqs.length; j++) {
        var req = reqs[j];
        var iid2 = itemIdOf(req && (req.item || req));
        if (iid2) {
          push(state.craftsAsInput, iid2, {
            craftKey: ck,
            count: req && req.count != null ? req.count : 1,
            station: c.station && (c.station.id || c.station.name || c.station),
            level: c.level
          });
        }
      }
      var products = c.rewardItems || c.products || [];
      if (c.productItem) products = products.concat([c.productItem]);
      if (c.product) products = products.concat([c.product]);
      for (j = 0; j < products.length; j++) {
        var pr = products[j];
        var pid = itemIdOf(pr && (pr.item || pr));
        if (pid) {
          push(state.craftsAsProduct, pid, {
            craftKey: ck,
            count: pr && pr.count != null ? pr.count : 1,
            station: c.station && (c.station.id || c.station.name || c.station),
            level: c.level
          });
        }
      }
    }

    for (i = 0; i < barters.length; i++) {
      var b = barters[i];
      var bk = b && b.id ? String(b.id) : ("barter:" + i);
      var bReq = (b && (b.requiredItems || b.requirements)) || [];
      for (j = 0; j < bReq.length; j++) {
        var bi = itemIdOf(bReq[j] && (bReq[j].item || bReq[j]));
        if (bi) push(state.bartersAsInput, bi, { barterKey: bk, trader: b.trader });
      }
      var bRew = (b && (b.rewardItems || b.rewards)) || [];
      for (j = 0; j < bRew.length; j++) {
        var br = itemIdOf(bRew[j] && (bRew[j].item || bRew[j]));
        if (br) push(state.bartersAsReward, br, { barterKey: bk, trader: b.trader });
      }
    }


    var hideout = Array.isArray(ctx.hideout) ? ctx.hideout : (Array.isArray(ctx.stations) ? ctx.stations : []);
    for (i = 0; i < hideout.length; i++) {
      var st = hideout[i];
      if (!st) continue;
      var sid = String(st.id || st._id || "");
      var levels = st.levels || [];
      for (j = 0; j < levels.length; j++) {
        var lv = levels[j];
        if (!lv) continue;
        var lvlNum = lv.level != null ? lv.level : j;
        var reqItems = lv.itemRequirements || lv.itemReq || lv.requirements || [];
        for (var hi = 0; hi < reqItems.length; hi++) {
          var hr = reqItems[hi];
          var hid = itemIdOf(hr && (hr.item || hr));
          if (!hid) continue;
          push(state.hideoutRequiring, hid, {
            stationId: sid,
            stationName: st.name || st.normalizedName || sid,
            level: lvlNum,
            count: hr && hr.count != null ? hr.count : 1
          });
        }
      }
    }


    /* —— R3.2 family + weapon chain —— */
    function isGun(it) {
      if (!it) return false;
      var types = it.types || [];
      if (types.indexOf("gun") >= 0 || types.indexOf("weapon") >= 0) return true;
      var p = it.properties || {};
      return p.propertiesType === "ItemPropertiesWeapon";
    }
    function isAmmo(it) {
      if (!it) return false;
      var types = it.types || [];
      if (types.indexOf("ammo") >= 0) return true;
      var p = it.properties || {};
      return p.propertiesType === "ItemPropertiesAmmo";
    }
    function isMag(it) {
      if (!it) return false;
      var p = it.properties || {};
      return p.propertiesType === "ItemPropertiesMagazine" || (it.types || []).indexOf("magazine") >= 0;
    }
    function isModItem(it) {
      if (!it) return false;
      var types = it.types || [];
      for (var ti = 0; ti < types.length; ti++) {
        if (/mod|sight|barrel|stock|muzzle|mount|handguard|pistol.?grip|receiver|charge/i.test(types[ti])) return true;
      }
      var p = it.properties || {};
      return /^ItemProperties/.test(p.propertiesType || "") && !isGun(it) && !isAmmo(it) && !isMag(it) &&
        p.propertiesType !== "ItemPropertiesWeapon";
    }
    function caliberOf(it) {
      if (!it || !it.properties) return "";
      return String(it.properties.caliber || it.properties.ammoCaliber || "");
    }
    function familyKey(it) {
      var n = String(it.normalizedName || it.name || "").toLowerCase();
      if (!n) return "";
      // strip trailing variant tokens
      n = n.replace(/[-_]?(gen\s*\d+|v\d+|mk\.?\s*\d+|black|tan|fde|od|grey|gray|camo|rail|tactical)$/i, "");
      n = n.replace(/\s+/g, "-");
      // weapon platform: first 2-3 tokens for long names
      var parts = n.split(/[-_]/).filter(Boolean);
      if (isGun(it) && parts.length >= 2) {
        // normalize trailing variant letter on model number: 74m/74n -> 74
        parts = parts.map(function (p) {
          return p.replace(/^(\d+)[a-z]$/i, "$1");
        });
        if (parts[0] === "kalashnikov" || parts[0] === "colt" || parts[0] === "sig" || parts[0] === "fn") {
          return parts.slice(0, Math.min(3, parts.length)).join("-");
        }
        return parts.slice(0, 2).join("-");
      }
      if (parts.length >= 2) return parts.slice(0, 2).join("-");
      return parts[0] || n;
    }

    var familyBuckets = Object.create(null);
    var gunsByCal = Object.create(null);
    var ammoByCal = Object.create(null);
    var magsByCal = Object.create(null);
    var gunIds = [];

    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (!it || !it.id) continue;
      id = String(it.id);
      var fk = familyKey(it);
      if (fk) {
        if (!familyBuckets[fk]) familyBuckets[fk] = [];
        familyBuckets[fk].push(id);
      }
      var cal = caliberOf(it);
      if (isGun(it)) {
        gunIds.push(id);
        if (cal) push(gunsByCal, cal, id);
      } else if (isAmmo(it) && cal) {
        push(ammoByCal, cal, id);
      } else if (isMag(it)) {
        // allowedAmmo ids or caliber on mag
        var allowed = (it.properties && it.properties.allowedAmmo) || [];
        if (allowed.length) {
          for (j = 0; j < allowed.length; j++) {
            var aid = itemIdOf(allowed[j]);
            if (aid) push(state.magsFor, aid, id); // ammo -> mags
          }
        }
        if (cal) push(magsByCal, cal, id);
      }
    }

    for (var fkey in familyBuckets) {
      if (!Object.prototype.hasOwnProperty.call(familyBuckets, fkey)) continue;
      var members = familyBuckets[fkey];
      if (members.length < 2) continue;
      for (j = 0; j < members.length; j++) {
        state.family[members[j]] = members.filter(function (x) { return x !== members[j]; });
      }
    }

    // ammoFor: gun id -> ammo ids of same caliber
    for (var calK in gunsByCal) {
      if (!Object.prototype.hasOwnProperty.call(gunsByCal, calK)) continue;
      var gList = gunsByCal[calK] || [];
      var aList = ammoByCal[calK] || [];
      var mList = magsByCal[calK] || [];
      for (j = 0; j < gList.length; j++) {
        var gid = gList[j];
        for (var ai = 0; ai < aList.length; ai++) push(state.ammoFor, gid, aList[ai]);
        for (var mi = 0; mi < mList.length; mi++) push(state.magsFor, gid, mList[mi]);
      }
      // reverse: ammo -> guns
      for (ai = 0; ai < aList.length; ai++) {
        for (j = 0; j < gList.length; j++) push(state.ammoFor, aList[ai], gList[j]);
      }
    }

    // modsFor: lightweight — same family key as gun when mod name shares platform token
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (!it || !isModItem(it)) continue;
      var mfk = familyKey(it);
      if (!mfk || !familyBuckets[mfk]) continue;
      var sibs = familyBuckets[mfk];
      for (j = 0; j < sibs.length; j++) {
        var sib = state.byId[sibs[j]];
        if (sib && isGun(sib)) push(state.modsFor, sibs[j], String(it.id));
      }
    }


    built = true;
    return state;
  }

  function links(itemId) {
    itemId = String(itemId || "");
    return {
      questsUsing: state.questsUsing[itemId] || [],
      questsRewarding: state.questsRewarding[itemId] || [],
      craftsAsInput: state.craftsAsInput[itemId] || [],
      craftsAsProduct: state.craftsAsProduct[itemId] || [],
      bartersAsInput: state.bartersAsInput[itemId] || [],
      bartersAsReward: state.bartersAsReward[itemId] || [],
      soldBy: state.soldBy[itemId] || [],
      hideoutRequiring: state.hideoutRequiring[itemId] || [],
      family: state.family[itemId] || [],
      ammoFor: state.ammoFor[itemId] || [],
      magsFor: state.magsFor[itemId] || [],
      modsFor: state.modsFor[itemId] || []
    };
  }

  /** Lightweight card aggregate: ids + resolved names only when byId present */
  function card(itemId) {
    itemId = String(itemId || "");
    var item = state.byId[itemId] || null;
    var L = links(itemId);
    return {
      id: itemId,
      item: item,
      name: item ? (item.shortName || item.name || item.normalizedName || itemId) : itemId,
      normalizedName: item && item.normalizedName,
      icon: item && (item.iconLink || item.gridImageLink || ""),
      types: item && item.types,
      links: L
    };
  }


  function taskName(taskId) {
    var t = state.taskById[String(taskId || "")];
    if (!t) return String(taskId || "");
    return t.name || t.shortName || t.normalizedName || String(taskId);
  }

  function craftLabel(craftKey) {
    var c = state.craftByKey[String(craftKey || "")];
    if (!c) return String(craftKey || "");
    var st = c.station ? (c.station.name || c.station.normalizedName || c.station.id || c.station) : "";
    var lvl = c.level != null ? c.level : "";
    return (st ? String(st) : "craft") + (lvl !== "" ? " L" + lvl : "");
  }


  function weaponChain(itemId) {
    itemId = String(itemId || "");
    var item = state.byId[itemId];
    var L = links(itemId);
    return {
      family: L.family.slice(0, 40),
      ammo: L.ammoFor.slice(0, 40),
      mags: L.magsFor.slice(0, 40),
      mods: L.modsFor.slice(0, 40)
    };
  }

  function get(itemId) {
    return state.byId[String(itemId || "")] || null;
  }

  function isBuilt() {
    return built;
  }

  /** Relative URL to item card from tools/ directory */
  function href(itemId, opts) {
    opts = opts || {};
    var base = opts.base != null ? opts.base : "tarkovtool-item-card.html";
    return base + "?item=" + encodeURIComponent(String(itemId || ""));
  }

  /** Absolute-ish path from repo root / hub */
  function hrefFromRoot(itemId) {
    return "tools/" + href(itemId);
  }

  function open(itemId) {
    try {
      global.location.href = href(itemId);
    } catch (e) {}
  }

  global.TarkovItemGraph = {
    __v: 3,
    build: build,
    card: card,
    links: links,
    get: get,
    taskName: taskName,
    craftLabel: craftLabel,
    weaponChain: weaponChain,
    isBuilt: isBuilt,
    href: href,
    hrefFromRoot: hrefFromRoot,
    open: open,
    /** @internal test/debug */
    _state: function () { return state; }
  };
})(typeof window !== "undefined" ? window : globalThis);
