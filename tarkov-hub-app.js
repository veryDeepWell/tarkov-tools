/*! hub-app assemble */
(function () {
  var a = window.__HUB_B64;
  if (!a || a.filter(Boolean).length < 5) {
    console.error("hub-app parts missing", a && a.length);
    return;
  }
  try {
    var code = decodeURIComponent(escape(atob(a.join(""))));
    var s = document.createElement("script");
    s.textContent = code;
    document.head.appendChild(s);
  } catch (e) {
    console.error("hub-app assemble failed", e);
  }
})();
