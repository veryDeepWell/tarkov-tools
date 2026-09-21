(function () {
  if (typeof formatNum !== "function") {
    window.formatNum = function (n) {
      try {
        if (window.TarkovUI && TarkovUI.formatNum) return TarkovUI.formatNum(n);
      } catch (e) {}
      n = Number(n);
      if (!isFinite(n)) return "\u2014";
      return Math.round(n).toLocaleString("ru-RU");
    };
  }
})();

    const THERAPIST = '54cb57776803fa99248b456e';

    // известные стримерские / коллекционные (slug содержит)
    const STREAMER_KEYS = [
      'deadlyslobs-beard-oil',
      'kotton-beanie',
      'pestily-plague-mask',
      'lvndmarks-rat-poison',
      'smoke-balaclava',
      'viibiin-sneaker',
      'fireklean-gun-lube',
      'bakeezy-cook-book',
      'baddies-red-beard',
      '42-signature-blend-english-tea',
      '42nd-signature',
      'golden-rooster-figurine',
      'devildog-mayo',
      'jar-of-devildog',
      'old-firesteel',
      'can-of-sprats',
      'tigzresq',
      'mazoni-golden-dumbbell',
      'lm-kc-130',
      'fake-white-beard',
      'gingy-keychain',
      'wz-wallet',
      'axe', // careful
      'press-pass',
      'mustache',
      'beard-oil',
      'rat-poison',
      'plague-mask',
      'cook-book',
      'gun-lube',
      'english-tea',
      'streamer',
      'twitch',
      // more creator refs often in name
      'pestily',
      'lvndmark',
      'deadlyslob',
      'kotton',
      'viibiin',
      'bakeezy',
      'fireklean',
      'baddie',
      'smeggy',
      'glorious',
      'ghostfreak',
      'willithidden',
      'desmondpilak',
      'hideout-cat-figurine',
      'walking-tank-figurine',
      'prapor-figurine',
      'therapist-figurine',
      'fence-figurine',
      'sk dil-figurine',
      'peacekeeper-figurine',
      'mechanic-figurine',
      'ragman-figurine',
      'jaeger-figurine',
      'lightkeeper-figurine',
      'ref-figurine',
      'btr-figurine',
      'bloodsucker-figurine',
      'petya-crooker',
      'nailhead-figurine',
      'elvisvista',
      'mastichin',
      'tarcoin'
    ];

    // точные slug'и — приоритет (меньше ложных срабатываний)
    const STREAMER_EXACT = new Set([
      'deadlyslobs-beard-oil',
      'kotton-beanie',
      'pestily-plague-mask',
      'lvndmarks-rat-poison',
      'smoke-balaclava',
      'viibiin-sneaker',
      'fireklean-gun-lube',
      'bakeezy-cook-book',
      'baddies-red-beard',
      '42-signature-blend-english-tea',
      'golden-rooster-figurine',
      'devildog-mayo',
      'jar-of-devildog-mayo',
      'old-firesteel',
      'can-of-sprats',
      'fake-white-beard',
      'gingy-keychain',
      'mazoni-golden-dumbbell',
      'desmondpilak-cd',
      'lm-kc-130-model-aircraft',
      'tigzresq-splint'
    ]);

    let rows = [];
    let sortKey = 'profit';
    let sortDir = -1;

            function humanize(slug) {
      if (!slug) return '?';
      return String(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
        function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function isStreamerItem(slug) {
      if (!slug) return false;
      const s = slug.toLowerCase();
      if (STREAMER_EXACT.has(s)) return true;
      // фигурки торговцев / коллекционка
      if (s.endsWith('-figurine') || s.includes('figurine')) return true;
      const keys = [
        'deadlyslob', 'pestily', 'lvndmark', 'kotton', 'viibiin', 'bakeezy',
        'fireklean', 'baddie', 'beard-oil', 'rat-poison', 'plague-mask',
        'smoke-balaclava', 'english-tea', '42-signature', 'devildog',
        'old-firesteel', 'can-of-sprats', 'gingy-keychain', 'mazoni-golden',
        'desmondpilak', 'lm-kc-130', 'tigzresq', 'tarcoin', 'fake-white-beard'
      ];
      return keys.some(k => s.includes(k));
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status';
      const mode = document.getElementById('gameMode').value || 'regular';
      status.textContent = 'Тяну items…';
      try {
        const res = await fetch(`https://json.tarkov.dev/${mode}/items`, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        let items = json?.data?.items;
        if (!items) throw new Error('Нет items');
        if (!Array.isArray(items)) items = Object.values(items);

        const priceMode = document.getElementById('buyPrice').value;
        rows = [];
        items.forEach(it => {
          const slug = it.normalizedName || '';
          if (!isStreamerItem(slug)) return;

          const sell = it.sellToTrader || [];
          const th = sell.find(s => s.trader === THERAPIST);
          const therapist = th ? Number(th.priceRUB != null ? th.priceRUB : th.price) || 0 : 0;

          const avg = Number(it.avg24hPrice) || 0;
          const low = Number(it.lastLowPrice) || 0;
          const buy = priceMode === 'avg24h' ? (avg || low) : (low || avg);
          const profit = therapist && buy ? therapist - buy : null;
          const roi = profit != null && buy > 0 ? (profit / buy) * 100 : null;

          rows.push({
            id: it.id,
            slug,
            name: humanize(slug),
            icon: it.iconLink || it.gridImageLink || '',
            buy,
            avg,
            low,
            therapist,
            profit: profit != null ? profit : -Infinity,
            roi: roi != null ? roi : -Infinity,
            offers: it.lastOfferCount || 0,
            hasTherapist: therapist > 0
          });
        });

        document.getElementById('tableCard').style.display = 'block';
        render();
        status.className = 'status ok';
        status.textContent = `Найдено стримерских/коллекционных: ${rows.length} · с ценой Терапевта: ${rows.filter(r => r.hasTherapist).length}`;
      } catch (e) {
        console.error(e);
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    });

    function getFiltered() {
      const q = (document.getElementById('search').value || '').toLowerCase().trim();
      const only = document.getElementById('onlyProfit').checked;
      let list = rows.filter(r => {
        if (only && !(r.profit > 0)) return false;
        if (q) {
          const hay = (r.name + ' ' + r.slug).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      list.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (typeof va === 'string') return sortDir * va.localeCompare(vb, 'ru');
        return sortDir * ((va ?? -Infinity) - (vb ?? -Infinity));
      });
      return list;
    }

    function render() {
      const list = getFiltered();
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="meta" style="text-align:center;padding:24px;">Пусто</td></tr>';
        return;
      }
      list.forEach(r => {
        const tr = document.createElement('tr');
        if (r.profit > 0) tr.classList.add('good');
        const profitCell = r.hasTherapist
          ? `<span class="${r.profit > 0 ? 'pos' : 'neg'}">${r.profit > 0 ? '+' : ''}${formatNum(r.profit)}</span>`
          : '—';
        const roiCell = r.hasTherapist && r.roi > -Infinity
          ? `<span class="${r.roi > 0 ? 'pos' : 'neg'}">${r.roi.toFixed(1)}%</span>`
          : '—';
        tr.innerHTML = `
          <td>
            <div class="name-cell">${r.icon?`<img class="ico" src="${esc(r.icon)}" loading="lazy" alt="">`:''}<div class="txt">
            <div class="name">${esc(r.name)}</div>
            <div class="meta">${esc(r.slug)}</div>
            </div></div>
          </td>
          <td>
            <strong>${r.buy ? formatNum(r.buy) : '—'}</strong>
            <div class="meta">avg ${formatNum(r.avg)} · min ${formatNum(r.low)}</div>
          </td>
          <td>${r.hasTherapist ? formatNum(r.therapist) : '<span class="meta">не берёт</span>'}</td>
          <td>${profitCell}</td>
          <td>${roiCell}</td>
          <td>${r.offers || '—'}</td>
          <td><button type="button" class="copy-btn" data-name="${esc(r.slug)}">копир.</button></td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.name).then(() => {
            const old = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = old; }, 800);
          });
        });
      });
    }

    document.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = k === 'name' ? 1 : -1; }
        render();
      });
    });
    document.getElementById('search').addEventListener('input', render);
    document.getElementById('onlyProfit').addEventListener('change', () => { render(); persist(); });
    document.getElementById('buyPrice').addEventListener('change', () => {
      // re-run last logic on rows if already loaded
      if (!rows.length) return;
      const priceMode = document.getElementById('buyPrice').value;
      rows.forEach(r => {
        r.buy = priceMode === 'avg24h' ? (r.avg || r.low) : (r.low || r.avg);
        r.profit = r.hasTherapist && r.buy ? r.therapist - r.buy : -Infinity;
        r.roi = r.profit > -Infinity && r.buy > 0 ? (r.profit / r.buy) * 100 : -Infinity;
      });
      render();
      persist();
    });

    function persist() {
      saveSettings('tarkovStreamerFlip', {
        gameMode: document.getElementById('gameMode').value,
        buyPrice: document.getElementById('buyPrice').value,
        onlyProfit: document.getElementById('onlyProfit').checked
      });
    }
    (function() {
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

      const s = loadSettings('tarkovStreamerFlip', {});
      if (s.gameMode) document.getElementById('gameMode').value = s.gameMode;
      if (s.buyPrice) document.getElementById('buyPrice').value = s.buyPrice;
      if (s.onlyProfit === false) document.getElementById('onlyProfit').checked = false;
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
