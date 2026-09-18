
    const CAL_LABEL = {
      'Caliber9x18PM': '9×18 ПМ',
      'Caliber9x19PARA': '9×19',
      'Caliber9x21': '9×21',
      'Caliber9x33R': '.357 Mag',
      'Caliber9x39': '9×39',
      'Caliber1143x23ACP': '.45 ACP',
      'Caliber46x30': '4.6×30',
      'Caliber57x28': '5.7×28',
      'Caliber545x39': '5.45×39',
      'Caliber556x45NATO': '5.56×45',
      'Caliber762x25TT': '7.62×25 ТТ',
      'Caliber762x35': '.300 BLK',
      'Caliber762x39': '7.62×39',
      'Caliber762x51': '7.62×51',
      'Caliber762x54R': '7.62×54R',
      'Caliber366TKM': '.366 ТКМ',
      'Caliber127x33': '.50 AE',
      'Caliber127x55': '12.7×55',
      'Caliber127x99': '.50 BMG',
      'Caliber12g': '12/70',
      'Caliber20g': '20/70',
      'Caliber23x75': '23×75',
      'Caliber26x75': '26×75',
      'Caliber40x46': '40×46',
      'Caliber40mmRU': '40 мм',
      'Caliber86x70': '.338 LM',
      'Caliber20x1mm': '20×1 мм'
    };

    // пороги pen для «уверенного» пробития класса (упрощение)
    const CLASS_THRESH = [10, 20, 30, 40, 50, 60];

    let byCaliber = {};
    let activeCal = null;
    let sortKey = 'pen';
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
    function classRating(pen, classIdx) {
      // classIdx 0..5
      const need = CLASS_THRESH[classIdx];
      const margin = pen - need;
      if (margin >= 5) return 'g';
      if (margin >= -2) return 'y';
      return 'r';
    }

    function shortAmmoName(slug) {
      // 556x45mm-m855 -> M855
      if (!slug) return '?';
      const s = slug.replace(/^\d+x\d+(mm)?-?/i, '').replace(/-gzh$/i, '');
      return s.toUpperCase().replace(/-/g, ' ') || humanize(slug);
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status';
      status.textContent = 'Гружу items…';
      const mode = document.getElementById('gameMode').value || 'regular';
      try {
        status.textContent = 'Гружу items + crafts…';
        const [itemsRes, craftsRes] = await Promise.all([
          fetch(`https://json.tarkov.dev/${mode}/items`, { cache: 'no-store' }),
          fetch(`https://json.tarkov.dev/${mode}/crafts`, { cache: 'no-store' })
        ]);
        if (!itemsRes.ok) throw new Error('items HTTP ' + itemsRes.status);
        const json = await itemsRes.json();
        let items = json?.data?.items;
        if (!items) throw new Error('Нет data.items');
        if (!Array.isArray(items)) items = Object.values(items);

        // crafts by product item id
        const craftByProduct = {};
        if (craftsRes.ok) {
          const cj = await craftsRes.json();
          let crafts = cj.data;
          if (crafts && crafts.crafts) crafts = crafts.crafts;
          if (!Array.isArray(crafts)) crafts = Object.values(crafts || {});
          crafts.forEach(c => {
            const pid = c.productItem && c.productItem.item;
            if (!pid) return;
            const entry = {
              count: Number(c.productItem.count) || 1,
              quest: !!(c.taskUnlock),
              station: c.station,
              level: c.level
            };
            if (!craftByProduct[pid]) craftByProduct[pid] = [];
            craftByProduct[pid].push(entry);
          });
        }

        const TRADER_ID = {
          '54cb50c76803fa8b248b4571': 'Прапор',
          '54cb57776803fa99248b456e': 'Терапевт',
          '58330581ace78e27b8b10cee': 'Лыжник',
          '5935c25fb3acc3127c3d8cd9': 'Миротворец',
          '5a7c2eca46aef81a7ca2145d': 'Механик',
          '5ac3b934156ae10c4430e83c': 'Барахольщик',
          '5c0647fdd443bc2504c2d371': 'Егерь',
          '6617beeaa9cfa777ca915b7c': 'Реф'
        };

        byCaliber = {};
        items.forEach(it => {
          const types = it.types || [];
          if (!types.includes('ammo') || types.includes('grenade')) return;
          const p = it.properties;
          if (!p || p.propertiesType !== 'ItemPropertiesAmmo') return;
          if (p.ammoType === 'grenade' || p.ammoType === 'flashbang') return;
          const cal = p.caliber;
          if (!cal) return;

          // buy from traders
          let traderPrice = 0, traderName = '', traderQuest = false, traderLL = 0;
          const offers = it.buyFromTrader || [];
          const usable = offers.filter(o => o && (o.priceRUB || o.price));
          if (usable.length) {
            // prefer cheapest RUB
            usable.sort((a, b) => (a.priceRUB || a.price) - (b.priceRUB || b.price));
            const best = usable[0];
            traderPrice = Number(best.priceRUB != null ? best.priceRUB : best.price) || 0;
            traderName = TRADER_ID[best.trader] || 'Торговец';
            traderQuest = !!best.taskUnlock;
            traderLL = Number(best.minTraderLevel) || 0;
          }

          const crafts = craftByProduct[it.id] || [];
          const hasCraft = crafts.length > 0;
          const craftQuest = crafts.some(c => c.quest);

          const row = {
            id: it.id,
            slug: it.normalizedName || '',
            name: shortAmmoName(it.normalizedName),
            full: humanize(it.normalizedName),
            icon: it.iconLink || it.gridImageLink || '',
            pen: Number(p.penetrationPower) || 0,
            dmg: Number(p.damage) || 0,
            ad: Number(p.armorDamage) || 0,
            frag: Math.round((Number(p.fragmentationChance) || 0) * 100),
            speed: Number(p.initialSpeed) || 0,
            projectiles: Number(p.projectileCount) || 1,
            tracer: !!p.tracer,
            avg: it.avg24hPrice || 0,
            low: it.lastLowPrice || 0,
            traderPrice,
            traderName,
            traderQuest,
            traderLL,
            hasCraft,
            craftQuest,
            craftCount: hasCraft ? crafts[0].count : 0,
            // hidden ballistics — tooltip only
            mass: Number(p.bulletMassGrams) || 0,
            diam: Number(p.bulletDiameterMilimeters) || 0,
            bc: Number(p.ballisticCoeficient) || 0,
            rico: Math.round((Number(p.ricochetChance) || 0) * 100),
            penChance: Math.round((Number(p.penetrationChance) || 0) * 100),
            penDev: Number(p.penetrationPowerDeviation) || 0,
            stamina: Number(p.staminaBurnPerDamage) || 0,
            durBurn: Number(p.durabilityBurnFactor) || 0,
            heat: Number(p.heatFactor) || 0,
            misfire: Math.round((Number(p.misfireChance) || 0) * 1000) / 10,
            ftf: Math.round((Number(p.failureToFeedChance) || 0) * 1000) / 10,
            acc: Number(p.accuracyModifier) || 0,
            reco: Number(p.recoilModifier) || 0,
            bleedL: Number(p.lightBleedModifier) || 0,
            bleedH: Number(p.heavyBleedModifier) || 0
          };
          if (!byCaliber[cal]) byCaliber[cal] = [];
          byCaliber[cal].push(row);
        });

        // sort calibers by label
        const cals = Object.keys(byCaliber).sort((a, b) => {
          const la = CAL_LABEL[a] || a;
          const lb = CAL_LABEL[b] || b;
          return la.localeCompare(lb, 'ru');
        });

        const box = document.getElementById('calibers');
        box.innerHTML = '';
        cals.forEach(cal => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cal-btn' + (activeCal === cal ? ' active' : '');
          btn.innerHTML = `${CAL_LABEL[cal] || cal.replace('Caliber','')}<span class="count">${byCaliber[cal].length}</span>`;
          btn.onclick = () => {
            activeCal = cal;
            box.querySelectorAll('.cal-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTable();
            saveSettings('tarkovAmmoSettings', {
              gameMode: document.getElementById('gameMode').value,
              activeCal: cal
            });
          };
          box.appendChild(btn);
        });

        document.getElementById('calCard').style.display = 'block';
        status.className = 'status ok';
        status.textContent = `Патронов: ${Object.values(byCaliber).reduce((s, a) => s + a.length, 0)} · калибров: ${cals.length}`;

        const saved = loadSettings('tarkovAmmoSettings', {});
        if (saved.activeCal && byCaliber[saved.activeCal]) {
          activeCal = saved.activeCal;
          const btns = [...box.querySelectorAll('.cal-btn')];
          const idx = cals.indexOf(activeCal);
          if (idx >= 0 && btns[idx]) btns[idx].classList.add('active');
          renderTable();
        }
      } catch (e) {
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    });


    function pct(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return n + '%';
    }
    function tipHtml(r) {
      const rows = [
        ['Масса, г', r.mass || '—'],
        ['Диаметр, мм', r.diam || '—'],
        ['Баллист. коэф.', r.bc ? r.bc.toFixed(3) : '—'],
        ['Скорость, м/с', r.speed || '—'],
        ['Шанс рикошета', pct(r.rico)],
        ['Шанс пробития', pct(r.penChance)],
        ['Шанс фрагментации', pct(r.frag)],
        ['Pen deviation', r.penDev || '—'],
        ['Урон по стамине / HP', r.stamina ? r.stamina.toFixed(3) : '—'],
        ['Поломка брони ×', r.durBurn ? r.durBurn.toFixed(2) : '—'],
        ['Нагрев ×', r.heat ? r.heat.toFixed(2) : '—'],
        ['Осечка', pct(r.misfire)],
        ['Неподача (FTF)', pct(r.ftf)],
        ['Точность', r.acc ? ((r.acc * 100).toFixed(0) + '%') : '0%'],
        ['Отдача', r.reco ? ((r.reco * 100).toFixed(0) + '%') : '0%'],
        ['Лёгкое кровотечение', r.bleedL || '—'],
        ['Тяжёлое кровотечение', r.bleedH || '—']
      ];
      return `<div class="tip-title">${esc(r.name)}</div><div class="tip-grid">${
        rows.map(([k,v]) => `<span class="k">${esc(k)}</span><span class="v">${esc(String(v))}</span>`).join('')
      }</div>`;
    }

    let tipEl = null;
    function ensureTip() {
      if (tipEl) return tipEl;
      tipEl = document.createElement('div');
      tipEl.className = 'ammo-tip';
      tipEl.id = 'ammoTip';
      document.body.appendChild(tipEl);
      return tipEl;
    }
    function showTip(anchor, r, e) {
      const el = ensureTip();
      el.innerHTML = tipHtml(r);
      el.style.display = 'block';
      const pad = 12;
      let x = (e && e.clientX != null ? e.clientX : 0) + 16;
      let y = (e && e.clientY != null ? e.clientY : 0) + 16;
      el.style.left = '0px';
      el.style.top = '0px';
      const rect = el.getBoundingClientRect();
      if (x + rect.width + pad > window.innerWidth) x = window.innerWidth - rect.width - pad;
      if (y + rect.height + pad > window.innerHeight) y = window.innerHeight - rect.height - pad;
      if (x < pad) x = pad;
      if (y < pad) y = pad;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }
    function hideTip() {
      if (tipEl) tipEl.style.display = 'none';
    }

    function renderTable() {
      const card = document.getElementById('tableCard');
      if (!activeCal || !byCaliber[activeCal]) {
        card.style.display = 'none';
        return;
      }
      card.style.display = 'block';
      document.getElementById('tableTitle').textContent =
        (CAL_LABEL[activeCal] || activeCal) + ' · ' + byCaliber[activeCal].length + ' шт.';

      let rows = [...byCaliber[activeCal]];
      rows.sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        if (typeof va === 'string') return sortDir * va.localeCompare(vb);
        return sortDir * ((va || 0) - (vb || 0));
      });

      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      rows.forEach(r => {
        const cls = CLASS_THRESH.map((_, i) => {
          const rating = classRating(r.pen, i);
          return `<span class="${rating}">${i + 1}</span>`;
        }).join('');
        const tr = document.createElement('tr');
        const traderCell = r.traderPrice
          ? `<div>${esc(r.traderName)}${r.traderLL ? ' LL' + r.traderLL : ''}</div><div><strong>${formatNum(r.traderPrice)}</strong></div>`
          : '<span class="meta">—</span>';
        const questCell = r.traderQuest
          ? '<span class="bad">да</span>'
          : (r.traderPrice ? '<span class="ok">нет</span>' : '—');
        const craftCell = r.hasCraft
          ? (r.craftQuest
              ? `<span class="bad">да</span> <span class="meta">квест</span>`
              : `<span class="ok">да</span>${r.craftCount > 1 ? ' <span class="meta">×' + r.craftCount + '</span>' : ''}`)
          : '<span class="meta">нет</span>';
        tr.innerHTML = `
          <td>
            <div class="name-cell" data-tip="1">
              ${r.icon?`<img class="ico ico-sm" src="${esc(r.icon)}" loading="lazy" alt="">`:''}
              <div class="txt">
                <div class="name">${esc(r.name)}${r.tracer ? ' <span class="meta">TR</span>' : ''}${r.projectiles > 1 ? ' <span class="meta">×' + r.projectiles + '</span>' : ''}</div>
                <div class="meta">${esc(r.slug)}</div>
              </div>
            </div>
          </td>
          <td><strong>${r.pen}</strong></td>
          <td>${r.dmg}</td>
          <td>${r.ad}</td>
          <td>${traderCell}</td>
          <td>${r.avg ? formatNum(r.avg) : '—'}</td>
          <td>${questCell}</td>
          <td>${craftCell}</td>
          <td><div class="cls">${cls}</div></td>
          <td><button type="button" class="copy-btn" data-name="${esc(r.slug)}">копир.</button></td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.dataset.name || '';
          navigator.clipboard.writeText(text).then(() => {
            const old = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = old; }, 700);
          }).catch(() => {});
        });
      });
      tbody.querySelectorAll('.name-cell[data-tip]').forEach((cell, idx) => {
        const row = rows[idx];
        cell.addEventListener('mouseenter', (e) => showTip(cell, row, e));
        cell.addEventListener('mousemove', (e) => showTip(cell, row, e));
        cell.addEventListener('mouseleave', hideTip);
      });
    }

    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    document.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = k === 'name' ? 1 : -1; }
        renderTable();
      });
    });

    (function() {
      const s = loadSettings('tarkovAmmoSettings', { gameMode: 'regular' });
      if (s.gameMode) document.getElementById('gameMode').value = s.gameMode;
      document.getElementById('gameMode').addEventListener('change', () => {
        saveSettings('tarkovAmmoSettings', {
          gameMode: document.getElementById('gameMode').value,
          activeCal
        });
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
