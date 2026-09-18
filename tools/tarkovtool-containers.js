
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

    let rigs = [];
    let backpacks = [];
    let tab = 'rig';
    let sortKey = 'rating';
    let sortDir = -1;

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
    function humanize(slug) {
      if (!slug) return '?';
      return String(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    function formatNum(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return Math.round(n).toLocaleString('ru-RU');
    }
    function formatW(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return Number(n).toFixed(2);
    }
    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function bestBuy(it) {
      const offers = it.buyFromTrader || [];
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

    /** Сегментация: больше карманов + разные размеры = удобнее */
    function segmentScore(grids) {
      if (!grids || !grids.length) return 0;
      const shapes = new Set(grids.map(g => (g.width || 0) + 'x' + (g.height || 0)));
      const n = grids.length;
      // бонус за 1x2 (магазы), 1x1 (мелочь), крупные ≥2x2
      let shapeBonus = 0;
      grids.forEach(g => {
        const w = g.width || 0, h = g.height || 0;
        const cells = w * h;
        if ((w === 1 && h === 2) || (w === 2 && h === 1)) shapeBonus += 1.2;
        else if (cells === 1) shapeBonus += 0.8;
        else if (cells >= 4) shapeBonus += 1.5;
        else shapeBonus += 1;
      });
      return n * 0.6 + shapes.size * 1.2 + shapeBonus * 0.4;
    }

    function mobilityScore(p) {
      const s = Math.abs(Number(p.speedPenalty) || 0);
      const t = Math.abs(Number(p.turnPenalty) || 0);
      const e = Math.abs(Number(p.ergoPenalty) || 0);
      return 1 / (1 + s * 12 + t * 12 + e * 12);
    }

    function rate(row) {
      // качество без цены: слоты, вес, сегментация, мобильность
      const cap = row.capacity || 0;
      const spk = row.spk || 0;
      const seg = row.seg || 0;
      const mob = row.mob || 0;
      let score =
        cap * 2.2 +
        spk * 5.0 +
        seg * 3.2 +
        mob * 16;
      // бронеразгруз — лёгкий бонус (полная броня в armor tool)
      if (row.armorClass) score += row.armorClass * 1.5;
      return score;
    }

    function buildRow(it, kind) {
      const p = it.properties || {};
      const grids = p.grids || [];
      const capacity = Number(p.capacity) || grids.reduce((s, g) => s + (g.width || 0) * (g.height || 0), 0);
      const weight = Number(it.weight) || 0;
      const spk = weight > 0.01 ? capacity / weight : capacity * 10;
      const seg = segmentScore(grids);
      const mob = mobilityScore(p);
      const buy = bestBuy(it);
      const avg = Number(it.avg24hPrice) || 0;
      const gridSizes = grids.map(g => ({
        w: g.width || 0,
        h: g.height || 0,
        cells: (g.width || 0) * (g.height || 0)
      }));
      const row = {
        id: it.id,
        kind,
        slug: it.normalizedName || '',
        name: humanize(it.normalizedName),
        icon: it.iconLink || it.gridImageLink || '',
        capacity,
        weight,
        spk,
        seg,
        grids: grids.length,
        gridSizes,
        mob,
        avg,
        onFlea: avg > 0 || (Number(it.lastLowPrice) || 0) > 0,
        traderPrice: buy ? buy.price : 0,
        traderName: buy ? buy.name : '',
        traderLL: buy ? buy.ll : 0,
        quest: buy ? buy.quest : false,
        armorClass: Number(p.class) || 0,
        plateSlots: (p.armorSlots || []).length,
        speedPenalty: Math.abs(Number(p.speedPenalty) || 0),
        turnPenalty: Math.abs(Number(p.turnPenalty) || 0),
        ergoPenalty: Math.abs(Number(p.ergoPenalty) || 0)
      };
      row.rating = rate(row);
      return row;
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status';
      const mode = document.getElementById('gameMode').value || 'regular';
      status.textContent = 'Гружу items…';
      try {
        const res = await fetch(`https://json.tarkov.dev/${mode}/items`, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        let items = json?.data?.items;
        if (!items) throw new Error('Нет items');
        if (!Array.isArray(items)) items = Object.values(items);

        rigs = [];
        backpacks = [];
        items.forEach(it => {
          const p = it.properties;
          if (!p || typeof p !== 'object') return;
          if (p.propertiesType === 'ItemPropertiesChestRig') {
            rigs.push(buildRow(it, 'rig'));
          } else if (p.propertiesType === 'ItemPropertiesBackpack') {
            backpacks.push(buildRow(it, 'backpack'));
          }
        });

        document.getElementById('tabs').style.display = 'flex';
        document.getElementById('filtersCard').style.display = 'block';
        document.getElementById('tableCard').style.display = 'block';
        status.className = 'status ok';
        status.textContent = `Разгрузок: ${rigs.length} · рюкзаков: ${backpacks.length}`;
        render();
      } catch (e) {
        console.error(e);
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    });

    function currentList() {
      return tab === 'rig' ? rigs : backpacks;
    }

    function getFiltered() {
      const q = (document.getElementById('search').value || '').toLowerCase().trim();
      const minSlots = Number(document.getElementById('minSlots').value) || 0;
      const hideQuest = document.getElementById('hideQuest').checked;
      const onlyArmor = document.getElementById('onlyArmorRig').checked;
      let list = currentList().filter(r => {
        if (r.capacity < minSlots) return false;
        if (hideQuest && r.quest) return false;
        if (tab === 'rig' && onlyArmor && !r.plateSlots && !r.armorClass) return false;
        if (q) {
          const hay = (r.name + ' ' + r.slug).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      list.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (sortKey === 'quest') { va = a.quest ? 1 : 0; vb = b.quest ? 1 : 0; }
        if (typeof va === 'string') return sortDir * va.localeCompare(vb, 'ru');
        return sortDir * ((va ?? -1) - (vb ?? -1));
      });
      return list;
    }

    function gridViz(r) {
      if (!r.gridSizes.length) return '—';
      // group identical
      const map = {};
      r.gridSizes.forEach(g => {
        const k = g.w + '×' + g.h;
        map[k] = (map[k] || 0) + 1;
      });
      return Object.entries(map).map(([k, n]) => {
        const cells = k.split('×').reduce((a, b) => a * Number(b), 1);
        const cls = cells >= 4 ? 'grid-cell wide' : 'grid-cell';
        return `<span class="${cls}">${n > 1 ? n + '×' : ''}${k}</span>`;
      }).join('');
    }

    function render() {
      document.getElementById('armorFilterWrap').style.display = tab === 'rig' ? '' : 'none';
      document.getElementById('tableTitle').textContent =
        (tab === 'rig' ? 'Разгрузки' : 'Рюкзаки') + ' · сортировка: ' + sortKey;

      const list = getFiltered();
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="meta" style="text-align:center;padding:24px;">Пусто</td></tr>';
        return;
      }
      list.forEach(r => {
        const tr = document.createElement('tr');
        const badges = [];
        if (r.armorClass) badges.push(`<span class="badge">бр.кл.${r.armorClass}</span>`);
        if (r.plateSlots) badges.push(`<span class="badge">${r.plateSlots} плит</span>`);
        const flea = r.onFlea ? formatNum(r.avg) : '<span class="bad">нет</span>';
        const trader = r.traderPrice
          ? `${esc(r.traderName)}${r.traderLL ? ' LL' + r.traderLL : ''}<br><strong>${formatNum(r.traderPrice)}</strong>`
          : '—';
        const quest = r.quest ? '<span class="bad">да</span>' : (r.traderPrice ? '<span class="ok">нет</span>' : '—');
        tr.innerHTML = `
          <td>
            <div class="name-cell">${r.icon?`<img class="ico" src="${esc(r.icon)}" loading="lazy" alt="">`:''}<div class="txt">
            <div class="name">${esc(r.name)}${badges.join('')}</div>
            <div class="meta">${esc(r.slug)} · штраф ск.${(r.speedPenalty*100).toFixed(0)}% повор.${(r.turnPenalty*100).toFixed(0)}% эрго.${(r.ergoPenalty*100).toFixed(0)}%</div>
            </div></div>
          </td>
          <td><strong>${r.capacity}</strong></td>
          <td>${formatW(r.weight)}</td>
          <td>${r.spk.toFixed(1)}</td>
          <td>${r.grids} <span class="meta">(${r.seg.toFixed(1)})</span></td>
          <td><div class="grid-viz">${gridViz(r)}</div></td>
          <td>${flea}</td>
          <td>${trader}</td>
          <td>${quest}</td>
          <td><strong>${formatNum(r.rating)}</strong></td>
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
    }

    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => {
        tab = t.dataset.tab;
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        sortKey = 'rating';
        sortDir = -1;
        render();
        persist();
      });
    });

    document.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = k === 'name' ? 1 : -1; }
        render();
      });
    });

    ['search', 'minSlots', 'hideQuest', 'onlyArmorRig'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', render);
      el.addEventListener('change', () => { render(); persist(); });
    });

    function persist() {
      saveSettings('tarkovContainersSettings', {
        gameMode: document.getElementById('gameMode').value,
        tab,
        hideQuest: document.getElementById('hideQuest').checked,
        onlyArmorRig: document.getElementById('onlyArmorRig').checked,
        minSlots: Number(document.getElementById('minSlots').value) || 0
      });
    }

    (function() {
      const s = loadSettings('tarkovContainersSettings', {});
      if (s.gameMode) document.getElementById('gameMode').value = s.gameMode;
      if (s.tab) tab = s.tab;
      if (s.hideQuest) document.getElementById('hideQuest').checked = true;
      if (s.onlyArmorRig) document.getElementById('onlyArmorRig').checked = true;
      if (s.minSlots) document.getElementById('minSlots').value = s.minSlots;
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
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
