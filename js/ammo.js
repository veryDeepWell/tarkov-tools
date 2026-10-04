
    let byCaliber = {};
    let activeCal = null;
    let sortKey = 'pen';
    let sortDir = -1;
    let statusState = { key: 'tool.ammo.ui.loadPrompt', params: null, tone: '' };

    function t(key, params) { return TarkovI18n.t(key, params); }
    function caliberLabel(key) { return TarkovDicts.caliberLabel(key); }
    function renderStatus() {
      const status = document.getElementById('status');
      status.className = 'status' + (statusState.tone ? ' ' + statusState.tone : '');
      status.textContent = t(statusState.key, statusState.params);
    }
    function setStatus(key, params, tone) {
      statusState = { key, params, tone: tone || '' };
      renderStatus();
    }

    function loadSettings(key, defaults) { return TarkovUI.loadSettings(key, defaults); }
    function saveSettings(key, obj) { TarkovUI.saveSettings(key, obj); }

    function humanize(slug) { return TarkovDicts.humanize(slug); }
    function formatNum(n) { return TarkovDicts.fmtNum(n); }
    function shortAmmoName(slug) {
      // 556x45mm-m855 -> M855
      if (!slug) return '?';
      const s = slug.replace(/^\d+x\d+(mm)?-?/i, '').replace(/-gzh$/i, '');
      return s.toUpperCase().replace(/-/g, ' ') || humanize(slug);
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      btn.disabled = true;
      setStatus('tool.ammo.ui.loadingItems');
      const mode = document.getElementById('gameMode').value || 'regular';
      try {
        setStatus('tool.ammo.ui.loadingCrafts');
        const [items, craftsList] = await Promise.all([
          TarkovAPI.items(mode),
          TarkovAPI.crafts(mode)
        ]);

        // crafts by product item id
        const craftByProduct = {};
        craftsList.forEach(c => {
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
            traderName = TarkovDicts.traderName(best.trader) || t('tool.compare.ui.trader');
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
          const la = caliberLabel(a);
          const lb = caliberLabel(b);
          return la.localeCompare(lb, TarkovI18n.lang());
        });

        const box = document.getElementById('calibers');
        box.innerHTML = '';
        cals.forEach(cal => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cal-btn' + (activeCal === cal ? ' active' : '');
          btn.dataset.cal = cal;
          btn.innerHTML = `${caliberLabel(cal)}<span class="count">${byCaliber[cal].length}</span>`;
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
        setStatus('tool.ammo.ui.loaded', {
          items: Object.values(byCaliber).reduce((s, a) => s + a.length, 0),
          calibers: cals.length
        }, 'ok');

        const saved = loadSettings('tarkovAmmoSettings', {});
        if (saved.activeCal && byCaliber[saved.activeCal]) {
          activeCal = saved.activeCal;
          const btns = [...box.querySelectorAll('.cal-btn')];
          const idx = cals.indexOf(activeCal);
          if (idx >= 0 && btns[idx]) btns[idx].classList.add('active');
          renderTable();
        }
      } catch (e) {
        setStatus('tool.ammo.ui.loadError', { message: e.message }, 'err');
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
        [t('tool.ammo.ui.detail.mass'), r.mass || '—'],
        [t('tool.ammo.ui.detail.diameter'), r.diam || '—'],
        [t('tool.ammo.ui.detail.ballisticCoefficient'), r.bc ? r.bc.toFixed(3) : '—'],
        [t('tool.ammo.ui.detail.speed'), r.speed || '—'],
        [t('tool.ammo.ui.detail.ricochet'), pct(r.rico)],
        [t('tool.ammo.ui.detail.penetration'), pct(r.penChance)],
        [t('tool.ammo.ui.detail.fragmentation'), pct(r.frag)],
        [t('tool.ammo.ui.detail.deviation'), r.penDev || '—'],
        [t('tool.ammo.ui.detail.stamina'), r.stamina ? r.stamina.toFixed(3) : '—'],
        [t('tool.ammo.ui.detail.durability'), r.durBurn ? r.durBurn.toFixed(2) : '—'],
        [t('tool.ammo.ui.detail.heat'), r.heat ? r.heat.toFixed(2) : '—'],
        [t('tool.ammo.ui.detail.misfire'), pct(r.misfire)],
        [t('tool.ammo.ui.detail.failureToFeed'), pct(r.ftf)],
        [t('tool.ammo.ui.detail.accuracy'), r.acc ? ((r.acc * 100).toFixed(0) + '%') : '0%'],
        [t('tool.ammo.ui.detail.recoil'), r.reco ? ((r.reco * 100).toFixed(0) + '%') : '0%'],
        [t('tool.ammo.ui.detail.lightBleed'), r.bleedL || '—'],
        [t('tool.ammo.ui.detail.heavyBleed'), r.bleedH || '—']
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
        caliberLabel(activeCal) + ' · ' + t('tool.ammo.ui.caliberRows', { count: byCaliber[activeCal].length });

      let rows = [...byCaliber[activeCal]];
      rows.sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        if (typeof va === 'string') return sortDir * va.localeCompare(vb);
        return sortDir * ((va || 0) - (vb || 0));
      });

      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      rows.forEach(r => {
        const cls = TarkovWeaponDomain.penChart(r.pen).map(cell => {
          return `<span class="${cell.rating}">${cell.class}</span>`;
        }).join('');
        const tr = document.createElement('tr');
        const traderCell = r.traderPrice
          ? `<div>${esc(r.traderName)}${r.traderLL ? ' LL' + r.traderLL : ''}</div><div><strong>${formatNum(r.traderPrice)}</strong></div>`
          : '<span class="meta">—</span>';
        const questCell = r.traderQuest
          ? '<span class="bad">' + esc(t('tool.ammo.ui.yes')) + '</span>'
          : (r.traderPrice ? '<span class="ok">' + esc(t('tool.ammo.ui.no')) + '</span>' : '—');
        const craftCell = r.hasCraft
          ? (r.craftQuest
              ? `<span class="bad">${esc(t('tool.ammo.ui.yes'))}</span> <span class="meta">${esc(t('tool.ammo.ui.quest'))}</span>`
              : `<span class="ok">${esc(t('tool.ammo.ui.yes'))}</span>${r.craftCount > 1 ? ' <span class="meta">×' + r.craftCount + '</span>' : ''}`)
          : '<span class="meta">' + esc(t('tool.ammo.ui.no')) + '</span>';
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
          <td><button type="button" class="copy-btn" data-name="${esc(r.slug)}">${esc(t('tool.ammo.ui.copy'))}</button></td>
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

    function esc(s) { return TarkovDicts.esc(s); }

    document.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = k === 'name' ? 1 : -1; }
        renderTable();
      });
      window.addEventListener('tt-lang-changed', () => {
        renderStatus();
        document.querySelectorAll('.cal-btn').forEach(btn => {
          const cal = btn.dataset.cal;
          btn.innerHTML = `${esc(caliberLabel(cal))}<span class="count">${byCaliber[cal] ? byCaliber[cal].length : 0}</span>`;
        });
        renderTable();
      });
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

      const s = loadSettings('tarkovAmmoSettings', { gameMode: 'regular' });
      if (s.gameMode) document.getElementById('gameMode').value = s.gameMode;
      document.getElementById('gameMode').addEventListener('change', () => {
        saveSettings('tarkovAmmoSettings', {
          gameMode: document.getElementById('gameMode').value,
          activeCal
        });
      });
    })();
  
