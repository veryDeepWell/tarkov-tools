/*! TarkovProfile — PMC profiles as single source of personal progress (1.1) */
(function (global) {
  "use strict";
  if (global.TarkovProfile && global.TarkovProfile.__v >= 1) return;

  var LIST_KEY = "tt:profile:list";
  var ACTIVE_KEY = "tt:profile:active";
  var DATA_PREFIX = "tt:profile:data:";
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
      quests: { completed: [], active: [] },
      prestige: { level: 0, carried: [] },
      notes: { hideout: "" },
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
      active: Array.isArray(p.quests && p.quests.active) ? p.quests.active.slice() : []
    };
    out.prestige = {
      level: Math.max(0, Number(p.prestige && p.prestige.level) || 0) | 0,
      carried: Array.isArray(p.prestige && p.prestige.carried) ? p.prestige.carried.slice() : []
    };
    out.notes = Object.assign({ hideout: "" }, p.notes || {});
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
      try { fn(ev); } catch (err) {}
    });
    try {
      if (bc) bc.postMessage(ev);
    } catch (err) {}
    try {
      if (global.dispatchEvent) {
        global.dispatchEvent(new CustomEvent("tt-profile", { detail: ev }));
      }
    } catch (err) {}
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
        list[i] = { id: p.id, name: p.name, updatedAt: p.meta.updatedAt, level: p.level };
        found = true;
        break;
      }
    }
    if (!found) {
      list.push({ id: p.id, name: p.name, updatedAt: p.meta.updatedAt, level: p.level });
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
        active: patch.quests.active != null ? patch.quests.active : cur.quests.active
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
    try { storage().remove(dataKey(id)); } catch (e) {}
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
    if (!p || !global.TarkovState || !TarkovState.set) return;
    try {
      TarkovState.set({
        player: { level: p.level, gameMode: p.gameMode, name: p.name },
        quests: {
          completed: (p.quests && p.quests.completed) || [],
          active: (p.quests && p.quests.active) || []
        },
        hideout: { notes: (p.notes && p.notes.hideout) || "" }
      });
    } catch (e) {}
    try {
      if (global.TarkovStorage) TarkovStorage.set("tarkovPreferredGameMode", p.gameMode);
    } catch (e) {}
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
    } catch (e) {}
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
        try { fn(ev); } catch (err) {}
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

  global.TarkovProfile = {
    __v: 1,
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
    syncLegacyState: syncLegacyState
  };
})(typeof window !== "undefined" ? window : globalThis);
