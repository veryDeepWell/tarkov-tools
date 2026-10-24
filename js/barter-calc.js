/*! Barter calculator — presets + ItemDomain.evaluateProfit */
(function () {
  "use strict";

  const PRESETS = [
      {
        id: 'item-case',
        label: 'Кейс предметов',
        resultName: 'Кейс для предметов',
        sellPrice: 1600000,
        items: [
          { name: 'Офтальмоскоп', qty: 10, price: 0 },
          { name: 'Медкомпоненты (Pile of meds)', qty: 25, price: 0 }
        ]
      },
      {
        id: 'weapon-case-jaeger',
        label: 'Оружейный кейс (Егерь)',
        resultName: 'Оружейный кейс',
        sellPrice: 1450000,
        items: [
          { name: 'Пистолетный кейс', qty: 5, price: 0 },
          { name: 'Экспедиционная канистра', qty: 5, price: 0 }
        ]
      },
      {
        id: 'weapon-case-mechanic',
        label: 'Оружейный кейс (Механик)',
        resultName: 'Оружейный кейс',
        sellPrice: 1450000,
        items: [
          { name: 'Электродвигатель', qty: 8, price: 0 },
          { name: 'Пучок проводов', qty: 15, price: 0 },
          { name: 'Сломанный ЖК-дисплей', qty: 4, price: 0 },
          { name: 'Элемент фазированной антенной решётки', qty: 1, price: 0 }
        ]
      },
      {
        id: 'sicc',
        label: 'S I C C',
        resultName: 'Кейс S I C C',
        sellPrice: 1050000,
        items: [
          { name: 'Паракорд', qty: 12, price: 0 },
          { name: 'Монтажный скотч (Duct tape)', qty: 15, price: 0 },
          { name: 'Изолента', qty: 15, price: 0 },
          { name: 'Пачка гвоздей', qty: 15, price: 0 }
        ]
      },
      {
        id: 'thicc-item',
        label: 'T H I C C предметов',
        resultName: 'T H I C C кейс предметов',
        sellPrice: 0,
        items: [
          { name: 'Портативный дефибриллятор', qty: 15, price: 0 },
          { name: 'LEDX', qty: 15, price: 0 },
          { name: 'Ибупрофен', qty: 15, price: 0 },
          { name: 'Зубная паста', qty: 15, price: 0 }
        ]
      },
      {
        id: 'thicc-item-booze',
        label: 'T H I C C (самогон)',
        resultName: 'T H I C C кейс предметов',
        sellPrice: 0,
        items: [
          { name: 'Самогон (Moonshine)', qty: 50, price: 0 },
          { name: 'Водка', qty: 50, price: 0 },
          { name: 'Виски', qty: 30, price: 0 }
        ]
      },
      {
        id: 'weapon-case-skier',
        label: 'Оружейный (Лыжник)',
        resultName: 'Оружейный кейс',
        sellPrice: 1450000,
        items: [
          { name: 'Самогон (Moonshine)', qty: 10, price: 0 },
          { name: 'Водка', qty: 10, price: 0 },
          { name: 'Slickers', qty: 5, price: 0 }
        ]
      },
      {
        id: 'money-case',
        label: 'Денежный кейс',
        resultName: 'Денежный кейс',
        sellPrice: 310000,
        items: [
          { name: 'Золотая цепочка', qty: 5, price: 0 },
          { name: 'Часы Roler', qty: 2, price: 0 },
          { name: 'Золотой череп', qty: 2, price: 0 }
        ]
      }
    ];

  function formatNum(n) {
    try {
      if (window.TarkovDicts && TarkovDicts.fmtNum) return TarkovDicts.fmtNum(n);
    } catch (e) {}
    n = Number(n);
    if (!isFinite(n)) return "—";
    return Math.round(n).toLocaleString("ru-RU");
  }
  function escapeHtml(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }
  function loadSettings(key, defaults) {
    return window.TarkovUI && TarkovUI.loadSettings
      ? TarkovUI.loadSettings(key, defaults)
      : defaults || {};
  }
  function saveSettings(key, obj) {
    if (window.TarkovUI && TarkovUI.saveSettings) TarkovUI.saveSettings(key, obj);
  }

  var itemsList = document.getElementById("itemsList");
  var addItemBtn = document.getElementById("addItemBtn");
  var sellPriceInput = document.getElementById("sellPrice");
  var commissionInput = document.getElementById("commission");
  var resultNameInput = document.getElementById("resultName");
  var presetsEl = document.getElementById("presets");

  var items = [
    { id: 1, name: "Офтальмоскоп", qty: 10, price: 40000 },
    { id: 2, name: "Медкомпоненты", qty: 25, price: 35000 }
  ];
  var nextId = 3;
  var activePreset = "item-case";

  function calcItemCost(item) {
    return (Number(item.qty) || 0) * (Number(item.price) || 0);
  }

  function renderPresets() {
    if (!presetsEl) return;
    presetsEl.innerHTML = "";
    PRESETS.forEach(function (p) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-btn" + (activePreset === p.id ? " active" : "");
      var label = t("tool.barter-calc.ui.presetLabel." + p.id);
      btn.textContent = label.indexOf("tool.barter-calc") === 0 ? p.label : label;
      btn.addEventListener("click", function () {
        applyPreset(p);
      });
      presetsEl.appendChild(btn);
    });
  }

  function applyPreset(preset) {
    activePreset = preset.id;
    if (resultNameInput) {
      var rn = t("tool.barter-calc.ui.resultName." + preset.id);
      resultNameInput.value =
        rn.indexOf("tool.barter-calc") === 0 ? preset.resultName : rn;
    }
    if (sellPriceInput) sellPriceInput.value = preset.sellPrice || "";
    items = preset.items.map(function (it, i) {
      return {
        id: i + 1,
        name: it.name,
        qty: it.qty,
        price: it.price || 0
      };
    });
    nextId = items.length + 1;
    renderPresets();
    renderItems();
    recalculate();
  }

  function renderItems() {
    if (!itemsList) return;
    itemsList.innerHTML = "";
    items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "item-row";
      row.dataset.id = item.id;
      row.innerHTML =
        '<div class="field" style="flex:2;min-width:140px;">' +
        "<label>" +
        escapeHtml(t("tool.barter-calc.ui.itemName")) +
        '</label><input type="text" class="item-name" value="' +
        escapeHtml(item.name) +
        '"></div>' +
        '<div class="field narrow"><label>' +
        escapeHtml(t("tool.barter-calc.ui.quantity")) +
        '</label><input type="number" class="item-qty" min="1" step="1" value="' +
        item.qty +
        '"></div>' +
        '<div class="field"><label>' +
        escapeHtml(t("tool.barter-calc.ui.unitPrice")) +
        '</label><input type="number" class="item-price" min="0" step="1000" value="' +
        item.price +
        '"></div>' +
        '<div class="price-quick">' +
        '<button type="button" class="btn-quick" data-delta="-1000">−</button>' +
        '<button type="button" class="btn-quick" data-delta="1000">+</button></div>' +
        '<div class="item-cost" data-cost>' +
        formatNum(calcItemCost(item)) +
        " ₽</div>" +
        '<button type="button" class="btn btn-danger remove-btn">✕</button>';

      var nameInput = row.querySelector(".item-name");
      var qtyInput = row.querySelector(".item-qty");
      var priceInput = row.querySelector(".item-price");
      var costEl = row.querySelector("[data-cost]");
      function update() {
        item.name = nameInput.value;
        item.qty = Number(qtyInput.value) || 0;
        item.price = Math.max(0, Number(priceInput.value) || 0);
        priceInput.value = item.price;
        costEl.textContent = formatNum(calcItemCost(item)) + " ₽";
        recalculate();
      }
      nameInput.addEventListener("input", update);
      qtyInput.addEventListener("input", update);
      priceInput.addEventListener("input", update);
      row.querySelectorAll(".btn-quick").forEach(function (b) {
        b.addEventListener("click", function () {
          item.price = Math.max(0, item.price + Number(b.getAttribute("data-delta")));
          priceInput.value = item.price;
          update();
        });
      });
      row.querySelector(".remove-btn").addEventListener("click", function () {
        items = items.filter(function (x) {
          return x.id !== item.id;
        });
        activePreset = null;
        renderPresets();
        renderItems();
        recalculate();
      });
      itemsList.appendChild(row);
    });
  }

  function recalculate() {
    var totalCost = items.reduce(function (sum, i) {
      return sum + calcItemCost(i);
    }, 0);
    var sellPrice = Number(sellPriceInput && sellPriceInput.value) || 0;
    var basePrice = Number((document.getElementById("basePrice") || {}).value) || 0;
    var taxOpts = {
      intelCenter3:
        (document.getElementById("intel3") || {}).value === "1" ||
        !!(document.getElementById("intel3") || {}).checked,
      hmLvl: Number((document.getElementById("hmLvl") || {}).value) || 0,
      hideoutManagementLevel: Number((document.getElementById("hmLvl") || {}).value) || 0,
      commissionPercent: Number(commissionInput && commissionInput.value) || 0
    };
    var result =
      window.TarkovItemDomain && TarkovItemDomain.evaluateProfit
        ? TarkovItemDomain.evaluateProfit(basePrice, sellPrice, 1, totalCost, taxOpts)
        : {
            tax: Math.round(sellPrice * ((taxOpts.commissionPercent || 0) / 100)),
            revenue: sellPrice - Math.round(sellPrice * ((taxOpts.commissionPercent || 0) / 100)),
            profit:
              sellPrice -
              Math.round(sellPrice * ((taxOpts.commissionPercent || 0) / 100)) -
              totalCost,
            roi: totalCost
              ? ((sellPrice -
                  Math.round(sellPrice * ((taxOpts.commissionPercent || 0) / 100)) -
                  totalCost) /
                  totalCost) *
                100
              : 0
          };

    var set = function (id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set("totalCost", formatNum(totalCost) + " ₽");
    set("netSell", formatNum(result.revenue) + " ₽");
    set("profit", formatNum(result.profit) + " ₽");
    set("roi", (isFinite(result.roi) ? Number(result.roi).toFixed(1) : "—") + "%");
    ["profit", "roi"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("pos", result.profit > 0);
      el.classList.toggle("neg", result.profit < 0);
    });
  }

  if (addItemBtn) {
    addItemBtn.addEventListener("click", function () {
      items.push({ id: nextId++, name: "", qty: 1, price: 0 });
      activePreset = null;
      renderPresets();
      renderItems();
      recalculate();
    });
  }
  if (sellPriceInput) sellPriceInput.addEventListener("input", recalculate);
  if (commissionInput) commissionInput.addEventListener("input", recalculate);
  ["basePrice", "intel3", "hmLvl"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", recalculate);
    el.addEventListener("change", recalculate);
  });
  if (resultNameInput) {
    resultNameInput.addEventListener("input", function () {
      activePreset = null;
      renderPresets();
    });
  }

  window.addEventListener("tt-lang-changed", function () {
    if (activePreset) {
      var preset = PRESETS.find(function (p) {
        return p.id === activePreset;
      });
      if (preset && resultNameInput) {
        var rn = t("tool.barter-calc.ui.resultName." + preset.id);
        resultNameInput.value =
          rn.indexOf("tool.barter-calc") === 0 ? preset.resultName : rn;
      }
    }
    renderPresets();
    renderItems();
    recalculate();
  });

  // prefs (commission / tax UI only — not gameMode/progress)
  (function () {
    var SKEY = "tarkovBarterCalcSettings";
    var s = loadSettings(SKEY, { commission: 0, intel3: "0", hmLvl: 0 });
    function set(id, v) {
      var el = document.getElementById(id);
      if (el && v != null) el.value = v;
    }
    set("commission", s.commission);
    set("intel3", s.intel3);
    set("hmLvl", s.hmLvl);
    if (s.basePrice != null) set("basePrice", s.basePrice);
    function persist() {
      saveSettings(SKEY, {
        commission: Number((document.getElementById("commission") || {}).value) || 0,
        intel3: (document.getElementById("intel3") || {}).value || "0",
        hmLvl: Number((document.getElementById("hmLvl") || {}).value) || 0,
        basePrice: Number((document.getElementById("basePrice") || {}).value) || 0
      });
    }
    ["commission", "intel3", "hmLvl", "basePrice"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", persist);
    });
  })();

  window.render = function () {
    renderPresets();
    renderItems();
    recalculate();
  };
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () {
      window.render();
    });
  }

  if (activePreset && resultNameInput) {
    var rn0 = t("tool.barter-calc.ui.resultName." + activePreset);
    resultNameInput.value =
      rn0.indexOf("tool.barter-calc") === 0
        ? (PRESETS.find(function (p) { return p.id === activePreset; }) || {}).resultName || ""
        : rn0;
  }
  renderPresets();
  renderItems();
  recalculate();
})();
