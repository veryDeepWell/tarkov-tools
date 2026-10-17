/*! effects catalog — R3.5 */
(function () {
  "use strict";
  var rows = [];
  function esc(s) {
    return window.TarkovDicts && TarkovDicts.esc ? TarkovDicts.esc(s) :
      String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
  function setStatus(m, t) {
    var el = document.getElementById("status");
    el.textContent = m;
    el.className = "status" + (t ? " " + t : "");
  }
  function mode() {
    return (document.getElementById("gameMode") || {}).value || "pve";
  }
  function extractBuffs(item) {
    var p = item.properties || {};
    var list = p.stimulatorBuffs || p.buffs || [];
    if (!Array.isArray(list)) list = [];
    var out = [];
    list.forEach(function (b) {
      if (!b) return;
      out.push({
        effect: b.buffType || b.type || b.name || "buff",
        value: b.value != null ? b.value : b.absolute != null ? b.absolute : "",
        duration: b.duration != null ? b.duration : b.delay != null ? b.delay : "",
        chance: b.chance,
        skill: b.skillName || b.skill || ""
      });
    });
    // generic food/med effects
    if (p.energy) out.push({ effect: "Energy", value: p.energy, duration: p.useTime || "", skill: "" });
    if (p.hydration) out.push({ effect: "Hydration", value: p.hydration, duration: p.useTime || "", skill: "" });
    return out;
  }
  function paint() {
    var q = (document.getElementById("q").value || "").toLowerCase();
    var tbody = document.getElementById("tbody");
    tbody.innerHTML = "";
    var n = 0;
    rows.forEach(function (r) {
      var hay = (r.itemName + " " + r.effect + " " + r.skill).toLowerCase();
      if (q && hay.indexOf(q) < 0) return;
      n++;
      var tr = document.createElement("tr");
      var href = window.TarkovItemGraph ? TarkovItemGraph.href(r.itemId) : ("tarkovtool-item-card.html?item=" + encodeURIComponent(r.itemId));
      tr.innerHTML =
        "<td><a class=\"item-link\" href=\"" + href + "\">" + esc(r.itemName) + "</a></td>" +
        "<td>" + esc(r.effect) + (r.skill ? " <span class=\"tag\">" + esc(r.skill) + "</span>" : "") + "</td>" +
        "<td>" + esc(String(r.value)) + "</td>" +
        "<td>" + esc(String(r.duration)) + "</td>";
      tbody.appendChild(tr);
    });
    setStatus("Показано " + n + " / " + rows.length, "ok");
  }
  document.getElementById("loadBtn").onclick = async function () {
    var btn = this;
    btn.disabled = true;
    setStatus("Загрузка items…");
    try {
      var items = await TarkovAPI.items(mode());
      rows = [];
      (items || []).forEach(function (it) {
        var buffs = extractBuffs(it);
        if (!buffs.length) return;
        var name = it.shortName || it.name || it.normalizedName || it.id;
        buffs.forEach(function (b) {
          rows.push({
            itemId: it.id,
            itemName: name,
            effect: b.effect,
            value: b.value,
            duration: b.duration,
            skill: b.skill
          });
        });
      });
      if (window.TarkovItemGraph) TarkovItemGraph.build({ items: items, tasks: [], crafts: [] });
      setStatus("Эффектов: " + rows.length, "ok");
      paint();
    } catch (e) {
      setStatus("Ошибка: " + (e.message || e), "err");
    } finally {
      btn.disabled = false;
    }
  };
  document.getElementById("q").addEventListener("input", paint);
  try {
    if (window.TarkovProfile && TarkovProfile.bindGameMode)
      TarkovProfile.bindGameMode("gameMode", { fallback: "pve" });
  } catch (e) {}
})();
