/*! hub-app assemble — full source (no CDN recovery) */
(function(){
  var p=window.__HUB_PARTS;
  if(!p||p.filter(Boolean).length<3){console.error("hub parts missing");return;}
  var code=decodeURIComponent(escape(atob(p.join(""))));
  var s=document.createElement("script");
  s.textContent=code;
  document.head.appendChild(s);
})();
