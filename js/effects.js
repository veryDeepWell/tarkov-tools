/*! effects catalog — R3.5 */
(function () {
  "use strict";
  var rows = [];
  var hasLoaded = false;
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
        duration: b.duration != null ? b.duration : "не указана",
        delay: b.delay != null ? b.delay : "не указана",
        description: b.description || (b.skillName || b.skill ? "Изменяет навык: " + (b.skillName || b.skill) : "Изменение параметра " + (b.buffType || b.type || b.name || "не указан") + "; знак значения указан отдельно"),
        chance: b.chance,
        skill: b.skillName || b.skill || ""
      });
    });
    // generic food/med effects
    if (p.energy) out.push({ effect: "Energy", value: p.energy, duration: "разово", description: "Изменение энергии после употребления", skill: "" });
    if (p.hydration) out.push({ effect: "Hydration", value: p.hydration, duration: "разово", description: "Изменение гидратации после употребления", skill: "" });
    (Array.isArray(p.cures) ? p.cures : []).forEach(function (effect) {
      out.push({ effect: "Снимает: " + (typeof effect === "string" ? effect : effect.name || effect.type), value: "", duration: "разово", description: "Лечебный эффект предмета по данным API", skill: "" });
    });
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
        "<td>" + esc(String(r.duration)) + "</td>" +
        "<td>" + esc(r.delay == null ? "—" : String(r.delay)) + "</td>" +
        "<td>" + esc(r.chance == null ? "—" : String(r.chance)) + "</td>" +
        "<td>" + esc(r.description || "Описание не предоставлено API") + "</td>";
      tbody.appendChild(tr);
    });
    setStatus("Показано " + n + " / " + rows.length, "ok");
  }
  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Загрузка items…");
    try {
      var items = await TarkovAPI.items(mode());
      hasLoaded = true;
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
            delay: b.delay,
            chance: b.chance,
            description: b.description,
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
  }
  document.getElementById("loadBtn").onclick = load;
  document.getElementById("q").addEventListener("input", paint);
  window.render = function () { if (hasLoaded) load(); };
  try {
    if (window.TarkovProfile && TarkovProfile.bindGameMode)
      TarkovProfile.bindGameMode("gameMode", { fallback: "pve" });
    if (window.TarkovProfile && TarkovProfile.bindRefresh)
      TarkovProfile.bindRefresh(function () { window.render(); });
  } catch (e) {}
})();
