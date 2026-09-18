
    const STORAGE = 'tarkovRaidChecklistV2';
    const DURATION_MS = 20 * 60 * 1000;

    const DEFAULT_MAPS = {
      'Factory': [
        { name: 'Граната Ф-1', qty: 2 },
        { name: 'Аптечка', qty: 1 }
      ],
      'Reserve': [
        { name: 'Паракорд', qty: 1 },
        { name: 'Красная карта / ключи', qty: 1 },
        { name: 'Граната Ф-1', qty: 3 }
      ],
      'Labs': [
        { name: 'Ключ-карты', qty: 1 },
        { name: 'Мельдонин', qty: 1 }
      ],
      'Customs': [
        { name: 'Ключница', qty: 1 },
        { name: 'Граната Ф-1', qty: 2 }
      ],
      'Woods': [
        { name: 'Граната Ф-1', qty: 2 },
        { name: 'Еда / вода', qty: 1 }
      ],
      'Interchange': [
        { name: 'Ключница', qty: 1 },
        { name: 'Рюкзак под лут', qty: 1 }
      ],
      'Shoreline': [
        { name: 'Ключи санатория', qty: 1 },
        { name: 'Еда / вода', qty: 1 }
      ],
      'Streets': [
        { name: 'Ключница', qty: 1 },
        { name: 'Мельдонин', qty: 1 }
      ],
      'Lighthouse': [
        { name: 'Вода', qty: 1 },
        { name: 'Граната Ф-1', qty: 2 }
      ],
      'Ground Zero': [
        { name: 'Аптечка', qty: 1 }
      ],
      'Общий': []
    };

    let state = {
      maps: {},          // name -> [{id,name,qty,checked}]
      current: 'Reserve',
      endsAt: null
    };
    let tickTimer = null;
    let dragId = null;

    function uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function ensureItemShape(it) {
      return {
        id: it.id || uid(),
        name: it.name || '?',
        qty: Number(it.qty) || 1,
        checked: !!it.checked
      };
    }

    function load() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE) || 'null');
        if (raw && raw.maps) {
          state.maps = raw.maps;
          state.current = raw.current || Object.keys(state.maps)[0] || 'Общий';
          // migrate checked
          Object.keys(state.maps).forEach(k => {
            state.maps[k] = (state.maps[k] || []).map(ensureItemShape);
          });
          if (raw.endsAt && raw.endsAt > Date.now()) state.endsAt = raw.endsAt;
          else if (raw.endsAt && raw.endsAt <= Date.now()) {
            clearAllChecks();
            state.endsAt = null;
          }
          return;
        }
      } catch (e) {}
      // defaults
      state.maps = {};
      Object.entries(DEFAULT_MAPS).forEach(([k, list]) => {
        state.maps[k] = list.map(x => ensureItemShape({ ...x, checked: false }));
      });
      state.current = 'Reserve';
    }

    function save() {
      try {
        localStorage.setItem(STORAGE, JSON.stringify({
          maps: state.maps,
          current: state.current,
          endsAt: state.endsAt
        }));
      } catch (e) {}
    }

    function currentList() {
      if (!state.maps[state.current]) state.maps[state.current] = [];
      return state.maps[state.current];
    }

    function clearAllChecks() {
      Object.keys(state.maps).forEach(k => {
        (state.maps[k] || []).forEach(it => { it.checked = false; });
      });
    }

    function clearCurrentChecks() {
      currentList().forEach(it => { it.checked = false; });
    }

    function renderMaps() {
      const el = document.getElementById('maps');
      const names = Object.keys(state.maps).sort((a, b) => a.localeCompare(b, 'ru'));
      el.innerHTML = names.map(n =>
        `<span class="map-chip ${n === state.current ? 'active' : ''}" data-m="${escapeAttr(n)}">${escapeHtml(n)}</span>`
      ).join('');
      el.querySelectorAll('.map-chip').forEach(chip => {
        chip.onclick = () => {
          state.current = chip.dataset.m;
          save();
          renderMaps();
          renderList();
        };
      });
      document.getElementById('mapMeta').textContent =
        'Сейчас: ' + state.current + ' · ' + currentList().length + ' позиций';
    }

    function escapeHtml(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function escapeAttr(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    }

    function renderList() {
      const list = currentList();
      const el = document.getElementById('list');
      if (!list.length) {
        el.innerHTML = '<p class="meta">Пусто для этой карты — добавь паракорд, ключи, гранаты…</p>';
        return;
      }
      el.innerHTML = list.map(it => `
        <div class="item ${it.checked ? 'done' : ''}" draggable="true" data-id="${escapeAttr(it.id)}">
          <span class="handle" title="перетащить">⋮⋮</span>
          <input type="checkbox" ${it.checked ? 'checked' : ''}>
          <span class="label">${escapeHtml(it.name)}</span>
          <span class="qty">×${it.qty}</span>
          <button type="button" class="del" title="удалить">✕</button>
        </div>
      `).join('');

      el.querySelectorAll('.item').forEach(row => {
        const id = row.dataset.id;
        const it = list.find(x => x.id === id);
        if (!it) return;

        row.querySelector('input[type=checkbox]').onchange = (e) => {
          it.checked = !!e.target.checked;
          save();
          row.classList.toggle('done', it.checked);
        };
        row.querySelector('.del').onclick = () => {
          state.maps[state.current] = list.filter(x => x.id !== id);
          save();
          renderList();
          renderMaps();
        };

        row.addEventListener('dragstart', e => {
          dragId = id;
          row.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', id); } catch (err) {}
        });
        row.addEventListener('dragend', () => {
          dragId = null;
          row.classList.remove('dragging');
          el.querySelectorAll('.item').forEach(x => x.classList.remove('drag-over'));
        });
        row.addEventListener('dragover', e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          el.querySelectorAll('.item').forEach(x => x.classList.remove('drag-over'));
          row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', e => {
          e.preventDefault();
          row.classList.remove('drag-over');
          const fromId = dragId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
          const toId = id;
          if (!fromId || fromId === toId) return;
          const arr = currentList();
          const fromIdx = arr.findIndex(x => x.id === fromId);
          const toIdx = arr.findIndex(x => x.id === toId);
          if (fromIdx < 0 || toIdx < 0) return;
          const [moved] = arr.splice(fromIdx, 1);
          arr.splice(toIdx, 0, moved);
          save();
          renderList();
        });
      });
    }

    function formatRemain(ms) {
      if (ms < 0) ms = 0;
      const s = Math.ceil(ms / 1000);
      const m = Math.floor(s / 60);
      const r = s % 60;
      return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
    }

    function renderTimer() {
      const timerEl = document.getElementById('timer');
      const meta = document.getElementById('timerMeta');
      const bar = document.getElementById('bar');
      const btn = document.getElementById('raidBtn');

      if (!state.endsAt) {
        timerEl.className = 'timer idle';
        timerEl.textContent = '20:00 · готов';
        meta.textContent = 'Таймер не запущен';
        bar.style.width = '0%';
        btn.textContent = 'В РЕЙД';
        btn.classList.remove('active');
        return;
      }

      const left = state.endsAt - Date.now();
      if (left <= 0) {
        state.endsAt = null;
        clearAllChecks();
        save();
        renderList();
        timerEl.className = 'timer idle';
        timerEl.textContent = '00:00 · сброс';
        meta.textContent = '20 минут — галочки сняты на всех картах';
        bar.style.width = '100%';
        btn.textContent = 'В РЕЙД';
        btn.classList.remove('active');
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        return;
      }

      timerEl.className = 'timer';
      timerEl.textContent = formatRemain(left);
      bar.style.width = Math.min(100, ((DURATION_MS - left) / DURATION_MS) * 100) + '%';
      meta.textContent = 'До сброса галочек';
      btn.textContent = 'ОТМЕНИТЬ ТАЙМЕР';
      btn.classList.add('active');
    }

    function startTick() {
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = setInterval(renderTimer, 500);
      renderTimer();
    }

    document.getElementById('addBtn').onclick = addItem;
    document.getElementById('name').addEventListener('keydown', e => {
      if (e.key === 'Enter') addItem();
    });

    function addItem() {
      const name = document.getElementById('name').value.trim();
      let qty = parseInt(document.getElementById('qty').value, 10);
      if (!name) return;
      if (!qty || qty < 1) qty = 1;
      const list = currentList();
      const existing = list.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (existing) existing.qty += qty;
      else list.push(ensureItemShape({ name, qty, checked: false }));
      document.getElementById('name').value = '';
      document.getElementById('qty').value = 1;
      save();
      renderList();
      renderMaps();
      document.getElementById('name').focus();
    }

    document.getElementById('addMapBtn').onclick = () => {
      const n = document.getElementById('newMap').value.trim();
      if (!n) return;
      if (state.maps[n]) { alert('Уже есть'); return; }
      state.maps[n] = [];
      state.current = n;
      document.getElementById('newMap').value = '';
      save();
      renderMaps();
      renderList();
    };

    document.getElementById('delMapBtn').onclick = () => {
      if (Object.keys(state.maps).length <= 1) { alert('Нужна хотя бы одна карта'); return; }
      if (!confirm('Удалить сборку «' + state.current + '»?')) return;
      delete state.maps[state.current];
      state.current = Object.keys(state.maps)[0];
      save();
      renderMaps();
      renderList();
    };

    document.getElementById('copyMapBtn').onclick = () => {
      const to = prompt('Копировать список «' + state.current + '» в карту (имя):');
      if (!to || !to.trim()) return;
      const name = to.trim();
      const clone = currentList().map(it => ensureItemShape({
        name: it.name, qty: it.qty, checked: false
      }));
      state.maps[name] = clone;
      state.current = name;
      save();
      renderMaps();
      renderList();
    };

    document.getElementById('uncheckAll').onclick = () => {
      clearCurrentChecks();
      save();
      renderList();
    };
    document.getElementById('checkAll').onclick = () => {
      currentList().forEach(it => { it.checked = true; });
      save();
      renderList();
    };
    document.getElementById('clearList').onclick = () => {
      if (!currentList().length) return;
      if (!confirm('Очистить список карты «' + state.current + '»?')) return;
      state.maps[state.current] = [];
      save();
      renderList();
      renderMaps();
    };

    document.getElementById('raidBtn').onclick = () => {
      if (state.endsAt) {
        state.endsAt = null;
        save();
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        renderTimer();
        return;
      }
      state.endsAt = Date.now() + DURATION_MS;
      save();
      startTick();
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderTimer();
    });

    load();
    renderMaps();
    renderList();
    if (state.endsAt) startTick();
    else renderTimer();
  