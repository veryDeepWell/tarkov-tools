  function openSettings() {
    let bg = document.getElementById("tt-settings-bg");
    if (!bg) {
      bg = document.createElement("div"); bg.id = "tt-settings-bg"; bg.className = "modal-bg";
      bg.innerHTML = '<div class="modal" id="tt-settings-modal"></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) { if (e.target === bg) bg.classList.remove("show"); });
    }
    const modal = document.getElementById("tt-settings-modal");
    const accent = get(KEYS.accent, "gold");
    const swatches = Object.keys(ACCENTS).map(function (k) {
      return '<button type="button" class="tt-accent-swatch' + (k === accent ? " on" : "") + '" data-accent="' + k + '" title="' + k + '"></button>';
    }).join("");
    modal.innerHTML = '<h2>' + t("settings") + '</h2>' +
      '<p class="meta">' + t("welcomeBody") + '</p>' +
      '<div class="field"><label>' + t("theme") + '</label><select id="tt-set-theme"><option value="dark">' + t("themeDark") + '</option><option value="light">' + t("themeLight") + '</option></select></div>' +
      '<div class="field"><label>' + t("lang") + '</label><select id="tt-set-lang"><option value="ru">RU</option><option value="en">EN</option></select></div>' +
      '<div class="field"><label>' + t("sound") + '</label><select id="tt-set-sound"><option value="1">' + t("soundOn") + '</option><option value="0">' + t("soundOff") + '</option></select></div>' +
      '<div class="field"><label>' + t("volume") + '</label><input type="range" id="tt-set-vol" min="0" max="1" step="0.05" value="' + soundVolume() + '"></div>' +
      '<div class="field"><label>' + t("mode") + '</label><select id="tt-set-mode"><option value="pve">pve</option><option value="regular">regular</option><option value="pvp-season">pvp-season</option></select></div>' +
      '<div class="field"><label>' + t("accent") + '</label><div class="tt-accent-row">' + swatches + '</div></div>' +
      '<div class="field"><label>' + t("tips") + '</label><select id="tt-set-tips"><option value="1">' + t("tipsOn") + '</option><option value="0">' + t("tipsOff") + '</option></select></div>' +
      '<div class="row" style="margin-top:12px"><button type="button" class="btn" id="tt-set-apply">' + t("apply") + '</button>' +
      '<button type="button" class="btn-ghost" id="tt-set-export">' + t("export") + '</button>' +
      '<label class="btn-ghost" style="cursor:pointer">' + t("import") + '<input type="file" id="tt-set-import" accept="application/json" hidden></label>' +
      '<button type="button" class="btn-ghost" id="tt-set-close">' + t("close") + '</button></div>';
    document.getElementById("tt-set-theme").value = get(KEYS.theme, "dark");
    document.getElementById("tt-set-lang").value = lang();
    document.getElementById("tt-set-sound").value = soundEnabled() ? "1" : "0";
    document.getElementById("tt-set-mode").value = preferredMode();
    document.getElementById("tt-set-tips").value = tipsEnabled() ? "1" : "0";
    modal.querySelectorAll(".tt-accent-swatch").forEach(function (btn) {
      btn.onclick = function () {
        modal.querySelectorAll(".tt-accent-swatch").forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
        set(KEYS.accent, btn.getAttribute("data-accent"));
        applyAccent();
      };
    });
    document.getElementById("tt-set-apply").onclick = function () {
