
  (function () {
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

    const RUN_KEY = 'tarkovPriceAlarmRunning';
    const COND = [
      { id: 'price_lte', label: 'Цена ≤' },
      { id: 'price_gte', label: 'Цена ≥' },
      { id: 'offers_lte', label: 'Офферы ≤' },
      { id: 'offers_gte', label: 'Офферы ≥' }
    ];
    let catalog = [], timer = null, fired = {};
    function alerts() {
      try { if (window.TarkovState && TarkovState.get) { var st = TarkovState.get(); if (st.alerts && Array.isArray(st.alerts.prices)) return st.alerts.prices.slice(); } } catch (e) {}
      try { return JSON.parse(localStorage.getItem('tarkovPriceAlarms') || '[]'); } catch (e) { return []; }
    }
    function saveAlerts(list) {
      try { if (window.TarkovState && TarkovState.set) TarkovState.set({ alerts: { prices: list } }); } catch (e) {}
      try { localStorage.setItem('tarkovPriceAlarms', JSON.stringify(list)); } catch (e) {}
      render();
    }
    function status(msg, ok) {
      var el = document.getElementById('status');
      el.className = 'status' + (ok === true ? ' ok' : ok === false ? ' err' : '');
      el.textContent = msg;
    }
    function reportMini(running, label) {
      try {
        var payload = { type: 'tt-status', tool: 'tarkovtool-price-alarm.html', running: !!running, label: label || '' };
        window.__ttLastStatus = { running: !!running, label: label || '', tool: 'tarkovtool-price-alarm.html' };
        if (window.TarkovMini && TarkovMini.reportStatus) TarkovMini.reportStatus({ running: !!running, label: label || '' });
        if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
      } catch (e) {}
    }
    async function ensureCatalog() {
      if (catalog.length) return;
      var mode = document.getElementById('gameMode').value || 'pve';
      status('Гружу каталог…');
      var arr;
      if (window.TarkovAPI && TarkovAPI.items) arr = await TarkovAPI.items(mode);
      else {
        var res = await fetch('https://json.tarkov.dev/' + mode + '/items', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var json = await res.json();
        var data = json && json.data && (json.data.items || json.data);
        arr = Array.isArray(data) ? data : Object.values(data || {});
      }
      catalog = arr.map(function (it) {
        return { id: it.id, name: it.name || '', shortName: it.shortName || '', normalizedName: it.normalizedName || '', iconLink: it.iconLink || '', avg24hPrice: it.avg24hPrice, lastLowPrice: it.lastLowPrice, lastOfferCount: it.lastOfferCount, offerCount: it.offerCount };
      });
      status('Каталог: ' + catalog.length, true);
    }
    function displayName(it) {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
      return itemName(it) || it.id;
    }
    function renderHits(q) {
      var box = document.getElementById('hits');
      if (!q || q.length < 2) { box.innerHTML = ''; return; }
      var list = window.TarkovNames && TarkovNames.search ? TarkovNames.search(q, catalog).slice(0, 25)
        : catalog.filter(function (it) { return (it.name + ' ' + it.shortName + ' ' + it.normalizedName).toLowerCase().includes(q.toLowerCase()); }).slice(0, 25);
      box.innerHTML = list.map(function (it) {
        return '<div class="search-hit" data-id="' + it.id + '">' + (it.iconLink ? '<img src="' + it.iconLink + '" alt="">' : '') +
          '<div><div class="nm">' + displayName(it) + '</div><div class="meta">' + (it.name || '') + '</div></div></div>';
      }).join('');
      box.querySelectorAll('.search-hit').forEach(function (el) {
        el.onclick = function () {
          var id = el.getAttribute('data-id');
          var it = catalog.find(function (x) { return x.id === id; });
          if (!it) return;
          var list = alerts();
          if (list.some(function (a) { return a.id === id; })) { status('Уже в списке'); return; }
          list.push({ id: it.id, name: displayName(it), icon: it.iconLink || '', cond: 'price_lte', target: Math.round(Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0) || 10000, enabled: true });
          saveAlerts(list);
          document.getElementById('q').value = '';
          box.innerHTML = '';
        };
      });
    }
    function condOptions(sel) {
      return COND.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + c.label + '</option>'; }).join('');
    }
    function render() {
      var list = alerts();
      var box = document.getElementById('list');
      if (!list.length) { box.innerHTML = '<p class="meta">Пока пусто — найди предмет выше</p>'; return; }
      box.innerHTML = list.map(function (a, i) {
        return '<div class="alarm-row" data-i="' + i + '">' +
          (a.icon ? '<img src="' + a.icon + '" alt="">' : '<span></span>') +
          '<div><div class="nm">' + (a.name || a.id) + '</div><div class="meta">' + a.id + '</div></div>' +
          '<select data-f="cond">' + condOptions(a.cond || (a.dir === 'above' ? 'price_gte' : 'price_lte')) + '</select>' +
          '<input type="number" data-f="target" value="' + (a.target || 0) + '" min="0">' +
          '<label style="display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.85rem"><input type="checkbox" data-f="enabled"' + (a.enabled !== false ? ' checked' : '') + '> вкл</label>' +
          '<button type="button" class="btn-ghost" data-del style="min-width:auto;min-height:36px;padding:0 10px">×</button></div>';
      }).join('');
      box.querySelectorAll('.alarm-row').forEach(function (row) {
        var i = Number(row.getAttribute('data-i'));
        row.querySelectorAll('[data-f]').forEach(function (inp) {
          inp.onchange = function () {
            var list2 = alerts(); var a = list2[i]; if (!a) return;
            var f = inp.getAttribute('data-f');
            if (f === 'enabled') a.enabled = inp.checked;
            else if (f === 'target') a.target = Number(inp.value) || 0;
            else if (f === 'cond') a.cond = inp.value;
            saveAlerts(list2);
          };
        });
        var del = row.querySelector('[data-del]');
        if (del) del.onclick = function () { var list2 = alerts(); list2.splice(i, 1); saveAlerts(list2); };
      });
    }
    function matchCond(a, price, offers) {
      var t = Number(a.target) || 0;
      var c = a.cond || (a.dir === 'above' ? 'price_gte' : 'price_lte');
      if (c === 'price_lte') return price > 0 && price <= t;
      if (c === 'price_gte') return price >= t;
      if (c === 'offers_lte') return offers <= t;
      if (c === 'offers_gte') return offers >= t;
      return false;
    }
    async function checkOnce() {
      await ensureCatalog();
      var mode = document.getElementById('gameMode').value || 'pve';
      var list = alerts().filter(function (a) { return a.enabled !== false; });
      if (!list.length) { status('Нет активных алертов'); return; }
      status('Проверяю ' + list.length + '…');
      var arr;
      if (window.TarkovAPI && TarkovAPI.items) arr = await TarkovAPI.items(mode);
      else {
        var res = await fetch('https://json.tarkov.dev/' + mode + '/items', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var json = await res.json();
        var data = json && json.data && (json.data.items || json.data);
        arr = Array.isArray(data) ? data : Object.values(data || {});
      }
      var byId = {};
      arr.forEach(function (it) { byId[it.id] = it; });
      var hits = 0;
      list.forEach(function (a) {
        var it = byId[a.id]; if (!it) return;
        var price = Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0;
        var offers = Number(it.lastOfferCount) || Number(it.offerCount) || 0;
        if (!matchCond(a, price, offers)) return;
        var key = a.id + ':' + (a.cond || '') + ':' + a.target + ':' + Math.floor(Date.now() / 300000);
        if (fired[key]) return;
        fired[key] = Date.now(); hits++;
        var body = (a.name || a.id) + ' · цена ' + (price ? price.toLocaleString('ru-RU') : '—') + ' · офферы ' + offers;
        if (typeof Notify === 'function') Notify({ title: 'Price Alarm', body: body, tool: 'tarkovtool-price-alarm.html', kind: 'price' });
        else if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep('price');
      });
      status(hits ? ('Сработало: ' + hits) : 'Условий нет', hits ? true : undefined);
    }
    function start() {
      stop();
      var mins = Math.max(1, Number(document.getElementById('interval').value) || 5);
      document.getElementById('interval').value = mins;
      try { localStorage.setItem(RUN_KEY, JSON.stringify({ on: true, mins: mins, mode: document.getElementById('gameMode').value })); } catch (e) {}
      timer = setInterval(function () { checkOnce().catch(function (e) { status(String(e.message || e), false); }); }, mins * 60 * 1000);
      status('Фон каждые ' + mins + ' мин', true);
      reportMini(true, 'каждые ' + mins + 'м');
      checkOnce().catch(function (e) { status(String(e.message || e), false); });
    }
    function stop() {
      if (timer) clearInterval(timer); timer = null;
      try { var prev = {}; try { prev = JSON.parse(localStorage.getItem(RUN_KEY) || '{}'); } catch (e) {} localStorage.setItem(RUN_KEY, JSON.stringify({ on: false, mins: prev.mins, mode: prev.mode })); } catch (e) {}
      status('Остановлен'); reportMini(false, 'ожидание');
    }
    document.getElementById('q').addEventListener('input', function () {
      ensureCatalog().then(function () { renderHits(document.getElementById('q').value); }).catch(function (e) { status(String(e.message || e), false); });
    });
    document.getElementById('btnStart').onclick = start;
    document.getElementById('btnStop').onclick = stop;
    document.getElementById('btnNow').onclick = function () { checkOnce().catch(function (e) { status(String(e.message || e), false); }); };
    render();
    try {
      var run = JSON.parse(localStorage.getItem(RUN_KEY) || '{}');
      if (run.mins) document.getElementById('interval').value = run.mins;
      if (run.mode) document.getElementById('gameMode').value = run.mode;
      if (run.on) start(); else reportMini(false, 'ожидание');
    } catch (e) {}
  })();
  