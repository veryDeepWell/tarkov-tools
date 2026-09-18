/*! common entry: same-origin full source (concat then eval) */
(function () {
  var files = ["tarkov-common.a1.js", "tarkov-common.a2a.js", "tarkov-common.a2b.js", "tarkov-common.b.js"];
  var code = "";
  for (var i = 0; i < files.length; i++) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", files[i], false);
      xhr.send(null);
      if (xhr.status < 200 || xhr.status >= 300) throw new Error(files[i] + " " + xhr.status);
      code += xhr.responseText + "\n";
    } catch (e) {
      console.error("common load failed:", files[i], e);
      return;
    }
  }
  var s = document.createElement("script");
  s.textContent = code;
  document.head.appendChild(s);
})();
