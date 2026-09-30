/*! Tarkov — Restock shopping list / wishlist */
(function () {
  "use strict";

  var STORAGE_KEY = "tarkov.shoppingList.v1";
  var TAG_LABEL = {
    ammo: "Патроны",
    med: "Мед",
    flip: "Флип",
    quest: "Квест",
    other: "Прочее"
  };

  var itemsById = {};
  var searchIndex = [];
  var list = [];
  var filter = "all";
  var pendingItem = null;

  function esc(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;");
  }

  function itemName(it) {
    if (!it) return "?";
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    return it.shortName || it.name || it.normalizedName || it.id || "?";
  }

  function asArray(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "object") return Object.values(x);
    return [];
  }

  function fmt(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString("ru-RU");
  }

  function priceOf(it) {
    if (!it) return 0;
    var avg = Number(it.avg24hPrice) || 0;
    if (avg > 0) return avg;
    return Number(it.lastLowPrice) || Number(it.basePrice) || 0;
  }

  function traderLine(it) {
    if (!it) return "";
    var parts = [];
    asArray(it.buyFromTrader || it.buyFor).forEach(function (b) {
      var tr = (b.trader && (b.trader.name || b.trader.normalizedName)) || b.vendor || "trader";
      var ll = b.loyaltyLevel || b.minTraderLevel;
      var p = Number(b.priceRUB != null ? b.priceRUB : b.price) || 0;
      parts.push(String(tr).slice(0, 14) + (ll ? " LL" + ll : "") + (p ? " " + fmt(p) : ""));
    });
    return parts.slice(0, 3).join(" · ");
  }

  function loadState() {
    var raw = null;
    try {
      if (window.TarkovStorage) raw = TarkovStorage.getJson(STORAGE_KEY, null);
    } catch (e) {}
    if (!raw || !Array.isArray(raw.items)) {
      list = [];
      return;
    }
    list = raw.items;
  }

  function saveState() {
    try {
      if (window.TarkovStorage) TarkovStorage.setJson(STORAGE_KEY, { _v: 1, items: list });
    } catch (e) {}
  }

  function uid() {
    return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("status");
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = msg || "";
  }

  function copyText(t) {
    t = String(t || "");
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(
        function () {
          setStatus("Скопировано: " + t.slice(0, 60), true);
        },
        function () {
          fallbackCopy(t);
        }
      );
    } else fallbackCopy(t);
  }

  function fallbackCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setStatus("Скопировано", true);
    } catch (e) {
      setStatus("Не удалось скопировать", false);
    }
    document.body.removeChild(ta);
  }

  function addEntry(opts) {
    opts = opts || {};
    var name = (opts.name || document.getElementById("q").value || "").trim();
    if (!name) return;
    var qty = Math.max(1, Number(document.getElementById("qty").value) || 1);
    var tag = document.getElementById("tag").value || "other";
    var note = (document.getElementById("note").value || "").trim();
    var entry = {
      id: uid(),
      name: name,
      shortName: opts.shortName || name,
      normalizedName: opts.normalizedName || "",
      itemId: opts.itemId || "",
      qty: qty,
      tag: tag,
      note: note,
      price: opts.price || 0,
      traders: opts.traders || "",
      done: false,
      addedAt: Date.now()
    };
    list.unshift(entry);
    saveState();
    document.getElementById("q").value = "";
    document.getElementById("note").value = "";
    document.getElementById("qty").value = "1";
    pendingItem = null;
    hideSuggest();
    paint();
  }

  function hideSuggest() {
    var s = document.getElementById("suggest");
    s.style.display = "none";
    s.innerHTML = "";
  }

  function showSuggest(q) {
    var box = document.getElementById("suggest");
    if (!q || q.length < 2 || !searchIndex.length) {
      hideSuggest();
      return;
    }
    var ql = q.toLowerCase();
    var hits = [];
    for (var i = 0; i < searchIndex.length && hits.length < 12; i++) {
      var row = searchIndex[i];
      if (row.hay.indexOf(ql) >= 0) hits.push(row);
    }
    if (!hits.length) {
      hideSuggest();
      return;
    }
    box.innerHTML = hits
      .map(function (h) {
        return (
          '<button type="button" data-id="' +
          esc(h.id) +
          '"><b>' +
          esc(h.name) +
          '</b> <span class="muted">' +
          esc(h.shortName) +
          (h.price ? " · " + fmt(h.price) + " ₽" : "") +
          "</span></button>"
        );
      })
      .join("");
    box.style.display = "block";
    box.querySelectorAll("button").forEach(function (btn) {
      btn.onclick = function () {
        var it = itemsById[btn.getAttribute("data-id")];
        if (!it) return;
        pendingItem = it;
        document.getElementById("q").value = itemName(it);
        var nn = (it.normalizedName || "").toLowerCase();
        var pt = (it.properties && it.properties.propertiesType) || "";
        var tagEl = document.getElementById("tag");
        if (pt === "ItemPropertiesAmmo" || /ammo|patron|cartridge/i.test(nn)) tagEl.value = "ammo";
        else if (
          /salewa|ifak|medkit|splint|bandage|morphine|stim|grizzly|cms|esmarch/i.test(nn) ||
          pt === "ItemPropertiesMedKit" ||
          pt === "ItemPropertiesStim"
        )
          tagEl.value = "med";
        else if (/ledx|bitcoin|graphics|tetriz|role|lion|cat|horse|virtex|ssd/i.test(nn)) tagEl.value = "flip";
        hideSuggest();
      };
    });
  }

  function filtered() {
    return list.filter(function (e) {
      if (filter === "todo") return !e.done;
      if (filter === "all") return true;
      return e.tag === filter;
    });
  }

  function paint() {
    var box = document.getElementById("list");
    var rows = filtered();
    if (!rows.length) {
      box.innerHTML = '<p class="muted">Пусто. Добавь предметы после рестока.</p>';
    } else {
      box.innerHTML = rows
        .map(function (e) {
          var tagClass =
            e.tag === "ammo" || e.tag === "med" || e.tag === "flip" || e.tag === "quest" ? e.tag : "";
          var priceBit = e.price ? " · ~" + fmt(e.price) + " ₽" : "";
          var traders = e.traders ? '<div class="meta">' + esc(e.traders) + "</div>" : "";
          var note = e.note ? '<div class="meta">' + esc(e.note) + "</div>" : "";
          return (
            '<div class="item' +
            (e.done ? " done" : "") +
            '" data-id="' +
            esc(e.id) +
            '">' +
            '<input type="checkbox" class="chk"' +
            (e.done ? " checked" : "") +
            ">" +
            '<div><div class="name"><span class="badge ' +
            tagClass +
            '">' +
            esc(TAG_LABEL[e.tag] || e.tag) +
            "</span> ×" +
            e.qty +
            " " +
            esc(e.name) +
            '</div><div class="meta">' +
            esc(e.shortName || "") +
            priceBit +
            "</div>" +
            traders +
            note +
            '</div><div class="actions">' +
            '<button type="button" data-a="copy-short">short</button>' +
            '<button type="button" data-a="copy-name">имя</button>' +
            (e.normalizedName ? '<button type="button" data-a="copy-norm">slug</button>' : "") +
            '<button type="button" data-a="del">✕</button>' +
            "</div></div>"
          );
        })
        .join("");

      box.querySelectorAll(".item").forEach(function (row) {
        var id = row.getAttribute("data-id");
        row.querySelector(".chk").onchange = function () {
          var e = list.find(function (x) {
            return x.id === id;
          });
          if (e) {
            e.done = !!row.querySelector(".chk").checked;
            saveState();
            paint();
          }
        };
        row.querySelectorAll("button").forEach(function (b) {
          b.onclick = function () {
            var e = list.find(function (x) {
              return x.id === id;
            });
            if (!e) return;
            var a = b.getAttribute("data-a");
            if (a === "copy-short") copyText(e.shortName || e.name);
            if (a === "copy-name") copyText(e.name);
            if (a === "copy-norm") copyText(e.normalizedName);
            if (a === "del") {
              list = list.filter(function (x) {
                return x.id !== id;
              });
              saveState();
              paint();
            }
          };
        });
      });
    }

    var total = list.length;
    var todo = list.filter(function (e) {
      return !e.done;
    }).length;
    var est = list
      .filter(function (e) {
        return !e.done;
      })
      .reduce(function (s, e) {
        return s + (e.price || 0) * (e.qty || 1);
      }, 0);
    document.getElementById("summary").textContent =
      "Всего " + total + " · не куплено " + todo + (est ? " · оценка ~" + fmt(est) + " ₽" : "");
  }

  function onAdd() {
    if (pendingItem) {
      addEntry({
        name: itemName(pendingItem),
        shortName: pendingItem.shortName || itemName(pendingItem),
        normalizedName: pendingItem.normalizedName || "",
        itemId: pendingItem.id,
        price: priceOf(pendingItem),
        traders: traderLine(pendingItem)
      });
      return;
    }
    var q = (document.getElementById("q").value || "").trim();
    if (!q) return;
    var ql = q.toLowerCase();
    var hit = searchIndex.find(function (h) {
      return h.name.toLowerCase() === ql || h.shortName.toLowerCase() === ql;
    });
    if (hit && itemsById[hit.id]) {
      var it = itemsById[hit.id];
      addEntry({
        name: itemName(it),
        shortName: it.shortName || itemName(it),
        normalizedName: it.normalizedName || "",
        itemId: it.id,
        price: priceOf(it),
        traders: traderLine(it)
      });
      return;
    }
    addEntry({ name: q, shortName: q });
  }

  async function loadCatalog() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Loading…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Items…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var items = asArray(await TarkovAPI.items(mode));
      itemsById = {};
      searchIndex = [];
      items.forEach(function (it) {
        if (!it || !it.id) return;
        itemsById[it.id] = it;
        var name = itemName(it);
        var shortName = it.shortName || name;
        searchIndex.push({
          id: it.id,
          name: name,
          shortName: shortName,
          price: priceOf(it),
          hay: (name + " " + shortName + " " + (it.normalizedName || "")).toLowerCase()
        });
      });
      list.forEach(function (e) {
        if (e.itemId && itemsById[e.itemId]) {
          e.price = priceOf(itemsById[e.itemId]);
          e.traders = traderLine(itemsById[e.itemId]);
        }
      });
      saveState();
      setStatus("Каталог: " + searchIndex.length + " предметов", true);
      if (P) P.done();
      paint();
    } catch (e) {
      setStatus(e.message || String(e), false);
      if (P) P.fail(e.message);
    } finally {
      btn.disabled = false;
    }
  }

  document.getElementById("loadBtn").onclick = loadCatalog;
  document.getElementById("addBtn").onclick = onAdd;
  document.getElementById("q").addEventListener("input", function () {
    pendingItem = null;
    showSuggest(this.value.trim());
  });
  document.getElementById("q").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      onAdd();
    }
  });

  document.getElementById("filters").onclick = function (ev) {
    var t = ev.target;
    if (!t.getAttribute || !t.getAttribute("data-f")) return;
    filter = t.getAttribute("data-f");
    document.querySelectorAll("#filters .chip").forEach(function (c) {
      c.classList.toggle("on", c.getAttribute("data-f") === filter);
    });
    paint();
  };

  document.getElementById("copyAll").onclick = function () {
    copyText(
      list
        .map(function (e) {
          return (e.qty > 1 ? e.qty + "× " : "") + (e.shortName || e.name);
        })
        .join("\n")
    );
  };
  document.getElementById("copyTodo").onclick = function () {
    copyText(
      list
        .filter(function (e) {
          return !e.done;
        })
        .map(function (e) {
          return (e.qty > 1 ? e.qty + "× " : "") + (e.shortName || e.name);
        })
        .join("\n")
    );
  };
  document.getElementById("clearDone").onclick = function () {
    list = list.filter(function (e) {
      return !e.done;
    });
    saveState();
    paint();
  };
  document.getElementById("exportJson").onclick = function () {
    copyText(JSON.stringify({ _v: 1, items: list }, null, 2));
  };
  document.getElementById("importJson").onclick = function () {
    var raw = prompt("Вставь JSON экспорта:");
    if (!raw) return;
    try {
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.items)) {
        list = data.items;
        saveState();
        paint();
        setStatus("Импортировано: " + list.length, true);
      } else setStatus("Неверный JSON", false);
    } catch (e) {
      setStatus("Ошибка JSON", false);
    }
  };

  loadState();
  paint();
})();
