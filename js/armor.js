
    function t(key, params) {
      return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
    }
    let statusState = null;
    function renderStatus() {
      if (!statusState) return;
      const status = document.getElementById('status');
      status.className = 'status' + (statusState.tone ? ' ' + statusState.tone : '');
      status.textContent = t(statusState.key, statusState.params);
    }
    function setStatus(key, params, tone) {
      statusState = { key, params, tone };
      renderStatus();
    }
    function kindLabel(kind) {
      return window.TarkovDicts && TarkovDicts.armorKindLabel
        ? TarkovDicts.armorKindLabel(kind)
        : kind;
    }

    let rows = [];
    let platesById = {};
    let activeTypes = new Set(['armor', 'rig', 'helmet']);
    let activeClasses = new Set([1,2,3,4,5,6]);
    let sortKey = 'score';
    let sortDir = -1;

    function loadSettings(key, defaults) { return TarkovUI.loadSettings(key, defaults); }
    function saveSettings(key, obj) { TarkovUI.saveSettings(key, obj); }

    function humanize(slug) { return TarkovDicts.humanize(slug); }
    function formatNum(n) { return TarkovDicts.fmtNum(n); }
    function esc(s) { return TarkovDicts.esc(s); }

    function scoreTitle(components, details) {
      if (!components) return "";
      const lines = ["quality", "accessibility", "value", "load"].map(key =>
        t("tool.itemScore.factor." + key) + ": " + components[key]
      );
      if (details) {
        lines.push(t("tool.itemScore.detail.fleaPrice") + ": " + (details.fleaPrice ? formatNum(details.fleaPrice) : "—"));
        lines.push(t("tool.itemScore.detail.traderPrice") + ": " + (details.traderPrice ? formatNum(details.traderPrice) : "—"));
        lines.push(t("tool.itemScore.detail.traderLevel") + ": " + (details.traderPrice ? details.traderLevel : "—"));
        lines.push(t("tool.itemScore.detail.questLocked") + ": " + t(details.questLocked ? "tool.itemScore.yes" : "tool.itemScore.no"));
        lines.push(t("tool.itemScore.detail.listingCount") + ": " + (details.listingCount || "—"));
        lines.push(t("tool.itemScore.detail.weightSize") + ": " + details.weight + " / " + details.size);
      }
      return lines.join("\n");
    }

    function showPlates(row) {
      const dialog = document.getElementById("plateDialog");
      const title = document.getElementById("plateDialogTitle");
      const body = document.getElementById("plateDialogBody");
      title.textContent = row.name + " — " + t("tool.armor.ui.compatiblePlates");
      body.innerHTML = row.plateIds.map(id => {
        const plate = platesById[id];
        if (!plate) {
          return `<div class="plate-option"><span>${esc(id)}</span><span class="meta">${esc(t("tool.armor.ui.unresolved"))}</span></div>`;
        }
        const icon = plate.icon
          ? `<img class="plate-icon" src="${esc(plate.icon)}" alt="${esc(plate.name)}" title="${esc(plate.name)}" loading="lazy">`
          : "";
        const price = plate.avg || plate.low;
        return `<div class="plate-option">${icon}<span><strong>${esc(plate.name)}</strong><small>${esc(t("tool.itemScore.class"))} ${plate.class} · ${esc(plate.material || "—")} · ${price ? formatNum(price) + " ₽" : "—"}</small></span></div>`;
      }).join("");
      if (typeof dialog.showModal === "function") dialog.showModal();
    }

    document.getElementById('loadBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadBtn');
      btn.disabled = true;
      const mode = document.getElementById('gameMode').value || 'regular';
      const progress = window.TarkovUI && TarkovUI.progress;
      if (progress) progress.start({ label: t("tool.itemScore.loading"), indeterminate: true });
      setStatus("tool.armor.ui.loading");
      try {
        const items = await TarkovAPI.items(mode);

        const view = TarkovItemViewModels.armor(items, {
          traderLabel: id => TarkovDicts.traderName(id)
        });
        rows = view.rows;
        platesById = view.platesById;

        document.getElementById('filtersCard').style.display = 'block';
        document.getElementById('tableCard').style.display = 'block';
        renderTypeChips();
        renderClassChips();
        renderTable();
        setStatus("tool.itemScore.loaded", { count: rows.length }, "ok");
        if (progress) progress.done(t("tool.itemScore.loaded", { count: rows.length }));
      } catch (e) {
        console.error(e);
        setStatus("tool.itemScore.loadError", { message: e.message }, "err");
        if (progress) progress.fail(t("tool.itemScore.loadError", { message: e.message }));
      } finally {
        btn.disabled = false;
      }
    });

    function renderTypeChips() {
      const el = document.getElementById('typeChips');
      const kinds = ['armor', 'rig', 'helmet', 'plate'];
      el.innerHTML = '';
      kinds.forEach(k => {
        const c = document.createElement('span');
        c.className = 'chip' + (activeTypes.has(k) ? ' active' : '');
        c.textContent = kindLabel(k);
        c.onclick = () => {
          if (activeTypes.has(k)) activeTypes.delete(k);
          else activeTypes.add(k);
          c.classList.toggle('active');
          renderTable();
          persist();
        };
        el.appendChild(c);
      });
    }

    function renderClassChips() {
      const el = document.getElementById('classChips');
      el.innerHTML = '';
      [1,2,3,4,5,6].forEach(cl => {
        const c = document.createElement('span');
        c.className = 'chip' + (activeClasses.has(cl) ? ' active' : '');
        c.textContent = t("tool.itemScore.class") + ' ' + cl;
        c.onclick = () => {
          if (activeClasses.has(cl)) activeClasses.delete(cl);
          else activeClasses.add(cl);
          c.classList.toggle('active');
          renderTable();
          persist();
        };
        el.appendChild(c);
      });
    }

    function getFiltered() {
      const q = (document.getElementById('search').value || '').toLowerCase().trim();
      const hideQuest = document.getElementById('hideQuest').checked;
      const onlyFlea = document.getElementById('onlyFlea').checked;
      let list = TarkovItemDomain.filter(rows, {
        kinds: [...activeTypes],
        classes: [...activeClasses],
        onlyFlea: onlyFlea,
        search: q
      }).filter(r => !(hideQuest && r.quest) && (r.class || r.kind === 'rig'));
      list.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (sortKey === 'quest') { va = a.quest ? 1 : 0; vb = b.quest ? 1 : 0; }
        if (typeof va === 'string') return sortDir * va.localeCompare(vb, 'ru');
        return sortDir * ((va ?? -1) - (vb ?? -1));
      });
      return list;
    }

    function renderTable() {
      const list = getFiltered();
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = '';
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="11" class="meta empty-cell">${esc(t("common.empty"))}</td></tr>`;
        return;
      }
      list.forEach(r => {
        const tr = document.createElement('tr');
        const zones = r.zones.map(z => `<span class="zone-tag">${esc(t("tool.itemScore.zone." + z))}</span>`).join('') || '—';
        const flea = r.onFlea ? formatNum(r.avg || r.low) : `<span class="bad">${esc(t("tool.itemScore.no"))}</span>`;
        const trader = r.traderPrice
          ? `${esc(r.traderName)}${r.traderLL ? ' LL'+r.traderLL : ''}${r.quest ? ' · ' + esc(t("tool.itemScore.questLocked")) : ''}<br><strong>${formatNum(r.traderPrice)}</strong>`
          : '—';
        const quest = r.quest ? `<span class="bad">${esc(t("tool.itemScore.yes"))}</span>` : (r.traderPrice ? `<span class="ok">${esc(t("tool.itemScore.no"))}</span>` : '—');
        const plates = r.plateIds.length
          ? `<button type="button" class="btn-sm plate-show" data-id="${esc(r.id)}">${esc(t("tool.armor.ui.show"))} (${r.plateIds.length})</button>`
          : (r.plateSlots ? `${r.plateSlots} ${esc(t("tool.armor.ui.slots"))}` : (r.kind === 'plate' ? '—' : '0'));
        tr.innerHTML = `
          <td>
            <div class="name-cell">${r.icon?`<img class="ico" src="${esc(r.icon)}" loading="lazy" alt="">`:''}<div class="txt">
            <div class="name">${esc(r.name)}</div>
            <div class="meta">${esc(r.slug)}${r.armorType ? ' · ' + esc(r.armorType) : ''}${r.material ? ' · ' + esc(r.material) : ''}</div>
            </div></div>
          </td>
          <td><strong>${r.class || '—'}</strong></td>
          <td>${r.dur || '—'}</td>
          <td>${esc(kindLabel(r.kind))}</td>
          <td style="max-width:160px;">${zones}</td>
          <td>${flea}</td>
          <td>${trader}</td>
          <td>${quest}</td>
          <td>${plates}</td>
          <td title="${esc(scoreTitle(r.scoreComponents, r.scoreDetails))}">${r.score.toFixed(1)}</td>
          <td>
            <button type="button" class="copy-btn" data-name="${esc(r.slug)}">${esc(t("tool.itemScore.copy"))}</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.plate-show').forEach(btn => {
        btn.addEventListener('click', () => {
          const row = rows.find(item => item.id === btn.dataset.id);
          if (row) showPlates(row);
        });
      });
      tbody.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.name || '').then(() => {
            const old = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = old; }, 700);
          }).catch(e => console.error(e));
        });
      });
    }

    function persist() {
      saveSettings('tarkovArmorSettings', {
        gameMode: document.getElementById('gameMode').value,
        hideQuest: document.getElementById('hideQuest').checked,
        onlyFlea: document.getElementById('onlyFlea').checked,
        types: [...activeTypes],
        classes: [...activeClasses]
      });
    }

    document.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = k === 'name' || k === 'kind' ? 1 : -1; }
        renderTable();
      });
      document.getElementById("plateDialogClose").addEventListener("click", () => {
        document.getElementById("plateDialog").close();
      });
    });
    ['search', 'hideQuest', 'onlyFlea'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderTable);
      document.getElementById(id).addEventListener('change', () => { renderTable(); persist(); });
    });
    window.addEventListener("tt-lang-changed", () => {
      renderTypeChips();
      renderClassChips();
      renderTable();
      renderStatus();
    });

    (function() {
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(window.itemName&&window.itemName!==itemName)return window.itemName(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s))s=(it.name&&!/^[a-f0-9]{20,}$/i.test(it.name)?it.name:it.normalizedName)||s;
    return s||it.id||'';
  }

      const s = loadSettings('tarkovArmorSettings', {});
      if (s.gameMode) document.getElementById('gameMode').value = s.gameMode;
      if (s.hideQuest) document.getElementById('hideQuest').checked = true;
      if (s.onlyFlea) document.getElementById('onlyFlea').checked = true;
      if (s.types) activeTypes = new Set(s.types);
      if (s.classes) activeClasses = new Set(s.classes);
    })();
  
