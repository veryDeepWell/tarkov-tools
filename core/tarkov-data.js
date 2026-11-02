/*! TarkovData — application entity contract. No network, DOM, or persistence. */
(function (global) {
  "use strict";
  var stores = new Map();
  var kinds = { items: "item", questItems: "questItem", tasks: "quest", prestige: "prestige", traders: "trader", maps: "map", hideout: "station", crafts: "craft", barters: "barter" };
  var missing = {
    ru: { item: "Неизвестный предмет", quest: "Неизвестное задание", trader: "Неизвестный торговец", map: "Неизвестная карта", station: "Неизвестная станция", craft: "Рецепт", barter: "Бартер", entity: "Название недоступно" },
    en: { item: "Unknown item", quest: "Unknown task", trader: "Unknown trader", map: "Unknown map", station: "Unknown station", craft: "Craft", barter: "Barter", entity: "Name unavailable" }
  };
  function mode(value) { return /^(regular|pvp|pvp-season)$/.test(value) ? "regular" : "pve"; }
  function scope(options) {
    options = options || {};
    var m = options.mode;
    if (!m && global.TarkovProfile) m = global.TarkovProfile.preferredGameMode();
    if (!m && global.TarkovStorage) m = global.TarkovStorage.get("tarkovPreferredGameMode", "pve");
    var lang = options.lang;
    if (!lang && global.TarkovI18n && global.TarkovI18n.lang) lang = global.TarkovI18n.lang();
    if (!lang && global.TarkovStorage) lang = global.TarkovStorage.get("tarkovLang", "en");
    return { mode: mode(m), lang: lang || "en" };
  }
  function bucket(options) {
    var s = scope(options), key = s.mode + ":" + s.lang;
    if (!stores.has(key)) stores.set(key, new Map());
    return stores.get(key);
  }
  function kind(value) { return kinds[value] || value || "entity"; }
  function id(ref) {
    if (typeof ref === "string" || typeof ref === "number") return String(ref);
    return ref && (ref.id || ref.itemId || id(ref.item)) || "";
  }
  function technical(value) {
    return typeof value !== "string" || !value.trim() ||
      /\b[a-f0-9]{24}\b|^[a-f0-9]{20,}$|^[a-f0-9]{8}-[a-f0-9]{4}-|^…[a-f0-9]{6}$|^hideout_area_/i.test(value.trim());
  }
  function humanize(value) {
    return technical(value) ? "" : String(value).replace(/[-_]+/g, " ").replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }
  function fallback(type, options) {
    var s = scope(options), labels = missing[s.lang] || missing.en;
    return labels[kind(type)] || labels.entity;
  }
  function get(type, ref, options) {
    var table = bucket(options).get(kind(type));
    var questItems = kind(type) === "item" && bucket(options).get("questItem");
    return table && table.get(id(ref)) || questItems && questItems.get(id(ref)) || null;
  }
  function resolve(type, ref, options) {
    type = kind(type);
    var found = get(type, ref, options);
    var object = ref && typeof ref === "object" ? ref : null;
    var value = object && object.labelSource !== "missing" && (!technical(object.name) || !technical(object.shortName)) ? object : found || object;
    var fields = options && options.full ? ["name", "shortName", "displayName"] : ["shortName", "name", "displayName"];
    var label = "", source = "missing";
    for (var i = 0; value && value.labelSource !== "missing" && i < fields.length; i++) {
      if (!technical(value[fields[i]])) { label = value[fields[i]]; source = fields[i]; break; }
    }
    if (!label && value) { label = humanize(value.normalizedName || value.slug); if (label) source = "slug"; }
    if (!label && typeof ref === "string" && !technical(ref)) { label = humanize(ref); source = "literal"; }
    return { id: id(ref), kind: type, label: label || fallback(type, options), resolved: !!label, source: source };
  }
  function label(type, ref, options) { return resolve(type, ref, options).label; }
  function list(kindName, payload) {
    if (!(kindName in kinds)) throw Error("Unknown dataset: " + kindName);
    var data = payload && Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
    if (data && !Array.isArray(data) && Object.prototype.hasOwnProperty.call(data, kindName)) data = data[kindName];
    if (!data || typeof data !== "object") throw Error("Invalid " + kindName + " dataset: expected a collection");
    if (Array.isArray(data)) return data;
    var values = Object.values(data);
    // Never accidentally return another array (categories, goonReports, etc.).
    if (values.some(function (v) { return !v || typeof v !== "object" || Array.isArray(v); }))
      throw Error("Invalid " + kindName + " dataset shape");
    return values;
  }
  function ingest(kindName, payload, options) {
    var type = kind(kindName), input = list(kindName, payload), table = new Map(), warnings = [];
    var companion = kindName === "tasks" && payload && payload.data && payload.data.questItems;
    if (companion) ingest("questItems", companion, Object.assign({}, options, { publish: false }));
    var output = input.map(function (raw, index) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || !id(raw))
        throw Error("Invalid " + kindName + " record at " + index + ": missing ID");
      if (table.has(id(raw))) throw Error("Duplicate " + type + " ID: " + id(raw));
      // Consumers own these copies; no tool may mutate the transport cache or registry.
      var entity = JSON.parse(JSON.stringify(raw));
      // Use only the incoming record, never a previous catalogue version.
      var name = !technical(entity.name) ? entity.name : humanize(entity.normalizedName || entity.slug);
      var short = !technical(entity.shortName) ? entity.shortName : name;
      if (!name) {
        name = fallback(type, options);
        // Recipe/barter records are relations and have no upstream name field.
        if (type !== "craft" && type !== "barter") warnings.push({ id: id(entity), reason: "missing-name" });
      }
      entity.name = name;
      if (Object.prototype.hasOwnProperty.call(entity, "shortName") || type === "item") entity.shortName = short || name;
      if (technical(entity.description)) entity.description = "";
      entity.displayName = short || name;
      entity.labelSource = !technical(raw.name) ? "name" : (humanize(raw.normalizedName || raw.slug) ? "slug" : "missing");
      if (type === "item" && entity.properties && entity.properties.stimEffects && !entity.properties.stimulatorBuffs)
        entity.properties.stimulatorBuffs = entity.properties.stimEffects;
      table.set(id(entity), JSON.parse(JSON.stringify(entity)));
      return entity;
    });
    if (!options || options.publish !== false) {
      var store = bucket(options);
      store.set(type, table);
      store.set(type + ":status", { state: output.length ? "ready" : "empty", count: output.length, warnings: warnings });
      if (companion) ingest("questItems", companion, options);
    }
    return output;
  }
  function status(type, options) {
    var value = bucket(options).get(kind(type) + ":status");
    return value ? JSON.parse(JSON.stringify(value)) : { state: "idle", count: 0, warnings: [] };
  }
  function clear() { stores.clear(); }
  function setStatus(type, state, options, error) {
    var previous = status(type, options);
    bucket(options).set(kind(type) + ":status", { state: state, count: previous.count, warnings: previous.warnings, error: error ? String(error.message || error) : null });
  }
  // A load transaction may publish only while both its generation and context match.
  function latest() {
    var generation = 0;
    return { begin: function (options) {
      var version = ++generation, captured = scope(options);
      return { context: captured, active: function () { return version === generation; }, current: function (now) {
        var active = scope(now);
        return version === generation && active.mode === captured.mode && active.lang === captured.lang;
      } };
    }, invalidate: function () { generation++; } };
  }
  global.TarkovData = { scope: scope, id: id, kind: kind, label: label, resolve: resolve, get: function (type, ref, options) {
    var entity = get(type, ref, options); return entity ? JSON.parse(JSON.stringify(entity)) : null;
  }, ingest: ingest, status: status, setStatus: setStatus, technical: technical, humanize: humanize, clear: clear, latest: latest };
})(typeof window !== "undefined" ? window : globalThis);
