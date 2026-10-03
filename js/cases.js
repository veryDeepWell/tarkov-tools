/*! Tarkov — Cases / containers: what fits inside */
(function () {
  "use strict";

  var cases = [];
  var allItems = [];

  function esc(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">");
  }

  function itemName(it) {
    if (!it) return "";
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    return it.shortName || it.name || it.normalizedName || it.id || "";
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("status");
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = msg || "";
  }

  function asArray(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "object") return Object.values(x);
    return [];
  }

  function itemCategoryIds(it) {
    var out = [];
    var cats = it.categories || it.handbookCategories || [];
    cats.forEach(function (c) {
      if (typeof c === "string") out.push(c);
      else if (c && c.id) out.push(c.id);
    });
    if (it.category) {
      if (typeof it.category === "string") out.push(it.category);
      else if (it.category.id) out.push(it.category.id);
    }
    return out;
  }

  function allowedByFilters(it, filters) {
    if (!filters) return true;
    var allowedItems = filters.allowedItems || [];
    var excludedItems = filters.excludedItems || [];
    var allowedCategories = filters.allowedCategories || [];
    var excludedCategories = filters.excludedCategories || [];
    if (excludedItems.indexOf(it.id) >= 0) return false;
    var cats = itemCategoryIds(it);
    for (var i = 0; i < cats.length; i++) {
      if (excludedCategories.indexOf(cats[i]) >= 0) return false;
    }
    if (allowedItems.length && allowedItems.indexOf(it.id) >= 0) return true;
    if (allowedCategories.length) {
      for (var j = 0; j < cats.length; j++) {
        if (allowedCategories.indexOf(cats[j]) >= 0) return true;
      }
      if (!allowedItems.length) return false;
    }
    if (allowedItems.length) return allowedItems.indexOf(it.id) >= 0;
    return true;
  }

  function mapCase(it) {
    var p = it.properties || {};
    if (p.propertiesType !== "ItemPropertiesContainer") return null;
    var grids = asArray(p.grids);
    if (!grids.length) return null;
    var slots = 0;
    grids.forEach(function (g) {
      slots += (Number(g.width) || 0) * (Number(g.height) || 0);
    });
    return {
      id: it.id,
      name: itemName(it),
      slug: it.normalizedName || "",
      icon: it.iconLink || it.gridImageLink || "",
      capacity: p.capacity != null ? p.capacity : slots,
      grids: grids,
      avg: Number(it.avg24hPrice) || 0,
      types: it.types || [],
      raw: it
    };
  }

  function fitsForCase(c) {
    var out = [];
    for (var i = 0; i < allItems.length; i++) {
      var it = allItems[i];
      if (it.id === c.id) continue;
      var ok = false;
      for (var g = 0; g < c.grids.length; g++) {
        var filters = (c.grids[g] && c.grids[g].filters) || null;
        if (allowedByFilters(it, filters)) {
          ok = true;
          break;
        }
      }
      if (ok) out.push(it);
    }
    return out;
  }

  function renderGrid() {
    var q = (document.getElementById("q").value || "").toLowerCase().trim();
    var list = cases.filter(function (c) {
      if (!q) return true;
      return (c.name + " " + c.slug).toLowerCase().indexOf(q) >= 0;
    });
    var box = document.getElementById("grid");
    box.innerHTML = list
      .map(function (c) {
        return (
          '<div class="case-card" data-id="' +
          esc(c.id) +
          '">' +
          (c.icon ? '<img class="ico" src="' + esc(c.icon) + '" loading="lazy" alt="">' : "") +
          '<div class="name">' +
          esc(c.name) +
          "</div>" +
          '<div class="meta">' +
          esc(String(c.capacity)) +
          " cap · " +
          c.grids.length +
          " grid(s)</div></div>"
        );
      })
      .join("");
    box.querySelectorAll(".case-card").forEach(function (el) {
      el.onclick = function () {
        openModal(el.getAttribute("data-id"));
      };
    });
  }

  function openModal(id) {
    var c = cases.filter(function (x) {
      return x.id === id;
    })[0];
    if (!c) return;
    var fits = fitsForCase(c);
    fits.sort(function (a, b) {
      return itemName(a).localeCompare(itemName(b), "ru");
    });
    var root = document.getElementById("modalRoot");
    root.innerHTML =
      '<div class="modal-bg" id="modalBg"><div class="modal">' +
      '<button type="button" class="btn-ghost close-btn" id="modalClose">✕</button>' +
      "<h2>" +
      esc(c.name) +
      "</h2>" +
      '<div class="sub2">' +
      fits.length +
      " предметов проходит фильтры · поиск ниже</div>" +
      '<input type="search" id="modalQ" placeholder="Фильтр предметов…" style="width:100%;margin-bottom:10px">' +
      '<div class="item-list" id="modalList"></div></div></div>';

    function paintList() {
      var mq = (document.getElementById("modalQ").value || "").toLowerCase().trim();
      var rows = fits.filter(function (it) {
        if (!mq) return true;
        return (itemName(it) + " " + (it.normalizedName || "")).toLowerCase().indexOf(mq) >= 0;
      });
      document.getElementById("modalList").innerHTML = rows
        .slice(0, 500)
        .map(function (it) {
          return (
            '<div class="item-row">' +
            (it.iconLink || it.gridImageLink
              ? '<img src="' + esc(it.iconLink || it.gridImageLink) + '" alt="">'
              : "") +
            "<span>" +
            esc(itemName(it)) +
            '</span><span class="meta" style="margin-left:auto;color:var(--muted);font-size:.75rem">' +
            esc(it.normalizedName || "") +
            "</span></div>"
          );
        })
        .join("");
    }
    paintList();
    document.getElementById("modalQ").oninput = paintList;
    document.getElementById("modalClose").onclick = function () {
      root.innerHTML = "";
    };
    document.getElementById("modalBg").onclick = function (e) {
      if (e.target.id === "modalBg") root.innerHTML = "";
    };
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Loading items…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Items…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var raw = await TarkovAPI.items(mode);
      if (P) P.set(60);
      allItems = asArray(raw && raw.data && raw.data.items ? raw.data.items : raw);
      cases = [];
      allItems.forEach(function (it) {
        var c = mapCase(it);
        if (c) cases.push(c);
      });
      cases.sort(function (a, b) {
        return a.name.localeCompare(b.name, "ru");
      });
      document.getElementById("mainCard").hidden = false;
      renderGrid();
      setStatus("Кейсов: " + cases.length + " · items: " + allItems.length, true);
      if (P) P.done();
      try {
        if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
      } catch (eB) {}
    } catch (e) {
      setStatus(e.message || String(e), false);
      if (P) P.fail(e.message);
    } finally {
      btn.disabled = false;
    }
  }

  document.getElementById("loadBtn").onclick = load;
  document.getElementById("q").oninput = renderGrid;
})();
