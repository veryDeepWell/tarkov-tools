/*! load localizer from split b64 */
Promise.all([
  fetch("tarkov-localizer.b64.1?v=4").then(function(r){return r.text()}),
  fetch("tarkov-localizer.b64.2?v=4").then(function(r){return r.text()})
]).then(function(parts){
  var s=document.createElement("script");
  s.textContent=atob((parts[0]+parts[1]).replace(/\s+/g,""));
  document.body.appendChild(s);
}).catch(function(e){
  var st=document.getElementById("status");
  if(st){st.className="status err";st.textContent="Failed to load localizer: "+e;}
});
