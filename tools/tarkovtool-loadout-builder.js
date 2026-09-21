
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
    function esc(s){
      if (window.TarkovUI && TarkovUI.esc) return TarkovUI.esc(s);
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function label(it){
      if (!it) return '';
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
      return itemName(it) || '';
    }
    function status(m,ok){ var el=document.getElementById('status'); el.className='status'+(ok===true?' ok':ok===false?' err':''); el.textContent=m||''; }
    function presets(){ return TarkovStorage.getJson(KEY, []) || []; }
    function savePresets(list){ try{ TarkovStorage.setJson(KEY, list); }catch(e){} renderPresets(); }
    async function ensureCatalog() {
      if (catalog) return catalog;
      status('Каталог…');
      var mode = document.getElementById('gameMode').value || 'pve';
      var arr = await TarkovAPI.items(mode);
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
          (it ? ('<div>'+(it.iconLink?'<img src="'+esc(it.iconLink)+'" alt="">':'')+'<strong>'+esc(label(it))+'</strong>' +
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
            '<span>'+esc(label(it))+'</span></div>';
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
  
    function exportLoadout() {
      var payload = {
        v: 1,
        type: 'tarkov-loadout',
        name: (document.getElementById('presetName') || {}).value || 'loadout',
        mode: (document.getElementById('gameMode') || {}).value || 'pve',
        slots: loadout,
        savedAt: Date.now()
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (payload.name || 'loadout').replace(/[^\w\-]+/g, '_').slice(0, 40) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      status('Экспорт JSON', true);
    }
    function importLoadout(file) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result || '{}'));
          var slots = data.slots || data.loadout || data;
          if (!slots || typeof slots !== 'object') throw new Error('Нет slots в файле');
          loadout = {};
          SLOT_DEFS.forEach(function (s) {
            if (slots[s.id]) loadout[s.id] = slots[s.id];
          });
          if (data.name && document.getElementById('presetName')) {
            document.getElementById('presetName').value = data.name;
          }
          renderSlots();
          status('Импорт OK', true);
        } catch (e) {
          status(String(e.message || e), false);
        }
      };
      reader.readAsText(file);
    }
    var btnEx = document.getElementById('btnExport');
    if (btnEx) btnEx.onclick = exportLoadout;
    var btnIm = document.getElementById('btnImport');
    var fileIm = document.getElementById('importFile');
    if (btnIm && fileIm) {
      btnIm.onclick = function () { fileIm.click(); };
      fileIm.onchange = function () {
        if (fileIm.files && fileIm.files[0]) importLoadout(fileIm.files[0]);
        fileIm.value = '';
      };
    }

  })();