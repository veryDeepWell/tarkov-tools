/*! Legacy analyzer uses the shared full item card. */
(function () {
  var query = new URLSearchParams(location.search);
  if (query.has("id") && !query.has("item")) query.set("item", query.get("id"));
  query.delete("id");
  location.replace("tarkovtool-item-card.html" + (query.toString() ? "?" + query : "") + location.hash);
})();
