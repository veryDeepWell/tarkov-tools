
    const CATS = [
      { id:'gun', types:['gun'], prop:'ItemPropertiesWeapon' },
      { id:'ammo', types:['ammo'], prop:'ItemPropertiesAmmo' },
      { id:'armor', types:['armor'], prop:'ItemPropertiesArmor' },
      { id:'helmet', types:['helmet'], prop:'ItemPropertiesHelmet' },
      { id:'rig', types:['rig'], prop:'ItemPropertiesChestRig' },
      { id:'backpack', types:['backpack'], prop:'ItemPropertiesBackpack' },
      { id:'mods', types:['mods'], prop:'ItemPropertiesWeaponMod',
        subs:[
          {id:'all'},
          {id:'pistolGrip', types:['pistolGrip'], slots:['mod_pistol_grip','mod_pistolgrip']},
          {id:'stock', slots:['mod_stock','mod_stock_000']},
          {id:'handguard', slots:['mod_handguard']},
          {id:'muzzle', types:['suppressor'], slots:['mod_muzzle']},
          {id:'barrel', slots:['mod_barrel']},
          {id:'scope', slots:['mod_scope','mod_sight_front','mod_sight_rear']},
          {id:'foregrip', slots:['mod_foregrip']},
          {id:'magazine', prop:'ItemPropertiesMagazine'},
          {id:'mount', slots:['mod_mount','mod_mount_000','mod_mount_001']}
        ]
      },
      { id:'magazine', types:null, prop:'ItemPropertiesMagazine' },
      { id:'keys', types:['keys'], prop:'ItemPropertiesKey' },
      { id:'plate', types:['armorPlate'], prop:'ItemPropertiesArmorAttachment' },
      { id:'meds', types:['meds'], prop:null },
      { id:'barter', types:['barter'], prop:null }
    ];

    let allItems=[], itemsById={}, activeCat='gun', activeSub='all', selected=[];
    let statusState = { key: 'tool.compare.ui.loadPrompt', params: null, tone: '' };
    // modId -> weapon ids that can equip it directly or through a one-level adapter
    let modToWeapons = {};

    function humanize(slug) { return TarkovDicts.humanize(slug); }
    function formatNum(n) { return TarkovDicts.fmtNum(n); }
    function esc(s) { return TarkovDicts.esc(s); }
    function t(key, params) { return TarkovI18n.t(key, params); }
    function renderStatus() {
      const status = document.getElementById('status');
      status.className = 'status' + (statusState.tone ? ' ' + statusState.tone : '');
      status.textContent = t(statusState.key, statusState.params);
    }
    function setStatus(key, params, tone) {
      statusState = { key, params, tone: tone || '' };
      renderStatus();
    }
    function bestBuy(it){
      let best=null;
      (it.buyFromTrader||[]).forEach(o=>{
        const price=Number(o.priceRUB!=null?o.priceRUB:o.price)||0;
        if(!price) return;
        if(!best||price<best.price) best={price,name:TarkovDicts.traderName(o.trader)||t('tool.compare.ui.trader'),ll:Number(o.minTraderLevel)||0,quest:!!o.taskUnlock};
      });
      return best;
    }

    function buildCompatIndex(){
      modToWeapons = TarkovWeaponDomain.buildCompatibility(allItems).modToWeapons;
    }

    function inCat(it, cat, sub){
      const types=it.types||[];
      const p=it.properties||{};
      if(cat.id==='mods' && sub && sub.id!=='all'){
        if(sub.prop && p.propertiesType===sub.prop) return true;
        if(sub.types && sub.types.some(t=>types.includes(t))) return true;
        // slot-based: item appears as allowed in those slots somewhere
        if(sub.slots){
          // check if this mod's id is used in those slot names on any gun - expensive; use types or prop
          // fallback: name heuristics for subcategory when types missing
          if(sub.id==='stock' && types.some(t=>/stock|butt/i.test(t))) return true;
        }
        // For mods subcats without types: include if propertiesType is WeaponMod and passes search later
        // Better: index reverse by slot when building - for now use type tags + prop
        if(sub.id==='pistolGrip') return types.includes('pistolGrip');
        if(sub.id==='magazine') return p.propertiesType==='ItemPropertiesMagazine';
        if(sub.id==='muzzle') return types.includes('suppressor') || /muzzle|suppressor|brake/i.test(it.normalizedName||'');
        if(sub.id==='scope') return /scope|sight|optic|reflex|holographic/i.test(it.normalizedName||'') || types.includes('mods') && /sight|scope/i.test((it.normalizedName||''));
        if(sub.id==='handguard') return /handguard|hand-guard/i.test(it.normalizedName||'');
        if(sub.id==='barrel') return /barrel/i.test(it.normalizedName||'');
        if(sub.id==='foregrip') return /foregrip|fore-grip|tactical-grip/i.test(it.normalizedName||'');
        if(sub.id==='stock') return /stock|buttstock|buffer-tube/i.test(it.normalizedName||'');
        if(sub.id==='mount') return /mount|adapter|rail/i.test(it.normalizedName||'');
        return false;
      }
      if(cat.prop && p.propertiesType===cat.prop) return true;
      if(cat.types && cat.types.some(t=>types.includes(t))){
        if(cat.id==='ammo' && types.includes('grenade')) return false;
        if(cat.id==='mods' && types.includes('preset')) return false;
        return true;
      }
      return false;
    }

    function matchesWeaponFilter(it, q){
      if(!q) return true;
      const set=modToWeapons[it.id];
      if(!set||!set.length) return false;
      // q matches weapon normalizedName
      for(const wid of set){
        if (!TarkovWeaponDomain.compat(wid, it.id)) continue;
        const w=itemsById[wid];
        if(!w) continue;
        const slug=(w.normalizedName||'').toLowerCase();
        if(slug.includes(q)) return true;
      }
      return false;
    }

    function statsFor(it, catId){
      const p=it.properties||{};
      const buy=bestBuy(it);
      const avg=Number(it.avg24hPrice)||0;
      const base={
        [t('tool.compare.ui.stat.fleaAverage')]:{v:avg||null,better:'lower'},
        [t('tool.compare.ui.stat.traderPrice')]:{v:buy?buy.price:null,better:'lower'},
        [t('tool.compare.ui.stat.traderOffer')]:{v:buy?(buy.name+' LL'+buy.ll+(buy.quest?' '+t('tool.compare.ui.quest'):'')):'—',better:'text'},
        [t('tool.compare.ui.stat.weight')]:{v:it.weight!=null?Number(it.weight):null,better:'lower'}
      };
      if(catId==='gun'||p.propertiesType==='ItemPropertiesWeapon')
        return Object.assign(base,{[t('tool.compare.ui.stat.caliber')]:{v:TarkovDicts.caliberLabel(p.caliber)||'—',better:'text'},[t('tool.compare.ui.stat.ergonomics')]:{v:Number(p.ergonomics)||0,better:'higher'},[t('tool.compare.ui.stat.verticalRecoil')]:{v:Number(p.recoilVertical)||0,better:'lower'},[t('tool.compare.ui.stat.horizontalRecoil')]:{v:Number(p.recoilHorizontal)||0,better:'lower'},[t('tool.compare.ui.stat.fireRate')]:{v:Number(p.fireRate)||null,better:'higher'},[t('tool.compare.ui.stat.range')]:{v:Number(p.effectiveDistance)||null,better:'higher'}});
      if(catId==='ammo'||p.propertiesType==='ItemPropertiesAmmo')
        return Object.assign(base,{[t('tool.compare.ui.stat.penetration')]:{v:Number(p.penetrationPower)||0,better:'higher'},[t('tool.compare.ui.stat.damage')]:{v:Number(p.damage)||0,better:'higher'},[t('tool.compare.ui.stat.armorDamage')]:{v:Number(p.armorDamage)||0,better:'higher'},[t('tool.compare.ui.stat.fragmentation')]:{v:Math.round((Number(p.fragmentationChance)||0)*100),better:'higher'}});
      if(['armor','helmet','plate'].includes(catId)||['ItemPropertiesArmor','ItemPropertiesHelmet','ItemPropertiesArmorAttachment'].includes(p.propertiesType))
        return Object.assign(base,{[t('tool.compare.ui.stat.class')]:{v:Number(p.class)||null,better:'higher'},[t('tool.compare.ui.stat.durability')]:{v:Number(p.durability)||null,better:'higher'},[t('tool.compare.ui.stat.type')]:{v:p.armorType||p.material||'—',better:'text'}});
      if(['rig','backpack'].includes(catId))
        return Object.assign(base,{[t('tool.compare.ui.stat.slots')]:{v:Number(p.capacity)||null,better:'higher'}});
      if(catId==='magazine'||p.propertiesType==='ItemPropertiesMagazine'||activeSub==='magazine')
        return Object.assign(base,{[t('tool.compare.ui.stat.capacity')]:{v:Number(p.capacity)||0,better:'higher'},[t('tool.compare.ui.stat.ergonomics')]:{v:Number(p.ergonomics)||0,better:'higher'},[t('tool.compare.ui.stat.recoil')]:{v:(Number(p.recoilModifier)||0)*100,better:'lower',fmt:v=>v.toFixed(1)+'%'}});
      if(catId==='mods'||p.propertiesType==='ItemPropertiesWeaponMod')
        return Object.assign(base,{[t('tool.compare.ui.stat.ergonomics')]:{v:Number(p.ergonomics)||0,better:'higher'},[t('tool.compare.ui.stat.recoil')]:{v:(Number(p.recoilModifier)||0)*100,better:'lower',fmt:v=>v.toFixed(1)+'%'},[t('tool.compare.ui.stat.accuracy')]:{v:(Number(p.accuracyModifier)||0)*100,better:'higher',fmt:v=>v.toFixed(1)+'%'}});
      if(catId==='keys') return Object.assign(base,{[t('tool.compare.ui.stat.uses')]:{v:Number(p.uses)||null,better:'higher'}});
      return base;
    }

    document.getElementById('loadBtn').onclick=async()=>{
      const btn=document.getElementById('loadBtn');
      btn.disabled=true; setStatus('tool.compare.ui.loading');
      try{
        const mode=document.getElementById('gameMode').value||'regular';
        allItems=await TarkovAPI.items(mode); itemsById={}; allItems.forEach(i=>itemsById[i.id]=i);
        setStatus('tool.compare.ui.indexing');
        buildCompatIndex();
        document.getElementById('catCard').style.display='block';
        document.getElementById('main').style.display='grid';
        setStatus('tool.compare.ui.loaded', { count: allItems.length }, 'ok');
        renderCats(); renderSubs(); renderPick(); renderCompare();
      }catch(e){ setStatus('tool.compare.ui.loadError', { message: e.message }, 'err'); }
      finally{ btn.disabled=false; }
    };

    function renderCats(){
      const el=document.getElementById('cats'); el.innerHTML='';
      CATS.forEach(c=>{
        const chip=document.createElement('span');
        chip.className='chip'+(activeCat===c.id?' active':'');
        chip.textContent=t('tool.compare.ui.categoryLabel.' + c.id);
        chip.onclick=()=>{activeCat=c.id;activeSub='all';selected=[];renderCats();renderSubs();renderPick();renderCompare()};
        el.appendChild(chip);
      });
      document.getElementById('weaponFilterField').style.display=activeCat==='mods'?'block':'none';
    }
    function renderSubs(){
      const cat=CATS.find(c=>c.id===activeCat);
      const wrap=document.getElementById('subWrap');
      if(!cat||!cat.subs){wrap.style.display='none';return}
      wrap.style.display='block';
      const el=document.getElementById('subs'); el.innerHTML='';
      cat.subs.forEach(s=>{
        const chip=document.createElement('span');
        chip.className='chip sub'+(activeSub===s.id?' active':'');
        chip.textContent=t('tool.compare.ui.subcategoryLabel.' + s.id);
        chip.onclick=()=>{activeSub=s.id;selected=[];renderSubs();renderPick();renderCompare()};
        el.appendChild(chip);
      });
    }

    function catItems(){
      const cat=CATS.find(c=>c.id===activeCat); if(!cat) return [];
      const sub=cat.subs?cat.subs.find(s=>s.id===activeSub):null;
      const q=(document.getElementById('search').value||'').toLowerCase().trim();
      const wq=(document.getElementById('weaponFilter').value||'').toLowerCase().trim();
      return allItems.filter(it=>{
        if(!inCat(it,cat,sub)) return false;
        if(q){
          const slug=(it.normalizedName||'').toLowerCase();
          const sn=(it.shortName||'').toLowerCase();
          if(!slug.includes(q)&&!sn.includes(q)&&!humanize(slug).toLowerCase().includes(q)) return false;
        }
        if(activeCat==='mods'&&wq&&!matchesWeaponFilter(it,wq)) return false;
        return true;
      }).sort((a,b)=>(a.normalizedName||'').localeCompare(b.normalizedName||'')).slice(0,500);
    }

    function renderPick(){
      const list=catItems();
      document.getElementById('pickCount').textContent=t('tool.compare.ui.pickCount', { count: list.length, selected: selected.length });
      const el=document.getElementById('pickList'); el.innerHTML='';
      list.forEach(it=>{
        const sel=selected.includes(it.id);
        const div=document.createElement('div');
        div.className='pick-item'+(sel?' selected':'');
        const icon=it.iconLink||it.gridImageLink||'';
        div.innerHTML=`<input type="checkbox" ${sel?'checked':''}>
          ${icon?`<img class="ico ico-sm" src="${esc(icon)}" loading="lazy" alt="">`:''}
          <div style="min-width:0"><div class="name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(humanize(it.normalizedName))}</div>
          <div class="meta">${esc(it.normalizedName||'')}</div></div>`;
        div.onclick=e=>{if(e.target.tagName!=='INPUT') toggle(it.id)};
        div.querySelector('input').onchange=()=>toggle(it.id);
        el.appendChild(div);
      });
    }
    function toggle(id){
      const i=selected.indexOf(id);
      if(i>=0) selected.splice(i,1); else selected.push(id);
      renderPick(); renderCompare();
    }

    function renderCompare(){
      const bar=document.getElementById('selectedBar'), wrap=document.getElementById('compareWrap');
      bar.innerHTML='';
      if(!selected.length){wrap.innerHTML='<div class="empty">'+esc(t('tool.compare.ui.emptySelection'))+'</div>';return}
      const items=selected.map(id=>itemsById[id]).filter(Boolean);
      items.forEach(it=>{
        const chip=document.createElement('div'); chip.className='sel-chip';
        const icon=it.iconLink||it.gridImageLink||'';
        chip.innerHTML=`${icon?`<img src="${esc(icon)}" alt="">`:''}<span>${esc(humanize(it.normalizedName))}</span><button type="button">×</button>`;
        chip.querySelector('button').onclick=()=>toggle(it.id);
        bar.appendChild(chip);
      });
      const rowsMap={};
      items.forEach((it,idx)=>{
        const st=statsFor(it,activeCat);
        Object.entries(st).forEach(([label,cell])=>{
          if(!rowsMap[label]) rowsMap[label]=[];
          rowsMap[label][idx]=cell;
        });
      });
      let html='<table class="compare"><thead><tr><th class="row-label">'+esc(t('tool.compare.ui.parameter'))+'</th>';
      items.forEach(it=>{
        const icon=it.iconLink||it.gridImageLink||'';
        const slug=it.normalizedName||'';
        html+=`<th class="head-cell">${icon?`<img class="ico ico-lg" src="${esc(icon)}" loading="lazy" alt="">`:''}<div class="nm">${esc(humanize(slug))}</div>
          <button type="button" class="copy-btn" data-name="${esc(slug)}">${esc(t('tool.compare.ui.copy'))}</button>
          <div><button type="button" class="remove-btn" data-id="${it.id}">${esc(t('tool.compare.ui.remove'))}</button></div></th>`;
      });
      html+='</tr></thead><tbody>';
      Object.keys(rowsMap).forEach(label=>{
        const cells=rowsMap[label];
        const nums=cells.map(c=>c&&typeof c.v==='number'?c.v:null);
        const better=(cells.find(c=>c&&c.better&&c.better!=='text')||{}).better;
        let best=null,worst=null;
        if(better==='higher'||better==='lower'){
          const valid=nums.filter(n=>n!=null&&!Number.isNaN(n));
          if(valid.length){best=better==='higher'?Math.max(...valid):Math.min(...valid);worst=better==='higher'?Math.min(...valid):Math.max(...valid)}
        }
        html+=`<tr><td class="row-label">${esc(label)}</td>`;
        cells.forEach(c=>{
          if(!c){html+='<td>—</td>';return}
          let text=c.fmt&&typeof c.v==='number'?c.fmt(c.v):(typeof c.v==='number'?formatNum(c.v):(c.v==null?'—':String(c.v)));
          let cls='';
          if(typeof c.v==='number'&&best!=null&&cells.filter(x=>x&&typeof x.v==='number').length>1){
            if(c.v===best&&best!==worst) cls='best';
            else if(c.v===worst&&best!==worst) cls='worst';
          }
          html+=`<td class="${cls}">${esc(text)}</td>`;
        });
        html+='</tr>';
      });
      html+='</tbody></table>';
      wrap.innerHTML=html;
      wrap.querySelectorAll('.copy-btn').forEach(btn=>btn.onclick=()=>navigator.clipboard.writeText(btn.dataset.name||'').then(()=>{const o=btn.textContent;btn.textContent='✓';setTimeout(()=>btn.textContent=o,700)}));
      wrap.querySelectorAll('.remove-btn').forEach(btn=>btn.onclick=()=>toggle(btn.dataset.id));
    }

    document.getElementById('search').oninput=renderPick;
    document.getElementById('weaponFilter').oninput=renderPick;
    document.getElementById('clearSel').onclick=()=>{selected=[];renderPick();renderCompare()};
    window.addEventListener('tt-lang-changed', () => {
      renderStatus();
      if (allItems.length) {
        renderCats();
        renderSubs();
        renderPick();
        renderCompare();
      }
    });


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
})();
