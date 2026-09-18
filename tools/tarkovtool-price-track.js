
    const DB_NAME='tarkovPriceDB', DB_VER=1, STORE='snapshots', META='tarkovPriceTrackMeta';
    let db, timer=null, selectedId=null;
    function esc(s){ return String(s||'').replace(/&/g,'\u0026amp;').replace(/</g,'\u0026lt;').replace(/"/g,'\u0026quot;'); }
    function readRun(){ try{ return JSON.parse(localStorage.getItem('tarkovPriceTrackRunning')||'{}'); }catch(e){ return {}; } }
    function writeRun(patch){
      var cur = readRun();
      Object.keys(patch).forEach(function(k){ cur[k]=patch[k]; });
      try{ localStorage.setItem('tarkovPriceTrackRunning', JSON.stringify(cur)); }catch(e){}
      return cur;
    }
    function openDb(){
      return new Promise((resolve,reject)=>{
        const req=indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded=()=>{ const d=req.result; if(!d.objectStoreNames.contains(STORE)){
          const os=d.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
          os.createIndex('byItem','itemId',{unique:false}); os.createIndex('byTs','ts',{unique:false});
        }};
        req.onsuccess=()=>{ db=req.result; resolve(db); };
        req.onerror=()=>reject(req.error);
      });
    }
    function putSnap(itemId, avg, low, high, name, slug, icon){
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).add({itemId, ts:Date.now(), avg, low, high, name, slug, icon});
        tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
      });
    }
    function latestByItem(){
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly');
        const req=tx.objectStore(STORE).getAll();
        req.onsuccess=()=>{ const map={}; (req.result||[]).forEach(r=>{ if(!map[r.itemId]||r.ts>map[r.itemId].ts) map[r.itemId]=r; }); resolve(map); };
        req.onerror=()=>reject(req.error);
      });
    }
    function historyFor(itemId){
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly');
        const idx=tx.objectStore(STORE).index('byItem');
        const req=idx.getAll(itemId);
        req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>a.ts-b.ts));
        req.onerror=()=>reject(req.error);
      });
    }
    async function takeSnapshot(){
      const st=document.getElementById('status');
      st.className='status'; st.textContent='Снимаю цены flea…';
      const mode=document.getElementById('gameMode').value||'pve';
      let arr;
      if(window.TarkovAPI&&TarkovAPI.items){ arr=await TarkovAPI.items(mode); }
      else {
        const res=await fetch('https://json.tarkov.dev/'+mode+'/items',{cache:'no-store'});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const json=await res.json();
        let raw=json&&json.data&&json.data.items; arr=Array.isArray(raw)?raw:Object.values(raw||{});
      }
      let n=0;
      for(const it of arr){
        const avg=Number(it.avg24hPrice)||0, low=Number(it.lastLowPrice)||0, high=Number(it.high24hPrice)||0;
        if(!avg&&!low) continue;
        await putSnap(it.id, avg, low, high, it.shortName||it.name||it.normalizedName, it.normalizedName||'', it.iconLink||'');
        n++;
      }
      try{localStorage.setItem(META, JSON.stringify({lastRun:Date.now(), count:n, mode}));}catch(e){}
      st.className='status ok'; st.textContent='Снимок: '+n+' · '+new Date().toLocaleString('ru-RU');
      updateMeta(); await refreshList();
      if(selectedId) drawChart(selectedId);
      if(window.TarkovTools&&TarkovTools.beep) TarkovTools.beep('ok');
      if(typeof Notify==='function') Notify({ title:'Динамика цен', body:'Снимок: '+n+' предметов', tool:'tarkovtool-price-track.html', kind:'price' });
    }
    function updateMeta(){
      let meta={}; try{meta=JSON.parse(localStorage.getItem(META)||'{}');}catch(e){}
      var run=readRun();
      var mins = window.__ttPollMins || run.mins || Number(document.getElementById('interval').value) || 30;
      document.getElementById('trackMeta').textContent=
        (timer ? ('Фон · каждые '+mins+'м · ') : 'Фон остановлен · ')+
        (meta.lastRun?('последний '+new Date(meta.lastRun).toLocaleString('ru-RU')+' · '+meta.count+' шт.'):'снимков ещё не было');
    }
    async function refreshList(){
      const map=await latestByItem();
      const q=(document.getElementById('q').value||'').toLowerCase();
      let list=Object.values(map);
      if(q) list=list.filter(r=>(r.name||'').toLowerCase().includes(q)||(r.slug||'').toLowerCase().includes(q));
      list.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ru'));
      const box=document.getElementById('itemList');
      box.innerHTML=list.slice(0,300).map(r=>
        '<div class="item-row" data-id="'+esc(r.itemId)+'">'+
        (r.icon?'<img src="'+esc(r.icon)+'" loading="lazy" alt="">':'')+
        '<div class="nm">'+esc(r.name||r.slug)+'</div>'+
        '<div class="pr">'+(r.avg?Math.round(r.avg).toLocaleString('ru-RU'):'—')+' ₽</div></div>'
      ).join('')||'<div class="meta">Пока пусто</div>';
      box.querySelectorAll('.item-row').forEach(el=>{
        el.onclick=()=>{ selectedId=el.getAttribute('data-id'); drawChart(selectedId); };
      });
    }
    async function drawChart(itemId){
      const hist=await historyFor(itemId);
      const title=document.getElementById('chartTitle');
      const meta=document.getElementById('chartMeta');
      if(!hist.length){ title.textContent='Нет данных'; meta.textContent=''; return; }
      const last=hist[hist.length-1];
      title.textContent=last.name||itemId;
      meta.textContent=hist.length+' точек · last '+Math.round(last.avg||0).toLocaleString('ru-RU')+' ₽';
      const canvas=document.getElementById('chart');
      const ctx=canvas.getContext('2d');
      const W=canvas.width, H=canvas.height;
      ctx.clearRect(0,0,W,H);
      const vals=hist.map(h=>h.avg||h.low||0).filter(v=>v>0);
      if(vals.length<2){ ctx.fillStyle='#8b919a'; ctx.fillText('Мало точек для графика', 20, H/2); return; }
      let min=Math.min(...vals), max=Math.max(...vals);
      if(min===max){ min*=0.95; max*=1.05; }
      const pad=24;
      ctx.strokeStyle='#2a2f3a'; ctx.beginPath();
      for(let i=0;i<=4;i++){ const y=pad+(H-2*pad)*i/4; ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); }
      ctx.stroke();
      ctx.strokeStyle='#c9a227'; ctx.lineWidth=2; ctx.beginPath();
      hist.forEach((h,i)=>{
        const v=h.avg||h.low||0;
        const x=pad+(W-2*pad)*(i/(hist.length-1));
        const y=H-pad-(H-2*pad)*((v-min)/(max-min||1));
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
    }
    function startBg(){
      if (window.__ttStartLock || timer) return;
      window.__ttStartLock = true;
      // soft clear timer only — do not wipe mins from storage
      if (timer) { clearInterval(timer); timer = null; }
      const saved = Number(readRun().mins);
      const mins = Math.max(1, Number(document.getElementById('interval').value) || saved || 30);
      document.getElementById('interval').value = mins;
      window.__ttPollMins = mins;
      takeSnapshot().catch(e=>{ document.getElementById('status').className='status err'; document.getElementById('status').textContent=e.message; });
      timer = setInterval(function(){ takeSnapshot().catch(function(){}); }, mins * 60 * 1000);
      writeRun({ on: true, mins: mins, mode: document.getElementById('gameMode').value });
      updateMeta();
      if (window.TarkovMini && TarkovMini.reportStatus) TarkovMini.reportStatus({ running: true, label: 'каждые ' + mins + 'м' });
      window.__ttStartLock = false;
    }
    function stopBg(){
      window.__ttStartLock = false;
      if (timer) { clearInterval(timer); timer = null; }
      window.__ttPollMins = null;
      var mins = Number(document.getElementById('interval').value) || Number(readRun().mins) || 30;
      writeRun({ on: false, mins: mins, mode: document.getElementById('gameMode').value });
      updateMeta();
      if (window.TarkovMini && TarkovMini.reportStatus) TarkovMini.reportStatus({ running: false, label: 'ожидание' });
    }
    document.getElementById('interval').addEventListener('change', function(){
      var m = Math.max(1, Number(this.value) || 30);
      this.value = m;
      writeRun({ mins: m });
      if (timer) {
        // restart with new interval without losing mins
        clearInterval(timer); timer = null;
        window.__ttPollMins = m;
        timer = setInterval(function(){ takeSnapshot().catch(function(){}); }, m * 60 * 1000);
        writeRun({ on: true, mins: m });
        updateMeta();
        if (window.TarkovMini && TarkovMini.reportStatus) TarkovMini.reportStatus({ running: true, label: 'каждые ' + m + 'м' });
      }
    });
    document.getElementById('startBtn').onclick=startBg;
    document.getElementById('stopBtn').onclick=stopBg;
    document.getElementById('snapBtn').onclick=()=>takeSnapshot().catch(e=>{ document.getElementById('status').className='status err'; document.getElementById('status').textContent=e.message; });
    document.getElementById('q').oninput=()=>refreshList();
    openDb().then(async()=>{
      var run = readRun();
      if (run.mins) document.getElementById('interval').value = String(run.mins);
      if (run.mode) document.getElementById('gameMode').value = run.mode;
      updateMeta(); await refreshList();
      if (run.on) {
        window.__ttPollMins = Number(run.mins) || null;
        startBg();
      }
    });
  