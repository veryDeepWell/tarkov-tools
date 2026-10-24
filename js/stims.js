/*! Stims table — TarkovTableTool */
(function () {
  "use strict";

  function effectTags(effects) {
    var good = [],
      bad = [];
    (effects || []).forEach(function (e) {
      var t = e.type || "",
        skill = e.skill || "",
        val = e.value,
        dur = e.duration;
      var label = skill ? skill + (val ? " " + (val > 0 ? "+" : "") + val : "") : t;
      if (t === "HealthRate" && val > 0) label = "HP +" + val + "/s";
      if (t === "StaminaRate" && val > 0) label = "Stam regen +" + val;
      if (t === "MaxStamina" && val > 0) label = "Max stam +" + val;
      if (t === "WeightLimit") label = "Weight +" + val;
      if (t === "EnergyRate" && val < 0) {
        bad.push("Energy " + val + "/s");
        return;
      }
      if (t === "HydrationRate" && val < 0) {
        bad.push("Hydro " + val + "/s");
        return;
      }
      if (t === "HealthRate" && val < 0) {
        bad.push("HP " + val + "/s");
        return;
      }
      if (t === "HandsTremor" || t === "QuantumTunnelling") {
        bad.push(t);
        return;
      }
      if (t === "Removeallbloodlosses") label = "Стоп кровь";
      if (t === "Antidote") label = "Антидот";
      good.push(label + (dur ? " (" + dur + "s)" : ""));
    });
    return { good: good, bad: bad };
  }

  function stimRole(slug, effects) {
    var types = (effects || [])
      .map(function (e) {
        return e.type + (e.skill || "");
      })
      .join(" ");
    if (/mule/.test(slug) || types.indexOf("WeightLimit") >= 0) return "weight";
    if (/propital|etg|pnb|zagustin|ahf1|perfotoran/.test(slug)) return "heal";
    if (/sj6|trimadol|meldonin/.test(slug) || /MaxStamina|StaminaRate|Endurance/.test(types))
      return "stamina";
    if (/sj1|sj9|sj12|obdolbos|strength|3-b-tg|2a2|l1|adrenaline/.test(slug + types))
      return "combat";
    return "utility";
  }

  function stimScore(effects, avg) {
    var sc = 0;
    (effects || []).forEach(function (e) {
      var t = e.type,
        v = Number(e.value) || 0,
        d = Number(e.duration) || 0;
      if (t === "Skill" && v > 0) sc += (v * Math.min(d, 400)) / 50;
      if (t === "HealthRate" && v > 0) sc += v * d * 0.8;
      if (t === "MaxStamina" && v > 0) sc += v * 2;
      if (t === "StaminaRate" && v > 0) sc += (v * d) / 10;
      if (t === "WeightLimit" && v > 0) sc += v * 8;
      if (t === "Removeallbloodlosses") sc += 40;
      if (t === "Antidote") sc += 25;
      if (t === "EnergyRate" && v < 0) sc -= (Math.abs(v) * d) / 20;
      if (t === "HydrationRate" && v < 0) sc -= (Math.abs(v) * d) / 20;
      if (t === "HealthRate" && v < 0) sc -= Math.abs(v) * d;
      if (t === "HandsTremor") sc -= 5;
    });
    if (avg > 0) sc -= Math.log10(avg + 10);
    return Math.round(sc * 10) / 10;
  }

  var stimCat = "all";
  var catEl = document.getElementById("stimCat");
  if (catEl) {
    catEl.addEventListener("change", function () {
      stimCat = catEl.value || "all";
      if (window.render) window.render();
    });
  }

  TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#stimHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#q",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (stimCat !== "all" && row.role !== stimCat) return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "score",
        label: "Score",
        html: function (r) {
          return "<strong>" + (r.score != null ? r.score : "—") + "</strong>";
        }
      },
      {
        key: "name",
        label: "Предмет",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "role", label: "Роль" },
      {
        key: "good",
        label: "Эффекты",
        sort: false,
        html: function (r, h) {
          return (r.good || [])
            .map(function (x) {
              return '<span class="tag good">' + h.esc(x) + "</span>";
            })
            .join(" ");
        }
      },
      {
        key: "bad",
        label: "Минусы",
        sort: false,
        html: function (r, h) {
          return (r.bad || [])
            .map(function (x) {
              return '<span class="tag bad">' + h.esc(x) + "</span>";
            })
            .join(" ");
        }
      },
      { key: "avg", label: "Flea", format: "num" }
    ],
    fetch: function (mode, API) {
      return API.items(mode);
    },
    mapItem: function (it) {
      var p = it.properties || {};
      if (p.propertiesType !== "ItemPropertiesStimulator" && !(p.stimulatorBuffs || []).length)
        return null;
      if (p.propertiesType && p.propertiesType.indexOf("Stim") < 0 && p.propertiesType !== "ItemPropertiesStimulator") {
        // still allow medical stims with buffs
        if (!(p.stimulatorBuffs || []).length) return null;
      }
      var effects = p.stimulatorBuffs || p.buffs || [];
      var slug = it.normalizedName || "";
      var avg = Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0;
      var tags = effectTags(effects);
      return {
        id: it.id,
        name: TarkovTableTool.itemName(it),
        slug: slug,
        icon: it.iconLink || "",
        role: stimRole(slug, effects),
        good: tags.good,
        bad: tags.bad,
        avg: avg,
        score: stimScore(effects, avg)
      };
    }
  });
})();
