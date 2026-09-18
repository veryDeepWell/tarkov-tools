
  (function () {
    const KEY = 'tarkovLoadoutPresets.v1';
    const SLOT_DEFS = [
      { id:'gun', label:'Оружие' },
      { id:'armor', label:'Броня' },
      { id:'helmet', label:'Шлем' },
      { id:'rig', label:'Разгрузка' },
      { id:'backpack', label:'Рюкзак' },
      { id:'headset', label:'Наушники' },
      { id:'sec', label:'Вторичка' }
    ];
    var loadout = {};
    var catalog = null;
    function esc(s){ return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/"/g,'"'); }
    function status(m,ok){ var el=document.getElementById('status'); el.className='status'+(ok===true?' ok':ok===false?' err':''); el.textContent=m||''; }
    function presets(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
    function savePresets(list){ try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){} renderPresets(); }
    async function ensureCatalog() {
      if (catalog) return catalog;
      status('Каталог…');
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
      catalog = arr.map(function(it){
        return { id:it.id, name:it.name||'', shortName:it.shortName||'', normalizedName:it.normalizedName||'', iconLink:it.iconLink||'', avg:Number(it.avg24hPrice)||Number(it.lastLowPrice)||0 };
      });
      status('Каталог: ' + catalog.length, true);
      return catalog;
    }
    function renderSlots() {
      document.getElementById('slots').innerHTML = SLOT_DEFS.map(function(s){
        var it = loadout[s.id];
        return '<div class="slot" data-slot="'+s.id+'">' +
          '<div class="lab">'+esc(s.label)+'</div>' +
          (it ? ('<div>'+(it.iconLink?'<img src="'+esc(it.iconLink)+'" alt="">':'')+'<strong>'+esc(it.shortName||it.name)+'</strong>' +
            ' <button type="button" class="btn-ghost" data-clear="'+s.id+'" style="min-width:auto;min-height:28px;padding:0 8px">×</button></div>' +
            '<div class="meta">'+(it.avg?it.avg.toLocaleString('ru-RU')+' ₽':'')+'</div>')
            : '<div class="meta">пусто</div>') +
          '<input type="search" placeholder="Поиск…" data-q="'+s.id+'">' +
          '<div class="hits" data-hits="'+s.id+'"></div></div>';
      }).join('');
    }
    function renderPresets() {
      var list = presets();
      document.getElementById('presetList').innerHTML = list.map(function(p,i){
        return '<div class="preset-chip" data-i="'+i+'"><strong>'+esc(p.name)+'</strong> · '+Object.keys(p.slots||{}).length+' слотов' +
          ' <button type="button" class="btn-ghost" data-del="'+i+'" style="min-width:auto;min-height:28px;padding:0 8px;margin-left:6px">🗑</button></div>';
      }).join('') || '<span class="meta">Нет сохранённых</span>';
    }
    document.getElementById('slots').addEventListener('input', function(e){
      var qel = e.target.closest('input[data-q]'); if(!qel) return;
      var slot = qel.getAttribute('data-q');
      var q = (qel.value||'').toLowerCase().trim();
      var box = document.querySelector('[data-hits="'+slot+'"]');
      if (!q || q.length < 2) { box.innerHTML=''; return; }
      ensureCatalog().then(function(){
        var hits = catalog.filter(function(it){
          return (it.name+' '+it.shortName+' '+it.normalizedName).toLowerCase().includes(q);
        }).slice(0, 20);
        box.innerHTML = hits.map(function(it){
          return '<div class="hit" data-slot="'+slot+'" data-id="'+it.id+'">' +
            (it.iconLink?'<img src="'+esc(it.iconLink)+'" alt="">':'') +
            '<span>'+esc(it.shortName||it.name)+'</span></div>';
        }).join('') || '<div class="meta">нет</div>';
      }).catch(function(err){ status(String(err.message||err), false); });
    });
    document.getElementById('slots').addEventListener('click', function(e){
      var clr = e.target.closest('[data-clear]');
      if (clr) { delete loadout[clr.getAttribute('data-clear')]; renderSlots(); return; }
      var hit = e.target.closest('.hit'); if(!hit) return;
      var id = hit.getAttribute('data-id');
      var slot = hit.getAttribute('data-slot');
      var it = catalog.find(function(x){ return x.id===id; });
      if (it) { loadout[slot] = it; renderSlots(); }
    });
    document.getElementById('btnSave').onclick = function(){
      var name = (document.getElementById('presetName').value||'').trim() || ('Пресет ' + new Date().toLocaleString('ru-RU'));
      var list = presets();
      list.unshift({ name: name, slots: loadout, ts: Date.now() });
      savePresets(list.slice(0, 40));
      status('Сохранено: ' + name, true);
    };
    document.getElementById('btnClear').onclick = function(){ loadout = {}; renderSlots(); };
    document.getElementById('presetList').onclick = function(e){
      var del = e.target.closest('[data-del]');
      if (del) {
        var list = presets(); list.splice(Number(del.getAttribute('data-del')), 1); savePresets(list); return;
      }
      var chip = e.target.closest('.preset-chip'); if(!chip) return;
      var p = presets()[Number(chip.getAttribute('data-i'))];
      if (!p) return;
      loadout = Object.assign({}, p.slots || {});
      document.getElementById('presetName').value = p.name || '';
      renderSlots();
      status('Загружен: ' + p.name, true);
    };
    document.getElementById('gameMode').onchange = function(){ catalog = null; };
    renderSlots();
    renderPresets();
  })();
  