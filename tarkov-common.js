/*! Tarkov Tools common */
(function (global) {
  const KEYS = { theme:"tarkovTheme", lang:"tarkovLang", sound:"tarkovSound", mode:"tarkovPreferredGameMode", seen:"tarkovSettingsSeen", exportPrefix:"tarkov" };
  const I18N = {
    ru: { settings:"Настройки", theme:"Тема", themeDark:"Тёмная", themeLight:"Светлая", lang:"Язык", sound:"Звук", soundOn:"Вкл", soundOff:"Выкл", mode:"Режим по умолчанию", close:"Закрыть", export:"Экспорт", import:"Импорт", importOk:"Импорт выполнен", importFail:"Ошибка импорта", search:"Поиск по таблице…", welcomeTitle:"Настройки Tarkov Tools", welcomeBody:"Тема, язык, звук и режим. Экспорт переносит данные на другой ПК.", apply:"Применить", hub:"Хаб" },
    en: { settings:"Settings", theme:"Theme", themeDark:"Dark", themeLight:"Light", lang:"Language", sound:"Sound", soundOn:"On", soundOff:"Off", mode:"Default mode", close:"Close", export:"Export", import:"Import", importOk:"Import done", importFail:"Import failed", search:"Filter table…", welcomeTitle:"Tarkov Tools settings", welcomeBody:"Theme, language, sound and default mode. Export to move devices.", apply:"Apply", hub:"Hub" }
  };
  const BTN_NORM = [
    [/^\s*загрузить(\s+данные)?\s*$/i, "Загрузить"],
    [/^\s*получить\s*$/i, "Загрузить"],
    [/^\s*пересчитать\s*$/i, "Пересчитать"],
    [/^\s*сохранить\s*$/i, "Сохранить"],
    [/^\s*сбросить(\s+моды)?\s*$/i, "Сбросить"],
    [/^\s*очистить(\s+список)?\s*$/i, "Очистить"],
    [/^\s*копировать(\s+список)?\s*$/i, "Копировать"],
    [/^\s*в рейд\s*$/i, "В рейд"],
    [/^\s*отменить таймер\s*$/i, "Отменить"],
    [/^\s*цены с барахолки\s*$/i, "Цены с барахолки"]
  ];
  function get(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch (e) { return f; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lang() { return get(KEYS.lang, "ru") === "en" ? "en" : "ru"; }
  function t(k) { return (I18N[lang()] || I18N.ru)[k] || k; }
  function applyTheme() { document.documentElement.setAttribute("data-theme", get(KEYS.theme, "dark") === "light" ? "light" : "dark"); }
  function preferredMode() { return get(KEYS.mode, "pve"); }
  function soundEnabled() { return get(KEYS.sound, "0") === "1"; }
  function beep(kind) {
    if (!soundEnabled()) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = kind === "ok" ? 660 : kind === "err" ? 220 : 440;
      g.gain.value = 0.04; o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.stop(ctx.currentTime + 0.16); setTimeout(() => ctx.close(), 300);
    } catch (e) {}
  }
  function exportAll() {
    const data = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(KEYS.exportPrefix)) data[k] = localStorage.getItem(k); } } catch (e) {}
    const blob = new Blob([JSON.stringify({ v: 1, ts: Date.now(), data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tarkov-tools-backup.json"; a.click();
    URL.revokeObjectURL(a.href); beep("ok");
  }
  function importAll(obj) {
    try {
      const payload = typeof obj === "string" ? JSON.parse(obj) : obj;
      const data = payload.data || payload;
      Object.keys(data).forEach(k => { if (k.startsWith(KEYS.exportPrefix)) localStorage.setItem(k, data[k]); });
      applyTheme(); beep("ok"); return true;
    } catch (e) { beep("err"); return false; }
  }
  function wireGameModeSelects() {
    const mode = preferredMode();
    document.querySelectorAll("select#gameMode, select[data-tt-mode]").forEach(sel => {
      if ([...sel.options].some(o => o.value === mode)) sel.value = mode;
      sel.addEventListener("change", () => set(KEYS.mode, sel.value));
    });
  }
  function normalizeButtons() {
    document.querySelectorAll("button, input[type=button], input[type=submit]").forEach(btn => {
      if (btn.classList.contains("del") || btn.classList.contains("copy-btn") || btn.classList.contains("map-chip") || btn.classList.contains("chip") || btn.classList.contains("tab") || (btn.id && btn.id.startsWith("tt-bar"))) return;
      const raw = (btn.textContent || btn.value || "").trim();
      for (const [re, label] of BTN_NORM) {
        if (re.test(raw)) { if (btn.tagName === "INPUT") btn.value = label; else btn.textContent = label; break; }
      }
      const cls = btn.className || "";
      if (!/\bbtn\b/.test(cls) && !/\bbtn-ghost\b/.test(cls) && !/\bbtn-raid\b/.test(cls)) {
        if (/ghost|secondary|outline/i.test(cls) || btn.id === "modalClose") btn.classList.add("btn-ghost");
        else btn.classList.add("btn");
      }
    });
  }
  function enhanceTable(table, filterInput) {
    if (!table || table.dataset.ttEnhanced) return;
    table.dataset.ttEnhanced = "1";
    const tbody = table.tBodies[0]; if (!tbody) return;
    let sortCol = -1, sortDir = 1;
    table.querySelectorAll("th").forEach((th, idx) => {
      th.addEventListener("click", () => {
        if (sortCol === idx) sortDir *= -1; else { sortCol = idx; sortDir = 1; }
        table.querySelectorAll("th").forEach(h => h.classList.remove("sorted-asc", "sorted-desc"));
        th.classList.add(sortDir > 0 ? "sorted-asc" : "sorted-desc");
        const rows = [...tbody.rows];
        rows.sort((a, b) => {
          const ta = (a.cells[idx] && a.cells[idx].textContent || "").trim();
          const tb = (b.cells[idx] && b.cells[idx].textContent || "").trim();
          const na = parseFloat(ta.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
          const nb = parseFloat(tb.replace(/\s/g, "").replace(/[^\d.-]/g, ""));
          if (!Number.isNaN(na) && !Number.isNaN(nb) && /\d/.test(ta) && /\d/.test(tb)) return (na - nb) * sortDir;
          return ta.localeCompare(tb, undefined, { sensitivity: "base", numeric: true }) * sortDir;
        });
        rows.forEach(r => tbody.appendChild(r));
      });
    });
    if (filterInput) {
      filterInput.addEventListener("input", () => {
        const q = filterInput.value.toLowerCase().trim();
        [...tbody.rows].forEach(r => { r.style.display = !q || r.textContent.toLowerCase().includes(q) ? "" : "none"; });
      });
    }
  }
  function enhanceAllTables() {
    document.querySelectorAll("table").forEach(table => {
      if (!table.tHead || table.dataset.ttEnhanced) return;
      const wrap = table.closest(".table-wrap") || table.parentElement;
      let tools = wrap && wrap.previousElementSibling;
      if (!tools || !tools.classList || !tools.classList.contains("tt-table-tools")) {
        tools = document.createElement("div");
        tools.className = "tt-table-tools";
        const inp = document.createElement("input");
        inp.type = "search"; inp.placeholder = t("search");
        tools.appendChild(inp);
        if (wrap && wrap.parentElement) {
          if (wrap.classList && wrap.classList.contains("table-wrap")) wrap.parentElement.insertBefore(tools, wrap);
          else wrap.insertBefore(tools, table);
        }
        enhanceTable(table, inp);
      } else enhanceTable(table, tools.querySelector("input"));
    });
  }
  function observeTables() {
    const obs = new MutationObserver(() => {
      document.querySelectorAll("table").forEach(table => {
        if (table.tHead && !table.dataset.ttEnhanced) enhanceAllTables();
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  function openSettings() {
    let bg = document.getElementById("tt-settings-modal");
    if (!bg) {
      bg = document.createElement("div"); bg.id = "tt-settings-modal"; bg.className = "modal-bg";
      bg.innerHTML = "<div class=\"modal\"><h2 id=\"tt-set-title\"></h2><p class=\"meta\" id=\"tt-set-body\"></p><div class=\"field\" style=\"margin-top:12px\"><label id=\"tt-lab-theme\"></label><select id=\"tt-theme\"><option value=\"dark\"></option><option value=\"light\"></option></select></div><div class=\"field\" style=\"margin-top:8px\"><label id=\"tt-lab-lang\"></label><select id=\"tt-lang\"><option value=\"ru\">Русский</option><option value=\"en\">English</option></select></div><div class=\"field\" style=\"margin-top:8px\"><label id=\"tt-lab-sound\"></label><select id=\"tt-sound\"><option value=\"0\"></option><option value=\"1\"></option></select></div><div class=\"field\" style=\"margin-top:8px\"><label id=\"tt-lab-mode\"></label><select id=\"tt-mode\"><option value=\"pve\">pve</option><option value=\"regular\">regular</option><option value=\"pvp-season\">pvp-season</option></select></div><div class=\"row\" style=\"margin-top:16px\"><button type=\"button\" class=\"btn\" id=\"tt-apply\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-export\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-import\"></button><input type=\"file\" id=\"tt-import-file\" accept=\"application/json,.json\" hidden></div><div class=\"row\"><button type=\"button\" class=\"btn-ghost\" id=\"tt-close\"></button></div></div>";
      document.body.appendChild(bg);
      bg.addEventListener("click", e => { if (e.target === bg) bg.classList.remove("show"); });
      document.getElementById("tt-close").onclick = () => bg.classList.remove("show");
      document.getElementById("tt-apply").onclick = () => {
        set(KEYS.theme, document.getElementById("tt-theme").value);
        set(KEYS.lang, document.getElementById("tt-lang").value);
        set(KEYS.sound, document.getElementById("tt-sound").value);
        set(KEYS.mode, document.getElementById("tt-mode").value);
        set(KEYS.seen, "1"); applyTheme(); wireGameModeSelects(); beep("ok"); bg.classList.remove("show");
        if (global.TarkovTools._paintBar) global.TarkovTools._paintBar();
        translatePage();
      };
      document.getElementById("tt-export").onclick = exportAll;
      document.getElementById("tt-import").onclick = () => document.getElementById("tt-import-file").click();
      document.getElementById("tt-import-file").onchange = async (e) => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const ok = importAll(await f.text()); alert(ok ? t("importOk") : t("importFail")); if (ok) location.reload();
      };
    }
    document.getElementById("tt-set-title").textContent = t("welcomeTitle");
    document.getElementById("tt-set-body").textContent = t("welcomeBody");
    document.getElementById("tt-lab-theme").textContent = t("theme");
    document.getElementById("tt-lab-lang").textContent = t("lang");
    document.getElementById("tt-lab-sound").textContent = t("sound");
    document.getElementById("tt-lab-mode").textContent = t("mode");
    const th = document.getElementById("tt-theme"); th.options[0].text = t("themeDark"); th.options[1].text = t("themeLight"); th.value = get(KEYS.theme, "dark");
    document.getElementById("tt-lang").value = lang();
    const so = document.getElementById("tt-sound"); so.options[0].text = t("soundOff"); so.options[1].text = t("soundOn"); so.value = get(KEYS.sound, "0");
    document.getElementById("tt-mode").value = preferredMode();
    document.getElementById("tt-apply").textContent = t("apply");
    document.getElementById("tt-export").textContent = t("export");
    document.getElementById("tt-import").textContent = t("import");
    document.getElementById("tt-close").textContent = t("close");
    bg.classList.add("show");
  }
  function injectBar() {
    if (document.getElementById("tt-global-bar")) return;
    const bar = document.createElement("div"); bar.id = "tt-global-bar"; bar.className = "tt-bar";
    bar.innerHTML = "<button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-settings\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-theme\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-lang\"></button><span class=\"spacer\"></span><a class=\"btn-ghost\" href=\"tarkovtool-hub.html\" id=\"tt-bar-hub\"></a>";
    document.body.insertBefore(bar, document.body.firstChild);
    function paint() {
      document.getElementById("tt-bar-settings").textContent = t("settings");
      document.getElementById("tt-bar-theme").textContent = get(KEYS.theme, "dark") === "light" ? t("themeLight") : t("themeDark");
      document.getElementById("tt-bar-lang").textContent = lang() === "en" ? "EN" : "RU";
      document.getElementById("tt-bar-hub").textContent = t("hub");
    }
    paint(); global.TarkovTools._paintBar = paint;
    document.getElementById("tt-bar-settings").onclick = openSettings;
    document.getElementById("tt-bar-theme").onclick = () => { set(KEYS.theme, get(KEYS.theme, "dark") === "light" ? "dark" : "light"); applyTheme(); paint(); beep("ok"); };
    document.getElementById("tt-bar-lang").onclick = () => { set(KEYS.lang, lang() === "ru" ? "en" : "ru"); paint(); beep("ok"); translatePage(); };
  }

  const RU_EN = {
  "Настройки": "Settings",
  "Тёмная": "Dark",
  "Светлая": "Light",
  "Язык": "Language",
  "Звук": "Sound",
  "Вкл": "On",
  "Выкл": "Off",
  "Режим по умолчанию": "Default mode",
  "Закрыть": "Close",
  "Экспорт": "Export",
  "Импорт": "Import",
  "Применить": "Apply",
  "Хаб": "Hub",
  "Поиск по таблице…": "Filter table…",
  "Поиск…": "Search…",
  "Поиск": "Search",
  "Что изменилось": "Changelog",
  "Загрузить": "Load",
  "ЗАГРУЗИТЬ": "LOAD",
  "ЗАГРУЗИТЬ ДАННЫЕ": "LOAD DATA",
  "Пересчитать": "Recalculate",
  "Сохранить": "Save",
  "Сбросить": "Reset",
  "Очистить": "Clear",
  "Очистить список": "Clear list",
  "Копировать": "Copy",
  "копир.": "copy",
  "В рейд": "Into raid",
  "В РЕЙД": "INTO RAID",
  "Отменить": "Cancel",
  "ОТМЕНИТЬ ТАЙМЕР": "CANCEL TIMER",
  "Цены с барахолки": "Flea prices",
  "Снять галочки": "Uncheck all",
  "Отметить все": "Check all",
  "Снять все галочки": "Uncheck all",
  "+ карта": "+ map",
  "Удалить карту": "Delete map",
  "Копировать в…": "Copy to…",
  "+ Добавить предмет": "+ Add item",
  "Сбросить моды": "Clear mods",
  "Копировать список": "Copy list",
  "Режим": "Mode",
  "Режим API": "API mode",
  "Данные": "Data",
  "Торговец": "Trader",
  "Название": "Name",
  "Квест": "Quest",
  "квест": "quest",
  "Предмет": "Item",
  "Предметы": "Items",
  "Список": "List",
  "Тип": "Type",
  "Пусто": "Empty",
  "Слот": "Slot",
  "Слоты": "Slots",
  "Вес": "Weight",
  "Эрга": "Ergo",
  "Отдача": "Recoil",
  "Оружие": "Weapon",
  "Сортировка": "Sort",
  "Станции": "Stations",
  "Калибр": "Caliber",
  "Калибры": "Calibers",
  "Таблица": "Table",
  "Патрон": "Ammo",
  "Урон": "Damage",
  "Крафт": "Craft",
  "Рейтинг": "Rating",
  "Магазины": "Magazines",
  "Русский": "Russian",
  "Цена продажи, ₽": "Sell price, ₽",
  "Предметы для бартера": "Barter ingredients",
  "Расчёт": "Calculation",
  "Стоимость компонентов": "Components cost",
  "После комиссии": "After fee",
  "Прибыль": "Profit",
  "Кол-во": "Qty",
  "Да": "Yes",
  "Нет": "No",
  "да": "yes",
  "нет": "no",
  "Все": "All",
  "Карта": "Map",
  "Карта / сборка": "Map / loadout",
  "Добавить": "Add",
  "Добавить в текущую сборку": "Add to current loadout",
  "Перед рейдом": "Pre-raid",
  "Список · тяни за ⋮⋮": "List · drag ⋮⋮",
  "Параметры": "Parameters",
  "Текущая конфигурация": "Current setup",
  "Графики по числу GPU": "Charts by GPU count",
  "Таблица 1…50 GPU": "Table 1…50 GPUs",
  "Видеокарты (1–50)": "GPUs (1–50)",
  "Уровень фермы (слоты)": "Farm level (slots)",
  "Цена BTC (₽, Терапевт/барахолка)": "BTC price (₽)",
  "Цена 1 GPU (₽)": "GPU price (₽)",
  "Цена канистры (металл, ₽)": "Metal fuel can (₽)",
  "Солнечная батарея (−50% расход топлива)": "Solar power (−50% fuel)",
  "Топливо у Егеря (фиксированная цена канистры выше)": "Jaeger fuel (price above)",
  "Нетто ₽ / сутки": "Net ₽ / day",
  "Окупаемость GPU (дни)": "GPU payback (days)",
  "Время на 1 BTC": "Time per BTC",
  "BTC / сутки": "BTC / day",
  "Валовая ₽/сут": "Gross ₽/day",
  "Нетто ₽/сут": "Net ₽/day",
  "Топливо ₽/сут": "Fuel ₽/day",
  "1 канистра хватает": "1 can lasts",
  "ROI GPU (дни)": "GPU ROI (days)",
  "Сумма GPU": "GPU total cost",
  "не влияет на BTC": "does not affect BTC",
  "Шаг": "Step",
  "после:": "after:",
  "оружие": "weapon",
  "пусто": "empty",
  "Скрыть за квестом": "Hide quest-locked",
  "Скрыть квест": "Hide quest",
  "Отметь предметы слева": "Select items on the left",
  "Жми ЗАГРУЗИТЬ": "Press LOAD",
  "Загрузи данные, потом выбери калибр": "Load data, then pick a caliber",
  "Патроны — класс пробития": "Ammo — penetration class",
  "Чек-лист перед рейдом": "Pre-raid checklist",
  "Сборка под карту · drag-and-drop · «В РЕЙД» сбросит галочки через 20 мин": "Per-map loadout · drag-and-drop · INTO RAID clears checks in 20 min",
  "Сборка под карту": "Per-map loadout",
  "Новая карта / пресет…": "New map / preset…",
  "паракорд / Ф-1 / мельдонин…": "paracord / F-1 / meldonin…",
  "Ф-1 / мельдонин / ключница…": "F-1 / meldonin / keytool…",
  "Таймер не запущен": "Timer not running",
  "До сброса галочек": "Until checks reset",
  "20 минут — галочки сняты на всех картах": "20 min — checks cleared on all maps",
  "Галочки общие на таймер (сброс через 20 мин). Списки предметов — раздельно по картам.": "Checks reset after 20 min. Item lists are per map.",
  "Биткоин-ферма": "Bitcoin farm",
  "Квесты · карты": "Quests · maps",
  "Квесты · нормальные карты": "Quests · real maps",
  "Не «любая локация», а список карт по каждой цели · шаги по порядку · что открывается после прошлого квеста": "Not “any location” — maps per objective · ordered steps · previous quest locks",
  "Поиск (EN / RU / slug)": "Search (EN / RU / slug)",
  "Показано:": "Shown:",
  "Квестов:": "Quests:",
  "Предметов:": "Items:",
  "квестов:": "quests:",
  "English": "English",
  "Квесты": "Quests",
  "EN ↔ RU поиск": "EN ↔ RU search",
  "Предметы и квесты · обе строки сразу": "Items and quests · both fields at once",
  "Введи EN или RU": "Type EN or RU",
  "Найдено:": "Found:",
  "Скиллы · чизы · софт-кап": "Skills · cheese · soft-cap",
  "Патч 1.0+ · трекер + как качать эффективно, не в молоко": "Patch 1.0+ · tracker + efficient leveling",
  "Усталость навыка (софт-кап в рейде)": "Skill fatigue (soft-cap per raid)",
  "Трекер (localStorage)": "Tracker (localStorage)",
  "Сбросить уровни": "Reset levels",
  "Чиз:": "Cheese:",
  "Софт-кап:": "Soft-cap:",
  "Качатель Hideout Management": "Hideout Management grinder",
  "Станция": "Station",
  "Макс. уровень станции": "Max station level",
  "Нетто/цикл": "Net/cycle",
  "Нетто/час": "Net/hour",
  "Продукт": "Product",
  "Вход (₽)": "Input (₽)",
  "Выход (₽)": "Output (₽)",
  "Время": "Time",
  "Ингредиенты": "Ingredients",
  "убыток": "loss",
  "профит": "profit",
  "Gun Builder": "Gun Builder",
  "Схема слотов · клик = выбрать мод · повторный клик по заполненному = снять": "Slot layout · click to pick mod · click again to remove",
  "Выбери ствол → кликай слоты → статы и цена без игры. Схема: глушитель–ствол–оружие–приклад": "Pick a gun → click slots → stats and price. Layout: muzzle–barrel–gun–stock",
  "Что делать с предметом?": "What to do with an item?",
  "Лампочка, болты, GPU… — куда сдать / скрафтить / вложить": "Bulb, bolts, GPU… — sell / craft / hideout",
  "Продажа": "Selling",
  "Купить у торговца": "Buy from trader",
  "Крафт (как ингредиент)": "Craft (as input)",
  "Крафт (на выходе)": "Craft (as output)",
  "Убежище": "Hideout",
  "Профит лута · ₽ / слот": "Loot profit · ₽ / slot",
  "Быстро: flea и скупщик за клетку + нужен ли для квеста": "Flea and trader per cell + quest flag",
  "Можно вводить несколько через запятую — таблица сравнения.": "Comma-separated for comparison table.",
  "Flea": "Flea",
  "₽/слот flea": "₽/slot flea",
  "₽/слот trader": "₽/slot trader",
  "optional": "optional",
  "карта не указана в данных": "map not in data",
  "any / не в API": "any / not in API",
  "Нет objectives": "No objectives",
  "Нужен квест:": "Requires quest:",
  "wiki": "wiki",
  "Сейчас:": "Current:",
  "позиций": "items",
  "Пусто для этой карты — добавь паракорд, ключи, гранаты…": "Empty for this map — add paracord, keys, nades…",
  "Список пуст — добавь гранаты, стимы, ключи…": "List empty — add nades, stims, keys…",
  "Enter тоже добавляет. Список сохраняется в браузере.": "Enter also adds. List is saved in the browser.",
  "Количество": "Quantity",
  "удалить": "delete",
  "перетащить": "drag",
  "взял": "taken",
  "готов": "ready",
  "сброс": "reset",
  "Оружий": "Weapons",
  "модов": "mods",
  "Эргономика": "Ergonomics",
  "Отдача верт.": "Vert. recoil",
  "Отдача гориз.": "Horiz. recoil",
  "Вес кг": "Weight kg",
  "≈ цена ₽": "≈ price ₽",
  "Снять мод": "Remove mod",
  "Нет совместимых модов в данных API": "No compatible mods in API data",
  "фильтр…": "filter…",
  "adar, m4a1, ak-74n…": "adar, m4a1, ak-74n…",
  "Крафтов:": "Crafts:",
  "станций:": "stations:",
  "Tools не считаются в себестоимости (multitool и т.п.)": "Tools are excluded from cost (multitool etc.)",
  "Нетто ₽ / цикл (дешевле)": "Net ₽ / cycle (cheaper)",
  "Нетто ₽ / час": "Net ₽ / hour",
  "Себестоимость входа": "Input cost",
  "Длительность": "Duration",
  "Профит (больше)": "Profit (higher)",
  "Сохранено": "Saved",
  "Сбросить все уровни в трекере?": "Reset all skill levels?",
  "Удалить весь список?": "Delete entire list?",
  "Удалить сборку": "Delete loadout",
  "Очистить список карты": "Clear map list",
  "Уже есть": "Already exists",
  "Нужна хотя бы одна карта": "Need at least one map",
  "в карту (имя):": "to map (name):",
  "Цены обновлены": "Prices updated",
  "Тяну prices…": "Fetching prices…",
  "Гружу…": "Loading…",
  "Гружу items…": "Loading items…",
  "Гружу crafts + items + hideout…": "Loading crafts + items + hideout…",
  "Нужны items + crafts + hideout + tasks": "Needs items + crafts + hideout + tasks",
  "OK": "OK",
  "HTTP": "HTTP"
};
  const EN_RU = {};
  Object.keys(RU_EN).forEach(k => { EN_RU[RU_EN[k]] = k; });
  const META_EN = {
  "Патроны": [
    "Ammo",
    "Penetration class by caliber."
  ],
  "Броня": [
    "Armor",
    "Armor rating and plates."
  ],
  "Бартер (ручной)": [
    "Barter (manual)",
    "Manual barter profit calculator."
  ],
  "Бартер (live)": [
    "Barter (live)",
    "Barter with live flea prices."
  ],
  "Боссы и гуны": [
    "Bosses & goons",
    "Boss rotations and goon reports."
  ],
  "Сравнение": [
    "Compare",
    "Compare multiple items."
  ],
  "Разгрузки и рюкзаки": [
    "Rigs & backpacks",
    "Container rating."
  ],
  "Крафты убежища": [
    "Hideout crafts",
    "Craft ROI."
  ],
  "Дрип по цветам": [
    "Drip by color",
    "Clothing color search."
  ],
  "Сборка за N ₽": [
    "Budget build",
    "Gun under budget."
  ],
  "Gun Builder": [
    "Gun Builder",
    "Manual modding with slot layout."
  ],
  "Качатель Hideout Management": [
    "Hideout Management",
    "Cheapest crafts per station for skill XP."
  ],
  "Трекер убежища": [
    "Hideout tracker",
    "Station levels and shopping list."
  ],
  "Что с предметом": [
    "Item usage",
    "Sell, craft, hideout, quests."
  ],
  "Ключи": [
    "Keys",
    "Keys by map and rating."
  ],
  "EN ↔ RU поиск": [
    "EN ↔ RU search",
    "Items and quests dual search."
  ],
  "Лут ₽/слот": [
    "Loot ₽/slot",
    "Value per inventory cell."
  ],
  "Магазины": [
    "Magazines",
    "Mag capacity and stats."
  ],
  "Аптечки": [
    "Medkits",
    "Heal efficiency."
  ],
  "Моды": [
    "Mods",
    "Mod ratings."
  ],
  "Плиты": [
    "Plates",
    "Armor plates."
  ],
  "Квест-предметы": [
    "Quest items",
    "Items needed for quests."
  ],
  "Квесты · карты": [
    "Quests · maps",
    "Objectives and real maps."
  ],
  "Чек-лист рейда": [
    "Raid checklist",
    "Per-map loadout and 20-min timer."
  ],
  "Таймер рестока": [
    "Restock timer",
    "Trader restock countdown."
  ],
  "Прицелы": [
    "Scopes",
    "Scope ratings."
  ],
  "Короткие имена": [
    "Short names",
    "Inventory short name search."
  ],
  "Скиллы + чизы": [
    "Skills + cheese",
    "Tracker, soft-cap, leveling tips."
  ],
  "Комбо стимуляторов": [
    "Stim combos",
    "Stimulant combinations."
  ],
  "Стимуляторы": [
    "Stims",
    "Stimulant ratings."
  ],
  "Стример-флип": [
    "Streamer flip",
    "Streamer items vs Therapist."
  ],
  "Трейдер-флип": [
    "Trader flip",
    "Buy trader, sell flea."
  ],
  "Биткоин-ферма": [
    "Bitcoin farm",
    "GPU mining ROI with fuel and charts."
  ],
  "Хаб": [
    "Hub",
    "All Tarkov tools in one place."
  ]
};

  function translateString(s, toEn) {
    if (!s) return s;
    const t = s.trim();
    if (toEn) return RU_EN[t] || RU_EN[s] || s;
    return EN_RU[t] || EN_RU[s] || s;
  }

  function translateNode(node, toEn) {
    if (!node) return;
    if (node.nodeType === 3) {
      const raw = node.nodeValue;
      if (!raw || !raw.trim()) return;
      // only full-trim match for safety
      const lead = raw.match(/^\s*/)[0];
      const trail = raw.match(/\s*$/)[0];
      const core = raw.slice(lead.length, raw.length - trail.length);
      const mapped = toEn ? (RU_EN[core] || null) : (EN_RU[core] || null);
      if (mapped != null) node.nodeValue = lead + mapped + trail;
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE') return;
    if (node.id === 'tt-settings-modal' || (node.closest && node.closest('#tt-settings-modal'))) {
      // settings handled separately via t()
    }
    ['placeholder', 'title', 'aria-label'].forEach(attr => {
      if (!node.hasAttribute || !node.hasAttribute(attr)) return;
      const v = node.getAttribute(attr);
      const m = toEn ? RU_EN[v] : EN_RU[v];
      if (m) node.setAttribute(attr, m);
    });
    // skip inputs with user values except buttons
    if (tag === 'INPUT' && node.type !== 'button' && node.type !== 'submit') {
      if (node.type === 'button' || node.type === 'submit') {
        const m = toEn ? RU_EN[node.value] : EN_RU[node.value];
        if (m) node.value = m;
      }
      return;
    }
    if (tag === 'TEXTAREA') return;
    Array.from(node.childNodes || []).forEach(ch => translateNode(ch, toEn));
  }

  function translatePage() {
    const toEn = lang() === 'en';
    translateNode(document.body, toEn);
    // hub catalog cards re-rendered by hub itself if present
    document.querySelectorAll('.tt-table-tools input').forEach(inp => {
      inp.placeholder = t('search');
    });
    if (global.TarkovTools._paintBar) global.TarkovTools._paintBar();
  }

  // expose for hub
  global.TarkovToolsTranslate = { RU_EN, META_EN, translatePage, translateString };

  function init() {
    applyTheme(); injectBar(); wireGameModeSelects(); normalizeButtons(); enhanceAllTables(); observeTables();
    translatePage();
    if (get(KEYS.seen, "") !== "1") setTimeout(openSettings, 250);
  }
  global.TarkovTools = { t, lang, beep, exportAll, importAll, openSettings, preferredMode, soundEnabled, enhanceTable, applyTheme, KEYS, _paintBar: null };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
