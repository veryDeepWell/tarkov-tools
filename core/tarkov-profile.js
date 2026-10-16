/*! TarkovProfile — PMC profiles as single source of personal progress (1.1) */
(function (global) {
  "use strict";
  if (global.TarkovProfile && global.TarkovProfile.__v >= 4) return;

  var LIST_KEY = "tt:profile:list";
  var ACTIVE_KEY = "tt:profile:active";
  var DATA_PREFIX = "tt:profile:data:";
  var FILTER_MODE_KEY = "tt:profile:filterMode"; // off | dim | hide
  var CHANNEL = "tarkov-tools-profile";
  var TRADER_KEYS = [
    "prapor", "therapist", "fence", "skier", "peacekeeper",
    "mechanic", "ragman", "jaeger", "lightkeeper"
  ];

  function storage() {
    if (!global.TarkovStorage || !TarkovStorage.getJson) {
      throw new Error("TarkovStorage must load before TarkovProfile");
    }
    return TarkovStorage;
  }

  function uid() {
    return "pmc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function defaultTraders() {
    var o = {};
    TRADER_KEYS.forEach(function (k) { o[k] = 1; });
    return o;
  }

  function emptyProfile(name) {
    var now = Date.now();
    return {
      _v: 1,
      id: "",
      name: name || "ЧВК",
      level: 1,
      gameMode: "pve",
      traders: defaultTraders(),
      skills: {},
      quests: { completed: [], active: [], itemDone: {} },
      prestige: { level: 0, carried: [] },
      notes: { hideout: "" },
      icon: "util",
      meta: { createdAt: now, updatedAt: now }
    };
  }

  function normalize(p) {
    if (!p || typeof p !== "object") p = emptyProfile("ЧВК");
    var base = emptyProfile(p.name);
    var out = Object.assign({}, base, p);
    out.traders = Object.assign({}, base.traders, p.traders || {});
    TRADER_KEYS.forEach(function (k) {
      var n = Number(out.traders[k]);
      if (!isFinite(n) || n < 1) n = 1;
      if (n > 4) n = 4;
      out.traders[k] = n | 0;
    });
    out.skills = p.skills && typeof p.skills === "object" ? p.skills : {};
    out.quests = {
      completed: Array.isArray(p.quests && p.quests.completed) ? p.quests.completed.slice() : [],
      active: Array.isArray(p.quests && p.quests.active) ? p.quests.active.slice() : [],
      itemDone: (p.quests && p.quests.itemDone && typeof p.quests.itemDone === "object")
        ? Object.assign({}, p.quests.itemDone) : {}
    };
    out.prestige = {
      level: Math.max(0, Number(p.prestige && p.prestige.level) || 0) | 0,
      carried: Array.isArray(p.prestige && p.prestige.carried) ? p.prestige.carried.slice() : []
    };
    out.notes = Object.assign({ hideout: "" }, p.notes || {});
    out.icon = (p.icon && String(p.icon).trim()) || "util";
    out.level = Math.max(1, Math.min(79, Number(out.level) || 1)) | 0;
    out.gameMode = out.gameMode === "pvp" || out.gameMode === "pve" ? out.gameMode : "pve";
    out.meta = Object.assign({ createdAt: Date.now(), updatedAt: Date.now() }, p.meta || {});
    return out;
  }

  var listeners = [];
  var bc = null;
  try { bc = new BroadcastChannel(CHANNEL); } catch (e) { bc = null; }

  function emit(type, detail) {
    var ev = { type: type, detail: detail || {}, at: Date.now() };
    listeners.slice().forEach(function (fn) {
      try { fn(ev); } catch (err) { try { console.debug && console.debug("[tt:profile]", err); } catch (_tt) { /* ignore */ } }
    });
    try {
      if (bc) bc.postMessage(ev);
    } catch (err) { try { console.debug && console.debug("[tt:profile]", err); } catch (_tt) { /* ignore */ } }
    try {
      if (global.dispatchEvent) {
        global.dispatchEvent(new CustomEvent("tt-profile", { detail: ev }));
      }
    } catch (err) { try { console.debug && console.debug("[tt:profile]", err); } catch (_tt) { /* ignore */ } }
  }

  function listMeta() {
    return storage().getJson(LIST_KEY, []) || [];
  }

  function saveList(list) {
    storage().setJson(LIST_KEY, list);
  }

  function dataKey(id) {
    return DATA_PREFIX + id;
  }

  function readData(id) {
    if (!id) return null;
    var raw = storage().getJson(dataKey(id), null);
    if (!raw) return null;
    var p = normalize(raw);
    p.id = id;
    return p;
  }

  function writeData(p) {
    p = normalize(p);
    p.meta.updatedAt = Date.now();
    storage().setJson(dataKey(p.id), p);
    var list = listMeta();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === p.id) {
        list[i] = { id: p.id, name: p.name, updatedAt: p.meta.updatedAt, level: p.level, icon: p.icon || "util" };
        found = true;
        break;
      }
    }
    if (!found) {
      list.push({ id: p.id, name: p.name, updatedAt: p.meta.updatedAt, level: p.level, icon: p.icon || "util" });
    }
    saveList(list);
    return p;
  }

  function getActiveId() {
    return storage().get(ACTIVE_KEY, null) || null;
  }

  function setActiveId(id) {
    if (!id || !readData(id)) return getActive();
    storage().set(ACTIVE_KEY, id);
    var p = readData(id);
    syncLegacyState(p);
    emit("active", { id: id, profile: p });
    emit("change", { profile: p, fields: ["*"], reason: "active" });
    try {
      if (global.dispatchEvent) {
        global.dispatchEvent(new CustomEvent("tt-profile-changed", { detail: { id: id, profile: p } }));
        global.dispatchEvent(new CustomEvent("tt-profile-refresh", { detail: { reason: "active", id: id } }));
      }
    } catch (eRef) { try { console.debug && console.debug("[tt:profile]", eRef); } catch (_tt) { /* ignore */ } }
    try {
      document.documentElement.setAttribute("data-tt-profile-id", id);
      document.documentElement.setAttribute("data-tt-level", String((p && p.level) || 1));
      document.documentElement.setAttribute("data-tt-mode", (p && p.gameMode) || "pve");
    } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    return p;
  }

  function list() {
    return listMeta().slice().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  function getActive() {
    ensureMigrated();
    var id = getActiveId();
    var p = id ? readData(id) : null;
    if (!p) {
      var L = listMeta();
      if (L.length) {
        p = setActiveId(L[0].id);
      } else {
        p = create({ name: "ЧВК" });
      }
    }
    return p;
  }

  function create(opts) {
    opts = opts || {};
    var p = emptyProfile(opts.name || "ЧВК");
    p.id = uid();
    if (opts.level) p.level = opts.level;
    if (opts.gameMode) p.gameMode = opts.gameMode;
    p = writeData(p);
    if (!getActiveId()) storage().set(ACTIVE_KEY, p.id);
    else if (opts.activate !== false && listMeta().length === 1) storage().set(ACTIVE_KEY, p.id);
    if (opts.activate) storage().set(ACTIVE_KEY, p.id);
    syncLegacyState(getActive());
    emit("create", { profile: p });
    emit("change", { profile: getActive(), fields: ["*"] });
    return p;
  }

  function update(patch, opts) {
    opts = opts || {};
    var cur = getActive();
    if (opts.id) {
      cur = readData(opts.id);
      if (!cur) return null;
    }
    var prev = JSON.parse(JSON.stringify(cur));
    var next = normalize(Object.assign({}, cur, patch || {}));
    next.id = cur.id;
    if (patch && patch.traders) next.traders = Object.assign({}, cur.traders, patch.traders);
    if (patch && patch.quests) {
      next.quests = {
        completed: patch.quests.completed != null ? patch.quests.completed : cur.quests.completed,
        active: patch.quests.active != null ? patch.quests.active : cur.quests.active,
        itemDone: patch.quests.itemDone != null
          ? Object.assign({}, patch.quests.itemDone)
          : Object.assign({}, (cur.quests && cur.quests.itemDone) || {})
      };
    }
    if (patch && patch.prestige) {
      next.prestige = Object.assign({}, cur.prestige, patch.prestige);
    }
    if (patch && patch.notes) {
      next.notes = Object.assign({}, cur.notes, patch.notes);
    }
    if (patch && patch.skills) {
      next.skills = Object.assign({}, cur.skills, patch.skills);
    }
    next = writeData(next);

    var fields = [];
    if (prev.level !== next.level) fields.push("level");
    if (prev.name !== next.name) fields.push("name");
    if (prev.gameMode !== next.gameMode) fields.push("gameMode");
    TRADER_KEYS.forEach(function (k) {
      if ((prev.traders[k] || 1) !== (next.traders[k] || 1)) fields.push("trader:" + k);
    });
    if (JSON.stringify(prev.quests) !== JSON.stringify(next.quests)) fields.push("quests");
    if (JSON.stringify(prev.prestige) !== JSON.stringify(next.prestige)) fields.push("prestige");

    if (fields.indexOf("level") !== -1) emit("level", { profile: next, from: prev.level, to: next.level });
    fields.forEach(function (f) {
      if (f.indexOf("trader:") === 0) {
        emit("traderLL", { profile: next, trader: f.slice(7), level: next.traders[f.slice(7)] });
      }
    });
    if (fields.indexOf("quests") !== -1) emit("quest", { profile: next, quests: next.quests });
    if (fields.indexOf("prestige") !== -1) emit("prestige", { profile: next, prestige: next.prestige });

    if (next.id === getActiveId()) syncLegacyState(next);
    emit("change", { profile: next, fields: fields.length ? fields : ["*"], previous: prev });
    return next;
  }

  function remove(id) {
    if (!id) return false;
    var L = listMeta().filter(function (x) { return x.id !== id; });
    saveList(L);
    try { storage().remove(dataKey(id)); } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    if (getActiveId() === id) {
      if (L.length) setActiveId(L[0].id);
      else {
        storage().set(ACTIVE_KEY, "");
        create({ name: "ЧВК", activate: true });
      }
    }
    emit("remove", { id: id });
    emit("change", { profile: getActive(), fields: ["*"] });
    return true;
  }

  function exportProfile(id) {
    var p = id ? readData(id) : getActive();
    if (!p) return null;
    return {
      _schema: "tarkov-tools-pmc-profile",
      _version: 1,
      _exportedAt: Date.now(),
      profile: p
    };
  }

  function importProfile(json, opts) {
    opts = opts || {};
    var data = typeof json === "string" ? JSON.parse(json) : json;
    var raw = data && data.profile ? data.profile : data;
    var p = normalize(raw);
    p.id = uid();
    p.meta.createdAt = Date.now();
    p = writeData(p);
    if (opts.activate !== false) setActiveId(p.id);
    emit("import", { profile: p });
    emit("change", { profile: getActive(), fields: ["*"] });
    return p;
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return function () {};
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (x) { return x !== fn; });
    };
  }

  /** Mirror active profile into TarkovState for older tools */
  function syncLegacyState(p) {
    if (!p) return;
    try {
      if (global.TarkovState && TarkovState.set) {
        TarkovState.set({
          player: {
            level: p.level,
            gameMode: p.gameMode,
            name: p.name,
            icon: p.icon || "util",
            traders: p.traders || {},
            prestige: (p.prestige && p.prestige.level) || 0
          },
          quests: {
            completed: (p.quests && p.quests.completed) || [],
            active: (p.quests && p.quests.active) || []
          },
          hideout: { notes: (p.notes && p.notes.hideout) || "" }
        });
      }
    } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    try {
      if (global.TarkovStorage) {
        TarkovStorage.set("tarkovPreferredGameMode", p.gameMode);
        // namespaced settings key used by hub/common
        if (TarkovStorage.setJson) {
          try {
            var sk = "tt:settings:game-mode";
            TarkovStorage.set(sk, p.gameMode);
          } catch (e2) { try { console.debug && console.debug("[tt:profile]", e2); } catch (_tt) { /* ignore */ } }
        }
      }
    } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
  }

  /** Preferred game mode: active profile wins over defaults. */
  function preferredGameMode(fallback) {
    try {
      var p = getActive();
      if (p && p.gameMode) return p.gameMode;
    } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    return fallback || "pve";
  }

  /** Context bag for tools (read-only snapshot). */
  function context() {
    var p = getActive();
    return {
      id: p.id,
      name: p.name,
      level: p.level,
      gameMode: p.gameMode,
      icon: p.icon || "util",
      traders: Object.assign({}, p.traders || {}),
      quests: {
        completed: (p.quests.completed || []).slice(),
        active: (p.quests.active || []).slice()
      },
      prestige: Object.assign({}, p.prestige || { level: 0, carried: [] }),
      skills: Object.assign({}, p.skills || {})
    };
  }

  var migrated = false;
  function ensureMigrated() {
    if (migrated) return;
    migrated = true;
    var L = listMeta();
    if (L.length) return;
    var name = "ЧВК";
    var level = 1;
    var gameMode = "pve";
    var completed = [];
    var active = [];
    var notes = "";
    try {
      if (global.TarkovState && TarkovState.get) {
        var st = TarkovState.get();
        if (st.player) {
          level = st.player.level || 1;
          gameMode = st.player.gameMode || "pve";
          if (st.player.name) name = st.player.name;
        }
        if (st.quests) {
          completed = st.quests.completed || [];
          active = st.quests.active || [];
        }
        if (st.hideout && st.hideout.notes) notes = st.hideout.notes;
      }
    } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    var p = emptyProfile(name);
    p.id = uid();
    p.level = level;
    p.gameMode = gameMode;
    p.quests = { completed: completed, active: active };
    p.notes = { hideout: notes };
    writeData(p);
    storage().set(ACTIVE_KEY, p.id);
    emit("migrate", { profile: p });
  }

  if (bc) {
    bc.onmessage = function (msg) {
      var ev = msg && msg.data;
      if (!ev || !ev.type) return;
      listeners.slice().forEach(function (fn) {
        try { fn(ev); } catch (err) { try { console.debug && console.debug("[tt:profile]", err); } catch (_tt) { /* ignore */ } }
      });
    };
  }

  function exportAllProfiles() {
    ensureMigrated();
    return {
      _schema: "tarkov-tools-pmc-profiles",
      _version: 1,
      _exportedAt: Date.now(),
      activeId: getActiveId(),
      profiles: listMeta().map(function (m) { return readData(m.id); }).filter(Boolean)
    };
  }

  function importAllProfiles(json, opts) {
    opts = opts || {};
    var data = typeof json === "string" ? JSON.parse(json) : json;
    var arr = (data && data.profiles) || (Array.isArray(data) ? data : null);
    if (!arr || !arr.length) throw new Error("no profiles");
    var firstId = null;
    arr.forEach(function (raw, i) {
      var p = normalize(raw);
      p.id = uid();
      p.meta = p.meta || {};
      p.meta.createdAt = Date.now();
      p.meta.updatedAt = Date.now();
      writeData(p);
      if (i === 0) firstId = p.id;
    });
    if (opts.activate !== false && firstId) setActiveId(firstId);
    emit("import", { count: arr.length });
    emit("change", { profile: getActive(), fields: ["*"] });
    return list();
  }


  function bindGameMode(elOrId, opts) {
    opts = opts || {};
    var el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
    if (!el) el = document.getElementById(opts.id || "gameMode");
    if (!el) return null;
    var fallback = opts.fallback || "pve";
    var mode = preferredGameMode(fallback);
    var values = [];
    if (el.options && el.options.length) {
      for (var i = 0; i < el.options.length; i++) values.push(el.options[i].value);
    }
    if (values.length && values.indexOf(mode) < 0) {
      if (mode === "pve" && values.indexOf("regular") >= 0) mode = "regular";
      else if ((mode === "regular" || mode === "pve") && values.indexOf("pve") >= 0) mode = "pve";
      else if (values.indexOf(fallback) >= 0) mode = fallback;
      else mode = values[0];
    }
    el.value = mode;
    if (el.__ttProfileBound) return el;
    el.__ttProfileBound = true;
    el.addEventListener("change", function () {
      var v = el.value;
      if (v === "regular") v = "pve";
      try { update({ gameMode: v === "pvp" ? "pvp" : "pve" }); } catch (err) { try { console.debug && console.debug("[tt:profile]", err); } catch (_tt) { /* ignore */ } }
    });
    return el;
  }


  function bindNumberInput(elOrId, readVal, writeVal, opts) {
    opts = opts || {};
    var el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
    if (!el) return null;
    var key = opts.bindKey || el.id || "num";
    var v = readVal();
    if (v != null && isFinite(Number(v))) el.value = Number(v);
    if (el.__ttProfileBoundNum && el.__ttProfileBoundNum === key) return el;
    el.__ttProfileBoundNum = key;
    el.addEventListener("change", function () {
      var n = Number(el.value);
      if (!isFinite(n)) return;
      try { writeVal(n); } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    });
    return el;
  }

  function bindLevel(elOrId) {
    return bindNumberInput(elOrId || "playerLevel", function () {
      var p = getActive();
      return p && p.level != null ? p.level : 1;
    }, function (n) {
      n = Math.max(1, Math.min(79, n | 0));
      update({ level: n });
    }, { bindKey: "level" });
  }

  function bindPrestige(elOrId) {
    var el = typeof elOrId === "string" ? document.getElementById(elOrId) : (elOrId || document.getElementById("prestige"));
    if (!el) return null;
    var p = getActive();
    var lvl = (p && p.prestige && p.prestige.level != null) ? Number(p.prestige.level) : 0;
    if (!isFinite(lvl) || lvl < 0) lvl = 0;
    // select may only have fixed values — pick closest existing option without inventing prestige
    var values = [];
    if (el.options) {
      for (var i = 0; i < el.options.length; i++) values.push(el.options[i].value);
    }
    if (values.length && values.indexOf(String(lvl)) < 0) {
      if (values.indexOf("0") >= 0) lvl = 0;
      else lvl = Number(values[0]) || 0;
    }
    el.value = String(lvl);
    if (el.__ttProfileBoundPrestige) return el;
    el.__ttProfileBoundPrestige = true;
    el.addEventListener("change", function () {
      var n = Math.max(0, Number(el.value) || 0) | 0;
      try {
        var cur = getActive();
        var carried = (cur.prestige && cur.prestige.carried) || [];
        update({ prestige: { level: n, carried: carried } });
      } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    });
    return el;
  }

  /** Wire common profile fields present on the tool page. */
  function wireToolPage() {
    try {
      ensureMigrated();
      bindGameMode("gameMode", { fallback: "pve" });
      if (document.getElementById("playerLevel")) bindLevel("playerLevel");
      // #level only when not My Tarkov full form — still OK to bind
      if (document.getElementById("level") && !document.getElementById("pmcName")) bindLevel("level");
      if (document.getElementById("prestige")) bindPrestige("prestige");
      // R2.4: trader LL selects anywhere on page
      if (document.querySelector("select[data-trader]")) bindTraderLL(document);
      if (typeof context === "function") {
        try { window.__ttProfileContext = context(); } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
      }
    } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
  }


  function playerLevel() {
    var p = getActive();
    return (p && p.level) || 1;
  }

  function traderLL(key) {
    var p = getActive();
    if (!p || !p.traders) return 1;
    var n = Number(p.traders[key]);
    return isFinite(n) && n >= 1 ? (n | 0) : 1;
  }

  function isQuestCompleted(idOrName) {
    if (!idOrName) return false;
    var p = getActive();
    var list = (p && p.quests && p.quests.completed) || [];
    var s = String(idOrName).toLowerCase().trim();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i]).toLowerCase().trim() === s) return true;
    }
    return false;
  }

  function isQuestActive(idOrName) {
    if (!idOrName) return false;
    var p = getActive();
    var list = (p && p.quests && p.quests.active) || [];
    var s = String(idOrName).toLowerCase().trim();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i]).toLowerCase().trim() === s) return true;
    }
    return false;
  }

  /** Task/object with minPlayerLevel — unlocked for current PMC? */
  function meetsLevel(minLevel) {
    var need = Number(minLevel);
    if (!isFinite(need) || need <= 1) return true;
    return playerLevel() >= need;
  }

  /** Trader offer with minTraderLevel for known trader key/id. */
  function meetsTraderLL(traderKey, minLL) {
    var need = Number(minLL);
    if (!isFinite(need) || need <= 1) return true;
    return traderLL(traderKey) >= need;
  }

  /**
   * Unified availability gate for profile filter (R-2 / R2.1).
   * @param {object} req
   * @param {number} [req.minLevel]
   * @param {string} [req.trader] trader key (prapor, …)
   * @param {number} [req.minLL]
   * @param {string} [req.questId]
   * @param {string} [req.questName]
   * @param {boolean} [req.requireQuest] if true, locked until quest completed
   * @param {boolean} [req.questLocked] treat as locked by quest (offer requires unlock)
   * @param {number} [req.fleaLevel] flea unlock level
   * @returns {{ locked: boolean, reasons: string[], reason: string }}
   */

  /**
   * Normalize trader offer for gate (P0 / R2.7).
   * @returns {{ traderKey: string, minLL: number, questLocked: boolean, questName: string }}
   */
  function offerMeta(offer) {
    offer = offer || {};
    var traderRaw = offer.trader != null ? offer.trader : offer.vendor;
    if (traderRaw && typeof traderRaw === "object") {
      traderRaw = traderRaw.id || traderRaw.key || traderRaw.normalizedName || "";
    }
    var traderKey = traderRaw != null ? String(traderRaw) : "";
    try {
      if (global.TarkovDicts) {
        if (typeof TarkovDicts.traderKey === "function" && traderKey) {
          traderKey = TarkovDicts.traderKey(traderKey) || traderKey;
        } else if (TarkovDicts.traders && traderKey && traderKey.length > 20) {
          var hit = null;
          for (var i = 0; i < TarkovDicts.traders.length; i++) {
            if (TarkovDicts.traders[i].id === traderKey) {
              hit = TarkovDicts.traders[i];
              break;
            }
          }
          if (hit && hit.key) traderKey = hit.key;
        }
      }
    } catch (eMeta) {}

    var minLL = Number(
      offer.minTraderLevel != null
        ? offer.minTraderLevel
        : offer.loyaltyLevel != null
          ? offer.loyaltyLevel
          : offer.ll
    );
    if (!isFinite(minLL)) minLL = 0;

    var questLocked = !!(offer.taskUnlock || offer.quest || offer.questLocked);
    var questName = "";
    var tu = offer.taskUnlock;
    if (tu && typeof tu === "object") {
      questName = String(tu.name || tu.normalizedName || tu.id || "");
    } else if (tu != null && tu !== false) {
      questName = String(tu);
    }
    if (!questName && offer.questName) questName = String(offer.questName);

    return {
      traderKey: traderKey,
      minLL: minLL,
      questLocked: questLocked,
      questName: questName
    };
  }

  /** gate() for a raw buy offer */
  function offerGate(offer) {
    var m = offerMeta(offer);
    return gate({
      trader: m.traderKey,
      minLL: m.minLL,
      questLocked: m.questLocked,
      questName: m.questName
    });
  }

  function gate(req) {
    req = req || {};
    var reasons = [];
    var locked = false;
    var minLevel = req.minLevel != null ? Number(req.minLevel) : null;
    if (minLevel != null && isFinite(minLevel) && minLevel > 1 && !meetsLevel(minLevel)) {
      locked = true;
      reasons.push("Уровень " + playerLevel() + " < " + (minLevel | 0));
    }
    var fleaLevel = req.fleaLevel != null ? Number(req.fleaLevel) : null;
    if (fleaLevel != null && isFinite(fleaLevel) && fleaLevel > 1 && !meetsLevel(fleaLevel)) {
      locked = true;
      reasons.push("Барахолка с ур. " + (fleaLevel | 0));
    }
    if (req.trader && req.minLL != null) {
      var needLL = Number(req.minLL);
      if (isFinite(needLL) && needLL >= 1 && !meetsTraderLL(req.trader, needLL)) {
        locked = true;
        reasons.push("УЛ " + req.trader + " " + traderLL(req.trader) + " < " + (needLL | 0));
      }
    }
    if (req.questLocked) {
      locked = true;
      var qn = req.questName || req.questId || "?";
      reasons.push("Квест: " + qn);
    } else if (req.requireQuest) {
      var qid = req.questId || req.questName;
      if (qid && !isQuestCompleted(qid)) {
        locked = true;
        reasons.push("Нужен квест: " + qid);
      }
    }
    return { locked: !!locked, reasons: reasons, reason: reasons.join("; ") };
  }

  /** Suggestions for «Что я могу» based on profile only (no API). */
  function suggestActions() {
    var p = getActive();
    var out = [];
    var lvl = p.level || 1;
    TRADER_KEYS.forEach(function (k) {
      var ll = traderLL(k);
      if (ll < 4) out.push({ kind: "trader", text: "УЛ " + k + " → " + (ll + 1), trader: k, next: ll + 1 });
    });
    if (lvl < 15) out.push({ kind: "level", text: "До 15 ур. — новые квесты и торговцы", level: 15 });
    else if (lvl < 20) out.push({ kind: "level", text: "До 20 ур. — flea / расширенный контент", level: 20 });
    else if (lvl < 40) out.push({ kind: "level", text: "Кач до 40 — mid-game прогресс", level: 40 });
    else if (lvl < 55) out.push({ kind: "level", text: "Кач до 55 — поздние квесты", level: 55 });
    var active = (p.quests && p.quests.active) || [];
    active.slice(0, 8).forEach(function (q) {
      out.push({ kind: "quest", text: "Активно: " + q, quest: q });
    });
    if (!active.length) out.push({ kind: "quest", text: "Нет активных квестов в профиле — добавь в «Мой Тарков» или отметь в трекере", quest: null });
    var prest = (p.prestige && p.prestige.level) || 0;
    if (prest > 0) out.push({ kind: "prestige", text: "Престиж P" + prest + " — проверь набор в Престижинаторе", prestige: prest });
    return out;
  }


  function getFilterMode() {
    try {
      var m = storage().get(FILTER_MODE_KEY, "off");
      if (m === "dim" || m === "hide" || m === "off") return m;
    } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    return "off";
  }

  function setFilterMode(mode) {
    if (mode !== "dim" && mode !== "hide") mode = "off";
    try { storage().set(FILTER_MODE_KEY, mode); } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    emit("filterMode", { mode: mode });
    try {
      document.documentElement.setAttribute("data-tt-filter-mode", mode);
      window.dispatchEvent(new CustomEvent("tt-profile-filter", { detail: { mode: mode } }));
      window.dispatchEvent(new CustomEvent("tt-profile-refresh", { detail: { reason: "filterMode", mode: mode } }));
    } catch (e2) { try { console.debug && console.debug("[tt:profile]", e2); } catch (_tt) { /* ignore */ } }
    return mode;
  }

  /** locked=true means content not available for current PMC.
   *  Accepts boolean or gate() result. Sets hover reason when dim/hide. */
  function lockVisibility(locked) {
    if (locked && typeof locked === "object" && locked.locked != null) locked = locked.locked;
    if (!locked) return "show";
    var m = getFilterMode();
    if (m === "hide") return "hide";
    if (m === "dim") return "dim";
    return "show";
  }

  function applyLockToElement(el, lockedOrGate) {
    if (!el) return;
    var locked = false;
    var reason = "";
    if (lockedOrGate && typeof lockedOrGate === "object" && lockedOrGate.locked != null) {
      locked = !!lockedOrGate.locked;
      reason = lockedOrGate.reason || (lockedOrGate.reasons && lockedOrGate.reasons.join("; ")) || "";
    } else {
      locked = !!lockedOrGate;
    }
    var vis = lockVisibility(locked);
    el.classList.remove("tt-profile-dim", "tt-profile-hide");
    el.removeAttribute("data-tt-locked");
    el.removeAttribute("data-tt-lock-reason");
    if (!locked) {
      el.style.display = "";
      el.style.opacity = "";
      if (el.getAttribute("title") && el.__ttLockTitle) {
        el.removeAttribute("title");
        el.__ttLockTitle = false;
      }
      return;
    }
    el.setAttribute("data-tt-locked", "1");
    if (reason) {
      el.setAttribute("data-tt-lock-reason", reason);
      el.setAttribute("title", reason);
      el.__ttLockTitle = true;
    }
    if (vis === "hide") {
      el.classList.add("tt-profile-hide");
      el.style.display = "none";
    } else if (vis === "dim") {
      el.classList.add("tt-profile-dim");
      el.style.display = "";
      el.style.opacity = "0.45";
    } else {
      el.style.display = "";
      el.style.opacity = "";
    }
  }

  /** Bind trader LL <select data-trader="prapor">… to profile.traders */
  function bindTraderLL(rootOrId) {
    var root = rootOrId
      ? (typeof rootOrId === "string" ? document.getElementById(rootOrId) : rootOrId)
      : document;
    if (!root) return;
    ensureMigrated();
    var p = getActive();
    var sels = root.querySelectorAll ? root.querySelectorAll("select[data-trader]") : [];
    for (var i = 0; i < sels.length; i++) {
      (function (sel) {
        var key = sel.getAttribute("data-trader");
        if (!key) return;
        var cur = traderLL(key);
        // option 0 = disabled trader in some UIs
        if (sel.querySelector('option[value="' + cur + '"]')) sel.value = String(cur);
        else if (sel.options && sel.options.length) sel.value = sel.options[0].value;
        if (sel.__ttProfileBoundTrader) return;
        sel.__ttProfileBoundTrader = true;
        sel.addEventListener("change", function () {
          var n = Math.max(0, Math.min(4, Number(sel.value) || 0)) | 0;
          var patch = {};
          patch[key] = n < 1 ? 1 : n;
          try { update({ traders: patch }); } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
        });
      })(sels[i]);
    }
  }

  function markQuestComplete(idOrName, done) {
    if (!idOrName) return getActive();
    var p = getActive();
    var completed = ((p.quests && p.quests.completed) || []).slice();
    var active = ((p.quests && p.quests.active) || []).slice();
    var s = String(idOrName);
    var lower = s.toLowerCase().trim();
    var idx = -1;
    for (var i = 0; i < completed.length; i++) {
      if (String(completed[i]).toLowerCase().trim() === lower) { idx = i; break; }
    }
    if (done !== false) {
      if (idx < 0) completed.push(s);
      active = active.filter(function (x) { return String(x).toLowerCase().trim() !== lower; });
    } else if (idx >= 0) {
      completed.splice(idx, 1);
    }
    return update({
      quests: {
        completed: completed,
        active: active,
        itemDone: (p.quests && p.quests.itemDone) || {}
      }
    });
  }

  function isQuestItemDone(key) {
    if (!key) return false;
    var p = getActive();
    var map = (p && p.quests && p.quests.itemDone) || {};
    return !!map[key];
  }

  function setQuestItemDone(key, isDone) {
    if (!key) return getActive();
    var p = getActive();
    var map = Object.assign({}, (p.quests && p.quests.itemDone) || {});
    if (isDone) map[key] = true;
    else delete map[key];
    return update({
      quests: {
        completed: (p.quests && p.quests.completed) || [],
        active: (p.quests && p.quests.active) || [],
        itemDone: map
      }
    });
  }

  function clearQuestItemDone() {
    var p = getActive();
    return update({
      quests: {
        completed: (p.quests && p.quests.completed) || [],
        active: (p.quests && p.quests.active) || [],
        itemDone: {}
      }
    });
  }

  /** One-time migrate tool-local quest item done map into active profile. */
  function migrateQuestItemDoneFromStorage() {
    try {
      var legacy = storage().getJson("tarkovQuestItemsDone", null);
      if (!legacy || typeof legacy !== "object") return false;
      var p = getActive();
      var map = Object.assign({}, (p.quests && p.quests.itemDone) || {});
      var changed = false;
      Object.keys(legacy).forEach(function (k) {
        if (legacy[k] && !map[k]) { map[k] = true; changed = true; }
      });
      if (changed) {
        update({
          quests: {
            completed: (p.quests && p.quests.completed) || [],
            active: (p.quests && p.quests.active) || [],
            itemDone: map
          }
        });
      }
      try { storage().remove("tarkovQuestItemsDone"); } catch (e2) { try { console.debug && console.debug("[tt:profile]", e2); } catch (_tt) { /* ignore */ } }
      return changed;
    } catch (e) { return false; }
  }

  /**
   * Subscribe tool UI to profile/filter changes (R2.1).
   * Calls fn on: subscribe events, tt-profile-changed, tt-profile-filter,
   * tt-profile-refresh, and postMessage from hub.
   * Also assigns window.onProfileRefresh = fn when opts.exportGlobal !== false.
   */
  function bindRefresh(fn, opts) {
    opts = opts || {};
    if (typeof fn !== "function") return function () {};
    if (opts.exportGlobal !== false) {
      try { window.onProfileRefresh = fn; } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    }
    var unsub = subscribe(function (ev) {
      try { fn(ev); } catch (err) { try { console.debug && console.debug("[tt:profile]", err); } catch (_tt) { /* ignore */ } }
    });
    function onEvt() { try { fn({ type: "dom-event" }); } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } } }
    try {
      window.addEventListener("tt-profile-changed", onEvt);
      window.addEventListener("tt-profile-filter", onEvt);
      window.addEventListener("tt-profile-refresh", onEvt);
      window.addEventListener("message", function (ev) {
        if (!ev.data || !ev.data.type) return;
        if (ev.data.type === "tt-profile-changed" || ev.data.type === "tt-profile-filter" || ev.data.type === "tt-profile-refresh") {
          onEvt();
        }
      });
    } catch (e2) { try { console.debug && console.debug("[tt:profile]", e2); } catch (_tt) { /* ignore */ } }
    return unsub;
  }

  function flushRefresh(detail) {
    try {
      window.dispatchEvent(new CustomEvent("tt-profile-refresh", { detail: detail || {} }));
      window.dispatchEvent(new CustomEvent("tt-profile-changed", { detail: detail || {} }));
    } catch (e) { try { console.debug && console.debug("[tt:profile]", e); } catch (_tt) { /* ignore */ } }
    try {
      if (typeof window.onProfileRefresh === "function") window.onProfileRefresh(detail);
      else if (typeof window.render === "function") window.render();
      else if (typeof window.paint === "function") window.paint();
    } catch (e2) { try { console.debug && console.debug("[tt:profile]", e2); } catch (_tt) { /* ignore */ } }
  }

  global.TarkovProfile = {
    __v: 4,
    TRADER_KEYS: TRADER_KEYS.slice(),
    list: list,
    getActive: getActive,
    getActiveId: getActiveId,
    setActive: setActiveId,
    get: readData,
    create: create,
    update: update,
    remove: remove,
    exportProfile: exportProfile,
    importProfile: importProfile,
    exportAllProfiles: exportAllProfiles,
    importAllProfiles: importAllProfiles,
    subscribe: subscribe,
    ensureMigrated: ensureMigrated,
    syncLegacyState: syncLegacyState,
    preferredGameMode: preferredGameMode,
    context: context,
    bindGameMode: bindGameMode,
    bindLevel: bindLevel,
    bindPrestige: bindPrestige,
    bindTraderLL: bindTraderLL,
    wireToolPage: wireToolPage,
    playerLevel: playerLevel,
    traderLL: traderLL,
    isQuestCompleted: isQuestCompleted,
    isQuestActive: isQuestActive,
    meetsLevel: meetsLevel,
    meetsTraderLL: meetsTraderLL,
    gate: gate,
    offerMeta: offerMeta,
    offerGate: offerGate,
    suggestActions: suggestActions,
    getFilterMode: getFilterMode,
    setFilterMode: setFilterMode,
    lockVisibility: lockVisibility,
    applyLockToElement: applyLockToElement,
    markQuestComplete: markQuestComplete,
    isQuestItemDone: isQuestItemDone,
    setQuestItemDone: setQuestItemDone,
    clearQuestItemDone: clearQuestItemDone,
    migrateQuestItemDoneFromStorage: migrateQuestItemDoneFromStorage,
    bindRefresh: bindRefresh,
    flushRefresh: flushRefresh
  };
})(typeof window !== "undefined" ? window : globalThis);
