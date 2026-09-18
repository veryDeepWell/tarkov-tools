/*! hub-app recovery loader (sync XHR) — restores full app from last good commit */
(function () {
  var urls = [
    "https://cdn.jsdelivr.net/gh/veryDeepWell/tarkov-tools@65cc484a35c25e6353bee2d25bf041c7896c8381/tarkov-hub-app.js",
    "https://raw.githubusercontent.com/veryDeepWell/tarkov-tools/65cc484a35c25e6353bee2d25bf041c7896c8381/tarkov-hub-app.js"
  ];
  function patch(code) {
    return code
      .split('"title":"EN\u2194RU \u043f\u043e\u0438\u0441\u043a","description":"\u041f\u043e\u0438\u0441\u043a \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u0430 \u043f\u043e \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u043e\u043c\u0443 \u0438\u043b\u0438 \u0440\u0443\u0441\u0441\u043a\u043e\u043c\u0443 \u0438\u043c\u0435\u043d\u0438"').join(
        '"title":"\u041b\u043e\u043a\u0430\u043b\u0438\u0437\u0430\u0442\u043e\u0440","description":"\u041f\u043e\u0438\u0441\u043a \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432 \u0438 \u043a\u0432\u0435\u0441\u0442\u043e\u0432 \u043f\u043e \u0438\u043c\u0435\u043d\u0430\u043c \u0432 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0445 \u044f\u0437\u044b\u043a\u0430\u0445 API"'
      )
      .split('"title":"EN\u2194RU \u043f\u043e\u0438\u0441\u043a"').join(
        '"title":"\u041b\u043e\u043a\u0430\u043b\u0438\u0437\u0430\u0442\u043e\u0440"'
      );
  }
  var code = null;
  for (var i = 0; i < urls.length && !code; i++) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", urls[i], false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) code = xhr.responseText;
    } catch (e) {}
  }
  if (!code) { console.error("hub-app recovery failed"); return; }
  var s = document.createElement("script");
  s.textContent = patch(code);
  document.head.appendChild(s);
})();
