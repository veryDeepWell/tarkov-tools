
    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
    document.getElementById('loadBtn').onclick=async()=>{
      const status=document.getElementById('status'); status.textContent='Гружу…';
      try{
        const mode=document.getElementById('gameMode').value||'pve';
        const items=await TarkovAPI.items(mode);
        const meds=[];
        items.forEach(it=>{
          const p=it.properties||{};
          if(!['ItemPropertiesMedKit','ItemPropertiesMedicalItem','ItemPropertiesPainkiller'].includes(p.propertiesType)) return;
          const hp=Number(p.hitpoints)||Number(p.maxHpResource)||Number(p.hpResource)||0;
          const use=Number(p.useTime)||0;
          const cells=Math.max(1,(Number(it.height)||1)*(Number(it.width)||1));
          const avg=Number(it.avg24hPrice)||0;
          const hpPerCell=hp/cells;
          const pricePerHp=hp>0&&avg>0?avg/hp:null;
          let score=hpPerCell*2-use*3;
          if(pricePerHp!=null) score-=Math.log10(pricePerHp+1);
          if(p.propertiesType==='ItemPropertiesPainkiller') score+=8;
          meds.push({slug:it.normalizedName||'',name:humanize(it.normalizedName),icon:it.iconLink||it.gridImageLink||'',avg,hp,use,cells,hpPerCell,pricePerHp,score:Math.round(score*10)/10,type:p.propertiesType.replace('ItemProperties','')});
        });
        meds.sort((a,b)=>b.score-a.score);
        status.className='status ok'; status.textContent='Медов: '+meds.length;
        const body=document.getElementById('medBody'); body.innerHTML='';
        meds.forEach(m=>{
          const tr=document.createElement('tr');
          tr.innerHTML=`<td class="score">${m.score}</td>
            <td><div class="name-cell">${m.icon?`<img class="ico" src="${esc(m.icon)}" loading="lazy" alt="">`:''}<div><div class="name">${esc(m.name)}</div><div class="meta">${esc(m.slug)}</div></div></div></td>
            <td>${esc(m.type)}</td>
            <td>${m.hp?(m.hpPerCell.toFixed(0)+' ('+m.hp+'/'+m.cells+')'):'—'}</td>
            <td>${m.use?m.use+'s':'—'}</td>
            <td>${m.pricePerHp!=null?formatNum(m.pricePerHp):'—'}</td>
            <td>${m.avg?formatNum(m.avg):'—'}</td>
            <td><button type="button" class="copy-btn" data-n="${esc(m.slug)}">копир.</button></td>`;
          body.appendChild(tr);
        });
        body.querySelectorAll('.copy-btn').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.n||''));
      }catch(e){status.className='status err'; status.textContent=e.message}
    };
  


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
  const def = TarkovStorage.get(KEY, 'pve') || 'pve';
  document.querySelectorAll('select#gameMode').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => { try { TarkovStorage.set(KEY, sel.value); } catch(e) {} });
  });
})();
