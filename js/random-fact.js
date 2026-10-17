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
      var mode = "pve";
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
