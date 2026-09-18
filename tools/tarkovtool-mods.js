
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

    const CAT_RU = {
      mod_pistol_grip: 'Пистолетная рукоять',
      mod_pistolgrip: 'Пистолетная рукоять',
      mod_stock: 'Приклад',
      mod_barrel: 'Ствол',
      mod_handguard: 'Цевьё',
      mod_muzzle: 'ДТК / дульный',
      mod_scope: 'Прицел',
      mod_sight_rear: 'Целик',
      mod_sight_front: 'Мушка',
      mod_magazine: 'Магазин',
      mod_charge: 'Рукоятка взведения',
      mod_gas_block: 'Газблок',
      mod_reciever: 'Ресивер',
      mod_mount: 'Крепление',
      mod_tactical: 'Тактический',
      mod_foregrip: 'Рукоять (цевьё)',
      mod_bipod: 'Сошки',
      mod_launcher: 'Подствольник',
      other: 'Прочее'
    };

    const CAT_ORDER = [
      'mod_pistol_grip', 'mod_stock', 'mod_barrel', 'mod_handguard', 'mod_muzzle',
      'mod_foregrip', 'mod_scope', 'mod_sight_rear', 'mod_sight_front',
      'mod_magazine', 'mod_charge', 'mod_gas_block', 'mod_reciever',
      'mod_mount', 'mod_tactical', 'mod_bipod', 'mod_launcher', 'other'
    ];

    function normalizeSlot(nid) {
      if (!nid) return 'other';
      let s = String(nid).toLowerCase();
      // mod_mount_000 → mod_mount, mod_stock_001 → mod_stock
      s = s.replace(/_\d+$/, '');
      if (s === 'mod_pistolgrip') s = 'mod_pistol_grip';
      if (s.startsWith('mod_tactical')) s = 'mod_tactical';
      if (s.startsWith('mod_mount')) s = 'mod_mount';
      if (s.startsWith('mod_stock')) s = 'mod_stock';
      if (s.startsWith('mod_charge')) s = 'mod_charge';
      if (!CAT_RU[s] && s !== 'other') {
        // unknown but keep raw if looks like mod_
        if (!s.startsWith('mod_')) return 'other';
      }
      return CAT_RU[s] ? s : 'other';
    }

    let mods = [];
    let weapons = []; // {id, name, slug}
    let selectedWeaponId = null;
    let activeCats = new Set();
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

    function modRating(ergo, recoil, acc) {
      // recoilModifier: -0.05 = −5% отдачи → хорошо
      const recoilPct = (Number(recoil) || 0) * 100; // -5
      const a = (Number(acc) || 0) * 100;
      return (Number(ergo) || 0) * 2.5 + (-recoilPct) * 2 + a * 0.3;
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status';
      const mode = document.getElementById('gameMode').value || 'regular';
      status.textContent = 'Гружу items, строю совместимость…';
      try {
        const res = await fetch(`https://json.tarkov.dev/${mode}/items`, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        let items = json?.data?.items;
        if (!items) throw new Error('Нет items');
        if (!Array.isArray(items)) items = Object.values(items);

        // modId -> { slots: Set, weaponIds: Set }
        const compat = new Map();
        function addCompat(modId, slotNid, parentId, isWeapon) {
          if (!modId) return;
          if (!compat.has(modId)) compat.set(modId, { slots: new Set(), weaponIds: new Set() });
          const c = compat.get(modId);
          c.slots.add(normalizeSlot(slotNid));
          if (isWeapon && parentId) c.weaponIds.add(parentId);
        }

        weapons = [];
        items.forEach(it => {
          const p = it.properties;
          if (!p || typeof p !== 'object') return;
          const isWeapon = p.propertiesType === 'ItemPropertiesWeapon';
          if (isWeapon) {
            weapons.push({
              id: it.id,
              slug: it.normalizedName || '',
              name: humanize(it.normalizedName)
            });
          }
          // any item with slots can accept mods (weapon, handguard, receiver…)
          (p.slots || []).forEach(sl => {
            const nid = sl.nameId || sl.name || '';
            const allowed = (sl.filters && sl.filters.allowedItems) || [];
            allowed.forEach(mid => addCompat(mid, nid, it.id, isWeapon));
          });
        });
        weapons.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

        mods = [];
        items.forEach(it => {
          const p = it.properties;
          if (!p || typeof p !== 'object') return;
          const pt = p.propertiesType;
          if (!['ItemPropertiesWeaponMod', 'ItemPropertiesBarrel', 'ItemPropertiesScope', 'ItemPropertiesMagazine'].includes(pt)) {
            // still include if in compat map as mod
            if (!compat.has(it.id)) return;
          }
          // must have some combat-ish stats or be in compat
          const c = compat.get(it.id);
          if (!c && pt === 'ItemPropertiesMagazine') {
            // magazines still useful
          } else if (!c && !(p.ergonomics || p.recoilModifier || p.accuracyModifier)) {
            return;
          }

          const ergo = Number(p.ergonomics) || 0;
          const recoil = Number(p.recoilModifier) || 0;
          const acc = Number(p.accuracyModifier) || 0;
          const slots = c ? [...c.slots] : ['other'];
          // primary category: first non-other in CAT_ORDER
          let cat = 'other';
          for (const k of CAT_ORDER) {
            if (slots.includes(k)) { cat = k; break; }
          }
          // pistolGrip type tag
          if ((it.types || []).includes('pistolGrip')) cat = 'mod_pistol_grip';
          if ((it.types || []).includes('suppressor')) cat = 'mod_muzzle';

          const buy = bestBuy(it);
          const avg = Number(it.avg24hPrice) || 0;
          const weaponIds = c ? c.weaponIds : new Set();
          const row = {
            id: it.id,
            slug: it.normalizedName || '',
            name: humanize(it.normalizedName),
            icon: it.iconLink || it.gridImageLink || '',
            cat,
            slots,
            ergo,
            recoil,
            acc,
            recoilPct: recoil * 100,
            fits: weaponIds.size,
            weaponIds,
            avg,
            onFlea: avg > 0 || (Number(it.lastLowPrice) || 0) > 0 || !(it.types || []).includes('noFlea'),
            noFlea: (it.types || []).includes('noFlea'),
            traderPrice: buy ? buy.price : 0,
            traderName: buy ? buy.name : '',
            traderLL: buy ? buy.ll : 0,
            quest: buy ? buy.quest : false,
            rating: modRating(ergo, recoil, acc),
            // magazine extras
            capacity: Number(p.capacity) || 0
          };
          // skip pure trash with zero everything and no fits
          if (row.fits === 0 && !row.ergo && !row.recoil && !row.acc && !row.capacity) return;
          mods.push(row);
        });

        activeCats = new Set(CAT_ORDER.filter(k => mods.some(m => m.cat === k)));
        document.getElementById('filtersCard').style.display = 'block';
        document.getElementById('tableCard').style.display = 'block';
        renderCatChips();
        renderTable();
        status.className = 'status ok';
        status.textContent = `Модов: ${mods.length} · стволов: ${weapons.length} · связей совместимости: ${compat.size}`;
      } catch (e) {
        console.error(e);
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    });

    function renderCatChips() {
      const el = document.getElementById('catChips');
      el.innerHTML = '';
      const allBtn = document.createElement('span');
      allBtn.className = 'chip active';
      allBtn.textContent = 'Все';
      allBtn.onclick = () => {
        activeCats = new Set(CAT_ORDER.filter(k => mods.some(m => m.cat === k)));
        el.querySelectorAll('.chip').forEach(c => c.classList.add('active'));
        renderTable();
      };
      el.appendChild(allBtn);
      CAT_ORDER.forEach(k => {
        const n = mods.filter(m => m.cat === k).length;
        if (!n) return;
        const c = document.createElement('span');
        c.className = 'chip' + (activeCats.has(k) ? ' active' : '');
        c.textContent = (CAT_RU[k] || k) + ' (' + n + ')';
        c.onclick = () => {
          if (activeCats.has(k)) activeCats.delete(k);
          else activeCats.add(k);
          c.classList.toggle('active');
          renderTable();
          persist();
        };
        el.appendChild(c);
      });
    }

    // weapon picker
    const weaponSearch = document.getElementById('weaponSearch');
    const weaponList = document.getElementById('weaponList');
    weaponSearch.addEventListener('input', () => {
      const q = weaponSearch.value.toLowerCase().trim();
      if (!q) {
        weaponList.classList.remove('open');
        weaponList.innerHTML = '';
        return;
      }
      const hits = weapons.filter(w =>
        w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q)
      ).slice(0, 40);
      weaponList.innerHTML = '';
      const clear = document.createElement('div');
      clear.className = 'weapon-opt';
      clear.textContent = '✕ Сбросить фильтр ствола';
      clear.onclick = () => {
        selectedWeaponId = null;
        weaponSearch.value = '';
        document.getElementById('weaponSelected').textContent = 'Не выбрано — все стволы';
        weaponList.classList.remove('open');
        renderTable();
        persist();
      };
      weaponList.appendChild(clear);
      hits.forEach(w => {
        const d = document.createElement('div');
        d.className = 'weapon-opt' + (selectedWeaponId === w.id ? ' active' : '');
        d.textContent = w.name;
        d.onclick = () => {
          selectedWeaponId = w.id;
          weaponSearch.value = w.name;
          document.getElementById('weaponSelected').textContent = 'Ствол: ' + w.name;
          weaponList.classList.remove('open');
          renderTable();
          persist();
        };
        weaponList.appendChild(d);
      });
      weaponList.classList.add('open');
    });
    document.addEventListener('click', (e) => {
      if (!weaponList.contains(e.target) && e.target !== weaponSearch) {
        weaponList.classList.remove('open');
      }
    });

    function getFiltered() {
      const q = (document.getElementById('modSearch').value || '').toLowerCase().trim();
      const minFits = Number(document.getElementById('minFits').value) || 0;
      const hideQuest = document.getElementById('hideQuest').checked;
      const onlyFlea = document.getElementById('onlyFlea').checked;

      let list = mods.filter(m => {
        if (!activeCats.has(m.cat)) return false;
        if (selectedWeaponId && !m.weaponIds.has(selectedWeaponId)) return false;
        if (m.fits < minFits) return false;
        if (hideQuest && m.quest) return false;
        if (onlyFlea && (m.noFlea || !m.onFlea)) return false;
        if (q) {
          const hay = (m.name + ' ' + m.slug).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      list.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (sortKey === 'quest') { va = a.quest ? 1 : 0; vb = b.quest ? 1 : 0; }
        if (typeof va === 'string') return sortDir * va.localeCompare(vb, 'ru');
        return sortDir * ((va ?? -999) - (vb ?? -999));
      });
      return list;
    }

    function renderTable() {
      const list = getFiltered();
      const tbody = document.getElementById('tbody');
      const wName = selectedWeaponId
        ? (weapons.find(w => w.id === selectedWeaponId) || {}).name
        : null;
      document.getElementById('tableTitle').textContent =
        (wName ? wName + ' · ' : '') + list.length + ' модов · ' + sortKey;

      tbody.innerHTML = '';
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="meta" style="text-align:center;padding:24px;">Пусто — смени фильтры или выбери другой ствол</td></tr>';
        return;
      }
      list.slice(0, 300).forEach(m => {
        const tr = document.createElement('tr');
        const ergoCls = m.ergo > 0 ? 'pos' : (m.ergo < 0 ? 'neg' : '');
        const recCls = m.recoilPct < 0 ? 'pos' : (m.recoilPct > 0 ? 'neg' : '');
        const flea = m.noFlea ? '<span class="bad">бан</span>' : (m.avg ? formatNum(m.avg) : '—');
        const trader = m.traderPrice
          ? `${esc(m.traderName)}${m.traderLL ? ' LL' + m.traderLL : ''}<br><strong>${formatNum(m.traderPrice)}</strong>`
          : '—';
        const quest = m.quest ? '<span class="bad">да</span>' : (m.traderPrice ? '<span class="ok">нет</span>' : '—');
        const extra = m.capacity ? ` · магазин ${m.capacity}` : '';
        tr.innerHTML = `
          <td>
            <div class="name-cell">${m.icon?`<img class="ico ico-sm" src="${esc(m.icon)}" loading="lazy" alt="">`:''}<div class="txt">
            <div class="name">${esc(m.name)}</div>
            <div class="meta">${esc(m.slug)}${extra}</div>
            </div></div>
          </td>
          <td>${CAT_RU[m.cat] || m.cat}</td>
          <td class="${ergoCls}">${m.ergo > 0 ? '+' : ''}${m.ergo}</td>
          <td class="${recCls}">${m.recoilPct > 0 ? '+' : ''}${m.recoilPct.toFixed(1)}%</td>
          <td>${m.acc ? ((m.acc * 100).toFixed(1) + '%') : '—'}</td>
          <td>${m.fits}</td>
          <td>${flea}</td>
          <td>${trader}</td>
          <td>${quest}</td>
          <td><strong>${m.rating.toFixed(1)}</strong></td>
          <td><button type="button" class="copy-btn" data-name="${esc(m.slug)}">копир.</button></td>
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

    }

    document.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = k === 'name' || k === 'cat' ? 1 : -1; }
        renderTable();
      });
    });
    ['modSearch', 'minFits', 'hideQuest', 'onlyFlea'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', renderTable);
      el.addEventListener('change', () => { renderTable(); persist(); });
    });

    function persist() {
      saveSettings('tarkovModsSettings', {
        gameMode: document.getElementById('gameMode').value,
        hideQuest: document.getElementById('hideQuest').checked,
        onlyFlea: document.getElementById('onlyFlea').checked,
        minFits: Number(document.getElementById('minFits').value) || 0,
        weaponId: selectedWeaponId
      });
    }
    (function() {
      const s = loadSettings('tarkovModsSettings', {});
      if (s.gameMode) document.getElementById('gameMode').value = s.gameMode;
      if (s.hideQuest) document.getElementById('hideQuest').checked = true;
      if (s.onlyFlea) document.getElementById('onlyFlea').checked = true;
      if (s.minFits) document.getElementById('minFits').value = s.minFits;
      // weapon restored after load
      window._savedWeaponId = s.weaponId || null;
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
