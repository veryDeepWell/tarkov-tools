

    function loadSettings(key, defaults) { return TarkovUI.loadSettings(key, defaults); }
    function saveSettings(key, obj) { TarkovUI.saveSettings(key, obj); }

    function t(key, params) {
      return window.TarkovI18n && TarkovI18n.t
        ? TarkovI18n.t('tool.shortname.ui.' + key, params)
        : key;
    }
    let statusState = null;
    function setStatus(key, params, tone) {
      statusState = { key, params, tone: tone || '' };
      renderStatus();
    }
    function renderStatus() {
      if (!statusState) return;
      statusEl.className = 'status' + (statusState.tone ? ' ' + statusState.tone : '');
      statusEl.textContent = t(statusState.key, statusState.params);
    }
    function traderName(key) {
      if (window.TarkovDicts && TarkovDicts.traderName) return TarkovDicts.traderName(key);
      const label = t('trader.' + key);
      return label === 'trader.' + key ? key : label;
    }
    const TRADER_ID = {
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

    // preferred trader by item types (priority order)
    const TYPE_TRADER = [
      [['meds', 'drug', 'stimulator', 'medical'], 'therapist'],
      [['food', 'drink'], 'jaeger'],
      [['ammo', 'ammunition'], 'prapor'],
      [['armor', 'chest', 'helmet', 'rig', 'backpack', 'clothing'], 'ragman'],
      [['gun', 'weapon', 'mods', 'barrel', 'stock', 'receiver', 'magazine', 'mount', 'sight', 'pistol', 'smg', 'assault'], 'mechanic'],
      [['barter', 'electronics', 'building', 'energy', 'info', 'keys', 'tool', 'special'], 'therapist']
    ];

    let catalog = []; // normalized items
    let overrides = {}; // id -> shortName
    let priceCache = {}; // id -> last request result

    const statusEl = document.getElementById('status');
    const listEl = document.getElementById('list');
    const editModeEl = document.getElementById('editMode');

    function loadOverrides() {
      overrides = TarkovStorage.getJson('tarkovShortNames', {}) || {};
    }
    function saveOverrides() {
      TarkovStorage.setJson('tarkovShortNames', overrides);
    }

    function formatNum(n) { return TarkovDicts.fmtNum(n); }

    function humanize(slug) { return TarkovDicts.humanize(slug); }

    function isPlaceholderShort(sn) {
      if (!sn) return true;
      const s = String(sn);
      return s.endsWith('ShortName') || /^[0-9a-f]{24}/i.test(s);
    }

    function getShort(item) {
      if (overrides[item.id]) return overrides[item.id];
      if (item.apiShort && !isPlaceholderShort(item.apiShort)) return item.apiShort;
      return '';
    }

    function preferredTraderKey(types) {
      const tset = new Set((types || []).map(x => String(x).toLowerCase()));
      for (const [keys, trader] of TYPE_TRADER) {
        if (keys.some(k => [...tset].some(t => t.includes(k)))) return trader;
      }
      return null;
    }

    function bestSell(item) {
      const offers = item.sellToTrader || [];
      if (!offers.length) return null;
      const prefer = preferredTraderKey(item.types);
      const enriched = offers.map(o => {
        const key = TRADER_ID[o.trader] || o.trader;
        return {
          key,
          name: traderName(key),
          price: o.priceRUB != null ? Number(o.priceRUB) : Number(o.price) || 0
        };
      }).filter(o => o.price > 0 && o.key !== 'fence');

      if (!enriched.length) return null;

      if (prefer) {
        const hit = enriched.find(o => o.key === prefer);
        if (hit) return { ...hit, preferred: true };
      }
      // otherwise max price
      enriched.sort((a, b) => b.price - a.price);
      return { ...enriched[0], preferred: false };
    }

    function normalizeItem(raw) {
      return {
        id: raw.id,
        normalizedName: raw.normalizedName || '',
        apiShort: raw.shortName || '',
        icon: raw.iconLink || raw.gridImageLink || '',
        types: raw.types || [],
        avg24h: raw.avg24hPrice || 0,
        lastLow: raw.lastLowPrice || 0,
        basePrice: raw.basePrice || 0,
        sellToTrader: raw.sellToTrader || [],
        lastOfferCount: raw.lastOfferCount || 0
      };
    }

    async function loadCatalog() {
      const mode = document.getElementById('gameMode').value || 'regular';
      setStatus('loading');
      const items = await TarkovAPI.items(mode);
      if (!items.length) throw new Error(t('noItems'));
      catalog = items.map(normalizeItem);
      // try pull short names from overrides count
      const withShort = catalog.filter(i => getShort(i)).length;
      setStatus('loaded', {
        total: catalog.length,
        edited: Object.keys(overrides).length,
        named: withShort
      }, 'ok');
      render();
    }

    function filterItems() {
      const qs = (document.getElementById('qShort').value || '').trim().toLowerCase();
      const ql = (document.getElementById('qLong').value || '').trim().toLowerCase();
      const limit = Math.min(500, Math.max(20, Number(document.getElementById('limit').value) || 80));

      let rows = catalog;
      if (qs || ql) {
        rows = catalog.filter(item => {
          const short = getShort(item).toLowerCase();
          const long = (item.normalizedName || '').toLowerCase();
          const display = humanize(item.normalizedName).toLowerCase();
          let ok = true;
          if (qs) {
            ok = short.includes(qs) || short === qs;
            // if no short yet, don't match long on short field
          }
          if (ok && ql) {
            ok = long.includes(ql) || display.includes(ql);
          }
          return ok;
        });
        // sort: exact short match first, then startsWith, then includes
        if (qs) {
          rows.sort((a, b) => {
            const sa = getShort(a).toLowerCase();
            const sb = getShort(b).toLowerCase();
            const score = (s) => s === qs ? 0 : s.startsWith(qs) ? 1 : 2;
            const d = score(sa) - score(sb);
            if (d !== 0) return d;
            return sa.localeCompare(sb) || (a.normalizedName || '').localeCompare(b.normalizedName || '');
          });
        }
      } else {
        // no query: prefer items that already have short names
        rows = [...catalog].sort((a, b) => {
          const sa = getShort(a);
          const sb = getShort(b);
          if (sa && !sb) return -1;
          if (!sa && sb) return 1;
          return (a.normalizedName || '').localeCompare(b.normalizedName || '');
        });
      }
      return { rows: rows.slice(0, limit), total: rows.length };
    }

    function render() {
      const edit = editModeEl.checked;
      const { rows, total } = filterItems();
      document.getElementById('countMeta').textContent = catalog.length
        ? t('count', { visible: rows.length, total })
        : '';

      if (!catalog.length) {
        listEl.innerHTML = '<div class="item"><div class="meta">' + escapeHtml(t('initialEmpty')) + '</div></div>';
        return;
      }
      if (!rows.length) {
        listEl.innerHTML = '<div class="item"><div class="meta">' + escapeHtml(t('empty')) + '</div></div>';
        return;
      }

      const frag = document.createDocumentFragment();
      rows.forEach(item => {
        const short = getShort(item);
        const cached = priceCache[item.id];
        const div = document.createElement('div');
        div.className = 'item';

        let leftHtml;
        if (edit) {
          leftHtml = `<input class="edit-short" data-id="${item.id}" value="${escapeAttr(short)}" placeholder="short">`;
        } else {
          leftHtml = short
            ? `<div class="short">${escapeHtml(short)}</div>`
            : `<div class="short empty">—</div>`;
        }

        let priceHtml = '';
        if (cached) {
          priceHtml = `
            <div><strong>${escapeHtml(cached.traderKey ? traderName(cached.traderKey) : '—')}</strong>: <strong>${formatNum(cached.traderPrice)}</strong></div>
            <div>${escapeHtml(t('average'))} <strong>${formatNum(cached.avg)}</strong> · ${escapeHtml(t('tax'))} <strong>${formatNum(cached.tax)}</strong></div>
            <div>${escapeHtml(t('net'))} <strong>${formatNum(cached.netFlea)}</strong>${cached.diff != null ? ` · <span class="${cached.diff >= 0 ? 'pos' : ''}">Δ ${formatNum(cached.diff)}</span>` : ''}</div>
          `;
        } else {
          priceHtml = '<div class="meta">' + escapeHtml(t('noRequest')) + '</div>';
        }

        const iconHtml = item.icon
          ? `<img class="ico" src="${escapeAttr(item.icon)}" loading="lazy" alt="">`
          : '';
        div.innerHTML = `
          <div>${leftHtml}</div>
          <div class="name-cell">
            ${iconHtml}
            <div class="txt">
              <div class="long">${escapeHtml(humanize(item.normalizedName))}</div>
              <div class="meta">${escapeHtml(item.normalizedName)} · ${(item.types || []).slice(0, 4).join(', ')}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <button type="button" class="btn-req" data-id="${item.id}">${escapeHtml(t('request'))}</button>
            <div class="price-box" data-price="${item.id}">${priceHtml}</div>
          </div>
        `;
        frag.appendChild(div);
      });
      listEl.innerHTML = '';
      listEl.appendChild(frag);

      listEl.querySelectorAll('.btn-req').forEach(btn => {
        btn.addEventListener('click', () => doRequest(btn.dataset.id, btn));
      });
      listEl.querySelectorAll('.edit-short').forEach(inp => {
        inp.addEventListener('change', () => {
          const id = inp.dataset.id;
          const val = inp.value.trim();
          if (val) overrides[id] = val;
          else delete overrides[id];
          saveOverrides();
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') inp.blur();
        });
      });
    }

    function doRequest(id, btn) {
      const item = catalog.find(i => i.id === id);
      if (!item) return;
      btn.disabled = true;
      // data already in catalog — "request" is local resolve (same fields API would give)
      const sell = bestSell(item);
      const avg = item.avg24h || 0;
      const low = item.lastLow || 0;
      const traderPrice = sell ? sell.price : 0;
      const traderName = sell
        ? (sell.name + (sell.preferred ? ' ★' : ''))
        : '—';
      const bp = Number(item.basePrice) || 0;
      // basePrice may be missing on normalized item — pull from raw if stored
      const taxOpts = {
        intelCenter3: document.getElementById('intel3')?.value === '1',
        hmLvl: Number(document.getElementById('hmLvl')?.value) || 0
      };
      const profit = TarkovItemDomain.evaluateProfit(
        bp || item._basePrice || 0,
        avg,
        1,
        traderPrice,
        taxOpts
      );
      const tax = profit.tax;
      const netFlea = profit.revenue;
      const diff = traderPrice && avg ? profit.profit : null;

      priceCache[id] = {
        traderKey: sell ? sell.key : '',
        traderPrice,
        avg,
        low,
        tax,
        netFlea,
        diff,
        offers: item.lastOfferCount
      };
      btn.disabled = false;
      render();
    }

    function escapeHtml(s) { return TarkovDicts.esc(s); }
    function escapeAttr(s) {
      return escapeHtml(s).replace(/'/g, '&#39;');
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      btn.disabled = true;
      try {
        await loadCatalog();
      } catch (e) {
        setStatus('loadError', { message: e.message }, 'err');
      } finally {
        btn.disabled = false;
      }
    });

    ['qShort', 'qLong', 'limit'].forEach(id => {
      document.getElementById(id).addEventListener('input', render);
    });
    editModeEl.addEventListener('change', render);

    document.getElementById('exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tarkov-shortnames.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (typeof data !== 'object' || Array.isArray(data) || data === null) throw new Error(t('importFormatError'));
        overrides = { ...overrides, ...data };
        saveOverrides();
        setStatus('imported', {
          imported: Object.keys(data).length,
          total: Object.keys(overrides).length
        }, 'ok');
        render();
      } catch (err) {
        setStatus('importError', { message: err.message }, 'err');
      }
      e.target.value = '';
    });

    document.getElementById('clearOverridesBtn').addEventListener('click', () => {
      if (!confirm(t('confirmClear'))) return;
      overrides = {};
      saveOverrides();
      render();
      setStatus('editsCleared', null, 'ok');
    });

    loadOverrides();
    setStatus('loadPrompt');
    function refreshAfterLocaleReady() {
      if (!window.TarkovI18n || typeof TarkovI18n.ready !== 'function') return;
      TarkovI18n.ready().then(() => {
        render();
        renderStatus();
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refreshAfterLocaleReady, { once: true });
    } else {
      refreshAfterLocaleReady();
    }
    window.addEventListener('tt-lang-changed', () => {
      render();
      renderStatus();
    });
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

      const s = loadSettings('tarkovShortSettings', { gameMode: 'regular', intel3: '0', hmLvl: 0 });
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('gameMode', s.gameMode);
      set('intel3', s.intel3);
      set('hmLvl', s.hmLvl);
      function persist() {
        saveSettings('tarkovShortSettings', {
          gameMode: document.getElementById('gameMode')?.value,
          intel3: document.getElementById('intel3')?.value || '0',
          hmLvl: Number(document.getElementById('hmLvl')?.value) || 0
        });
      }
      ['gameMode','intel3','hmLvl'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', persist);
      });
    })();
  
