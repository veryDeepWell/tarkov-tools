
  (function () {
    var pool = null;
    function esc(s){ return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/"/g,'"'); }
    function status(m,ok){ var el=document.getElementById('status'); el.className='status'+(ok===true?' ok':ok===false?' err':''); el.textContent=m; }
    function pick(arr){ if(!arr||!arr.length) return null; return arr[Math.floor(Math.random()*arr.length)]; }
    function priceOf(it){ return it ? (Number(it.avg24hPrice)||Number(it.lastLowPrice)||0) : 0; }
    function pdCell(cls, lab, it) {
      if (!it) return '<div class="pd-slot empty '+cls+'"><div class="lab">'+esc(lab)+'</div><div class="meta">—</div></div>';
      var nm = it.shortName || it.name || it.normalizedName || '';
      var pr = priceOf(it);
      var icon = it.iconLink || it.gridImageLink || '';
      return '<div class="pd-slot '+cls+'"><div class="lab">'+esc(lab)+'</div>'+(icon?'<img src="'+esc(icon)+'" alt="">':'')+'<div class="nm">'+esc(nm)+'</div><div class="pr">'+(pr?pr.toLocaleString('ru-RU')+' ₽':'')+'</div></div>';
    }
    function renderPaperdoll(slots) {
      var s = slots || {};
      var sum = ['gun','armor','helmet','rig','backpack','headset','glasses','sec'].reduce(function(a,k){ return a + priceOf(s[k]); }, 0);
      document.getElementById('paperdoll').innerHTML =
        pdCell('pd-headset','Наушники', s.headset) + pdCell('pd-helmet','Шлем', s.helmet) + pdCell('pd-glasses','Очки', s.glasses) +
        pdCell('pd-gun','Оружие', s.gun) + pdCell('pd-armor','Броня', s.armor) + pdCell('pd-rig','Разгрузка', s.rig) +
        pdCell('pd-backpack','Рюкзак', s.backpack) + pdCell('pd-sec','Вторичка', s.sec) +
        '<div class="pd-total">Итого ~ '+sum.toLocaleString('ru-RU')+' ₽</div>';
    }
    async function ensure() {
      if (pool) return pool;
      status('Гружу предметы…');
      var mode = document.getElementById('gameMode').value || 'pve';
      var arr;
      if (window.TarkovAPI && TarkovAPI.items) arr = await TarkovAPI.items(mode);
      else {
        var res = await fetch('https://json.tarkov.dev/' + mode + '/items', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var json = await res.json();
        var raw = json && json.data && (json.data.items || json.data);
        arr = Array.isArray(raw) ? raw : Object.values(raw || {});
      }
      pool = { gun:[], armor:[], helmet:[], rig:[], backpack:[], headset:[], glasses:[] };
      arr.forEach(function (it) {
        var types = it.types || [], p = it.properties || {};
        if (types.includes('preset')) return;
        if (types.includes('gun') && p.propertiesType === 'ItemPropertiesWeapon') { pool.gun.push(it); return; }
        if (types.includes('helmet') || p.propertiesType === 'ItemPropertiesHelmet') { pool.helmet.push(it); return; }
        if (types.includes('armor') || p.propertiesType === 'ItemPropertiesArmor') { pool.armor.push(it); return; }
        if (types.includes('rig') || p.propertiesType === 'ItemPropertiesChestRig') { pool.rig.push(it); return; }
        if (types.includes('backpack') || p.propertiesType === 'ItemPropertiesBackpack') { pool.backpack.push(it); return; }
        if (types.includes('headphones') || p.propertiesType === 'ItemPropertiesHeadphone') { pool.headset.push(it); return; }
        if (types.includes('glasses') || p.propertiesType === 'ItemPropertiesGlasses') { pool.glasses.push(it); return; }
      });
      status('Готово', true); return pool;
    }
    async function go() {
      var p = await ensure();
      renderPaperdoll({ gun:pick(p.gun), armor:pick(p.armor), helmet:pick(p.helmet), rig:pick(p.rig), backpack:pick(p.backpack), headset:pick(p.headset), glasses:pick(p.glasses), sec:null });
      status('Готово', true);
    }
    document.getElementById('btnGo').onclick = function () { go().catch(function (e) { status(String(e.message||e), false); }); };
    document.getElementById('gameMode').onchange = function () { pool = null; };
  })();
  