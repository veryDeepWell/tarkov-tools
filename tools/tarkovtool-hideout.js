
    const TRADER_RU = {
      '54cb50c76803fa8b248b4571': 'Прапор',
      '54cb57776803fa99248b456e': 'Терапевт',
      '58330581ace78e27b8b10cee': 'Лыжник',
      '5935c25fb3acc3127c3d8cd9': 'Миротворец',
      '5a7c2eca46aef81a7ca2145d': 'Механик',
      '5ac3b934156ae10c4430e83c': 'Барахольщик',
      '5c0647fdd443bc2504c2d371': 'Егерь',
      '6617beeaa9cfa777ca915b7c': 'Реф'
    };
    const MONEY_ID = '5449016a4bdc2d6f028b456f';

    let stations = []; // processed
    let itemsById = {};
    let stationById = {};
    // progress: { [stationId]: { level: number, want: bool, collected: { [reqKey]: bool } } }
    let progress = {};
    let selectedId = null;

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
    function loadProgress() {
      try { progress = JSON.parse(localStorage.getItem('tarkovHideoutProgress') || '{}'); }
      catch { progress = {}; }
    }
    function saveProgress() {
      try { localStorage.setItem('tarkovHideoutProgress', JSON.stringify(progress)); } catch (e) {}
    }
    function humanize(slug) {
      if (!slug) return '?';
      return String(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    function formatNum(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return Math.round(n).toLocaleString('ru-RU');
    }
    function formatTime(sec) {
      if (!sec) return '—';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      if (h >= 24) return Math.floor(h / 24) + 'д ' + (h % 24) + 'ч';
      if (h) return h + 'ч ' + m + 'м';
      return m + 'м';
    }
    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function itemName(id) {
      const it = itemsById[id];
      if (!it) return id.slice(0, 8) + '…';
      return humanize(it.normalizedName || it.id);
    }
    function itemSlug(id) {
      const it = itemsById[id];
      return (it && it.normalizedName) || id;
    }
    function stationName(id) {
      const st = stationById[id];
      return st ? humanize(st.normalizedName) : id.slice(0, 8);
    }
    function getProg(id) {
      if (!progress[id]) progress[id] = { level: 0, want: false, collected: {} };
      return progress[id];
    }
    function bestBuy(it) {
      const offers = (it && it.buyFromTrader) || [];
      let best = null;
      offers.forEach(o => {
        const price = Number(o.priceRUB != null ? o.priceRUB : o.price) || 0;
        if (!price) return;
        if (!best || price < best.price) {
          best = {
            price,
            name: TRADER_RU[o.trader] || 'Торговец',
            ll: Number(o.minTraderLevel) || 0,
            quest: !!o.taskUnlock
          };
        }
      });
      return best;
    }

    /** Можно ли иметь station at level L given current progress (prereqs of that level met) */
    function canHaveLevel(stationId, level) {
      if (level <= 0) return true;
      const st = stationById[stationId];
      if (!st) return false;
      const lv = st.levels.find(l => l.level === level);
      if (!lv) return false;
      // previous level must be owned
      if (level > 1 && getProg(stationId).level < level - 1) return false;
      // station prereqs
      for (const req of (lv.stationLevelRequirements || [])) {
        const need = Number(req.level) || 0;
        if (getProg(req.station).level < need) return false;
      }
      return true;
    }

    function clampLevel(stationId, desired) {
      const st = stationById[stationId];
      if (!st) return 0;
      const max = st.maxLevel;
      let lv = Math.max(0, Math.min(max, Number(desired) || 0));
      // walk down until valid
      while (lv > 0 && !canHaveLevel(stationId, lv)) lv--;
      return lv;
    }

    function nextLevelData(stationId) {
      const st = stationById[stationId];
      if (!st) return null;
      const cur = getProg(stationId).level;
      if (cur >= st.maxLevel) return null;
      const next = cur + 1;
      const lv = st.levels.find(l => l.level === next);
      if (!lv) return null;
      return { st, next, lv, blocked: !canHaveLevel(stationId, next) };
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status';
      const mode = document.getElementById('gameMode').value || 'regular';
      status.textContent = 'Гружу hideout + items…';
      try {
        const [hRes, iRes] = await Promise.all([
          fetch(`https://json.tarkov.dev/${mode}/hideout`, { cache: 'no-store' }),
          fetch(`https://json.tarkov.dev/${mode}/items`, { cache: 'no-store' })
        ]);
        if (!hRes.ok) throw new Error('hideout HTTP ' + hRes.status);
        if (!iRes.ok) throw new Error('items HTTP ' + iRes.status);
        const hJson = await hRes.json();
        const iJson = await iRes.json();
        let hData = hJson.data;
        if (!hData) throw new Error('Нет hideout data');
        if (hData.hideout) hData = hData.hideout;
        if (Array.isArray(hData)) {
          const map = {};
          hData.forEach(s => { map[s.id] = s; });
          hData = map;
        }
        let items = iJson?.data?.items;
        if (!items) throw new Error('Нет items');
        if (!Array.isArray(items)) items = Object.values(items);
        itemsById = {};
        items.forEach(it => { itemsById[it.id] = it; });

        stations = [];
        stationById = {};
        Object.values(hData).forEach(raw => {
          if (!raw || !raw.id) return;
          let levels = raw.levels || [];
          if (!Array.isArray(levels)) levels = Object.values(levels);
          levels = levels.slice().sort((a, b) => (a.level || 0) - (b.level || 0));
          const st = {
            id: raw.id,
            normalizedName: raw.normalizedName || raw.id,
            name: humanize(raw.normalizedName || raw.id),
            levels,
            maxLevel: levels.reduce((m, l) => Math.max(m, l.level || 0), 0)
          };
          stations.push(st);
          stationById[st.id] = st;
        });
        stations.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

        // clamp saved progress to valid
        stations.forEach(st => {
          const p = getProg(st.id);
          p.level = clampLevel(st.id, p.level);
        });
        saveProgress();

        document.getElementById('main').style.display = 'grid';
        status.className = 'status ok';
        status.textContent = `Станций: ${stations.length} · предметы: ${items.length}`;
        renderStations();
        if (!selectedId && stations.length) selectedId = stations[0].id;
        renderDetail();
        renderShop();
      } catch (e) {
        console.error(e);
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    });

    function renderStations() {
      const q = (document.getElementById('stationSearch').value || '').toLowerCase().trim();
      const el = document.getElementById('stationList');
      el.innerHTML = '';
      stations.forEach(st => {
        if (q && !st.name.toLowerCase().includes(q) && !st.normalizedName.toLowerCase().includes(q)) return;
        const p = getProg(st.id);
        const next = nextLevelData(st.id);
        const div = document.createElement('div');
        div.className = 'station'
          + (selectedId === st.id ? ' active' : '')
          + (p.want ? ' want' : '');
        const opts = [];
        for (let i = 0; i <= st.maxLevel; i++) {
          opts.push(`<option value="${i}" ${p.level === i ? 'selected' : ''}>${i}</option>`);
        }
        const nextHint = next
          ? (next.blocked ? 'след. заблок.' : '→ ур. ' + next.next)
          : 'макс';
        div.innerHTML = `
          <div class="station-top">
            <div>
              <div class="station-name">${esc(st.name)}</div>
              <div class="station-meta">сейчас ${p.level}/${st.maxLevel} · ${nextHint}</div>
            </div>
          </div>
          <div class="station-controls" onclick="event.stopPropagation()">
            <label>Ур. <select data-level="${st.id}">${opts.join('')}</select></label>
            <label><input type="checkbox" data-want="${st.id}" ${p.want ? 'checked' : ''}> хочу</label>
          </div>
        `;
        div.addEventListener('click', () => {
          selectedId = st.id;
          renderStations();
          renderDetail();
        });
        el.appendChild(div);
      });

      el.querySelectorAll('select[data-level]').forEach(sel => {
        sel.addEventListener('change', () => {
          const id = sel.dataset.level;
          const desired = Number(sel.value);
          const clamped = clampLevel(id, desired);
          if (clamped !== desired) {
            alert('Нельзя: не выполнены требования предыдущих станций/уровней. Установлен уровень ' + clamped);
          }
          getProg(id).level = clamped;
          // cascade: if we lower a station, clamp all that depend on it
          let changed = true;
          while (changed) {
            changed = false;
            stations.forEach(s => {
              const p = getProg(s.id);
              const c = clampLevel(s.id, p.level);
              if (c !== p.level) { p.level = c; changed = true; }
            });
          }
          saveProgress();
          renderStations();
          renderDetail();
          renderShop();
        });
      });
      el.querySelectorAll('input[data-want]').forEach(cb => {
        cb.addEventListener('change', () => {
          getProg(cb.dataset.want).want = cb.checked;
          saveProgress();
          renderStations();
          renderShop();
        });
      });
    }

    function reqKey(stationId, level, kind, idx) {
      return stationId + '|' + level + '|' + kind + '|' + idx;
    }

    function renderDetail() {
      const box = document.getElementById('detail');
      if (!selectedId) {
        box.innerHTML = 'Выбери станцию';
        return;
      }
      const st = stationById[selectedId];
      const p = getProg(selectedId);
      const info = nextLevelData(selectedId);

      if (!info) {
        box.innerHTML = `<h3 style="margin-bottom:8px;">${esc(st.name)}</h3>
          <p class="ok">Максимальный уровень (${st.maxLevel}) построен.</p>`;
        return;
      }

      const { next, lv, blocked } = info;
      let html = `<h3 style="margin-bottom:6px;">${esc(st.name)} → уровень ${next}</h3>`;
      html += `<div class="meta" style="margin-bottom:10px;">Время постройки: ${formatTime(lv.constructionTime)}
        ${blocked ? ' · <span class="bad">заблокировано пререквизитами</span>' : ' · <span class="ok">доступно</span>'}</div>`;

      // station prereqs
      const stReqs = lv.stationLevelRequirements || [];
      if (stReqs.length) {
        html += `<div class="req-block"><div class="card-title">Станции</div>`;
        stReqs.forEach(r => {
          const have = getProg(r.station).level;
          const need = Number(r.level) || 0;
          const ok = have >= need;
          html += `<div class="req-line">
            <span></span>
            <span>${esc(stationName(r.station))} ≥ ${need}</span>
            <span class="${ok ? 'ok' : 'bad'}">${have}/${need}</span>
            <span></span><span></span>
          </div>`;
        });
        html += `</div>`;
      }

      // traders
      const tReqs = lv.traderRequirements || [];
      if (tReqs.length) {
        html += `<div class="req-block"><div class="card-title">Торговцы (УЛ)</div>`;
        tReqs.forEach(r => {
          const name = TRADER_RU[r.trader] || r.trader;
          html += `<div class="req-line">
            <span></span>
            <span>${esc(name)} ${r.compareMethod || '≥'} ${r.value}</span>
            <span class="meta">проверь сам</span>
            <span></span><span></span>
          </div>`;
        });
        html += `</div>`;
      }

      // skills
      const sk = lv.skillRequirements || [];
      if (sk.length) {
        html += `<div class="req-block"><div class="card-title">Скиллы</div>`;
        sk.forEach(r => {
          html += `<div class="req-line">
            <span></span>
            <span>${esc(r.skill)} ≥ ${r.level}</span>
            <span class="meta">проверь сам</span>
            <span></span><span></span>
          </div>`;
        });
        html += `</div>`;
      }

      // items
      const items = lv.itemRequirements || [];
      html += `<div class="req-block"><div class="card-title">Предметы</div>`;
      if (!items.length) {
        html += `<div class="meta">Нет предметов</div>`;
      }
      items.forEach((r, idx) => {
        const key = reqKey(selectedId, next, 'item', idx);
        const done = !!p.collected[key];
        const fir = !!(r.attributes && r.attributes.foundInRaid);
        const it = itemsById[r.item];
        const avg = it ? (Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0) : 0;
        const buy = it ? bestBuy(it) : null;
        const isMoney = r.item === MONEY_ID;
        const unit = isMoney ? 1 : avg;
        const total = isMoney ? Number(r.count) : (avg * Number(r.count));
        const ic = (itemsById[r.item] && (itemsById[r.item].iconLink || itemsById[r.item].gridImageLink)) || '';
        html += `<div class="req-line ${done ? 'done' : ''}">
          <input type="checkbox" data-col="${key}" ${done ? 'checked' : ''}>
          <span class="name-cell">${ic?`<img class="ico ico-sm" src="${esc(ic)}" loading="lazy" alt="">`:''}<span class="txt">${esc(itemName(r.item))}
            ${fir ? '<span class="badge fir">FIR</span>' : ''}
            <div class="meta">${esc(itemSlug(r.item))}</div>
          </span></span>
          <span>×${formatNum(r.count)}</span>
          <span class="meta">${isMoney ? formatNum(r.count) + ' ₽' : (avg ? formatNum(total) + ' flea' : '—')}</span>
          <button type="button" class="copy-btn" data-name="${esc(itemSlug(r.item))}">копир.</button>
        </div>`;
      });
      html += `</div>`;

      // bonuses preview
      const bonuses = lv.bonuses || [];
      if (bonuses.length) {
        html += `<div class="req-block"><div class="card-title">Бонусы уровня</div>`;
        bonuses.forEach(b => {
          html += `<div class="meta">· ${esc(b.type || b.name || '?')}: ${b.value}</div>`;
        });
        html += `</div>`;
      }

      box.innerHTML = html;

      box.querySelectorAll('input[data-col]').forEach(cb => {
        cb.addEventListener('change', () => {
          getProg(selectedId).collected[cb.dataset.col] = cb.checked;
          saveProgress();
          renderDetail();
          renderShop();
        });
      });
      box.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.name || '').then(() => {
            const o = btn.textContent; btn.textContent = '✓';
            setTimeout(() => { btn.textContent = o; }, 700);
          }).catch(() => {});
        });
      });
    }

    function renderShop() {
      const onlyMissing = document.getElementById('shopOnlyMissing').checked;
      // aggregate
      const map = {}; // itemId -> { count, fir, keys: [] }
      stations.forEach(st => {
        const p = getProg(st.id);
        if (!p.want) return;
        const info = nextLevelData(st.id);
        if (!info || info.blocked) return;
        const { next, lv } = info;
        (lv.itemRequirements || []).forEach((r, idx) => {
          const key = reqKey(st.id, next, 'item', idx);
          const done = !!p.collected[key];
          if (onlyMissing && done) return;
          const id = r.item;
          if (!map[id]) map[id] = { count: 0, fir: false, name: itemName(id), slug: itemSlug(id) };
          map[id].count += Number(r.count) || 0;
          if (r.attributes && r.attributes.foundInRaid) map[id].fir = true;
        });
      });

      const rows = Object.entries(map).map(([id, v]) => {
        const it = itemsById[id];
        const avg = it ? (Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0) : 0;
        const buy = it ? bestBuy(it) : null;
        const isMoney = id === MONEY_ID;
        const fleaSum = isMoney ? v.count : avg * v.count;
        return {
          id, ...v, avg, buy, isMoney, fleaSum
        };
      }).sort((a, b) => b.fleaSum - a.fleaSum);

      const tbody = document.getElementById('shopBody');
      tbody.innerHTML = '';
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="meta" style="text-align:center;padding:20px;">Отметь «хочу» на станциях</td></tr>';
        document.getElementById('shopSum').innerHTML = '';
        return;
      }
      let totalFlea = 0;
      rows.forEach(r => {
        totalFlea += r.fleaSum || 0;
        const trader = r.buy
          ? `${esc(r.buy.name)} LL${r.buy.ll}: ${formatNum(r.buy.price)}${r.buy.quest ? ' (квест)' : ''}`
          : '—';
        const tr = document.createElement('tr');
        const ic = (itemsById[r.id] && (itemsById[r.id].iconLink || itemsById[r.id].gridImageLink)) || '';
        tr.innerHTML = `
          <td>
            <div class="name-cell">${ic?`<img class="ico ico-sm" src="${esc(ic)}" loading="lazy" alt="">`:''}<div class="txt">
            <div>${esc(r.name)}${r.fir ? ' <span class="badge fir">FIR</span>' : ''}</div>
            <div class="meta">${esc(r.slug)}</div>
            </div></div>
          </td>
          <td><strong>${formatNum(r.count)}</strong></td>
          <td>${r.fir ? '<span class="bad">да</span>' : 'нет'}</td>
          <td>${r.isMoney ? '—' : (r.avg ? formatNum(r.avg) : '—')}</td>
          <td class="meta">${trader}</td>
          <td><strong>${formatNum(r.fleaSum)}</strong></td>
          <td><button type="button" class="copy-btn" data-name="${esc(r.slug)}">копир.</button></td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.name || '').then(() => {
            const o = btn.textContent; btn.textContent = '✓';
            setTimeout(() => { btn.textContent = o; }, 700);
          }).catch(() => {});
        });
      });
      document.getElementById('shopSum').innerHTML =
        `<span>Позиций: <strong>${rows.length}</strong></span>
         <span>Оценка flea: <strong>${formatNum(totalFlea)} ₽</strong></span>
         <span class="meta">(деньги в реквезитах учтены как есть; FIR только с рейдов)</span>`;
    }

    document.getElementById('stationSearch').addEventListener('input', renderStations);
    document.getElementById('shopOnlyMissing').addEventListener('change', () => {
      renderShop();
      saveSettings('tarkovHideoutSettings', {
        gameMode: document.getElementById('gameMode').value,
        shopOnlyMissing: document.getElementById('shopOnlyMissing').checked
      });
    });
    document.getElementById('resetProgress').addEventListener('click', () => {
      if (!confirm('Сбросить все уровни, «хочу» и галочки предметов?')) return;
      progress = {};
      saveProgress();
      renderStations();
      renderDetail();
      renderShop();
    });
    document.getElementById('gameMode').addEventListener('change', () => {
      saveSettings('tarkovHideoutSettings', {
        gameMode: document.getElementById('gameMode').value,
        shopOnlyMissing: document.getElementById('shopOnlyMissing').checked
      });
    });

    loadProgress();
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

      const s = loadSettings('tarkovHideoutSettings', { gameMode: 'regular', shopOnlyMissing: true });
      document.getElementById('gameMode').value = s.gameMode || 'regular';
      document.getElementById('shopOnlyMissing').checked = s.shopOnlyMissing !== false;
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
