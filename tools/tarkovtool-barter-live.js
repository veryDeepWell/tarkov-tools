

        
        
    const PRESETS = [
      {
        id: 'item-case',
        label: 'Кейс предметов',
        resultName: 'Кейс для предметов',
        resultSearch: 'item-case',
        items: [
          { name: 'Офтальмоскоп', search: 'ophthalmoscope', qty: 10 },
          { name: 'Медкомпоненты', search: 'pile-of-meds', qty: 25 }
        ]
      },
      {
        id: 'weapon-case-jaeger',
        label: 'Оружейный (Егерь)',
        resultName: 'Оружейный кейс',
        resultSearch: 'weapon-case',
        items: [
          { name: 'Пистолетный кейс', search: 'pistol-case', qty: 5 },
          { name: 'Экспедиционная канистра', search: 'expeditionary-fuel-tank', qty: 5 }
        ]
      },
      {
        id: 'weapon-case-mechanic',
        label: 'Оружейный (Механик)',
        resultName: 'Оружейный кейс',
        resultSearch: 'weapon-case',
        items: [
          { name: 'Электродвигатель', search: 'electric-motor', qty: 8 },
          { name: 'Пучок проводов', search: 'bundle-of-wires', qty: 15 },
          { name: 'Сломанный ЖК', search: 'broken-gphone', qty: 4 },
          { name: 'ФАР (phase array)', search: 'phased-array-element', qty: 1 }
        ]
      },
      {
        id: 'sicc',
        label: 'S I C C',
        resultName: 'Кейс S I C C',
        resultSearch: 's-i-c-c-organizational-pouch',
        items: [
          { name: 'Паракорд', search: 'paracord', qty: 12 },
          { name: 'Duct tape', search: 'duct-tape', qty: 15 },
          { name: 'Изолента', search: 'insulating-tape', qty: 15 },
          { name: 'Пачка гвоздей', search: 'pack-of-nails', qty: 15 }
        ]
      },
      {
        id: 'thicc-item',
        label: 'T H I C C предметов',
        resultName: 'T H I C C кейс предметов',
        resultSearch: 't-h-i-c-c-item-case',
        items: [
          { name: 'Дефибриллятор', search: 'portable-defibrillator', qty: 15 },
          { name: 'LEDX', search: 'ledx-skin-transilluminator', qty: 15 },
          { name: 'Ибупрофен', search: 'ibuprofen', qty: 15 },
          { name: 'Зубная паста', search: 'toothpaste', qty: 15 }
        ]
      },
      {
        id: 'thicc-booze',
        label: 'T H I C C (самогон)',
        resultName: 'T H I C C кейс предметов',
        resultSearch: 't-h-i-c-c-item-case',
        items: [
          { name: 'Самогон', search: 'moonshine', qty: 50 },
          { name: 'Водка', search: 'bottle-of-tarkovskaya-vodka', qty: 50 },
          { name: 'Виски', search: 'bottle-of-dan-jackiel-whiskey', qty: 30 }
        ]
      },
      {
        id: 'weapon-skier',
        label: 'Оружейный (Лыжник)',
        resultName: 'Оружейный кейс',
        resultSearch: 'weapon-case',
        items: [
          { name: 'Самогон', search: 'moonshine', qty: 10 },
          { name: 'Водка', search: 'bottle-of-tarkovskaya-vodka', qty: 10 },
          { name: 'Slickers', search: 'slickers', qty: 5 }
        ]
      },
      {
        id: 'money-case',
        label: 'Денежный кейс',
        resultName: 'Денежный кейс',
        resultSearch: 'money-case',
        items: [
          { name: 'Золотая цепочка', search: 'golden-neck-chain', qty: 5 },
          { name: 'Roler', search: 'roler-submariner', qty: 2 },
          { name: 'Золотой череп (кольцо)', search: 'gold-skull-ring', qty: 2 }
        ]
      }
    ];

    let items = [
      { id: 1, name: 'Офтальмоскоп', search: 'ophthalmoscope', qty: 10, price: 0, match: null },
      { id: 2, name: 'Медкомпоненты', search: 'pile-of-meds', qty: 25, price: 0, match: null }
    ];
    let nextId = 3;
    let activePreset = 'item-case';
    let catalog = null; // cached items array

    const itemsList = document.getElementById('itemsList');
    const presetsEl = document.getElementById('presets');
    const sellPriceInput = document.getElementById('sellPrice');
    const commissionInput = document.getElementById('commission');
    const resultNameInput = document.getElementById('resultName');
    const resultSearchInput = document.getElementById('resultSearch');
    const statusEl = document.getElementById('status');
    const progressWrap = document.getElementById('progressWrap');
    const progressBar = document.getElementById('progressBar');
    const progressLabel = document.getElementById('progressLabel');
    const resultMeta = document.getElementById('resultMeta');

        function calcItemCost(item) {
      return (Number(item.qty) || 0) * (Number(item.price) || 0);
    }
    
    // P1: single progress API (TarkovUI); DOM nodes only as host fallback
    function setProgress(pct, label, indeterminate) {
      var P = window.TarkovUI && TarkovUI.progress;
      if (!P) return;
      if (indeterminate || pct < 0) {
        P.start({ host: progressWrap, label: label || '', indeterminate: true });
        P.set(-1, label, { indeterminate: true });
        return;
      }
      if (pct <= 0) P.start({ host: progressWrap, label: label || '' });
      else P.set(pct, label);
    }
    function hideProgress() {
      try {
        if (window.TarkovUI && TarkovUI.progress) TarkovUI.progress.done();
      } catch (e) {}
    }

    function playDoneSound() {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = playDoneSound._ctx || (playDoneSound._ctx = new Ctx());
        if (ctx.state === 'suspended') ctx.resume();
        const notes = [523.25, 659.25, 783.99, 1046.5];
        const t0 = ctx.currentTime + 0.02;
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = freq;
          const start = t0 + i * 0.09;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(start); osc.stop(start + 0.25);
        });
      } catch (e) {}
    }

    /**
     * Оценка стоимости покупки qty штук на барахолке.
     * API не отдаёт список лотов — только avg / lastLow / lastOfferCount.
     * Режим buyN: первые min(qty, offers) условно по lastLow,
     * остаток — по avg24h (если avg нет — по lastLow).
     * Если офферов мало, «добивка» дороже средней.
     */
    function estimateBuyCost(apiItem, qty) {
      qty = Math.max(0, Number(qty) || 0);
      if (!apiItem || qty === 0) return { unit: 0, total: 0, detail: '' };

      const avg = Number(apiItem.avg24hPrice) || 0;
      const low = Number(apiItem.lastLowPrice) || 0;
      const high = Number(apiItem.high24hPrice) || 0;
      const offers = Number(apiItem.lastOfferCount) || 0;
      const mode = document.getElementById('priceMode').value;

      if (mode === 'avg24h') {
        const u = avg || low || 0;
        return { unit: u, total: u * qty, detail: `avg × ${qty}` };
      }
      if (mode === 'lastLow') {
        const u = low || avg || 0;
        return { unit: u, total: u * qty, detail: `min × ${qty}` };
      }
      if (mode === 'max') {
        const u = Math.max(avg, low) || 0;
        return { unit: u, total: u * qty, detail: `max(avg,min) × ${qty}` };
      }

      // buyN — оценка суммы N лотов
      const cheap = low || avg || 0;
      const mid = avg || low || 0;
      // если офферов меньше чем нужно — «хвост» ближе к high/avg*1.15
      const expensive = high || Math.round(mid * 1.15) || mid;

      let atCheap = offers > 0 ? Math.min(qty, offers) : Math.min(qty, 1);
      // lastLow часто один лот; не верь что все offers = lastLow
      // эвристика: ~20% офферов около минимума, остальное около avg
      if (offers > 1) {
        atCheap = Math.min(qty, Math.max(1, Math.ceil(offers * 0.2)));
      }
      const atMid = Math.min(qty - atCheap, Math.max(0, offers - atCheap));
      const atHigh = qty - atCheap - atMid;

      const total = atCheap * cheap + atMid * mid + atHigh * expensive;
      const unit = qty > 0 ? total / qty : 0;
      const detail = [
        atCheap ? `${atCheap}×min(${formatNum(cheap)})` : '',
        atMid ? `${atMid}×avg(${formatNum(mid)})` : '',
        atHigh ? `${atHigh}×high(${formatNum(expensive)})` : ''
      ].filter(Boolean).join(' + ');
      return { unit, total, detail, offers, cheap, mid };
    }

    function pickPrice(apiItem, qty) {
      return estimateBuyCost(apiItem, qty || 1).unit;
    }

    function findInCatalog(query) {
      if (!catalog || !query) return null;
      const q = query.toLowerCase().trim();
      if (!q) return null;

      // exact normalizedName
      let hit = catalog.find(i => (i.normalizedName || '') === q);
      if (hit) return hit;

      // includes, prefer shorter normalizedName (more specific)
      const hits = catalog.filter(i => {
        const n = (i.normalizedName || '').toLowerCase();
        return n === q || n.includes(q) || q.includes(n);
      });
      if (!hits.length) {
        // also try shortName / name placeholders unlikely; try slug words
        return null;
      }
      hits.sort((a, b) => {
        const an = a.normalizedName || '', bn = b.normalizedName || '';
        // exact first
        if (an === q && bn !== q) return -1;
        if (bn === q && an !== q) return 1;
        // avoid thicc variants when searching base case
        const aThicc = /t-h-i-c-c|thicc/.test(an);
        const bThicc = /t-h-i-c-c|thicc/.test(bn);
        if (aThicc !== bThicc) return aThicc ? 1 : -1;
        return an.length - bn.length;
      });
      return hits[0];
    }

    function renderPresets() {
      presetsEl.innerHTML = '';
      PRESETS.forEach(p => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-btn' + (activePreset === p.id ? ' active' : '');
        btn.textContent = p.label;
        btn.onclick = () => applyPreset(p);
        presetsEl.appendChild(btn);
      });
    }

    function applyPreset(p) {
      activePreset = p.id;
      resultNameInput.value = p.resultName;
      resultSearchInput.value = p.resultSearch || '';
      sellPriceInput.value = '';
      items = p.items.map((it, i) => ({
        id: i + 1,
        name: it.name,
        search: it.search || '',
        qty: it.qty,
        price: 0,
        match: null
      }));
      nextId = items.length + 1;
      resultMeta.textContent = '';
      renderPresets();
      renderItems();
      recalculate();
    }

    function renderItems() {
      itemsList.innerHTML = '';
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'item-row';
        const matchCls = item.match ? 'matched' : (item.search ? 'unmatched' : '');
        const matchText = item.match
          ? `✓ ${item.match.normalizedName} · avg ${formatNum(item.match.avg24hPrice || 0)} · min ${formatNum(item.match.lastLowPrice || 0)} · офферов ${item.match.lastOfferCount || '—'}`
            + (item.buyDetail ? ` · оценка: ${item.buyDetail} = ${formatNum(item.buyTotal || calcItemCost(item))} ₽` : '')
          : (item.search ? `ключ: ${item.search}` : '');

        const icon = (item.match && (item.match.iconLink || item.match.gridImageLink)) || '';
        row.innerHTML = `
          ${icon ? `<img class="ico" src="${escapeHtml(icon)}" loading="lazy" alt="" style="align-self:center">` : ''}
          <div class="field" style="flex:1.4;min-width:120px;">
            <label>Название</label>
            <input type="text" class="item-name" value="${escapeHtml(item.name)}">
          </div>
          <div class="field" style="flex:1;min-width:110px;">
            <label>Ключ API</label>
            <input type="text" class="item-search" value="${escapeHtml(item.search || '')}" placeholder="normalized-name">
          </div>
          <div class="field narrow">
            <label>Кол-во</label>
            <input type="number" class="item-qty" min="1" value="${item.qty}">
          </div>
          <div class="field">
            <label>Цена, ₽</label>
            <input type="number" class="item-price" min="0" step="1000" value="${item.price}">
          </div>
          <div class="price-quick">
            <button type="button" class="btn-quick" data-delta="-1000">−</button>
            <button type="button" class="btn-quick" data-delta="1000">+</button>
          </div>
          <div class="item-cost">${formatNum(calcItemCost(item))} ₽</div>
          <button type="button" class="btn-danger remove-btn" title="Удалить">✕</button>
          <div class="price-meta ${matchCls}" style="width:100%;">${escapeHtml(matchText)}</div>
        `;

        const nameInput = row.querySelector('.item-name');
        const searchInput = row.querySelector('.item-search');
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        const costEl = row.querySelector('.item-cost');

        const update = () => {
          item.name = nameInput.value;
          item.search = searchInput.value;
          item.qty = Number(qtyInput.value) || 0;
          item.price = Math.max(0, Number(priceInput.value) || 0);
          priceInput.value = item.price;
          costEl.textContent = formatNum(calcItemCost(item)) + ' ₽';
          recalculate();
        };
        nameInput.addEventListener('input', update);
        searchInput.addEventListener('input', update);
        qtyInput.addEventListener('input', update);
        priceInput.addEventListener('input', update);

        row.querySelectorAll('.btn-quick').forEach(btn => {
          btn.addEventListener('click', () => {
            const delta = Number(btn.dataset.delta) || 0;
            priceInput.value = Math.max(0, (Number(priceInput.value) || 0) + delta);
            update();
          });
        });

        row.querySelector('.remove-btn').addEventListener('click', () => {
          items = items.filter(i => i.id !== item.id);
          activePreset = null;
          renderPresets();
          renderItems();
          recalculate();
        });

        itemsList.appendChild(row);
      });
    }

    let resultBasePrice = 0; // set when prices pulled

    function taxOpts() {
      return {
        intelCenter3: document.getElementById('intel3')?.value === '1',
        hmLvl: Number(document.getElementById('hmLvl')?.value) || 0
      };
    }

    function recalculate() {
      const totalCost = items.reduce((s, i) => s + calcItemCost(i), 0);
      const sellPrice = Number(sellPriceInput.value) || 0;
      const bp = resultBasePrice || 0;
      let tax = 0, netSell = sellPrice;
      if (bp > 0 && sellPrice > 0) {
        tax = fleaTax(bp, sellPrice, 1, taxOpts());
        netSell = sellPrice - tax;
      } else {
        // fallback % if no basePrice yet
        const commission = Number(document.getElementById('commission')?.value) || 0;
        tax = sellPrice * commission / 100;
        netSell = sellPrice - tax;
      }
      const profit = netSell - totalCost;
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      document.getElementById('totalCost').textContent = formatNum(totalCost) + ' ₽';
      document.getElementById('netSell').textContent = formatNum(netSell) + ' ₽';
      const taxEl = document.getElementById('taxAmount');
      if (taxEl) taxEl.textContent = formatNum(tax) + ' ₽';
      const profitEl = document.getElementById('profit');
      profitEl.textContent = (profit >= 0 ? '+' : '') + formatNum(profit) + ' ₽';
      profitEl.className = 'stat-value ' + (profit >= 0 ? 'pos' : 'neg');
      const roiEl = document.getElementById('roi');
      roiEl.textContent = totalCost > 0 ? roi.toFixed(1) + '%' : '—';
      roiEl.className = 'stat-value ' + (roi >= 0 ? 'pos' : 'neg');
    }

    async function fetchCatalog() {
      const mode = document.getElementById('gameMode').value || 'regular';
      const res = await fetch(`https://json.tarkov.dev/${mode}/items`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      let itemsData = json?.data?.items;
      if (!itemsData) throw new Error('Нет data.items');
      if (!Array.isArray(itemsData)) itemsData = Object.values(itemsData);
      catalog = itemsData;
      return catalog;
    }

    document.getElementById('fetchPricesBtn').addEventListener('click', async () => {
      const btn = document.getElementById('fetchPricesBtn');
      btn.disabled = true;
      statusEl.className = 'status';
      statusEl.textContent = 'Гружу каталог…';
      setProgress(10, 'Качаю items с json.tarkov.dev…', true);

      try {
        await fetchCatalog();
        setProgress(60, 'Ищу совпадения…', false);
        await new Promise(r => setTimeout(r, 30));

        let found = 0, missed = 0;

        // result
        const resultHit = findInCatalog(resultSearchInput.value);
        if (resultHit) {
          // продажа — ориентир avg24h (или lastLow), не «покупка N»
          const sellRef = resultHit.avg24hPrice || resultHit.lastLowPrice || 0;
          if (sellRef > 0) sellPriceInput.value = sellRef;
          resultBasePrice = Number(resultHit.basePrice) || 0;
          resultMeta.innerHTML = `${resultHit.iconLink||resultHit.gridImageLink?`<img class="ico ico-sm" src="${escapeHtml(resultHit.iconLink||resultHit.gridImageLink)}" loading="lazy" alt="" style="vertical-align:middle;margin-right:6px">`:''}<span class="matched">✓ ${escapeHtml(resultHit.normalizedName)}</span> · avg ${formatNum(resultHit.avg24hPrice || 0)} · min ${formatNum(resultHit.lastLowPrice || 0)} · офферов ${resultHit.lastOfferCount || '—'}`;
          found++;
        } else {
          resultMeta.innerHTML = `<span class="unmatched">не найдено по ключу «${escapeHtml(resultSearchInput.value)}»</span>`;
          missed++;
        }

        items.forEach(item => {
          const hit = findInCatalog(item.search || item.name);
          item.match = hit;
          item.buyDetail = '';
          if (hit) {
            const est = estimateBuyCost(hit, item.qty);
            // в поле «цена за шт» кладём эффективную среднюю за N штук
            if (est.unit > 0) item.price = Math.round(est.unit);
            item.buyDetail = est.detail;
            item.buyTotal = Math.round(est.total);
            found++;
          } else {
            missed++;
          }
        });

        setProgress(100, 'Готово', false);
        statusEl.className = 'status ok';
        statusEl.textContent = `Цены обновлены · найдено ${found}, не найдено ${missed}`;
        renderItems();
        recalculate();
        playDoneSound();
        setTimeout(hideProgress, 800);
      } catch (err) {
        console.error(err);
        statusEl.className = 'status err';
        statusEl.textContent = 'Ошибка: ' + (err.message || err);
        hideProgress();
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('addItemBtn').addEventListener('click', () => {
      items.push({ id: nextId++, name: '', search: '', qty: 1, price: 0, match: null });
      activePreset = null;
      renderPresets();
      renderItems();
      recalculate();
    });

    sellPriceInput.addEventListener('input', recalculate);
    commissionInput.addEventListener('input', recalculate);
    document.getElementById('priceMode').addEventListener('change', () => {
      if (!catalog) return;
      items.forEach(item => {
        if (item.match) {
          const est = estimateBuyCost(item.match, item.qty);
          item.price = Math.round(est.unit);
          item.buyDetail = est.detail;
          item.buyTotal = Math.round(est.total);
        }
      });
      const resultHit = findInCatalog(resultSearchInput.value);
      if (resultHit) {
        // для продажи результата берём одну штуку по выбранному режиму
        const est = estimateBuyCost(resultHit, 1);
        if (est.unit > 0) sellPriceInput.value = Math.round(est.unit);
      }
      renderItems();
      recalculate();
    });

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

      const SKEY = 'tarkovBarterLiveSettings';
      const s = loadSettings(SKEY, { gameMode: 'regular', priceMode: 'buyN', commission: 0, intel3: '0', hmLvl: 0 });
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('gameMode', s.gameMode);
      set('priceMode', s.priceMode);
      set('commission', s.commission);
      set('intel3', s.intel3);
      set('hmLvl', s.hmLvl);
      function persist() {
        saveSettings(SKEY, {
          gameMode: document.getElementById('gameMode')?.value,
          priceMode: document.getElementById('priceMode')?.value,
          commission: Number(document.getElementById('commission')?.value) || 0,
          intel3: document.getElementById('intel3')?.value || '0',
          hmLvl: Number(document.getElementById('hmLvl')?.value) || 0
        });
        recalculate();
      }
      ['gameMode','priceMode','commission','intel3','hmLvl'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.addEventListener('change', persist); el.addEventListener('input', persist); }
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

    try {
      var hb = document.getElementById('helpBtn');
      if (hb) hb.onclick = function () {
        if (window.TarkovUI && TarkovUI.helpModal) {
          var h = TarkovUI.toolHelpFromI18n('barter-live');
          TarkovUI.helpModal({
            title: h.title || 'Barter (live)',
            body: h.body || 'Load flea prices, pick a trader preset, set what you receive and components, then calculate profit. Tax is simplified.'
          });
        }
      };
    } catch (e) {}

})();
