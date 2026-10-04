

        
        
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
    let resultMatch = null;
    let resultSearchMiss = false;
    let statusState = null;
    let resultNameUserEdited = false;

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

    function t(key, params) {
      return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
    }

    function setStatus(key, params, tone) {
      statusState = { key, params, tone: tone || '' };
      renderStatus();
    }

    function renderStatus() {
      if (!statusState) return;
      statusEl.className = 'status' + (statusState.tone ? ' ' + statusState.tone : '');
      statusEl.textContent = t('tool.barter-live.ui.' + statusState.key, statusState.params);
    }

    function renderResultMeta() {
      if (resultMatch) {
        const icon = resultMatch.iconLink || resultMatch.gridImageLink || '';
        resultMeta.innerHTML = `${icon ? `<img class="ico ico-sm" src="${escapeHtml(icon)}" loading="lazy" alt="" style="vertical-align:middle;margin-right:6px">` : ''}<span class="matched">✓ ${escapeHtml(resultMatch.normalizedName)}</span> · ${t('tool.barter-live.ui.average')} ${formatNum(resultMatch.avg24hPrice || 0)} · ${t('tool.barter-live.ui.minimum')} ${formatNum(resultMatch.lastLowPrice || 0)} · ${t('tool.barter-live.ui.offers')} ${resultMatch.lastOfferCount || '—'}`;
      } else if (resultSearchMiss) {
        resultMeta.innerHTML = `<span class="unmatched">${escapeHtml(t('tool.barter-live.ui.unmatched', { key: resultSearchInput.value }))}</span>`;
      } else {
        resultMeta.textContent = '';
      }
    }

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
        if (window.TarkovTools && typeof TarkovTools.beep === 'function') {
          TarkovTools.beep('ok', 'tarkovtool-barter-live.html');
        }
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
        return { unit: u, total: u * qty, detail: `${t('tool.barter-live.ui.average')} × ${qty}` };
      }
      if (mode === 'lastLow') {
        const u = low || avg || 0;
        return { unit: u, total: u * qty, detail: `${t('tool.barter-live.ui.minimum')} × ${qty}` };
      }
      if (mode === 'max') {
        const u = Math.max(avg, low) || 0;
        return { unit: u, total: u * qty, detail: `${t('tool.barter-live.ui.high')} (${t('tool.barter-live.ui.average')}/${t('tool.barter-live.ui.minimum')}) × ${qty}` };
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
        atCheap ? `${atCheap}×${t('tool.barter-live.ui.minimum')}(${formatNum(cheap)})` : '',
        atMid ? `${atMid}×${t('tool.barter-live.ui.average')}(${formatNum(mid)})` : '',
        atHigh ? `${atHigh}×${t('tool.barter-live.ui.high')}(${formatNum(expensive)})` : ''
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
        btn.textContent = t('tool.barter-live.ui.presetLabel.' + p.id);
        btn.onclick = () => applyPreset(p);
        presetsEl.appendChild(btn);
      });
    }

    function applyPreset(p) {
      activePreset = p.id;
      resultNameUserEdited = false;
      resultNameInput.value = t('tool.barter-live.ui.resultName.' + p.id);
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
      resultMatch = null;
      resultSearchMiss = false;
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
        const estimate = item.match ? estimateBuyCost(item.match, item.qty) : null;
        const matchText = item.match
          ? `✓ ${item.match.normalizedName} · ${t('tool.barter-live.ui.average')} ${formatNum(item.match.avg24hPrice || 0)} · ${t('tool.barter-live.ui.minimum')} ${formatNum(item.match.lastLowPrice || 0)} · ${t('tool.barter-live.ui.offers')} ${item.match.lastOfferCount || '—'}`
            + (estimate && estimate.detail ? ` · ${t('tool.barter-live.ui.estimate')}: ${estimate.detail} = ${formatNum(item.buyTotal || calcItemCost(item))} ₽` : '')
          : (item.search ? `${t('tool.barter-live.ui.searchKey')}: ${item.search}` : '');

        const icon = (item.match && (item.match.iconLink || item.match.gridImageLink)) || '';
        row.innerHTML = `
          ${icon ? `<img class="ico" src="${escapeHtml(icon)}" loading="lazy" alt="" style="align-self:center">` : ''}
          <div class="field" style="flex:1.4;min-width:120px;">
            <label>${escapeHtml(t('tool.barter-live.ui.itemName'))}</label>
            <input type="text" class="item-name" value="${escapeHtml(item.name)}">
          </div>
          <div class="field" style="flex:1;min-width:110px;">
            <label>${escapeHtml(t('tool.barter-live.ui.apiKey'))}</label>
            <input type="text" class="item-search" value="${escapeHtml(item.search || '')}" placeholder="normalized-name">
          </div>
          <div class="field narrow">
            <label>${escapeHtml(t('tool.barter-live.ui.quantity'))}</label>
            <input type="number" class="item-qty" min="1" value="${item.qty}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('tool.barter-live.ui.unitPrice'))}</label>
            <input type="number" class="item-price" min="0" step="1000" value="${item.price}">
          </div>
          <div class="price-quick">
            <button type="button" class="btn-quick" data-delta="-1000">−</button>
            <button type="button" class="btn-quick" data-delta="1000">+</button>
          </div>
          <div class="item-cost">${formatNum(calcItemCost(item))} ₽</div>
          <button type="button" class="btn-danger remove-btn" title="${escapeHtml(t('tool.barter-live.ui.remove'))}">✕</button>
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
      const result = TarkovItemDomain.evaluateProfit(
        bp,
        sellPrice,
        1,
        totalCost,
        Object.assign({}, taxOpts(), {
          commissionPercent: Number(document.getElementById('commission')?.value) || 0
        })
      );
      const tax = result.tax;
      const netSell = result.revenue;
      const profit = result.profit;
      const roi = result.roi;

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
      let itemsData = [];
      if (window.TarkovAPI && typeof TarkovAPI.items === 'function') {
        itemsData = await TarkovAPI.items(mode);
      } else if (window.TarkovAPI && typeof TarkovAPI.getJson === 'function') {
        const json = await TarkovAPI.getJson(`/${mode}/items`);
        itemsData = TarkovAPI.asArray ? TarkovAPI.asArray(json) : (json?.data?.items || json || []);
      } else {
        throw new Error(t('tool.barter-live.ui.apiUnavailable'));
      }
      if (!Array.isArray(itemsData)) itemsData = Object.values(itemsData);
      catalog = itemsData;
      return catalog;
    }

    document.getElementById('fetchPricesBtn').addEventListener('click', async () => {
      const btn = document.getElementById('fetchPricesBtn');
      btn.disabled = true;
      setStatus('loading');
      setProgress(10, t('tool.barter-live.ui.loadingItems'), true);

      try {
        await fetchCatalog();
        setProgress(60, t('tool.barter-live.ui.matching'), false);
        await new Promise(r => setTimeout(r, 30));

        let found = 0, missed = 0;

        // result
        const resultHit = findInCatalog(resultSearchInput.value);
        if (resultHit) {
          resultMatch = resultHit;
          resultSearchMiss = false;
          // продажа — ориентир avg24h (или lastLow), не «покупка N»
          const sellRef = resultHit.avg24hPrice || resultHit.lastLowPrice || 0;
          if (sellRef > 0) sellPriceInput.value = sellRef;
          resultBasePrice = Number(resultHit.basePrice) || 0;
          renderResultMeta();
          found++;
        } else {
          resultMatch = null;
          resultSearchMiss = true;
          renderResultMeta();
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

        setProgress(100, t('tool.barter-live.ui.done'), false);
        setStatus('updated', { found, missed }, 'ok');
        renderItems();
        recalculate();
        playDoneSound();
        setTimeout(hideProgress, 800);
      } catch (err) {
        console.error(err);
        setStatus('loadError', { message: err.message || err }, 'err');
        hideProgress();
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('addItemBtn').addEventListener('click', () => {
      items.push({ id: nextId++, name: '', search: '', qty: 1, price: 0, match: null });
      activePreset = null;
      const initialPreset = PRESETS.find(p => p.id === activePreset);
      if (initialPreset) resultNameInput.value = t('tool.barter-live.ui.resultName.' + initialPreset.id);
      renderPresets();
      renderItems();
      recalculate();
    });

    sellPriceInput.addEventListener('input', recalculate);
    commissionInput.addEventListener('input', recalculate);
    resultNameInput.addEventListener('input', () => {
      resultNameUserEdited = true;
      activePreset = null;
      renderPresets();
    });
    resultSearchInput.addEventListener('input', () => {
      activePreset = null;
      renderPresets();
      if (resultSearchMiss) renderResultMeta();
    });
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

    window.addEventListener('tt-lang-changed', () => {
      const preset = PRESETS.find(p => p.id === activePreset);
      if (preset && !resultNameUserEdited) {
        resultNameInput.value = t('tool.barter-live.ui.resultName.' + preset.id);
      }
      renderPresets();
      renderItems();
      renderResultMeta();
      renderStatus();
      recalculate();
    });

    if (window.TarkovI18n && typeof TarkovI18n.ready === 'function') {
      TarkovI18n.ready().then(() => {
        const preset = PRESETS.find(p => p.id === activePreset);
        if (preset && !resultNameUserEdited) {
          resultNameInput.value = t('tool.barter-live.ui.resultName.' + preset.id);
        }
        renderPresets();
        renderItems();
        renderResultMeta();
        renderStatus();
        recalculate();
      });
    }
  
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
