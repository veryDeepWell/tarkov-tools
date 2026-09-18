/*! common.js recovery + sort cycle + sort.css */
(function () {
  try {
    if (!document.querySelector('link[data-tt-sort]')) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'tarkov-sort.css';
      l.dataset.ttSort = '1';
      document.head.appendChild(l);
    }
  } catch (e) {}
  var urls = [
    "https://cdn.jsdelivr.net/gh/veryDeepWell/tarkov-tools@50aeed507de1d85d1b21053d9d01ce9f07dae93a/tarkov-common.js",
    "https://raw.githubusercontent.com/veryDeepWell/tarkov-tools/50aeed507de1d85d1b21053d9d01ce9f07dae93a/tarkov-common.js"
  ];
  var code = null;
  for (var i = 0; i < urls.length && !code; i++) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", urls[i], false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) code = xhr.responseText;
    } catch (e) {}
  }
  if (!code) { console.error("common.js recovery failed"); return; }
  var s0 = document.createElement("script");
  s0.textContent = code;
  document.head.appendChild(s0);

  function enhanceTableFixed(table, filterInput) {
    if (!table || table.dataset.ttEnhanced === "1") return;
    var tbody = table.tBodies[0]; if (!tbody) return;
    table.dataset.ttEnhanced = "1";
    var sortCol = -1, sortDir = 0;
    var originalOrder = [].slice.call(tbody.rows);
    try {
      new MutationObserver(function () {
        if (sortDir === 0) originalOrder = [].slice.call(tbody.rows);
      }).observe(tbody, { childList: true });
    } catch (e) {}
    var headRow = table.tHead && table.tHead.rows[0];
    var cells = headRow ? headRow.cells : [];
    [].forEach.call(cells, function (th, idx) {
      th.style.cursor = "pointer";
      th.addEventListener("click", function () {
        if (sortCol !== idx) { sortCol = idx; sortDir = -1; }
        else if (sortDir === -1) sortDir = 1;
        else if (sortDir === 1) { sortDir = 0; sortCol = -1; }
        else sortDir = -1;
        [].forEach.call(table.tHead.rows[0].cells, function (h) {
          h.classList.remove("sorted-asc", "sorted-desc");
        });
        if (sortDir !== 0 && sortCol >= 0) {
          var thEl = table.tHead.rows[0].cells[sortCol];
          if (thEl) thEl.classList.add(sortDir > 0 ? "sorted-asc" : "sorted-desc");
        }
        var rows;
        if (sortDir === 0) {
          rows = originalOrder.slice();
          [].forEach.call(tbody.rows, function (r) {
            if (rows.indexOf(r) < 0) rows.push(r);
          });
        } else {
          rows = [].slice.call(tbody.rows);
          rows.sort(function (a, b) {
            var ta = (a.cells[idx] && a.cells[idx].textContent || "").trim();
            var tb = (b.cells[idx] && b.cells[idx].textContent || "").trim();
            var na = parseFloat(ta.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
            var nb = parseFloat(tb.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(na) && !Number.isNaN(nb) && /\d/.test(ta) && /\d/.test(tb))
              return (na - nb) * sortDir;
            return ta.localeCompare(tb, undefined, { sensitivity: "base", numeric: true }) * sortDir;
          });
        }
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
    if (filterInput) {
      filterInput.addEventListener("input", function () {
        var q = filterInput.value.toLowerCase().trim();
        [].forEach.call(tbody.rows, function (r) {
          r.style.display = !q || r.textContent.toLowerCase().includes(q) ? "" : "none";
        });
      });
    }
  }

  function rebind() {
    if (window.TarkovTools) window.TarkovTools.enhanceTable = enhanceTableFixed;
    document.querySelectorAll("table").forEach(function (t) {
      delete t.dataset.ttEnhanced;
      var tools = t.previousElementSibling;
      var inp = tools && tools.classList && tools.classList.contains("tt-table-tools")
        ? tools.querySelector("input") : null;
      enhanceTableFixed(t, inp);
    });
  }
  rebind();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", rebind);
  }
})();
