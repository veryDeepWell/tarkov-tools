
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

    const KIND_RU = {
      armor: 'Броник',
      rig: 'Разгруз / carrier',
      helmet: 'Шлем',
      plate: 'Плита',
      glasses: 'Очки',
      other: 'Другое'
    };

    let rows = [];
    let platesById = {};
    let activeTypes = new Set(['armor', 'rig', 'helmet']);
    let activeClasses = new Set([1,2,3,4,5,6]);
    let sortKey = 'rating';
    let sortDir = -1;
    let expandedId = null;

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

    function simplifyZones(zones) {
      const tags = new Set();
      (zones || []).forEach(z => {
        const s = String(z);
        if (/Head|Parietal|Nape|Ear|Jaw|Face|Eyes|Top of the Head/i.test(s) || /Collider Type Head/i.test(s)) tags.add('голова');
        else if (/Neck/i.test(s)) tags.add('шея');
        else if (/chest|Thorax|RibcageUp|SpineTop|Plate_.*chest/i.test(s)) tags.add('грудь');
        else if (/back|SpineDown|Plate_.*back/i.test(s)) tags.add('спина');
        else if (/Side|LeftSide|RightSide|side_left|side_right/i.test(s)) tags.add('бока');
        else if (/Arm|Shoulder/i.test(s)) tags.add('руки');
        else if (/Pelvis|Groin|Stomach|RibcageLow/i.test(s)) tags.add('живот/таз');
        else if (/Leg|Thigh/i.test(s)) tags.add('ноги');
      });
      return [...tags];
    }

    function detectKind(it, p) {
      const types = it.types || [];
      if (types.includes('armorPlate') || p.propertiesType === 'ItemPropertiesArmorAttachment') return 'plate';
      if (p.propertiesType === 'ItemPropertiesHelmet' || types.includes('helmet')) return 'helmet';
      if (p.propertiesType === 'ItemPropertiesChestRig' || types.includes('rig')) return 'rig';
      if (p.propertiesType === 'ItemPropertiesArmor' || types.includes('armor')) return 'armor';
      if (p.propertiesType === 'ItemPropertiesGlasses') return 'glasses';
      return 'other';
    }

    function bestBuy(it) {
      const offers = it.buyFromTrader || [];
      if (!offers.length) return null;
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

        const itemsById = {};
        items.forEach(i => { itemsById[i.id] = i; });

        platesById = {};
        rows = [];

        items.forEach(it => {
          const p = it.properties;
          if (!p || typeof p !== 'object') return;
          const pt = p.propertiesType;
          const interesting = [
            'ItemPropertiesArmor',
            'ItemPropertiesChestRig',
            'ItemPropertiesHelmet',
            'ItemPropertiesArmorAttachment',
            'ItemPropertiesGlasses'
          ].includes(pt);
          if (!interesting) return;
          // skip pure attachments without class (rails etc) — plates have class
          const cls = Number(p.class) || 0;
          const kind = detectKind(it, p);
          if (kind === 'other') return;
          if (kind === 'plate' && !cls) return;
          // chest rigs without armor class and without plate slots — ordinary rigs
          if (kind === 'rig' && !cls && !(p.armorSlots && p.armorSlots.length)) return;

          const slots = p.armorSlots || [];
          const plateIds = new Set();
          slots.forEach(s => (s.allowedPlates || []).forEach(id => plateIds.add(id)));

          const buy = bestBuy(it);
          const avg = Number(it.avg24hPrice) || 0;
          const onFlea = avg > 0 || (Number(it.lastLowPrice) || 0) > 0;
          const dur = Number(p.durability) || Number(it.maxDurability) || 0;
          const speedPen = Math.abs(Number(p.speedPenalty) || 0);
          const turnPen = Math.abs(Number(p.turnPenalty) || 0);
          const ergoPen = Math.abs(Number(p.ergoPenalty) || 0);
          const penalty = 1 + speedPen * 5 + turnPen * 5 + ergoPen * 5;
          // rating: protection density vs mobility cost
          const rating = cls > 0
            ? (cls * cls * Math.sqrt(Math.max(dur, 1))) / penalty
            : 0;

          const zones = simplifyZones(p.zones || []);
          const row = {
            id: it.id,
            slug: it.normalizedName || '',
            name: humanize(it.normalizedName),
            icon: it.iconLink || it.gridImageLink || '',
            class: cls,
            dur,
            kind,
            armorType: p.armorType || '',
            material: p.material || '',
            zones,
            avg,
            low: Number(it.lastLowPrice) || 0,
            onFlea,
            traderPrice: buy ? buy.price : 0,
            traderName: buy ? buy.name : '',
            traderLL: buy ? buy.ll : 0,
            quest: buy ? buy.quest : false,
            plateSlots: slots.length,
            plateIds: [...plateIds],
            capacity: Number(p.capacity) || 0,
            speedPenalty: speedPen,
            rating,
            blunt: Number(p.bluntThroughput) || 0
          };
          rows.push(row);

          if (kind === 'plate') {
            platesById[it.id] = {
              id: it.id,
              name: humanize(it.normalizedName),
              slug: it.normalizedName,
              class: cls,
              dur,
              material: p.material || '',
              avg: Number(it.avg24hPrice) || 0
            };
          }
        });

        // also index all plates for lookup even if filtered
        items.forEach(it => {
          const p = it.properties;
          if (!p || p.propertiesType !== 'ItemPropertiesArmorAttachment') return;
          if (!p.class) return;
          if (!platesById[it.id]) {
            platesById[it.id] = {
              id: it.id,
              name: humanize(it.normalizedName),
              slug: it.normalizedName,
              class: Number(p.class) || 0,
              dur: Number(p.durability) || 0,
              material: p.material || '',
              avg: Number(it.avg24hPrice) || 0
            };
          }
        });

        document.getElementById('filtersCard').style.display = 'block';
        document.getElementById('tableCard').style.display = 'block';
        renderTypeChips();
        renderClassChips();
        renderTable();
        status.className = 'status ok';
        status.textContent = `Броня/риги/шлемы/плиты: ${rows.length} · плит в базе: ${Object.keys(platesById).length}`;
      } catch (e) {
        console.error(e);
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    });

    function renderTypeChips() {
      const el = document.getElementById('typeChips');
      const kinds = ['armor', 'rig', 'helmet', 'plate'];
      el.innerHTML = '';
      kinds.forEach(k => {
        const c = document.createElement('span');
        c.className = 'chip' + (activeTypes.has(k) ? ' active' : '');
        c.textContent = KIND_RU[k] || k;
        c.onclick = () => {
          if (activeTypes.has(k)) activeTypes.delete(k);
          else activeTypes.add(k);
          c.classList.toggle('active');
          renderTable();
          persist();
        };
        el.appendChild(c);
      });
    }

    function renderClassChips() {
      const el = document.getElementById('classChips');
      el.innerHTML = '';
      [1,2,3,4,5,6].forEach(cl => {
        const c = document.createElement('span');
        c.className = 'chip' + (activeClasses.has(cl) ? ' active' : '');
        c.textContent = 'Класс ' + cl;
        c.onclick = () => {
          if (activeClasses.has(cl)) activeClasses.delete(cl);
          else activeClasses.add(cl);
          c.classList.toggle('active');
          renderTable();
          persist();
        };
        el.appendChild(c);
      });
    }

    function getFiltered() {
      const q = (document.getElementById('search').value || '').toLowerCase().trim();
      const hideQuest = document.getElementById('hideQuest').checked;
      const onlyFlea = document.getElementById('onlyFlea').checked;
      let list = rows.filter(r => {
        if (!activeTypes.has(r.kind)) return false;
        if (r.class && !activeClasses.has(r.class)) return false;
        if (!r.class && r.kind !== 'rig') return false;
        if (hideQuest && r.quest) return false;
        if (onlyFlea && !r.onFlea) return false;
        if (q) {
          const hay = (r.name + ' ' + r.slug + ' ' + r.material).toLowerCase();
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

    function platesHtml(r) {
      if (!r.plateIds.length) return '<span class="meta">нет слотов плит</span>';
      const lines = r.plateIds.map(id => {
        const pl = platesById[id];
        if (!pl) return `<div class="plate-line">· ${id.slice(0,8)}…</div>`;
        return `<div class="plate-line">· <b>кл.${pl.class}</b> ${esc(pl.name)}` +
          (pl.material ? ` <span class="meta">(${esc(pl.material)})</span>` : '') +
          (pl.avg ? ` · ${formatNum(pl.avg)} ₽` : '') +
          ` · dur ${pl.dur}</div>`;
      });
      // sort by class desc inside
      return `<div class="meta">Совместимые плиты (${r.plateIds.length}):</div>` + lines.join('');
    }

    function renderTable() {
      const list = getFiltered();
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="meta" style="text-align:center;padding:24px;">Пусто</td></tr>';
        return;
      }
      list.forEach(r => {
        const tr = document.createElement('tr');
        if (expandedId === r.id) tr.classList.add('expanded');
        const zones = r.zones.map(z => `<span class="zone-tag">${esc(z)}</span>`).join('') || '—';
        const flea = r.onFlea ? formatNum(r.avg) : '<span class="bad">нет</span>';
        const trader = r.traderPrice
          ? `${esc(r.traderName)}${r.traderLL ? ' LL'+r.traderLL : ''}<br><strong>${formatNum(r.traderPrice)}</strong>`
          : '—';
        const quest = r.quest ? '<span class="bad">да</span>' : (r.traderPrice ? '<span class="ok">нет</span>' : '—');
        const plates = r.plateSlots ? r.plateSlots + ' слот.' : (r.kind === 'plate' ? '—' : '0');
        tr.innerHTML = `
          <td>
            <div class="name-cell">${r.icon?`<img class="ico" src="${esc(r.icon)}" loading="lazy" alt="">`:''}<div class="txt">
            <div class="name">${esc(r.name)}</div>
            <div class="meta">${esc(r.slug)}${r.armorType ? ' · ' + esc(r.armorType) : ''}${r.material ? ' · ' + esc(r.material) : ''}${r.capacity ? ' · cap ' + r.capacity : ''}</div>
            <div class="plates-panel">${platesHtml(r)}</div>
            </div></div>
          </td>
          <td><strong>${r.class || '—'}</strong></td>
          <td>${r.dur || '—'}</td>
          <td>${KIND_RU[r.kind] || r.kind}</td>
          <td style="max-width:160px;">${zones}</td>
          <td>${flea}</td>
          <td>${trader}</td>
          <td>${quest}</td>
          <td>${plates}</td>
          <td>${r.rating ? formatNum(r.rating) : '—'}</td>
          <td>
            ${r.plateIds.length ? `<button type="button" class="btn-sm" data-id="${r.id}">плиты</button>` : ''}
            <button type="button" class="copy-btn" data-name="${esc(r.slug)}">копир.</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.btn-sm').forEach(btn => {
        btn.addEventListener('click', () => {
          expandedId = expandedId === btn.dataset.id ? null : btn.dataset.id;
          renderTable();
        });
      });
      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.name || '').then(() => {
            const old = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = old; }, 700);
          }).catch(() => {});
        });
      });
    }

    function persist() {
      saveSettings('tarkovArmorSettings', {
        gameMode: document.getElementById('gameMode').value,
        hideQuest: document.getElementById('hideQuest').checked,
        onlyFlea: document.getElementById('onlyFlea').checked,
        types: [...activeTypes],
        classes: [...activeClasses]
      });
    }

    document.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = k === 'name' || k === 'kind' ? 1 : -1; }
        renderTable();
      });
    });
    ['search', 'hideQuest', 'onlyFlea'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderTable);
      document.getElementById(id).addEventListener('change', () => { renderTable(); persist(); });
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

      const s = loadSettings('tarkovArmorSettings', {});
      if (s.gameMode) document.getElementById('gameMode').value = s.gameMode;
      if (s.hideQuest) document.getElementById('hideQuest').checked = true;
      if (s.onlyFlea) document.getElementById('onlyFlea').checked = true;
      if (s.types) activeTypes = new Set(s.types);
      if (s.classes) activeClasses = new Set(s.classes);
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
