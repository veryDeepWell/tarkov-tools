/*! Medkits table — TarkovTableTool */
(function () {
  "use strict";

  function cellsOf(it) {
    return Math.max(1, (Number(it.width) || 1) * (Number(it.height) || 1));
  }

  TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#medHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#q",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
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
      { key: "type", label: "Тип" },
      {
        key: "hpPerCell",
        label: "HP/слот",
        html: function (r) {
          if (!r.hp) return "—";
          return r.hpPerCell.toFixed(0) + " (" + r.hp + "/" + r.cells + ")";
        }
      },
      {
        key: "use",
        label: "Use",
        html: function (r) {
          return r.use ? r.use + "s" : "—";
        }
      },
      { key: "pricePerHp", label: "₽/HP", format: "num" },
      { key: "avg", label: "Flea", format: "num" },
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
      var pt = p.propertiesType || "";
      if (
        pt !== "ItemPropertiesMedKit" &&
        pt !== "ItemPropertiesMedicalItem" &&
        pt !== "ItemPropertiesPainkiller"
      )
        return null;
      var hp = Number(p.hitpoints) || Number(p.hp) || 0;
      var cells = cellsOf(it);
      var avg = Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0;
      var use = Number(p.useTime) || 0;
      var hpPerCell = cells ? hp / cells : 0;
      var pricePerHp = hp > 0 && avg > 0 ? avg / hp : null;
      var score = Math.round(hpPerCell * 10 - (use || 0) - (pricePerHp || 0) / 100);
      return {
        id: it.id,
        name: TarkovTableTool.itemName(it),
        slug: it.normalizedName || "",
        icon: it.iconLink || "",
        type: pt.replace("ItemProperties", ""),
        hp: hp,
        cells: cells,
        hpPerCell: hpPerCell,
        use: use,
        avg: avg,
        pricePerHp: pricePerHp,
        score: score
      };
    },
    afterPaint: function (list, ctx) {
      TarkovTableTool.wireCopyButtons(ctx.tbody);
    }
  });
})();
