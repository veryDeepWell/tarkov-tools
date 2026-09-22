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

    const CATALOG = [
      {file:'tarkovtool-my-tarkov.html', title:'My Tarkov'},
      {file:'tarkovtool-price-track.html', title:'Динамика цен'},
      {file:'tarkovtool-cultist.html', title:'Круг культистов'},
      {file:'tarkovtool-restock.html', title:'Таймер рестока'},
      {file:'tarkovtool-hideout.html', title:'Трекер убежища'},
      {file:'tarkovtool-raid-checklist.html', title:'Чек-лист рейда'},
      {file:'tarkovtool-quests.html', title:'Квесты'},
      {file:'tarkovtool-ammo.html', title:'Патроны'},
      {file:'tarkovtool-trader-flip.html', title:'Трейдер-флип'},
      {file:'tarkovtool-barter-live.html', title:'Бартер live'},
      {file:'tarkovtool-item-use.html', title:'Что с предметом'},
      {file:'tarkovtool-loot-slot.html', title:'Лут ₽/слот'},
      {file:'tarkovtool-gun-builder.html', title:'Gun Builder'},
      {file:'tarkovtool-skills.html', title:'Скиллы'},
      {file:'tarkovtool-helmets.html', title:'Шлемы'},
      {file:'tarkovtool-nvg.html', title:'ПНВ'},
      {file:'tarkovtool-hub.html', title:'Хаб'}
    ];

    let tabs = [];
    let active = null;

    function loadTabs() {
      const saved = (window.TarkovState && TarkovState.getOpenTabs()) || [];
      tabs = Array.isArray(saved) ? saved.filter(t => t && t.file) : [];
      if (tabs.length) active = tabs[0].id;
    }
    function persist() {
      if (window.TarkovState) TarkovState.setOpenTabs(tabs.map(t => ({id:t.id, file:t.file, title:t.title})));
    }
    function titleOf(file) {
      const c = CATALOG.find(x => x.file === file);
      return c ? c.title : file.replace(/^tarkovtool-/,'').replace(/\.html$/,'');
    }
    function addTab(file) {
      if (tabs.length >= 8) { alert('Макс 8 вкладок'); return; }
      const id = 't' + Date.now();
      tabs.push({id, file, title: titleOf(file)});
      active = id;
      persist();
      render();
    }
    function closeTab(id, ev) {
      if (ev) { ev.stopPropagation(); ev.preventDefault(); }
      const i = tabs.findIndex(t => t.id === id);
      if (i < 0) return;
      tabs.splice(i, 1);
      if (active === id) active = tabs[0] ? tabs[0].id : null;
      persist();
      render();
    }
    function activate(id) {
      active = id;
      render();
    }
    function render() {
      const tabsEl = document.getElementById('tabs');
      tabsEl.innerHTML = tabs.map(t =>
        `<div class="tab ${t.id===active?'active':''}" data-id="${t.id}">
          <span title="${t.title}">${t.title}</span>
          <span class="x" data-close="${t.id}">×</span>
        </div>`
      ).join('');
      tabsEl.querySelectorAll('.tab').forEach(el => {
        el.onclick = (e) => {
          if (e.target.getAttribute('data-close')) closeTab(e.target.getAttribute('data-close'), e);
          else activate(el.getAttribute('data-id'));
        };
      });

      const body = document.getElementById('body');
      const empty = document.getElementById('empty');
      body.querySelectorAll('iframe[data-id]').forEach(ifr => {
        const id = ifr.getAttribute('data-id');
        if (!tabs.find(t => t.id === id)) ifr.remove();
      });
      tabs.forEach(t => {
        let ifr = body.querySelector('iframe[data-id="'+t.id+'"]');
        if (!ifr) {
          ifr = document.createElement('iframe');
          ifr.setAttribute('data-id', t.id);
          ifr.src = t.file;
          ifr.title = t.title;
          body.appendChild(ifr);
        }
        ifr.classList.toggle('active', t.id === active);
      });
      empty.style.display = tabs.length ? 'none' : 'flex';
      renderNotifBadge();
    }

    function renderPicker() {
      const q = (document.getElementById('pq').value||'').toLowerCase();
      const list = CATALOG.filter(c => !q || c.title.toLowerCase().includes(q) || c.file.includes(q));
      document.getElementById('plist').innerHTML = list.map(c =>
        `<a href="#" data-file="${c.file}">${c.title}</a>`
      ).join('');
      document.querySelectorAll('#plist a').forEach(a => {
        a.onclick = (e) => {
          e.preventDefault();
          addTab(a.getAttribute('data-file'));
          document.getElementById('picker').classList.remove('open');
        };
      });
    }
    function renderNotifBadge() {
      const list = (window.TarkovState && TarkovState.notifications()) || [];
      const n = list.filter(x => !x.read).length;
      const b = document.getElementById('badge');
      if (n) { b.style.display='inline'; b.textContent = n; }
      else b.style.display='none';
    }
    function renderNotifs() {
      const list = (window.TarkovState && TarkovState.notifications()) || [];
      document.getElementById('nlist').innerHTML = list.length ? list.map(n =>
        `<div class="notif-item ${n.read?'':'unread'}" data-id="${n.id}">
          <div class="t">${esc(n.title||'Событие')}</div>
          <div>${esc(n.body||'')}</div>
          <div class="m">${new Date(n.ts).toLocaleString('ru-RU')}</div>
        </div>`
      ).join('') : '<div class="meta">Пусто</div>';
      document.querySelectorAll('.notif-item').forEach(el => {
        el.onclick = () => {
          if (window.TarkovState) TarkovState.markRead(el.getAttribute('data-id'));
          const n = list.find(x => x.id === el.getAttribute('data-id'));
          if (n && n.href) addTab(n.href);
          renderNotifs(); renderNotifBadge();
        };
      });
    }
    function esc(s){return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');}

    document.getElementById('addBtn').onclick = () => {
      document.getElementById('npanel').classList.remove('open');
      document.getElementById('picker').classList.toggle('open');
      renderPicker();
    };
    document.getElementById('emptyAdd').onclick = () => document.getElementById('addBtn').click();
    document.getElementById('pq').oninput = renderPicker;
    document.getElementById('notifBtn').onclick = () => {
      document.getElementById('picker').classList.remove('open');
      document.getElementById('npanel').classList.toggle('open');
      renderNotifs();
    };
    document.getElementById('clearN').onclick = () => {
      if (window.TarkovState) TarkovState.clearNotifications();
      renderNotifs(); renderNotifBadge();
    };
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.picker') && !e.target.closest('#addBtn'))
        document.getElementById('picker').classList.remove('open');
      if (!e.target.closest('.notif-panel') && !e.target.closest('#notifBtn'))
        document.getElementById('npanel').classList.remove('open');
    });

    loadTabs();
    render();
    try {
      if (!TarkovStorage.get('tarkovDeskWelcome', null)) {
        TarkovStorage.set('tarkovDeskWelcome','1');
        if (window.TarkovState) TarkovState.notify({
          title: 'Desk готов',
          body: 'Открывай инструменты мини-вкладками. Состояние общее (TarkovStorage).',
          href: 'tarkovtool-my-tarkov.html'
        });
      }
    } catch(e){}
  