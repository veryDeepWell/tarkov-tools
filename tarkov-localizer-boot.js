/*! load localizer from b64 */
fetch("tarkov-localizer.b64?v=3").then(function(r){return r.text()}).then(function(b64){
  var s=document.createElement("script");
  s.textContent=atob(b64.replace(/\s+/g,""));
  document.body.appendChild(s);
}).catch(function(e){
  var st=document.getElementById("status");
  if(st){st.className="status err";st.textContent="Failed to load localizer: "+e;}
});
