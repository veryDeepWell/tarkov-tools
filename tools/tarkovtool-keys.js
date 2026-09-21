
    const MAP_ORDER = [
      'factory', 'ground-zero', 'customs', 'woods', 'shoreline',
      'interchange', 'reserve', 'lighthouse', 'streets', 'labs', 'labyrinth', 'other'
    ];
    const MAP_RU = {
      factory: 'Factory',
      'ground-zero': 'Ground Zero',
      customs: 'Customs',
      woods: 'Woods',
      shoreline: 'Shoreline',
      interchange: 'Interchange',
      reserve: 'Reserve',
      lighthouse: 'Lighthouse',
      streets: 'Streets',
      labs: 'The Lab',
      labyrinth: 'Labyrinth',
      other: 'Прочее'
    };

    // эвристика локации по normalizedName
    const MAP_RULES = [
      ['labs', /labs|terragroup|lab-|\blab\b/],
      ['labyrinth', /labyrinth/],
      ['factory', /factory/],
      ['ground-zero', /ground-zero|groundzero|science-campus|nexus|basement/],
      ['customs', /customs|dorm|gas-station|trailer|checkpoint|military-base|tarcone|portable-cabin|unknown-key|cabinet|portable-bunkhouse/],
      ['woods', /woods|lumber|sawmill|zb-0|zb-01|shturman|cabin|scav-house| emercom|fishing/],
      ['shoreline', /shoreline|resort|cottage|weather|health-resort|sanatorium|pier|hydro|station-key|keycard-with-a-blue/],
      ['interchange', /interchange|idea|oli|goshan|power-station|ultra|kiba|emegency|pharmacy|object-11|object-14|object-21/],
      ['reserve', /reserve|\brb-|\brb |bunker|hermetic|d-2|d2|military-checkpoint|pumping|radar|workshop|barrack|k-buildings/],
      ['lighthouse', /lighthouse|water-treatment|operating|radar-station|conference|building-1|building-2|building-3|rogue/],
      ['streets', /streets|chekannaya|cinema|cardinal|mvd|lexos|concordia|pinewood|tarbank|primorsky|beluga|iron-gate|collapsed|cargo|x-ray|finance|construction/]
    ];

    let byMap = {};
    let activeMap = null;
    let mode = 'price'; // price | rating
    let sortKey = 'avg';
    let sortDir = -1;

    function loadSettings(key, defaults) {
      try {
        const raw = TarkovStorage.get(key, null);
        if (!raw) return Object.assign({}, defaults);
        return Object.assign({}, defaults, JSON.parse(raw));
      } catch (e) { return Object.assign({}, defaults); }
    }
    function saveSettings(key, obj) {
      try { TarkovStorage.set(key, JSON.stringify(obj)); } catch (e) {}
    }

    function humanize(slug) {
      if (!slug) return '?';
      return String(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    function formatNum(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return Math.round(n).toLocaleString('ru-RU');
    }
    function detectMap(slug) {
      const s = (slug || '').toLowerCase();
      for (const [map, re] of MAP_RULES) {
        if (re.test(s)) return map;
      }
      return 'other';
    }
    function stars(rating, maxR) {
      if (!maxR || rating <= 0) return '—';
      const n = Math.max(1, Math.min(5, Math.ceil((rating / maxR) * 5)));
      return '★'.repeat(n) + '☆'.repeat(5 - n);
    }

    // рейтинг фарма: дорогой многоразовый без квеста выше; квестовый сильно режется
    function farmScore(avg, uses, isQuest) {
      const u = Math.max(1, uses || 1);
      const base = (avg || 0) * Math.sqrt(u);
      return base * (isQuest ? 0.25 : 1);
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status';
      const modeGame = document.getElementById('gameMode').value || 'regular';
      status.textContent = 'Гружу items + tasks…';

      try {
        const [items, tasks] = await Promise.all([
          TarkovAPI.items(modeGame),
          TarkovAPI.tasks(modeGame)
        ]);
        if (!items.length) throw new Error('Нет items');

        // quest keys from neededKeys + giveItem/findItem on key ids later
        const questKeyIds = new Set();
        {
          (tasks || []).forEach(t => {
            (t.neededKeys || []).forEach(block => {
              (block.keys || []).forEach(id => questKeyIds.add(id));
            });
            (t.objectives || []).forEach(o => {
              if (['giveItem', 'findItem'].includes(o.type)) {
                if (typeof o.item === 'string') questKeyIds.add(o.item);
                (o.items || []).forEach(x => {
                  if (typeof x === 'string') questKeyIds.add(x);
                  else if (x && x.id) questKeyIds.add(x.id);
                });
              }
            });
          });
        }

        byMap = {};
        MAP_ORDER.forEach(m => { byMap[m] = []; });

        items.forEach(it => {
          if (!(it.types || []).includes('keys')) return;
          const p = it.properties || {};
          const uses = Number(p.uses) || 1;
          const avg = Number(it.avg24hPrice) || 0;
          const low = Number(it.lastLowPrice) || 0;
          const isQuest = questKeyIds.has(it.id);
          // also name heuristic: "marked" often loot; "quest" in name rare
          const slug = it.normalizedName || '';
          const map = detectMap(slug);
          const score = farmScore(avg, uses, isQuest);
          const row = {
            id: it.id,
            slug,
            name: humanize(slug),
            icon: it.iconLink || it.gridImageLink || '',
            uses,
            avg,
            low,
            perUse: uses > 0 ? avg / uses : avg,
            rating: score,
            quest: isQuest,
            map
          };
          if (!byMap[map]) byMap[map] = [];
          byMap[map].push(row);
        });

        const box = document.getElementById('maps');
        box.innerHTML = '';
        MAP_ORDER.forEach(m => {
          const list = byMap[m] || [];
          if (!list.length && m !== 'other') return;
          if (!list.length) return;
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'map-btn' + (activeMap === m ? ' active' : '');
          b.innerHTML = `${MAP_RU[m] || m}<span class="count">${list.length}</span>`;
          b.onclick = () => {
            activeMap = m;
            box.querySelectorAll('.map-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            render();
            persist();
          };
          box.appendChild(b);
        });

        document.getElementById('mapsCard').style.display = 'block';
        document.getElementById('tableCard').style.display = 'block';
        status.className = 'status ok';
        const total = Object.values(byMap).reduce((s, a) => s + a.length, 0);
        status.textContent = `Ключей: ${total} · квестовых (API): ${questKeyIds.size}`;

        const saved = loadSettings('tarkovKeysSettings', {});
        if (saved.activeMap && byMap[saved.activeMap]?.length) {
          activeMap = saved.activeMap;
          mode = saved.mode || 'price';
          document.querySelectorAll('.mode-toggle button').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === mode);
          });
          [...box.querySelectorAll('.map-btn')].forEach(b => {
            if (b.textContent.includes(MAP_RU[activeMap] || '')) b.classList.add('active');
          });
        } else if (!activeMap) {
          activeMap = MAP_ORDER.find(m => byMap[m]?.length) || 'customs';
        }
        render();
      } catch (e) {
        console.error(e);
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    });

    function render() {
      if (!activeMap || !byMap[activeMap]) return;
      let rows = [...byMap[activeMap]];
      const q = (document.getElementById('search').value || '').toLowerCase().trim();
      const hideQuest = document.getElementById('hideQuest').checked;
      if (hideQuest) rows = rows.filter(r => !r.quest);
      if (q) {
        rows = rows.filter(r =>
          r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
        );
      }

      // default sort by mode
      const primary = mode === 'rating' ? 'rating' : 'avg';
      if (!['name', 'uses', 'avg', 'perUse', 'rating', 'quest'].includes(sortKey)) {
        sortKey = primary;
      }
      // when switching mode, prefer that key
      const sk = sortKey;
      rows.sort((a, b) => {
        let va = a[sk], vb = b[sk];
        if (sk === 'quest') { va = a.quest ? 1 : 0; vb = b.quest ? 1 : 0; }
        if (typeof va === 'string') return sortDir * va.localeCompare(vb, 'ru');
        return sortDir * ((va || 0) - (vb || 0));
      });

      const maxR = Math.max(...rows.map(r => r.rating), 1);
      document.getElementById('tableTitle').textContent =
        (MAP_RU[activeMap] || activeMap) + ' · ' + rows.length + ' ключей · режим: ' +
        (mode === 'rating' ? 'рейтинг' : 'стоимость');

      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="name-cell">${r.icon?`<img class="ico" src="${esc(r.icon)}" loading="lazy" alt="">`:''}<div class="txt">
            <div class="name">${esc(r.name)}</div>
            <div class="meta">${esc(r.slug)}</div>
            </div></div>
          </td>
          <td>${r.uses}</td>
          <td><strong>${r.avg ? formatNum(r.avg) : '—'}</strong></td>
          <td>${r.avg ? formatNum(r.perUse) : '—'}</td>
          <td>
            <div class="stars">${stars(r.rating, maxR)}</div>
            <div class="meta">${formatNum(r.rating)}</div>
          </td>
          <td>${r.quest ? '<span class="quest">квест</span>' : '<span class="loot">лут</span>'}</td>
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
    }

    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function persist() {
      saveSettings('tarkovKeysSettings', {
        gameMode: document.getElementById('gameMode').value,
        activeMap,
        mode,
        hideQuest: document.getElementById('hideQuest').checked
      });
    }

    document.querySelectorAll('.mode-toggle button').forEach(b => {
      b.addEventListener('click', () => {
        mode = b.dataset.mode;
        document.querySelectorAll('.mode-toggle button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        sortKey = mode === 'rating' ? 'rating' : 'avg';
        sortDir = -1;
        render();
        persist();
      });
    });

    document.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else {
          sortKey = k;
          sortDir = k === 'name' ? 1 : -1;
        }
        render();
      });
    });

    document.getElementById('search').addEventListener('input', render);
    document.getElementById('hideQuest').addEventListener('change', () => { render(); persist(); });

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

      const s = loadSettings('tarkovKeysSettings', { gameMode: 'regular', mode: 'price' });
      document.getElementById('gameMode').value = s.gameMode || 'regular';
      mode = s.mode || 'price';
      document.querySelectorAll('.mode-toggle button').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
      if (s.hideQuest) document.getElementById('hideQuest').checked = true;
    })();
  


(function(){
  const KEY = 'tarkovPreferredGameMode';
  const def = TarkovStorage.get(KEY, 'pve') || 'pve';
  document.querySelectorAll('select#gameMode, select[id*="gameMode"], select[id*="GameMode"]').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => {
      try { TarkovStorage.set(KEY, sel.value); } catch(e) {}
    });
  });
})();
