/*! Editorial event catalogue; local data only. */
(function () {
  "use strict";
  var entries = [];
  function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function status(event) {
    var now = Date.now(), start = Date.parse(event.start), end = Date.parse(event.end);
    if (!Number.isFinite(start)) return "unknown";
    if (start > now) return "upcoming";
    if (!Number.isFinite(end)) return "unknown";
    return end < now ? "past" : "active";
  }
  function paint() {
    var query = document.getElementById("eventSearch").value.toLowerCase();
    var filter = document.getElementById("eventFilter").value;
    var labels = { active: "Текущий", past: "Завершён", upcoming: "Ожидается", unknown: "Статус не подтверждён" };
    var rows = entries.filter(function (e) { return (filter === "all" || status(e) === filter) && (e.title + " " + e.description).toLowerCase().includes(query); });
    document.getElementById("eventList").innerHTML = rows.map(function (e) {
      var source = "";
      try { var u = new URL(e.source); if (/^https?:$/.test(u.protocol)) source = '<a href="' + esc(u.href) + '" target="_blank" rel="noopener noreferrer">Источник</a>'; } catch (err) {}
      return '<article class="card"><h2>' + esc(e.title) + '</h2><p>' + esc(labels[status(e)]) + " · " + esc(e.start) + " — " + esc(e.end || "неизвестно") + '</p><p>' + esc(e.description) + '</p>' + source + '</article>';
    }).join("");
    document.getElementById("status").textContent = entries.length ? "Показано: " + rows.length + " / " + entries.length : "Редакционная база пока пуста. Наличие текущих ивентов не проверено.";
  }
  document.getElementById("eventSearch").addEventListener("input", paint);
  document.getElementById("eventFilter").addEventListener("change", paint);
  fetch("../data/events.json", { cache: "no-cache" }).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status); return r.json();
  }).then(function (data) { entries = Array.isArray(data.events) ? data.events.filter(function (e) { return e && e.title && e.description; }) : []; paint(); })
    .catch(function (e) { document.getElementById("status").textContent = "Не удалось загрузить описания: " + e.message; });
})();
