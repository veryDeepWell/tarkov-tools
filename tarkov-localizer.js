/*! Localizer */
(function () {
  const API = "https://json.tarkov.dev";
  const LANGS = [
    { code: "en", label: "English" },
    { code: "ru", label: "Русский" },
    { code: "uk", label: "Українська" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" },
    { code: "pl", label: "Polski" },
    { code: "cs", label: "Čeština" },
    { code: "it", label: "Italiano" },
    { code: "pt", label: "Português" },
    { code: "tr", label: "Türkçe" },
    { code: "zh", label: "中文" },
    { code: "ja", label: "日本語" },
    { code: "ko", label: "한국어" },
    { code: "hu", label: "Magyar" },
    { code: "ro", label: "Română" },
    { code: "sk", label: "Slovenčina" },
    { code: "th", label: "ไทย" },
    { code: "id", label: "Indonesia" },
    { code: "vn", label: "Tiếng Việt" }
  ];
  const STORE_KEY = "tarkovLocalizerLangs";

  let tab = "items";
  let items = [];
  let quests = [];
  let selected = loadSelected();

  function loadSelected() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (Array.isArray(raw) && raw.length) return raw.filter(function (c) {
        return LANGS.some(function (l) { return l.code === c; });
      });
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
      .replace(/&/g, "&").replace(/</g, "<")
      .replace(/>/g, ">").replace(/"/g, """);
  }
  function humanize(slug) {
    return String(slug || "").replace(/-/g, " ");
  }
  function highlight(text, q) {
    const t = String(text || "");
    if (!q) return esc(t);
    const n = norm(t);
    const i = n.indexOf(q);
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) + '<span class="mark">' + esc(t.slice(i, i + q.length)) + "</span>" + esc(t.slice(i + q.length));
  }

  function paintLangGrid() {
    const grid = document.getElementById("langGrid");
    grid.innerHTML = LANGS.map(function (l) {
      const on = selected.indexOf(l.code) >= 0;
      return '<label class="lang-chip' + (on ? " on" : "") + '">' +
        '<input type="checkbox" data-code="' + l.code + '"' + (on ? " checked" : "") + ">" +
        '<span>' + esc(l.label) + '</span>' +
        '<span class="meta">' + l.code + "</span></label>";
    }).join("");
    grid.querySelectorAll("input").forEach(function (inp) {
      inp.onchange = function () {
        const code = inp.getAttribute("data-code");
        if (inp.checked) {
          if (selected.indexOf(code) < 0) selected.push(code);
        } else {
          selected = selected.filter(function (c) { return c !== code; });
        }
        if (!selected.length) selected = ["en"];
        saveSelected();
        paintLangGrid();
      };
    });
  }

  async function fetchLocale(mode, lang) {
    const url = API + "/" + mode + "/items_" + lang;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(lang + " HTTP " + res.status);
    const json = await res.json();
    return json.data || json || {};
  }

  async function fetchTasksLocale(mode, lang) {
    const url = API + "/" + mode + "/tasks_" + lang;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        return json.data || json || {};
      }
    } catch (e) {}
    return fetchLocale(mode, lang);
  }

  function resolveName(pack, id, kind) {
    if (!pack) return "";
    if (kind === "short") {
      return pack[id + " ShortName"] || pack[id + " shortName"] || "";
    }
    return pack[id + " Name"] || pack[id + " name"] || "";
  }

  document.getElementById("loadBtn").onclick = async function () {
    const st = document.getElementById("status");
    const mode = document.getElementById("gameMode").value || "pve";
    if (!selected.length) selected = ["en"];
    st.className = "status";
    st.textContent = "Загрузка base + " + selected.join(", ") + "…";
    try {
      const packs = {};
      const taskPacks = {};
      await Promise.all(selected.map(async function (lang) {
        packs[lang] = await fetchLocale(mode, lang);
        taskPacks[lang] = await fetchTasksLocale(mode, lang);
      }));
      const itemsJson = await fetch(API + "/" + mode + "/items", { cache: "no-store" }).then(function (r) { return r.json(); });
      const tasksJson = await fetch(API + "/" + mode + "/tasks", { cache: "no-store" }).then(function (r) { return r.json(); });
      const rawItems = (itemsJson.data && itemsJson.data.items) || itemsJson.data || itemsJson;
      const rawTasks = (tasksJson.data && (tasksJson.data.tasks || tasksJson.data.quests)) || tasksJson.data || tasksJson;

      const itemList = Array.isArray(rawItems) ? rawItems : Object.values(rawItems || {});
      items = itemList.map(function (it) {
        const id = it.id || it._id;
        const slug = it.normalizedName || "";
        const names = {};
        const shorts = {};
        const searchBits = [slug, id];
        selected.forEach(function (lang) {
          const n = resolveName(packs[lang], id, "name") || (lang === "en" ? humanize(slug) : "");
          const s = resolveName(packs[lang], id, "short");
          names[lang] = n;
          shorts[lang] = s;
          searchBits.push(n, s);
        });
        return {
          id: id,
          slug: slug,
          icon: it.iconLink || it.gridImageLink || it.image512pxLink || "",
          names: names,
          shorts: shorts,
          search: norm(searchBits.join(" "))
        };
      });

      const taskList = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks || {});
      quests = taskList.map(function (t) {
        const id = t.id || t._id;
        const slug = t.normalizedName || "";
        const names = {};
        const searchBits = [slug, id];
        selected.forEach(function (lang) {
          const n = resolveName(taskPacks[lang], id, "name") || (lang === "en" ? humanize(slug) : "");
          names[lang] = n;
          searchBits.push(n);
        });
        return {
          id: id,
          slug: slug,
          icon: "",
          names: names,
          shorts: {},
          search: norm(searchBits.join(" "))
        };
      });

      st.className = "status ok";
      st.textContent = "Готово: " + items.length + " предметов, " + quests.length + " квестов · " + selected.join(", ");
      document.getElementById("searchCard").hidden = false;
      document.getElementById("tableCard").hidden = false;
      render();
    } catch (e) {
      st.className = "status err";
      st.textContent = (e && e.message) || String(e);
    }
  };

  function renderHead() {
    const th = document.getElementById("thead");
    let html = "<tr><th style=\"width:48px\"></th>";
    selected.forEach(function (lang) {
      const meta = LANGS.find(function (l) { return l.code === lang; });
      html += "<th>" + esc((meta && meta.label) || lang) + " <span class=\"meta\">" + lang + "</span></th>";
    });
    html += "<th>slug / id</th><th></th></tr>";
    th.innerHTML = html;
  }

  function render() {
    renderHead();
    const q = norm(document.getElementById("q").value);
    const catalog = tab === "quests" ? quests : items;
    let list = catalog;
    if (q) list = catalog.filter(function (it) { return it.search.indexOf(q) >= 0; });
    else list = [];
    document.getElementById("count").textContent = q
      ? ("Найдено: " + list.length + (list.length > 200 ? " (показано 200)" : ""))
      : "Введи запрос — поиск идёт по всем выбранным языкам";
    const shown = list.slice(0, 200);
    const tbody = document.getElementById("tbody");
    tbody.innerHTML = shown.map(function (it) {
      let cells = "<td>" + (it.icon ? '<img class="ico" src="' + esc(it.icon) + '" loading="lazy" alt="">' : "") + "</td>";
      selected.forEach(function (lang) {
        const n = it.names[lang] || "—";
        const s = it.shorts[lang] || "";
        cells += "<td><div class=\"nm\">" + highlight(n, q) + "</div>" +
          (s ? '<div class="sh">' + highlight(s, q) + "</div>" : "") + "</td>";
      });
      cells += '<td class="meta">' + esc(it.slug || it.id) + "</td><td>";
      selected.forEach(function (lang) {
        const v = it.names[lang] || "";
        if (v) cells += '<button type="button" class="copy-btn" data-v="' + esc(v) + '">' + lang + "</button>";
      });
      cells += "</td>";
      return "<tr>" + cells + "</tr>";
    }).join("");
    tbody.querySelectorAll(".copy-btn").forEach(function (b) {
      b.onclick = function () {
        try { navigator.clipboard.writeText(b.getAttribute("data-v") || ""); } catch (e) {}
      };
    });
  }

  document.querySelectorAll(".tab").forEach(function (el) {
    el.onclick = function () {
      tab = el.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("active", x === el); });
      render();
    };
  });
  document.getElementById("q").oninput = render;
  document.getElementById("selAll").onclick = function () {
    selected = LANGS.map(function (l) { return l.code; });
    saveSelected(); paintLangGrid();
  };
  document.getElementById("selNone").onclick = function () {
    selected = ["en"];
    saveSelected(); paintLangGrid();
  };
  document.getElementById("selDefault").onclick = function () {
    selected = ["en", "ru"];
    saveSelected(); paintLangGrid();
  };

  (function () {
    const KEY = "tarkovPreferredGameMode";
    const def = localStorage.getItem(KEY) || "pve";
    const sel = document.getElementById("gameMode");
    if ([].some.call(sel.options, function (o) { return o.value === def; })) sel.value = def;
    sel.addEventListener("change", function () {
      try { localStorage.setItem(KEY, sel.value); } catch (e) {}
    });
  })();

  paintLangGrid();
})();
