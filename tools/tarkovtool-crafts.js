

    function fleaTax(basePrice, offerPrice, count, opts) {
      opts = opts || {};
      const bp = Number(basePrice) || 0;
      const op = Number(offerPrice) || 0;
      const n = Math.max(1, Number(count) || 1);
      if (bp <= 0 || op <= 0) return 0;
      const Ti = 0.05, Tr = 0.05;
      let PO = Math.log10(bp / op);
      let PR = Math.log10(op / bp);
      if (op < bp) PO = Math.pow(PO, 1.08);
      if (op >= bp) PR = Math.pow(PR, 1.08);
      let tax = (bp * Ti * Math.pow(4, PO) + op * Tr * Math.pow(4, PR)) * n;
      if (opts.intelCenter3) {
        const hm = Math.max(0, Math.min(50, Number(opts.hmLvl) || 0));
        const reduction = Math.min(0.45, 0.30 + hm * 0.003);
        tax *= (1 - reduction);
      }
      return Math.max(0, Math.ceil(tax));
    }
    function fleaNet(basePrice, offerPrice, count, opts) {
      const gross = (Number(offerPrice) || 0) * (Number(count) || 1);
      return gross - fleaTax(basePrice, offerPrice, count, opts);
    }

    function loadSettings(key, defaults) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return Object.assign({}, defaults);
        return Object.assign({}, defaults, JSON.parse(raw));
      } catch (e) { return Object.assign({}, defaults); }
    }
    function saveSettings(key, obj) {
      try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
    }

    const STATION_RU = {
      'vostok-water-collector': 'Водосборник',
      'water-collector': 'Водосборник',
      'security': 'Безопасность',
      'lavatory': 'Санузел',
      'stashes': 'Схрон',
      'stash': 'Схрон',
      'generator': 'Генератор',
      'heating': 'Обогрев',
      'ventilation': 'Вентиляция',
      'medstation': 'Медблок',
      'nutrition-unit': 'Пищеблок',
      'rest-space': 'Комната отдыха',
      'workbench': 'Верстак',
      'intelligence-center': 'Разведцентр',
      'shooting-range': 'Тир',
      'library': 'Библиотека',
      'scav-case': 'Scav Case',
      'illumination': 'Освещение',
      'air-filtering-unit': 'Фильтр воздуха',
      'solar-power': 'Солнечная энергия',
      'booze-generator': 'Самогонный аппарат',
      'bitcoin-farm': 'Биткоин-ферма',
      'christmas-tree': 'Ёлка',
      'defective-wall': 'Стена',
      'gym': 'Спортзал',
      'weapon-rack': 'Оружейная стойка',
      'gear-rack': 'Стойка снаряжения',
      'cultist-circle': 'Круг культистов',
      'hall-of-fame': 'Зал славы'
    };

    const COLS = [
      { key: 'product', label: 'Продукт', sort: true },
      { key: 'station', label: 'Станция', sort: true },
      { key: 'level', label: 'Ур.', sort: true },
      { key: 'duration', label: 'Время', sort: true },
      { key: 'cost', label: 'Входы', sort: true },
      { key: 'revenue', label: 'Выход', sort: true },
      { key: 'profit', label: 'Профит', sort: true },
      { key: 'perHour', label: '₽/час', sort: true },
      { key: 'roi', label: 'ROI %', sort: true }
    ];

    let rows = [];
    let stationsMap = {};
    let itemsMap = {};
    let activeStations = new Set();
    let sortKey = 'perHour';
    let sortDir = -1;

    const statusEl = document.getElementById('status');

    function formatNum(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return Math.round(n).toLocaleString('ru-RU');
    }
    function formatDur(sec) {
      sec = Number(sec) || 0;
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      if (h > 0) return h + 'ч ' + m + 'м';
      return m + 'м';
    }
    function humanize(slug) {
      if (!slug) return '?';
      return String(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    function stationName(idOrSlug) {
      const s = stationsMap[idOrSlug];
      const slug = (s && s.normalizedName) || idOrSlug;
      return STATION_RU[slug] || humanize(slug);
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

    async function fetchJson(url) {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' · ' + url);
      return res.json();
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      btn.disabled = true;
      statusEl.className = 'status';
      const mode = document.getElementById('gameMode').value || 'regular';
      statusEl.textContent = 'Гружу crafts + items + hideout…';

      try {
        const [craftsJ, itemsJ, hideoutJ] = await Promise.all([
          fetchJson(`https://json.tarkov.dev/${mode}/crafts`),
          fetchJson(`https://json.tarkov.dev/${mode}/items`),
          fetchJson(`https://json.tarkov.dev/${mode}/hideout`)
        ]);

        let crafts = craftsJ.data;
        if (crafts && crafts.crafts) crafts = crafts.crafts;
        if (!Array.isArray(crafts)) crafts = Object.values(crafts || {});

        let items = itemsJ.data?.items || itemsJ.data;
        if (!Array.isArray(items)) items = Object.values(items || {});
        itemsMap = {};
        items.forEach(it => { itemsMap[it.id] = it; });

        stationsMap = hideoutJ.data || {};
        if (stationsMap.stations) stationsMap = stationsMap.stations;

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
          const gross = unitOut * prodCount;
          const tax = fleaTax(baseOut, unitOut, prodCount, taxOpts);
          const revenue = gross - tax;
          const profit = revenue - cost;
          const dur = Number(c.duration) || 0;
          const perHour = dur > 0 ? profit / (dur / 3600) : 0;
          const roi = cost > 0 ? (profit / cost) * 100 : 0;
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
        document.getElementById('resultsCard').style.display = 'block';
        renderStationChips();
        renderTable();
        statusEl.className = 'status ok';
        statusEl.textContent = `Крафтов: ${rows.length} · предметов: ${items.length}`;
      } catch (e) {
        console.error(e);
        statusEl.className = 'status err';
        statusEl.textContent = 'Ошибка: ' + e.message;
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
        const tax = fleaTax(baseOut, unitOut, r.prodCount, taxOpts);
        r.revenue = unitOut * r.prodCount - tax;
        r.profit = r.revenue - r.cost;
        r.perHour = r.duration > 0 ? r.profit / (r.duration / 3600) : 0;
        r.roi = r.cost > 0 ? (r.profit / r.cost) * 100 : 0;
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
      activeStations = new Set(all);
      el.innerHTML = '';
      const allBtn = document.createElement('span');
      allBtn.className = 'chip active';
      allBtn.textContent = 'Все';
      allBtn.onclick = () => {
        activeStations = new Set(all);
        el.querySelectorAll('.chip').forEach(c => c.classList.add('active'));
        renderTable();
      };
      el.appendChild(allBtn);
      all.forEach(slug => {
        const chip = document.createElement('span');
        chip.className = 'chip active';
        chip.textContent = STATION_RU[slug] || humanize(slug);
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
        th.innerHTML = col.label + (col.sort ? '<span class="s">↕</span>' : '');
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
        tbody.innerHTML = `<tr><td colspan="${COLS.length}" class="muted" style="text-align:center;padding:28px;">Пусто</td></tr>`;
        document.getElementById('meta').textContent = '';
        return;
      }

      const frag = document.createDocumentFragment();
      list.forEach(r => {
        const tr = document.createElement('tr');
        const inputsStr = r.inputs.map(i =>
          `${i.count}× ${i.name}${i.isTool ? ' (tool)' : ''}`
        ).join(', ');
        tr.innerHTML = `
          <td>
            <div class="name-cell">${r.productIcon?`<img class="ico ico-sm" src="${esc(r.productIcon)}" loading="lazy" alt="">`:''}<div class="txt"><div class="name">${esc(r.product)}${r.prodCount > 1 ? ' ×' + r.prodCount : ''} <button type="button" class="copy-btn" data-name="${esc(r.productSlug || r.product)}">копир.</button></div></div></div>
            <div class="detail">${esc(inputsStr)}</div>
            ${r.quest ? '<div class="quest">нужен квест</div>' : ''}
            ${r.missing ? '<div class="quest">нет цены на вход</div>' : ''}
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
      document.getElementById('meta').textContent =
        `Показано ${list.length} из ${rows.length} · сортировка: ${sortKey} ${sortDir < 0 ? '↓' : '↑'}`;
    }

    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    ['minProfit', 'minPerHour', 'search', 'hideQuest', 'onlyProfit'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', renderTable);
      el.addEventListener('change', renderTable);
    });
  
    (function() {
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
