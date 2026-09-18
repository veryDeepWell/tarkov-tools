/*! hub-app entry: same-origin full source (concat then eval) */
(function () {
  var files = ["tarkov-hub-app.a0.js", "tarkov-hub-app.a1.js", "tarkov-hub-app.a2.js", "tarkov-hub-app.a3.js", "tarkov-hub-app.b.js"];
  var code = "";
  for (var i = 0; i < files.length; i++) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", files[i], false);
      xhr.send(null);
      if (xhr.status < 200 || xhr.status >= 300) throw new Error(files[i] + " " + xhr.status);
      code += xhr.responseText + "\n";
    } catch (e) {
      console.error("hub-app load failed:", files[i], e);
      return;
    }
  }
  var s = document.createElement("script");
  s.textContent = code;
  document.head.appendChild(s);
})();
