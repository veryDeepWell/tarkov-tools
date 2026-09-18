
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

    const itemsList = document.getElementById('itemsList');
    const addItemBtn = document.getElementById('addItemBtn');
    const sellPriceInput = document.getElementById('sellPrice');
    const commissionInput = document.getElementById('commission');
    const resultNameInput = document.getElementById('resultName');
    const presetsEl = document.getElementById('presets');

    let items = [
      { id: 1, name: 'Офтальмоскоп', qty: 10, price: 40000 },
      { id: 2, name: 'Медкомпоненты', qty: 25, price: 35000 }
    ];
    let nextId = 3;
    let activePreset = 'item-case';

    
    function calcItemCost(item) {
      return (Number(item.qty) || 0) * (Number(item.price) || 0);
    }

    
    function renderPresets() {
      presetsEl.innerHTML = '';
      PRESETS.forEach(p => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-btn' + (activePreset === p.id ? ' active' : '');
        btn.textContent = p.label;
        btn.addEventListener('click', () => applyPreset(p));
        presetsEl.appendChild(btn);
      });
    }

    function applyPreset(preset) {
      activePreset = preset.id;
      resultNameInput.value = preset.resultName;
      sellPriceInput.value = preset.sellPrice || '';
      items = preset.items.map((it, i) => ({
        id: i + 1,
        name: it.name,
        qty: it.qty,
        price: it.price || 0
      }));
      nextId = items.length + 1;
      renderPresets();
      renderItems();
      recalculate();
    }

    function renderItems() {
      itemsList.innerHTML = '';
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.dataset.id = item.id;

        row.innerHTML = `
          <div class="field" style="flex: 2; min-width: 140px;">
            <label>Название</label>
            <input type="text" class="item-name" value="${escapeHtml(item.name)}" placeholder="Предмет">
          </div>
          <div class="field narrow">
            <label>Кол-во</label>
            <input type="number" class="item-qty" min="1" step="1" value="${item.qty}">
          </div>
          <div class="field">
            <label>Цена за шт., ₽</label>
            <input type="number" class="item-price" min="0" step="1000" value="${item.price}">
          </div>
          <div class="price-quick">
            <button type="button" class="btn-quick" data-delta="-1000" title="-1 000">−</button>
            <button type="button" class="btn-quick" data-delta="1000" title="+1 000">+</button>
          </div>
          <div class="item-cost" data-cost>${formatNum(calcItemCost(item))} ₽</div>
          <button type="button" class="btn btn-danger remove-btn" title="Удалить">✕</button>
        `;

        const nameInput = row.querySelector('.item-name');
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        const costEl = row.querySelector('[data-cost]');
        const removeBtn = row.querySelector('.remove-btn');
        const quickBtns = row.querySelectorAll('.btn-quick');

        const update = () => {
          item.name = nameInput.value;
          item.qty = Number(qtyInput.value) || 0;
          item.price = Math.max(0, Number(priceInput.value) || 0);
          priceInput.value = item.price;
          costEl.textContent = formatNum(calcItemCost(item)) + ' ₽';
          recalculate();
        };

        nameInput.addEventListener('input', update);
        qtyInput.addEventListener('input', update);
        priceInput.addEventListener('input', update);

        quickBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const delta = Number(btn.dataset.delta) || 0;
            const current = Number(priceInput.value) || 0;
            priceInput.value = Math.max(0, current + delta);
            update();
          });
        });

        removeBtn.addEventListener('click', () => {
          items = items.filter(i => i.id !== item.id);
          activePreset = null;
          renderPresets();
          renderItems();
          recalculate();
        });

        itemsList.appendChild(row);
      });
    }

    function recalculate() {
      const totalCost = items.reduce((sum, i) => sum + calcItemCost(i), 0);
      const sellPrice = Number(sellPriceInput.value) || 0;
      const basePrice = Number(document.getElementById('basePrice')?.value) || 0;
      const taxOpts = {
        intelCenter3: document.getElementById('intel3')?.value === '1',
        hmLvl: Number(document.getElementById('hmLvl')?.value) || 0
      };
      let tax = 0, netSell = sellPrice;
      if (basePrice > 0 && sellPrice > 0) {
        tax = fleaTax(basePrice, sellPrice, 1, taxOpts);
        netSell = sellPrice - tax;
      } else {
        const commission = Number(commissionInput.value) || 0;
        tax = sellPrice * commission / 100;
        netSell = sellPrice - tax;
      }
      const profit = netSell - totalCost;
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      document.getElementById('totalCost').textContent = formatNum(totalCost) + ' ₽';
      document.getElementById('netSell').textContent = formatNum(netSell) + ' ₽' + (tax ? ' (налог ' + formatNum(tax) + ')' : '');

      const profitEl = document.getElementById('profit');
      profitEl.textContent = (profit >= 0 ? '+' : '') + formatNum(profit) + ' ₽';
      profitEl.className = 'stat-value ' + (profit >= 0 ? 'profit-pos' : 'profit-neg');

      const roiEl = document.getElementById('roi');
      roiEl.textContent = totalCost > 0 ? (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%' : '—';
      roiEl.className = 'stat-value ' + (roi >= 0 ? 'profit-pos' : 'profit-neg');
    }

    addItemBtn.addEventListener('click', () => {
      items.push({ id: nextId++, name: '', qty: 1, price: 0 });
      activePreset = null;
      renderPresets();
      renderItems();
      recalculate();
    });

    sellPriceInput.addEventListener('input', recalculate);
    commissionInput.addEventListener('input', recalculate);
    ['basePrice','intel3','hmLvl'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('input', recalculate); el.addEventListener('change', recalculate); }
    });
    resultNameInput.addEventListener('input', () => {
      activePreset = null;
      renderPresets();
    });

    // init
    renderPresets();
    renderItems();
    recalculate();
  
    (function() {
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(window.itemName&&window.itemName!==itemName)return window.itemName(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s))s=(it.name&&!/^[a-f0-9]{20,}$/i.test(it.name)?it.name:it.normalizedName)||s;
    return s||it.id||'';
  }

      const SKEY = 'tarkovBarterCalcSettings';
      const s = loadSettings(SKEY, { commission: 0, intel3: '0', hmLvl: 0 });
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('commission', s.commission);
      set('intel3', s.intel3);
      set('hmLvl', s.hmLvl);
      if (s.basePrice != null) set('basePrice', s.basePrice);
      function persist() {
        saveSettings(SKEY, {
          commission: Number(document.getElementById('commission')?.value) || 0,
          intel3: document.getElementById('intel3')?.value || '0',
          hmLvl: Number(document.getElementById('hmLvl')?.value) || 0,
          basePrice: Number(document.getElementById('basePrice')?.value) || 0
        });
      }
      ['commission','intel3','hmLvl','basePrice'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', persist);
      });
    })();
  


(function(){
  const KEY = 'tarkovPreferredGameMode';
  const def = localStorage.getItem(KEY) || 'pve';
  document.querySelectorAll('select#gameMode, select[id*="gameMode"], select[id*="GameMode"]').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => {
      try { localStorage.setItem(KEY, sel.value); } catch(e) {}
    });
  });
})();
