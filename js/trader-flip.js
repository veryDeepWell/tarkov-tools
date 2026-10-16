

    /** Комиссия барахолки (формула wiki BSG).
     *  basePrice — handbook/base из API
     *  offerPrice — цена лота за 1 шт
     *  count — количество в лоте
     *  intelCenter3 — разведцентр 3 ур. (−30%)
     *  hmLvl — Hideout Management 0..50 (+0.3% за уровень, до −45% суммарно с IC3)
     */
        
        
    function t(key, params) {
      return window.TarkovI18n && TarkovI18n.t
        ? TarkovI18n.t('tool.trader-flip.ui.' + key, params)
        : key;
    }

    const TRADERS_UI = [
      { id: 'prapor' },
      { id: 'therapist' },
      { id: 'skier' },
      { id: 'peacekeeper' },
      { id: 'mechanic' },
      { id: 'ragman' },
      { id: 'jaeger' },
      { id: 'ref' }
    ];

    const TRADER_ID_FALLBACK = (window.TarkovDicts && TarkovDicts.traders)
      ? TarkovDicts.traders.reduce((acc, t) => { acc[t.id] = t.key; return acc; }, {})
      : {
      '54cb50c76803fa8b248b4571': 'prapor',
      '54cb57776803fa99248b456e': 'therapist',
      '579dc571d53a0658a154fbec': 'fence',
      '58330581ace78e27b8b10cee': 'skier',
      '5935c25fb3acc3127c3d8cd9': 'peacekeeper',
      '5a7c2eca46aef81a7ca2145d': 'mechanic',
      '5ac3b934156ae10c4430e83c': 'ragman',
      '5c0647fdd443bc2504c2d371': 'jaeger',
      '6617beeaa9cfa777ca915b7c': 'ref',
      '638f541a29ffd1183d187f57': 'lightkeeper'
    };

    const COLUMNS = [
      { key: 'name', sort: true },
      { key: 'trader', sort: true },
      { key: 'll', sort: true },
      { key: 'quest', sort: true },
      { key: 'buyLimit', sort: true },
      { key: 'traderPrice', sort: true },
      { key: 'avg24h', sort: true },
      { key: 'lastLow', sort: true },
      { key: 'offers', sort: true },
      { key: 'profit', sort: true },
      { key: 'roi', sort: true },
      { key: 'types', sort: false },
      { key: 'copy', sort: false }
    ];

    let rawRows = [];
    let traderIdMap = { ...TRADER_ID_FALLBACK };
    let sortKey = 'profit';
    let sortDir = -1;
    let activeTypes = new Set();
    let filtersInitialized = false;

    const tradersEl = document.getElementById('traders');

    function itemName(it){
      if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
      if(!it)return '';
      if(typeof it==='string')return it;
      var s=String((it.shortName||it.name||it.normalizedName||'')||'').trim();
      if(/^[a-f0-9]{20,}$/i.test(s)) {
        var n=String(it.name||'').trim();
        var sl=String(it.normalizedName||'').trim();
        if(n && !/^[a-f0-9]{20,}$/i.test(n)) s=n;
        else if(sl) s=sl;
      }
      return s||it.id||'';
    }

    /** R2.1: LL from TarkovProfile; one-shot migrate legacy tarkovFlipSettings.traderLevels */
    const _savedLL = (function() {
      var fromProfile = {};
      try {
        if (window.TarkovProfile && TarkovProfile.getActive) {
          var p = TarkovProfile.getActive();
          if (p && p.traders) fromProfile = Object.assign({}, p.traders);
        }
      } catch (e) { try { console.debug && console.debug("[tt:trader-flip]", e); } catch (_tt) { /* ignore */ } }
      var legacy = {};
      try {
        var s = TarkovStorage.getJson('tarkovFlipSettings', {}) || {};
        legacy = s.traderLevels || {};
      } catch (e2) { try { console.debug && console.debug("[tt:trader-flip]", e2); } catch (_tt) { /* ignore */ } }
      // migrate legacy into profile if profile still defaults (all 1) and legacy has higher
      try {
        if (window.TarkovProfile && TarkovProfile.update && legacy && Object.keys(legacy).length) {
          var allDefault = true;
          Object.keys(fromProfile).forEach(function (k) {
            if (Number(fromProfile[k]) > 1) allDefault = false;
          });
          if (allDefault) {
            var patch = {};
            Object.keys(legacy).forEach(function (k) {
              var n = Number(legacy[k]);
              if (isFinite(n) && n >= 1) patch[k] = Math.min(4, n | 0);
            });
            if (Object.keys(patch).length) {
              TarkovProfile.update({ traders: patch });
              fromProfile = Object.assign({}, fromProfile, patch);
            }
            // drop traderLevels from settings
            try {
              var s2 = TarkovStorage.getJson('tarkovFlipSettings', {}) || {};
              if (s2.traderLevels) { delete s2.traderLevels; TarkovStorage.setJson('tarkovFlipSettings', s2); }
            } catch (e3) { try { console.debug && console.debug("[tt:trader-flip]", e3); } catch (_tt) { /* ignore */ } }
          }
        }
      } catch (e4) { try { console.debug && console.debug("[tt:trader-flip]", e4); } catch (_tt) { /* ignore */ } }
      return fromProfile;
    })();

    TRADERS_UI.forEach(trader => {
      const div = document.createElement('div');
      div.className = 'trader-row';
      const saved = _savedLL[trader.id];
      const cur = saved != null ? String(saved) : '1';
      div.innerHTML = `
        <label>${TarkovDicts.traderName ? TarkovDicts.traderName(trader.id) : t('trader.' + trader.id)}</label>
        <select data-trader="${trader.id}">
          <option value="0"${cur==='0'?' selected':''}>${t('no')}</option>
          <option value="1"${cur==='1'?' selected':''}>${t('loyaltyLevel', { level: 1 })}</option>
          <option value="2"${cur==='2'?' selected':''}>${t('loyaltyLevel', { level: 2 })}</option>
          <option value="3"${cur==='3'?' selected':''}>${t('loyaltyLevel', { level: 3 })}</option>
          <option value="4"${cur==='4'?' selected':''}>${t('loyaltyLevel', { level: 4 })}</option>
        </select>`;
      tradersEl.appendChild(div);
      div.querySelector('select').addEventListener('change', () => {
        // R2.1: write LL to profile immediately
        try {
          if (window.TarkovProfile && TarkovProfile.update) {
            const patch = {};
            TRADERS_UI.forEach(tr => {
              const sel = tradersEl.querySelector(`select[data-trader="${tr.id}"]`);
              if (sel) {
                var n = Number(sel.value);
                patch[tr.id] = (!isFinite(n) || n < 1) ? 1 : Math.min(4, n | 0);
              }
            });
            TarkovProfile.update({ traders: patch });
          }
        } catch (e) { try { console.debug && console.debug("[tt:trader-flip]", e); } catch (_tt) { /* ignore */ } }
        try { if (typeof renderTable === 'function') renderTable(); } catch (e2) { try { console.debug && console.debug("[tt:trader-flip]", e2); } catch (_tt) { /* ignore */ } }
      });
    });
    try {
      if (window.TarkovProfile && TarkovProfile.bindTraderLL) TarkovProfile.bindTraderLL(tradersEl);
    } catch (eBind) { try { console.debug && console.debug("[tt:trader-flip]", eBind); } catch (_tt) { /* ignore */ } }

    function getTraderLevels() {
      const map = {};
      TRADERS_UI.forEach(t => {
        const sel = tradersEl.querySelector(`select[data-trader="${t.id}"]`);
        if (sel) map[t.id] = Number(sel.value);
        else if (window.TarkovProfile && TarkovProfile.traderLL) map[t.id] = TarkovProfile.traderLL(t.id);
        else map[t.id] = 1;
      });
      return map;
    }

    function humanizeName(item) {
      const n = item.normalizedName || '';
      if (n) return n.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return item.shortName || item.id || '?';
    }

    function traderLabel(idOrKey) {
      const key = (traderIdMap[idOrKey] || idOrKey || '').toLowerCase();
      return window.TarkovDicts && TarkovDicts.traderName
        ? TarkovDicts.traderName(key)
        : (t('trader.' + key) === 'trader.' + key ? key : t('trader.' + key));
    }

    const statusEl = document.getElementById('status');
    const fetchBtn = document.getElementById('fetchBtn');
    let statusState = null;
    function setStatus(key, params, tone) {
      statusState = { key, params, tone: tone || '' };
      renderStatus();
    }
    function renderStatus() {
      if (!statusState) return;
      statusEl.className = 'status' + (statusState.tone ? ' ' + statusState.tone : '');
      statusEl.textContent = t(statusState.key, statusState.params);
    }

    const progressWrap = document.getElementById('progressWrap');
    const progressBar = document.getElementById('progressBar');
    const progressLabel = document.getElementById('progressLabel');
    let progressState = null;

    function setProgress(pct, key, params, indeterminate) {
      progressState = { pct, key, params, indeterminate };
      progressWrap.classList.add('visible');
      progressLabel.textContent = t(key, params);
      progressBar.classList.toggle('indeterminate', !!indeterminate);
      if (!indeterminate) {
        progressBar.style.width = Math.max(0, Math.min(100, pct)) + '%';
      }
    }

    function hideProgress() {
      progressWrap.classList.remove('visible');
      progressBar.classList.remove('indeterminate');
      progressBar.style.width = '0%';
      progressLabel.textContent = '';
      progressState = null;
    }

    function renderProgress() {
      if (!progressState) return;
      progressLabel.textContent = t(progressState.key, progressState.params);
    }



    fetchBtn.addEventListener('click', async () => {
      fetchBtn.disabled = true;
      const mode = document.getElementById('gameMode').value || 'regular';
      setStatus('loading', { mode });
      setProgress(5, 'connecting', null, true);

      try {
        setProgress(15, 'loadingItems', null, true);
        const itemsPromise = TarkovAPI.items(mode);
        const tradersPromise = TarkovAPI.traders(mode).catch(() => null);

        const [items, tradersList] = await Promise.all([itemsPromise, tradersPromise]);
        setProgress(55, 'processing');

        (tradersList || []).forEach(t => {
          if (t && t.id && t.normalizedName) traderIdMap[t.id] = t.normalizedName;
        });

        setProgress(75, 'calculating', { count: items.length });
        // yield so the browser can paint the progress bar
        await new Promise(r => setTimeout(r, 40));
        processItems(items);
        setProgress(100, 'done');

        setStatus('loaded', { items: items.length, offers: rawRows.length }, 'ok');
        document.getElementById('resultsCard').style.display = 'block';
        filtersInitialized = false;
        renderFilters();
        renderTable();
        if (typeof Notify === 'function') {
          Notify({
            title: t('notificationTitle'),
            body: t('notificationBody', { items: items.length, offers: rawRows.length }),
            tool: 'tarkovtool-trader-flip.html',
            kind: 'ok'
          });
        }
        setTimeout(hideProgress, 900);
      } catch (err) {
        console.error(err);
        setStatus('loadError', { message: err.message || err }, 'err');
        hideProgress();
      } finally {
        fetchBtn.disabled = false;
      }
    });

    function processItems(items) {
      const levels = getTraderLevels();
      const taxOpts = { intelCenter3: document.getElementById('intel3').value === '1', hmLvl: Number(document.getElementById('hmLvl').value) || 0 };
      rawRows = [];

      for (const item of items) {
        const offers = item.buyFromTrader;
        if (!Array.isArray(offers) || !offers.length) continue;

        const avg = item.avg24hPrice || 0;
        const lastLow = item.lastLowPrice || 0;
        if (!avg && !lastLow) continue;

        const name = humanizeName(item);
        const typesArr = item.types || [];
        const offersCount = item.lastOfferCount || 0;

        for (const offer of offers) {
          const traderId = offer.trader;
          const traderKey = (traderIdMap[traderId] || TRADER_ID_FALLBACK[traderId] || '').toLowerCase();
          if (!traderKey || traderKey === 'fence') continue;

          const reqLL = Number(offer.minTraderLevel) || 1;
          const myLL = levels[traderKey] ?? 0;
          // 0 in UI = trader disabled — skip entirely
          if (myLL < 1) continue;

          const traderPrice = offer.priceRUB != null ? Number(offer.priceRUB) : Number(offer.price);
          if (!traderPrice || traderPrice <= 0) continue;

          const fleaRef = avg || lastLow;
          const basePrice = Number(item.basePrice) || 0;
          const result = TarkovItemDomain.evaluateProfit(basePrice, fleaRef, 1, traderPrice, taxOpts);
          const tax = result.tax;
          const netFlea = result.revenue;
          const profit = Math.round(result.profit);
          const roi = result.roi;

          const tu = offer.taskUnlock;
          const questLocked = tu != null && tu !== '' && tu !== false;
          let questName = '';
          if (questLocked) {
            if (typeof tu === 'object') {
              questName = String(tu.name || tu.id || '');
            } else {
              questName = String(tu);
            }
          }

          var gateRes = null;
          if (window.TarkovProfile && TarkovProfile.gate) {
            gateRes = TarkovProfile.gate({
              trader: traderKey,
              minLL: reqLL,
              questLocked: questLocked,
              questName: questName
            });
          } else if (myLL < reqLL) {
            gateRes = { locked: true, reason: 'УЛ ' + traderKey + ' < ' + reqLL };
          }

          rawRows.push({
            id: item.id,
            name,
            shortName: item.shortName || '',
            normalizedName: item.normalizedName || '',
            icon: item.iconLink || item.gridImageLink || '',
            trader: traderLabel(traderId),
            traderKey,
            ll: reqLL,
            quest: questLocked,
            questName: String(questName),
            buyLimit: offer.buyLimit != null ? Number(offer.buyLimit) : null,
            traderPrice,
            avg24h: avg,
            lastLow,
            offers: offersCount,
            profit,
            roi,
            types: typesArr.join(', '),
            typesArr,
            _gate: gateRes
          });
        }
      }
    }

    function renderFilters() {
      const types = new Set();
      rawRows.forEach(r => r.typesArr.forEach(t => types.add(t)));
      const sorted = [...types].sort();
      const el = document.getElementById('typeFilters');
      el.innerHTML = '<span style="font-size:0.8rem;color:var(--muted)">' + t('categories') + '</span>';
      if (!filtersInitialized) {
        activeTypes = new Set(sorted);
        filtersInitialized = true;
      }

      const allBtn = document.createElement('span');
      allBtn.className = 'chip active';
      allBtn.textContent = t('all');
      allBtn.onclick = () => {
        activeTypes = new Set(sorted);
        el.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === allBtn || activeTypes.has(c.dataset.type)));
        renderTable();
      };
      el.appendChild(allBtn);

      sorted.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip' + (activeTypes.has(t) ? ' active' : '');
        chip.dataset.type = t;
        chip.textContent = t;
        chip.onclick = () => {
          if (activeTypes.has(t)) { activeTypes.delete(t); chip.classList.remove('active'); }
          else { activeTypes.add(t); chip.classList.add('active'); }
          renderTable();
        };
        el.appendChild(chip);
      });
    }

    function getFiltered() {
      const minProfit = Number(document.getElementById('minProfit').value) || 0;
      const minRoi = Number(document.getElementById('minRoi').value) || 0;
      const minOffers = Number(document.getElementById('minOffers').value) || 0;
      const search = (document.getElementById('search').value || '').toLowerCase().trim();
      const hideQuest = document.getElementById('hideQuest').checked;

      let rows = rawRows.filter(r => {
        if (r.profit < minProfit) return false;
        if (r.roi < minRoi) return false;
        if (r.offers < minOffers) return false;
        if (hideQuest && r.quest) return false;
        // R2.1 profile filter
        if (r._gate && r._gate.locked && window.TarkovProfile && TarkovProfile.lockVisibility) {
          if (TarkovProfile.lockVisibility(r._gate) === 'hide') return false;
        }
        if (search) {
          const hay = (r.name + ' ' + r.shortName + ' ' + r.normalizedName).toLowerCase();
          if (!hay.includes(search)) return false;
        }
        if (activeTypes.size && r.typesArr.length) {
          if (!r.typesArr.some(t => activeTypes.has(t))) return false;
        }
        return true;
      });

      rows.sort((a, b) => {
        let va = sortKey === 'trader' ? traderLabel(a.traderKey) : a[sortKey];
        let vb = sortKey === 'trader' ? traderLabel(b.traderKey) : b[sortKey];
        if (typeof va === 'string') {
          va = va.toLowerCase();
          vb = (vb || '').toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        }
        return sortDir * ((va ?? -Infinity) - (vb ?? -Infinity));
      });
      return rows;
    }

    
    
    function renderTable() {
      const thead = document.getElementById('theadRow');
      thead.innerHTML = '';
      COLUMNS.forEach(col => {
        const th = document.createElement('th');
        th.innerHTML = t('column.' + col.key) + (col.sort ? '<span class="sort">↕</span>' : '');
        if (col.key === sortKey) th.classList.add('sorted');
        if (col.sort) {
          th.onclick = () => {
            if (sortKey === col.key) sortDir *= -1;
            else {
              sortKey = col.key;
              sortDir = (col.key === 'name' || col.key === 'trader') ? 1 : -1;
            }
            renderTable();
          };
        }
        thead.appendChild(th);
      });

      const rows = getFiltered();
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';

      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="${COLUMNS.length}" class="empty">${t('empty')}</td></tr>`;
        document.getElementById('meta').textContent = '';
        return;
      }

      const frag = document.createDocumentFragment();
      rows.forEach(r => {
        const tr = document.createElement('tr');
        const copyName = r.normalizedName || r.name;
        if (window.TarkovProfile && TarkovProfile.applyLockToElement && r._gate) {
          TarkovProfile.applyLockToElement(tr, r._gate);
          if (r._gate.locked && TarkovProfile.lockVisibility(r._gate) === 'hide') return;
        }
        tr.innerHTML = `
          <td title="${escapeHtml(r.name)}"><div class="name-cell">${r.icon?`<img class="ico ico-sm" src="${escapeHtml(r.icon)}" loading="lazy" alt="">`:''}<div class="txt">${escapeHtml(r.name)}</div></div></td>
          <td>${escapeHtml(traderLabel(r.traderKey))}</td>
          <td>${r.ll}</td>
          <td class="${r.quest ? 'quest-yes' : 'quest-no'}" title="${escapeHtml(r.questName)}">${t(r.quest ? 'questYes' : 'questNo')}</td>
          <td>${r.buyLimit != null ? r.buyLimit : '—'}</td>
          <td>${formatNum(r.traderPrice)}</td>
          <td>${r.avg24h ? formatNum(r.avg24h) : '—'}</td>
          <td>${r.lastLow ? formatNum(r.lastLow) : '—'}</td>
          <td>${r.offers || '—'}</td>
          <td class="${r.profit >= 0 ? 'profit-pos' : 'profit-neg'}">${r.profit >= 0 ? '+' : ''}${formatNum(r.profit)}</td>
          <td class="${r.roi >= 0 ? 'profit-pos' : 'profit-neg'}">${r.roi.toFixed(1)}%</td>
          <td style="color:var(--muted);font-size:0.8rem;">${escapeHtml(r.types)}</td>
          <td><button type="button" class="copy-btn" data-name="${escapeHtml(copyName)}">${t('copy')}</button></td>`;
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);

      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.name).then(() => {
            btn.textContent = t('copied');
            setTimeout(() => { btn.textContent = t('copy'); }, 800);
          });
        });
      });

      document.getElementById('meta').textContent = t('meta', {
        visible: rows.length,
        total: rawRows.length,
        sort: t('sort.' + sortKey),
        direction: sortDir < 0 ? '↓' : '↑'
      });
    }

    ['minProfit', 'minRoi', 'minOffers', 'search', 'hideQuest'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', renderTable);
      el.addEventListener('change', renderTable);
    });

    window.addEventListener('tt-lang-changed', () => {
      TRADERS_UI.forEach(trader => {
        const select = tradersEl.querySelector(`select[data-trader="${trader.id}"]`);
        if (!select) return;
        const label = select.parentElement.querySelector('label');
        if (label) label.textContent = traderLabel(trader.id);
        select.options[0].text = t('no');
        for (let level = 1; level <= 4; level++) {
          select.options[level].text = t('loyaltyLevel', { level });
        }
      });
      renderStatus();
      renderProgress();
      if (rawRows.length) {
        renderFilters();
        renderTable();
      }
    });
  
    // settings persist — UI prefs only (R2.1: no playerLevel / traderLevels / gameMode)
    (function() {
      const SKEY = 'tarkovFlipSettings';
      const defs = { intel3: '0', hmLvl: 0, minProfit: 5000, minRoi: 5, minOffers: 3, hideQuest: true };
      const s = loadSettings(SKEY, defs);
      const set = (id, val, isCheck) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isCheck) el.checked = !!val;
        else el.value = val;
      };
      if (window.TarkovProfile && TarkovProfile.bindLevel) TarkovProfile.bindLevel('playerLevel');
      set('intel3', s.intel3);
      set('hmLvl', s.hmLvl);
      set('minProfit', s.minProfit);
      set('minRoi', s.minRoi);
      set('minOffers', s.minOffers);
      set('hideQuest', s.hideQuest, true);
      function persist() {
        saveSettings(SKEY, {
          intel3: document.getElementById('intel3')?.value || '0',
          hmLvl: Number(document.getElementById('hmLvl')?.value) || 0,
          minProfit: Number(document.getElementById('minProfit')?.value) || 0,
          minRoi: Number(document.getElementById('minRoi')?.value) || 0,
          minOffers: Number(document.getElementById('minOffers')?.value) || 0,
          hideQuest: document.getElementById('hideQuest')?.checked ?? true
        });
      }
      ['intel3','hmLvl','minProfit','minRoi','minOffers','hideQuest'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', persist);
      });
    })();

    // R2.1: expose render for shell / profile refresh
    window.render = function () {
      try {
        if (window.TarkovProfile && TarkovProfile.bindTraderLL) TarkovProfile.bindTraderLL(tradersEl);
        if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
      } catch (e) { try { console.debug && console.debug("[tt:trader-flip]", e); } catch (_tt) { /* ignore */ } }
      try {
        if (rawRows && rawRows.length) {
          // re-gate rows against current profile
          rawRows.forEach(function (r) {
            if (window.TarkovProfile && TarkovProfile.gate) {
              r._gate = TarkovProfile.gate({
                trader: r.traderKey,
                minLL: r.ll,
                questLocked: !!r.quest,
                questName: r.questName
              });
            }
          });
          renderTable();
        }
      } catch (e2) { try { console.debug && console.debug("[tt:trader-flip]", e2); } catch (_tt) { /* ignore */ } }
    };
    if (window.TarkovProfile && TarkovProfile.bindRefresh) {
      TarkovProfile.bindRefresh(function () { window.render(); });
    }

/* R-2: gameMode from profile on load; changes write to profile */
(function () {
  function __ttBindMode() {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) {
        TarkovProfile.wireToolPage();
      } else if (window.TarkovProfile && TarkovProfile.bindGameMode) {
        var el = document.getElementById("gameMode");
        if (el) el.__ttProfileBound = false;
        TarkovProfile.bindGameMode("gameMode", { fallback: "pve" });
      }
    } catch (e) { try { console.debug && console.debug("[tt:trader-flip]", e); } catch (_tt) { /* ignore */ } }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", __ttBindMode);
  } else {
    __ttBindMode();
  }
})();
