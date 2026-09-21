  function itemName(it){
    try{ if(window.TarkovNames&&TarkovNames.display) return TarkovNames.display(it); }catch(e){}
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=String(it.shortName||it.name||'').trim();
    if(!s || /^[a-f0-9]{20,}$/i.test(s)) {
      var n=String(it.name||'').trim();
      var sl=String(it.normalizedName||'').trim();
      if(n && !/^[a-f0-9]{20,}$/i.test(n)) s=n;
      else if(sl) s=sl.replace(/[-_]+/g,' ');
    }
    return s||it.id||'';
  }

    const TRADER_RU = { prapor:'Прапор', therapist:'Терапевт', fence:'Скупщик', skier:'Лыжник', peacekeeper:'Миротворец', mechanic:'Механик', ragman:'Барахольщик', jaeger:'Егерь', ref:'Реф', lightkeeper:'Смотритель' };
    const ORDER = ['prapor','therapist','skier','peacekeeper','mechanic','ragman','jaeger','ref','fence','lightkeeper'];
    let traders = [], fired = {}, tickTimer = null, refetchQueued = false, restockHistory = {};
    const listEl = document.getElementById('list');
    const statusEl = document.getElementById('status');
    const loadBtn = document.getElementById('loadBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    function loadEnabled() { try { return JSON.parse(localStorage.getItem('restockEnabled')||'{}'); } catch(e){ return {}; } }
    function saveEnabled() { const map={}; traders.forEach(t=>{ map[t.key]=t.enabled; }); localStorage.setItem('restockEnabled', JSON.stringify(map)); }
    function loadHistory() {
      try { const raw=JSON.parse(localStorage.getItem('restockHistory')||'{}'); restockHistory={}; Object.entries(raw).forEach(([k,v])=>{ if(v&&v.happenedAt) restockHistory[k]={key:k,name:v.name||k,happenedAt:Number(v.happenedAt)}; }); } catch(e){ restockHistory={}; }
      try { fired=JSON.parse(localStorage.getItem('restockFired')||'{}'); } catch(e){ fired={}; }
    }
    function saveHistory() { try { localStorage.setItem('restockHistory', JSON.stringify(restockHistory)); localStorage.setItem('restockFired', JSON.stringify(fired)); } catch(e){} }
    function formatRemain(ms) {
      if(ms<=0) return 'сейчас';
      const s=Math.floor(ms/1000); const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=s%60;
      if(h>0) return h+'ч '+String(m).padStart(2,'0')+'м';
      return m+'м '+String(sec).padStart(2,'0')+'с';
    }
    function formatAbs(d) { try { return d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch(e){ return ''; } }
    function formatAgo(ms) {
      const m=Math.floor(ms/60000); if(m<60) return m+' мин назад'; const h=Math.floor(m/60); if(h<24) return h+' ч назад'; return Math.floor(h/24)+' дн назад';
    }
    function playAlertSound() {
      try { if(window.TarkovTools&&TarkovTools.beep) TarkovTools.beep('restock'); } catch(e){}
    }
    function notify(title, body) { if(Notification.permission==='granted'){ try{ new Notification(title,{body,silent:true}); }catch(e){} } }
    async function fetchTraders() {
      const modeEl=document.getElementById('gameMode');
      let mode=(modeEl&&modeEl.value)||'pve';
      if(mode==='regular') mode='pvp';
      if(!window.TarkovAPI||!TarkovAPI.traders) throw new Error('TarkovAPI.traders missing');
      const list=await TarkovAPI.traders(mode);
      if(!list||!list.length) throw new Error('No traders from API');
      const enabledMap=loadEnabled();
      traders=list.map(t=>{
        const key=(t.normalizedName||t.id||'').toLowerCase();
        const resetAt=t.resetTime?new Date(t.resetTime):null;
        let enabled=enabledMap[key]; if(enabled===undefined) enabled=key!=='fence'&&key!=='lightkeeper';
        return { id:t.id, key, name:TRADER_RU[key]||t.name||key, resetAt, enabled:!!enabled };
      }).filter(t=>t.resetAt&&!isNaN(t.resetAt.getTime()));
      traders.sort((a,b)=>{ const ia=ORDER.indexOf(a.key), ib=ORDER.indexOf(b.key); if(ia===-1&&ib===-1) return a.name.localeCompare(b.name,'ru'); if(ia===-1) return 1; if(ib===-1) return -1; return ia-ib; });
    }
    function onRestock(t) {
      const iso=t.resetAt.toISOString(); if(fired[t.key]===iso) return;
      fired[t.key]=iso; restockHistory[t.key]={ key:t.key, name:t.name, happenedAt:Date.now() }; saveHistory();
      try {
        if(typeof window.Notify==='function') {
          window.Notify({ title:'Restock: '+t.name, body:'Assortment refreshed', tool:'tarkovtool-restock.html', kind:'restock' });
        } else if(window.TarkovTools&&TarkovTools.Notify) {
          TarkovTools.Notify({ title:'Restock: '+t.name, body:'Assortment refreshed', tool:'tarkovtool-restock.html', kind:'restock' });
        } else if(window.TarkovTools&&TarkovTools.beep) {
          TarkovTools.beep('restock');
        }
      } catch(e){}
      try {
        if(window.parent&&window.parent!==window){
          window.parent.postMessage({ type:'tt-status', tool:'tarkovtool-restock.html', running:true, ready:true, label:'restock '+t.name }, location.origin);
        }
      } catch(e){}
      queueRefetch();
    }
    function queueRefetch() {
      if(refetchQueued) return; refetchQueued=true;
      setTimeout(async()=>{ refetchQueued=false; try{ await fetchTraders(); statusEl.className='status ok'; statusEl.textContent='Новые времена · '+new Date().toLocaleTimeString('ru-RU'); render(); }catch(e){ statusEl.className='status err'; statusEl.textContent=e.message; } }, 2500);
    }
    function render() {
      const now=Date.now();
      if(!traders.length){ listEl.innerHTML='<p class="status">Нет данных</p>'; renderHistory(); return; }
      listEl.innerHTML='';
      traders.forEach(t=>{
        const remain=t.resetAt.getTime()-now; let state='', badge='', label=formatRemain(remain);
        if(remain<=0){ state='live'; label='РЕСТОК'; badge=' <span style="color:var(--green)">сейчас</span>'; if(t.enabled) onRestock(t); }
        const div=document.createElement('div');
        div.style.cssText='display:grid;grid-template-columns:28px 1fr auto auto;gap:12px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;opacity:'+(t.enabled?'1':'0.4');
        div.innerHTML='<input type="checkbox" '+(t.enabled?'checked':'')+'><div><b>'+t.name+'</b>'+badge+'<div class="meta">'+t.key+'</div></div><div style="font-weight:700;font-variant-numeric:tabular-nums">'+label+'</div><div class="meta">'+formatAbs(t.resetAt)+'</div>';
        div.querySelector('input').onchange=e=>{ t.enabled=e.target.checked; saveEnabled(); render(); };
        listEl.appendChild(div);
      });
      renderHistory();
    }
    function renderHistory() {
      const el=document.getElementById('historyList'); const now=Date.now();
      let entries=Object.values(restockHistory);
      if(traders.length) entries=entries.filter(h=>{ const t=traders.find(x=>x.key===h.key); return t?t.enabled:true; });
      entries.sort((a,b)=>b.happenedAt-a.happenedAt);
      if(!entries.length){ el.innerHTML='<p class="status">Пока пусто</p>'; return; }
      el.innerHTML=entries.map(h=>'<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px"><b>'+h.name+'</b> · '+formatAgo(now-h.happenedAt)+'</div>').join('');
    }
    function startTicks(){
      if(tickTimer) clearInterval(tickTimer);
      tickTimer=setInterval(render,1000);
      if(window.TarkovPoll){
        TarkovPoll.start('restock',1,function(){
          return fetchTraders().then(function(){ render(); });
        },{fireNow:false,label:'restock'});
      }
    }
    async function doLoad(){
      loadBtn.disabled=true; statusEl.className='status'; statusEl.textContent='Гружу…';
      try{ await fetchTraders(); statusEl.className='status ok'; statusEl.textContent='Загружено '+traders.length; refreshBtn.disabled=false; render(); startTicks(); try{ if(window.parent&&window.parent!==window) window.parent.postMessage({ type:'tt-status', tool:'tarkovtool-restock.html', running:true, ready:true, label:'watching' }, location.origin); }catch(e){} }
      catch(e){ statusEl.className='status err'; statusEl.textContent=e.message; }
      finally{ loadBtn.disabled=false; }
    }
    loadBtn.onclick=doLoad;
    refreshBtn.onclick=async()=>{ refreshBtn.disabled=true; try{ await fetchTraders(); statusEl.className='status ok'; statusEl.textContent='Обновлено'; render(); }catch(e){ statusEl.className='status err'; statusEl.textContent=e.message; } finally{ refreshBtn.disabled=false; } };
    document.getElementById('clearHistoryBtn').onclick=()=>{ restockHistory={}; fired={}; saveHistory(); renderHistory(); };
    document.getElementById('notifBtn').onclick=async()=>{ if(!('Notification' in window)) return; const p=await Notification.requestPermission(); statusEl.textContent=p==='granted'?'OK':'denied'; };
    document.getElementById('testSoundBtn').onclick=()=>playAlertSound();
    loadHistory();
    window.addEventListener('pagehide',function(){
      if(tickTimer){ clearInterval(tickTimer); tickTimer=null; }
      try{ if(window.TarkovPoll) TarkovPoll.stop('restock'); }catch(e){}
    });
