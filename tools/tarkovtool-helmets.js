

    const KEY = 'tarkovHelmets';
    let rows = [];
    let sortKey = 'cls', sortDir = -1;
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    function fmt(n){if(n==null||n===0)return '—'; return Math.round(n).toLocaleString('ru-RU');}
    function humanize(slug){return (slug||'').replace(/-/g,' ');}

    let tipEl;
    function ensureTip(){if(tipEl)return tipEl; tipEl=document.createElement('div'); tipEl.className='tip'; document.body.appendChild(tipEl); return tipEl;}
    function showTip(r,e){
      const el=ensureTip();
      const grid=[
        ['Ricochet X', r.rx],['Ricochet Y', r.ry],['Ricochet Z', r.rz],
        ['Blunt throughput', r.blunt],
        ['Repair cost', r.repair],
        ['Blocks eyewear', r.blocksEye?'да':'нет'],
        ['Blocks headwear', r.blocksHead?'да':'нет'],
        ['Тип', r.armorType||'—'],
        ['Слоты брони', r.slotCount],
      ];
      el.innerHTML=`<div class="tip-title">${esc(r.name)}</div><div class="tip-grid">${grid.map(([k,v])=>`<span class="k">${esc(k)}</span><span class="v">${esc(String(v??'—'))}</span>`).join('')}</div>`;
      el.style.display='block';
      let x=e.clientX+14,y=e.clientY+14;
      el.style.left=x+'px'; el.style.top=y+'px';
      const rect=el.getBoundingClientRect();
      if(x+rect.width>innerWidth-8) el.style.left=(innerWidth-rect.width-8)+'px';
      if(y+rect.height>innerHeight-8) el.style.top=(innerHeight-rect.height-8)+'px';
    }
    function hideTip(){if(tipEl)tipEl.style.display='none';}

    function render(){
      const q=(document.getElementById('q').value||'').toLowerCase();
      const minC=Number(document.getElementById('minClass').value)||0;
      let list=rows.filter(r=>{
        if(r.cls<minC) return false;
        if(!q) return true;
        return (r.name+r.slug+r.mat+(r.zones||'').join(' ')).toLowerCase().includes(q);
      });
      list.sort((a,b)=>{
        const va=a[sortKey], vb=b[sortKey];
        if(typeof va==='string') return sortDir*String(va).localeCompare(String(vb));
        return sortDir*((va||0)-(vb||0));
      });
      const tb=document.getElementById('tbody');
      tb.innerHTML=list.map(r=>`<tr>
        <td><div class="name-cell" data-i="${esc(r.id)}">${r.icon?`<img class="ico" src="${esc(r.icon)}" loading="lazy">`:''}<div><div class="name">${esc(r.name)}</div><div class="meta">${esc(r.slug)}</div></div></div></td>
        <td><strong>${r.cls||'—'}</strong></td>
        <td>${r.dur||'—'}</td>
        <td>${esc(r.mat||'—')}</td>
        <td class="meta">${esc((r.zones||[]).join(', ')||'—')}</td>
        <td>${r.ergo}</td>
        <td>${r.turn}</td>
        <td>${r.speed}</td>
        <td>${r.blind!=null?Math.round(r.blind*100)+'%':'—'}</td>
        <td>${fmt(r.avg)}</td>
        <td><button type="button" class="copy-btn" data-n="${esc(r.slug)}">копир.</button></td>
      </tr>`).join('');
      const byId=Object.fromEntries(list.map(r=>[r.id,r]));
      tb.querySelectorAll('.name-cell').forEach(cell=>{
        const r=byId[cell.getAttribute('data-i')];
        if(!r)return;
        cell.onmouseenter=cell.onmousemove=e=>showTip(r,e);
        cell.onmouseleave=hideTip;
      });
      tb.querySelectorAll('.copy-btn').forEach(b=>{
        b.onclick=()=>navigator.clipboard.writeText(b.dataset.n||'');
      });
    }

    document.getElementById('loadBtn').onclick=async()=>{
      const st=document.getElementById('status');
      const btn=document.getElementById('loadBtn');
      btn.disabled=true; st.textContent='Гружу…'; st.className='status';
      try{
        const mode=document.getElementById('gameMode').value||'pve';
        const res=await fetch('https://json.tarkov.dev/'+mode+'/items',{cache:'no-store'});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const json=await res.json();
        let raw=json?.data?.items; const arr=Array.isArray(raw)?raw:Object.values(raw||{});
        rows=[];
        arr.forEach(it=>{
          const p=it.properties||{};
          const pt=p.propertiesType||'';
          if(pt!=='ItemPropertiesHelmet' && pt!=='ItemPropertiesHeadwear') return;
          // skip pure cosmetic without class if headwear without armor
          if(pt==='ItemPropertiesHeadwear' && !p.class && !p.ricochetX) return;
          rows.push({
            id:it.id,
            slug:it.normalizedName||'',
            name:it.shortName||humanize(it.normalizedName),
            icon:it.iconLink||it.gridImageLink||'',
            cls:Number(p.class)||0,
            dur:Number(p.durability)||0,
            mat:p.material||'',
            zones:p.zones||[],
            ergo:Number(p.ergoPenalty)||0,
            turn:Number(p.turnPenalty)||0,
            speed:Number(p.speedPenalty)||0,
            blind:p.blindnessProtection!=null?Number(p.blindnessProtection):null,
            avg:Number(it.avg24hPrice)||0,
            rx:p.ricochetX, ry:p.ricochetY, rz:p.ricochetZ,
            blunt:p.bluntThroughput, repair:p.repairCost,
            blocksEye:!!p.blocksEyewear, blocksHead:!!p.blocksHeadwear,
            armorType:p.armorType||'',
            slotCount:(p.armorSlots||p.slots||[]).length||0
          });
        });
        document.getElementById('tableCard').style.display='block';
        st.className='status ok'; st.textContent='Шлемов: '+rows.length;
        render();
        try{localStorage.setItem(KEY, JSON.stringify({mode}));}catch(e){}
      }catch(e){st.className='status err'; st.textContent=e.message;}
      finally{btn.disabled=false;}
    };
    document.getElementById('q').oninput=render;
    document.getElementById('minClass').onchange=render;
    document.querySelectorAll('#tbl th[data-k]').forEach(th=>{
      th.onclick=()=>{const k=th.dataset.k; if(sortKey===k)sortDir*=-1; else{sortKey=k;sortDir=k==='name'?1:-1;} render();};
    });

  