
    let byId = {}, weapons = [], mods = [];
    let baseWeapon = null;
    // installed: slotKey -> itemId  (slotKey = parentItemId + '::' + nameId)
    let installed = {};
    let activeSlot = null; // {parentId, nameId, filters}

    function humanize(s){return s?String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'?'}
    function formatNum(n){return n==null||Number.isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU')}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    function slotClass(nameId) {
      const n = (nameId || '').toLowerCase();
      if (n.includes('muzzle')) return 'g-muzzle';
      if (n.includes('barrel')) return 'g-barrel';
      if (n.includes('scope') || n.includes('sight')) return 'g-scope';
      if (n.includes('charge')) return 'g-charge';
      if (n.includes('reciever') || n.includes('receiver')) return 'g-receiver';
      if (n.includes('stock')) return 'g-stock';
      if (n.includes('handguard') || n.includes('hand_guard')) return 'g-handguard';
      if (n.includes('foregrip') || n.includes('fore_grip') || n.includes('mount')) {
        if (n.includes('fore')) return 'g-foregrip';
      }
      if (n.includes('tactical') || n.includes('flashlight') || n.includes('laser')) return 'g-tactical';
      if (n.includes('magazine') || n === 'mod_magazine') return 'g-mag';
      if (n.includes('pistol_grip') || n.includes('pistolgrip')) return 'g-grip';
      if (n.includes('foregrip') || n.includes('grip') && !n.includes('pistol')) return 'g-foregrip';
      return null; // extra
    }

    function itemPrice(it) {
      if (!it) return 0;
      const avg = Number(it.avg24hPrice) || 0;
      if (avg > 0) return avg;
      const buys = it.buyFromTrader || [];
      let min = Infinity;
      buys.forEach(b => { const p = Number(b.price)||0; if (p>0 && p<min) min=p; });
      return min === Infinity ? 0 : min;
    }

    function itemSource(it) {
      if (!it) return [];
      const tags = [];
      if (Number(it.avg24hPrice) > 0) tags.push({t:'flea', l:'flea'});
      (it.buyFromTrader || []).forEach(b => {
        const tr = b.trader?.name || b.trader?.normalizedName || 'trader';
        const ll = b.loyaltyLevel || b.minTraderLevel || '?';
        tags.push({t:'trader', l: String(tr).slice(0,12) + ' LL' + ll});
      });
      // quest lock heuristic: unlocks via task often in buy requirements
      const locked = (it.buyFromTrader || []).some(b => b.taskUnlock || b.questUnlock);
      if (locked) tags.push({t:'quest', l:'квест'});
      if (!tags.length) tags.push({t:'flea', l:'только находка?'});
      return tags;
    }

    function allowedForSlot(filters) {
      if (!filters) return [];
      const allowed = new Set(filters.allowedItems || []);
      const cats = new Set(filters.allowedCategories || []);
      // also excluded
      const excluded = new Set(filters.excludedItems || []);
      const list = [];
      mods.forEach(m => {
        if (excluded.has(m.id)) return;
        if (allowed.has(m.id)) { list.push(m); return; }
        if (cats.size) {
          const mc = (m.categories || []).map(c => c.id || c);
          if (mc.some(id => cats.has(id))) list.push(m);
        }
      });
      // if only allowedItems
      if (!list.length && allowed.size) {
        allowed.forEach(id => { if (byId[id]) list.push(byId[id]); });
      }
      return list;
    }

    /** Collect all slots currently available: base weapon + nested on installed mods */
    function collectSlots() {
      const result = []; // {parentId, nameId, required, filters, className}
      if (!baseWeapon) return result;
      const queue = [baseWeapon];
      const seen = new Set();
      while (queue.length) {
        const parent = queue.shift();
        if (!parent || seen.has(parent.id)) continue;
        seen.add(parent.id);
        const slots = (parent.properties && parent.properties.slots) || [];
        slots.forEach(s => {
          const nameId = s.nameId || s.name || s.id;
          const key = parent.id + '::' + nameId;
          const cls = slotClass(nameId);
          result.push({
            parentId: parent.id,
            nameId,
            key,
            required: !!s.required,
            filters: s.filters || {},
            className: cls
          });
          const childId = installed[key];
          if (childId && byId[childId]) queue.push(byId[childId]);
        });
      }
      return result;
    }

    function conflictSet() {
      const set = new Set();
      Object.values(installed).forEach(id => {
        const it = byId[id];
        if (!it) return;
        (it.conflictingItems || []).forEach(c => set.add(typeof c === 'string' ? c : c.id));
        const p = it.properties || {};
        (p.conflictingItems || []).forEach(c => set.add(typeof c === 'string' ? c : c.id));
      });
      return set;
    }

    function computeStats() {
      if (!baseWeapon) return null;
      const p = baseWeapon.properties || {};
      let ergo = Number(p.ergonomics) || Number(p.defaultErgonomics) || 0;
      let recV = Number(p.recoilVertical) || Number(p.defaultRecoilVertical) || 0;
      let recH = Number(p.recoilHorizontal) || Number(p.defaultRecoilHorizontal) || 0;
      let weight = Number(baseWeapon.weight) || Number(p.defaultWeight) || 0;
      let cost = itemPrice(baseWeapon);
      const parts = [{ it: baseWeapon, slot: 'base' }];

      Object.entries(installed).forEach(([key, id]) => {
        const it = byId[id];
        if (!it) return;
        parts.push({ it, slot: key.split('::')[1] });
        const mp = it.properties || {};
        // ergonomics: absolute add
        if (mp.ergonomics != null) ergo += Number(mp.ergonomics) || 0;
        else if (mp.ergonomicsModifier != null) ergo += Number(mp.ergonomicsModifier) || 0;
        // recoil: often percent
        if (mp.recoil != null) {
          const r = Number(mp.recoil) || 0;
          // negative recoil = less recoil
          recV *= (1 + r / 100);
          recH *= (1 + r / 100);
        }
        if (mp.recoilModifier != null) {
          const r = Number(mp.recoilModifier) || 0;
          recV *= (1 + r / 100);
          recH *= (1 + r / 100);
        }
        weight += Number(it.weight) || 0;
        cost += itemPrice(it);
      });
      return {
        ergo: Math.round(ergo * 10) / 10,
        recV: Math.round(recV * 10) / 10,
        recH: Math.round(recH * 10) / 10,
        weight: Math.round(weight * 100) / 100,
        cost,
        parts
      };
    }

    function renderSchematic() {
      const root = document.getElementById('schematic');
      root.innerHTML = '';
      if (!baseWeapon) return;
      const slots = collectSlots();
      const usedClass = new Set();

      // core weapon
      const core = document.createElement('div');
      core.className = 'slot-box core g-weapon';
      core.innerHTML = `<div class="slot-label">оружие</div>
        <img src="${esc(baseWeapon.iconLink||baseWeapon.gridImageLink||'')}" alt="">
        <div class="mod-name">${esc(humanize(baseWeapon.normalizedName))}</div>`;
      root.appendChild(core);

      const extras = [];
      slots.forEach(s => {
        // only show slots whose parent is weapon or an installed mod
        if (s.parentId !== baseWeapon.id && !Object.values(installed).includes(s.parentId)) return;
        // if parent is not base and not installed chain, skip
        const childId = installed[s.key];
        const child = childId ? byId[childId] : null;
        const cls = s.className;
        if (!cls || usedClass.has(cls)) {
          extras.push(s);
          return;
        }
        // stock: allow second stock slot in g-stock2
        if (cls === 'g-stock' && usedClass.has('g-stock')) {
          if (!usedClass.has('g-stock2')) {
            usedClass.add('g-stock2');
            placeSlot(root, s, child, 'g-stock2');
            return;
          }
          extras.push(s);
          return;
        }
        usedClass.add(cls);
        placeSlot(root, s, child, cls);
      });

      const extraWrap = document.createElement('div');
      extraWrap.className = 'g-extra extra-list';
      if (extras.length) {
        extras.forEach(s => {
          const child = installed[s.key] ? byId[installed[s.key]] : null;
          placeSlot(extraWrap, s, child, null);
        });
      } else {
        extraWrap.innerHTML = '<div class="meta" style="padding:8px">Доп. слоты появятся здесь (планки, крепления…)</div>';
      }
      root.appendChild(extraWrap);

      renderStats();
      renderList();
    }

    function placeSlot(parent, s, child, cls) {
      const box = document.createElement('div');
      box.className = 'slot-box ' + (cls || '') + (child ? ' has' : '');
      const label = (s.nameId || '').replace(/^mod_/, '').replace(/_/g, ' ');
      if (child) {
        box.innerHTML = `<div class="slot-label">${esc(label)}</div>
          <img src="${esc(child.iconLink||child.gridImageLink||'')}" alt="">
          <div class="mod-name">${esc(humanize(child.normalizedName))}</div>`;
      } else {
        box.innerHTML = `<div class="slot-label">${esc(label)}${s.required?' *':''}</div>
          <div class="meta">пусто</div>`;
      }
      box.onclick = () => openSlot(s);
      parent.appendChild(box);
    }

    function renderStats() {
      const st = computeStats();
      const el = document.getElementById('stats');
      if (!st) { el.innerHTML = ''; return; }
      el.innerHTML = `
        <div class="stat"><div class="v">${st.ergo}</div><div class="l">Эргономика</div></div>
        <div class="stat"><div class="v">${st.recV}</div><div class="l">Отдача верт.</div></div>
        <div class="stat"><div class="v">${st.recH}</div><div class="l">Отдача гориз.</div></div>
        <div class="stat"><div class="v">${st.weight}</div><div class="l">Вес кг</div></div>
        <div class="stat"><div class="v">${formatNum(st.cost)}</div><div class="l">≈ цена ₽</div></div>
        <div class="stat"><div class="v">${Object.keys(installed).length}</div><div class="l">модов</div></div>`;
    }

    function renderList() {
      const el = document.getElementById('buildList');
      const st = computeStats();
      if (!st) { el.innerHTML = ''; return; }
      el.innerHTML = st.parts.map(p => {
        const tags = itemSource(p.it).map(t => `<span class="tag ${t.t}">${esc(t.l)}</span>`).join(' ');
        return `<div><b>${esc(humanize(p.it.normalizedName))}</b> · ${formatNum(itemPrice(p.it))} ₽ ${tags}
          <button type="button" class="btn-ghost" data-n="${esc(p.it.normalizedName)}">копир.</button></div>`;
      }).join('');
      el.querySelectorAll('.btn-ghost').forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.n || ''));
    }

    function openSlot(s) {
      activeSlot = s;
      const conf = conflictSet();
      let list = allowedForSlot(s.filters).filter(m => !conf.has(m.id) || installed[s.key] === m.id);
      // sort by ergo / price
      list.sort((a, b) => (Number((b.properties||{}).ergonomics)||0) - (Number((a.properties||{}).ergonomics)||0));

      document.getElementById('modalTitle').textContent = (s.nameId || 'Слот') + (s.required ? ' (обяз.)' : '');
      document.getElementById('modal').classList.add('show');
      const filterInp = document.getElementById('modalFilter');
      filterInp.value = '';
      const draw = () => {
        const q = filterInp.value.toLowerCase().trim();
        const filtered = q ? list.filter(m => (m.normalizedName||'').includes(q)) : list;
        const box = document.getElementById('modalList');
        let html = '';
        if (installed[s.key]) {
          html += `<div class="mod-pick" data-clear="1"><span class="meta">✕ Снять мод</span></div>`;
        }
        filtered.slice(0, 80).forEach(m => {
          const mp = m.properties || {};
          const ergo = mp.ergonomics != null ? mp.ergonomics : mp.ergonomicsModifier;
          const rec = mp.recoil != null ? mp.recoil : mp.recoilModifier;
          const tags = itemSource(m).map(t => `<span class="tag ${t.t}">${esc(t.l)}</span>`).join(' ');
          html += `<div class="mod-pick" data-id="${esc(m.id)}">
            <img class="ico" src="${esc(m.iconLink||m.gridImageLink||'')}" alt="">
            <div style="flex:1">
              <div class="name">${esc(humanize(m.normalizedName))}</div>
              <div class="meta">ergo ${ergo ?? '—'} · recoil ${rec ?? '—'} · ${formatNum(itemPrice(m))} ₽</div>
              <div>${tags}</div>
            </div>
          </div>`;
        });
        if (!filtered.length) html += '<div class="meta">Нет совместимых модов в данных API</div>';
        box.innerHTML = html;
        box.querySelectorAll('.mod-pick').forEach(el => {
          el.onclick = () => {
            if (el.dataset.clear) {
              // remove this and nested
              removeSlotCascade(s.key);
            } else {
              installed[s.key] = el.dataset.id;
              // clear nested slots of previous? already replaced
            }
            document.getElementById('modal').classList.remove('show');
            renderSchematic();
            saveBuild();
          };
        });
      };
      filterInp.oninput = draw;
      draw();
    }

    function removeSlotCascade(key) {
      delete installed[key];
      // remove children whose parent was this item
      const id = key; // need previous id - already deleted
      // wipe any installed keys where parent chain breaks
      const valid = new Set();
      function walk(item) {
        if (!item) return;
        const slots = (item.properties && item.properties.slots) || [];
        slots.forEach(s => {
          const k = item.id + '::' + (s.nameId || s.name);
          valid.add(k);
          if (installed[k]) walk(byId[installed[k]]);
        });
      }
      walk(baseWeapon);
      Object.keys(installed).forEach(k => { if (!valid.has(k)) delete installed[k]; });
    }

    function saveBuild() {
      if (!baseWeapon) return;
      try {
        TarkovStorage.setJson('tarkovGunBuilder', {
          weaponId: baseWeapon.id,
          installed
        });
      } catch (e) {}
    }

    document.getElementById('modalClose').onclick = () => document.getElementById('modal').classList.remove('show');
    document.getElementById('modal').onclick = e => { if (e.target.id === 'modal') e.target.classList.remove('show'); };

    document.getElementById('loadBtn').onclick = async () => {
      const st = document.getElementById('status');
      st.className = 'status'; st.textContent = 'Гружу items…';
      try {
        const mode = document.getElementById('gameMode').value || 'pve';
        const arr = await TarkovAPI.items(mode);
        byId = {};
        weapons = [];
        mods = [];
        arr.forEach(it => {
          byId[it.id] = it;
            if (TarkovWeaponDomain.isWeapon(it)) weapons.push(it);
            if (TarkovWeaponDomain.isMod(it)) mods.push(it);
        });
        // magazines often separate
        arr.forEach(it => {
          if (TarkovWeaponDomain.isMod(it) && (it.properties || {}).propertiesType === 'ItemPropertiesMagazine' && mods.indexOf(it) < 0) mods.push(it);
        });
        st.className = 'status ok';
        st.textContent = `Оружий ${weapons.length} · модов ${mods.length}`;
        document.getElementById('pickCard').style.display = 'block';
        // restore
        try {
          const raw = TarkovStorage.getJson('tarkovGunBuilder', null);
          if (raw && byId[raw.weaponId]) {
            baseWeapon = byId[raw.weaponId];
            installed = raw.installed || {};
            document.getElementById('weaponQ').value = humanize(baseWeapon.normalizedName);
            document.getElementById('buildCard').style.display = 'block';
            renderSchematic();
          }
        } catch (e) {}
      } catch (e) {
        st.className = 'status err'; st.textContent = e.message;
      }
    };

    document.getElementById('weaponQ').addEventListener('input', () => {
      const q = document.getElementById('weaponQ').value.toLowerCase().trim();
      const box = document.getElementById('weaponSuggest');
      if (q.length < 2) { box.style.display = 'none'; return; }
      const list = weapons.filter(w => (w.normalizedName || '').includes(q)).slice(0, 20);
      box.style.display = list.length ? 'block' : 'none';
      box.innerHTML = list.map(w => `<div data-id="${esc(w.id)}">
        <img class="ico" src="${esc(w.iconLink||'')}" alt="">
        <span>${esc(humanize(w.normalizedName))}</span>
      </div>`).join('');
      box.querySelectorAll('div').forEach(d => d.onclick = () => {
        baseWeapon = byId[d.dataset.id];
        installed = {};
        box.style.display = 'none';
        document.getElementById('weaponQ').value = humanize(baseWeapon.normalizedName);
        document.getElementById('buildCard').style.display = 'block';
        renderSchematic();
        saveBuild();
      });
    });

    document.getElementById('clearBuild').onclick = () => {
      installed = {};
      renderSchematic();
      saveBuild();
    };
    document.getElementById('copyBuild').onclick = () => {
      const st = computeStats();
      if (!st) return;
      const text = st.parts.map(p => humanize(p.it.normalizedName)).join('\n');
      navigator.clipboard.writeText(text);
    };
  


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
  const def=TarkovStorage.get(KEY, 'pve')||'pve';
  document.querySelectorAll('select#gameMode').forEach(sel=>{
    if([...sel.options].some(o=>o.value===def)) sel.value=def;
    sel.addEventListener('change',()=>{try{TarkovStorage.set(KEY,sel.value)}catch(e){}});
  });
})();
