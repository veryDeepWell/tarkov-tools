/*! NVG table — TarkovTableTool */
(function () {
  "use strict";

  var api = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#nvgHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#q",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
    columns: [
      {
        key: "name",
        label: "Название",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "intensity", label: "Intensity", format: "fixed2" },
      { key: "noise", label: "Noise", format: "fixed2" },
      { key: "noiseScale", label: "Noise scale", format: "fixed2" },
      { key: "diffuse", label: "Diffuse", format: "fixed2" },
      {
        key: "score",
        label: "Score",
        html: function (r) {
          return "<strong>" + (r.score != null ? Number(r.score).toFixed(2) : "—") + "</strong>";
        }
      },
      { key: "avg", label: "avg 24ч", format: "num" },
      { key: "weight", label: "Вес", format: "fixed2" },
      {
        key: "copy",
        label: "",
        sort: false,
        html: function (r, h) {
          return TarkovTableTool.copyBtn(r.slug || r.name, h);
        }
      }
    ],
    fetch: function (mode, API) {
      return API.items(mode);
    },
    mapItem: function (it) {
      var p = it.properties || {};
      var types = Array.isArray(it.types) ? it.types : (it.types ? [it.types] : []);
      var type = String(p.propertiesType || "");
      var nameKey = String(it.normalizedName || it.shortName || it.name || "").toLowerCase();
      var isNightVision = type === "ItemPropertiesNightVision" ||
        /night.?vision|nightvision|nvg|gpnvg|pvs.?14|pvs.?7|n-15|nvip/.test(nameKey) ||
        types.some(function (value) { return /night.?vision|nvg/i.test(String(value)); });
      if (!isNightVision) return null;
      var intensity = Number(p.intensity) || 0;
      var noise = Number(p.noiseIntensity) || 0;
      var noiseScale = Number(p.noiseScale) || 0;
      var diffuse = Number(p.diffuseIntensity) || 0;
      var score = intensity * 10 - noise * 5 - noiseScale * 2 - diffuse * 3;
      return {
        id: it.id,
        name: TarkovTableTool.itemName(it),
        slug: it.normalizedName || "",
        icon: it.displayIconLink || it.iconLink || it.gridImageLink || it.image512pxLink || "",
        intensity: intensity,
        noise: noise,
        noiseScale: noiseScale,
        diffuse: diffuse,
        score: score,
        avg: Number(it.avg24hPrice) || 0,
        weight: Number(it.weight) || 0
      };
    },
    onLoaded: function (ctx) {
      var card = document.getElementById("tableCard");
      if (card) { card.hidden = false; card.style.display = "block"; }
      if (!ctx.rows.length) {
        var status = document.getElementById("status");
        if (status) {
          status.className = "status err";
          status.textContent = "Данные загружены, но ПНВ не найдены. Проверь ответ API и свойства предметов.";
        }
      }
    },
    afterPaint: function (list, ctx) {
      TarkovTableTool.wireCopyButtons(ctx.tbody);
    }
  });
})();
