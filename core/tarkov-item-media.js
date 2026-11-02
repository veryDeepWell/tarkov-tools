/*! TarkovItemMedia — consistent item names and previews */
(function (global) {
  "use strict";

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function isWeapon(item) {
    if (!item || typeof item !== "object") return false;
    var p = asObject(item.properties) || {};
    var types = Array.isArray(item.types) ? item.types : (item.types ? [item.types] : []);
    return p.propertiesType === "ItemPropertiesWeapon" || types.indexOf("gun") >= 0 || types.indexOf("weapon") >= 0;
  }

  function firstUrl(values) {
    for (var i = 0; i < values.length; i++) {
      var value = values[i];
      if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) return value.trim();
    }
    return "";
  }

  function icon(item) {
    if (!item || typeof item !== "object") return "";
    var p = asObject(item.properties) || {};
    var preset = defaultPreset(item);
    if (isWeapon(item)) {
      // Prefer the default preset so base weapons look like the standard playable gun,
      // not the bare receiver/base item supplied as the small icon.
      var presetIcon = firstUrl(preset ? [
        preset.image512pxLink, preset.baseImageLink, preset.imageLink,
        preset.gridImageLink, preset.iconLink
      ] : []);
      if (presetIcon) return presetIcon;
    }
    return firstUrl([
      item.displayIconLink,
      item.iconLink,
      item.gridImageLink,
      item.image512pxLink,
      item.imageLink,
      item.baseImageLink
    ]);
  }

  function name(item) {
    return global.TarkovNames ? TarkovNames.display(item) : TarkovData.label("item", item);
  }
  function defaultPreset(item) {
    var ref = item && ((item.properties || {}).defaultPreset || item.defaultPreset);
    return asObject(ref) || (ref && global.TarkovData && TarkovData.get("item",ref)) || null;
  }

  function decorate(item) {
    if (!item || typeof item !== "object") return item;
    var copy = Object.assign({}, item);
    var iconUrl = icon(item);
    var preset = isWeapon(item) && defaultPreset(item);
    if (preset) { copy.displayWidth=preset.width||item.width;copy.displayHeight=preset.height||item.height; }
    if (iconUrl) {
      copy.displayIconLink = iconUrl;
      // This project historically renders iconLink throughout its UI. Keep that contract,
      // but retain the upstream value for tools that need it explicitly.
      if (isWeapon(item) && iconUrl !== item.iconLink) copy.sourceIconLink = item.iconLink || "";
      copy.iconLink = iconUrl;
    }
    copy.displayName = name(item);
    return copy;
  }

  global.TarkovItemMedia = {
    __v: 1,
    isWeapon: isWeapon,
    icon: icon,
    name: name,
    defaultPreset: defaultPreset,
    decorate: decorate
  };
})(typeof window !== "undefined" ? window : globalThis);
