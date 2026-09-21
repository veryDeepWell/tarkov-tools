
  (function () {
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(window.itemName&&window.itemName!==itemName)return window.itemName(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s))s=(it.name&&!/^[a-f0-9]{20,}$/i.test(it.name)?it.name:it.normalizedName)||s;
    return s||it.id||'';
  }

    let rows = [];
    let kind = 'all';
    let sortKey = 'score';
    let sortDir = -1;
    function esc(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }
    function status(msg, ok) {
      var el = document.getElementById('status');
      el.className = 'status' + (ok === true ? ' ok' : ok === false ? ' err' : '');
      el.textContent = msg;
    }
    function scoreOf(r) {
      var pts = (r.energy || 0) + (r.hydration || 0);
      if (pts <= 0 || !r.avg) return 0;
      var per = r.avg / pts;
      var dual = (r.energy > 0 && r.hydration > 0) ? 1.15 : 1;
      var s = (10000 / Math.max(1, per)) * dual;
      if (r.units > 1) s *= 1 + Math.min(0.3, r.units / 100);
      return Math.round(s * 10) / 10;
    }
    async function load() {
      status('Загрузка…');
      var mode = document.getElementById('gameMode').value || 'pve';
      var arr = await TarkovAPI.items(mode);
      rows = [];
      arr.forEach(function (it) {
        var p = it.properties || {};
        if (p.propertiesType !== 'ItemPropertiesFoodDrink') return;
        var energy = Number(p.energy) || 0;
        var hydration = Number(p.hydration) || 0;
        if (!energy && !hydration) return;
        var k = energy > 0 && hydration === 0 ? 'food'
          : hydration > 0 && energy === 0 ? 'drink' : 'both';
        var avg = Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0;
        var r = {
          id: it.id,
          name: itemName(it) || it.id,
          full: it.name || '',
          icon: it.iconLink || it.gridImageLink || '',
          kind: k,
          energy: energy,
          hydration: hydration,
          units: Number(p.units) || 0,
          avg: avg
        };
        r.perPoint = (energy + hydration) > 0 && avg ? Math.round(avg / (energy + hydration)) : 0;
        r.score = scoreOf(r);
        rows.push(r);
      });
      status('Найдено: ' + rows.length, true);
      render();
    }
    function render() {
      var q = (document.getElementById('q').value || '').toLowerCase();
      var list = rows.filter(function (r) {
        if (kind === 'food' && r.kind !== 'food' && r.kind !== 'both') return false;
        if (kind === 'drink' && r.kind !== 'drink' && r.kind !== 'both') return false;
        if (q && !(r.name + r.full).toLowerCase().includes(q)) return false;
        return true;
      });
      list.sort(function (a, b) {
        var av = a[sortKey], bv = b[sortKey];
        if (typeof av === 'string') return sortDir * String(av).localeCompare(String(bv), 'ru');
        return sortDir * ((av || 0) - (bv || 0));
      });
      var kindLabel = { food: 'Пища', drink: 'Вода', both: 'Оба' };
      document.getElementById('tbody').innerHTML = list.map(function (r) {
        return '<tr>' +
          '<td><div class="name-cell">' + (r.icon ? '<img class="ico" src="' + esc(r.icon) + '" alt="">' : '') +
          '<div><div class="name">' + esc(r.name) + '</div><div class="meta">' + esc(r.full) + '</div></div></div></td>' +
          '<td>' + (kindLabel[r.kind] || r.kind) + '</td>' +
          '<td>' + r.energy + '</td><td>' + r.hydration + '</td><td>' + r.units + '</td>' +
          '<td>' + (r.avg ? r.avg.toLocaleString('ru-RU') : '—') + '</td>' +
          '<td>' + (r.perPoint ? r.perPoint.toLocaleString('ru-RU') : '—') + '</td>' +
          '<td class="score">' + r.score + '</td></tr>';
      }).join('') || '<tr><td colspan="8" class="meta">Пусто</td></tr>';
    }
    document.getElementById('kindChips').onclick = function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      kind = b.getAttribute('data-k');
      document.querySelectorAll('#kindChips .chip').forEach(function (c) { c.classList.toggle('active', c === b); });
      render();
    };
    document.querySelectorAll('th[data-s]').forEach(function (th) {
      th.onclick = function () {
        var k = th.getAttribute('data-s');
        if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = k === 'name' || k === 'kind' ? 1 : -1; }
        render();
      };
    });
    document.getElementById('btnLoad').onclick = function () { load().catch(function (e) { status(String(e.message || e), false); }); };
    document.getElementById('q').oninput = render;
  })();
  