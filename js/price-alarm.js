(function () {
  'use strict';
  var POLL_ID = 'price-alarm';
  var RULES_KEY = 'tarkovPriceAlarmRules';
  var TOOL = 'tarkovtool-price-alarm.html';
  var catalog = [];
  var catalogReady = false;
  var catalogLoading = null;
  var fired = {};
  var openSuggestIdx = -1;

  function esc(s) { return TarkovDicts.esc(s); }

  function itemName(it) {
    try {
      if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    } catch (e) {}
    if (!it) return '';
    if (typeof it === 'string') return it;
    return it.shortName || it.name || it.normalizedName || it.id || '';
  }

  function status(msg, ok) {
    var el = document.getElementById('status');
    if (!el) return;
    el.className = 'status ' + (ok === false ? 'err' : ok ? 'ok' : '');
    el.textContent = msg || '';
  }

  /** Rules schema v1: { _v: 1, rules: [...] } â€” bare array migrated once */
  function loadRules() {
    var doc = TarkovSchema.readJson(RULES_KEY, 1, { listKey: "rules" });
    return TarkovSchema.listOf(doc, "rules");
  }

  function saveRules(rules) {
    var doc = { _v: 1, rules: Array.isArray(rules) ? rules : [] };
    TarkovSchema.writeJson(RULES_KEY, doc);
  }

  function progress() {
    return (window.TarkovUI && TarkovUI.progress) || null;
  }

  function reportMini(running, label) {
    if (window.TarkovPoll && TarkovPoll.reportMini) {
      TarkovPoll.reportMini(TOOL, running, label);
      return;
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: 'tt-status', tool: TOOL, running: !!running, ready: true, label: label || '' },
          location.origin
        );
      }
    } catch (e) {}
  }

  function ensureCatalog() {
    if (catalogReady && catalog.length) return Promise.resolve(catalog);
    if (catalogLoading) return catalogLoading;
    catalogLoading = loadCatalog()
      .then(function () {
        catalogReady = true;
        catalogLoading = null;
        return catalog;
      })
      .catch(function (e) {
        catalogLoading = null;
        throw e;
      });
    return catalogLoading;
  }

  async function loadCatalog() {
    var mode = (document.getElementById('gameMode') || {}).value || 'pve';
    if (!window.TarkovAPI || !TarkovAPI.items) throw new Error('TarkovAPI missing');
    catalog = await TarkovAPI.items(mode);
    if (!Array.isArray(catalog)) catalog = [];
  }

  function priceOf(it) {
    return {
      avg: Number(it.avg24hPrice) || 0,
      low: Number(it.lastLowPrice) || Number(it.low24hPrice) || 0,
      offers: Number(it.offerCount) || Number(it.offers) || 0
    };
  }

  function fmtRub(n) { return TarkovDicts.fmtRub(n); }

  function findById(id) {
    if (!id) return null;
    id = String(id);
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i] && String(catalog[i].id) === id) return catalog[i];
    }
    return null;
  }

  function matchItem(rule) {
    if (rule && rule.id) {
      var byId = findById(rule.id);
      if (byId) return byId;
    }
    var q = (rule.q || '').toLowerCase().trim();
    if (!q) return null;
    var exact = null;
    var partial = null;
    for (var i = 0; i < catalog.length; i++) {
      var it = catalog[i];
      if (!it) continue;
      var id = String(it.id || '');
      var name = itemName(it).toLowerCase();
      var slug = String(it.normalizedName || '').toLowerCase();
      if (id === q) return it;
      if (name === q || slug === q) exact = exact || it;
      else if (!partial && (name.indexOf(q) >= 0 || slug.indexOf(q) >= 0)) partial = it;
    }
    return exact || partial;
  }

  function searchCatalog(query, limit) {
    limit = limit || 12;
    var q = String(query || '').toLowerCase().trim();
    if (!q || q.length < 1) return [];
    var scored = [];
    for (var i = 0; i < catalog.length; i++) {
      var it = catalog[i];
      if (!it) continue;
      var name = itemName(it);
      var low = name.toLowerCase();
      var slug = String(it.normalizedName || '').toLowerCase();
      var id = String(it.id || '');
      var score = 0;
      if (low === q || slug === q) score = 100;
      else if (low.indexOf(q) === 0 || slug.indexOf(q) === 0) score = 80;
      else if (low.indexOf(q) >= 0 || slug.indexOf(q) >= 0) score = 50;
      else if (id.indexOf(q) === 0) score = 40;
      else continue;
      scored.push({ it: it, score: score, name: name });
    }
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'ru');
    });
    return scored.slice(0, limit);
  }

  function evalRule(rule, it) {
    var p = priceOf(it);
    var val =
      rule.metric === 'low' ? p.low : rule.metric === 'offers' ? p.offers : p.avg;
    var thr = Number(rule.threshold) || 0;
    if (rule.op === '>=') return val >= thr;
    return val <= thr;
  }

  function notifyHit(h) {
    var title = 'Ð¡Ð¸Ñ€ÐµÐ½Ð° Ñ†ÐµÐ½';
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var t = TarkovI18n.t('priceAlarm.notifTitle');
        if (t && t !== 'priceAlarm.notifTitle') title = t;
      }
    } catch (e) {}
    var p = h.p || priceOf(h.it);
    var val =
      h.rule.metric === 'low'
        ? p.low
        : h.rule.metric === 'offers'
          ? p.offers
          : p.avg;
    var body =
      itemName(h.it) +
      ' ' +
      (h.rule.op || '<=') +
      ' ' +
      h.rule.threshold +
      ' (ÑÐµÐ¹Ñ‡Ð°Ñ ' +
      (h.rule.metric === 'offers' ? val : fmtRub(val)) +
      ')';
    try {
      if (typeof Notify === 'function') {
        Notify({ title: title, body: body, tool: TOOL, kind: 'alarm', i18nTitle: 'priceAlarm.notifTitle', i18nBody: 'priceAlarm.notifBody', i18nParams: i18nParams });
        return;
      }
      if (window.TarkovTools && TarkovTools.Notify) {
        TarkovTools.Notify({ title: title, body: body, tool: TOOL, kind: 'alarm', i18nTitle: 'priceAlarm.notifTitle', i18nBody: 'priceAlarm.notifBody', i18nParams: i18nParams });
      }
    } catch (e) {}
  }

  async function checkOnce() {
    var P = progress();
    try {
      if (P && P.start) P.start({ label: '...' });
      if (P && P.set) P.set(10, '...');
      await ensureCatalog();
      if (P && P.set) P.set(55, String(catalog.length));
      var rules = loadRules();
      var hits = [];
      var n = rules.length || 1;
      rules.forEach(function (rule, idx) {
        if (!rule || (!rule.q && !rule.id)) return;
        var it = matchItem(rule);
        if (!it) return;
        if (evalRule(rule, it)) {
          var key = idx + ':' + (it.id || rule.q);
          if (!fired[key]) {
            fired[key] = true;
            hits.push({ rule: rule, it: it, p: priceOf(it) });
          }
        } else {
          delete fired[idx + ':' + (it.id || rule.q)];
        }
        if (P && P.set) {
          var pct = 55 + Math.floor(((idx + 1) / n) * 40);
          pct = Math.min(95, Math.round(pct / 5) * 5);
          P.set(pct);
        }
      });
      hits.forEach(notifyHit);
      if (P && P.done) P.done();
      status('ÐŸÑ€Ð¾Ð²ÐµÑ€ÐºÐ°: ' + catalog.length + ' Ð¿Ñ€ÐµÐ´Ð¼ÐµÑ‚Ð¾Ð², ÑÑ€Ð°Ð±Ð°Ñ‚Ñ‹Ð²Ð°Ð½Ð¸Ð¹ ' + hits.length, true);
      var st = window.TarkovPoll ? TarkovPoll.status(POLL_ID) : { on: false };
      if (st.on) reportMini(true, hits.length ? 'hits ' + hits.length : 'ok');
      else reportMini(false, 'idle');
      try {
        renderRules();
      } catch (eR) {}
      return hits;
    } catch (e) {
      if (P && P.fail) P.fail(String(e.message || e));
      throw e;
    }
  }
  window.__ttAlarmCheck = checkOnce;

  function closeAllSuggest() {
    openSuggestIdx = -1;
    document.querySelectorAll('.suggest').forEach(function (el) {
      el.hidden = true;
      el.innerHTML = '';
    });
  }

  function showSuggest(idx, input, box) {
    if (!box || !input) return;
    var q = input.value || '';
    if (!catalogReady) {
      box.hidden = false;
      box.innerHTML = '<div class="suggest-item" style="cursor:default;color:var(--muted)">Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ° ÐºÐ°Ñ‚Ð°Ð»Ð¾Ð³Ð°â€¦</div>';
      ensureCatalog()
        .then(function () {
          if (openSuggestIdx === idx) showSuggest(idx, input, box);
        })
        .catch(function () {
          box.innerHTML = '<div class="suggest-item" style="cursor:default;color:var(--muted)">ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ</div>';
        });
      return;
    }
    var hits = searchCatalog(q, 12);
    if (!hits.length) {
      if (!String(q).trim()) {
        box.hidden = true;
        box.innerHTML = '';
        return;
      }
      box.hidden = false;
      box.innerHTML =
        '<div class="suggest-item" style="cursor:default;color:var(--muted)">ÐÐ¸Ñ‡ÐµÐ³Ð¾ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾</div>';
      return;
    }
    openSuggestIdx = idx;
    box.hidden = false;
    box.innerHTML = hits
      .map(function (h, j) {
        var it = h.it;
        var p = priceOf(it);
        var icon = it.iconLink || it.icon || '';
        return (
          '<button type="button" class="suggest-item" data-pick="' +
          j +
          '" data-id="' +
          esc(it.id || '') +
          '">' +
          (icon
            ? '<img loading="lazy" src="' + esc(icon) + '" alt="">'
            : '<span style="width:28px;height:28px;flex-shrink:0"></span>') +
          '<span class="nm"><strong>' +
          esc(h.name) +
          '</strong><span>' +
          esc(it.normalizedName || it.id || '') +
          '</span></span>' +
          '<span class="pr">' +
          esc(fmtRub(p.avg || p.low)) +
          '</span></button>'
        );
      })
      .join('');
    box.querySelectorAll('[data-pick]').forEach(function (btn) {
      btn.onmousedown = function (e) {
        e.preventDefault();
        var id = btn.getAttribute('data-id');
        var it = findById(id);
        if (!it) return;
        var rules = loadRules();
        if (!rules[idx]) return;
        rules[idx].id = String(it.id || '');
        rules[idx].q = itemName(it);
        saveRules(rules);
        closeAllSuggest();
        renderRules();
      };
    });
  }

  function renderRules() {
    var box = document.getElementById('rules');
    if (!box) return;
    var rules = loadRules();
    if (!rules.length) {
      box.innerHTML = '<p class="meta">ÐŸÐ¾ÐºÐ° Ð½ÐµÑ‚ Ð¿Ñ€Ð°Ð²Ð¸Ð». ÐÐ°Ð¶Ð¼Ð¸Ñ‚Ðµ Â«+ ÐŸÑ€Ð°Ð²Ð¸Ð»Ð¾Â».</p>';
      return;
    }
    box.innerHTML = rules
      .map(function (r, i) {
        var it = catalogReady ? matchItem(r) : null;
        var p = it ? priceOf(it) : null;
        var meta = '';
        if (!catalogReady) {
          meta = '<span class="meta">ÐšÐ°Ñ‚Ð°Ð»Ð¾Ð³â€¦</span>';
        } else if (it && p) {
          var cur =
            r.metric === 'low'
              ? p.low
              : r.metric === 'offers'
                ? p.offers
                : p.avg;
          var hit = evalRule(r, it);
          meta =
            '<span class="' +
            (hit ? 'ok' : '') +
            '">' +
            esc(itemName(it)) +
            '</span>' +
            '<span>avg ' +
            esc(fmtRub(p.avg)) +
            '</span>' +
            '<span>low ' +
            esc(fmtRub(p.low)) +
            '</span>' +
            '<span>Ð¾Ñ„Ñ„ÐµÑ€Ñ‹ ' +
            esc(String(p.offers)) +
            '</span>' +
            (hit ? '<span class="ok">ÑÑ€Ð°Ð±Ð¾Ñ‚Ð°ÐµÑ‚</span>' : '');
        } else if (r.q || r.id) {
          meta = '<span class="miss">Ð¿Ñ€ÐµÐ´Ð¼ÐµÑ‚ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½</span>';
        }
        var mAvg = r.metric !== 'low' && r.metric !== 'offers' ? ' selected' : '';
        var mLow = r.metric === 'low' ? ' selected' : '';
        var mOff = r.metric === 'offers' ? ' selected' : '';
        var opLe = r.op !== '>=' ? ' selected' : '';
        var opGe = r.op === '>=' ? ' selected' : '';
        return (
          '<div class="rule-card" data-rule="' +
          i +
          '">' +
          '<div class="rule-top">' +
          '<div class="field" style="flex:2;min-width:180px">' +
          '<label>ÐŸÑ€ÐµÐ´Ð¼ÐµÑ‚</label>' +
          '<div class="rule-search-wrap">' +
          '<input type="search" autocomplete="off" data-i="' +
          i +
          '" data-k="q" value="' +
          esc(r.q || '') +
          '" placeholder="ÐÐ°Ñ‡Ð½Ð¸Ñ‚Ðµ Ð²Ð²Ð¾Ð´Ð¸Ñ‚ÑŒ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ðµâ€¦">' +
          '<div class="suggest" data-suggest="' +
          i +
          '" hidden></div>' +
          '</div></div>' +
          '<div class="field narrow">' +
          '<label>ÐœÐµÑ‚Ñ€Ð¸ÐºÐ°</label>' +
          '<select data-i="' +
          i +
          '" data-k="metric">' +
          '<option value="avg"' +
          mAvg +
          '>avg 24h</option>' +
          '<option value="low"' +
          mLow +
          '>low</option>' +
          '<option value="offers"' +
          mOff +
          '>Ð¾Ñ„Ñ„ÐµÑ€Ñ‹</option>' +
          '</select></div>' +
          '<div class="field narrow">' +
          '<label>Ð£ÑÐ»Ð¾Ð²Ð¸Ðµ</label>' +
          '<select data-i="' +
          i +
          '" data-k="op">' +
          '<option value="<="' +
          opLe +
          '>' + String.fromCharCode(60) + '=</option>' +
          '<option value=">="' +
          opGe +
          '>' + String.fromCharCode(62) + '=</option>' +
          '</select></div>' +
          '<div class="field narrow">' +
          '<label>ÐŸÐ¾Ñ€Ð¾Ð³</label>' +
          '<input type="number" data-i="' +
          i +
          '" data-k="threshold" value="' +
          esc(String(r.threshold != null ? r.threshold : 0)) +
          '" min="0" step="1" style="width:110px">' +
          '</div>' +
          '<div class="rule-actions">' +
          '<button type="button" class="btn-ghost" data-del="' +
          i +
          '" title="Ð£Ð´Ð°Ð»Ð¸Ñ‚ÑŒ">' +
          String.fromCharCode(0xd7) +
          '</button>' +
          '</div></div>' +
          '<div class="rule-meta">' +
          meta +
          '</div></div>'
        );
      })
      .join('');

    box.querySelectorAll('input[data-k],select[data-k]').forEach(function (el) {
      var k = el.getAttribute('data-k');
      if (k === 'q') {
        el.oninput = function () {
          var i = Number(el.getAttribute('data-i'));
          var rules = loadRules();
          if (!rules[i]) return;
          rules[i].q = el.value;
          rules[i].id = '';
          saveRules(rules);
          var sug = box.querySelector('[data-suggest="' + i + '"]');
          showSuggest(i, el, sug);
        };
        el.onfocus = function () {
          var i = Number(el.getAttribute('data-i'));
          var sug = box.querySelector('[data-suggest="' + i + '"]');
          showSuggest(i, el, sug);
        };
        el.onblur = function () {
          setTimeout(closeAllSuggest, 180);
        };
        el.onkeydown = function (ev) {
          if (ev.key === 'Escape') {
            closeAllSuggest();
            el.blur();
          }
        };
      } else {
        el.onchange = el.oninput = function () {
          var rules = loadRules();
          var i = Number(el.getAttribute('data-i'));
          if (!rules[i] || !k) return;
          rules[i][k] = el.type === 'number' ? Number(el.value) : el.value;
          saveRules(rules);
          if (k === 'metric' || k === 'op' || k === 'threshold') {
            try {
              renderRules();
            } catch (e) {}
          }
        };
      }
    });
    box.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.onclick = function () {
        var rules = loadRules();
        rules.splice(Number(btn.getAttribute('data-del')), 1);
        saveRules(rules);
        closeAllSuggest();
        renderRules();
      };
    });
  }

  function startBg() {
    var mins = Math.max(1, Number((document.getElementById('interval') || {}).value) || 5);
    if (document.getElementById('interval')) document.getElementById('interval').value = mins;
    var mode = (document.getElementById('gameMode') || {}).value || 'pve';
    if (!window.TarkovPoll) {
      status('TarkovPoll missing', false);
      return;
    }
    TarkovPoll.start(
      POLL_ID,
      mins,
      function () {
        return checkOnce();
      },
      { fireNow: true, label: 'price-alarm', mode: mode, tool: TOOL }
    );
    var cd = document.getElementById('countdown');
    if (cd) TarkovPoll.bindCountdown(cd, POLL_ID);
    status('Ð¤Ð¾Ð½ ÐºÐ°Ð¶Ð´Ñ‹Ðµ ' + mins + ' Ð¼Ð¸Ð½', true);
    reportMini(true, 'every ' + mins + 'm');
  }

  function stopBg() {
    if (window.TarkovPoll) TarkovPoll.stop(POLL_ID);
    status('ÐžÑÑ‚Ð°Ð½Ð¾Ð²Ð»ÐµÐ½Ð¾', true);
    reportMini(false, 'idle');
  }

  function boot() {
    renderRules();
    ensureCatalog()
      .then(function () {
        renderRules();
      })
      .catch(function (e) {
        status(String(e.message || e), false);
      });

    var add = document.getElementById('addRule');
    if (add) {
      add.onclick = function () {
        var rules = loadRules();
        rules.push({ q: '', id: '', metric: 'avg', op: '<=', threshold: 0 });
        saveRules(rules);
        renderRules();
        var inputs = document.querySelectorAll('#rules input[data-k="q"]');
        if (inputs.length) {
          var last = inputs[inputs.length - 1];
          last.focus();
        }
      };
    }
    var startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.onclick = startBg;
    var stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.onclick = stopBg;
    var checkBtn = document.getElementById('checkBtn');
    if (checkBtn) {
      checkBtn.onclick = function () {
        checkOnce().catch(function (e) {
          status(String(e.message || e), false);
        });
      };
    }
    var modeEl = document.getElementById('gameMode');
    if (modeEl) {
      modeEl.onchange = function () {
        catalogReady = false;
        catalog = [];
        ensureCatalog()
          .then(function () {
            renderRules();
          })
          .catch(function () {});
      };
    }
    window.addEventListener('message', function (ev) {
      if (ev.origin !== location.origin) return;
      if (ev.data && ev.data.type === 'tt-ping-status') {
        var st = window.TarkovPoll ? TarkovPoll.status(POLL_ID) : { on: false };
        reportMini(!!st.on, st.on ? 'every ' + (st.mins || '?') + 'm' : 'idle');
      }
    });
    document.addEventListener('click', function (e) {
      if (e.target && (e.target.closest && e.target.closest('.rule-search-wrap'))) return;
      closeAllSuggest();
    });
    try {
      var st = window.TarkovPoll ? TarkovPoll.status(POLL_ID) : null;
      if (st && st.mins && document.getElementById('interval'))
        document.getElementById('interval').value = st.mins;
      if (st && st.mode && document.getElementById('gameMode'))
        document.getElementById('gameMode').value = st.mode;
      if (st && st.on) startBg();
      else reportMini(false, 'idle');
    } catch (e) {
      reportMini(false, 'idle');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
