/*! Shared price alarm rules for dashboard and live tool. */
(function (global) {
  "use strict";
  var KEY = "tarkovPriceAlarmRules";
  function uid() { return "alarm_" + Date.now().toString(36) + Math.random().toString(36).slice(2); }
  function save(rules, quiet) {
    var list = rules.map(function (r) { return Object.assign({}, r, { ruleId: r.ruleId || uid() }); });
    TarkovSchema.writeJson(KEY, { _v: 1, rules: list });
    if (!quiet && global.dispatchEvent) global.dispatchEvent(new CustomEvent("tt-alerts-changed"));
    return list;
  }
  function read() {
    var doc = TarkovSchema.readJson(KEY, 1, { listKey: "rules" });
    var rules = TarkovSchema.listOf(doc, "rules");
    var legacy = global.TarkovState && TarkovState.get().alerts;
    var changed = false;
    if (legacy && Array.isArray(legacy.prices) && legacy.prices.length) {
      legacy.prices.forEach(function (r) {
        var op = r.dir === "above" ? ">=" : "<=";
        if (!rules.some(function (x) { return x.q === r.slug && Number(x.threshold) === Number(r.target) && x.op === op; })) {
          rules.push({ q: r.slug, id: "", threshold: Number(r.target), op: op, metric: "avg", ruleId: uid() });
        }
      });
      // Persist before removing the old document's rules.
      save(rules, true);
      TarkovState.set({ alerts: { prices: [] } });
    }
    rules.forEach(function (r) { if (!r.ruleId) { r.ruleId = uid(); changed = true; } });
    if (changed) save(rules, true);
    return rules;
  }
  global.TarkovAlerts = { read: read, save: save, add: function (rule) {
    return save(read().concat([Object.assign({}, rule, { ruleId: uid() })]));
  }, remove: function (id) { return save(read().filter(function (r) { return r.ruleId !== id; })); } };
})(typeof window !== "undefined" ? window : globalThis);
