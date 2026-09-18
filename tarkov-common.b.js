  function enhanceTable(table, filterInput) {
    if (!table || table.dataset.ttEnhanced === "1") return;
    const tbody = table.tBodies[0]; if (!tbody) return;
    table.dataset.ttEnhanced = "1";
    let sortCol = -1, sortDir = 0;
    let originalOrder = [].slice.call(tbody.rows);
    try {
      new MutationObserver(function () {
        if (sortDir === 0) originalOrder = [].slice.call(tbody.rows);
      }).observe(tbody, { childList: true });
    } catch (e) {}
    [].forEach.call(table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells : [], function (th, idx) {
      th.style.cursor = "pointer";
      th.addEventListener("click", function () {
        if (sortCol !== idx) { sortCol = idx; sortDir = -1; }
        else if (sortDir === -1) sortDir = 1;
        else if (sortDir === 1) { sortDir = 0; sortCol = -1; }
        else sortDir = -1;
        [].forEach.call(table.tHead.rows[0].cells, function (h) { h.classList.remove("sorted-asc", "sorted-desc"); });
        if (sortDir !== 0 && sortCol >= 0) {
          var thEl = table.tHead.rows[0].cells[sortCol];
          if (thEl) thEl.classList.add(sortDir > 0 ? "sorted-asc" : "sorted-desc");
        }
        var rows;
        if (sortDir === 0) {
          rows = originalOrder.slice();
          [].forEach.call(tbody.rows, function (r) { if (rows.indexOf(r) < 0) rows.push(r); });
        } else {
          rows = [].slice.call(tbody.rows);
          rows.sort(function (a, b) {
            const ta = (a.cells[idx] && a.cells[idx].textContent || "").trim();
            const tb = (b.cells[idx] && b.cells[idx].textContent || "").trim();
            const na = parseFloat(ta.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
            const nb = parseFloat(tb.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(na) && !Number.isNaN(nb) && /\d/.test(ta) && /\d/.test(tb)) return (na - nb) * sortDir;
            return ta.localeCompare(tb, undefined, { sensitivity: "base", numeric: true }) * sortDir;
          });
        }
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
    if (filterInput) {
      filterInput.addEventListener("input", function () {
        const q = filterInput.value.toLowerCase().trim();
        [].forEach.call(tbody.rows, function (r) { r.style.display = !q || r.textContent.toLowerCase().includes(q) ? "" : "none"; });
      });
    }
  }

  function enhanceAllTables() {
    document.querySelectorAll("table").forEach(function (table) {
      let tools = table.previousElementSibling;
      if (!tools || !tools.classList || !tools.classList.contains("tt-table-tools")) {
        tools = document.createElement("div"); tools.className = "tt-table-tools";
        const inp = document.createElement("input"); inp.type = "search"; inp.placeholder = t("search");
        tools.appendChild(inp);
        table.parentNode.insertBefore(tools, table);
        enhanceTable(table, inp);
      } else {
        enhanceTable(table, tools.querySelector("input"));
      }
    });
  }
  function observeTables() {
    const mo = new MutationObserver(function () { enhanceAllTables(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  function init() {
    try { if (!document.querySelector("link[data-tt-sort]")) { var l=document.createElement("link"); l.rel="stylesheet"; l.href="tarkov-sort.css"; l.dataset.ttSort="1"; document.head.appendChild(l); } } catch(e) {}
    applyTheme(); injectBar(); wireGameModeSelects(); enhanceAllTables(); observeTables();
    if (!isMiniFrame() && get(KEYS.seen, "") !== "1") setTimeout(openSettings, 250);
  }
  global.TarkovTools = { t: t, lang: lang, beep: beep, exportAll: exportAll, importAll: importAll, openSettings: openSettings, preferredMode: preferredMode, soundEnabled: soundEnabled, soundVolume: soundVolume, tipsEnabled: tipsEnabled, enhanceTable: enhanceTable, applyTheme: applyTheme, KEYS: KEYS, _paintBar: null };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  (function loadShared() {
    if (!document.querySelector("script[data-tt-names]")) {
      var n = document.createElement("script"); n.src = "tarkov-names.js"; n.dataset.ttNames = "1"; n.async = false; document.head.appendChild(n);
    }
    if (!document.querySelector("script[data-tt-mini]")) {
      var s = document.createElement("script"); s.src = "tarkov-mini.js"; s.dataset.ttMini = "1"; s.async = false; document.head.appendChild(s);
    }
  })();
})(window);
