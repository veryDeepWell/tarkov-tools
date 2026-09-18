/*! TarkovIcons — custom icon architecture
 *
 * Priority for a tool card / mini-chip:
 *   1. catalog entry .iconUrl (absolute or relative)
 *   2. TarkovIcons.register(id, url)
 *   3. assets/icons/{iconId}.svg if TarkovIcons.useAssetFolder = true
 *   4. emoji fallback
 *
 * How to add custom art later:
 *   - Drop files into assets/icons/ using icon id from catalog
 *     e.g. assets/icons/price-track.svg
 *   - Set TarkovIcons.useAssetFolder = true (e.g. in hub after load)
 *   - Or set "iconUrl": "assets/icons/my.png" on a CATALOG item
 *   - Optional: TarkovIcons.register("price-track", "assets/icons/x.svg")
 */
(function (global) {
  "use strict";

  var EMOJI = [
    [/btc|bitcoin/i, "₿"], [/cultist/i, "⛧"], [/my-tarkov/i, "👤"],
    [/helmet/i, "🪖"], [/nvg/i, "🌑"], [/price-track/i, "📈"], [/price-alarm/i, "🔔"],
    [/food/i, "🍖"], [/random-loadout/i, "🎲"], [/loadout-budget/i, "💰"],
    [/loadout-builder/i, "🧰"], [/drip-builder/i, "🎨"], [/drip-loadout/i, "✨"],
    [/ammo/i, "🔫"], [/armor/i, "🛡️"], [/barter/i, "🧮"], [/boss/i, "👹"],
    [/compare/i, "⚖️"], [/container/i, "🎒"], [/craft/i, "🔧"], [/drip/i, "🕶️"],
    [/gun/i, "🛠️"], [/hideout/i, "🏗️"], [/key/i, "🔑"], [/lang/i, "🌐"],
    [/loot/i, "📦"], [/item-use/i, "💡"], [/mag/i, "📟"], [/medkit|med/i, "💊"],
    [/mods/i, "🔩"], [/plate/i, "🧱"], [/quest/i, "📜"], [/raid/i, "✅"],
    [/restock/i, "⏰"], [/scope/i, "🔭"], [/short/i, "🏷️"], [/skill/i, "📈"],
    [/stim/i, "💉"], [/streamer/i, "📺"], [/trader/i, "🏪"]
  ];

  var BASE = (function(){
    try {
      if (location.pathname.indexOf("/tools/") >= 0) return "../assets/icons/";
    } catch (e) {}
    return "assets/icons/";
  })();
  var registry = Object.create(null);
  var missing = Object.create(null);

  function iconIdFromFile(file) {
    if (!file) return "";
    var f = String(file).split("/").pop();
    if (typeof CATALOG !== "undefined") {
      for (var i = 0; i < CATALOG.length; i++) {
        if (CATALOG[i].file === f && CATALOG[i].icon) return CATALOG[i].icon;
      }
    }
    return f.replace(/^tarkovtool-/, "").replace(/\.html$/, "");
  }

  function emojiFor(file, title) {
    var hay = (file || "") + " " + (title || "");
    for (var i = 0; i < EMOJI.length; i++) {
      if (EMOJI[i][0].test(hay)) return EMOJI[i][1];
    }
    return "📎";
  }

  function catalogEntry(file) {
    if (typeof CATALOG === "undefined") return null;
    var f = String(file || "").split("/").pop();
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].file === f) return CATALOG[i];
    }
    return null;
  }

  function resolveUrl(file, title) {
    var entry = catalogEntry(file);
    if (entry && entry.iconUrl) return entry.iconUrl;
    var id = (entry && entry.icon) || iconIdFromFile(file);
    if (id && registry[id]) return registry[id];
    if (global.TarkovIcons && TarkovIcons.useAssetFolder && id && !missing[id]) {
      return BASE + id + ".svg";
    }
    return null;
  }

  function imgTag(url, emoji) {
    return (
      '<img class="tt-icon-img" src="' +
      url +
      '" alt="" width="28" height="28" loading="lazy" ' +
      'onerror="this.onerror=null;this.replaceWith(document.createTextNode(\'' +
      emoji.replace(/'/g, "") +
      "'));\" />"
    );
  }

  function html(file, title) {
    var emo = emojiFor(file, title);
    var url = resolveUrl(file, title);
    if (url) return imgTag(url, emo);
    return emo;
  }

  function register(id, url) {
    if (!id) return;
    registry[String(id)] = url;
    delete missing[String(id)];
  }

  global.TarkovIcons = {
    useAssetFolder: false,
    html: html,
    emoji: emojiFor,
    resolve: resolveUrl,
    register: register,
    markMissing: function (id) { if (id) missing[String(id)] = true; },
    basePath: BASE,
    resetCache: function () { missing = Object.create(null); }
  };
})(typeof window !== "undefined" ? window : globalThis);
