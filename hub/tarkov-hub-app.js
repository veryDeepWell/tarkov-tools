/** Hub app multi-part loader */
(function () {
  var n = 3, text = "", i;
  for (i = 0; i < n; i++) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "hub/hub-app.p" + i + ".js", false);
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) {
      console.error("hub part", i, xhr.status);
      return;
    }
    text += xhr.responseText;
  }
  var s = document.createElement("script");
  s.text = text;
  (document.body || document.documentElement).appendChild(s);
})();
