
    let itemsById = {};
    let weapons = [];
    let selectedGun = null;
    let source = 'mixed';
    let statMode = 'balance';

    // UI slots (main schematic). Extra mods go to bottom row.
    const SLOT_UI = [
      { keys: ['mod_scope'], cls: 's-scope', label: 'Прицел' },
      { keys: ['mod_sight_rear', 'mod_sight_front'], cls: 's-sight', label: 'Мушка/целик' },
      { keys: ['mod_muzzle'], cls: 's-muzzle', label: 'ДТК / глуш.' },
      { keys: ['mod_barrel'], cls: 's-barrel', label: 'Ствол' },
      { keys: ['mod_handguard'], cls: 's-handguard', label: 'Цевьё' },
      { keys: ['mod_reciever', 'mod_receiver'], cls: 's-receiver', label: 'Ресивер' },
      { keys: ['mod_charge'], cls: 's-charge', label: 'Затвор. рама' },
      { keys: ['mod_stock'], cls: 's-stock', label: 'Приклад' },
      { keys: ['mod_stock_000', 'mod_stock_001', 'mod_stock_axis', 'mod_stock_ak'], cls: 's-buffer', label: 'Трубка / упор' },
      { keys: ['mod_tactical', 'mod_tactical_000', 'mod_tactical_001', 'mod_tactical_002'], cls: 's-tactical', label: 'ЛЦУ / свет' },
      { keys: ['mod_foregrip'], cls: 's-foregrip', label: 'Подствол' },
      { keys: ['mod_magazine'], cls: 's-mag', label: 'Магазин' },
      { keys: ['mod_pistol_grip', 'mod_pistolgrip'], cls: 's-grip', label: 'Рукоять' }
    ];

    function humanize(s) {
      return s ? String(s).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '?';
    }
    function formatNum(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return Math.round(n).toLocaleString('ru-RU');
    }
    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getPrice(it, ll) {
      if (!it) return null;
      const flea = Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0;
      let trader = null;
      (it.buyFromTrader || []).forEach(o => {
        if (o.taskUnlock) return;
        if ((Number(o.minTraderLevel) || 1) > ll) return;
        const price = Number(o.priceRUB != null ? o.priceRUB : o.price) || 0;
        if (!price) return;
        if (!trader || price < trader) trader = price;
      });
      if (source === 'trader') return trader;
      if (source === 'flea') return flea || null;
      if (trader && flea) return Math.min(trader, flea);
      return trader || flea || null;
    }

    function metaOf(it) {
      const p = it.properties || {};
      return {
        ergo: Number(p.ergonomics) || 0,
        recoilMod: Number(p.recoilModifier) || 0,
        accuracy: Number(p.accuracyModifier) || 0,
        weight: Number(it.weight) || 0,
        capacity: Number(p.capacity) || 0,
        slots: p.slots || [],
        propType: p.propertiesType || '',
        sightingRange: Number(p.sightingRange) || 0,
        zoomMax: maxZoom(p)
      };
    }

    function maxZoom(p) {
      const vals = [];
      (function walk(x) {
        if (Array.isArray(x)) x.forEach(walk);
        else if (typeof x === 'number' && x > 0) vals.push(x);
      })(p.zoomLevels);
      return vals.length ? Math.max(...vals) : 0;
    }

    function isScope(it, m) {
      return m.propType === 'ItemPropertiesScope' || m.zoomMax > 0 || m.sightingRange >= 200;
    }

    function isMountLike(it, m) {
      const slug = (it.normalizedName || '').toLowerCase();
      if (isScope(it, m)) return false;
      if (/mount|rail|ring|rings|base|adapter|adaptor|bracket|30mm|34mm/.test(slug)) {
        if (Math.abs(m.ergo) < 3 && Math.abs(m.recoilMod) < 0.03) return true;
      }
      // buffer tubes / stock adapters often named stock tube
      return false;
    }

    function isComboGripStock(it) {
      return /grip.?buttstock|buttstock.?grip|cqr|gripstock|pistol-grip-stock/.test((it.normalizedName || '').toLowerCase());
    }

    /** Чистый вклад мода в выбранную цель */
    function leafScore(m, mode, it) {
      const r = -m.recoilMod * 100;
      const er = m.ergo;
      if (m.propType === 'ItemPropertiesMagazine' || m.capacity > 0) {
        if (mode === 'ergo') return m.capacity * 0.6 + er * 3;
        if (mode === 'recoil') return m.capacity * 1.2 + r * 2;
        if (mode === 'weight') return m.capacity * 1.2 - m.weight * 10;
        return m.capacity * 1.8 + er * 1.2 + r * 0.8;
      }
      if (isScope(it, m)) {
        // прицел: дальность + кратность + эрга
        const optic = (m.zoomMax || 1) * 6 + (m.sightingRange || 0) * 0.02 + er * 1.5;
        if (mode === 'ergo') return optic + er * 2;
        if (mode === 'recoil') return optic + r;
        if (mode === 'weight') return optic - m.weight * 12;
        return optic;
      }
      if (mode === 'ergo') return er * 4.5 + r * 0.4 + m.accuracy * 40;
      if (mode === 'recoil') return r * 4.5 + er * 0.4 + m.accuracy * 30;
      if (mode === 'weight') return -m.weight * 28 + er * 1.2 + r * 1.2;
      return er * 2.3 + r * 2.8 + m.accuracy * 50;
    }

    function conflicts(it, used) {
      const conf = it.conflictingItems || [];
      for (const id of conf) if (used.has(id)) return true;
      for (const uid of used) {
        const u = itemsById[uid];
        if (u && (u.conflictingItems || []).includes(it.id)) return true;
      }
      return false;
    }

    function slotKey(nameId) {
      return (nameId || '').toLowerCase();
    }

    function isScopeSlot(nameId) {
      const n = slotKey(nameId);
      return n.includes('scope') && !n.includes('mount');
    }

    function isMountSlot(nameId) {
      const n = slotKey(nameId);
      return n.includes('mount') || n.includes('scope_000') || n.includes('scope_001');
    }

    document.getElementById('loadBtn').onclick = async () => {
      const btn = document.getElementById('loadBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status';
      status.textContent = 'Гружу items…';
      try {
        const mode = document.getElementById('gameMode').value || 'regular';
        const res = await TarkovAPI.request(`/${mode}/items`, { httpCache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        let items = json?.data?.items;
        if (!items) throw new Error('Нет items');
        if (!Array.isArray(items)) items = Object.values(items);
        itemsById = {};
        items.forEach(i => { itemsById[i.id] = i; });
        weapons = [];
        items.forEach(it => {
          const p = it.properties;
          if (!p || p.propertiesType !== 'ItemPropertiesWeapon') return;
          if ((it.types || []).includes('preset')) return;
          weapons.push({
            id: it.id,
            slug: it.normalizedName || '',
            name: humanize(it.normalizedName),
            icon: it.iconLink || it.gridImageLink || '',
            ergo: Number(p.ergonomics) || 0,
            recV: Number(p.recoilVertical) || 0,
            recH: Number(p.recoilHorizontal) || 0,
            weight: Number(it.weight) || 0,
            slots: p.slots || [],
            raw: it
          });
        });
        weapons.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        document.getElementById('opts').style.display = 'block';
        document.getElementById('buildBtn').disabled = false;
        status.className = 'status ok';
        status.textContent = 'Оружий: ' + weapons.length;
        renderGuns();
      } catch (e) {
        status.className = 'status err';
        status.textContent = 'Ошибка: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    };

    function renderGuns() {
      const q = (document.getElementById('gunSearch').value || '').toLowerCase().trim();
      const el = document.getElementById('gunList');
      el.innerHTML = '';
      weapons.filter(w => !q || w.slug.includes(q) || w.name.toLowerCase().includes(q))
        .slice(0, 80).forEach(w => {
          const div = document.createElement('div');
          div.className = 'gun-row' + (selectedGun && selectedGun.id === w.id ? ' active' : '');
          div.innerHTML = `${w.icon ? `<img class="ico ico-sm" src="${esc(w.icon)}" loading="lazy" alt="">` : ''}
            <div><div class="name">${esc(w.name)}</div><div class="meta">${esc(w.slug)}</div></div>`;
          div.onclick = () => { selectedGun = w; renderGuns(); };
          el.appendChild(div);
        });
    }
    document.getElementById('gunSearch').oninput = renderGuns;

    function priority(nameId) {
      const n = slotKey(nameId);
      // Порядок важен: база → оптика → контроль → остальное
      const order = [
        'mod_reciever', 'mod_receiver', 'mod_barrel', 'mod_handguard',
        'mod_stock', 'mod_stock_000', 'mod_pistol_grip', 'mod_pistolgrip',
        'mod_charge', 'mod_gas_block',
        'mod_scope', 'mod_mount', // mount early so scope can nest
        'mod_muzzle', 'mod_magazine', 'mod_foregrip',
        'mod_tactical', 'mod_sight'
      ];
      for (let i = 0; i < order.length; i++) {
        if (n === order[i] || n.startsWith(order[i])) return i;
      }
      return 40;
    }

    document.getElementById('buildBtn').onclick = () => {
      if (!selectedGun) { alert('Выбери оружие'); return; }
      const budget = Number(document.getElementById('budget').value) || 500000;
      const ll = Number(document.getElementById('ll').value) || 3;
      const w = selectedGun;
      const basePrice = getPrice(w.raw, ll);
      if (basePrice == null) { alert('Нет цены на базу'); return; }
      if (basePrice >= budget) {
        alert('База ≥ бюджета (' + formatNum(basePrice) + ')');
        return;
      }

      let left = budget - basePrice;
      const used = new Set();
      const fitted = []; // {slot, it, price, meta, label}
      const occupied = new Set();

      // Dynamic pool of available slots
      let pool = [...(w.slots || [])];

      function labelOf(nameId) {
        const n = slotKey(nameId);
        for (const u of SLOT_UI) {
          if (u.keys.some(k => n === k || n.startsWith(k))) return u.label;
        }
        if (n.includes('gas')) return 'Газ. блок';
        if (n.includes('mount')) return 'Планка / mount';
        if (n.includes('stock')) return 'Трубка / приклад';
        if (n.includes('scope')) return 'Прицел';
        return nameId || 'Слот';
      }

      function canFit(it) {
        if (used.has(it.id)) return false;
        if (conflicts(it, used)) return false;
        if (isComboGripStock(it)) {
          if ([...occupied].some(s => s.includes('pistol_grip') || s.includes('stock'))) return false;
        }
        return true;
      }

      function install(it, slotName, price, meta) {
        used.add(it.id);
        left -= price;
        occupied.add(slotKey(slotName));
        if (isComboGripStock(it)) {
          occupied.add('mod_pistol_grip');
          occupied.add('mod_pistolgrip');
          occupied.add('mod_stock');
          occupied.add('mod_stock_000');
        }
        fitted.push({
          slot: slotName,
          it,
          price,
          meta,
          label: labelOf(slotName)
        });
        // open nested
        (meta.slots || []).forEach(ns => {
          if (!pool.some(s => s.nameId === ns.nameId && s === ns)) pool.push(ns);
        });
      }

      /** Лучший кандидат в слот: max leafScore в бюджете */
      function bestInSlot(sl, budgetLeft, preferScope) {
        const allowed = (sl.filters && sl.filters.allowedItems) || [];
        let best = null;
        allowed.forEach(id => {
          const it = itemsById[id];
          if (!it || !canFit(it)) return;
          const price = getPrice(it, ll);
          if (price == null || price <= 0 || price > budgetLeft) return;
          const m = metaOf(it);
          let sc = leafScore(m, statMode, it);

          // mount: score = mount + best nested scope/child if any
          if (isMountLike(it, m) || isMountSlot(sl.nameId)) {
            let childBest = null;
            (m.slots || []).forEach(ns => {
              const nested = bestInSlot(ns, budgetLeft - price, true);
              if (nested && (!childBest || nested.sc > childBest.sc)) childBest = nested;
            });
            if (preferScope || isScopeSlot(sl.nameId) || isMountSlot(sl.nameId)) {
              if (!childBest || !isScope(childBest.it, childBest.meta)) {
                // mount без прицела почти бесполезен для цели «нужен прицел»
                sc = sc * 0.05 + (childBest ? childBest.sc * 0.2 : 0);
              } else {
                sc = sc * 0.1 + childBest.sc;
                return void consider({
                  it, price, meta: m, sc, child: childBest, total: price + childBest.price
                });
              }
            } else if (childBest) {
              sc = sc + childBest.sc * 0.85;
              return void consider({
                it, price, meta: m, sc, child: childBest, total: price + childBest.price
              });
            }
          }

          // для scope-слота жёстко предпочитаем реальные прицелы
          if (preferScope || isScopeSlot(sl.nameId)) {
            if (!isScope(it, m) && !isMountLike(it, m)) sc -= 50;
            if (isScope(it, m)) sc += 30;
          }

          consider({ it, price, meta: m, sc, child: null, total: price });
        });

        function consider(cand) {
          if (cand.total > budgetLeft) return;
          if (!best || cand.sc > best.sc || (cand.sc === best.sc && cand.total > best.total)) {
            best = cand;
          }
        }
        return best;
      }

      // --- Phase 1: structural parts (receiver, barrel, handguard, stock, grip, charge)
      function phaseStructural() {
        const want = ['mod_reciever', 'mod_receiver', 'mod_barrel', 'mod_handguard',
          'mod_stock', 'mod_stock_000', 'mod_pistol_grip', 'mod_pistolgrip', 'mod_charge', 'mod_gas_block'];
        for (let round = 0; round < 8; round++) {
          pool.sort((a, b) => priority(a.nameId) - priority(b.nameId));
          let got = false;
          for (const sl of pool) {
            const n = slotKey(sl.nameId);
            if (!want.some(w => n === w || n.startsWith(w))) continue;
            if ([...occupied].some(o => o === n || n.startsWith(o) || o.startsWith(n))) continue;
            const b = bestInSlot(sl, left, false);
            if (!b) continue;
            install(b.it, sl.nameId, b.price, b.meta);
            if (b.child) install(b.child.it, b.child.slot || 'nested', b.child.price, b.child.meta);
            got = true;
          }
          if (!got) break;
        }
      }

      // --- Phase 2: OPTIC must-have (reserve up to 45% remaining or at least try)
      function phaseOptic() {
        // find any scope/mount slots in pool
        const opticSlots = pool.filter(sl => {
          const n = slotKey(sl.nameId);
          return n.includes('scope') || n.includes('mount');
        });
        // also scan nested on fitted
        fitted.forEach(f => {
          (f.meta.slots || []).forEach(ns => {
            const n = slotKey(ns.nameId);
            if ((n.includes('scope') || n.includes('mount')) && !opticSlots.includes(ns)) {
              opticSlots.push(ns);
            }
          });
        });

        // already have scope?
        if (fitted.some(f => isScope(f.it, f.meta))) return;

        let best = null;
        opticSlots.forEach(sl => {
          const b = bestInSlot(sl, left, true);
          if (!b) return;
          // require actual scope in pack
          const hasScope = isScope(b.it, b.meta) || (b.child && isScope(b.child.it, b.child.meta));
          if (!hasScope) return;
          if (!best || b.sc > best.sc) best = { ...b, slot: sl.nameId };
        });
        if (best) {
          install(best.it, best.slot, best.price, best.meta);
          if (best.child) install(best.child.it, best.child.slot || best.slot + '/scope', best.child.price, best.child.meta);
        }
      }

      // --- Phase 3: fill everything else maximizing score
      function phaseFill() {
        for (let round = 0; round < 40; round++) {
          pool.sort((a, b) => priority(a.nameId) - priority(b.nameId));
          let bestMove = null;
          for (const sl of pool) {
            const n = slotKey(sl.nameId);
            // skip occupied same slot
            if (occupied.has(n)) continue;
            // soft: allow multiple tactical mounts with different nameIds
            const b = bestInSlot(sl, left, isScopeSlot(sl.nameId));
            if (!b || b.sc < 0.5) continue;
            // skip pure empty mounts if we already have optic
            if (isMountLike(b.it, b.meta) && !b.child && fitted.some(f => isScope(f.it, f.meta))) {
              if (b.sc < 3) continue;
            }
            if (!bestMove || b.sc > bestMove.sc) {
              bestMove = { ...b, slot: sl.nameId };
            }
          }
          if (!bestMove) break;
          install(bestMove.it, bestMove.slot, bestMove.price, bestMove.meta);
          if (bestMove.child) {
            install(bestMove.child.it, bestMove.child.slot || 'nested', bestMove.child.price, bestMove.child.meta);
          }
        }
      }

      // --- Phase 4: upgrade pass — swap to higher score if budget allows
      function phaseUpgrade() {
        for (let pass = 0; pass < 30; pass++) {
          let improved = false;
          for (let i = 0; i < fitted.length; i++) {
            const cur = fitted[i];
            const sl = pool.find(s => slotKey(s.nameId) === slotKey(cur.slot));
            if (!sl) continue;
            const freed = left + cur.price;
            used.delete(cur.it.id);
            const b = bestInSlot(sl, freed, isScope(cur.it, cur.meta) || isScopeSlot(cur.slot));
            if (b && b.it.id !== cur.it.id && b.sc > leafScore(cur.meta, statMode, cur.it) + 0.8 && !b.child) {
              left = freed - b.price;
              used.add(b.it.id);
              fitted[i] = { slot: cur.slot, it: b.it, price: b.price, meta: b.meta, label: cur.label };
              improved = true;
            } else {
              used.add(cur.it.id);
            }
          }
          if (!improved) break;
        }
      }

      phaseStructural();
      phaseOptic();
      phaseFill();
      phaseUpgrade();

      // stats
      let ergo = w.ergo, recV = w.recV, recH = w.recH, weight = w.weight;
      fitted.forEach(f => {
        ergo += f.meta.ergo;
        recV *= (1 + f.meta.recoilMod);
        recH *= (1 + f.meta.recoilMod);
        weight += f.meta.weight;
      });
      const cost = budget - left;
      const totalRec = recV + recH;
      const hasOptic = fitted.some(f => isScope(f.it, f.meta));

      document.getElementById('result').style.display = 'block';
      document.getElementById('buildHead').innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          ${w.icon ? `<img class="ico ico-lg" src="${esc(w.icon)}" alt="">` : ''}
          <div>
            <div class="name" style="font-size:1.2rem">${esc(w.name)}</div>
            <div class="meta">${esc(w.slug)} · цель: <b>${statMode}</b>
              ${hasOptic ? '' : ' · <span class="warn">прицел не влез в бюджет/слоты</span>'}</div>
          </div>
        </div>`;

      // schematic: map first match per UI class, rest to extra
      const layout = document.getElementById('layout');
      layout.innerHTML = '';
      const usedInUi = new Set();
      const byCls = {};
      fitted.forEach(f => {
        const n = slotKey(f.slot);
        for (const u of SLOT_UI) {
          if (u.keys.some(k => n === k || n.startsWith(k))) {
            if (!byCls[u.cls]) {
              byCls[u.cls] = f;
              usedInUi.add(f.it.id + '|' + f.slot);
            }
            return;
          }
        }
      });

      SLOT_UI.forEach(u => {
        const f = byCls[u.cls];
        const div = document.createElement('div');
        div.className = 'slot-box ' + u.cls + (f ? ' filled' : ' empty');
        if (f) {
          const icon = f.it.iconLink || f.it.gridImageLink || '';
          const name = humanize(f.it.normalizedName);
          const slug = f.it.normalizedName || '';
          div.innerHTML = `${icon ? `<img src="${esc(icon)}" alt="">` : ''}
            <div class="slot-label">${esc(u.label)}</div>
            <div class="tip">${esc(name)} · ${formatNum(f.price)} ₽</div>`;
          div.onclick = () => navigator.clipboard.writeText(slug);
        } else {
          div.innerHTML = `<div class="slot-label">${esc(u.label)}</div>`;
        }
        layout.appendChild(div);
      });

      // extra row: ALL remaining mods
      const extra = document.createElement('div');
      extra.className = 'slot-box s-extra';
      fitted.forEach(f => {
        if (usedInUi.has(f.it.id + '|' + f.slot)) return;
        const icon = f.it.iconLink || f.it.gridImageLink || '';
        const name = humanize(f.it.normalizedName);
        const slug = f.it.normalizedName || '';
        const box = document.createElement('div');
        box.className = 'slot-box filled';
        box.innerHTML = `${icon ? `<img src="${esc(icon)}" alt="">` : ''}
          <div class="slot-label">${esc(f.label)}</div>
          <div class="tip">${esc(name)} · ${formatNum(f.price)} ₽</div>`;
        box.onclick = () => navigator.clipboard.writeText(slug);
        extra.appendChild(box);
      });
      layout.appendChild(extra);

      document.getElementById('stats').innerHTML = `
        <div class="stat"><div class="k">Сумма</div><div class="v">${formatNum(cost)}</div></div>
        <div class="stat"><div class="k">Бюджет</div><div class="v">${formatNum(budget)}</div></div>
        <div class="stat"><div class="k">Остаток</div><div class="v">${formatNum(left)}</div></div>
        <div class="stat"><div class="k">Эрга</div><div class="v">${ergo.toFixed(1)}</div></div>
        <div class="stat"><div class="k">Отд. верт</div><div class="v">${recV.toFixed(0)}</div></div>
        <div class="stat"><div class="k">Отд. гор</div><div class="v">${recH.toFixed(0)}</div></div>
        <div class="stat"><div class="k">Σ отдача</div><div class="v">${totalRec.toFixed(0)}</div></div>
        <div class="stat"><div class="k">Вес</div><div class="v">${weight.toFixed(2)} кг</div></div>
        <div class="stat"><div class="k">Модов</div><div class="v">${fitted.length}</div></div>
      `;

      // FULL list — every module
      document.getElementById('modList').innerHTML = fitted.map(f => {
        const icon = f.it.iconLink || f.it.gridImageLink || '';
        const name = humanize(f.it.normalizedName);
        const slug = f.it.normalizedName || '';
        return `<li>
          ${icon ? `<img src="${esc(icon)}" width="40" height="40" style="object-fit:contain;background:#0a0c10;border-radius:4px" alt="">` : ''}
          <span class="meta">${esc(f.label)}</span>
          <b>${esc(name)}</b>
          <span>${formatNum(f.price)} ₽</span>
          <span class="meta">${esc(f.slot)}</span>
          <button type="button" class="copy-btn" data-n="${esc(slug)}">копир.</button>
        </li>`;
      }).join('');
      document.querySelectorAll('#modList .copy-btn').forEach(b => {
        b.onclick = () => navigator.clipboard.writeText(b.dataset.n || '');
      });

      document.getElementById('status').className = 'status ok';
      document.getElementById('status').textContent =
        `Собрано ${formatNum(cost)} ₽ · модов ${fitted.length} · эрга ${ergo.toFixed(1)} · Σ отд. ${totalRec.toFixed(0)}`
        + (hasOptic ? '' : ' · без прицела');
    };

    function bindChips(id, set) {
      document.getElementById(id).onclick = e => {
        const c = e.target.closest('.chip');
        if (!c) return;
        document.querySelectorAll('#' + id + ' .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        set(c.dataset.v);
      };
    }
    bindChips('sourceChips', v => source = v);
    bindChips('statChips', v => statMode = v);
  


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

  const KEY = 'tarkovPreferredGameMode';
  const def = localStorage.getItem(KEY) || 'pve';
  document.querySelectorAll('select#gameMode, select[id*="gameMode"], select[id*="GameMode"]').forEach(sel => {
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
    sel.addEventListener('change', () => {
      try { localStorage.setItem(KEY, sel.value); } catch(e) {}
    });
  });
})();
