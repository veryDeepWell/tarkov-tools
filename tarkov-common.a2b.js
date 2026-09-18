      set(KEYS.theme, document.getElementById("tt-set-theme").value);
      set(KEYS.lang, document.getElementById("tt-set-lang").value);
      set(KEYS.sound, document.getElementById("tt-set-sound").value);
      set(KEYS.volume, document.getElementById("tt-set-vol").value);
      set(KEYS.mode, document.getElementById("tt-set-mode").value);
      set(KEYS.tips, document.getElementById("tt-set-tips").value);
      set(KEYS.seen, "1");
      applyTheme();
      if (global.TarkovTools && TarkovTools._paintBar) TarkovTools._paintBar();
      bg.classList.remove("show");
    };
    document.getElementById("tt-set-export").onclick = exportAll;
    document.getElementById("tt-set-import").onchange = function (e) { if (e.target.files[0]) importAll(e.target.files[0]); };
    document.getElementById("tt-set-close").onclick = function () { bg.classList.remove("show"); };
    bg.classList.add("show");
  }
  function isMiniFrame() {
    try {
      if (window.parent && window.parent !== window && window.parent.TarkovHubMini === true) return true;
    } catch (e) {}
    return false;
  }
  function injectBar() {
    if (isMiniFrame()) {
      try {
        document.documentElement.classList.add("tt-mini-frame");
        document.body.classList.add("tt-mini-frame");
      } catch (e) {}
      return;
    }
    if (document.getElementById("tt-global-bar")) return;
    const bar = document.createElement("div"); bar.id = "tt-global-bar"; bar.className = "tt-bar";
    bar.innerHTML = "<button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-settings\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-theme\"></button><button type=\"button\" class=\"btn-ghost\" id=\"tt-bar-lang\"></button><span class=\"spacer\"></span><a class=\"btn-ghost\" href=\"tarkovtool-hub.html\" id=\"tt-bar-hub\"></a>";
    document.body.insertBefore(bar, document.body.firstChild);
    function paint() {
      document.getElementById("tt-bar-settings").textContent = t("settings");
      document.getElementById("tt-bar-theme").textContent = get(KEYS.theme, "dark") === "light" ? t("themeLight") : t("themeDark");
      document.getElementById("tt-bar-lang").textContent = lang().toUpperCase();
      document.getElementById("tt-bar-hub").textContent = t("hub");
    }
    paint();
    global.TarkovTools._paintBar = paint;
    document.getElementById("tt-bar-settings").onclick = openSettings;
    document.getElementById("tt-bar-theme").onclick = function () {
      set(KEYS.theme, get(KEYS.theme, "dark") === "light" ? "dark" : "light");
      applyTheme(); paint();
    };
    document.getElementById("tt-bar-lang").onclick = function () {
      set(KEYS.lang, lang() === "ru" ? "en" : "ru"); paint();
    };
  }
  function wireGameModeSelects() {
    const def = preferredMode();
    document.querySelectorAll("select#gameMode, select[id*=gameMode], select[id*=GameMode]").forEach(function (sel) {
      if ([].some.call(sel.options, function (o) { return o.value === def; })) sel.value = def;
      sel.addEventListener("change", function () { set(KEYS.mode, sel.value); });
    });
  }
