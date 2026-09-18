
    let items=[], byId={}, questItemIds=new Set();
    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    document.getElementById('loadBtn').onclick=async()=>{
      const st=document.getElementById('status'); st.textContent='Гружу…';
      try{
        const mode=document.getElementById('gameMode').value||'pve';
        const [ji,jt]=await Promise.all([
          fetch('https://json.tarkov.dev/'+mode+'/items').then(r=>r.json()),
          fetch('https://json.tarkov.dev/'+mode+'/tasks').then(r=>r.json())
        ]);
        let raw=ji?.data?.items; items=Array.isArray(raw)?raw:Object.values(raw||{});
        byId={}; items.forEach(i=>byId[i.id]=i);
        questItemIds=new Set();
        let tk=jt?.data?.tasks??jt?.data??jt; tk=Array.isArray(tk)?tk:Object.values(tk||{});
        tk.forEach(t=>(t.objectives||[]).forEach(o=>{
          (o.items||[]).forEach(id=>questItemIds.add(id));
          if(o.item) questItemIds.add(o.item);
        }));
        st.className='status ok'; st.textContent='OK · quest items: '+questItemIds.size;
        document.getElementById('ui').style.display='block';
      }catch(e){st.className='status err'; st.textContent=e.message}
    };

    function findItems(q){
      const parts=q.split(/[,;]+/).map(s=>s.trim().toLowerCase()).filter(Boolean);
      if(!parts.length) return [];
      const out=[];
      parts.forEach(p=>{
        const hit=items.find(i=>(i.normalizedName||'').toLowerCase()===p)
          || items.find(i=>(i.normalizedName||'').toLowerCase().includes(p));
        if(hit) out.push(hit);
      });
      return out;
    }

    function bestTraderSell(it){
      const arr=it.sellToTrader||[];
      let best=null;
      arr.forEach(s=>{
        const price=Number(s.price)||0;
        if(!best||price>best.price) best={price, trader:s.trader?.name||s.trader?.normalizedName||s.trader||'?'};
      });
      return best;
    }

    function render(){
      const list=findItems(document.getElementById('q').value);
      const el=document.getElementById('out');
      if(!list.length){el.innerHTML=''; return}
      let html=`<div class="table-wrap"><table><thead><tr>
        <th></th><th>Предмет</th><th>Слоты</th><th>Flea</th><th>₽/слот flea</th><th>Торговец</th><th>₽/слот trader</th><th>Квест</th>
      </tr></thead><tbody>`;
      list.forEach(it=>{
        const cells=Math.max(1,(Number(it.width)||1)*(Number(it.height)||1));
        const avg=Number(it.avg24hPrice)||0;
        const tr=bestTraderSell(it);
        const quest=questItemIds.has(it.id);
        html+=`<tr>
          <td>${it.iconLink?`<img class="ico" src="${esc(it.iconLink)}" alt="">`:''}</td>
          <td><div class="name">${esc(humanize(it.normalizedName))}</div><div class="meta">${esc(it.normalizedName)}</div></td>
          <td>${cells}</td>
          <td>${avg?formatNum(avg):'—'}</td>
          <td><b>${avg?formatNum(avg/cells):'—'}</b></td>
          <td>${tr?formatNum(tr.price)+' ('+esc(String(tr.trader))+')':'—'}</td>
          <td>${tr?formatNum(tr.price/cells):'—'}</td>
          <td>${quest?'<span class="tag quest">квест</span>':'—'}</td>
        </tr>`;
      });
      html+=`</tbody></table></div>`;
      el.innerHTML=html;
    }
    document.getElementById('q').addEventListener('input', ()=>{
      // suggest single
      const q=document.getElementById('q').value;
      if(q.includes(',')) {render(); document.getElementById('suggest').style.display='none'; return}
      const qq=q.toLowerCase().trim();
      const box=document.getElementById('suggest');
      if(qq.length<2){box.style.display='none'; render(); return}
      const list=items.filter(i=>(i.normalizedName||'').toLowerCase().includes(qq)).slice(0,15);
      box.style.display=list.length?'block':'none';
      box.innerHTML=list.map(i=>`<div data-n="${esc(i.normalizedName)}">${i.iconLink?`<img class="ico" src="${esc(i.iconLink)}">`:''}<span>${esc(humanize(i.normalizedName))}</span></div>`).join('');
      box.querySelectorAll('div').forEach(d=>d.onclick=()=>{
        document.getElementById('q').value=d.dataset.n;
        box.style.display='none';
        render();
      });
      render();
    });
  


(function(){
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(window.itemName&&window.itemName!==itemName)return window.itemName(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s))s=(it.name&&!/^[a-f0-9]{20,}$/i.test(it.name)?it.name:it.normalizedName)||s;
    return s||it.id||'';
  }

  const KEY='tarkovPreferredGameMode';
  const def=localStorage.getItem(KEY)||'pve';
  document.querySelectorAll('select#gameMode').forEach(sel=>{
    if([...sel.options].some(o=>o.value===def)) sel.value=def;
    sel.addEventListener('change',()=>{try{localStorage.setItem(KEY,sel.value)}catch(e){}});
  });
})();
