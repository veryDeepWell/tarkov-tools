/** Hub app loader — fetches full script from same folder */
(function () {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "hub/tarkov-hub-app.full.js", false);
  try {
    xhr.send(null);
  } catch (e) {
    console.error("hub-app load", e);
    return;
  }
  if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText && xhr.responseText.indexOf("PLACEHOLDER") < 0) {
    var s = document.createElement("script");
    s.text = xhr.responseText;
    (document.body || document.documentElement).appendChild(s);
  } else {
    console.error("hub-app full missing or bad", xhr.status);
  }
})();
