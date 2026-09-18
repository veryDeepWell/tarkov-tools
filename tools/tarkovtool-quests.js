
    const LOCALE_EN = 'https://raw.githubusercontent.com/carlsmei/tarkovdata/main/languages/en.json';
    const LOCALE_RU = 'https://raw.githubusercontent.com/carlsmei/tarkovdata/main/languages/ru.json';

    let tasks = [], byId = {}, mapName = {}, traderName = {}, enLoc = {}, ruLoc = {};

    function humanize(s) {
      return s ? String(s).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '?';
    }
    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function tName(id, slug) {
      return enLoc[id + ' name'] || enLoc[id + ' Name'] || humanize(slug) || id;
    }
    function tNameRu(id, slug) {
      return ruLoc[id + ' name'] || ruLoc[id + ' Name'] || '';
    }
    function mapsOfObj(o) {
      const ids = new Set();
      (o.maps || []).forEach(m => ids.add(typeof m === 'string' ? m : m.id || m));
      (o.zones || []).forEach(z => {
        if (z && z.map) ids.add(typeof z.map === 'string' ? z.map : z.map.id);
      });
      (o.possibleLocations || []).forEach(m => ids.add(typeof m === 'string' ? m : m.id || m));
      return [...ids].map(id => mapName[id] || humanize(id)).filter(Boolean);
    }
    function mapsOfTask(t) {
      const ids = new Set();
      if (t.map) ids.add(typeof t.map === 'string' ? t.map : t.map.id);
      (t.objectives || []).forEach(o => {
        mapsOfObj(o).forEach(n => {}); // collect via ids
        (o.maps || []).forEach(m => ids.add(typeof m === 'string' ? m : m.id || m));
        (o.zones || []).forEach(z => { if (z && z.map) ids.add(typeof z.map === 'string' ? z.map : z.map.id); });
        (o.possibleLocations || []).forEach(m => ids.add(typeof m === 'string' ? m : m.id || m));
      });
      return [...ids].map(id => mapName[id] || null).filter(Boolean);
    }
    function typeLabel(ty) {
      const m = {
        giveItem: 'Сдать предмет',
        findItem: 'Найти предмет',
        findQuestItem: 'Найти квест-предмет',
        giveQuestItem: 'Сдать квест-предмет',
        visit: 'Посетить / зона',
        shoot: 'Убить',
        plantItem: 'Установить предмет',
        plantQuestItem: 'Установить квест-предмет',
        extract: 'Выйти',
        mark: 'Отметить',
        buildWeapon: 'Собрать оружие',
        taskStatus: 'Статус другого квеста',
        traderLevel: 'Уровень торговца',
        skill: 'Скилл',
        sellItem: 'Продать',
        useItem: 'Использовать',
        experience: 'Опыт',
        dialogue: 'Диалог'
      };
      return m[ty] || ty || '?';
    }

    document.getElementById('loadBtn').onclick = async () => {
      const st = document.getElementById('status');
      st.className = 'status'; st.textContent = 'Гружу…';
      try {
        const mode = document.getElementById('gameMode').value || 'pve';
        const [jt, jm, en, ru] = await Promise.all([
          fetch('https://json.tarkov.dev/' + mode + '/tasks', { cache: 'no-store' }).then(r => r.json()),
          fetch('https://json.tarkov.dev/' + mode + '/maps', { cache: 'no-store' }).then(r => r.json()),
          fetch(LOCALE_EN, { cache: 'no-store' }).then(r => r.json()),
          fetch(LOCALE_RU, { cache: 'no-store' }).then(r => r.json())
        ]);
        enLoc = en; ruLoc = ru;
        mapName = {};
        const mapsRaw = jm?.data?.maps || {};
        Object.values(mapsRaw).forEach(m => {
          if (m && m.id) mapName[m.id] = humanize(m.normalizedName || m.nameId || m.id);
        });
        // traders from tasks
        let raw = jt?.data?.tasks;
        tasks = Array.isArray(raw) ? raw : Object.values(raw || {});
        byId = {};
        tasks.forEach(t => { byId[t.id] = t; });

        // trader names from locale if possible — use id slice
        const traders = new Set();
        tasks.forEach(t => { if (t.trader) traders.add(t.trader); });
        traderName = {};
        // known traders ids often in locale
        traders.forEach(id => {
          traderName[id] = enLoc[id + ' Nickname'] || enLoc[id + ' name'] || id.slice(0, 6);
        });

        const mf = document.getElementById('mapFilter');
        mf.innerHTML = '<option value="">Все</option>' +
          Object.values(mapName).filter((v,i,a)=>a.indexOf(v)===i).sort().map(n =>
            `<option value="${esc(n)}">${esc(n)}</option>`
          ).join('');

        const tf = document.getElementById('traderFilter');
        const tnames = [...traders].map(id => ({ id, n: traderName[id] || id }));
        tnames.sort((a,b) => a.n.localeCompare(b.n));
        tf.innerHTML = '<option value="">Все</option>' +
          tnames.map(t => `<option value="${esc(t.id)}">${esc(t.n)}</option>`).join('');

        document.getElementById('ui').style.display = 'block';
        st.className = 'status ok';
        st.textContent = 'Квестов: ' + tasks.length;
        render();
      } catch (e) {
        st.className = 'status err';
        st.textContent = e.message;
      }
    };

    function render() {
      const q = (document.getElementById('q').value || '').toLowerCase().trim();
      const mapF = document.getElementById('mapFilter').value;
      const trF = document.getElementById('traderFilter').value;
      let list = tasks.filter(t => {
        if (trF && t.trader !== trF) return false;
        const maps = mapsOfTask(t);
        if (mapF && !maps.some(m => m === mapF)) return false;
        if (!q) return true;
        const en = tName(t.id, t.normalizedName).toLowerCase();
        const ru = tNameRu(t.id, t.normalizedName).toLowerCase();
        const slug = (t.normalizedName || '').toLowerCase();
        return en.includes(q) || ru.includes(q) || slug.includes(q);
      });
      list = list.slice(0, 80);
      document.getElementById('count').textContent = 'Показано: ' + list.length + (list.length >= 80 ? ' (лимит 80, уточни поиск)' : '');
      const el = document.getElementById('list');
      el.innerHTML = list.map(t => {
        const en = tName(t.id, t.normalizedName);
        const ru = tNameRu(t.id, t.normalizedName);
        const maps = mapsOfTask(t);
        const mapTags = maps.length
          ? maps.map(m => `<span class="tag map">${esc(m)}</span>`).join('')
          : '<span class="tag">карта не указана в данных</span>';
        const reqs = (t.taskRequirements || []).map(r => {
          const tid = r.task || r.taskId;
          const prev = byId[tid];
          const pn = prev ? tName(prev.id, prev.normalizedName) : tid;
          const st = (r.status || []).join('/') || 'complete';
          return `<span class="tag lock">после: ${esc(pn)} (${esc(st)})</span>`;
        }).join(' ');
        const objs = (t.objectives || []).map((o, i) => {
          const om = mapsOfObj(o);
          const mapStr = om.length ? om.map(m => `<span class="tag map">${esc(m)}</span>`).join('') : '<span class="tag">any / не в API</span>';
          let extra = '';
          if (o.type === 'taskStatus' && o.task) {
            const prev = byId[o.task];
            extra = `<div class="meta">Нужен квест: <b>${esc(prev ? tName(prev.id, prev.normalizedName) : o.task)}</b> [${esc((o.status||[]).join(','))}]</div>`;
          }
          if (o.count) extra += `<div class="meta">×${o.count}${o.foundInRaid ? ' FIR' : ''}</div>`;
          return `<div class="obj">
            <div class="step">Шаг ${i + 1}${o.optional ? ' · optional' : ''}</div>
            <div class="type">${esc(typeLabel(o.type))}</div>
            <div>${mapStr}${o.optional ? ' <span class="tag opt">optional</span>' : ''}</div>
            ${extra}
          </div>`;
        }).join('');
        return `<div class="qcard">
          <h2>${esc(en)}</h2>
          ${ru ? `<div class="meta">${esc(ru)}</div>` : ''}
          <div class="meta">${esc(t.normalizedName || '')} · lvl ${t.minPlayerLevel ?? '?'} · ${esc(traderName[t.trader] || '')}</div>
          <div style="margin:6px 0">${mapTags}</div>
          <div>${reqs}</div>
          ${t.wikiLink ? `<div class="meta"><a href="${esc(t.wikiLink)}" target="_blank" rel="noopener">wiki</a></div>` : ''}
          <div style="margin-top:8px">${objs || '<span class="meta">Нет objectives</span>'}</div>
        </div>`;
      }).join('');
    }

    document.getElementById('q').oninput = render;
    document.getElementById('mapFilter').onchange = render;
    document.getElementById('traderFilter').onchange = render;

    (function () {
      const KEY = 'tarkovPreferredGameMode';
      const def = localStorage.getItem(KEY) || 'pve';
      document.querySelectorAll('select#gameMode').forEach(sel => {
        if ([...sel.options].some(o => o.value === def)) sel.value = def;
        sel.addEventListener('change', () => { try { localStorage.setItem(KEY, sel.value); } catch (e) {} });
      });
    })();
  