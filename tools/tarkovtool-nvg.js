
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    return String(it.shortName||it.name||it.normalizedName||it.id||'').trim();
  }

    let rows=[], sortKey='score', sortDir=-1;
    var STORE='tarkovtool-nvg-settings';
    function esc(s){
      if(window.TarkovUI&&TarkovUI.esc)return TarkovUI.esc(s);
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function fmt(n){if(!n)return '—'; return Math.round(n).toLocaleString('ru-RU');}
    function humanize(slug){return (slug||'').replace(/-/g,' ');}
    function persist(mode){
      try{TarkovStorage.setJson(STORE,{mode:mode||((document.getElementById('gameMode')||{}).value)||'pve'});}catch(e){}
    }
    function render(){
      const q=(document.getElementById('q').value||'').toLowerCase();
      let list=rows.filter(r=>!q||(r.name+r.slug).toLowerCase().includes(q));
      list.sort((a,b)=>{
        const va=a[sortKey],vb=b[sortKey];
        if(typeof va==='string') return sortDir*String(va).localeCompare(String(vb));
        return sortDir*((va||0)-(vb||0));
      });
      document.getElementById('tbody').innerHTML=list.map(r=>`<tr>
        <td><div class="name-cell">${r.icon?`<img class="ico" src="${esc(r.icon)}" loading="lazy">`:''}<div><div class="name">${esc(r.name)}</div><div class="meta">${esc(r.slug)}</div></div></div></td>
        <td><strong>${r.intensity}</strong></td>
        <td>${r.noise}</td>
        <td>${r.noiseScale}</td>
        <td>${r.diffuse}</td>
        <td><strong>${r.score.toFixed(2)}</strong></td>
        <td>${fmt(r.avg)}</td>
        <td>${r.weight}</td>
        <td><button type="button" class="copy-btn" data-n="${esc(r.slug)}">копир.</button></td>
      </tr>`).join('');
      document.querySelectorAll('.copy-btn').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.n||''));
    }
    document.getElementById('loadBtn').onclick=async()=>{
      const st=document.getElementById('status'), btn=document.getElementById('loadBtn');
      btn.disabled=true; st.textContent='Гружу…'; st.className='status';
      try{
        const mode=document.getElementById('gameMode').value||'pve';
        const arr=await TarkovAPI.items(mode);
        rows=[];
        arr.forEach(it=>{
          const p=it.properties||{};
          if(p.propertiesType!=='ItemPropertiesNightVision') return;
          const intensity=Number(p.intensity)||0;
          const noise=Number(p.noiseIntensity)||0;
          const noiseScale=Number(p.noiseScale)||0;
          const diffuse=Number(p.diffuseIntensity)||0;
          rows.push({
            id:it.id, slug:it.normalizedName||'', name:itemName(it)||humanize(it.normalizedName),
            icon:it.iconLink||it.gridImageLink||'',
            intensity, noise, noiseScale, diffuse,
            score: intensity - noise*10 - diffuse*5,
            avg:Number(it.avg24hPrice)||0,
            weight:Number(it.weight)||0
          });
        });
        persist(mode);
        document.getElementById('tableCard').style.display='block';
        st.className='status ok'; st.textContent='ПНВ: '+rows.length;
        render();
      }catch(e){st.className='status err'; st.textContent=e.message;}
      finally{btn.disabled=false;}
    };
    document.getElementById('q').oninput=render;
    document.querySelectorAll('#tbl th[data-k]').forEach(th=>{
      th.onclick=()=>{const k=th.dataset.k; if(sortKey===k)sortDir*=-1; else{sortKey=k;sortDir=k==='name'?1:-1;} render();};
    });
    (function(){
      const KEY='tarkovPreferredGameMode';
      const def=TarkovStorage.get(KEY,'pve')||'pve';
      document.querySelectorAll('select#gameMode').forEach(sel=>{
        if([...sel.options].some(o=>o.value===def)) sel.value=def;
        sel.addEventListener('change',()=>{ try{ TarkovStorage.set(KEY, sel.value); }catch(e){} });
      });
    })();
