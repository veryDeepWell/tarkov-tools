

    /** Комиссия барахолки (формула wiki BSG).
     *  basePrice — handbook/base из API
     *  offerPrice — цена лота за 1 шт
     *  count — количество в лоте
     *  intelCenter3 — разведцентр 3 ур. (−30%)
     *  hmLvl — Hideout Management 0..50 (+0.3% за уровень, до −45% суммарно с IC3)
     */
        
        
    const TRADERS_UI = [
      { id: 'prapor', ru: 'Прапор' },
      { id: 'therapist', ru: 'Терапевт' },
      { id: 'skier', ru: 'Лыжник' },
      { id: 'peacekeeper', ru: 'Миротворец' },
      { id: 'mechanic', ru: 'Механик' },
      { id: 'ragman', ru: 'Барахольщик' },
      { id: 'jaeger', ru: 'Егерь' },
      { id: 'ref', ru: 'Реф' }
    ];

    const TRADER_ID_FALLBACK = {
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

    const TRADER_RU = {
      prapor: 'Прапор', therapist: 'Терапевт', fence: 'Скупщик',
      skier: 'Лыжник', peacekeeper: 'Миротворец', mechanic: 'Механик',
      ragman: 'Барахольщик', jaeger: 'Егерь', ref: 'Реф', lightkeeper: 'Смотритель'
    };

    const COLUMNS = [
      { key: 'name', label: 'Предмет', sort: true },
      { key: 'trader', label: 'Торговец', sort: true },
      { key: 'll', label: 'УЛ', sort: true },
      { key: 'quest', label: 'Квест', sort: true },
      { key: 'buyLimit', label: 'Лимит', sort: true },
      { key: 'traderPrice', label: 'Цена торговца', sort: true },
      { key: 'avg24h', label: 'Средняя 24ч', sort: true },
      { key: 'lastLow', label: 'Мин. сейчас', sort: true },
      { key: 'offers', label: 'Офферов', sort: true },
      { key: 'profit', label: 'Профит', sort: true },
      { key: 'roi', label: 'ROI %', sort: true },
      { key: 'types', label: 'Тип', sort: false },
      { key: 'copy', label: '', sort: false }
    ];

    let rawRows = [];
    let traderIdMap = { ...TRADER_ID_FALLBACK };
    let sortKey = 'profit';
    let sortDir = -1;
    let activeTypes = new Set();

    const tradersEl = document.getElementById('traders');
    const _savedLL = (function() {
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=String(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s)) {
      var n=String(it.name||'').trim();
      var sl=String(it.normalizedName||'').trim();
      if(n && !/^[a-f0-9]{20,}$/i.test(n)) s=n;
      else if(sl) s=sl;
    }
    return s||it.id||'';
  }

      try {
        const s = JSON.parse(localStorage.getItem('tarkovFlipSettings') || '{}');
        return s.traderLevels || {};
      } catch (e) { return {}; }
    })();
    TRADERS_UI.forEach(t => {
      const div = document.createElement('div');
      div.className = 'trader-row';
      const saved = _savedLL[t.id];
      const cur = saved != null ? String(saved) : '3';
      div.innerHTML = `
        <label>${t.ru}</label>
        <select data-trader="${t.id}">
          <option value="0"${cur==='0'?' selected':''}>Нет</option>
          <option value="1"${cur==='1'?' selected':''}>УЛ 1</option>
          <option value="2"${cur==='2'?' selected':''}>УЛ 2</option>
          <option value="3"${cur==='3'?' selected':''}>УЛ 3</option>
          <option value="4"${cur==='4'?' selected':''}>УЛ 4</option>
        </select>`;
      tradersEl.appendChild(div);
      div.querySelector('select').addEventListener('change', () => {
        // persist LL immediately
        try {
          const s = JSON.parse(localStorage.getItem('tarkovFlipSettings') || '{}');
          s.traderLevels = s.traderLevels || {};
          TRADERS_UI.forEach(tr => {
            const sel = tradersEl.querySelector(`select[data-trader="${tr.id}"]`);
            if (sel) s.traderLevels[tr.id] = Number(sel.value);
          });
          localStorage.setItem('tarkovFlipSettings', JSON.stringify(s));
        } catch (e) {}
      });
    });

    function getTraderLevels() {
      const map = {};
      TRADERS_UI.forEach(t => {
        const sel = tradersEl.querySelector(`select[data-trader="${t.id}"]`);
        map[t.id] = Number(sel.value);
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
      return TRADER_RU[key] || key || idOrKey;
    }

    const statusEl = document.getElementById('status');
    const fetchBtn = document.getElementById('fetchBtn');

    const progressWrap = document.getElementById('progressWrap');
    const progressBar = document.getElementById('progressBar');
    const progressLabel = document.getElementById('progressLabel');

    function setProgress(pct, label, indeterminate) {
      progressWrap.classList.add('visible');
      progressLabel.textContent = label || '';
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
    }



    async function fetchJson(url) {
      const res = await TarkovAPI.request(url, { httpCache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} · ${url}`);
      return res.json();
    }

    fetchBtn.addEventListener('click', async () => {
      fetchBtn.disabled = true;
      statusEl.className = 'status';
      const mode = document.getElementById('gameMode').value || 'regular';
      statusEl.textContent = `Гружу данные с json.tarkov.dev (${mode})…`;
      setProgress(5, 'Подключаюсь…', true);

      try {
        setProgress(15, 'Качаю items…', true);
        const itemsPromise = fetchJson(`/${mode}/items`);
        const tradersPromise = fetchJson(`/${mode}/traders`).catch(() => null);

        const [itemsJson, tradersJson] = await Promise.all([itemsPromise, tradersPromise]);
        setProgress(55, 'Разбираю ответ…', false);

        if (tradersJson && tradersJson.data) {
          const tdata = tradersJson.data.traders || tradersJson.data;
          if (tdata && typeof tdata === 'object') {
            for (const [id, t] of Object.entries(tdata)) {
              if (t && t.normalizedName) traderIdMap[id] = t.normalizedName;
            }
          }
        }

        let items = itemsJson?.data?.items;
        if (!items) throw new Error('В ответе нет data.items');
        if (!Array.isArray(items)) items = Object.values(items);

        setProgress(75, `Считаю флипы · ${items.length} предметов…`, false);
        // yield so the browser can paint the progress bar
        await new Promise(r => setTimeout(r, 40));
        processItems(items);
        setProgress(100, 'Готово!', false);

        statusEl.className = 'status ok';
        statusEl.textContent = `Загружено ${items.length} предметов · ${rawRows.length} офферов у торговцев под твои УЛ`;
        document.getElementById('resultsCard').style.display = 'block';
        renderFilters();
        renderTable();
        if (typeof Notify === 'function') {
          Notify({
            title: 'Trader flip',
            body: `Loaded ${items.length} items · ${rawRows.length} trader offers`,
            tool: 'tarkovtool-trader-flip.html',
            kind: 'ok'
          });
        }
        setTimeout(hideProgress, 900);
      } catch (err) {
        console.error(err);
        statusEl.className = 'status err';
        statusEl.textContent = 'Ошибка: ' + (err.message || err);
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
          if (myLL < reqLL) continue;

          const traderPrice = offer.priceRUB != null ? Number(offer.priceRUB) : Number(offer.price);
          if (!traderPrice || traderPrice <= 0) continue;

          const fleaRef = avg || lastLow;
          const basePrice = Number(item.basePrice) || 0;
          const tax = fleaTax(basePrice, fleaRef, 1, taxOpts);
          const netFlea = fleaRef - tax;
          const profit = Math.round(netFlea - traderPrice);
          const roi = traderPrice > 0 ? (profit / traderPrice) * 100 : 0;

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

          rawRows.push({
            id: item.id,
            name,
            shortName: item.shortName || '',
            normalizedName: item.normalizedName || '',
            icon: item.iconLink || item.gridImageLink || '',
            trader: traderLabel(traderId),
            traderKey,
            ll: reqLL,
            quest: questLocked ? 'да' : 'нет',
            questName: String(questName),
            buyLimit: offer.buyLimit != null ? Number(offer.buyLimit) : null,
            traderPrice,
            avg24h: avg,
            lastLow,
            offers: offersCount,
            profit,
            roi,
            types: typesArr.join(', '),
            typesArr
          });
        }
      }
    }

    function renderFilters() {
      const types = new Set();
      rawRows.forEach(r => r.typesArr.forEach(t => types.add(t)));
      const sorted = [...types].sort();
      const el = document.getElementById('typeFilters');
      el.innerHTML = '<span style="font-size:0.8rem;color:var(--muted)">Категории:</span>';
      activeTypes = new Set(sorted);

      const allBtn = document.createElement('span');
      allBtn.className = 'chip active';
      allBtn.textContent = 'Все';
      allBtn.onclick = () => {
        activeTypes = new Set(sorted);
        el.querySelectorAll('.chip').forEach(c => c.classList.add('active'));
        renderTable();
      };
      el.appendChild(allBtn);

      sorted.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip active';
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
        if (hideQuest && r.quest === 'да') return false;
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
        let va = a[sortKey], vb = b[sortKey];
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
        th.innerHTML = col.label + (col.sort ? '<span class="sort">↕</span>' : '');
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
        tbody.innerHTML = `<tr><td colspan="${COLUMNS.length}" class="empty">Ничего не найдено под фильтры</td></tr>`;
        document.getElementById('meta').textContent = '';
        return;
      }

      const frag = document.createDocumentFragment();
      rows.forEach(r => {
        const tr = document.createElement('tr');
        const copyName = r.normalizedName || r.name;
        tr.innerHTML = `
          <td title="${escapeHtml(r.name)}"><div class="name-cell">${r.icon?`<img class="ico ico-sm" src="${escapeHtml(r.icon)}" loading="lazy" alt="">`:''}<div class="txt">${escapeHtml(r.name)}</div></div></td>
          <td>${escapeHtml(r.trader)}</td>
          <td>${r.ll}</td>
          <td class="${r.quest === 'да' ? 'quest-yes' : 'quest-no'}" title="${escapeHtml(r.questName)}">${r.quest}</td>
          <td>${r.buyLimit != null ? r.buyLimit : '—'}</td>
          <td>${formatNum(r.traderPrice)}</td>
          <td>${r.avg24h ? formatNum(r.avg24h) : '—'}</td>
          <td>${r.lastLow ? formatNum(r.lastLow) : '—'}</td>
          <td>${r.offers || '—'}</td>
          <td class="${r.profit >= 0 ? 'profit-pos' : 'profit-neg'}">${r.profit >= 0 ? '+' : ''}${formatNum(r.profit)}</td>
          <td class="${r.roi >= 0 ? 'profit-pos' : 'profit-neg'}">${r.roi.toFixed(1)}%</td>
          <td style="color:var(--muted);font-size:0.8rem;">${escapeHtml(r.types)}</td>
          <td><button type="button" class="copy-btn" data-name="${escapeHtml(copyName)}">копир.</button></td>`;
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);

      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.name).then(() => {
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = 'копир.'; }, 800);
          });
        });
      });

      document.getElementById('meta').textContent =
        `Показано ${rows.length} из ${rawRows.length} · сортировка: ${sortKey} ${sortDir < 0 ? '↓' : '↑'}`;
    }

    ['minProfit', 'minRoi', 'minOffers', 'search', 'hideQuest'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', renderTable);
      el.addEventListener('change', renderTable);
    });
  
    // settings persist
    (function() {
      const SKEY = 'tarkovFlipSettings';
      const defs = { gameMode: 'regular', playerLevel: 31, intel3: '0', hmLvl: 0, minProfit: 5000, minRoi: 5, minOffers: 3, hideQuest: true };
      // gameMode may not exist in flip - skip if missing
      const s = loadSettings(SKEY, defs);
      const set = (id, val, isCheck) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isCheck) el.checked = !!val;
        else el.value = val;
      };
      set('playerLevel', s.playerLevel);
      set('intel3', s.intel3);
      set('hmLvl', s.hmLvl);
      set('minProfit', s.minProfit);
      set('minRoi', s.minRoi);
      set('minOffers', s.minOffers);
      set('hideQuest', s.hideQuest, true);
      function persist() {
        const traderLevels = {};
        TRADERS_UI.forEach(tr => {
          const sel = tradersEl.querySelector(`select[data-trader="${tr.id}"]`);
          if (sel) traderLevels[tr.id] = Number(sel.value);
        });
        saveSettings(SKEY, {
          playerLevel: Number(document.getElementById('playerLevel')?.value) || 31,
          intel3: document.getElementById('intel3')?.value || '0',
          hmLvl: Number(document.getElementById('hmLvl')?.value) || 0,
          minProfit: Number(document.getElementById('minProfit')?.value) || 0,
          minRoi: Number(document.getElementById('minRoi')?.value) || 0,
          minOffers: Number(document.getElementById('minOffers')?.value) || 0,
          hideQuest: document.getElementById('hideQuest')?.checked ?? true,
          traderLevels
        });
      }
      ['playerLevel','intel3','hmLvl','minProfit','minRoi','minOffers','hideQuest'].forEach(id => {
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
