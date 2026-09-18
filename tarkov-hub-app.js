/*! hub-app entry: loads full source from same origin (no CDN) */
(function () {
  var files = ["tarkov-hub-app.a.js", "tarkov-hub-app.b.js"];
  for (var i = 0; i < files.length; i++) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", files[i], false);
      xhr.send(null);
      if (xhr.status < 200 || xhr.status >= 300) throw new Error(xhr.status);
      var s = document.createElement("script");
      s.textContent = xhr.responseText;
      document.head.appendChild(s);
    } catch (e) {
      console.error("hub-app load failed:", files[i], e);
    }
  }
})();
