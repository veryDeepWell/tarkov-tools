
    /**
     * Кураторские данные: match — подстрока normalizedName (lowercase).
     * tier: S A B C D
     * nvg: good | ok | bad | unknown
     * scroll: smooth | stepped | fixed
     * role: lpvo | sniper | assault | any
     * note: кратко
     */
    const COMMUNITY = [
      { match: 'vortex-razor-hd-gen-ii-1-6x24', tier: 'S', nvg: 'good', scroll: 'smooth', role: 'lpvo', note: 'Часто #1 meta LPVO; тонкая сетка, мало bloom в ПНВ' },
      { match: 'eotech-vudu-1-6x24', tier: 'S', nvg: 'ok', scroll: 'smooth', role: 'lpvo', note: 'Красная сетка, любимчик многих; чуть ярче Razor в ПНВ' },
      { match: 'sig-sauer-tango6t-1-6x24', tier: 'S', nvg: 'ok', scroll: 'smooth', role: 'lpvo', note: '1–6 meta, рядом с Razor/Vudu' },
      { match: 'schmidt-bender-pm-ii-1-8x24', tier: 'S', nvg: 'ok', scroll: 'smooth', role: 'lpvo', note: '1–8, чуть дальше LPVO; сильный sniper/DMR' },
      { match: 'schmidt-bender-pm-ii-3-20x50', tier: 'S', nvg: 'ok', scroll: 'smooth', role: 'sniper', note: 'Дальний meta; часто с дальномером сверху' },
      { match: 'nightforce-atacr-7-35x56', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Экстремальная кратность 7–35; нишевый ультра-лонг' },
      { match: 'march-tactical-3-24x42', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: '3–24; min 3x уже юзабелен на открытых картах' },
      { match: 'hensoldt-ff-4-16x56', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: '4–16 классика дальнего' },
      { match: 'leupold-mark-4-lr-6-5-20x50', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: '6.5–20 long range' },
      { match: 'leupold-mark-5hd', tier: 'A', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Сильный long-range LP/MR' },
      { match: 'burris-fullfield-tac30', tier: 'B', nvg: 'bad', scroll: 'smooth', role: 'lpvo', note: '1–4 ок днём; «red ring of death» в ПНВ' },
      { match: 'valday-ps-320', tier: 'B', nvg: 'good', scroll: 'stepped', role: 'lpvo', note: 'Бюджетный 1/6; сетка без сильного bloom' },
      { match: 'elcan-specterdr', tier: 'A', nvg: 'good', scroll: 'stepped', role: 'assault', note: '1/4 workhorse; мирный в ПНВ; Peacekeeper barter' },
      { match: 'elcan-specter-os4x', tier: 'B', nvg: 'ok', scroll: 'fixed', role: 'assault', note: 'Фикс 4x Specter' },
      { match: 'sig-sauer-bravo4', tier: 'A', nvg: 'ok', scroll: 'fixed', role: 'assault', note: 'Чистый 4x assault' },
      { match: 'trijicon-acog-ta01nsn', tier: 'A', nvg: 'good', scroll: 'fixed', role: 'assault', note: 'ACOG; норм под NVG' },
      { match: 'trijicon-acog-ta11d', tier: 'B', nvg: 'ok', scroll: 'fixed', role: 'assault', note: '3.5x ACOG' },
      { match: 'leupold-mark-4-hamr', tier: 'B', nvg: 'bad', scroll: 'fixed', role: 'assault', note: 'HAMR; толстая подсветка, ПНВ страдает' },
      { match: 'primary-arms-compact-prism', tier: 'B', nvg: 'ok', scroll: 'fixed', role: 'assault', note: 'Prism 2.5x budget' },
      { match: 'swampfox-trihawk', tier: 'B', nvg: 'ok', scroll: 'fixed', role: 'assault', note: 'Budget prism, часто хвалят за цену' },
      { match: 'ncstar-ado-p4', tier: 'C', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Жалобы на FPS / картинку' },
      { match: 'npz-usp-1', tier: 'C', nvg: 'unknown', scroll: 'fixed', role: 'assault', note: 'Жёсткий штраф эрги (−10)' },
      { match: 'kmz-1p59', tier: 'C', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Тяжёлый, эрга боль' },
      { match: 'kmz-1p69', tier: 'C', nvg: 'unknown', scroll: 'smooth', role: 'sniper', note: 'Тяжёлый, эрга боль' },
      { match: 'pso-1', tier: 'C', nvg: 'ok', scroll: 'fixed', role: 'sniper', note: 'Бюджет SVD/AK; узкая картинка' },
      { match: 'pilad', tier: 'D', nvg: 'bad', scroll: 'fixed', role: 'assault', note: 'Слабая оптика' },
      { match: 'monstrum', tier: 'D', nvg: 'unknown', scroll: 'fixed', role: 'assault', note: 'Budget entry' },
      { match: 'pu-3-5x', tier: 'C', nvg: 'ok', scroll: 'fixed', role: 'sniper', note: 'Мосин-старт' },
      { match: 'flir-rs-32', tier: 'A', nvg: 'good', scroll: 'fixed', role: 'sniper', note: 'Термал — другая мета' },
      { match: 'thermal', tier: 'A', nvg: 'good', scroll: 'fixed', role: 'sniper', note: 'Термал' },
      { match: 'vulcan-mg', tier: 'B', nvg: 'good', scroll: 'fixed', role: 'sniper', note: 'ПНВ-прицел' }
    ];

    const TIER_SCORE = { S: 100, A: 80, B: 60, C: 40, D: 20, '?': 0 };

    let rows = [];
    let role = 'sniper';
    let sortKey = 'tierScore';
    let sortDir = -1;

    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    function findCommunity(slug) {
      const s = (slug || '').toLowerCase();
      let best = null;
      for (const c of COMMUNITY) {
        if (s.includes(c.match)) {
          if (!best || c.match.length > best.match.length) best = c;
        }
      }
      return best;
    }

    function parseZoom(p) {
      // zoomLevels: [[1,6]] or [[4]] or nested
      const zl = p.zoomLevels;
      let vals = [];
      function walk(x) {
        if (Array.isArray(x)) x.forEach(walk);
        else if (typeof x === 'number') vals.push(x);
      }
      walk(zl);
      vals = vals.filter(v => v > 0);
      if (!vals.length) return { min: null, max: null, label: '—' };
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const label = min === max ? (min + 'x') : (min + '–' + max + 'x');
      return { min, max, label };
    }

    document.getElementById('loadBtn').onclick = async () => {
      const btn = document.getElementById('loadBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status';
      status.textContent = 'Гружу…';
      try {
        const mode = document.getElementById('gameMode').value || 'regular';
        const res = await fetch(`https://json.tarkov.dev/${mode}/items`, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        let items = json?.data?.items;
        if (!items) throw new Error('Нет items');
        if (!Array.isArray(items)) items = Object.values(items);

        rows = [];
        items.forEach(it => {
          const p = it.properties || {};
          if (p.propertiesType !== 'ItemPropertiesScope') return;
          const zoom = parseZoom(p);
          // skip pure 1x red dots if max < 1.5? keep for "all"
          const range = Number(p.sightingRange) || 0;
          const ergo = Number(p.ergonomics) || 0;
          const avg = Number(it.avg24hPrice) || 0;
          const slug = it.normalizedName || '';
          const com = findCommunity(slug);
          const tier = com ? com.tier : '?';
          rows.push({
            id: it.id,
            slug,
            name: humanize(slug),
            icon: it.iconLink || it.gridImageLink || '',
            zoomMin: zoom.min,
            zoomMax: zoom.max,
            zoomLabel: zoom.label,
            range,
            ergo,
            avg,
            tier,
            tierScore: TIER_SCORE[tier] != null ? TIER_SCORE[tier] : 0,
            nvg: com ? com.nvg : 'unknown',
            scroll: com ? com.scroll : (zoom.min !== zoom.max ? 'smooth?' : 'fixed?'),
            role: com ? com.role : guessRole(zoom, range),
            note: com ? com.note : '',
            hasMeta: !!com
          });
        });

        document.getElementById('filters').style.display = 'block';
        document.getElementById('tableCard').style.display = 'block';
        status.className = 'status ok';
        status.textContent = 'Оптических: ' + rows.length + ' · с community-меткой: ' + rows.filter(r => r.hasMeta).length;
        render();
      } catch (e) {
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    };

    function guessRole(zoom, range) {
      if (zoom.max != null && zoom.min != null && zoom.min <= 1.5 && zoom.max >= 4) return 'lpvo';
      if (zoom.max != null && zoom.max >= 8) return 'sniper';
      if (range >= 800 && zoom.max >= 3) return 'sniper';
      return 'assault';
    }

    function render() {
      const q = (document.getElementById('search').value || '').toLowerCase().trim();
      const onlyMeta = document.getElementById('onlyMeta').checked;
      const nvgOk = document.getElementById('nvgOk').checked;

      let list = rows.filter(r => {
        if (onlyMeta && !r.hasMeta) return false;
        if (nvgOk && r.nvg !== 'good' && r.nvg !== 'ok') return false;
        if (role === 'sniper') {
          // sniper + dmr: max zoom >= 3 or range high, exclude pure 1x
          if (r.zoomMax != null && r.zoomMax < 2.5) return false;
          if (r.role === 'assault' && (r.zoomMax || 0) < 4) return false;
        } else if (role === 'lpvo') {
          if (!(r.zoomMin != null && r.zoomMin <= 1.5 && r.zoomMax >= 3)) return false;
        } else if (role === 'assault') {
          if (r.zoomMax != null && r.zoomMax > 8) return false;
          if (r.zoomMax != null && r.zoomMax < 1.5) return false;
        }
        if (q && !(r.slug.includes(q) || r.name.toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q))) return false;
        return true;
      });

      list.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (typeof va === 'string') return sortDir * va.localeCompare(vb, 'ru');
        return sortDir * ((va ?? -999) - (vb ?? -999));
      });

      document.getElementById('title').textContent = list.length + ' прицелов';
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      list.forEach(r => {
        const nvgTag = r.nvg === 'good' ? '<span class="tag ok">ПНВ+</span>'
          : r.nvg === 'ok' ? '<span class="tag warn">ПНВ~</span>'
          : r.nvg === 'bad' ? '<span class="tag bad">ПНВ−</span>'
          : '<span class="tag">ПНВ?</span>';
        const scrollTag = String(r.scroll).startsWith('smooth')
          ? '<span class="tag ok">плавный</span>'
          : String(r.scroll).startsWith('step')
            ? '<span class="tag warn">ступени</span>'
            : '<span class="tag">фикс</span>';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="tier tier-${esc(r.tier)}">${esc(r.tier)}</span></td>
          <td>
            <div class="name-cell">
              ${r.icon ? `<img class="ico" src="${esc(r.icon)}" loading="lazy" alt="">` : ''}
              <div>
                <div class="name">${esc(r.name)}</div>
                <div class="meta">${esc(r.slug)}</div>
              </div>
            </div>
          </td>
          <td><strong>${esc(r.zoomLabel)}</strong></td>
          <td>${r.range || '—'}</td>
          <td>${r.ergo}</td>
          <td>${r.avg ? formatNum(r.avg) : '—'}</td>
          <td>${scrollTag}</td>
          <td>${nvgTag}</td>
          <td class="meta">${esc(r.note) || '—'}</td>
          <td><button type="button" class="copy-btn" data-name="${esc(r.slug)}">копир.</button></td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.onclick = () => navigator.clipboard.writeText(btn.dataset.name || '').then(() => {
          const o = btn.textContent; btn.textContent = '✓'; setTimeout(() => btn.textContent = o, 700);
        });
      });
    }

    document.getElementById('roleChips').onclick = e => {
      const c = e.target.closest('.chip'); if (!c) return;
      role = c.dataset.v;
      document.querySelectorAll('#roleChips .chip').forEach(x => x.classList.toggle('active', x.dataset.v === role));
      render();
    };
    document.querySelectorAll('th[data-k]').forEach(th => {
      th.onclick = () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = k === 'name' ? 1 : -1; }
        render();
      };
    });
    ['search', 'onlyMeta', 'nvgOk'].forEach(id => {
      document.getElementById(id).addEventListener('input', render);
      document.getElementById(id).addEventListener('change', render);
    });
  


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
