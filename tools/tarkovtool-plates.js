
    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
    document.getElementById('loadBtn').onclick=async()=>{
      const status=document.getElementById('status'); status.textContent='Гружу…';
      try{
        const mode=document.getElementById('gameMode').value||'pve';
        const items=await TarkovAPI.items(mode);
        const plates = TarkovItemViewModels.plates(items);
        status.className='status ok'; status.textContent='Плит: '+plates.length;
        const body=document.getElementById('plateBody'); body.innerHTML='';
        plates.forEach(p=>{
          const tr=document.createElement('tr');
          tr.innerHTML=`<td class="score">${p.score}</td>
            <td><div class="name-cell">${p.icon?`<img class="ico" src="${esc(p.icon)}" loading="lazy" alt="">`:''}<div><div class="name">${esc(p.name)}</div><div class="meta">${esc(p.slug)}</div></div></div></td>
            <td>${p.cls}</td><td>${p.dur}</td><td>${p.weight.toFixed(2)}</td>
            <td>${formatNum(p.repair)}</td><td>${p.pen.toFixed(2)}</td>
            <td>${p.avg?formatNum(p.avg):'—'}</td>
            <td><button type="button" class="copy-btn" data-n="${esc(p.slug)}">копир.</button></td>`;
          body.appendChild(tr);
        });
        body.querySelectorAll('.copy-btn').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.n||''));
      }catch(e){status.className='status err'; status.textContent=e.message}
    };
  


(function(){
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

  const KEY = 'tarkovPreferredGameMode';
  const def = TarkovStorage.get(KEY, 'pve') || 'pve';
  document.querySelectorAll('select#gameMode').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => { try { TarkovStorage.set(KEY, sel.value); } catch(e) {} });
  });
})();
