/*! random fact — R3.8 */
(function () {
  "use strict";
  var staticFacts = [];
  var dynamic = [];

  function setFact(text) {
    document.getElementById("fact").textContent = text || "—";
  }

  async function loadStatic() {
    try {
      var res = await fetch("../data/facts.json");
      if (res.ok) {
        var data = await res.json();
        staticFacts = data.static || [];
      }
    } catch (e) {
      staticFacts = ["Tarkov Tools: open source утилиты на GitHub Pages."];
    }
  }

  async function loadDynamic() {
    dynamic = [];
    try {
      if (!window.TarkovAPI) return;
      var mode = window.TarkovProfile ? TarkovProfile.preferredGameMode() : "pve";
      var items = await TarkovAPI.items(mode);
      var n = (items || []).length;
      dynamic.push("В базе сейчас около " + n + " предметов (mode " + mode + ").");
      var guns = (items || []).filter(function (it) {
        return (it.types || []).indexOf("gun") >= 0;
      }).length;
      dynamic.push("Оружия (type gun): " + guns + ".");
      var noFlea = (items || []).filter(function (it) {
        return (it.types || []).indexOf("noFlea") >= 0;
      }).length;
      dynamic.push("С тегом noFlea: " + noFlea + ".");
      var extras = await Promise.allSettled([TarkovAPI.tasks(mode), TarkovAPI.crafts(mode), TarkovAPI.barters(mode), TarkovAPI.hideout(mode)]);
      var labels = ["Квестов", "Крафтов", "Бартеров", "Станций убежища"];
      extras.forEach(function (result, i) {
        if (result.status === "fulfilled") dynamic.push(labels[i] + " в базе: " + result.value.length + " (" + mode + ").");
      });
      if (window.TarkovItemGraph && extras.every(function (r) { return r.status === "fulfilled"; })) {
        TarkovItemGraph.build({ items: items, tasks: extras[0].value, crafts: extras[1].value, barters: extras[2].value, hideout: extras[3].value });
        var linked = items.filter(function (item) {
          var l = TarkovItemGraph.links(item.id);
          return l.questsUsing.length + l.craftsAsInput.length + l.bartersAsInput.length > 0;
        });
        for (var i = 0; i < Math.min(10, linked.length); i++) {
          var item = linked[Math.floor(Math.random() * linked.length)], links = TarkovItemGraph.links(item.id);
          dynamic.push((item.shortName || item.name || item.id) + ": квестовых связей " + links.questsUsing.length + ", крафтов-ингредиентов " + links.craftsAsInput.length + ", бартеров " + links.bartersAsInput.length + ".");
        }
      }
    } catch (e) {
      dynamic.push("Динамические факты недоступны офлайн.");
    }
  }

  function next() {
    var pool = staticFacts.concat(dynamic);
    if (!pool.length) {
      setFact("Нет фактов");
      return;
    }
    var i = Math.floor(Math.random() * pool.length);
    setFact(pool[i]);
  }

  document.getElementById("nextBtn").onclick = next;
  document.getElementById("refreshDyn").onclick = async function () {
    this.disabled = true;
    await loadDynamic();
    this.disabled = false;
    next();
  };

  (async function () {
    await loadStatic();
    next();
  })();
})();
