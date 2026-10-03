/*! Tarkov — Battle Pass tracker (Kord Breach, static) */
(function () {
  "use strict";

  var STORAGE_KEY = "tarkov_battle_pass_s1";
  var TOTAL_DOCS = 501;
  var TOTAL_REWARDS = 53;

  var DOC_TYPES = [
    { id: "financial", label: "Financial" },
    { id: "pmc", label: "PMC files" },
    { id: "project", label: "Project" },
    { id: "blueprints", label: "Blueprints" },
    { id: "test", label: "Test" },
    { id: "user", label: "User" },
    { id: "medical", label: "Medical" },
    { id: "technical", label: "Technical" },
    { id: "classified", label: "Classified ★" }
  ];

  var PAGES = [{"n": 1, "needPrev": 0, "rewards": [{"id": "p1_dogtag", "name": "Marked Dogtag", "kind": "cosmetic"}, {"id": "p1_tar50", "name": "TarCoin ×50", "kind": "currency"}, {"id": "p1_burn", "name": "BURN poster", "kind": "mail"}, {"id": "p1_crate", "name": "Black Division gear crate", "kind": "crate"}, {"id": "p1_ceil", "name": "Black wood ceiling", "kind": "hideout"}]}, {"n": 2, "needPrev": 4, "rewards": [{"id": "p2_sotr", "name": "Gentex Ops-Core SOTR respirator", "kind": "barter"}, {"id": "p2_hawaii", "name": "Red Hawaii tactical clothing", "kind": "clothing"}, {"id": "p2_crate", "name": "Black Division gear crate", "kind": "crate"}, {"id": "p2_scorp", "name": "Scorpion target", "kind": "hideout"}, {"id": "p2_tar50", "name": "TarCoin ×50", "kind": "currency"}]}, {"n": 3, "needPrev": 4, "rewards": [{"id": "p3_nice", "name": "Mystery Ranch NICE Frame Load Sling", "kind": "barter"}, {"id": "p3_crate", "name": "Black Division gear crate", "kind": "crate"}, {"id": "p3_herr", "name": "Black Herringbone", "kind": "hideout"}, {"id": "p3_tar50", "name": "TarCoin ×50", "kind": "currency"}, {"id": "p3_heart", "name": "Heart (mannequin pose)", "kind": "hideout"}]}, {"n": 4, "needPrev": 4, "rewards": [{"id": "p4_dogtag", "name": "Marked Dogtag", "kind": "cosmetic"}, {"id": "p4_knife", "name": "Microtech Jagdkommando knife", "kind": "melee"}, {"id": "p4_tar50", "name": "TarCoin ×50", "kind": "currency"}, {"id": "p4_bear", "name": "Beware the Bear poster", "kind": "mail"}, {"id": "p4_crate", "name": "Black Division gear crate", "kind": "crate"}]}, {"n": 5, "needPrev": 4, "rewards": [{"id": "p5_orange", "name": "Orange Hawaii tactical clothing", "kind": "clothing"}, {"id": "p5_tar50", "name": "TarCoin ×50", "kind": "currency"}, {"id": "p5_target", "name": "Black Division target", "kind": "hideout"}, {"id": "p5_crate", "name": "Black Division gear crate", "kind": "crate"}, {"id": "p5_fcpc", "name": "Ferro Concepts FCPC V5 (Black Division)", "kind": "barter"}]}, {"n": 6, "needPrev": 4, "rewards": [{"id": "p6_knyaz", "name": "Knyazev (PMC face)", "kind": "cosmetic"}, {"id": "p6_ocon", "name": "O'Connor (PMC face)", "kind": "cosmetic"}, {"id": "p6_howa", "name": "Howa Type 20 5.56x45", "kind": "barter"}]}, {"n": 7, "needPrev": 2, "rewards": [{"id": "p7_dogtag", "name": "Marked Dogtag", "kind": "cosmetic"}, {"id": "p7_tar50", "name": "TarCoin ×50", "kind": "currency"}, {"id": "p7_scorp_u", "name": "Scorpion upper", "kind": "clothing"}, {"id": "p7_scorp_l", "name": "Scorpion lower", "kind": "clothing"}]}, {"n": 8, "needPrev": 3, "rewards": [{"id": "p8_crate", "name": "Black Division gear crate", "kind": "crate"}, {"id": "p8_tar50", "name": "TarCoin ×50", "kind": "currency"}, {"id": "p8_walls", "name": "White accent walls", "kind": "hideout"}, {"id": "p8_arch", "name": "Arch (mannequin pose)", "kind": "hideout"}, {"id": "p8_dome", "name": "Dome (mannequin pose)", "kind": "hideout"}]}, {"n": 9, "needPrev": 4, "rewards": [{"id": "p9_lv119", "name": "Spiritus Systems LV-119 (Black Division V2)", "kind": "barter"}, {"id": "p9_tar50", "name": "TarCoin ×50", "kind": "currency"}, {"id": "p9_tt", "name": "Tasmanian Tiger Modular Pack 45+ (MC Black)", "kind": "barter"}, {"id": "p9_crate", "name": "Black Division gear crate", "kind": "crate"}, {"id": "p9_server", "name": "Server Room (main menu bg)", "kind": "cosmetic"}]}, {"n": 10, "needPrev": 4, "rewards": [{"id": "p10_anton", "name": "Anton (PMC voice)", "kind": "cosmetic"}, {"id": "p10_garrett", "name": "Garrett (PMC voice)", "kind": "cosmetic"}, {"id": "p10_crate", "name": "Black Division gear crate", "kind": "crate"}, {"id": "p10_tar100", "name": "TarCoin ×100", "kind": "currency"}]}, {"n": 11, "needPrev": 3, "rewards": [{"id": "p11_dogtag", "name": "Marked Dogtag", "kind": "cosmetic"}, {"id": "p11_tar150", "name": "TarCoin ×150", "kind": "currency"}, {"id": "p11_knyaz_ab", "name": "Knyazev After Battle (face)", "kind": "cosmetic"}, {"id": "p11_ocon_ab", "name": "O'Connor After Battle (face)", "kind": "cosmetic"}]}, {"n": 12, "needPrev": 3, "rewards": [{"id": "p12_qbz", "name": "Norinco QBZ-191 5.8x42", "kind": "barter"}, {"id": "p12_noct_u", "name": "Nocturnal upper", "kind": "clothing"}, {"id": "p12_noct_l", "name": "Nocturnal lower", "kind": "clothing"}]}];

  function loadState() {
    var def = { claimed: {}, docs: {}, openPages: { 1: true }, _v: 1 };
    try {
      if (window.TarkovStorage && TarkovStorage.get) {
        var s = TarkovStorage.get(STORAGE_KEY);
        if (s && typeof s === "object") return Object.assign(def, s);
      }
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(def, JSON.parse(raw));
    } catch (e) {}
    return def;
  }

  function saveState(st) {
    st._v = 1;
    try {
      if (window.TarkovStorage && TarkovStorage.set) {
        TarkovStorage.set(STORAGE_KEY, st);
        return;
      }
    } catch (e) {}
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e2) {}
  }

  var state = loadState();

  function claimedCount() {
    var n = 0;
    Object.keys(state.claimed).forEach(function (k) {
      if (state.claimed[k]) n++;
    });
    return n;
  }

  function pageClaimed(p) {
    var n = 0;
    p.rewards.forEach(function (r) {
      if (state.claimed[r.id]) n++;
    });
    return n;
  }

  function isPageUnlocked(idx) {
    if (idx === 0) return true;
    var prev = PAGES[idx - 1];
    var need = PAGES[idx].needPrev || 0;
    return pageClaimed(prev) >= need;
  }

  function docsTotal() {
    var t = 0;
    DOC_TYPES.forEach(function (d) {
      t += Math.max(0, Number(state.docs[d.id]) || 0);
    });
    return t;
  }

  function renderStats() {
    var c = claimedCount();
    var docs = docsTotal();
    var open = 0;
    PAGES.forEach(function (p, i) {
      if (isPageUnlocked(i)) open++;
    });
    document.getElementById("stats").innerHTML =
      '<div class="stat"><div class="v">' +
      c +
      " / " +
      TOTAL_REWARDS +
      '</div><div class="l">Наград получено</div></div>' +
      '<div class="stat"><div class="v">' +
      open +
      " / " +
      PAGES.length +
      '</div><div class="l">Страниц открыто</div></div>' +
      '<div class="stat"><div class="v">' +
      docs +
      '</div><div class="l">Доков в инвентаре</div></div>' +
      '<div class="stat"><div class="v">~' +
      TOTAL_DOCS +
      '</div><div class="l">Доков на полный BP</div></div>';
    var pct = Math.min(100, Math.round((c / TOTAL_REWARDS) * 100));
    document.getElementById("progBar").style.width = pct + "%";
    document.getElementById("progNote").textContent =
      pct +
      "% наград. Дневной лимит: Seasonal 30 · PvP 20 · PvE 15 (общий счётчик на сутки).";
  }

  function renderDocInputs() {
    var box = document.getElementById("docInputs");
    box.innerHTML = DOC_TYPES.map(function (d) {
      var v = state.docs[d.id] != null ? state.docs[d.id] : 0;
      return (
        '<div class="field"><label>' +
        d.label +
        '</label><input type="number" min="0" step="1" data-doc="' +
        d.id +
        '" value="' +
        v +
        '"></div>'
      );
    }).join("");
  }

  function readDocsFromInputs() {
    document.querySelectorAll("#docInputs input").forEach(function (inp) {
      state.docs[inp.getAttribute("data-doc")] = Math.max(0, Number(inp.value) || 0);
    });
  }

  function renderPages() {
    var box = document.getElementById("pages");
    box.innerHTML = PAGES.map(function (p, idx) {
      var unlocked = isPageUnlocked(idx);
      var got = pageClaimed(p);
      var open = state.openPages[p.n] !== false && unlocked;
      return (
        '<div class="page' +
        (unlocked ? "" : " locked") +
        (open ? " open" : "") +
        '" data-n="' +
        p.n +
        '">' +
        '<div class="page-head"><div><strong>Страница ' +
        p.n +
        "</strong> · " +
        got +
        "/" +
        p.rewards.length +
        (unlocked
          ? ""
          : " · нужно " + p.needPrev + " с стр. " + (p.n - 1)) +
        '</div><span class="muted">' +
        (open ? "▾" : "▸") +
        "</span></div>" +
        '<div class="page-body">' +
        p.rewards
          .map(function (r) {
            var on = !!state.claimed[r.id];
            return (
              '<div class="reward' +
              (on ? " claimed" : "") +
              '"><input type="checkbox" data-id="' +
              r.id +
              '"' +
              (on ? " checked" : "") +
              (unlocked ? "" : " disabled") +
              '><div><div class="name">' +
              r.name +
              '</div><div class="meta">' +
              r.kind +
              "</div></div></div>"
            );
          })
          .join("") +
        "</div></div>"
      );
    }).join("");

    box.querySelectorAll(".page-head").forEach(function (h) {
      h.onclick = function () {
        var page = h.parentElement;
        var n = Number(page.getAttribute("data-n"));
        var idx = n - 1;
        if (!isPageUnlocked(idx)) return;
        var willOpen = !page.classList.contains("open");
        state.openPages[n] = willOpen;
        saveState(state);
        renderPages();
      };
    });
    box.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.onchange = function () {
        state.claimed[cb.getAttribute("data-id")] = cb.checked;
        saveState(state);
        renderStats();
        renderPages();
      };
    });
  }

  document.getElementById("saveDocs").onclick = function () {
    readDocsFromInputs();
    saveState(state);
    renderStats();
  };
  document.getElementById("resetClaimed").onclick = function () {
    if (!confirm("Сбросить все отмеченные награды?")) return;
    state.claimed = {};
    saveState(state);
    renderStats();
    renderPages();
  };

  renderDocInputs();
  renderStats();
  renderPages();
})();
