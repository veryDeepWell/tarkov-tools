
    /* TRADER_RU removed P4 — use TarkovDicts.traderName */
    const CAL_LABEL = (window.TarkovDicts && TarkovDicts.calibers)
      ? Object.keys(TarkovDicts.calibers).reduce((acc, k) => { acc[k] = TarkovDicts.calibers[k].label; return acc; }, {})
      : {
      Caliber556x45NATO:'5.56×45', Caliber545x39:'5.45×39', Caliber762x39:'7.62×39',
      Caliber762x51:'7.62×51', Caliber762x54R:'7.62×54R', Caliber9x19PARA:'9×19',
      Caliber9x18PM:'9×18', Caliber9x21:'9×21', Caliber46x30:'4.6×30',
      Caliber57x28:'5.7×28', Caliber9x39:'9×39', Caliber127x55:'12.7×55',
      Caliber12g:'12/70', Caliber20g:'20/70', Caliber23x75:'23×75',
      Caliber366TKM:'.366', Caliber86x70:'.338', Caliber9x33R:'.357',
      Caliber1143x23ACP:'.45', Caliber68x51:'.277 Fury', Caliber68x51mm:'6.8×51'
    };
    let rows=[], activeCal=null, sortKey='rating', sortDir=-1;

    function loadSettings(key, defaults) { return TarkovUI.loadSettings(key, defaults); }
    function saveSettings(key, obj) { TarkovUI.saveSettings(key, obj); }
    function humanize(slug) { return TarkovDicts.humanize(slug); }
    function formatNum(n) { return TarkovDicts.fmtNum(n); }
    function esc(s) { return TarkovDicts.esc(s); }

    function ttOfferMeta(o) {
      var tKey = o && o.trader;
      if (tKey && typeof tKey === "object") tKey = tKey.id || tKey.key || "";
      try {
        if (window.TarkovDicts && TarkovDicts.traders && tKey && String(tKey).length > 20) {
          var hit = TarkovDicts.traders.find(function (x) { return x.id === tKey; });
          if (hit && hit.key) tKey = hit.key;
        }
      } catch (e) {
        try { if (__ttProgress) __ttProgress.fail(e && e.message ? e.message : "Error"); } catch (ePF) {} try { console.debug && console.debug("[tt:mags]", e); } catch (_tt) { /* ignore */ } }
      var qn = o && o.taskUnlock;
      if (qn && typeof qn === "object") qn = qn.name || qn.id || "";
      return { traderKey: tKey ? String(tKey) : "", questName: qn ? String(qn) : "" };
    }

    function bestBuy(it, opts) {
      if (window.TarkovItemDomain && TarkovItemDomain.bestBuy) {
        var b = TarkovItemDomain.bestBuy(it, opts);
        if (!b) return null;
        return { price: b.price, name: b.traderName || b.name || "", traderName: b.traderName || "", traderKey: b.traderKey || "", ll: b.ll || 0, quest: !!b.quest, questName: b.questName || "" };
      }
      return null;
    }

    document.getElementById('loadBtn').onclick=async()=>{
      const btn=document.getElementById('loadBtn'), status=document.getElementById('status');
      btn.disabled=true;
      var __ttProgress = window.TarkovUI && TarkovUI.progress;
      if (__ttProgress) __ttProgress.start({ label: (window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t("common.loading") : "Loading…"), indeterminate: true }); status.className='status';
      const mode=document.getElementById('gameMode').value||'regular';
      status.textContent = (window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t("common.loading") : "Loading…");
      try{
        const items=await TarkovAPI.items(mode);
        const byId={}; items.forEach(i=>byId[i.id]=i);
        rows=[];
        items.forEach(it=>{
          const p=it.properties;
          if(!p||p.propertiesType!=='ItemPropertiesMagazine') return;
          const ammoIds=p.allowedAmmo||[];
          let cal='?';
          for(const aid of ammoIds){
            const a=byId[aid];
            if(a?.properties?.caliber){cal=a.properties.caliber;break}
          }
          const ergo=Number(p.ergonomics)||0;
          const recoil=Number(p.recoilModifier)||0;
          const malf=Number(p.malfunctionChance)||0;
          const cap=Number(p.capacity)||0;
          const buy=bestBuy(it);
          const avg=Number(it.avg24hPrice)||0;
          const rating=cap*1.2+ergo*2+(-recoil*100)*1.5-malf*50;
          rows.push({
            id:it.id, slug:it.normalizedName||'', name:humanize(it.normalizedName),
            icon:it.iconLink||it.gridImageLink||'',
            icon: it.iconLink || it.gridImageLink || '',
            cal, calLabel:CAL_LABEL[cal]||cal.replace(/^Caliber/,''),
            cap, ergo, recoil, recoilPct:recoil*100, malf, malfPct:malf*100,
            avg, buy, traderPrice:buy?buy.price:0, quest:buy?buy.quest:false, rating
          });
        });
        const cals=[...new Set(rows.map(r=>r.cal))].sort((a,b)=>(CAL_LABEL[a]||a).localeCompare(CAL_LABEL[b]||b,'ru'));
        const box=document.getElementById('cals'); box.innerHTML='';
        cals.forEach(c=>{
          const n=rows.filter(r=>r.cal===c).length;
          const chip=document.createElement('span');
          chip.className='chip'+(activeCal===c?' active':'');
          chip.textContent=(CAL_LABEL[c]||c.replace(/^Caliber/,''))+' ('+n+')';
          chip.onclick=()=>{activeCal=c; box.querySelectorAll('.chip').forEach(x=>x.classList.remove('active')); chip.classList.add('active'); render(); persist()};
          box.appendChild(chip);
        });
        if(!activeCal&&cals.length){activeCal=cals[0]; box.querySelector('.chip')?.classList.add('active')}
        document.getElementById('filters').style.display='block';
        document.getElementById('tableCard').style.display='block';
        status.className='status ok';
        status.textContent='Магазинов: '+rows.length+' · калибров: '+cals.length;
        render();
      }catch(e){
        console.error(e); status.className='status err'; status.textContent='Ошибка: '+e.message;
      }finally{btn.disabled=false}
    };

    function render(){
      const q=(document.getElementById('search').value||'').toLowerCase().trim();
      const hideQ=document.getElementById('hideQuest').checked;
      let list=rows.filter(r=>{
        if(activeCal&&r.cal!==activeCal) return false;
        if(hideQ&&r.quest) return false;
        if(r.buy&&window.TarkovProfile&&TarkovProfile.gate){
          r._gate=TarkovProfile.gate({trader:r.buy.traderKey,minLL:r.buy.ll,questLocked:!!r.quest,questName:r.buy.questName||''});
          if(TarkovProfile.lockVisibility(r._gate)==='hide') return false;
        } else r._gate={locked:false,reason:''};
        if(q&&!(r.name.toLowerCase().includes(q)||r.slug.toLowerCase().includes(q))) return false;
        return true;
      });
      list.sort((a,b)=>{
        let va=a[sortKey],vb=b[sortKey];
        if(sortKey==='quest'){va=a.quest?1:0;vb=b.quest?1:0}
        if(typeof va==='string') return sortDir*va.localeCompare(vb,'ru');
        return sortDir*((va??-999)-(vb??-999));
      });
      document.getElementById('title').textContent=(activeCal?(CAL_LABEL[activeCal]||activeCal)+' · ':'')+list.length+' шт.';
      const tbody=document.getElementById('tbody'); tbody.innerHTML='';
      list.forEach(r=>{
        const ergoCls=r.ergo>0?'pos':(r.ergo<0?'neg':'');
        const recCls=r.recoilPct<0?'pos':(r.recoilPct>0?'neg':'');
        const trader=r.buy?`${esc(r.buy.name)} LL${r.buy.ll}<br><strong>${formatNum(r.buy.price)}</strong>`:'—';
        const tr=document.createElement('tr');
        if(window.TarkovProfile&&TarkovProfile.applyLockToElement&&r._gate){
          TarkovProfile.applyLockToElement(tr,r._gate);
          if(r._gate.locked&&TarkovProfile.lockVisibility(r._gate)==='hide') return;
        }
        tr.innerHTML=`
          <td><div class="name-cell">${r.icon?`<img class="ico" src="${esc(r.icon)}" loading="lazy" alt="">`:''}<div class="txt"><div class="name">${esc(r.name)}</div><div class="meta">${esc(r.slug)}</div></div></div></td>
          <td>${esc(r.calLabel)}</td>
          <td><strong>${r.cap}</strong></td>
          <td class="${ergoCls}">${r.ergo>0?'+':''}${r.ergo}</td>
          <td class="${recCls}">${r.recoilPct>0?'+':''}${r.recoilPct.toFixed(1)}%</td>
          <td>${r.malfPct.toFixed(1)}%</td>
          <td>${r.avg?formatNum(r.avg):'—'}</td>
          <td>${trader}</td>
          <td>${r.quest?'<span class="bad">да</span>':(r.buy?'<span class="ok">нет</span>':'—')}</td>
          <td><strong>${r.rating.toFixed(1)}</strong></td>
          <td><button type="button" class="copy-btn" data-name="${esc(r.slug)}">копир.</button></td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.copy-btn').forEach(btn=>{
        btn.onclick=()=>navigator.clipboard.writeText(btn.dataset.name||'').then(()=>{const o=btn.textContent;btn.textContent='✓';setTimeout(()=>btn.textContent=o,700)});
      });
    }
    document.querySelectorAll('th[data-k]').forEach(th=>{
      th.onclick=()=>{const k=th.dataset.k; if(sortKey===k) sortDir*=-1; else{sortKey=k;sortDir=k==='name'||k==='cal'?1:-1} render()};
    });
    ['search','hideQuest'].forEach(id=>{
      document.getElementById(id).addEventListener('input',render);
      document.getElementById(id).addEventListener('change',()=>{render();persist()});
    });
    function persist(){saveSettings('tarkovMagsSettings',{hideQuest:document.getElementById('hideQuest').checked,activeCal})}
    (function(){
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(window.itemName&&window.itemName!==itemName)return window.itemName(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=(itemName(it)||'').trim();
    if(/^[a-f0-9]{20}$/i.test(s))s=(it.name&&!/^[a-f0-9]{20}$/i.test(it.name)?it.name:it.normalizedName)||s;
    return s||it.id||'';
  }
const s=loadSettings('tarkovMagsSettings',{});if(s.hideQuest)document.getElementById('hideQuest').checked=true;if(s.activeCal)activeCal=s.activeCal})();

window.render = function () {
  try {
    if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
  } catch (e0) { try { console.debug && console.debug("[tt:mags]", e0); } catch (_tt) { /* ignore */ } }
  try { if (typeof render === "function") render(); } catch (e1) { try { console.debug && console.debug("[tt:mags]", e1); } catch (_tt) { /* ignore */ } }
};
if (window.TarkovProfile && TarkovProfile.bindRefresh) {
  TarkovProfile.bindRefresh(function () { window.render(); });
}

/* R-2: gameMode from profile on load; changes write to profile */
(function () {
  function __ttBindMode() {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) {
        TarkovProfile.wireToolPage();
      } else if (window.TarkovProfile && TarkovProfile.bindGameMode) {
        var el = document.getElementById("gameMode");
        if (el) el.__ttProfileBound = false;
        TarkovProfile.bindGameMode("gameMode", { fallback: "pve" });
      }
    } catch (e) { try { console.debug && console.debug("[tt:mags]", e); } catch (_tt) { /* ignore */ } }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", __ttBindMode);
  } else {
    __ttBindMode();
  }
})();
