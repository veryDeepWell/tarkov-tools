/*! Localizer v5 — P3 TarkovUI/API */
(function () {
  var API = "";
  var MAX_LANGS = 4;
  var STORE_KEY = "tarkovLocalizerLangs";
  var tab = "items";
  var itemMeta = new Map();
  var questMeta = new Map();
  var itemPacks = {};
  var taskPacks = {};
  var selected = ["en", "ru"];
  var loaded = false;

  function loadSelected() {
    try {
      var raw = window.TarkovStorage ? TarkovStorage.getJson(STORE_KEY, null) : null;
      if (Array.isArray(raw) && raw.length) selected = raw.slice(0, MAX_LANGS);
    } catch (e) {}
  }
  function saveSelected() {
    try {
      if (window.TarkovStorage) TarkovStorage.setJson(STORE_KEY, selected);
    } catch (e) {}
  }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  function esc(s) {
    if (window.TarkovUI && TarkovUI.esc) return TarkovUI.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }
  function humanize(slug) {
    return String(slug || "").split("-").join(" ");
  }
  function highlight(text, q) {
    var t = String(text || "");
    if (!q) return esc(t);
    var lower = t.toLowerCase();
    var i = lower.indexOf(q);
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) + '<span class="mark">' + esc(t.slice(i, i + q.length)) + "</span>" + esc(t.slice(i + q.length));
  }
  function setStatus(cls, msg) {
    var st = document.getElementById("status");
    if (!st) return;
    st.className = "status" + (cls ? " " + cls : "");
    st.textContent = msg;
  }
  function clearResults() {
    itemMeta = new Map();
    questMeta = new Map();
    itemPacks = {};
    taskPacks = {};
    loaded = false;
    var sc = document.getElementById("searchCard");
    var tc = document.getElementById("tableCard");
    if (sc) sc.hidden = true;
    if (tc) tc.hidden = true;
    var tb = document.getElementById("tbody");
    if (tb) tb.innerHTML = "";
    var q = document.getElementById("q");
    if (q) q.value = "";
  }
  function readSelectedFromDom() {
    var inputs = document.querySelectorAll("#langGrid input[data-code]");
    var out = [];
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].checked) out.push(inputs[i].getAttribute("data-code"));
    }
    if (!out.length) out = ["en"];
    if (out.length > MAX_LANGS) out = out.slice(0, MAX_LANGS);
    selected = out;
    return selected;
  }
  function syncChips() {
    var inputs = document.querySelectorAll("#langGrid input[data-code]");
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      var code = inp.getAttribute("data-code");
      inp.checked = selected.indexOf(code) >= 0;
      var lab = inp.parentElement;
      if (lab) {
        if (inp.checked) lab.classList.add("on");
        else lab.classList.remove("on");
      }
    }
  }
  function onLangChange() {
    var code = this.getAttribute("data-code");
    if (this.checked) {
      if (selected.indexOf(code) < 0) {
        if (selected.length >= MAX_LANGS) {
          this.checked = false;
          setStatus("err", "Max " + MAX_LANGS + " languages");
          return;
        }
        selected.push(code);
      }
    } else {
      selected = selected.filter(function (c) { return c !== code; });
    }
    if (!selected.length) selected = ["en"];
    saveSelected();
    clearResults();
    syncChips();
    setStatus("", selected.join(", ") + " — press Load");
  }
  function wireChips() {
    var inputs = document.querySelectorAll("#langGrid input[data-code]");
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].onchange = onLangChange;
    }
    syncChips();
  }
  async function fetchJson(url) {
    if (window.TarkovAPI && typeof TarkovAPI.getJson === "function") {
      try {
        if (url.indexOf("json.tarkov.dev") >= 0 || url.charAt(0) === "/") {
          return await TarkovAPI.getJson(url, { httpCache: "force-cache", ttl: 10 * 60 * 1000 });
        }
      } catch (e) { /* fall through */ }
    }
    var res = await TarkovAPI.request(url, { httpCache: "force-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }
  function resolve(pack, id, kind) {
    if (!pack) return "";
    if (kind === "short") return pack[id + " ShortName"] || pack[id + " shortName"] || "";
    return pack[id + " Name"] || pack[id + " name"] || "";
  }
  function indexItems(raw) {
    var map = new Map();
    var list = Array.isArray(raw) ? raw : Object.keys(raw || {}).map(function (k) { return raw[k]; });
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it) continue;
      var id = it.id || it._id;
      if (!id) continue;
      map.set(id, { slug: it.normalizedName || "", icon: it.iconLink || it.gridImageLink || "" });
    }
    return map;
  }
  function indexTasks(raw) {
    var map = new Map();
    var list = Array.isArray(raw) ? raw : Object.keys(raw || {}).map(function (k) { return raw[k]; });
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t) continue;
      var id = t.id || t._id;
      if (!id) continue;
      map.set(id, { slug: t.normalizedName || "" });
    }
    return map;
  }
  function matchIds(metaMap, packs, q) {
    var out = [];
    if (!q) return out;
    metaMap.forEach(function (meta, id) {
      if (norm(meta.slug).indexOf(q) >= 0 || norm(id).indexOf(q) >= 0) {
        out.push(id);
        return;
      }
      for (var i = 0; i < selected.length; i++) {
        var pack = packs[selected[i]];
        var n = resolve(pack, id, "name");
        var s = resolve(pack, id, "short");
        if ((n && norm(n).indexOf(q) >= 0) || (s && norm(s).indexOf(q) >= 0)) {
          out.push(id);
          return;
        }
      }
    });
    return out;
  }

  loadSelected();

  var loadBtn = document.getElementById("loadBtn");
  if (loadBtn) loadBtn.onclick = async function () {
    readSelectedFromDom();
    saveSelected();
    var modeEl = document.getElementById("gameMode");
    var mode = (modeEl && modeEl.value) || "pve";
    clearResults();
    setStatus("", "Loading " + selected.join(", ") + "...");
    loadBtn.disabled = true;
    try {
      var packs = {};
      var tpacks = {};
      await Promise.all(selected.map(async function (lang) {
        packs[lang] = (await fetchJson(API + "/" + mode + "/items_" + lang)).data || {};
        try {
          tpacks[lang] = (await fetchJson(API + "/" + mode + "/tasks_" + lang)).data || {};
        } catch (e) {
          tpacks[lang] = {};
        }
      }));
      itemPacks = packs;
      taskPacks = tpacks;
      setStatus("", "Indexing items...");
      var itemsJson = await fetchJson(API + "/" + mode + "/items");
      itemMeta = indexItems((itemsJson.data && itemsJson.data.items) || itemsJson.data || itemsJson);
      setStatus("", "Indexing quests...");
      var tasksJson = await fetchJson(API + "/" + mode + "/tasks");
      questMeta = indexTasks((tasksJson.data && (tasksJson.data.tasks || tasksJson.data.quests)) || tasksJson.data || tasksJson);
      loaded = true;
      setStatus("ok", "OK: " + itemMeta.size + " items, " + questMeta.size + " quests | " + selected.join(", "));
      document.getElementById("searchCard").hidden = false;
      document.getElementById("tableCard").hidden = false;
      render();
    } catch (e) {
      setStatus("err", (e && e.message) || String(e));
    } finally {
      loadBtn.disabled = false;
    }
  };

  function renderHead() {
    var th = document.getElementById("thead");
    if (!th) return;
    var html = '<tr><th style="width:48px"></th>';
    for (var i = 0; i < selected.length; i++) {
      html += "<th>" + selected[i] + "</th>";
    }
    html += "<th>slug / id</th><th></th></tr>";
    th.innerHTML = html;
  }
  function render() {
    if (!loaded) return;
    renderHead();
    var qEl = document.getElementById("q");
    var q = norm(qEl && qEl.value);
    var isQuest = tab === "quests";
    var metaMap = isQuest ? questMeta : itemMeta;
    var packs = isQuest ? taskPacks : itemPacks;
    var ids = q ? matchIds(metaMap, packs, q) : [];
    var count = document.getElementById("count");
    if (count) count.textContent = q ? ("Found: " + ids.length) : "Type a query";
    var shown = ids.slice(0, 150);
    var tbody = document.getElementById("tbody");
    if (!tbody) return;
    var parts = [];
    for (var i = 0; i < shown.length; i++) {
      var id = shown[i];
      var meta = metaMap.get(id) || { slug: "", icon: "" };
      var cells = "<td>";
      if (!isQuest && meta.icon) cells += '<img class="ico" src="' + esc(meta.icon) + '" loading="lazy" alt="">';
      cells += "</td>";
      for (var j = 0; j < selected.length; j++) {
        var lang = selected[j];
        var n = resolve(packs[lang], id, "name");
        if (!n && lang === "en") n = humanize(meta.slug);
        var s = isQuest ? "" : resolve(packs[lang], id, "short");
        cells += '<td><div class="nm">' + highlight(n || "-", q) + "</div>";
        if (s) cells += '<div class="sh">' + highlight(s, q) + "</div>";
        cells += "</td>";
      }
      cells += '<td class="meta">' + esc(meta.slug || id) + "</td><td>";
      for (var k = 0; k < selected.length; k++) {
        var v = resolve(packs[selected[k]], id, "name") || (selected[k] === "en" ? humanize(meta.slug) : "");
        if (v) cells += '<button type="button" class="copy-btn" data-v="' + esc(v) + '">' + selected[k] + "</button>";
      }
      cells += "</td>";
      parts.push("<tr>" + cells + "</tr>");
    }
    tbody.innerHTML = parts.join("");
    var btns = tbody.querySelectorAll(".copy-btn");
    for (var b = 0; b < btns.length; b++) {
      btns[b].onclick = function () {
        try { navigator.clipboard.writeText(this.getAttribute("data-v") || ""); } catch (e) {}
      };
    }
  }

  var tabs = document.querySelectorAll(".tab");
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].onclick = function () {
      tab = this.getAttribute("data-tab");
      for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("active", tabs[i] === this);
      render();
    };
  }
  var qInput = document.getElementById("q");
  if (qInput) qInput.oninput = render;

  var selDefault = document.getElementById("selDefault");
  if (selDefault) selDefault.onclick = function () {
    selected = ["en", "ru"];
    saveSelected();
    clearResults();
    syncChips();
    setStatus("", "en + ru — press Load");
  };
  var selNone = document.getElementById("selNone");
  if (selNone) selNone.onclick = function () {
    selected = ["en"];
    saveSelected();
    clearResults();
    syncChips();
    setStatus("", "en — press Load");
  };

  wireChips();
  setStatus("", "1) Languages  2) Load  3) Search");
})();
