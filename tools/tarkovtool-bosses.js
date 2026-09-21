const BOSS_RU = {
      bossTagilla:'Тагилла', bossKilla:'Килла', bossBully:'Решала', bossKojaniy:'Штурман',
      bossSanitar:'Санитар', bossGluhar:'Глухарь', bossZryachiy:'Зрячий',
      bossBoar:'Кабан', bossKolontay:'Колонтай', bossKnight:'Рыцарь',
      bossPartisan:'Партизан', sectantPriest:'Жрец',
      followerBully:'Свита Решалы', followerKojaniy:'Свита Штурмана',
      followerSanitar:'Свита Санитара', followerGluharAssault:'Штурм Глухаря',
      followerGluharSecurity:'Охрана Глухаря', followerGluharScout:'Разведка Глухаря',
      followerZryachiy:'Свита Зрячего', followerBoar:'Свита Кабана',
      followerBoarClose1:'Свита Кабана', followerBoarClose2:'Свита Кабана',
      followerKolontayAssault:'Штурм Колонтая', followerKolontaySecurity:'Охрана Колонтая',
      followerBigPipe:'Big Pipe', followerBirdEye:'Bird Eye',
      sectantWarrior:'Сектант', ExUsec:'Rogues', PmcBot:'Raiders', Sentry:'Часовой'
    };
    const MAP_RU = {
      factory:'Factory','night-factory':'Factory (ночь)',customs:'Customs',woods:'Woods',
      shoreline:'Shoreline',interchange:'Interchange',reserve:'Reserve',
      lighthouse:'Lighthouse','streets-of-tarkov':'Streets','the-lab':'The Lab',
      'ground-zero':'Ground Zero','ground-zero-21':'Ground Zero 21+',
      terminal:'Terminal','the-labyrinth':'Labyrinth'
    };
    let mapsData=[], goonMapIds=new Set(), goonInfo=[], filter='all', timers={};

    function humanize(s){return MAP_RU[s]||(s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?')}
    function bossName(m){return BOSS_RU[m]||m}
    function formatTimer(ms){
      const s=Math.floor(ms/1000), m=Math.floor(s/60), sec=s%60, h=Math.floor(m/60);
      if(h) return h+':'+String(m%60).padStart(2,'0')+':'+String(sec).padStart(2,'0');
      return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
    }

    async function fetchData(){
      const mode=document.getElementById('gameMode').value||'regular';
      const [maps,goons]=await Promise.all([
        TarkovAPI.maps(mode),
        TarkovAPI.goonReports(mode)
      ]);
      if(!maps.length) throw new Error('Нет maps');
      const byId={};
      mapsData=maps.map(m=>{
        byId[m.id]=m;
        const bosses=(m.bosses||[]).map(b=>({
          mob:b.mob,
          chance:Number(b.spawnChance)||0,
          locs:(b.spawnLocations||[]).map(l=>l.name).filter(Boolean),
          escorts:(b.escorts||[]).map(e=>typeof e==='string'?e:(e.mob||e.bossName||'?')).filter(Boolean)
        }));
        return {
          id:m.id, slug:m.normalizedName||m.id, name:humanize(m.normalizedName),
          duration:Number(m.raidDuration)||0, bosses,
          hasBoss:bosses.some(b=>b.mob&&String(b.mob).startsWith('boss'))
        };
      }).filter(m=>m.duration||m.bosses.length)
        .sort((a,b)=>a.name.localeCompare(b.name,'ru'));

      goonMapIds=new Set();
      goonInfo=[];
      goons.forEach(g=>{
        const mid=g.map;
        goonMapIds.add(mid);
        const m=byId[mid];
        let when='';
        try{
          let ts=Number(g.timestamp);
          if(ts>1e12) ts=ts/1000;
          when=new Date(ts*1000).toLocaleString('ru-RU');
        }catch(e){}
        goonInfo.push({
          mapName:m?humanize(m.normalizedName):(mid||'?'),
          mapId:mid, when
        });
      });
    }

    function renderGoons(){
      const el=document.getElementById('goonsPanel');
      if(!goonInfo.length){
        el.innerHTML='<h2>Гуны</h2><p class="meta">Нет данных goonReports — локация неизвестна</p>';
        return;
      }
      el.innerHTML='<h2>Гуны сейчас</h2>'+goonInfo.map(g=>
        `<div style="font-size:1.2rem;font-weight:700;margin:6px 0">${g.mapName}</div>
         <div class="meta">Отчёт: ${g.when||'—'}</div>`
      ).join('');
    }

    function toggleTimer(mapId){
      if(timers[mapId]){clearInterval(timers[mapId].intervalId);delete timers[mapId];render();return}
      const start=Date.now();
      timers[mapId]={start,intervalId:setInterval(()=>{
        const el=document.querySelector('[data-timer="'+mapId+'"]');
        const m=mapsData.find(x=>x.id===mapId);
        if(!el||!m)return;
        const elapsed=Date.now()-start;
        const left=m.duration*60*1000-elapsed;
        el.textContent=left>0?('в рейде '+formatTimer(elapsed)+' · осталось ~'+formatTimer(left)):('в рейде '+formatTimer(elapsed)+' · лимит');
        if(left<=0) el.style.color='var(--red)';
      },1000)};
      render();
    }

    function render(){
      const q=(document.getElementById('search').value||'').toLowerCase().trim();
      const box=document.getElementById('maps'); box.innerHTML='';
      mapsData.filter(m=>{
        if(filter==='boss'&&!m.hasBoss) return false;
        if(q){
          const hay=(m.name+' '+m.slug+' '+m.bosses.map(b=>b.mob+' '+bossName(b.mob)).join(' ')).toLowerCase();
          if(!hay.includes(q)) return false;
        }
        return true;
      }).forEach(m=>{
        const here=goonMapIds.has(m.id);
        const running=!!timers[m.id];
        const div=document.createElement('div');
        div.className='map-card'+(here?' goons-here':'');
        let bossesHtml=m.bosses.filter(b=>b.mob&&!['PmcBot','ExUsec','Sentry'].includes(b.mob))
          .map(b=>`<div class="boss-line">
            <div class="boss-name">${bossName(b.mob)} <span class="chance">${(b.chance*100).toFixed(0)}%</span></div>
            <div class="meta">Зоны: ${b.locs.join(', ')||'—'}</div>
            ${b.escorts.length?('<div class="meta">Свита: '+b.escorts.map(bossName).join(', ')+'</div>'):''}
          </div>`).join('')||'<div class="meta" style="margin-top:8px">Боссов нет</div>';
        div.innerHTML=`
          <div class="map-name"><span>${m.name}${here?' · <span style="color:var(--orange)">ГУНЫ</span>':''}</span><span class="dur">${m.duration} мин</span></div>
          <div class="timer" data-timer="${m.id}"></div>
          <button type="button" class="btn-ghost" style="margin-top:6px" data-start="${m.id}">${running?'Стоп таймер':'Старт рейда'}</button>
          ${bossesHtml}`;
        box.appendChild(div);
      });
      box.querySelectorAll('[data-start]').forEach(btn=>btn.onclick=()=>toggleTimer(btn.dataset.start));
      Object.keys(timers).forEach(id=>{
        const el=document.querySelector('[data-timer="'+id+'"]');
        const t=timers[id], m=mapsData.find(x=>x.id===id);
        if(el&&t&&m){
          const elapsed=Date.now()-t.start, left=m.duration*60*1000-elapsed;
          el.textContent=left>0?('в рейде '+formatTimer(elapsed)+' · осталось ~'+formatTimer(left)):('в рейде '+formatTimer(elapsed)+' · лимит');
        }
      });
    }

    async function doLoad(){
      const btn=document.getElementById('loadBtn'), status=document.getElementById('status');
      btn.disabled=true; status.className='status'; status.textContent='Гружу…';
      try{
        await fetchData();
        document.getElementById('main').style.display='block';
        status.className='status ok';
        status.textContent='Карт: '+mapsData.length+(goonInfo.length?' · гуны: '+goonInfo.map(g=>g.mapName).join(', '):' · гуны: нет отчёта');
        renderGoons(); render();
      }catch(e){
        status.className='status err'; status.textContent='Ошибка: '+e.message;
      }finally{btn.disabled=false}
    }
    document.getElementById('loadBtn').onclick=doLoad;
    document.getElementById('refreshGoons').onclick=async()=>{
      try{await fetchData();renderGoons();render();document.getElementById('status').textContent='Гуны обновлены'}catch(e){alert(e.message)}
    };
    document.getElementById('filters').onclick=e=>{
      const c=e.target.closest('.chip'); if(!c) return;
      filter=c.dataset.f;
      document.querySelectorAll('#filters .chip').forEach(x=>x.classList.toggle('active',x.dataset.f===filter));
      render();
    };
    document.getElementById('search').oninput=render;

    (function(){
      const KEY='tarkovPreferredGameMode';
      const def=TarkovStorage.get(KEY,'pve')||'pve';
      document.querySelectorAll('select#gameMode, select[id*="gameMode"], select[id*="GameMode"]').forEach(sel=>{
        if([...sel.options].some(o=>o.value===def)) sel.value=def;
        sel.addEventListener('change',()=>{try{TarkovStorage.set(KEY,sel.value)}catch(e){}});
      });
    })();