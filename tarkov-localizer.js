/*! Localizer — pick languages first, then load only those packs (low memory) */
(function () {
  const API = "https://json.tarkov.dev";
  const LANGS = [
    { code: "en", label: "English" },
    { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
    { code: "uk", label: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Fran\u00e7ais" },
    { code: "es", label: "Espa\u00f1ol" },
    { code: "pl", label: "Polski" },
    { code: "cs", label: "\u010ce\u0161tina" },
    { code: "it", label: "Italiano" },
    { code: "pt", label: "Portugu\u00eas" },
    { code: "tr", label: "T\u00fcrk\u00e7e" },
    { code: "zh", label: "\u4e2d\u6587" },
    { code: "ja", label: "\u65e5\u672c\u8a9e" },
    { code: "ko", label: "\ud55c\uad6d\uc5b4" },
    { code: "hu", label: "Magyar" },
    { code: "ro", label: "Rom\u00e2n\u0103" },
    { code: "sk", label: "Sloven\u010dina" },
    { code: "th", label: "\u0e44\u0e17\u0e22" },
    { code: "id", label: "Indonesia" },
    { code: "vn", label: "Ti\u1ebfng Vi\u1ec7t" }
  ];
  const STORE_KEY = "tarkovLocalizerLangs";
  const MAX_LANGS = 4;

  let tab = "items";
  let itemMeta = new Map();
  let questMeta = new Map();
  let itemPacks = {};
  let taskPacks = {};
  let selected = loadSelected();
  let loaded = false;

  function loadSelected() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (Array.isArray(raw) && raw.length) {
        return raw.filter(function (c) {
          return LANGS.some(function (l) { return l.code === c; });
        }).slice(0, MAX_LANGS);
      }
    } catch (e) {}
    return ["en", "ru"];
  }
  function saveSelected() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(selected)); } catch (e) {}
  }

  function norm(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }
  function humanize(slug) {
    return String(slug || "").replace(/-/g, " ");
  }
  function highlight(text, q) {
    const t = String(text || "");
    if (!q) return esc(t);
    const lower = t.toLowerCase();
    const i = lower.indexOf(q);
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) +
      '<span class="mark">' + esc(t.slice(i, i + q.length)) + "</span>" +
      esc(t.slice(i + q.length));
  }

  function langLabel(code) {
    const m = LANGS.find(function (l) { return l.code === code; });
    return (m && m.label) || code;
  }

  function paintLangGrid() {
    const grid = document.getElementById("langGrid");
    if (!grid) return;
    grid.innerHTML = LANGS.map(function (l) {
      const on = selected.indexOf(l.code) >= 0;
      return '<label class="lang-chip' + (on ? " on" : "") + '" title="' + esc(l.label) + '">' +
        '<input type="checkbox" data-code="' + l.code + '"' + (on ? " checked" : "") + ">" +
        "<span>" + esc(l.label) + "</span>" +
        '<span class="meta">' + l.code + "</span></label>";
    }).join("");
    grid.querySelectorAll("input").forEach(function (inp) {
      inp.onchange = function () {
        const code = inp.getAttribute("data-code");
        if (inp.checked) {
          if (selected.indexOf(code) < 0) {
            if (selected.length >= MAX_LANGS) {
              inp.checked = false;
              setStatus("err", "\u041d\u0435 \u0431\u043e\u043b\u044c\u0448\u0435 " + MAX_LANGS + " \u044f\u0437\u044b\u043a\u043e\u0432 \u0437\u0430 \u0440\u0430\u0437 (\u043f\u0430\u043c\u044f\u0442\u044c)");
              return;
            }
            selected.push(code);
          }
        } else {
          selected = selected.filter(function (c) { return c !== code; });
        }
        if (!selected.length) selected = ["en"];
        saveSelected();
        loaded = false;
        clearResults();
        paintLangGrid();
        setStatus("", "\u042f\u0437\u044b\u043a\u0438: " + selected.join(", ") + " \u2014 \u043d\u0430\u0436\u043c\u0438 \u00ab\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c\u00bb");
      };
    });
  }

  function setStatus(cls, msg) {
    const st = document.getElementById("status");
    if (!st) return;
    st.className = "status" + (cls ? " " + cls : "");
    st.textContent = msg;
  }

  function clearResults() {
    itemMeta = new Map();
    questMeta = new Map();
    itemPacks = {};
    taskPacks = {};
    const sc = document.getElementById("searchCard");
    const tc = document.getElementById("tableCard");
    if (sc) sc.hidden = true;
    if (tc) tc.hidden = true;
    const tb = document.getElementById("tbody");
    if (tb) tb.innerHTML = "";
    const q = document.getElementById("q");
    if (q) q.value = "";
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(url + " \u2192 HTTP " + res.status);
    return res.json();
  }

  async function fetchLocale(mode, lang) {
    const json = await fetchJson(API + "/" + mode + "/items_" + lang);
    return json.data || json || {};
  }

  async function fetchTasksLocale(mode, lang) {
    try {
      const json = await fetchJson(API + "/" + mode + "/tasks_" + lang);
      return json.data || json || {};
    } catch (e) {
      return {};
    }
  }

  function resolve(pack, id, kind) {
    if (!pack) return "";
    if (kind === "short") {
      return pack[id + " ShortName"] || pack[id + " shortName"] || "";
    }
    return pack[id + " Name"] || pack[id + " name"] || "";
  }

  function indexItems(raw) {
    const map = new Map();
    const list = Array.isArray(raw) ? raw : Object.values(raw || {});
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (!it) continue;
      const id = it.id || it._id;
      if (!id) continue;
      map.set(id, {
        slug: it.normalizedName || "",
        icon: it.iconLink || it.gridImageLink || ""
      });
    }
    return map;
  }

  function indexTasks(raw) {
    const map = new Map();
    const list = Array.isArray(raw) ? raw : Object.values(raw || {});
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (!t) continue;
      const id = t.id || t._id;
      if (!id) continue;
      map.set(id, { slug: t.normalizedName || "" });
    }
    return map;
  }

  document.getElementById("loadBtn").onclick = async function () {
    const mode = document.getElementById("gameMode").value || "pve";
    if (!selected.length) selected = ["en"];
    if (selected.length > MAX_LANGS) {
      selected = selected.slice(0, MAX_LANGS);
      saveSelected();
      paintLangGrid();
    }
    clearResults();
    setStatus("", "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0442\u043e\u043b\u044c\u043a\u043e: " + selected.join(", ") + "\u2026");
    const btn = document.getElementById("loadBtn");
    btn.disabled = true;
    try {
      const packs = {};
      const tpacks = {};
      await Promise.all(selected.map(async function (lang) {
        packs[lang] = await fetchLocale(mode, lang);
        tpacks[lang] = await fetchTasksLocale(mode, lang);
      }));
      itemPacks = packs;
      taskPacks = tpacks;

      setStatus("", "\u0418\u043d\u0434\u0435\u043a\u0441\u0430\u0446\u0438\u044f \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432\u2026");
      const itemsJson = await fetchJson(API + "/" + mode + "/items");
      const rawItems = (itemsJson.data && itemsJson.data.items) || itemsJson.data || itemsJson;
      itemMeta = indexItems(rawItems);

      setStatus("", "\u0418\u043d\u0434\u0435\u043a\u0441\u0430\u0446\u0438\u044f \u043a\u0432\u0435\u0441\u0442\u043e\u0432\u2026");
      const tasksJson = await fetchJson(API + "/" + mode + "/tasks");
      const rawTasks = (tasksJson.data && (tasksJson.data.tasks || tasksJson.data.quests)) || tasksJson.data || tasksJson;
      questMeta = indexTasks(rawTasks);

      loaded = true;
      setStatus("ok",
        "\u0413\u043e\u0442\u043e\u0432\u043e \u00b7 " + itemMeta.size + " \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432 \u00b7 " + questMeta.size + " \u043a\u0432\u0435\u0441\u0442\u043e\u0432 \u00b7 " + selected.join(", "));
      document.getElementById("searchCard").hidden = false;
      document.getElementById("tableCard").hidden = false;
      render();
    } catch (e) {
      loaded = false;
      setStatus("err", (e && e.message) || String(e));
    } finally {
      btn.disabled = false;
    }
  };

  function matchIds(metaMap, packs, q) {
    const out = [];
    if (!q) return out;
    metaMap.forEach(function (meta, id) {
      if (norm(meta.slug).indexOf(q) >= 0 || norm(id).indexOf(q) >= 0) {
        out.push(id);
        return;
      }
      for (let i = 0; i < selected.length; i++) {
        const lang = selected[i];
        const pack = packs[lang];
        const n = resolve(pack, id, "name");
        const s = resolve(pack, id, "short");
        if ((n && norm(n).indexOf(q) >= 0) || (s && norm(s).indexOf(q) >= 0)) {
          out.push(id);
          return;
        }
      }
    });
    return out;
  }

  function renderHead() {
    const th = document.getElementById("thead");
    let html = '<tr><th style="width:48px"></th>';
    selected.forEach(function (lang) {
      html += "<th>" + esc(langLabel(lang)) + ' <span class="meta">' + lang + "</span></th>";
    });
    html += "<th>slug / id</th><th></th></tr>";
    th.innerHTML = html;
  }

  function render() {
    if (!loaded) return;
    renderHead();
    const q = norm(document.getElementById("q").value);
    const isQuest = tab === "quests";
    const metaMap = isQuest ? questMeta : itemMeta;
    const packs = isQuest ? taskPacks : itemPacks;

    let ids = [];
    if (q) ids = matchIds(metaMap, packs, q);

    document.getElementById("count").textContent = q
      ? ("\u041d\u0430\u0439\u0434\u0435\u043d\u043e: " + ids.length + (ids.length > 150 ? " (150 \u043d\u0430 \u044d\u043a\u0440\u0430\u043d\u0435)" : ""))
      : "\u0412\u0432\u0435\u0434\u0438 \u0437\u0430\u043f\u0440\u043e\u0441";

    const shown = ids.slice(0, 150);
    const tbody = document.getElementById("tbody");
    const parts = [];
    for (let i = 0; i < shown.length; i++) {
      const id = shown[i];
      const meta = metaMap.get(id) || { slug: "", icon: "" };
      let cells = "<td>";
      if (!isQuest && meta.icon) {
        cells += '<img class="ico" src="' + esc(meta.icon) + '" loading="lazy" alt="">';
      }
      cells += "</td>";
      selected.forEach(function (lang) {
        let n = resolve(packs[lang], id, "name");
        if (!n && lang === "en") n = humanize(meta.slug);
        const s = isQuest ? "" : resolve(packs[lang], id, "short");
        cells += '<td><div class="nm">' + highlight(n || "\u2014", q) + "</div>";
        if (s) cells += '<div class="sh">' + highlight(s, q) + "</div>";
        cells += "</td>";
      });
      cells += '<td class="meta">' + esc(meta.slug || id) + "</td><td>";
      selected.forEach(function (lang) {
        const v = resolve(packs[lang], id, "name") || (lang === "en" ? humanize(meta.slug) : "");
        if (v) cells += '<button type="button" class="copy-btn" data-v="' + esc(v) + '">' + lang + "</button>";
      });
      cells += "</td>";
      parts.push("<tr>" + cells + "</tr>");
    }
    tbody.innerHTML = parts.join("");
    tbody.querySelectorAll(".copy-btn").forEach(function (b) {
      b.onclick = function () {
        try { navigator.clipboard.writeText(b.getAttribute("data-v") || ""); } catch (e) {}
      };
    });
  }

  document.querySelectorAll(".tab").forEach(function (el) {
    el.onclick = function () {
      tab = el.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(function (x) {
        x.classList.toggle("active", x === el);
      });
      render();
    };
  });
  document.getElementById("q").oninput = render;

  document.getElementById("selAll").onclick = function () {
    setStatus("err", "\u0412\u0441\u0435 \u044f\u0437\u044b\u043a\u0438 \u0441\u0440\u0430\u0437\u0443 \u043d\u0435\u043b\u044c\u0437\u044f \u2014 \u043b\u0438\u043c\u0438\u0442 " + MAX_LANGS);
  };
  document.getElementById("selNone").onclick = function () {
    selected = ["en"];
    saveSelected();
    loaded = false;
    clearResults();
    paintLangGrid();
    setStatus("", "en \u2014 \u043d\u0430\u0436\u043c\u0438 \u00ab\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c\u00bb");
  };
  document.getElementById("selDefault").onclick = function () {
    selected = ["en", "ru"];
    saveSelected();
    loaded = false;
    clearResults();
    paintLangGrid();
    setStatus("", "en + ru \u2014 \u043d\u0430\u0436\u043c\u0438 \u00ab\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c\u00bb");
  };

  (function () {
    const KEY = "tarkovPreferredGameMode";
    try {
      const def = localStorage.getItem(KEY) || "pve";
      const sel = document.getElementById("gameMode");
      if (sel && [].some.call(sel.options, function (o) { return o.value === def; })) sel.value = def;
      if (sel) {
        sel.addEventListener("change", function () {
          try { localStorage.setItem(KEY, sel.value); } catch (e) {}
          loaded = false;
          clearResults();
          setStatus("", "\u0421\u043c\u0435\u043d\u0438\u043b\u0441\u044f \u0440\u0435\u0436\u0438\u043c \u2014 \u0437\u0430\u0433\u0440\u0443\u0437\u0438 \u0441\u043d\u043e\u0432\u0430");
        });
      }
    } catch (e) {}
  })();

  paintLangGrid();
  setStatus("", "1) \u042f\u0437\u044b\u043a\u0438 (\u043c\u0430\u043a\u0441. " + MAX_LANGS + ")  2) \u00ab\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c\u00bb  3) \u041f\u043e\u0438\u0441\u043a");
})();
