/*! TarkovTableTool — unified load → map → sort → paint for item tables
 * Tools differ only by fetch/mapItem/columns; shell is shared.
 */
(function (global) {
  "use strict";
  if (global.TarkovTableTool && global.TarkovTableTool.__v >= 1) return;

  function $(sel, root) {
    if (!sel) return null;
    if (typeof sel !== "string") return sel;
    return (root || document).querySelector(sel);
  }

  function esc(s) {
    if (global.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtNum(n) {
    if (n == null || n === "" || !isFinite(Number(n))) return "—";
    if (global.TarkovDicts && TarkovDicts.fmtNum) return TarkovDicts.fmtNum(n);
    return Math.round(Number(n)).toLocaleString("ru-RU");
  }

  function itemName(it) {
    try {
      if (global.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    if (!it) return "";
    if (typeof it === "string") return it;
    return String(it.shortName || it.name || it.normalizedName || it.id || "").trim();
  }

  function modeValue(sel) {
    var el = $(sel);
    return (el && el.value) || "pve";
  }

  function setStatus(el, msg, tone) {
    if (!el) return;
    el.textContent = msg || "";
    el.className = "status" + (tone ? " " + tone : "");
  }

  /**
   * @param {object} opts
   * @param {string|Element} opts.tbody
   * @param {string|Element} [opts.thead] — if set, columns rendered into thead
   * @param {string|Element} [opts.status]
   * @param {string|Element} [opts.loadBtn]
   * @param {string|Element} [opts.search]
   * @param {string} [opts.modeSelect='#gameMode']
   * @param {Array} opts.columns — { key, label, sort?, align?, html?(row), text?(row), format?:'num'|'fixed2' }
   * @param {function(mode, api): Promise<any>} opts.fetch
   * @param {function(item, ctx): object|null} opts.mapItem — return row or null to skip
   * @param {function(row, q): boolean} [opts.filterRow]
   * @param {string} [opts.defaultSort]
   * @param {number} [opts.defaultSortDir] -1|1
   * @param {boolean} [opts.progress]
   * @param {boolean} [opts.autoLoad=true] — set false when the tool owns loadBtn.onclick
   * @param {function(rows, ctx)} [opts.afterPaint]
   * @param {function(ctx)} [opts.onLoaded]
   */
  function create(opts) {
    opts = opts || {};
    var columns = opts.columns || [];
    var sortKey = opts.defaultSort || (columns[0] && columns[0].key) || "name";
    var sortDir = opts.defaultSortDir != null ? opts.defaultSortDir : -1;
    var rows = [];
    var tbody = $(opts.tbody);
    var thead = $(opts.thead);
    var status = $(opts.status || "#status");
    var loadBtn = $(opts.loadBtn || "#loadBtn");
    var search = $(opts.search || "#q");
    var modeSel = opts.modeSelect || "#gameMode";

    function paintHead() {
      if (!thead || !columns.length) return;
      var tr = thead.querySelector("tr") || document.createElement("tr");
      if (!tr.parentNode) thead.appendChild(tr);

      // R3.16 retained localized table labels in HTML but removed the generated
      // header IDs. Prefer a matching existing header label, then fall back to
      // the tool's configured label. Header order always follows the data columns.
      var labelsByKey = Object.create(null);
      thead.querySelectorAll("th").forEach(function (th) {
        var key = th.getAttribute("data-k") || th.getAttribute("data-s");
        var label = (th.textContent || "").trim();
        if (key && label && !labelsByKey[key]) labelsByKey[key] = label;
      });

      tr.innerHTML = columns
        .map(function (c) {
          var sk = c.sort === false ? "" : ' data-k="' + esc(c.key) + '" style="cursor:pointer"';
          var label = labelsByKey[c.key] || c.label || c.key;
          return "<th" + sk + ">" + esc(label) + "</th>";
        })
        .join("");
      tr.querySelectorAll("th[data-k]").forEach(function (th) {
        th.onclick = function () {
          var k = th.getAttribute("data-k");
          if (sortKey === k) sortDir *= -1;
          else {
            sortKey = k;
            sortDir = -1;
          }
          paint();
        };
      });
    }

    function cellHtml(col, row) {
      if (typeof col.html === "function") return col.html(row, { esc: esc, fmtNum: fmtNum, itemName: itemName });
      var v = typeof col.text === "function" ? col.text(row) : row[col.key];
      if (col.format === "num") return fmtNum(v);
      if (col.format === "fixed2")
        return v == null || !isFinite(Number(v)) ? "—" : Number(v).toFixed(2);
      if (v == null || v === "") return "—";
      return esc(String(v));
    }

    function defaultFilter(row, q) {
      if (!q) return true;
      var hay = (row.name || "") + " " + (row.slug || "") + " " + (row.id || "");
      return hay.toLowerCase().indexOf(q) >= 0;
    }

    function paint() {
      if (!tbody) return;
      var q = (search && search.value ? search.value : "").toLowerCase().trim();
      var filterFn = opts.filterRow || defaultFilter;
      var list = rows.filter(function (r) {
        return filterFn(r, q);
      });
      list.sort(function (a, b) {
        var va = a[sortKey];
        var vb = b[sortKey];
        if (typeof va === "string" || typeof vb === "string")
          return sortDir * String(va || "").localeCompare(String(vb || ""), "ru");
        return sortDir * ((Number(va) || 0) - (Number(vb) || 0));
      });
      tbody.innerHTML = list
        .map(function (row) {
          return (
            "<tr>" +
            columns
              .map(function (c) {
                var align = c.align ? ' style="text-align:' + c.align + '"' : "";
                return "<td" + align + ">" + cellHtml(c, row) + "</td>";
              })
              .join("") +
            "</tr>"
          );
        })
        .join("");
      if (typeof opts.afterPaint === "function") {
        try {
          opts.afterPaint(list, { tbody: tbody, esc: esc });
        } catch (eA) {
          try {
            console.debug && console.debug("[tt:table]", eA);
          } catch (_tt) {}
        }
      }
    }

    async function load() {
      if (!global.TarkovAPI) {
        setStatus(status, "TarkovAPI missing", "err");
        return;
      }
      if (loadBtn) loadBtn.disabled = true;
      var progress = opts.progress !== false && global.TarkovUI && TarkovUI.progress;
      if (progress) {
        try {
          progress.start({
            label:
              global.TarkovI18n && TarkovI18n.t
                ? TarkovI18n.t("common.loading")
                : "Loading…",
            indeterminate: true
          });
        } catch (e0) {}
      }
      setStatus(status, "…");
      try {
        var mode = modeValue(modeSel);
        var data = await opts.fetch(mode, global.TarkovAPI);
        rows = [];
        var list = Array.isArray(data) ? data : data && data.items ? data.items : [];
        var ctx = { mode: mode };
        list.forEach(function (it) {
          var row = opts.mapItem(it, ctx);
          if (row) rows.push(row);
        });
        if (progress) {
          try {
            progress.done("OK");
          } catch (e1) {}
        }
        setStatus(status, "OK · " + rows.length, "ok");
        if (typeof opts.onLoaded === "function") opts.onLoaded({ rows: rows, mode: mode });
        paint();
      } catch (e) {
        if (progress) {
          try {
            progress.fail(e && e.message ? e.message : "Error");
          } catch (e2) {}
        }
        setStatus(status, e && e.message ? e.message : String(e), "err");
      } finally {
        if (loadBtn) loadBtn.disabled = false;
      }
    }

    paintHead();

    // Some tools own their full load pipeline (multiple API requests, custom
    // normalization, progress and error handling). They opt out with autoLoad:false
    // to avoid running this generic empty/default loader on the same click.
    if (loadBtn && opts.autoLoad !== false) {
      loadBtn.addEventListener("click", function () {
        load();
      });
    }
    if (search) {
      search.addEventListener("input", function () {
        paint();
      });
    }

    // profile wire
    function bindProfile() {
      try {
        if (global.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
        else if (global.TarkovProfile && TarkovProfile.bindGameMode)
          TarkovProfile.bindGameMode(
            typeof modeSel === "string" ? modeSel.replace(/^#/, "") : "gameMode",
            { fallback: "pve" }
          );
      } catch (e) {}
    }
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", bindProfile);
    else bindProfile();

    global.render = function () {
      try {
        if (global.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
      } catch (e0) {}
      try {
        paint();
      } catch (e1) {}
    };
    if (global.TarkovProfile && TarkovProfile.bindRefresh) {
      TarkovProfile.bindRefresh(function () {
        global.render();
      });
    }

    return {
      load: load,
      paint: paint,
      getRows: function () {
        return rows.slice();
      },
      setRows: function (r) {
        rows = r || [];
        paint();
      },
      esc: esc,
      fmtNum: fmtNum,
      itemName: itemName
    };
  }

  /** Standard name cell with optional icon + meta slug */
  function nameCell(row, helpers) {
    helpers = helpers || {};
    row = row || {};
    var e = helpers.esc || esc;
    var raw = row.item || row.rawItem || row.raw || row;
    var itemId = String((raw && raw.id) || row.itemId || row.id || "");
    var catalogueItem = null;
    try {
      var catalogue = global.TarkovItemCatalog || {};
      var modeEl = document.getElementById("gameMode");
      var selectedMode = modeEl && modeEl.value || (global.TarkovProfile && TarkovProfile.preferredMode ? TarkovProfile.preferredMode() : "pve");
      var modeOrder = [selectedMode, "pve", "regular", "pvp-season"];
      var ids = [String((raw && raw.id) || ""), String(row.itemId || ""), String(row.id || "")].filter(Boolean);
      for (var mi = 0; mi < modeOrder.length && !catalogueItem; mi++) {
        var map = catalogue[modeOrder[mi]];
        if (!map) continue;
        for (var ii = 0; ii < ids.length; ii++) {
          if (map[ids[ii]]) { catalogueItem = map[ids[ii]]; break; }
        }
      }
    } catch (eLookup) {}
    var imageSource = raw;
    var sourcePreset = imageSource && imageSource.properties && imageSource.properties.defaultPreset;
    var cataloguePreset = catalogueItem && catalogueItem.properties && catalogueItem.properties.defaultPreset;
    // A light row may retain a stale/base icon but omit the weapon preset. Prefer
    // the full canonical object in that case so M4A1 and similar weapons show the
    // standard configured weapon, not the bare receiver.
    if (catalogueItem && (!imageSource || !imageSource.properties || (!sourcePreset && cataloguePreset))) {
      imageSource = catalogueItem;
    }
    var iconUrl = "";
    try {
      if (global.TarkovItemMedia && TarkovItemMedia.icon) iconUrl = TarkovItemMedia.icon(imageSource);
    } catch (e0) {}
    iconUrl = iconUrl || row.icon || row.displayIconLink || row.iconLink || row.gridImageLink || "";
    if (!iconUrl && catalogueItem) {
      try { if (global.TarkovItemMedia && TarkovItemMedia.icon) iconUrl = TarkovItemMedia.icon(catalogueItem); } catch (e1) {}
      iconUrl = iconUrl || catalogueItem.displayIconLink || catalogueItem.iconLink || catalogueItem.gridImageLink || catalogueItem.image512pxLink || "";
    }
    var fallbackIcon = (global.location && String(location.pathname).indexOf("/tools/") >= 0)
      ? "../assets/icons/other.svg" : "assets/icons/other.svg";
    if (!iconUrl) iconUrl = fallbackIcon;
    itemId = String((catalogueItem && catalogueItem.id) || itemId);
    var canonicalName = catalogueItem && global.TarkovItemMedia && TarkovItemMedia.name
      ? TarkovItemMedia.name(catalogueItem) : "";
    var itemNameValue = canonicalName || row.name ||
      (global.TarkovItemMedia && TarkovItemMedia.name ? TarkovItemMedia.name(raw) : "") || "";
    var itemAttr = itemId ? ' data-item-id="' + e(itemId) + '" data-item-name="' + e(itemNameValue) + '"' : "";
    var meta = row.slug || row.normalizedName || row.id || "";
    return (
      '<div class="name-cell tt-inspectable-item"' + itemAttr +
      ' title="Двойной клик — карточка предмета · Alt+I — режим инспектора">' +
      '<img class="ico" src="' + e(iconUrl) + '" data-fallback="' + e(fallbackIcon) + '" loading="lazy" alt="" onerror="this.onerror=null;this.src=this.dataset.fallback">' +
      '<div><div class="name">' + e(itemNameValue) + '</div><div class="meta">' + e(meta) + '</div></div></div>'
    );
  }

  function copyBtn(text, helpers) {
    var e = (helpers && helpers.esc) || esc;
    return (
      '<button type="button" class="copy-btn" data-n="' +
      e(text || "") +
      '">копир.</button>'
    );
  }

  function wireCopyButtons(tbody) {
    if (!tbody) return;
    tbody.querySelectorAll(".copy-btn").forEach(function (b) {
      b.onclick = function () {
        try {
          navigator.clipboard.writeText(b.getAttribute("data-n") || "");
        } catch (err) {}
      };
    });
  }

  global.TarkovTableTool = {
    __v: 1,
    create: create,
    nameCell: nameCell,
    copyBtn: copyBtn,
    wireCopyButtons: wireCopyButtons,
    itemName: itemName,
    esc: esc,
    fmtNum: fmtNum
  };
})(typeof window !== "undefined" ? window : globalThis);
