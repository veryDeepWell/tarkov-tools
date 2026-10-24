/*! TarkovItemInspector — lightweight item card available across tools */
(function (global) {
  "use strict";
  if (global.TarkovItemInspector && global.TarkovItemInspector.__v >= 1) return;

  var enabled = false;
  var itemsByMode = Object.create(null);
  var loadingByMode = Object.create(null);
  var dialog = null;
  var toggle = null;
  var status = null;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function mode() {
    var el = document.getElementById("gameMode");
    var value = el && el.value;
    if (value && /^(pve|regular|pvp-season)$/.test(value)) return value;
    try {
      if (global.TarkovProfile && TarkovProfile.preferredMode) {
        value = TarkovProfile.preferredMode();
        if (/^(pve|regular|pvp-season)$/.test(value)) return value;
      }
    } catch (e) {}
    return "pve";
  }

  function displayName(item, fallback) {
    try {
      if (global.TarkovItemMedia && TarkovItemMedia.name) return TarkovItemMedia.name(item);
      if (global.TarkovNames && TarkovNames.display) return TarkovNames.display(item);
    } catch (e) {}
    return String((item && (item.shortName || item.name || item.normalizedName || item.id)) || fallback || "Неизвестный предмет");
  }

  function iconUrl(item, target) {
    try {
      if (global.TarkovItemMedia && TarkovItemMedia.icon) {
        var resolved = TarkovItemMedia.icon(item);
        if (resolved) return resolved;
      }
    } catch (e) {}
    if (item && (item.iconLink || item.gridImageLink || item.image512pxLink)) return item.iconLink || item.gridImageLink || item.image512pxLink;
    var image = target && target.querySelector ? target.querySelector("img") : null;
    return image && image.getAttribute("src") || "";
  }

  function formatNumber(value) {
    var n = Number(value);
    return isFinite(n) ? Math.round(n).toLocaleString("ru-RU") : "—";
  }

  function currentData() {
    var value = mode();
    if (itemsByMode[value]) return Promise.resolve(itemsByMode[value]);
    if (loadingByMode[value]) return loadingByMode[value];
    if (!global.TarkovAPI || typeof TarkovAPI.items !== "function") {
      return Promise.reject(new Error("TarkovAPI недоступен на этой странице"));
    }
    loadingByMode[value] = Promise.resolve(TarkovAPI.items(value)).then(function (rows) {
      var map = Object.create(null);
      (Array.isArray(rows) ? rows : []).forEach(function (item) {
        if (item && item.id) map[String(item.id)] = item;
      });
      itemsByMode[value] = map;
      return map;
    }).finally(function () {
      delete loadingByMode[value];
    });
    return loadingByMode[value];
  }

  function sizeText(item) {
    if (!item) return "";
    var w = Number(item.width) || 0;
    var h = Number(item.height) || 0;
    return w > 0 && h > 0 ? w + "×" + h : "";
  }

  function statsFor(item) {
    var p = item && item.properties && typeof item.properties === "object" ? item.properties : {};
    var fields = [
      ["Калибр", p.caliber], ["Урон", p.damage], ["Пробитие", p.penetrationPower],
      ["Урон по броне", p.armorDamage], ["Класс защиты", p.class], ["Прочность", p.durability],
      ["Вместимость", p.capacity], ["Эргономика", p.ergonomics], ["Вертикальная отдача", p.recoilVertical],
      ["Скорострельность", p.fireRate], ["Начальная скорость", p.initialSpeed], ["Энергия", p.energy],
      ["Гидратация", p.hydration], ["Длительность", p.duration], ["Количество применений", p.uses],
      ["Интенсивность", p.intensity], ["Шум", p.noiseIntensity]
    ];
    var result = [];
    fields.forEach(function (entry) {
      var value = entry[1];
      if (value == null || value === "" || typeof value === "object") return;
      if (typeof value === "number" && !isFinite(value)) return;
      result.push({ label: entry[0], value: typeof value === "number" ? String(value) : String(value) });
    });
    if (item && item.weight != null && Number(item.weight) > 0) {
      result.push({ label: "Вес", value: String(item.weight) + " кг" });
    }
    var stack = Number(item && item.stackMaxSize) || 0;
    if (stack > 1) result.push({ label: "Размер стака", value: String(stack) });
    return result.slice(0, 10);
  }

  function fullCardUrl(id) {
    var path = location.pathname || "";
    var base = path.indexOf("/tools/") >= 0 ? "tarkovtool-item-card.html" : "tools/tarkovtool-item-card.html";
    var qs = "?item=" + encodeURIComponent(id) + "&mode=" + encodeURIComponent(mode());
    return base + qs;
  }

  function injectCss() {
    if (document.getElementById("tt-item-inspector-css")) return;
    var style = document.createElement("style");
    style.id = "tt-item-inspector-css";
    style.textContent = [
      ".tt-inspector-toggle{position:fixed;right:16px;bottom:16px;z-index:290;background:var(--card,#171a21);color:var(--text,#e8eaed);border:1px solid var(--border,#333);border-radius:999px;padding:9px 13px;font:600 .78rem/1.1 inherit;box-shadow:0 5px 18px rgba(0,0,0,.24);cursor:pointer}",
      ".tt-inspector-toggle[aria-pressed=true]{border-color:var(--accent,#c9a227);color:var(--accent,#c9a227);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent,#c9a227) 16%,transparent)}",
      ".tt-item-inspector{width:min(680px,94vw);max-width:680px;max-height:86vh;overflow:auto;padding:0;background:var(--card,#171a21);color:var(--text,#e8eaed);border:1px solid var(--border,#333);border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.55)}",
      ".tt-item-inspector::backdrop{background:rgba(0,0,0,.68);backdrop-filter:blur(2px)}",
      ".tt-item-inspector[open]{display:block}",
      ".tt-inspector-head{display:flex;align-items:center;gap:14px;padding:18px;border-bottom:1px solid var(--border,#333)}",
      ".tt-inspector-icon{width:76px;height:76px;flex:0 0 76px;object-fit:contain;border-radius:10px;background:var(--input-bg,#0e1116)}",
      ".tt-inspector-title{font-size:1.1rem;font-weight:750;margin:0 0 4px}.tt-inspector-sub{font-size:.76rem;color:var(--muted,#9aa3b2);overflow-wrap:anywhere}",
      ".tt-inspector-close{margin-left:auto;align-self:flex-start;border:1px solid var(--border,#333);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;cursor:pointer}",
      ".tt-inspector-content{padding:16px 18px}.tt-inspector-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px;margin-bottom:14px}",
      ".tt-inspector-stat{background:var(--input-bg,#0e1116);border:1px solid var(--border,#333);border-radius:9px;padding:9px 10px;min-width:0}",
      ".tt-inspector-stat b{display:block;font-size:1rem;overflow-wrap:anywhere}.tt-inspector-stat span{display:block;color:var(--muted,#9aa3b2);font-size:.73rem;margin-top:2px}",
      ".tt-inspector-description{font-size:.88rem;line-height:1.5;color:var(--muted,#9aa3b2);white-space:pre-wrap;max-height:110px;overflow:auto;margin:0 0 14px}",
      ".tt-inspector-footer{display:flex;gap:8px;flex-wrap:wrap;padding:0 18px 18px}.tt-inspector-primary{display:inline-flex;align-items:center;gap:6px;text-decoration:none;background:var(--accent,#c9a227);color:#111;border-radius:8px;padding:9px 12px;font-size:.85rem;font-weight:750}",
      ".tt-inspector-muted{font-size:.85rem;color:var(--muted,#9aa3b2);padding:16px 0}",
      "html.tt-inspector-enabled [data-item-id],html.tt-inspector-enabled .item-row[data-id],html.tt-inspector-enabled .pick-item[data-id],html.tt-inspector-enabled .mod-pick[data-id]{cursor:zoom-in!important;outline-color:var(--accent,#c9a227)}",
      "@media(max-width:520px){.tt-inspector-toggle{right:10px;bottom:10px}.tt-inspector-icon{width:58px;height:58px;flex-basis:58px}.tt-inspector-head{padding:13px}.tt-inspector-content{padding:13px}.tt-inspector-footer{padding:0 13px 13px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function createUi() {
    if (toggle && dialog) return;
    injectCss();
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tt-inspector-toggle";
    toggle.id = "tt-item-inspector-toggle";
    toggle.setAttribute("aria-pressed", "false");
    toggle.title = "Alt+I — включить режим инспектора; двойной клик по предмету открывает карточку";
    toggle.textContent = "⌕ Инспектор: выкл";
    toggle.addEventListener("click", function () { setEnabled(!enabled); });
    document.body.appendChild(toggle);

    dialog = document.createElement("dialog");
    dialog.id = "tt-item-inspector-dialog";
    dialog.className = "tt-item-inspector";
    dialog.innerHTML =
      '<div class="tt-inspector-head"><img class="tt-inspector-icon" alt="" hidden>' +
      '<div style="min-width:0;flex:1"><h2 class="tt-inspector-title">Предмет</h2><div class="tt-inspector-sub"></div></div>' +
      '<button type="button" class="tt-inspector-close" aria-label="Закрыть">×</button></div>' +
      '<div class="tt-inspector-content"><div class="tt-inspector-stats"></div><p class="tt-inspector-description" hidden></p><div class="tt-inspector-muted" hidden></div></div>' +
      '<div class="tt-inspector-footer"><a class="tt-inspector-primary" target="_blank" rel="noopener">Полная карточка ↗</a></div>';
    document.body.appendChild(dialog);
    dialog.querySelector(".tt-inspector-close").addEventListener("click", close);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) close();
    });
    dialog.addEventListener("cancel", function () { close(); });
  }

  function setEnabled(value) {
    enabled = !!value;
    createUi();
    toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    toggle.textContent = enabled ? "⌕ Инспектор: вкл" : "⌕ Инспектор: выкл";
    toggle.title = enabled
      ? "Режим инспектора включён — нажми на предмет; Alt+I выключает"
      : "Alt+I — включить режим инспектора; двойной клик по предмету открывает карточку";
    document.documentElement.classList.toggle("tt-inspector-enabled", enabled);
  }

  function close() {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function render(item, id, fallbackTarget, error) {
    createUi();
    var name = displayName(item, fallbackTarget && fallbackTarget.getAttribute("data-item-name"));
    var image = iconUrl(item, fallbackTarget);
    var title = dialog.querySelector(".tt-inspector-title");
    var sub = dialog.querySelector(".tt-inspector-sub");
    var icon = dialog.querySelector(".tt-inspector-icon");
    var stats = dialog.querySelector(".tt-inspector-stats");
    var desc = dialog.querySelector(".tt-inspector-description");
    var muted = dialog.querySelector(".tt-inspector-muted");
    var full = dialog.querySelector(".tt-inspector-primary");
    title.textContent = name || "Неизвестный предмет";
    sub.textContent = [item && item.normalizedName, id].filter(Boolean).join(" · ");
    if (image) { icon.src = image; icon.hidden = false; }
    else { icon.removeAttribute("src"); icon.hidden = true; }

    var cells = [];
    if (item) {
      var flea = Number(item.lastLowPrice) || Number(item.avg24hPrice) || Number(item.low24hPrice) || 0;
      if (flea > 0) cells.push({ label: "Барахолка", value: formatNumber(flea) + " ₽" });
      if (Number(item.basePrice) > 0) cells.push({ label: "Базовая цена", value: formatNumber(item.basePrice) + " ₽" });
      if (sizeText(item)) cells.push({ label: "Размер", value: sizeText(item) });
      var types = Array.isArray(item.types) ? item.types.join(", ") : String(item.types || "");
      if (types) cells.push({ label: "Категория", value: types });
      statsFor(item).forEach(function (s) { cells.push(s); });
      desc.textContent = String(item.description || "").trim();
      desc.hidden = !desc.textContent;
      muted.hidden = true;
    } else {
      desc.hidden = true;
      muted.hidden = false;
      muted.textContent = error || "Нет данных предмета. Проверь доступность API или открой полную карточку.";
    }
    stats.innerHTML = cells.slice(0, 14).map(function (cell) {
      return '<div class="tt-inspector-stat"><b>' + esc(cell.value) + '</b><span>' + esc(cell.label) + '</span></div>';
    }).join("");
    if (!cells.length && item) {
      muted.hidden = false;
      muted.textContent = "Для этого предмета в текущем ответе API нет дополнительных характеристик.";
    } else if (item) muted.hidden = true;
    full.href = fullCardUrl(id);
    full.setAttribute("aria-label", "Открыть полную карточку: " + name);
    if (typeof dialog.showModal === "function") {
      try { if (!dialog.open) dialog.showModal(); } catch (e) { dialog.setAttribute("open", "open"); }
    } else {
      dialog.setAttribute("open", "open");
      dialog.style.position = "fixed";
      dialog.style.inset = "50% auto auto 50%";
      dialog.style.transform = "translate(-50%,-50%)";
      dialog.style.zIndex = "299";
    }
  }

  async function open(id, target) {
    if (!id) return;
    createUi();
    var placeholder = null;
    var fallbackName = target && target.getAttribute("data-item-name") || "";
    var fallbackIcon = target && target.querySelector ? target.querySelector("img") : null;
    placeholder = { id: id, name: fallbackName, shortName: fallbackName, iconLink: fallbackIcon && fallbackIcon.src || "" };
    // Show immediate feedback; replace the partial view when the API cache resolves.
    render(null, id, target, "Загрузка предмета…");
    try {
      var map = await currentData();
      var item = map[String(id)];
      if (!item) {
        render(null, id, target, "Предмет не найден в каталоге режима " + mode() + ". Можно открыть полную карточку по ID.");
        return;
      }
      render(item, id, target, "");
    } catch (error) {
      render(null, id, target, "Не удалось загрузить предмет: " + (error && error.message || error));
    }
  }

  function targetFor(node) {
    if (!node || !node.closest) return null;
    return node.closest("[data-item-id], .item-row[data-id], .pick-item[data-id], .mod-pick[data-id], .tt-igrid-item[data-id], .suggest [data-id]");
  }

  function idFor(target) {
    if (!target) return "";
    return String(target.getAttribute("data-item-id") || target.getAttribute("data-id") || "");
  }

  function shouldIgnore(target) {
    return !target || !!target.closest("#tt-item-inspector-dialog, #tt-item-inspector-toggle, input, textarea, select, option, [contenteditable=true]");
  }

  function boot() {
    if (!document.body) return;
    createUi();
    document.addEventListener("keydown", function (event) {
      if (event.altKey && !event.ctrlKey && !event.metaKey && String(event.key).toLowerCase() === "i") {
        event.preventDefault();
        setEnabled(!enabled);
      }
      if (event.key === "Escape" && dialog && dialog.open) close();
    });
    document.addEventListener("dblclick", function (event) {
      if (enabled || shouldIgnore(event.target)) return;
      var target = targetFor(event.target);
      var id = idFor(target);
      if (!target || !id) return;
      if (event.target.closest("button, a")) return;
      event.preventDefault();
      open(id, target);
    }, true);
    document.addEventListener("click", function (event) {
      if (!enabled || shouldIgnore(event.target)) return;
      var target = targetFor(event.target);
      var id = idFor(target);
      if (!target || !id) return;
      if (event.target.closest("button, a")) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      open(id, target);
    }, true);
  }

  global.TarkovItemInspector = {
    __v: 1,
    open: open,
    close: close,
    setEnabled: setEnabled,
    toggle: function () { setEnabled(!enabled); },
    isEnabled: function () { return enabled; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
