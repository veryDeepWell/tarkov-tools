/*! Key Analyzer — R-3a skeleton: OCR + match + rating + quests + sum */
(function () {
  "use strict";

  var catalog = []; // {id, name, slug, icon, avg, uses}
  var questByKeyId = {}; // keyId -> [{taskId, name}]
  var tableApi = null;
  var lastImage = null;
  var imageUrl = null;
  var loadedMode = null;
  var requestVersion = 0;
  var questsReady = false;
  var requestedMode = null;
  var ocrBusy = false, imageVersion = 0, lastOCR = null;

  function setStatus(msg, ok) {
    var st = document.getElementById("status");
    if (!st) return;
    st.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    st.textContent = msg || "";
  }

  function bestMatch(line) { return TarkovKeyMatch.best(line, catalog, false); }

  async function loadCatalog() {
    var version = ++requestVersion;
    var btn = document.getElementById("loadCatalogBtn");
    if (btn) btn.disabled = true;
    try {
      setStatus("Каталог…");
      try {
        if (window.TarkovKeysRating) await TarkovKeysRating.load();
      } catch (eR) {}
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      requestedMode = mode;
      var items = await TarkovAPI.items(mode);
      var tasks = [];
      var taskReady = false;
      try {
        tasks = await TarkovAPI.tasks(mode);
        taskReady = true;
      } catch (eT) { taskReady = false; }
      if (version !== requestVersion) return;
      loadedMode = mode;
      questsReady = taskReady;
      questByKeyId = window.TarkovKeysRating && TarkovKeysRating.questIndex ? TarkovKeysRating.questIndex(tasks) : {};
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
          uses: Number((it.properties || {}).uses) || 1,
          aliases: [it.name, it.shortName].filter(Boolean), raw: it
        });
      });
      setStatus("Ключей в каталоге: " + catalog.length + (questsReady ? "" : " · Квесты не загружены — повтори загрузку"), questsReady);
      var options = document.getElementById("keyOptions");
      if (options) options.innerHTML = catalog.map(function (item) { return '<option value="' + TarkovTableTool.esc(item.name + " [" + item.id + "]") + '"></option>'; }).join("");
    } catch (e) {
      setStatus(e.message || String(e), false);
    } finally {
      if (btn && version === requestVersion) btn.disabled = false;
    }
  }

  function personalScore(it) {
    try {
      if (!window.TarkovKeysRating) return null;
      if (TarkovKeysRating.assessment) return TarkovKeysRating.assessment(it.raw || it, (questByKeyId[it.id] || []).length).score;
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
    var unmatched = [];
    var quests = Object.create(null);
    lines.forEach(function (line, index) {
      var quantity = line.match(/\s*[×*]\s*(\d+)\s*$/);
      var count = quantity ? Math.max(1, Math.min(100, Number(quantity[1]))) : 1;
      var inputName = quantity ? line.slice(0, quantity.index) : line;
      var explicitId = inputName.match(/\[([^\]]+)\]\s*$/);
      var chosen = explicitId && catalog.find(function (item) { return item.id === explicitId[1]; });
      var m = chosen ? { item: chosen, confidence: 100 } : bestMatch(inputName);
      if (m && lastOCR && lastOCR.text === text && lastOCR.evidence[index]) m.confidence = Math.min(m.confidence,lastOCR.evidence[index].confidence);
      if (!m || !m.item) { unmatched.push(line); return; }
      if (seen[m.item.id]) { seen[m.item.id].count += count; return; }
      var score = personalScore(m.item);
      var qlist = questByKeyId[m.item.id] || [];
      qlist.forEach(function (q) {
        quests[q.taskId] = q.name;
      });
      var row = {
        id: m.item.id,
        name: m.item.name,
        slug: m.item.slug,
        icon: m.item.icon,
        avg: m.item.avg,
        count: count,
        score: score,
        confidence: m.confidence,
        quest: qlist.length > 0,
        questNames: qlist
          .map(function (q) {
            return q.name;
          })
          .join(", ")
      };
      rows.push(row);
      seen[m.item.id] = row;
    });
    rows.sort(function (a, b) {
      var as = a.score != null ? a.score : -1;
      var bs = b.score != null ? b.score : -1;
      return bs - as;
    });
    var sum = rows.reduce(function (s, r) {
      return s + (r.avg || 0) * r.count;
    }, 0);
    var sumEl = document.getElementById("totalSum");
    if (sumEl)
      sumEl.textContent =
        (window.TarkovTableTool ? TarkovTableTool.fmtNum(sum) : String(sum)) + " ₽ · экземпляров: " + rows.reduce(function (n, r) { return n + r.count; }, 0);

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
            label: "Оценка спроса / личная",
            html: function (r, h) {
              return r.score != null ? "<strong>" + h.esc(String(r.score)) + "</strong>" : "—";
            }
          },
          { key: "avg", label: "Flea", format: "num" },
          { key: "count", label: "Количество", format: "num" },
          {
            key: "quest",
            label: "Quest",
            html: function (r, h) {
              return r.quest ? h.esc(r.questNames || "✓") : "";
            }
          },
          {
            key: "confidence",
            label: "Балл совпадения",
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
        : "<li class=\"meta\">" + (questsReady ? "Квестовых ключей не найдено" : "Квесты не загружены: повтори загрузку каталога") + "</li>";
    }
    setStatus("Уникальных ключей: " + rows.length + ". Не распознано / неоднозначно: " + unmatched.length +
      (unmatched.length ? " — исправь строки: " + unmatched.join("; ") : "") +
      ". Количество можно задать в тексте: название ×2. Проверь повторы OCR перед расчётом.", unmatched.length === 0);
  }

  // image / paste
  var drop = document.getElementById("drop");
  var fileInput = document.getElementById("file");
  var preview = document.getElementById("preview");
  var ocrBtn = document.getElementById("ocrBtn");

  function setImage(file) {
    if (!file || !file.type || file.type.indexOf("image") !== 0) return;
    lastImage = file;
    imageVersion++; lastOCR = null;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    var url = imageUrl = URL.createObjectURL(file);
    if (preview) {
      preview.src = url;
      preview.style.display = "block";
    }
    if (ocrBtn) ocrBtn.disabled = ocrBusy;
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
    if (ocrBusy) return;
    if (!lastImage) {
      setStatus("Нет изображения", false);
      return;
    }
    setStatus("OCR…");
    ocrBusy = true;
    var file = lastImage, version = imageVersion;
    var capturedMode = (document.getElementById("gameMode") || {}).value || "pve";
    if (ocrBtn) ocrBtn.disabled = true;
    try {
      // dynamic load tesseract from CDN only on demand
      if (!window.Tesseract) {
        await new Promise(function (resolve, reject) {
          var s = document.createElement("script");
          s.src = (window.TarkovOCRConfig || {}).script || "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
          s.onload = resolve;
          s.onerror = function () {
            reject(new Error("Не удалось загрузить Tesseract (CDN). Вставь текст вручную."));
          };
          document.head.appendChild(s);
        });
      }
      if (!catalog.length) await loadCatalog();
      if (!catalog.length) throw Error("Не удалось загрузить каталог ключей. Повтори загрузку.");
      var prepared = await TarkovKeyOCR.prepare(file);
      var worker = await Tesseract.createWorker("rus+eng", 1, Object.assign({}, (window.TarkovOCRConfig || {}).worker, {
        logger: function (m) { if (m.status === "recognizing text") setStatus("OCR " + Math.round(m.progress * 100) + "%"); }
      }));
      var passes = [];
      try {
        await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1", user_defined_dpi: "300" });
        passes.push((await worker.recognize(prepared.canvas)).data.text);
        if (prepared.grid) {
          await worker.reinitialize("rus");
          passes.push((await worker.recognize(prepared.canvas)).data.text);
          await worker.reinitialize("eng");
          passes.push((await worker.recognize(prepared.canvas)).data.text);
        }
      } finally { await worker.terminate(); }
      var lines = passes.map(function (text) { return text.split(/\n/).map(function(l){return l.trim();}).filter(Boolean); });
      if (version !== imageVersion || capturedMode !== ((document.getElementById("gameMode") || {}).value || "pve")) {
        setStatus("Изображение или режим изменились — повтори распознавание", false); return;
      }
      var rawLines = lines[0], recognized = 0, evidence = [];
      var text = rawLines.map(function (line, index) {
        var variants = [line];
        lines.slice(1).forEach(function(pass){if(pass.length===rawLines.length && (!prepared.grid || rawLines.length===prepared.cells.length))variants.push(pass[index]);});
        var match = TarkovKeyMatch.best(variants, catalog, true);
        evidence.push({confidence:match?match.confidence:0});
        if (!match) return line;
        recognized++;
        return match.item.raw.name || match.item.name;
      }).join("\n");
      var ta = document.getElementById("ocrText");
      if (ta) ta.value = text;
      lastOCR={text:text,evidence:evidence};
      var raw = document.getElementById("ocrRaw"); if (raw) raw.textContent = passes.join("\n---\n");
      runMatch();
      setStatus("OCR: " + recognized + " из " + rawLines.length + " подписей сопоставлены" +
        (prepared.grid ? " · ячейки " + prepared.grid.cols + "×" + prepared.grid.rows : "") +
        ". Остальные подписи неоднозначны или обрезаны — уточни их вручную.", recognized === rawLines.length ? true : undefined);
      if (recognized !== rawLines.length) document.getElementById("status").classList.add("warn");
    } catch (e) {
      setStatus(e.message || String(e), false);
    } finally {
      ocrBusy = false;
      if (ocrBtn) ocrBtn.disabled = false;
    }
  }

  document.getElementById("loadCatalogBtn").onclick = loadCatalog;
  document.getElementById("matchBtn").onclick = runMatch;
  if (ocrBtn) ocrBtn.onclick = runOcr;
  var addManual = document.getElementById("addManualKey");
  if (addManual) addManual.onclick = function () {
    var input = document.getElementById("manualKey");
    var item = catalog.find(function (row) { return row.name + " [" + row.id + "]" === input.value; });
    if (!item) { setStatus("Выбери полное название ключа из загруженного каталога", false); return; }
    var qty = Math.max(1, Math.min(100, Number(document.getElementById("manualQty").value) || 1));
    var text = document.getElementById("ocrText");
    text.value = text.value.trim() + (text.value.trim() ? "\n" : "") + item.name + " [" + item.id + "] ×" + Math.floor(qty);
    input.value = ""; runMatch();
  };

  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      if (requestedMode && requestedMode !== mode) {
        catalog = []; questByKeyId = {}; questsReady = false;
        var card = document.getElementById("resultsCard");
        if (card) card.style.display = "none";
        loadCatalog();
      }
    } catch (e) {}
  };
  window.addEventListener("beforeunload", function () { if (imageUrl) URL.revokeObjectURL(imageUrl); });
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () {
      window.render();
    });
  }
})();
