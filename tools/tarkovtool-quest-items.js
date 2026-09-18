
    const TRADER_RU = {
      '54cb50c76803fa8b248b4571':'Прапор','54cb57776803fa99248b456e':'Терапевт',
      '58330581ace78e27b8b10cee':'Лыжник','5935c25fb3acc3127c3d8cd9':'Миротворец',
      '5a7c2eca46aef81a7ca2145d':'Механик','5ac3b934156ae10c4430e83c':'Барахольщик',
      '5c0647fdd443bc2504c2d371':'Егерь','6617beeaa9cfa777ca915b7c':'Реф',
      '638f541a29ffd1183d0c6cdf':'Смотритель'
    };
    const TYPE_RU = {
      giveItem:'Сдать', findItem:'Найти', plantItem:'Положить',
      findQuestItem:'Квест-лут', giveQuestItem:'Сдать квест-лут',
      plantQuestItem:'Положить квест-лут', sellItem:'Продать'
    };
    const WANT_TYPES = new Set(['giveItem','findItem','plantItem','findQuestItem','giveQuestItem','plantQuestItem','sellItem']);

    let rows=[];
    let done={}; // key -> true
    let activeTypes=new Set();
    let sortKey='minLvl', sortDir=1;

    function loadSettings(k,d){try{const r=localStorage.getItem(k);return r?Object.assign({},d,JSON.parse(r)):Object.assign({},d)}catch(e){return Object.assign({},d)}}
    function saveSettings(k,o){try{localStorage.setItem(k,JSON.stringify(o))}catch(e){}}
    function loadDone(){try{done=JSON.parse(localStorage.getItem('tarkovQuestItemsDone')||'{}')}catch{done={}}}
    function saveDone(){try{localStorage.setItem('tarkovQuestItemsDone',JSON.stringify(done))}catch(e){}}
    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    document.getElementById('loadBtn').onclick=async()=>{
      const btn=document.getElementById('loadBtn'), status=document.getElementById('status');
      btn.disabled=true; status.className='status';
      const mode=document.getElementById('gameMode').value||'regular';
      status.textContent='Гружу tasks + items…';
      try{
        const [tRes,iRes]=await Promise.all([
          fetch(`https://json.tarkov.dev/${mode}/tasks`,{cache:'no-store'}),
          fetch(`https://json.tarkov.dev/${mode}/items`,{cache:'no-store'})
        ]);
        if(!tRes.ok) throw new Error('tasks HTTP '+tRes.status);
        if(!iRes.ok) throw new Error('items HTTP '+iRes.status);
        const tJson=await tRes.json(), iJson=await iRes.json();
        let tasks=tJson?.data?.tasks||tJson?.data;
        if(!tasks) throw new Error('Нет tasks');
        if(!Array.isArray(tasks)) tasks=Object.values(tasks);
        let items=iJson?.data?.items;
        if(!items) throw new Error('Нет items');
        if(!Array.isArray(items)) items=Object.values(items);
        const byId={}; items.forEach(i=>byId[i.id]=i);

        rows=[];
        tasks.forEach(task=>{
          const qName=humanize(task.normalizedName||task.name||task.id);
          const qSlug=task.normalizedName||'';
          const trader=TRADER_RU[task.trader]||task.trader||'?';
          const minLvl=Number(task.minPlayerLevel)||1;
          (task.objectives||[]).forEach(o=>{
            if(!WANT_TYPES.has(o.type)) return;
            const ids=o.items||(o.item?[o.item]:[]);
            if(!ids.length) return;
            const fir=!!o.foundInRaid;
            const count=Number(o.count)||1;
            const optional=!!o.optional;
            // one row per item option if multiple (OR list) — show as alternatives on one row
            const names=[], slugs=[];
            ids.forEach(id=>{
              const it=byId[id];
              names.push(it?humanize(it.normalizedName):id.slice(0,8));
              slugs.push(it?.normalizedName||id);
            });
            // flea: min of alternatives avg
            let avg=0;
            ids.forEach(id=>{
              const it=byId[id];
              if(!it) return;
              const a=Number(it.avg24hPrice)||Number(it.lastLowPrice)||0;
              if(a&&(!avg||a<avg)) avg=a;
            });
            const key=task.id+'|'+o.id;
            const first = byId[ids[0]];
            rows.push({
              key, taskId:task.id, objId:o.id,
              itemName:names[0]+(names.length>1?' (+'+(names.length-1)+')':''),
              itemNames:names, slugs,
              icon: (first && (first.iconLink || first.gridImageLink)) || '',
              count, fir, optional, type:o.type, typeRu:TYPE_RU[o.type]||o.type,
              questName:qName, questSlug:qSlug, trader, minLvl, avg,
              multi:names.length>1
            });
          });
        });

        activeTypes=new Set([...WANT_TYPES].filter(t=>rows.some(r=>r.type===t)));
        const chips=document.getElementById('typeChips'); chips.innerHTML='';
        [...activeTypes].forEach(t=>{
          const n=rows.filter(r=>r.type===t).length;
          const c=document.createElement('span');
          c.className='chip active';
          c.textContent=(TYPE_RU[t]||t)+' ('+n+')';
          c.dataset.type=t;
          c.onclick=()=>{
            if(activeTypes.has(t)) activeTypes.delete(t); else activeTypes.add(t);
            c.classList.toggle('active');
            render(); persist();
          };
          chips.appendChild(c);
        });

        document.getElementById('filters').style.display='block';
        document.getElementById('tableCard').style.display='block';
        status.className='status ok';
        status.textContent='Целей: '+rows.length+' · квестов с предметами: '+new Set(rows.map(r=>r.taskId)).size;
        render();
      }catch(e){
        console.error(e); status.className='status err'; status.textContent='Ошибка: '+e.message;
      }finally{btn.disabled=false}
    };

    function render(){
      const q=(document.getElementById('search').value||'').toLowerCase().trim();
      const onlyFir=document.getElementById('onlyFir').checked;
      const hideDone=document.getElementById('hideDone').checked;
      const hideLocked=document.getElementById('hideLocked').checked;
      const myLvl=Number(document.getElementById('playerLevel').value)||1;

      let list=rows.filter(r=>{
        if(!activeTypes.has(r.type)) return false;
        if(onlyFir&&!r.fir) return false;
        if(hideDone&&done[r.key]) return false;
        if(hideLocked&&r.minLvl>myLvl) return false;
        if(q){
          const hay=(r.itemName+' '+r.slugs.join(' ')+' '+r.questName+' '+r.trader).toLowerCase();
          if(!hay.includes(q)) return false;
        }
        return true;
      });
      list.sort((a,b)=>{
        let va=a[sortKey],vb=b[sortKey];
        if(sortKey==='fir'){va=a.fir?1:0;vb=b.fir?1:0}
        if(typeof va==='string') return sortDir*va.localeCompare(vb,'ru');
        return sortDir*((va??0)-(vb??0));
      });
      document.getElementById('title').textContent=list.length+' целей';
      const tbody=document.getElementById('tbody'); tbody.innerHTML='';
      list.forEach(r=>{
        const isDone=!!done[r.key];
        const tr=document.createElement('tr');
        if(isDone) tr.classList.add('done');
        const copySlug=r.slugs[0]||'';
        tr.innerHTML=`
          <td><input type="checkbox" data-key="${esc(r.key)}" ${isDone?'checked':''} title="Собрал / сдал"></td>
          <td>
            <div class="name-cell">${r.icon?`<img class="ico ico-sm" src="${esc(r.icon)}" loading="lazy" alt="">`:''}<div class="txt">
            <div class="name">${esc(r.itemName)}
              ${r.fir?'<span class="badge fir">FIR</span>':''}
              ${r.optional?'<span class="badge opt">опц.</span>':''}
            </div>
            <div class="meta">${esc(r.slugs.slice(0,3).join(' · '))}${r.slugs.length>3?'…':''}</div>
            </div></div>
          </td>
          <td><strong>${r.count}</strong></td>
          <td>${r.fir?'<span class="bad">да</span>':'нет'}</td>
          <td>${esc(r.typeRu)}</td>
          <td>
            <div>${esc(r.questName)}</div>
            <div class="meta">${esc(r.questSlug)}</div>
          </td>
          <td>${esc(r.trader)}</td>
          <td>${r.minLvl}</td>
          <td>${r.avg?formatNum(r.avg):'—'}</td>
          <td><button type="button" class="copy-btn" data-name="${esc(copySlug)}">копир.</button></td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('input[data-key]').forEach(cb=>{
        cb.onchange=()=>{
          if(cb.checked) done[cb.dataset.key]=true; else delete done[cb.dataset.key];
          saveDone(); render();
        };
      });
      tbody.querySelectorAll('.copy-btn').forEach(btn=>{
        btn.onclick=()=>navigator.clipboard.writeText(btn.dataset.name||'').then(()=>{const o=btn.textContent;btn.textContent='✓';setTimeout(()=>btn.textContent=o,700)});
      });
    }

    document.querySelectorAll('th[data-k]').forEach(th=>{
      th.onclick=()=>{const k=th.dataset.k; if(sortKey===k) sortDir*=-1; else{sortKey=k;sortDir=k==='itemName'||k==='questName'||k==='trader'||k==='type'?1:-1} render()};
    });
    ['search','onlyFir','hideDone','hideLocked','playerLevel'].forEach(id=>{
      const el=document.getElementById(id);
      el.addEventListener('input',render);
      el.addEventListener('change',()=>{render();persist()});
    });
    document.getElementById('clearDone').onclick=()=>{
      if(!confirm('Сбросить все галочки «собрал»?')) return;
      done={}; saveDone(); render();
    };
    function persist(){
      saveSettings('tarkovQuestItemsSettings',{
        gameMode:document.getElementById('gameMode').value,
        playerLevel:Number(document.getElementById('playerLevel').value)||31,
        onlyFir:document.getElementById('onlyFir').checked,
        hideDone:document.getElementById('hideDone').checked,
        hideLocked:document.getElementById('hideLocked').checked
      });
    }
    loadDone();
    (function(){
      const s=loadSettings('tarkovQuestItemsSettings',{playerLevel:31});
      if(s.gameMode) document.getElementById('gameMode').value=s.gameMode;
      if(s.playerLevel) document.getElementById('playerLevel').value=s.playerLevel;
      if(s.onlyFir) document.getElementById('onlyFir').checked=true;
      if(s.hideDone===false) document.getElementById('hideDone').checked=false;
      if(s.hideLocked===false) document.getElementById('hideLocked').checked=false;
    })();
  


(function(){
  const KEY = 'tarkovPreferredGameMode';
  const def = localStorage.getItem(KEY) || 'pve';
  document.querySelectorAll('select#gameMode, select[id*="gameMode"], select[id*="GameMode"]').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => {
      try { localStorage.setItem(KEY, sel.value); } catch(e) {}
    });
  });
})();
