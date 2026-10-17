/*! sources page — R3.7 */
(function () {
  "use strict";
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
  async function load() {
    var host = document.getElementById("groups");
    var status = document.getElementById("status");
    try {
      var url = "../data/sources.json";
      var res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      host.innerHTML = (data.groups || []).map(function (g) {
        return '<div class="card"><div class="card-title">' + esc(g.title) + "</div><ul class=\"link-list\">" +
          (g.items || []).map(function (it) {
            return "<li><a class=\"item-link\" href=\"" + esc(it.url) + "\" target=\"_blank\" rel=\"noopener\">" +
              esc(it.name) + "</a> <span class=\"meta\">" + esc(it.note || "") + "</span></li>";
          }).join("") + "</ul></div>";
      }).join("");
      status.textContent = "Источники загружены";
      status.className = "status ok";
    } catch (e) {
      status.textContent = "Не удалось загрузить data/sources.json: " + (e.message || e);
      status.className = "status err";
      host.innerHTML = '<div class="card meta">Положи data/sources.json рядом с деплоем Pages.</div>';
    }
  }
  load();
})();
