/*! Key Analyzer — R-3a skeleton: OCR + match + rating + quests + sum */
(function () {
  "use strict";

  var catalog = []; // {id, name, slug, icon, avg, uses}
  var questByKeyId = {}; // keyId -> [{taskId, name}]
  var tableApi = null;
  var lastImage = null;

  function setStatus(msg, ok) {
    var st = document.getElementById("status");
    if (!st) return;
    st.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    st.textContent = msg || "";
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9а-яё\s\-]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreMatch(query, item) {
    var q = norm(query);
    if (!q || q.length < 3) return 0;
    var slug = norm(item.slug);
    var name = norm(item.name);
    if (slug === q || name === q) return 100;
    if (slug.indexOf(q) >= 0 || name.indexOf(q) >= 0) return 80;
    if (q.indexOf(slug) >= 0 && slug.length > 4) return 70;
    // token overlap
    var qt = q.split(" ");
    var ht = (slug + " " + name).split(" ");
    var hit = 0;
    qt.forEach(function (t) {
      if (t.length < 3) return;
      if (ht.some(function (h) {
        return h.indexOf(t) >= 0 || t.indexOf(h) >= 0;
      }))
        hit++;
    });
    if (hit >= 2) return 50 + hit * 5;
    if (hit === 1) return 30;
    return 0;
  }

  function bestMatch(line) {
    var best = null;
    var bestS = 0;
    catalog.forEach(function (it) {
      var s = scoreMatch(line, it);
      if (s > bestS) {
        bestS = s;
        best = it;
      }
    });
    return bestS >= 30 ? { item: best, confidence: bestS } : null;
  }

  async function loadCatalog() {
    var btn = document.getElementById("loadCatalogBtn");
    if (btn) btn.disabled = true;
    try {
      setStatus("Каталог…");
      try {
        if (window.TarkovKeysRating) await TarkovKeysRating.load();
      } catch (eR) {}
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var items = await TarkovAPI.items(mode);
      var tasks = [];
      try {
        tasks = await TarkovAPI.tasks(mode);
      } catch (eT) {}
      questByKeyId = {};
      (tasks || []).forEach(function (task) {
        var tname = task.name || task.normalizedName || task.id;
        function add(kid) {
          if (!kid) return;
          if (!questByKeyId[kid]) questByKeyId[kid] = [];
          questByKeyId[kid].push({
            taskId: task.id,
            name: tname
          });
        }
        (task.neededKeys || []).forEach(function (block) {
          (block.keys || []).forEach(add);
        });
        (task.objectives || []).forEach(function (o) {
          if (o.type === "giveItem" || o.type === "findItem" || o.type === "plantItem") {
            if (typeof o.item === "string") add(o.item);
            (o.items || []).forEach(function (x) {
              if (typeof x === "string") add(x);
              else if (x && x.id) add(x.id);
            });
          }
        });
      });
      catalog = [];
      (items || []).forEach(function (it) {
        if (!(it.types || []).includes("keys")) return;
        catalog.push({
          id: it.id,
          slug: it.normalizedName || "",
          name: window.TarkovTableTool
            ? TarkovTableTool.itemName(it)
            : it.shortName || it.name || it.normalizedName || it.id,
          icon: it.iconLink || it.gridImageLink || "",
          avg: Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0,
          uses: Number((it.properties || {}).uses) || 1
        });
      });
      setStatus("Ключей в каталоге: " + catalog.length, true);
    } catch (e) {
      setStatus(e.message || String(e), false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function personalScore(it) {
    try {
      if (!window.TarkovKeysRating) return null;
      var s = TarkovKeysRating.getScore(it.id);
      if (s == null) s = TarkovKeysRating.getScore(it.slug);
      return s;
    } catch (e) {
      return null;
    }
  }

  function runMatch() {
    if (!catalog.length) {
      setStatus("Сначала загрузи каталог", false);
      return;
    }
    var text = (document.getElementById("ocrText") || {}).value || "";
    var lines = text
      .split(/\n+/)
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    var seen = Object.create(null);
    var rows = [];
    var quests = Object.create(null);
    lines.forEach(function (line) {
      var m = bestMatch(line);
      if (!m || !m.item) return;
      if (seen[m.item.id]) return;
      seen[m.item.id] = 1;
      var score = personalScore(m.item);
      var qlist = questByKeyId[m.item.id] || [];
      qlist.forEach(function (q) {
        quests[q.taskId] = q.name;
      });
      rows.push({
        id: m.item.id,
        name: m.item.name,
        slug: m.item.slug,
        icon: m.item.icon,
        avg: m.item.avg,
        score: score,
        confidence: m.confidence,
        quest: qlist.length > 0,
        questNames: qlist
          .map(function (q) {
            return q.name;
          })
          .join(", ")
      });
    });
    rows.sort(function (a, b) {
      var as = a.score != null ? a.score : -1;
      var bs = b.score != null ? b.score : -1;
      return bs - as;
    });
    var sum = rows.reduce(function (s, r) {
      return s + (r.avg || 0);
    }, 0);
    var sumEl = document.getElementById("totalSum");
    if (sumEl)
      sumEl.textContent =
        (window.TarkovTableTool ? TarkovTableTool.fmtNum(sum) : String(sum)) + " ₽ · ключей: " + rows.length;

    if (!tableApi) {
      tableApi = TarkovTableTool.create({
        tbody: "#kaBody",
        thead: "#kaHead",
        status: "#status",
        loadBtn: null,
        search: null,
        defaultSort: "score",
        defaultSortDir: -1,
        progress: false,
        columns: [
          {
            key: "name",
            label: "Ключ",
            html: function (r, h) {
              return TarkovTableTool.nameCell(r, h);
            }
          },
          {
            key: "score",
            label: "Score",
            html: function (r, h) {
              return r.score != null ? "<strong>" + h.esc(String(r.score)) + "</strong>" : "—";
            }
          },
          { key: "avg", label: "Flea", format: "num" },
          {
            key: "quest",
            label: "Quest",
            html: function (r, h) {
              return r.quest ? h.esc(r.questNames || "✓") : "";
            }
          },
          {
            key: "confidence",
            label: "Match%",
            format: "num"
          }
        ],
        fetch: function () {
          return Promise.resolve([]);
        },
        mapItem: function () {
          return null;
        }
      });
    }
    tableApi.setRows(rows);
    var card = document.getElementById("resultsCard");
    if (card) card.style.display = "block";

    var ul = document.getElementById("questList");
    if (ul) {
      var ids = Object.keys(quests);
      ul.innerHTML = ids.length
        ? ids
            .map(function (id) {
              return "<li>" + (tableApi ? TarkovTableTool.esc(quests[id]) : quests[id]) + "</li>";
            })
            .join("")
        : "<li class=\"meta\">Квестовых ключей не найдено</li>";
    }
    setStatus("Сопоставлено: " + rows.length + " из " + lines.length + " строк", true);
  }

  // image / paste
  var drop = document.getElementById("drop");
  var fileInput = document.getElementById("file");
  var preview = document.getElementById("preview");
  var ocrBtn = document.getElementById("ocrBtn");

  function setImage(file) {
    if (!file || !file.type || file.type.indexOf("image") !== 0) return;
    lastImage = file;
    var url = URL.createObjectURL(file);
    if (preview) {
      preview.src = url;
      preview.style.display = "block";
    }
    if (ocrBtn) ocrBtn.disabled = false;
  }

  if (fileInput)
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) setImage(fileInput.files[0]);
    });
  if (drop) {
    drop.addEventListener("dragover", function (e) {
      e.preventDefault();
      drop.classList.add("drag");
    });
    drop.addEventListener("dragleave", function () {
      drop.classList.remove("drag");
    });
    drop.addEventListener("drop", function (e) {
      e.preventDefault();
      drop.classList.remove("drag");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) setImage(e.dataTransfer.files[0]);
    });
  }
  document.addEventListener("paste", function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") === 0) {
        setImage(items[i].getAsFile());
        break;
      }
    }
  });

  async function runOcr() {
    if (!lastImage) {
      setStatus("Нет изображения", false);
      return;
    }
    setStatus("OCR…");
    if (ocrBtn) ocrBtn.disabled = true;
    try {
      // dynamic load tesseract from CDN only on demand
      if (!window.Tesseract) {
        await new Promise(function (resolve, reject) {
          var s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
          s.onload = resolve;
          s.onerror = function () {
            reject(new Error("Не удалось загрузить Tesseract (CDN). Вставь текст вручную."));
          };
          document.head.appendChild(s);
        });
      }
      var result = await Tesseract.recognize(lastImage, "eng+rus", {
        logger: function (m) {
          if (m.status === "recognizing text" && m.progress != null)
            setStatus("OCR " + Math.round(m.progress * 100) + "%");
        }
      });
      var text = (result && result.data && result.data.text) || "";
      var ta = document.getElementById("ocrText");
      if (ta) ta.value = text;
      setStatus("OCR готово — проверь текст и нажми «Сопоставить»", true);
    } catch (e) {
      setStatus(e.message || String(e), false);
    } finally {
      if (ocrBtn) ocrBtn.disabled = false;
    }
  }

  document.getElementById("loadCatalogBtn").onclick = loadCatalog;
  document.getElementById("matchBtn").onclick = runMatch;
  if (ocrBtn) ocrBtn.onclick = runOcr;

  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
    } catch (e) {}
  };
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () {
      window.render();
    });
  }
})();
