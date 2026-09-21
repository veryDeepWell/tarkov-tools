
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

    var STYLES = [
      { id:'wild', title:'Дикий хуебес', desc:'чёрный / красный / олив', colors:['black','red','olive','yellow'] },
      { id:'pro', title:'Профессионал', desc:'чёрный / серый', colors:['black','grey','blue'] },
      { id:'forest', title:'Лесное чучело', desc:'олива / зелёный / коричневый', colors:['olive','green','brown','violet'] },
      { id:'snow', title:'Снежный призрак', desc:'белый / серый', colors:['white','grey'] },
      { id:'desert', title:'Песок', desc:'жёлтый / коричневый', colors:['yellow','brown','orange'] },
      { id:'raider', title:'Рейдер', desc:'чёрный / фиолет', colors:['black','violet','red'] },
      { id:'medic', title:'Полевой медик', desc:'белый / красный / синий', colors:['white','red','blue'] },
      { id:'gold', title:'Флекс', desc:'жёлтый / оранж / красный', colors:['yellow','orange','red'] }
    ];
    var styleId = 'pro', pool = null;
    function esc(s){ return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/"/g,'"'); }
    function status(m,ok){ var el=document.getElementById('status'); el.className='status'+(ok===true?' ok':ok===false?' err':''); el.textContent=m; }
    function pick(arr){ if(!arr||!arr.length) return null; return arr[Math.floor(Math.random()*arr.length)]; }
    function priceOf(it){ return it ? (Number(it.avg24hPrice)||Number(it.lastLowPrice)||0) : 0; }
    function pdCell(cls, lab, it) {
      if (!it) return '<div class="pd-slot empty '+cls+'"><div class="lab">'+esc(lab)+'</div>—</div>';
      var pr = priceOf(it);
      return '<div class="pd-slot '+cls+'"><div class="lab">'+esc(lab)+'</div>'+(it.iconLink?'<img src="'+esc(it.iconLink)+'" alt="">':'')+'<div class="nm">'+esc(itemName(it))+'</div><div class="pr">'+(pr?pr.toLocaleString('ru-RU')+' ₽':'')+'</div></div>';
    }
    function renderPaperdoll(s) {
      var sum = ['gun','armor','helmet','rig','backpack','headset','glasses'].reduce(function(a,k){ return a+priceOf(s[k]); },0);
      document.getElementById('paperdoll').innerHTML =
        pdCell('pd-headset','Наушники',s.headset)+pdCell('pd-helmet','Шлем',s.helmet)+pdCell('pd-glasses','Очки',s.glasses)+
        pdCell('pd-gun','Оружие',s.gun)+pdCell('pd-armor','Броня',s.armor)+pdCell('pd-rig','Разгрузка',s.rig)+
        pdCell('pd-backpack','Рюкзак',s.backpack)+pdCell('pd-sec','Вторичка',s.sec)+
        '<div class="pd-total">Итого ~ '+sum.toLocaleString('ru-RU')+' ₽</div>';
    }
    document.getElementById('styles').innerHTML = STYLES.map(function(s){
      return '<button type="button" class="style-chip'+(s.id===styleId?' active':'')+'" data-id="'+s.id+'"><div class="t">'+esc(s.title)+'</div><div class="d">'+esc(s.desc)+'</div></button>';
    }).join('');
    document.getElementById('styles').onclick = function(e){
      var b = e.target.closest('.style-chip'); if(!b) return;
      styleId = b.getAttribute('data-id');
      document.querySelectorAll('.style-chip').forEach(function(c){ c.classList.toggle('active', c===b); });
    };
    async function ensure() {
      if (pool) return pool;
      status('Гружу…');
      var mode = document.getElementById('gameMode').value || 'pve';
      var arr = await TarkovAPI.items(mode);
      pool = arr; status('Предметов: ' + arr.length, true); return pool;
    }
    function byColor(items, colors, pred) {
      var set = {}; colors.forEach(function(c){ set[c]=1; });
      var matched = items.filter(function(it){ return pred(it) && set[(it.backgroundColor||'').toLowerCase()]; });
      return matched.length ? matched : items.filter(pred);
    }
    function isGun(it){ return (it.types||[]).includes('gun') && !(it.types||[]).includes('preset') && (it.properties||{}).propertiesType==='ItemPropertiesWeapon'; }
    function isArmor(it){ return (it.types||[]).includes('armor') || (it.properties||{}).propertiesType==='ItemPropertiesArmor'; }
    function isHelm(it){ return (it.types||[]).includes('helmet') || (it.properties||{}).propertiesType==='ItemPropertiesHelmet'; }
    function isRig(it){ return (it.types||[]).includes('rig') || (it.properties||{}).propertiesType==='ItemPropertiesChestRig'; }
    function isBack(it){ return (it.types||[]).includes('backpack') || (it.properties||{}).propertiesType==='ItemPropertiesBackpack'; }
    function isHeadset(it){ return (it.types||[]).includes('headphones') || (it.properties||{}).propertiesType==='ItemPropertiesHeadphone'; }
    function isGlasses(it){ return (it.types||[]).includes('glasses') || (it.properties||{}).propertiesType==='ItemPropertiesGlasses'; }
    async function go() {
      var items = await ensure();
      var st = STYLES.find(function(s){ return s.id===styleId; }) || STYLES[0];
      renderPaperdoll({
        gun: pick(byColor(items, st.colors, isGun)),
        armor: pick(byColor(items, st.colors, isArmor)),
        helmet: pick(byColor(items, st.colors, isHelm)),
        rig: pick(byColor(items, st.colors, isRig)),
        backpack: pick(byColor(items, st.colors, isBack)),
        headset: pick(byColor(items, st.colors, isHeadset)),
        glasses: pick(byColor(items, st.colors, isGlasses)),
        sec: null
      });
      status(st.title + ' · ' + st.colors.join(', '), true);
    }
    document.getElementById('btnGo').onclick = function(){ go().catch(function(e){ status(String(e.message||e), false); }); };
    document.getElementById('gameMode').onchange = function(){ pool = null; };
  })();
  