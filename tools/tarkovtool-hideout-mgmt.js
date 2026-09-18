
    let byId = {}, crafts = [], stationMap = {}, rows = [];
    let stationFilter = 'all';
    let sortKey = 'net';
    let sortDir = 1; // net: lower better

    function humanize(s) {
      return s ? String(s).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '?';
    }
    function formatNum(n) {
      if (n == null || Number.isNaN(n)) return '—';
      const r = Math.round(n);
      return (r > 0 ? '+' : '') + r.toLocaleString('ru-RU');
    }
    function formatDur(sec) {
      sec = Number(sec) || 0;
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      if (h) return h + 'ч ' + m + 'м';
      return m + 'м';
    }
    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function itemPrice(id) {
      const it = byId[id];
      if (!it) return 0;
      const avg = Number(it.avg24hPrice) || 0;
      if (avg > 0) return avg;
      let min = Infinity;
      (it.buyFromTrader || []).forEach(b => {
        const p = Number(b.price) || 0;
        if (p > 0 && p < min) min = p;
      });
      return min === Infinity ? 0 : min;
    }

    function productId(c) {
      const p = c.productItem;
      if (!p) return null;
      if (typeof p === 'string') return p;
      return p.item || p.id || null;
    }
    function productCount(c) {
      const p = c.productItem;
      if (!p || typeof p === 'string') return 1;
      return Number(p.count) || 1;
    }

    function stationName(id) {
      if (stationMap[id]) return stationMap[id];
      return humanize(id);
    }

    document.getElementById('loadBtn').onclick = async () => {
      const st = document.getElementById('status');
      const btn = document.getElementById('loadBtn');
      btn.disabled = true;
      st.className = 'status';
      st.textContent = 'Гружу crafts + items + hideout…';
      try {
        const mode = document.getElementById('gameMode').value || 'pve';
        const [jc, ji, jh] = await Promise.all([
          fetch('https://json.tarkov.dev/' + mode + '/crafts', { cache: 'no-store' }).then(r => r.json()),
          fetch('https://json.tarkov.dev/' + mode + '/items', { cache: 'no-store' }).then(r => r.json()),
          fetch('https://json.tarkov.dev/' + mode + '/hideout', { cache: 'no-store' }).then(r => r.json())
        ]);

        let rawItems = ji?.data?.items;
        const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems || {});
        byId = {};
        items.forEach(i => { byId[i.id] = i; });

        let rawCrafts = jc?.data;
        if (rawCrafts && !Array.isArray(rawCrafts) && rawCrafts.crafts) rawCrafts = rawCrafts.crafts;
        if (!Array.isArray(rawCrafts) && jc?.data && Array.isArray(jc.data)) rawCrafts = jc.data;
        crafts = Array.isArray(rawCrafts) ? rawCrafts : Object.values(rawCrafts || {});

        stationMap = {};
        let hd = jh?.data ?? jh;
        const stations = Array.isArray(hd) ? hd : Object.values(hd || {});
        stations.forEach(s => {
          if (s && s.id) {
            stationMap[s.id] = humanize(s.normalizedName || s.name || s.id);
          }
        });

        buildRows();
        document.getElementById('main').style.display = 'block';
        st.className = 'status ok';
        st.textContent = 'Крафтов: ' + rows.length + ' · станций: ' + Object.keys(stationMap).length;
        try {
          localStorage.setItem('tarkovHideoutMgmt', JSON.stringify({
            mode: document.getElementById('gameMode').value,
            maxLv: document.getElementById('maxLv').value
          }));
        } catch (e) {}
        renderStations();
        render();
      } catch (e) {
        st.className = 'status err';
        st.textContent = e.message;
      } finally {
        btn.disabled = false;
      }
    };

    function buildRows() {
      const maxLv = Number(document.getElementById('maxLv').value) || 3;
      rows = [];
      crafts.forEach(c => {
        const lv = Number(c.level) || 1;
        if (lv > maxLv) return;
        const sid = typeof c.station === 'string' ? c.station : (c.station?.id || c.station);
        const pid = productId(c);
        const pcount = productCount(c);
        let inCost = 0;
        const ingredients = [];
        (c.requiredItems || []).forEach(r => {
          const id = r.item || r.id;
          const count = Number(r.count) || 1;
          const isTool = !!(r.attributes && (r.attributes.tool === true || r.attributes.tool === 'true'));
          const price = itemPrice(id);
          if (!isTool) inCost += price * count;
          const it = byId[id];
          ingredients.push({
            id, count, isTool, price,
            name: humanize(it?.normalizedName || id),
            icon: it?.iconLink || ''
          });
        });
        const outPrice = itemPrice(pid) * pcount;
        const net = inCost - outPrice; // positive = loss, negative = profit
        const dur = Number(c.duration) || 1;
        const hours = dur / 3600;
        const netHour = net / hours;
        const prod = byId[pid];
        rows.push({
          stationId: sid,
          station: stationName(sid),
          level: lv,
          duration: dur,
          inCost,
          outPrice,
          net,
          netHour,
          profit: -net,
          productName: humanize(prod?.normalizedName || pid || '?'),
          productSlug: prod?.normalizedName || '',
          productIcon: prod?.iconLink || '',
          ingredients
        });
      });
    }

    function renderStations() {
      const counts = {};
      rows.forEach(r => { counts[r.stationId] = (counts[r.stationId] || 0) + 1; });
      const el = document.getElementById('stations');
      el.innerHTML = '';
      const all = document.createElement('span');
      all.className = 'chip' + (stationFilter === 'all' ? ' active' : '');
      all.textContent = 'Все (' + rows.length + ')';
      all.onclick = () => { stationFilter = 'all'; renderStations(); render(); };
      el.appendChild(all);
      Object.keys(counts).sort((a, b) => stationName(a).localeCompare(stationName(b), 'ru')).forEach(id => {
        const chip = document.createElement('span');
        chip.className = 'chip' + (stationFilter === id ? ' active' : '');
        chip.textContent = stationName(id) + ' (' + counts[id] + ')';
        chip.onclick = () => { stationFilter = id; renderStations(); render(); };
        el.appendChild(chip);
      });
    }

    function render() {
      sortKey = document.getElementById('sortBy').value;
      // direction: for net, netHour, cost, duration — lower better; profit — higher better
      sortDir = sortKey === 'profit' ? -1 : 1;
      let list = rows.filter(r => stationFilter === 'all' || r.stationId === stationFilter);
      list = list.slice().sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        return sortDir * ((va ?? 0) - (vb ?? 0));
      });

      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      list.forEach(r => {
        const netCls = r.net <= 0 ? 'good' : 'bad';
        const ing = r.ingredients.map(i =>
          `${i.isTool ? '<span class="tag">tool</span> ' : ''}${esc(i.name)} ×${i.count}`
        ).join('<br>');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="${netCls}"><b>${formatNum(-r.net).replace(/^\+/,'')}</b> ${r.net > 0 ? '<span class="meta">убыток</span>' : '<span class="meta">профит</span>'}</td>
          <td class="${r.netHour <= 0 ? 'good' : 'bad'}">${formatNum(-r.netHour)}</td>
          <td>
            ${r.productIcon ? `<img class="ico" src="${esc(r.productIcon)}" alt="">` : ''}
            <span class="name">${esc(r.productName)}</span>
            <div class="meta">${esc(r.station)} · <button type="button" class="copy-btn" data-n="${esc(r.productSlug)}">копир.</button></div>
          </td>
          <td>${Math.round(r.inCost).toLocaleString('ru-RU')}</td>
          <td>${Math.round(r.outPrice).toLocaleString('ru-RU')}</td>
          <td>${formatDur(r.duration)}</td>
          <td>${r.level}</td>
          <td class="meta">${ing}</td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.copy-btn').forEach(b => {
        b.onclick = () => navigator.clipboard.writeText(b.dataset.n || '');
      });
    }

    document.getElementById('sortBy').onchange = render;
    document.getElementById('maxLv').onchange = () => {
      if (rows.length) { buildRows(); renderStations(); render(); }
    };

    // restore prefs
    try {
      const s = JSON.parse(localStorage.getItem('tarkovHideoutMgmt') || '{}');
      if (s.mode) document.getElementById('gameMode').value = s.mode;
      if (s.maxLv) document.getElementById('maxLv').value = s.maxLv;
    } catch (e) {}

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
      document.querySelectorAll('select#gameMode').forEach(sel => {
        if ([...sel.options].some(o => o.value === def)) sel.value = def;
        sel.addEventListener('change', () => { try { localStorage.setItem(KEY, sel.value); } catch(e) {} });
      });
    })();
  