/** Tarkov Tools — shared runtime */
(function (global) {
  const KEYS = {
    theme: "tarkovTheme",
    lang: "tarkovLang",
    sound: "tarkovSound",
    volume: "tarkovSoundVolume",
    mode: "tarkovPreferredGameMode",
    accent: "tarkovAccent",
    tips: "tarkovTips",
    seen: "tarkovSettingsSeen"
  };
  const ACCENTS = {
    gold: "#c9a227", blue: "#5b9fd4", green: "#3dd68c", cyan: "#2ec4b6",
    purple: "#a78bfa", orange: "#e0a458", red: "#f07178", pink: "#e879a9", slate: "#94a3b8"
  };
  const I18N = {
    ru: { settings:"Настройки", theme:"Тема", themeDark:"Тёмная", themeLight:"Светлая", lang:"Язык", sound:"Звук", soundOn:"Вкл", soundOff:"Выкл", mode:"Режим по умолчанию", close:"Закрыть", export:"Экспорт", import:"Импорт", importOk:"Импорт выполнен", importFail:"Ошибка импорта", search:"Поиск по таблице…", welcomeTitle:"Настройки Tarkov Tools", welcomeBody:"Тема, язык, звук, режим и акцент.", apply:"Применить", hub:"Хаб", accent:"Акцент", tips:"Подсказки тулзов", tipsOn:"Вкл", tipsOff:"Выкл", volume:"Громкость", testSound:"Тест" },
    en: { settings:"Settings", theme:"Theme", themeDark:"Dark", themeLight:"Light", lang:"Language", sound:"Sound", soundOn:"On", soundOff:"Off", mode:"Default mode", close:"Close", export:"Export", import:"Import", importOk:"Import done", importFail:"Import failed", search:"Filter table…", welcomeTitle:"Tarkov Tools settings", welcomeBody:"Theme, language, sound, mode and accent.", apply:"Apply", hub:"Hub", accent:"Accent", tips:"Tool tips", tipsOn:"On", tipsOff:"Off", volume:"Volume", testSound:"Test" }
  };
  function get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lang() { return get(KEYS.lang, "ru") === "en" ? "en" : "ru"; }
  function t(key) { const L = I18N[lang()] || I18N.ru; return L[key] || key; }
  function preferredMode() { return get(KEYS.mode, "pve"); }
  function soundEnabled() { return get(KEYS.sound, "1") !== "0"; }
  function soundVolume() { return Math.min(1, Math.max(0, Number(get(KEYS.volume, "0.5")) || 0.5)); }
  function tipsEnabled() { return get(KEYS.tips, "1") !== "0"; }
  function applyAccent() {
    const a = get(KEYS.accent, "gold");
    const c = ACCENTS[a] || ACCENTS.gold;
    document.documentElement.style.setProperty("--accent", c);
  }
  function applyTheme() {
    const th = get(KEYS.theme, "dark");
    document.documentElement.setAttribute("data-theme", th === "light" ? "light" : "dark");
    applyAccent();
  }
  function beep(kind) {
    if (!soundEnabled()) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = beep._ctx || (beep._ctx = new Ctx());
      if (ctx.state === "suspended") ctx.resume();
      const vol = soundVolume();
      const map = { ok: [660, 880], warn: [440, 330], restock: [880, 880, 1175], price: [523, 659, 784] };
      const notes = map[kind] || map.ok;
      const t0 = ctx.currentTime + 0.02;
      notes.forEach(function (freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        const start = t0 + i * 0.12;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12 * vol, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(start); osc.stop(start + 0.12);
      });
    } catch (e) {}
  }
  function exportAll() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("tarkov") === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tarkov-tools-backup.json";
    a.click();
  }
  function importAll(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        Object.keys(data).forEach(function (k) { localStorage.setItem(k, data[k]); });
        alert(t("importOk"));
        location.reload();
      } catch (e) { alert(t("importFail")); }
    };
    reader.readAsText(file);
  }
