
    let stims=[], stimCat='all';
    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
    function effectTags(effects){
      const good=[],bad=[];
      (effects||[]).forEach(e=>{
        const t=e.type||'', skill=e.skill||'', val=e.value, dur=e.duration;
        let label=skill?(skill+(val?(' '+(val>0?'+':'')+val):'')):t;
        if(t==='HealthRate'&&val>0) label='HP +'+val+'/s';
        if(t==='StaminaRate'&&val>0) label='Stam regen +'+val;
        if(t==='MaxStamina'&&val>0) label='Max stam +'+val;
        if(t==='WeightLimit') label='Weight +'+val;
        if(t==='EnergyRate'&&val<0){bad.push('Energy '+val+'/s');return}
        if(t==='HydrationRate'&&val<0){bad.push('Hydro '+val+'/s');return}
        if(t==='HealthRate'&&val<0){bad.push('HP '+val+'/s');return}
        if(t==='HandsTremor'||t==='QuantumTunnelling'){bad.push(t);return}
        if(t==='Removeallbloodlosses') label='Стоп кровь';
        if(t==='Antidote') label='Антидот';
        good.push(label+(dur?(' ('+dur+'s)'):''));
      });
      return {good,bad};
    }
    function stimRole(slug,effects){
      const types=(effects||[]).map(e=>e.type+(e.skill||'')).join(' ');
      if(/mule/.test(slug)||types.includes('WeightLimit')) return 'weight';
      if(/propital|etg|pnb|zagustin|ahf1|perfotoran/.test(slug)) return 'heal';
      if(/sj6|trimadol|meldonin/.test(slug)||/MaxStamina|StaminaRate|Endurance/.test(types)) return 'stamina';
      if(/sj1|sj9|sj12|obdolbos|strength|3-b-tg|2a2|l1|adrenaline/.test(slug+types)) return 'combat';
      return 'utility';
    }
    function stimScore(effects,avg){
      let sc=0;
      (effects||[]).forEach(e=>{
        const t=e.type,v=Number(e.value)||0,d=Number(e.duration)||0;
        if(t==='Skill'&&v>0) sc+=v*Math.min(d,400)/50;
        if(t==='HealthRate'&&v>0) sc+=v*d*0.8;
        if(t==='MaxStamina'&&v>0) sc+=v*2;
        if(t==='StaminaRate'&&v>0) sc+=v*d/10;
        if(t==='WeightLimit'&&v>0) sc+=v*8;
        if(t==='Removeallbloodlosses') sc+=40;
        if(t==='Antidote') sc+=25;
        if(t==='EnergyRate'&&v<0) sc-=Math.abs(v)*d/20;
        if(t==='HydrationRate'&&v<0) sc-=Math.abs(v)*d/20;
        if(t==='HealthRate'&&v<0) sc-=Math.abs(v)*d;
        if(t==='HandsTremor') sc-=5;
      });
      if(avg>0) sc-=Math.log10(avg+10);
      return Math.round(sc*10)/10;
    }
    document.getElementById('loadBtn').onclick=async()=>{
      const btn=document.getElementById('loadBtn'), status=document.getElementById('status');
      btn.disabled=true; status.className='status'; status.textContent='Гружу…';
      try{
        const mode=document.getElementById('gameMode').value||'pve';
        const res=await fetch('https://json.tarkov.dev/'+mode+'/items',{cache:'no-store'});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const json=await res.json();
        let items=json?.data?.items; if(!items) throw new Error('Нет items');
        if(!Array.isArray(items)) items=Object.values(items);
        stims=[];
        items.forEach(it=>{
          const p=it.properties||{};
          if(p.propertiesType!=='ItemPropertiesStim') return;
          const slug=it.normalizedName||'';
          const effects=p.stimEffects||[];
          const avg=Number(it.avg24hPrice)||0;
          stims.push({slug,name:humanize(slug),icon:it.iconLink||it.gridImageLink||'',avg,role:stimRole(slug,effects),tags:effectTags(effects),score:stimScore(effects,avg)});
        });
        stims.sort((a,b)=>b.score-a.score);
        status.className='status ok'; status.textContent='Стимов: '+stims.length;
        try{localStorage.setItem('tarkovtool-stims-settings',JSON.stringify({mode}));}catch(e){}
        render();
      }catch(e){status.className='status err'; status.textContent='Ошибка: '+e.message}
      finally{btn.disabled=false}
    };
    function render(){
      const body=document.getElementById('stimBody'); body.innerHTML='';
      stims.filter(s=>stimCat==='all'||s.role===stimCat).forEach(s=>{
        const tr=document.createElement('tr');
        tr.innerHTML=`<td class="score">${s.score}</td>
          <td><div class="name-cell">${s.icon?`<img class="ico" src="${esc(s.icon)}" loading="lazy" alt="">`:''}<div><div class="name">${esc(s.name)}</div><div class="meta">${esc(s.slug)}</div></div></div></td>
          <td><span class="tag">${esc(s.role)}</span></td>
          <td>${s.tags.good.map(t=>`<span class="tag good">${esc(t)}</span>`).join(' ')||'—'}</td>
          <td>${s.tags.bad.map(t=>`<span class="tag bad">${esc(t)}</span>`).join(' ')||'—'}</td>
          <td>${s.avg?formatNum(s.avg):'—'}</td>
          <td><button type="button" class="copy-btn" data-n="${esc(s.slug)}">копир.</button></td>`;
        body.appendChild(tr);
      });
      body.querySelectorAll('.copy-btn').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.n||''));
    }
    document.getElementById('stimCats').onclick=e=>{
      const c=e.target.closest('.chip'); if(!c) return;
      stimCat=c.dataset.v;
      document.querySelectorAll('#stimCats .chip').forEach(x=>x.classList.toggle('active',x===c));
      render();
    };



(function(){
  const KEY = 'tarkovPreferredGameMode';
  const def = localStorage.getItem(KEY) || 'pve';
  document.querySelectorAll('select#gameMode').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => { try { localStorage.setItem(KEY, sel.value); } catch(e) {} });
  });
})();
