
    const COLORS = [
      { id: 'all', label: 'Все', hex: '#888' },
      { id: 'black', label: 'Чёрный', hex: '#1a1a1a' },
      { id: 'tan', label: 'Песок / Tan', hex: '#c4a574' },
      { id: 'coyote', label: 'Coyote', hex: '#8b6914' },
      { id: 'multicam', label: 'MultiCam', hex: '#8a8f6a' },
      { id: 'mcblack', label: 'MC Black', hex: '#3d3d3d' },
      { id: 'olive', label: 'Олива / RG', hex: '#556b2f' },
      { id: 'green', label: 'Зелёный', hex: '#2e5a3c' },
      { id: 'emr', label: 'EMR / флора', hex: '#4a6741' },
      { id: 'grey', label: 'Серый', hex: '#6b6b6b' },
      { id: 'white', label: 'Белый / alpine', hex: '#e8e8e8' },
      { id: 'brown', label: 'Коричневый', hex: '#6b4423' },
      { id: 'atacs', label: 'A-TACS / цифр.', hex: '#7a7560' },
      { id: 'other', label: 'Прочее / неясно', hex: '#444' }
    ];

    // ручные цвета для популярного экипа (slug substring → colors)
    const MANUAL = [
      { m: 'trooper-tfo', c: ['multicam'] },
      { m: 'trooper', c: ['multicam'] },
      { m: 'hexgrid', c: ['black'] },
      { m: 'zhuk', c: ['olive', 'emr'] },
      { m: '6b13', c: ['olive', 'emr'] },
      { m: '6b23', c: ['olive', 'emr'] },
      { m: '6b43', c: ['olive', 'emr'] },
      { m: 'slick', c: ['black', 'tan'] },
      { m: 'korund', c: ['black'] },
      { m: 'redut', c: ['olive'] },
      { m: 'gzhel', c: ['black'] },
      { m: 'gen4', c: ['olive', 'black', 'tan'] },
      { m: 'avs', c: ['tan', 'black'] },
      { m: 'plate-frame', c: ['black', 'tan'] },
      { m: 'tac-tec', c: ['black'] },
      { m: 'tactical-tailor-mini-rig', c: ['black'] },
      { m: 'bank-robber', c: ['mcblack', 'white'] },
      { m: 'thunderbolt', c: ['grey', 'olive'] },
      { m: 'commando-chest', c: ['black', 'tan'] },
      { m: 'mbss', c: ['coyote', 'black'] },
      { m: 'tv-110', c: ['olive'] },
      { m: 'tv-109', c: ['atacs'] },
      { m: 'd3crx', c: ['olive'] },
      { m: 'exfil', c: ['black', 'coyote'] },
      { m: 'airframe', c: ['tan'] },
      { m: 'fast-mt', c: ['black', 'tan'] },
      { m: 'ulach', c: ['black', 'tan'] },
      { m: 'achhc', c: ['black', 'olive'] },
      { m: 'caiman', c: ['multicam', 'grey', 'white'] },
      { m: 'rys-t', c: ['black'] },
      { m: 'maska', c: ['olive'] },
      { m: 'killa', c: ['black'] },
      { m: 'razor', c: ['black', 'olive'] },
      { m: 'comtac', c: ['black', 'olive', 'tan'] },
      { m: 'm32', c: ['black', 'tan'] },
      { m: 'x400', c: ['black'] },
      { m: 'blackjack-50', c: ['black', 'tan'] },
      { m: 'pillbox', c: ['olive'] },
      { m: 'beta-2', c: ['olive'] },
      { m: 'tripwire', c: ['black'] },
      { m: 'day-pack', c: ['olive', 'black'] },
      { m: 'drawbridge', c: ['tan'] },
      { m: 'f4-terminator', c: ['black'] },
      { m: 'sanitar', c: ['blue'] }
    ];

    let rows = [];
    let color = 'all';
    let slot = 'all';
    let sortKey = 'score';
    let sortDir = -1;

    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    function detectColors(slug) {
      const s = (slug || '').toLowerCase();
      const set = new Set();

      for (const rule of MANUAL) {
        if (s.includes(rule.m)) rule.c.forEach(c => set.add(c));
      }

      if (/multicam-black|mc-black|multi-cam-black/.test(s)) set.add('mcblack');
      else if (/multicam|multi-cam|\bmc\b/.test(s)) set.add('multicam');

      if (/\bblack\b|chern|чёрн|черн/.test(s) || s.includes('(black)')) set.add('black');
      if (/\btan\b|desert-tan|urban-tan|sandstone|sand\b|khaki|beige|fde|flat-dark/.test(s)) set.add('tan');
      if (/coyote/.test(s)) set.add('coyote');
      if (/olive|ranger-green|od-green|\bod\b|olive-drab/.test(s)) set.add('olive');
      if (/\bgreen\b|zelen/.test(s) && !/ranger-green|olive/.test(s)) set.add('green');
      if (/\bemr\b|flora|digital-flora|pixel/.test(s)) set.add('emr');
      if (/\bgrey\b|\bgray\b|shadow-grey|mas-grey|wolf-grey|hellhound/.test(s)) set.add('grey');
      if (/\bwhite\b|alpine|arctic|snow/.test(s)) set.add('white');
      if (/\bbrown\b|chocolate/.test(s)) set.add('brown');
      if (/a-tacs|atacs|ucp|cadpat|marpat|digital(?!-flora)/.test(s)) set.add('atacs');

      if (!set.size) set.add('other');
      return [...set];
    }

    function classify(it) {
      const p = it.properties || {};
      const t = p.propertiesType || '';
      const types = it.types || [];
      if (t === 'ItemPropertiesArmor' || types.includes('armor')) return 'armor';
      if (t === 'ItemPropertiesChestRig' || types.includes('rig')) return 'rig';
      if (t === 'ItemPropertiesBackpack' || types.includes('backpack')) return 'backpack';
      if (t === 'ItemPropertiesHelmet' || types.includes('helmet')) return 'helmet';
      if (t === 'ItemPropertiesHeadphone' || types.includes('headphones')) return 'headset';
      if (t === 'ItemPropertiesGlasses' || types.includes('glasses')) return 'glasses';
      if (t === 'ItemPropertiesHeadwear') return 'headwear';
      return null;
    }

    function rate(it, slot) {
      const p = it.properties || {};
      const weight = Number(it.weight) || 0;
      let score = 0;
      let main = '—';

      if (slot === 'armor') {
        const cls = Number(p.class) || 0;
        const dur = Number(p.durability) || Number(p.maxDurability) || 0;
        const turn = Math.abs(Number(p.turnPenalty) || 0);
        const ergo = Math.abs(Number(p.ergoPenalty) || 0);
        const speed = Math.abs(Number(p.speedPenalty) || 0);
        score = cls * cls * 12 + Math.sqrt(Math.max(dur, 1)) * 3 - (turn + ergo + speed) * 0.5 - weight * 2;
        main = `кл.${cls} · дур ${dur} · вес ${weight.toFixed(1)}`;
      } else if (slot === 'rig') {
        const cap = Number(p.capacity) || 0;
        const cls = Number(p.class) || 0;
        const grids = p.grids || [];
        const cells = grids.reduce((s, g) => s + ((g.width || 0) * (g.height || 0)), 0) || cap;
        score = cells * 4 + cls * cls * 10 - weight * 3;
        main = cls ? `кл.${cls} · ${cells || cap} сл. · ${weight.toFixed(1)}кг` : `${cells || cap} слотов · ${weight.toFixed(1)}кг`;
      } else if (slot === 'backpack') {
        const cap = Number(p.capacity) || 0;
        const grids = p.grids || [];
        const cells = grids.reduce((s, g) => s + ((g.width || 0) * (g.height || 0)), 0) || cap;
        const eff = cells / Math.max(weight, 0.3);
        score = cells * 3.5 + eff * 2 - weight;
        main = `${cells || cap} сл. · ${weight.toFixed(1)}кг · ${eff.toFixed(1)} сл/кг`;
      } else if (slot === 'helmet') {
        const cls = Number(p.class) || 0;
        const dur = Number(p.durability) || 0;
        const turn = Math.abs(Number(p.turnPenalty) || 0);
        const ergo = Math.abs(Number(p.ergoPenalty) || 0);
        score = cls * cls * 11 + Math.sqrt(Math.max(dur, 1)) * 2.5 - turn * 2 - ergo - weight * 3;
        main = `кл.${cls} · дур ${dur} · пов. ${turn}`;
      } else if (slot === 'headset') {
        // distance / dampening not always present
        const dist = Number(p.distanceModifier) || 0;
        score = 20 - weight * 5 + Math.abs(dist) * 10;
        main = `вес ${weight.toFixed(2)}`;
      } else if (slot === 'glasses') {
        const cls = Number(p.class) || 0;
        const blind = Number(p.blindnessProtection) || 0;
        score = cls * 15 + blind * 30 - weight * 2;
        main = cls ? `кл.${cls} · flash ${Math.round(blind * 100)}%` : `flash ${Math.round(blind * 100)}%`;
      } else if (slot === 'headwear') {
        score = 5 - weight;
        main = `вес ${weight.toFixed(2)}`;
      }
      return { score: Math.round(score * 10) / 10, main };
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
          const slot = classify(it);
          if (!slot) return;
          if ((it.types || []).includes('preset')) return;
          const slug = it.normalizedName || '';
          const colors = detectColors(slug);
          const { score, main } = rate(it, slot);
          rows.push({
            id: it.id,
            slug,
            name: humanize(slug),
            icon: it.iconLink || it.gridImageLink || '',
            slot,
            colors,
            score,
            statMain: main,
            avg: Number(it.avg24hPrice) || 0
          });
        });

        document.getElementById('filters').style.display = 'block';
        document.getElementById('tableCard').style.display = 'block';
        status.className = 'status ok';
        status.textContent = 'Предметов: ' + rows.length;
        renderColorChips();
        render();
      } catch (e) {
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    };

    function renderColorChips() {
      const el = document.getElementById('colorChips');
      el.innerHTML = '';
      COLORS.forEach(c => {
        const n = c.id === 'all' ? rows.length : rows.filter(r => r.colors.includes(c.id)).length;
        const chip = document.createElement('span');
        chip.className = 'chip' + (color === c.id ? ' active' : '');
        chip.innerHTML = `<span class="swatch" style="background:${c.hex}"></span>${c.label} (${n})`;
        chip.onclick = () => { color = c.id; renderColorChips(); render(); };
        el.appendChild(chip);
      });
    }

    function render() {
      const q = (document.getElementById('search').value || '').toLowerCase().trim();
      const hide = document.getElementById('hideTrash').checked;
      let list = rows.filter(r => {
        if (color !== 'all' && !r.colors.includes(color)) return false;
        if (slot !== 'all' && r.slot !== slot) return false;
        if (hide && r.score < 8 && r.slot !== 'headwear' && r.slot !== 'headset') return false;
        if (q && !(r.slug.includes(q) || r.name.toLowerCase().includes(q))) return false;
        return true;
      });
      list.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (typeof va === 'string') return sortDir * String(va).localeCompare(String(vb), 'ru');
        return sortDir * ((va ?? -999) - (vb ?? -999));
      });

      document.getElementById('title').textContent = list.length + ' предметов';
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      list.slice(0, 300).forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="score">${r.score}</td>
          <td>
            <div class="name-cell">
              ${r.icon ? `<img class="ico" src="${esc(r.icon)}" loading="lazy" alt="">` : ''}
              <div>
                <div class="name">${esc(r.name)}</div>
                <div class="meta">${esc(r.slug)}</div>
              </div>
            </div>
          </td>
          <td>${esc(r.slot)}</td>
          <td>${r.colors.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</td>
          <td>${esc(r.statMain)}</td>
          <td>${r.avg ? formatNum(r.avg) : '—'}</td>
          <td><button type="button" class="copy-btn" data-n="${esc(r.slug)}">копир.</button></td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.copy-btn').forEach(b => {
        b.onclick = () => navigator.clipboard.writeText(b.dataset.n || '').then(() => {
          const o = b.textContent; b.textContent = '✓'; setTimeout(() => b.textContent = o, 600);
        });
      });
    }

    document.getElementById('slotChips').onclick = e => {
      const c = e.target.closest('.chip'); if (!c) return;
      slot = c.dataset.v;
      document.querySelectorAll('#slotChips .chip').forEach(x => x.classList.toggle('active', x.dataset.v === slot));
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
    document.getElementById('search').oninput = render;
    document.getElementById('hideTrash').onchange = render;
  


(function(){
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(window.itemName&&window.itemName!==itemName)return window.itemName(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s))s=(it.name&&!/^[a-f0-9]{20,}$/i.test(it.name)?it.name:it.normalizedName)||s;
    return s||it.id||'';
  }

  const KEY = 'tarkovPreferredGameMode';
  const def = localStorage.getItem(KEY) || 'pve';
  document.querySelectorAll('select#gameMode, select[id*="gameMode"], select[id*="GameMode"]').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => {
      try { localStorage.setItem(KEY, sel.value); } catch(e) {}
    });
  });
})();
