/*! TarkovStorage — namespaced JSON/string wrapper over localStorage */
(function (global) {
  "use strict";
  if (global.TarkovStorage && global.TarkovStorage.__v >= 2) return;

  var SETTINGS_KEYS = {
    tarkovTheme: "theme",
    tarkovAccent: "accent",
    tarkovLang: "lang",
    tarkovSound: "sound",
    tarkovSoundVolume: "sound-volume",
    tarkovSoundVol: "sound-volume",
    tarkovPreferredGameMode: "game-mode",
    tarkovTips: "tips",
    tarkovToolTips: "tips",
    tarkovHiddenTools: "hidden-tools",
    tarkovCollapsedCats: "collapsed-categories",
    tarkovHubPins: "hub-pins"
  };
  var LEGACY_ALIASES = {
    tarkovShortNames: "tt:tool:shortname:data:overrides",
    tarkovFlipSettings: "tt:tool:trader-flip:data:settings",
    tarkovHelmets: "tt:tool:helmets:data:settings",
    tarkovHideout: "tt:tool:my-tarkov:data:hideout",
    "tarkov.shoppingList.v1": "tt:tool:shopping-list:data:v1",
    tarkov_battle_pass_s1: "tt:tool:battle-pass:data:season-1",
    "tarkovLoadoutPresets.v1": "tt:tool:loadout-builder:data:presets.v1"
  };

  var TOOL_PREFIXES = [
    ["RandomLoadout", "random-loadout"],
    ["LoadoutBuilder", "loadout-builder"],
    ["ShoppingList", "shopping-list"],
    ["StreamerFlip", "streamer-flip"],
    ["TraderFlip", "trader-flip"],
    ["PriceAlarm", "price-alarm"],
    ["PriceTrack", "price-track"],
    ["BattlePass", "battle-pass"],
    ["BarterLive", "barter-live"],
    ["BarterCalc", "barter-calc"],
    ["GunBuilder", "gun-builder"],
    ["HideoutMgmt", "hideout-mgmt"],
    ["RaidChecklist", "raid-checklist"],
    ["QuestItems", "quest-items"],
    ["BtcFarm", "btc-farm"],
    ["MyTarkov", "my-tarkov"],
    ["Localizer", "localizer"],
    ["ShortNames", "shortname"],
    ["Short", "shortname"],
    ["Helmets", "helmets"],
    ["Ammo", "ammo"],
    ["Armor", "armor"],
    ["Restock", "restock"],
    ["Challenge", "challenge"],
    ["Containers", "containers"],
    ["Cultist", "cultist"],
    ["Desk", "desk"],
    ["Food", "food"],
    ["Crafts", "crafts"],
    ["Hideout", "hideout"],
    ["Keys", "keys"],
    ["Loadout", "loadout"],
    ["Mags", "mags"],
    ["Mods", "mods"],
    ["Nvg", "nvg"],
    ["Skills", "skills"],
    ["Stims", "stims"]
  ];

  var LEGACY_UNPREFIXED = {
    restockEnabled: "tt:tool:restock:data:enabled",
    restockHistory: "tt:tool:restock:data:history",
    restockFired: "tt:tool:restock:data:fired",
    restockCycleMs: "tt:tool:restock:data:cycle-ms",
    restockSnapshot: "tt:tool:restock:data:snapshot"
  };

  function kebab(value) {
    return String(value).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }

  function canonicalKey(key) {
    key = String(key == null ? "" : key);
    if (key.indexOf("tt:") === 0) return key;
    if (key.indexOf("ttApi:") === 0) return "tt:api:" + key.slice(6);
    if (Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, key))
      return LEGACY_ALIASES[key];

    if (Object.prototype.hasOwnProperty.call(LEGACY_UNPREFIXED, key))
      return LEGACY_UNPREFIXED[key];
    if (key.indexOf("tarkovPoll.") === 0)
      return "tt:tool:" + key.slice(11) + ":meta";
    if (key === "tarkovNotifications.v1") return "tt:notif:v1";
    if (key === "tarkovMiniTabs.v1") return "tt:mini:v1";
    if (key === "tarkovState.v1") return "tt:state:v1";

    if (Object.prototype.hasOwnProperty.call(SETTINGS_KEYS, key))
      return "tt:settings:" + SETTINGS_KEYS[key];
    if (/^tarkovSound(?:Kind|KindVol|Tool)\./.test(key)) {
      return "tt:settings:" + kebab(key.slice(6));
    }

    var toolKey = key.match(/^tarkovtool-([a-z0-9-]+)-(.+)$/i);
    if (toolKey) return "tt:tool:" + toolKey[1].toLowerCase() + ":data:" + kebab(toolKey[2]);

    var legacy = key.match(/^tarkov([A-Z].*)$/);
    if (!legacy) return key;
    var tail = legacy[1];
    for (var i = 0; i < TOOL_PREFIXES.length; i++) {
      var prefix = TOOL_PREFIXES[i][0];
      if (tail.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
        return "tt:tool:" + TOOL_PREFIXES[i][1] + ":data:" + kebab(tail.slice(prefix.length) || "data");
      }
    }
    return "tt:tool:legacy:data:" + kebab(tail);
  }

  function migrateLegacyKeys() {
    var migrated = 0;
    try {
      var originals = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key) originals.push(key);
      }
      originals.forEach(function (oldKey) {
        var newKey = canonicalKey(oldKey);
        if (newKey === oldKey || newKey.indexOf("tt:") !== 0) return;
        var oldValue = localStorage.getItem(oldKey);
        if (oldValue == null) return;
        if (localStorage.getItem(newKey) == null) localStorage.setItem(newKey, oldValue);
        localStorage.removeItem(oldKey);
        migrated++;
      });
    } catch (e) {
      console.error("Unable to migrate legacy TarkovStorage keys", e);
    }
    return migrated;
  }

  function get(key, def) {
    try {
      var name = String(key);
      var v = localStorage.getItem(canonicalKey(name));
      if (v == null && canonicalKey(name) !== name) v = localStorage.getItem(name);
      return v == null ? def : v;
    } catch (e) {
      return def;
    }
  }

  function set(key, val) {
    try {
      var name = String(key);
      var physical = canonicalKey(name);
      if (val == null) {
        localStorage.removeItem(physical);
        if (name !== physical) localStorage.removeItem(name);
      } else {
        localStorage.setItem(physical, String(val));
        if (name !== physical) localStorage.removeItem(name);
      }
    } catch (e) {
      console.error("Unable to write TarkovStorage key", key, e);
    }
  }

  function remove(key) {
    try {
      var name = String(key);
      localStorage.removeItem(canonicalKey(name));
      if (canonicalKey(name) !== name) localStorage.removeItem(name);
    } catch (e) {
      console.error("Unable to remove TarkovStorage key", key, e);
    }
  }

  function getJson(key, def) {
    try {
      var raw = get(key, null);
      if (raw == null || raw === "") return def;
      return JSON.parse(raw);
    } catch (e) {
      return def;
    }
  }

  function setJson(key, obj) {
    if (obj == null) remove(key);
    else set(key, JSON.stringify(obj));
  }

  function migrateKey(oldKey, newKey) {
    var oldName = canonicalKey(oldKey);
    var newName = canonicalKey(newKey);
    if (oldName === newName) return;
    try {
      var value = localStorage.getItem(newName);
      if (value != null && value !== "") {
        localStorage.removeItem(oldName);
        return;
      }
      value = localStorage.getItem(oldName);
      if (value == null) return;
      localStorage.setItem(newName, value);
      localStorage.removeItem(oldName);
    } catch (e) {
      console.error("Unable to migrate TarkovStorage key", oldKey, newKey, e);
    }
  }

  function keys(prefix) {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf("tt:") !== 0) continue;
        if (prefix && key.indexOf(prefix) !== 0) continue;
        out.push(key);
      }
    } catch (e) {
      console.error("Unable to list TarkovStorage keys", e);
    }
    return out;
  }

  global.TarkovStorage = {
    __v: 2,
    canonicalKey: canonicalKey,
    migrateLegacyKeys: migrateLegacyKeys,
    get: get,
    set: set,
    remove: remove,
    getJson: getJson,
    setJson: setJson,
    migrateKey: migrateKey,
    keys: keys
  };

  migrateLegacyKeys();
})(typeof window !== "undefined" ? window : this);
