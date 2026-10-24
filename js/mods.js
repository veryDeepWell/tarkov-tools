/*! Weapon mods — TarkovTableTool + WeaponDomain */
(function () {
  "use strict";

  function buyInfo(it) {
    var b = null;
    try {
      if (window.TarkovItemDomain && TarkovItemDomain.bestBuy)
        b = TarkovItemDomain.bestBuy(it, { sources: "buyFromTrader", allowQuest: true });
    } catch (e) {}
    if (!b) return { price: 0, ll: 0, quest: false, traderKey: "", questName: "" };
    return {
      price: Number(b.price != null ? b.price : b.priceRUB) || 0,
      ll: Number(b.minLL != null ? b.minLL : b.minTraderLevel) || 0,
      quest: !!(b.questLocked || b.taskUnlock),
      traderKey: b.traderKey || "",
      questName: b.questName || ""
    };
  }
  function applyGate(tr, r) {
    if (!window.TarkovProfile || !TarkovProfile.gate || !TarkovProfile.applyLockToElement) return;
    try {
      var g = TarkovProfile.gate({
        trader: r.traderKey,
        minLL: r.traderLL || r.ll,
        questLocked: r.quest,
        questName: r.questName
      });
      TarkovProfile.applyLockToElement(tr, g);
    } catch (e) {}
  }


  var CAT_ORDER = ["barrel", "receiver", "stock", "pistolgrip", "handguard", "charge", "mount", "muzzle", "gasblock", "bipod", "tactical", "other"];
  var mods = [];
  var weapons = [];
  var activeCats = null;
  var selectedWeapon = null;

  function humanize(slug) {
    try {
      if (window.TarkovDicts && TarkovDicts.humanize) return TarkovDicts.humanize(slug);
    } catch (e) {}
    return String(slug || "");
  }

  function renderCatChips() {
    var el = document.getElementById("catChips");
    if (!el) return;
    if (!activeCats) {
      activeCats = {};
      CAT_ORDER.forEach(function (k) {
        if (mods.some(function (m) {
          return m.cat === k;
        }))
          activeCats[k] = true;
      });
    }
    el.innerHTML = "";
    CAT_ORDER.forEach(function (k) {
      if (!mods.some(function (m) {
        return m.cat === k;
      }))
        return;
      var chip = document.createElement("span");
      chip.className = "chip" + (activeCats[k] ? " active" : "");
      chip.textContent = k;
      chip.onclick = function () {
        activeCats[k] = !activeCats[k];
        chip.classList.toggle("active", !!activeCats[k]);
        if (window.render) window.render();
      };
      el.appendChild(chip);
    });
  }

  function renderWeaponList(q) {
    var box = document.getElementById("weaponList");
    if (!box) return;
    q = (q || "").toLowerCase();
    var list = weapons.filter(function (w) {
      return !q || (w.name + " " + w.slug).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 40);
    box.innerHTML = list
      .map(function (w) {
        var on = selectedWeapon && selectedWeapon.id === w.id ? " active" : "";
        return (
          '<div class="weapon-item' +
          on +
          '" data-id="' +
          w.id +
          '">' +
          humanize(w.slug || w.name) +
          "</div>"
        );
      })
      .join("");
    box.querySelectorAll("[data-id]").forEach(function (el) {
      el.onclick = function () {
        var id = el.getAttribute("data-id");
        selectedWeapon = weapons.find(function (w) {
          return w.id === id;
        });
        var lab = document.getElementById("weaponSelected");
        if (lab)
          lab.textContent = selectedWeapon
            ? selectedWeapon.name || selectedWeapon.slug
            : "";
        if (window.render) window.render();
      };
    });
  }

  var wSearch = document.getElementById("weaponSearch");
  if (wSearch)
    wSearch.addEventListener("input", function () {
      renderWeaponList(wSearch.value);
    });
  ["modSearch", "minFits", "hideQuest", "onlyFlea"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      if (window.render) window.render();
    });
    el.addEventListener("change", function () {
      if (window.render) window.render();
    });
  });

  var api = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#modsHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#modSearch",
    defaultSort: "fits",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (activeCats && row.cat && !activeCats[row.cat]) return false;
      var minFits = Number((document.getElementById("minFits") || {}).value) || 0;
      if ((row.fits || 0) < minFits) return false;
      var hideQuest = document.getElementById("hideQuest");
      if (hideQuest && hideQuest.checked && row.quest) return false;
      var onlyFlea = document.getElementById("onlyFlea");
      if (onlyFlea && onlyFlea.checked && !(row.avg > 0)) return false;
      if (selectedWeapon && row.weaponIds) {
        if (row.weaponIds.indexOf(selectedWeapon.id) < 0) return false;
      }
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Мод",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "cat", label: "Cat" },
      { key: "fits", label: "Fits", format: "num" },
      { key: "ergo", label: "Ergo", format: "num" },
      { key: "recoil", label: "Recoil", format: "num" },
      { key: "avg", label: "Flea", format: "num" },
      { key: "traderPrice", label: "Торговец", format: "num" },
      {
        key: "quest",
        label: "Quest",
        html: function (r) {
          return r.quest ? "✓" : "";
        }
      }
    ],
    fetch: function () {
      return Promise.resolve([]);
    },
    mapItem: function () {
      return null;
    },
    afterPaint: function (list, ctx) {
      var tb = ctx.tbody;
      if (!tb) return;
      tb.querySelectorAll("tr").forEach(function (tr, i) {
        if (list[i]) applyGate(tr, list[i]);
      });
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Mods…" });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var items = await TarkovAPI.items(mode);
      if (!window.TarkovWeaponDomain) throw new Error("TarkovWeaponDomain missing");
      var compat = TarkovWeaponDomain.buildCompatibility(items);
      weapons = items
        .filter(function (it) {
          return TarkovWeaponDomain.isWeapon(it);
        })
        .map(function (it) {
          return {
            id: it.id,
            slug: it.normalizedName || "",
            name: TarkovTableTool.itemName(it)
          };
        })
        .sort(function (a, b) {
          return String(a.name).localeCompare(String(b.name), "ru");
        });
      mods = [];
      items.forEach(function (item) {
        if (!TarkovWeaponDomain.isMod(item)) return;
        var row = TarkovWeaponDomain.modModel(item, compat);
        var buy = buyInfo(item);
        row.name = TarkovTableTool.itemName(item);
        row.slug = item.normalizedName || row.slug || "";
        row.icon = item.iconLink || item.gridImageLink || "";
        row.avg = Number(item.avg24hPrice) || 0;
        row.traderPrice = buy.price;
        row.traderLL = buy.ll;
        row.quest = buy.quest;
        row.traderKey = buy.traderKey;
        row.questName = buy.questName;
        if (row.weaponIds == null && compat.modToWeapons && compat.modToWeapons[item.id])
          row.weaponIds = compat.modToWeapons[item.id];
        if (row.fits || row.ergo || row.recoil || row.acc || row.capacity) mods.push(row);
      });
      activeCats = null;
      renderCatChips();
      renderWeaponList("");
      api.setRows(mods);
      document.getElementById("filtersCard") &&
        (document.getElementById("filtersCard").style.display = "block");
      document.getElementById("tableCard") &&
        (document.getElementById("tableCard").style.display = "block");
      if (status) {
        status.className = "status ok";
        status.textContent =
          "Модов: " +
          mods.length +
          " · стволов: " +
          weapons.length +
          " · связей: " +
          Object.keys(compat.modToWeapons || {}).length;
      }
      if (P) P.done("OK");
    } catch (e) {
      console.error(e);
      if (status) {
        status.className = "status err";
        status.textContent = "Ошибка: " + (e.message || e);
      }
      if (P) P.fail(e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };


  // contract: gate ⇒ window.render = in this file
  var __ttPaint = function () {
    try {
      if (api && typeof api.setRows === "function" && mods && mods.length) {
        api.setRows(mods);
      } else if (window.render && window.render !== __ttPaint) {
        /* noop */
      }
    } catch (e) {}
  };
  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
    } catch (e0) {}
    try {
      if (api && typeof api.setRows === "function") api.setRows(mods || []);
    } catch (e1) {}
  };
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () {
      window.render();
    });
  }

})();
