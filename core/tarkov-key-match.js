/*! Catalogue matching: exact aliases first, bounded OCR repair, ambiguity retained. */
(function(global){
  "use strict";
  function norm(s){return String(s||"").toLowerCase().replace(/ё/g,"е").replace(/@/g,"0").replace(/((?:сан|san)\s*\d{3})[,\s]+3\b/g,"$1 з").replace(/[^a-z0-9а-я\s]/gi," ").replace(/\s+/g," ").trim();}
  function fold(s){var map={а:"a",в:"b",с:"c",е:"e",н:"h",к:"k",м:"m",о:"o",р:"p",т:"t",х:"x",у:"y"};return norm(s).replace(/[авсенкмортху]/g,function(c){return map[c]||c;}).replace(/\s/g,"");}
  function distance(a,b){var prev=Array.from({length:b.length+1},function(_,i){return i;});for(var i=1;i<=a.length;i++){var row=[i];for(var j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}return prev[b.length];}
  function score(query,item,ocr){
    var q=norm(query);if(q.length<3||!/[^\d\s]/.test(q)||/^(key|keys|room|ключ|ключи|комната|доступ)$/.test(q))return 0;
    if(ocr && q.length>=5&&q.length<=7&&distance(fold(q),fold("доступ"))<=1)return 0;
    var aliases=[item.slug,item.name].concat(item.aliases||[]).filter(Boolean).map(norm),best=0;
    aliases.forEach(function(a){
      var nums=q.match(/\d+/g)||[],an=a.match(/\d+/g)||[];
      if(nums.length && nums.join(":")!==an.join(":"))return;
      if(q===a){best=100;return;}
      var fq=fold(q),fa=fold(a);
      if(fq===fa){best=Math.max(best,98);return;}
      if(ocr && fq.length>=5 && fa.startsWith(fq) && fa.length-fq.length<=4)best=Math.max(best,91);
      if(ocr && fq.length>=7 && fa.startsWith(fq.slice(0,-1)) && fa.length-fq.length<=5)best=Math.max(best,88);
      if(ocr && fq.length>=4 && Math.abs(fq.length-fa.length)<=2){var d=distance(fq,fa);if(d<=1 || fq.length>=8&&d<=2)best=Math.max(best,94-d*5);}
      var useful=q.split(" ").filter(function(t){return !/^(key|keys|room|ключ|ключи|комната|от|the|for|a)$/.test(t);});
      if(useful.length>=2 && useful.every(function(t){return a.split(" ").includes(t);}))best=Math.max(best,85);
    });return best;
  }
  function best(queries,catalog,ocr){
    if(!Array.isArray(queries))queries=[queries];
    var ranked=catalog.map(function(item){return {item:item,confidence:Math.max.apply(null,queries.map(function(q){return score(q,item,ocr);} ))};}).sort(function(a,b){return b.confidence-a.confidence;});
    var first=ranked[0],second=ranked[1];
    return first && first.confidence>=85 && (!second||first.confidence-second.confidence>=8)?first:null;
  }
  global.TarkovKeyMatch={norm:norm,score:score,best:best};
})(typeof window!=="undefined"?window:globalThis);
