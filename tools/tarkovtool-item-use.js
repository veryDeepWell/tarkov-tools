
    let items=[], byId={}, crafts=[], hideoutStations=[], tasks=[];
    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    document.getElementById('loadBtn').onclick=async()=>{
      const st=document.getElementById('status'); st.className='status'; st.textContent='Гружу…';
      try{
        const mode=document.getElementById('gameMode').value||'pve';
        const [ji,jc,jh,jt]=await Promise.all([
          fetch('https://json.tarkov.dev/'+mode+'/items').then(r=>r.json()),
          fetch('https://json.tarkov.dev/'+mode+'/crafts').then(r=>r.json()),
          fetch('https://json.tarkov.dev/'+mode+'/hideout').then(r=>r.json()),
          fetch('https://json.tarkov.dev/'+mode+'/tasks').then(r=>r.json())
        ]);
        let raw=ji?.data?.items; items=Array.isArray(raw)?raw:Object.values(raw||{});
        byId={}; items.forEach(i=>byId[i.id]=i);
        let cr=jc?.data?.crafts??jc?.data??jc; crafts=Array.isArray(cr)?cr:Object.values(cr||{});
        let hd=jh?.data??jh; hideoutStations=Array.isArray(hd)?hd:Object.values(hd||{});
        let tk=jt?.data?.tasks??jt?.data??jt; tasks=Array.isArray(tk)?tk:Object.values(tk||{});
        st.className='status ok'; st.textContent=`items ${items.length} · crafts ${crafts.length} · stations ${hideoutStations.length} · tasks ${tasks.length}`;
        document.getElementById('searchCard').style.display='block';
      }catch(e){st.className='status err'; st.textContent=e.message}
    };

    function search(q){
      q=(q||'').toLowerCase().trim();
      if(q.length<2) return [];
      return items.filter(i=>{
        const n=(i.normalizedName||'')+' '+(i.shortName||'')+' '+(i.name||'');
        return n.toLowerCase().includes(q);
      }).slice(0,20);
    }

    function showSuggest(){
      const q=document.getElementById('q').value;
      const box=document.getElementById('suggest');
      const list=search(q);
      if(!list.length){box.style.display='none'; return}
      box.style.display='block';
      box.innerHTML=list.map(i=>`<div data-id="${esc(i.id)}">
        ${i.iconLink?`<img class="ico" src="${esc(i.iconLink)}" alt="">`:''}
        <span>${esc(humanize(i.normalizedName))}</span>
      </div>`).join('');
      box.querySelectorAll('div').forEach(d=>d.onclick=()=>{
        box.style.display='none';
        document.getElementById('q').value=humanize(byId[d.dataset.id]?.normalizedName);
        renderItem(d.dataset.id);
      });
    }
    document.getElementById('q').addEventListener('input', showSuggest);

    function renderItem(id){
      const it=byId[id]; if(!it) return;
      const el=document.getElementById('result');
      const avg=Number(it.avg24hPrice)||0;
      const sell=it.sellToTrader||[];
      const buy=it.buyFromTrader||[];
      const w=Number(it.width)||1, h=Number(it.height)||1, cells=w*h;

      // crafts that REQUIRE this item
      const asInput=crafts.filter(c=>(c.requiredItems||[]).some(r=>r.item===id));
      // crafts that PRODUCE this
      const asOutput=crafts.filter(c=>(c.productItem===id)||(c.productItem?.id===id)||(typeof c.productItem==='object'&&c.productItem?.id===id));
      // normalize product
      const prodId=c=>{
        const p=c.productItem; return typeof p==='string'?p:(p&&p.id)||null;
      };
      const asOut=crafts.filter(c=>prodId(c)===id);

      // hideout upgrades needing item
      const hideNeeds=[];
      hideoutStations.forEach(st=>{
        const levels=st.levels||st.stationLevels||[];
        (Array.isArray(levels)?levels:[]).forEach((lv,idx)=>{
          const reqs=lv.itemRequirements||lv.requirements||[];
          (reqs||[]).forEach(r=>{
            const rid=r.item||r.itemId||(typeof r==='string'?r:null);
            if(rid===id) hideNeeds.push({station:st.normalizedName||st.name||st.id, level:lv.level??idx+1, count:r.count||1});
          });
        });
        // alternate structure
        (st.levels||[]).forEach(lv=>{
          (lv.itemRequirements||[]).forEach(r=>{
            if((r.item?.id||r.item)===id) hideNeeds.push({station:humanize(st.normalizedName||st.id), level:lv.level, count:r.count||1});
          });
        });
      });

      // quests
      const quests=[];
      tasks.forEach(t=>{
        (t.objectives||[]).forEach(o=>{
          const ids=o.items||[];
          if(ids.includes(id)||(o.item&&o.item===id)){
            quests.push({name:humanize(t.normalizedName||t.name||t.id), type:o.type, count:o.count, fir:!!o.foundInRaid});
          }
        });
      });

      let html=`<div class="name-cell" style="margin-bottom:12px">
        ${it.iconLink?`<img class="ico-lg" src="${esc(it.iconLink)}" alt="">`:''}
        <div><div class="name">${esc(humanize(it.normalizedName))}</div>
        <div class="meta">${esc(it.normalizedName)} · ${w}×${h}</div></div></div>`;

      html+=`<div class="section"><h3>Продажа</h3>`;
      html+=`<p>Flea avg24h: <b>${avg?formatNum(avg)+' ₽': 'нет'}</b> · за слот: <b>${avg?formatNum(avg/cells)+' ₽': '—'}</b></p>`;
      if(sell.length){
        sell.forEach(s=>{
          const price=s.price||s.currencyPrice||0;
          const tr=s.trader?.name||s.trader?.normalizedName||s.trader||'?';
          html+=`<span class="tag trader">${esc(typeof tr==='string'?tr:humanize(tr))} ${formatNum(price)}</span> `;
        });
      } else html+=`<span class="tag">торговцам не сдаётся / нет данных</span>`;
      html+=`</div>`;

      if(buy.length){
        html+=`<div class="section"><h3>Купить у торговца</h3>`;
        buy.forEach(b=>{
          const price=b.price||0;
          const tr=b.trader?.name||b.trader?.normalizedName||'?';
          const ll=b.loyaltyLevel||b.minTraderLevel||'';
          html+=`<span class="tag trader">${esc(typeof tr==='string'?tr:humanize(String(tr)))} LL${ll} · ${formatNum(price)}</span> `;
        });
        html+=`</div>`;
      }

      html+=`<div class="section"><h3>Крафт (как ингредиент) · ${asInput.length}</h3>`;
      if(!asInput.length) html+=`<span class="meta">Не используется в крафтах</span>`;
      asInput.slice(0,30).forEach(c=>{
        const pid=prodId(c); const prod=byId[pid];
        const st=c.station?.name||c.station?.normalizedName||c.station||'';
        html+=`<div class="meta">→ ${esc(humanize(prod?.normalizedName||pid||'?'))} <span class="tag">${esc(typeof st==='string'?humanize(String(st)): '?')} Lv${c.level||''}</span></div>`;
      });
      html+=`</div>`;

      html+=`<div class="section"><h3>Крафт (на выходе) · ${asOut.length}</h3>`;
      if(!asOut.length) html+=`<span class="meta">Не крафтится</span>`;
      asOut.forEach(c=>{
        html+=`<div class="meta">станция Lv${c.level||'?'} · ${(c.requiredItems||[]).length} ингр.</div>`;
      });
      html+=`</div>`;

      html+=`<div class="section"><h3>Убежище · ${hideNeeds.length}</h3>`;
      if(!hideNeeds.length) html+=`<span class="meta">Нет в апгрейдах (или API без itemRequirements)</span>`;
      const seen=new Set();
      hideNeeds.forEach(h=>{
        const k=h.station+'|'+h.level;
        if(seen.has(k)) return; seen.add(k);
        html+=`<div class="meta">${esc(String(h.station))} → ур. ${h.level} ×${h.count}</div>`;
      });
      html+=`</div>`;

      html+=`<div class="section"><h3>Квесты · ${quests.length}</h3>`;
      if(!quests.length) html+=`<span class="meta">Не найден в задачах</span>`;
      quests.slice(0,40).forEach(q=>{
        html+=`<div><span class="tag quest">${esc(q.name)}</span> ${esc(q.type)} ×${q.count||1} ${q.fir?'<span class="tag bad">FIR</span>':''}</div>`;
      });
      html+=`</div>`;

      el.innerHTML=html;
    }
  


(function(){
  const KEY='tarkovPreferredGameMode';
  const def=localStorage.getItem(KEY)||'pve';
  document.querySelectorAll('select#gameMode').forEach(sel=>{
    if([...sel.options].some(o=>o.value===def)) sel.value=def;
    sel.addEventListener('change',()=>{try{localStorage.setItem(KEY,sel.value)}catch(e){}});
  });
})();
