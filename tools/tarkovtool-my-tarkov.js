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

    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function paint() {
      const st = TarkovState.get();
      document.getElementById('level').value = st.player.level || 1;
      document.getElementById('gameMode').value = st.player.gameMode || 'pve';
      document.getElementById('hideoutNotes').value = (st.hideout && st.hideout.notes) || '';
      document.getElementById('stats').innerHTML =
        '<div class="stat"><div class="v">'+(st.player.level||1)+'</div><div class="l">PMC</div></div>'+
        '<div class="stat"><div class="v">'+(st.player.gameMode||'pve')+'</div><div class="l">режим</div></div>'+
        '<div class="stat"><div class="v">'+((st.alerts&&st.alerts.prices)||[]).length+'</div><div class="l">алертов</div></div>'+
        '<div class="stat"><div class="v">'+TarkovState.notifications().filter(n=>!n.read).length+'</div><div class="l">непрочит.</div></div>';

      let hs = 'Открой трекер убежища и сохрани прогресс — здесь появится сводка.';
      try {
        const raw = localStorage.getItem('tarkovHideout') || localStorage.getItem('tarkovHideoutSettings');
        if (raw) hs = 'Есть сохранённые данные трекера (localStorage).';
      } catch(e){}
      document.getElementById('hideoutSum').textContent = hs;

      const alerts = (st.alerts && st.alerts.prices) || [];
      document.getElementById('alertList').innerHTML = alerts.length ? alerts.map((a,i)=>
        `<div class="meta" style="padding:4px 0;display:flex;justify-content:space-between;gap:8px">
          <span>${esc(a.slug)} ${a.dir==='above'?'≥':'≤'} ${Number(a.target).toLocaleString('ru-RU')} ₽</span>
          <button type="button" class="btn-ghost" data-i="${i}" style="min-height:28px!important;min-width:auto!important">×</button>
        </div>`
      ).join('') : '<span class="meta">Нет алертов</span>';
      document.querySelectorAll('#alertList button').forEach(b=>{
        b.onclick=()=>{
          const st2 = TarkovState.get();
          const arr = (st2.alerts.prices||[]).slice();
          arr.splice(+b.dataset.i,1);
          TarkovState.set({alerts:{prices:arr}});
          paint();
        };
      });

      const ns = TarkovState.notifications().slice(0,10);
      document.getElementById('notifs').innerHTML = ns.length ? ns.map(n=>
        `<div style="padding:6px 0;border-bottom:1px solid var(--border)">
          <strong>${esc(n.title)}</strong><div class="meta">${esc(n.body)}</div>
        </div>`
      ).join('') : '<span class="meta">Пусто</span>';
    }

    document.getElementById('saveProfile').onclick=()=>{
      TarkovState.set({player:{
        level: Number(document.getElementById('level').value)||1,
        gameMode: document.getElementById('gameMode').value
      }});
      try { localStorage.setItem('tarkovPreferredGameMode', document.getElementById('gameMode').value); } catch(e){}
      paint();
      if (window.TarkovTools&&TarkovTools.beep) TarkovTools.beep('ok');
    };
    document.getElementById('saveNotes').onclick=()=>{
      TarkovState.set({hideout:{notes: document.getElementById('hideoutNotes').value}});
      paint();
    };
    document.getElementById('addAlert').onclick=()=>{
      const slug = (document.getElementById('alertSlug').value||'').trim();
      const target = Number(document.getElementById('alertTarget').value);
      if (!slug || !target) return;
      const st = TarkovState.get();
      const arr = ((st.alerts&&st.alerts.prices)||[]).slice();
      arr.push({slug, target, dir: document.getElementById('alertDir').value});
      TarkovState.set({alerts:{prices:arr}});
      document.getElementById('alertSlug').value='';
      document.getElementById('alertTarget').value='';
      paint();
    };
    document.getElementById('clearN').onclick=()=>{ TarkovState.clearNotifications(); paint(); };
    paint();
  