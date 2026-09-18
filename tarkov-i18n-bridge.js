/*! Bridge: Prism-style language picker + TarkovI18n \u2194 TarkovTools */
(function () {
  function whenReady(fn) {
    if (window.TarkovI18n && window.TarkovTools) return fn();
    var n = 0;
    var id = setInterval(function () {
      n++;
      if ((window.TarkovI18n && window.TarkovTools) || n > 80) {
        clearInterval(id);
        if (window.TarkovI18n && window.TarkovTools) fn();
      }
    }, 50);
  }

  function paintLangUi(host) {
    if (!host || !window.TarkovI18n) return;
    TarkovI18n.ready().then(function () {
      var list = TarkovI18n.listLocales();
      var cur = TarkovI18n.lang();
      var html =
        '<p class="meta" style="margin:8px 0 10px">' +
        TarkovI18n.t("common.langHint") +
        '</p><div class="tt-lang-list">';
      list.forEach(function (loc) {
        html +=
          '<button type="button" class="tt-lang-row' +
          (loc.code === cur ? " is-active" : "") +
          '" data-lang="' +
          loc.code +
          '"><span><span class="tt-lang-name">' +
          loc.nativeName +
          "</span>" +
          (loc.nativeName !== loc.name
            ? '<span class="tt-lang-native">' + loc.name + "</span>"
            : "") +
          '</span><span class="tt-lang-pct">' +
          loc.pct +
          '%</span><span class="tt-lang-bar"><i style="width:' +
          loc.pct +
          '%"></i></span></button>';
      });
      html += "</div>";
      host.innerHTML = html;
      host.querySelectorAll(".tt-lang-row").forEach(function (btn) {
        btn.onclick = function () {
          var code = btn.getAttribute("data-lang");
          TarkovI18n.setLang(code).then(function () {
            paintLangUi(host);
            if (TarkovTools._paintBar) TarkovTools._paintBar();
            try {
              window.dispatchEvent(
                new CustomEvent("tt-lang-changed", { detail: { lang: code } })
              );
            } catch (e) {}
            if (TarkovTools.beep) TarkovTools.beep("ok");
          });
        };
      });
    });
  }

  whenReady(function () {
    var prevT = TarkovTools.t;
    TarkovTools.t = function (k, params) {
      if (!k) return "";
      var key = String(k).indexOf(".") >= 0 ? k : "common." + k;
      var v = TarkovI18n.t(key, params);
      if (v && v !== key) return v;
      return prevT ? prevT(k) : k;
    };
    TarkovTools.lang = function () {
      return TarkovI18n.lang();
    };

    var orig = TarkovTools.openSettings.bind(TarkovTools);
    TarkovTools.openSettings = function () {
      orig();
      var modal = document.getElementById("tt-settings-modal");
      if (!modal) return;
      var host = document.getElementById("tt-lang-host");
      if (!host) {
        var box = document.createElement("div");
        box.style.marginTop = "16px";
        box.innerHTML =
          '<h3 style="margin:0 0 4px;font-size:1rem">' +
          TarkovI18n.t("common.tabLang") +
          '</h3><div id="tt-lang-host"></div>';
        modal.appendChild(box);
        host = document.getElementById("tt-lang-host");
      }
      paintLangUi(host);

      var sel = document.getElementById("tt-set-lang");
      if (sel) {
        sel.innerHTML = "";
        TarkovI18n.listLocales().forEach(function (loc) {
          var o = document.createElement("option");
          o.value = loc.code;
          o.textContent = loc.nativeName + " (" + loc.pct + "%)";
          if (loc.code === TarkovI18n.lang()) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function () {
          TarkovI18n.setLang(sel.value).then(function () {
            paintLangUi(host);
            if (TarkovTools._paintBar) TarkovTools._paintBar();
          });
        };
      }
    };

    TarkovI18n.ready().then(function () {
      TarkovI18n.applyDom(document);
      if (TarkovTools._paintBar) TarkovTools._paintBar();
    });

    window.addEventListener("tt-lang-changed", function () {
      TarkovI18n.applyDom(document);
      try {
        if (typeof renderCatalog === "function") renderCatalog();
      } catch (e) {}
    });
  });
})();
