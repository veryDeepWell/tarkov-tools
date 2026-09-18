/*! hub-app gzip boot */
(function () {
  function gunzip(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (typeof DecompressionStream !== "undefined") {
      return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")))
        .arrayBuffer().then(function (buf) {
          return new TextDecoder().decode(buf);
        });
    }
    return Promise.reject(new Error("DecompressionStream not available"));
  }
  var b64 = window.__HUB_GZ_B64;
  if (!b64) { console.error("hub data missing"); return; }
  gunzip(b64).then(function (code) {
    var s = document.createElement("script");
    s.textContent = code;
    document.head.appendChild(s);
  }).catch(function (e) { console.error("hub-app load failed", e); });
})();
