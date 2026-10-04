

    function loadSettings(key, defaults) { return TarkovUI.loadSettings(key, defaults); }
    function saveSettings(key, obj) { TarkovUI.saveSettings(key, obj); }

    const COLS = [
      { key: 'product', label: 'product', sort: true },
      { key: 'station', label: 'station', sort: true },
      { key: 'level', label: 'level', sort: true },
      { key: 'duration', label: 'duration', sort: true },
      { key: 'cost', label: 'cost', sort: true },
      { key: 'revenue', label: 'revenue', sort: true },
      { key: 'profit', label: 'profit', sort: true },
      { key: 'perHour', label: 'perHour', sort: true },
      { key: 'roi', label: 'roi', sort: true }
    ];

    let rows = [];
    let stationsMap = {};
    let itemsMap = {};
    let activeStations = new Set();
    let stationsInitialized = false;
    let sortKey = 'perHour';
    let sortDir = -1;
    let statusState = null;

    const statusEl = document.getElementById('status');

    function t(key, params) { return TarkovI18n.t(key, params); }
    function setStatus(key, params, tone) {
      statusState = { key, params, tone: tone || '' };
      renderStatus();
    }
    function renderStatus() {
      if (!statusState) return;
      statusEl.className = 'status' + (statusState.tone ? ' ' + statusState.tone : '');
      statusEl.textContent = t(statusState.key, statusState.params);
    }
    function formatNum(n) { return TarkovDicts.fmtNum(n); }
    function formatDur(sec) {
      sec = Number(sec) || 0;
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return h > 0
        ? t('tool.crafts.ui.durationHoursMinutes', { hours: h, minutes: m })
        : t('tool.crafts.ui.durationMinutes', { minutes: m });
    }
    function humanize(slug) { return TarkovDicts.humanize(slug); }
    function stationName(idOrSlug) {
      const s = stationsMap[idOrSlug];
      const slug = (s && s.normalizedName) || idOrSlug;
      const key = 'tool.crafts.ui.station.' + slug;
      const translated = t(key);
      return translated === key ? humanize(slug) : translated;
    }
    function itemName(id) {
      const it = itemsMap[id];
      if (!it) return id.slice(0, 8) + '…';
      return humanize(it.normalizedName || it.id);
    }
    function pickPrice(it, mode) {
      if (!it) return 0;
      const avg = Number(it.avg24hPrice) || 0;
      const low = Number(it.lastLowPrice) || 0;
      if (mode === 'lastLow') return low || avg || 0;
      if (mode === 'max') return Math.max(avg, low) || 0;
      return avg || low || 0;
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      btn.disabled = true;
      const mode = document.getElementById('gameMode').value || 'regular';
      setStatus('tool.crafts.ui.loading');

      try {
        const [crafts, items, stationList] = await Promise.all([
          TarkovAPI.crafts(mode),
          TarkovAPI.items(mode),
          TarkovAPI.hideout(mode)
        ]);

        itemsMap = {};
        items.forEach(it => { itemsMap[it.id] = it; });

        stationsMap = {};
        (Array.isArray(stationList) ? stationList : []).forEach(s => {
          if (s && s.id) stationsMap[s.id] = s;
        });

        const priceIn = document.getElementById('priceIn').value;
        const priceOut = document.getElementById('priceOut').value;
        const taxOpts = { intelCenter3: document.getElementById('intel3').value === '1', hmLvl: Number(document.getElementById('hmLvl').value) || 0 };

        rows = crafts.map(c => {
          const reqs = c.requiredItems || [];
          const inputs = [];
          let cost = 0;
          let missing = false;
          reqs.forEach(r => {
            const isTool = !!(r.attributes && (r.attributes.tool === true || r.attributes.tool === 'true'));
            const it = itemsMap[r.item];
            const unit = pickPrice(it, priceIn);
            const count = Number(r.count) || 0;
            if (!isTool) {
              if (!unit) missing = true;
              cost += unit * count;
            }
            inputs.push({
              id: r.item,
              name: itemName(r.item),
              count,
              unit,
              isTool,
              sub: isTool ? 0 : unit * count
            });
          });

          const prod = c.productItem || {};
          const prodId = prod.item;
          const prodCount = Number(prod.count) || 1;
          const prodItem = itemsMap[prodId];
          const unitOut = pickPrice(prodItem, priceOut);
          const baseOut = Number(prodItem && prodItem.basePrice) || 0;
          const profitResult = TarkovItemDomain.evaluateProfit(
            baseOut,
            unitOut,
            prodCount,
            cost,
            taxOpts
          );
          const tax = profitResult.tax;
          const revenue = profitResult.revenue;
          const profit = profitResult.profit;
          const dur = Number(c.duration) || 0;
          const perHour = dur > 0 ? profit / (dur / 3600) : 0;
          const roi = profitResult.roi;
          const stId = c.station;
          const stSlug = (stationsMap[stId] && stationsMap[stId].normalizedName) || stId;

          return {
            id: c.id,
            product: itemName(prodId),
            productSlug: (prodItem && prodItem.normalizedName) || '',
            productIcon: (prodItem && (prodItem.iconLink || prodItem.gridImageLink)) || '',
            productId: prodId,
            prodCount,
            station: stationName(stId),
            stationSlug: stSlug,
            stationId: stId,
            level: Number(c.level) || 0,
            duration: dur,
            cost,
            revenue,
            profit,
            perHour,
            roi,
            inputs,
            missing,
            quest: !!(c.taskUnlock),
            questId: c.taskUnlock || null,
            unitOut
          };
        });

        activeStations = new Set(rows.map(r => r.stationSlug));
        stationsInitialized = false;
        document.getElementById('resultsCard').style.display = 'block';
        renderStationChips();
        renderTable();
        setStatus('tool.crafts.ui.loaded', { crafts: rows.length, items: items.length }, 'ok');
      } catch (e) {
        console.error(e);
        setStatus('tool.crafts.ui.loadError', { message: e.message }, 'err');
      } finally {
        btn.disabled = false;
      }
    });

    // recalculate prices without re-fetch when mode changes
    function reprice() {
      if (!rows.length) return;
      const priceIn = document.getElementById('priceIn').value;
      const priceOut = document.getElementById('priceOut').value;
      const taxOpts = { intelCenter3: document.getElementById('intel3').value === '1', hmLvl: Number(document.getElementById('hmLvl').value) || 0 };
      rows.forEach(r => {
        let cost = 0;
        let missing = false;
        r.inputs.forEach(inp => {
          const it = itemsMap[inp.id];
          const unit = pickPrice(it, priceIn);
          inp.unit = unit;
          inp.sub = inp.isTool ? 0 : unit * inp.count;
          if (!inp.isTool) {
            if (!unit) missing = true;
            cost += inp.sub;
          }
        });
        const prodItem = itemsMap[r.productId];
        const unitOut = pickPrice(prodItem, priceOut);
        const baseOut = Number(prodItem && prodItem.basePrice) || 0;
        r.unitOut = unitOut;
        r.cost = cost;
        const result = TarkovItemDomain.evaluateProfit(baseOut, unitOut, r.prodCount, r.cost, taxOpts);
        r.tax = result.tax;
        r.revenue = result.revenue;
        r.profit = result.profit;
        r.perHour = r.duration > 0 ? r.profit / (r.duration / 3600) : 0;
        r.roi = result.roi;
        r.missing = missing;
      });
      renderTable();
    }

    ['priceIn', 'priceOut', 'intel3', 'hmLvl'].forEach(id => {
      document.getElementById(id).addEventListener('change', reprice);
      document.getElementById(id).addEventListener('input', reprice);
    });

    function renderStationChips() {
      const el = document.getElementById('stationChips');
      const all = [...new Set(rows.map(r => r.stationSlug))].sort();
      if (!stationsInitialized) {
        activeStations = new Set(all);
        stationsInitialized = true;
      }
      el.innerHTML = '';
      const allBtn = document.createElement('span');
      allBtn.className = 'chip' + (activeStations.size === all.length ? ' active' : '');
      allBtn.textContent = t('tool.crafts.ui.allStations');
      allBtn.onclick = () => {
        activeStations = new Set(all);
        el.querySelectorAll('.chip').forEach(c => c.classList.add('active'));
        renderTable();
      };
      el.appendChild(allBtn);
      all.forEach(slug => {
        const chip = document.createElement('span');
        chip.className = 'chip' + (activeStations.has(slug) ? ' active' : '');
        chip.textContent = stationName(slug);
        chip.onclick = () => {
          if (activeStations.has(slug)) {
            activeStations.delete(slug);
            chip.classList.remove('active');
          } else {
            activeStations.add(slug);
            chip.classList.add('active');
          }
          renderTable();
        };
        el.appendChild(chip);
      });
    }

    function getFiltered() {
      const minP = Number(document.getElementById('minProfit').value) || 0;
      const minH = Number(document.getElementById('minPerHour').value) || 0;
      const q = (document.getElementById('search').value || '').toLowerCase().trim();
      const hideQuest = document.getElementById('hideQuest').checked;
      const onlyProfit = document.getElementById('onlyProfit').checked;

      let list = rows.filter(r => {
        if (!activeStations.has(r.stationSlug)) return false;
        if (r.profit < minP) return false;
        if (r.perHour < minH) return false;
        if (hideQuest && r.quest) return false;
        if (onlyProfit && r.profit <= 0) return false;
        if (q) {
          const hay = (r.product + ' ' + r.productSlug + ' ' + r.station + ' ' + r.stationSlug + ' ' +
            r.inputs.map(i => i.name).join(' ')).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      list.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (typeof va === 'string') {
          va = va.toLowerCase(); vb = (vb || '').toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        }
        return sortDir * ((va ?? -Infinity) - (vb ?? -Infinity));
      });
      return list;
    }

    function renderTable() {
      const thead = document.getElementById('thead');
      thead.innerHTML = '';
      COLS.forEach(col => {
        const th = document.createElement('th');
        th.innerHTML = esc(t('tool.crafts.ui.column.' + col.label)) + (col.sort ? '<span class="s">↕</span>' : '');
        if (col.key === sortKey) th.classList.add('sorted');
        if (col.sort) {
          th.onclick = () => {
            if (sortKey === col.key) sortDir *= -1;
            else {
              sortKey = col.key;
              sortDir = (col.key === 'product' || col.key === 'station') ? 1 : -1;
            }
            renderTable();
          };
        }
        thead.appendChild(th);
      });

      const list = getFiltered();
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="${COLS.length}" class="muted" style="text-align:center;padding:28px;">${esc(t('tool.crafts.ui.empty'))}</td></tr>`;
        document.getElementById('meta').textContent = '';
        return;
      }

      const frag = document.createDocumentFragment();
      list.forEach(r => {
        const tr = document.createElement('tr');
        const inputsStr = r.inputs.map(i =>
          `${i.count}× ${i.name}${i.isTool ? ' (' + t('tool.crafts.ui.tool') + ')' : ''}`
        ).join(', ');
        tr.innerHTML = `
          <td>
            <div class="name-cell">${r.productIcon?`<img class="ico ico-sm" src="${esc(r.productIcon)}" loading="lazy" alt="">`:''}<div class="txt"><div class="name">${esc(r.product)}${r.prodCount > 1 ? ' ×' + r.prodCount : ''} <button type="button" class="copy-btn" data-name="${esc(r.productSlug || r.product)}">${esc(t('tool.crafts.ui.copy'))}</button></div></div></div>
            <div class="detail">${esc(inputsStr)}</div>
            ${r.quest ? '<div class="quest">' + esc(t('tool.crafts.ui.questRequired')) + '</div>' : ''}
            ${r.missing ? '<div class="quest">' + esc(t('tool.crafts.ui.missingInputPrice')) + '</div>' : ''}
          </td>
          <td>${esc(r.station)}</td>
          <td>${r.level}</td>
          <td>${formatDur(r.duration)}</td>
          <td>${formatNum(r.cost)}</td>
          <td>${formatNum(r.revenue)}</td>
          <td class="${r.profit >= 0 ? 'pos' : 'neg'}">${r.profit >= 0 ? '+' : ''}${formatNum(r.profit)}</td>
          <td class="${r.perHour >= 0 ? 'pos' : 'neg'}">${formatNum(r.perHour)}</td>
          <td class="${r.roi >= 0 ? 'pos' : 'neg'}">${r.roi.toFixed(0)}%</td>
        `;
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);
      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.name || '').then(() => {
            const o = btn.textContent; btn.textContent = '✓';
            setTimeout(() => { btn.textContent = o; }, 700);
          }).catch(() => {});
        });
      });
      document.getElementById('meta').textContent = t('tool.crafts.ui.rowsMeta', {
        visible: list.length,
        total: rows.length,
        sort: t('tool.crafts.ui.column.' + sortKey),
        direction: sortDir < 0 ? '↓' : '↑'
      });
    }

    function esc(s) { return TarkovDicts.esc(s); }

    ['minProfit', 'minPerHour', 'search', 'hideQuest', 'onlyProfit'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', renderTable);
      el.addEventListener('change', renderTable);
    });
    window.addEventListener('tt-lang-changed', () => {
      rows.forEach(row => {
        row.station = stationName(row.stationId);
        row.inputs.forEach(input => { input.name = itemName(input.id); });
        row.product = itemName(row.productId);
      });
      renderStationChips();
      renderTable();
      renderStatus();
    });
  
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

      const SKEY = 'tarkovCraftsSettings';
      const s = loadSettings(SKEY, { gameMode: 'regular', priceIn: 'avg24h', priceOut: 'avg24h', intel3: '0', hmLvl: 0, hideQuest: true, onlyProfit: false });
      const set = (id, v, chk) => { const el = document.getElementById(id); if (!el) return; if (chk) el.checked = !!v; else el.value = v; };
      set('gameMode', s.gameMode);
      set('priceIn', s.priceIn);
      set('priceOut', s.priceOut);
      set('intel3', s.intel3);
      set('hmLvl', s.hmLvl);
      set('hideQuest', s.hideQuest, true);
      set('onlyProfit', s.onlyProfit, true);
      function persist() {
        saveSettings(SKEY, {
          gameMode: document.getElementById('gameMode')?.value,
          priceIn: document.getElementById('priceIn')?.value,
          priceOut: document.getElementById('priceOut')?.value,
          intel3: document.getElementById('intel3')?.value,
          hmLvl: Number(document.getElementById('hmLvl')?.value) || 0,
          hideQuest: document.getElementById('hideQuest')?.checked,
          onlyProfit: document.getElementById('onlyProfit')?.checked
        });
      }
      ['gameMode','priceIn','priceOut','intel3','hmLvl','hideQuest','onlyProfit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', persist);
      });
    })();
  
