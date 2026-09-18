
    const COMBOS = [
      {name:'Мельдонин + SJ1 — элитная сила', items:['meldonin-injector','sj1-tglabs-combat-stimulant-injector'], role:'Бой / вес', why:'Долгий Str/End + короткий жирный буст SJ1.'},
      {name:'SJ6 + Meldonin — беговая', items:['sj6-tglabs-combat-stimulant-injector','meldonin-injector'], role:'Выносливость', why:'Max stam + долгий Endurance.'},
      {name:'SJ6 + Trimadol', items:['sj6-tglabs-combat-stimulant-injector','trimadol-stimulant-injector'], role:'Выносливость', why:'Сильная связка на перебежки; жрёт еду/воду.'},
      {name:'Propital', items:['propital-regenerative-stimulant-injector'], role:'Универсал', why:'Обезбол + реген. База кейса.'},
      {name:'Propital + MULE', items:['propital-regenerative-stimulant-injector','mule-stimulant-injector'], role:'Лут', why:'Вес от MULE, реген частично гасит drain HP.'},
      {name:'eTG — паника', items:['etg-change-regenerative-stimulant-injector'], role:'Отхил', why:'Жирный реген на минуту, потом жесткий дебафф.'},
      {name:'Zagustin', items:['zagustin-hemostatic-drug-injector'], role:'Кровь', why:'Стоп всех кровотечений.'},
      {name:'Кейс новичка', items:['propital-regenerative-stimulant-injector','sj6-tglabs-combat-stimulant-injector','trimadol-stimulant-injector','zagustin-hemostatic-drug-injector'], role:'Набор', why:'Старт кейса: хил, бег, кровь.'}
    ];
    let bySlug={};
    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
    document.getElementById('loadBtn').onclick=async()=>{
      const status=document.getElementById('status');
      status.textContent='Гружу…';
      try{
        const mode=document.getElementById('gameMode').value||'pve';
        const res=await fetch('https://json.tarkov.dev/'+mode+'/items',{cache:'no-store'});
        const json=await res.json();
        let items=json?.data?.items; if(!Array.isArray(items)) items=Object.values(items||{});
        bySlug={}; items.forEach(it=>{if(it.normalizedName) bySlug[it.normalizedName]=it});
        status.className='status ok'; status.textContent='OK';
        const el=document.getElementById('comboList'); el.innerHTML='';
        COMBOS.forEach(c=>{
          const div=document.createElement('div'); div.className='combo';
          const icons=c.items.map(slug=>{
            const it=bySlug[slug]; const icon=it?(it.iconLink||it.gridImageLink):'';
            return `<span style="display:inline-flex;align-items:center;gap:6px;margin:4px 8px 4px 0">${icon?`<img src="${esc(icon)}" width="36" height="36" style="object-fit:contain;background:#0a0c10;border-radius:4px">`:''}<span>${esc(humanize(slug))}</span><button type="button" class="copy-btn" data-n="${esc(slug)}">копир.</button></span>`;
          }).join('');
          div.innerHTML=`<h3>${esc(c.name)}</h3><div class="meta">${esc(c.role)}</div><div>${icons}</div><p class="meta" style="margin-top:8px">${esc(c.why)}</p>`;
          el.appendChild(div);
        });
        el.querySelectorAll('.copy-btn').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.n||''));
      }catch(e){status.className='status err'; status.textContent=e.message}
    };
  


(function(){
  const KEY = 'tarkovPreferredGameMode';
  const def = localStorage.getItem(KEY) || 'pve';
  document.querySelectorAll('select#gameMode').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => { try { localStorage.setItem(KEY, sel.value); } catch(e) {} });
  });
})();
