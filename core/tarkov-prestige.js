/*! Prestige selection and packing. Pure, deterministic, independent of the DOM. */
(function(global){
  "use strict";
  function id(r){return typeof r==="string"?r:r&&(r.id||id(r.item))||"";}
  function value(it){for(var field of ["avg24hPrice","lastLowPrice","price"]){var n=Number(it[field]);if(Number.isFinite(n)&&n>0)return n;}return 0;}
  function demands(tasks,maxLevel){
    var result=[];
    (tasks||[]).filter(function(t){return Number(t.minPlayerLevel||1)<=maxLevel;}).forEach(function(t){
      var groups=new Map();
      (t.objectives||[]).filter(function(o){return o.type==="findItem"||o.type==="giveItem";}).forEach(function(o){
        var refs=o.items||o.item||[], ids=(Array.isArray(refs)?refs:[refs]).map(id).filter(Boolean).sort();
        if(!ids.length)return;var key=ids.join(","),count=Math.max(1,Number(o.count)||1),old=groups.get(key);
        if(!old)groups.set(key,{ids:ids,qty:count,taskId:t.id,name:t.name||"Задание",kappa:!!t.kappaRequired});
        else old.qty=Math.max(old.qty,count); // find and hand-in describe the same inventory requirement.
      });groups.forEach(function(g){result.push(g);});
    });return result;
  }
  function excluded(it){return /dogtag/i.test(it.normalizedName||"")||(it.types||[]).includes("dogtag")||(it.properties||{}).propertiesType==="ItemPropertiesDogtag";}
  function rule(records,level){var entry=(records||[]).find(function(p){return Number(p.prestigeLevel)===Number(level);});return entry&&(entry.transferSettings||[]).find(function(s){return s.gridWidth>0&&s.gridHeight>0&&s.itemFilters;})||null;}
  function allowed(it,setting){
    if(!setting||!setting.itemFilters)return false;var f=setting.itemFilters,cats=(it.categories||[]).map(id);
    if((f.excludedItems||[]).includes(it.id)||cats.some(function(c){return (f.excludedCategories||[]).includes(c);}))return false;
    return (f.allowedItems||[]).includes(it.id)||cats.some(function(c){return (f.allowedCategories||[]).includes(c);});
  }
  function plan(items,tasks,options){
    options=options||{};var cols=options.cols||8,rows=options.rows||8,focus=options.focus||"balanced";
    var needs=demands(tasks,options.maxLevel||15).map(function(g){return Object.assign({},g,{remaining:g.qty});});
    var byItem=new Map();needs.forEach(function(n){n.ids.forEach(function(id){if(!byItem.has(id))byItem.set(id,[]);byItem.get(id).push(n);});});
    var used=Array.from({length:rows},function(){return Array(cols).fill(false);}),picked=new Map(),out=[];
    var candidates=(items||[]).filter(function(it){return it&&it.id&&allowed(it,options.rule)&&!excluded(it)&&(it.properties||{}).propertiesType!=="ItemPropertiesContainer";}).map(function(it){
      var w=Math.max(1,Math.floor(Number(it.displayWidth||it.width||it.w)||1)),h=Math.max(1,Math.floor(Number(it.displayHeight||it.height||it.h)||1));
      return {item:it,w:w,h:h,price:value(it)};
    }).filter(function(c){return c.w<=Math.max(cols,rows)&&c.h<=Math.max(cols,rows)&&(c.price>0||byItem.has(c.item.id));});
    function slot(w,h){var orientations=w===h?[[w,h]]:[[w,h],[h,w]];
      for(var y=0;y<rows;y++)for(var x=0;x<cols;x++)for(var o of orientations){
        if(x+o[0]>cols||y+o[1]>rows)continue;var fit=true;
        for(var yy=y;yy<y+o[1];yy++)for(var xx=x;xx<x+o[0];xx++)if(used[yy][xx])fit=false;
        if(fit)return {x:x,y:y,w:o[0],h:o[1]};
      }return null;}
    while(out.length<cols*rows){
      var best=null;
      candidates.forEach(function(c){
        var related=(byItem.get(c.item.id)||[]).filter(function(n){return n.remaining>0;});
        if(picked.has(c.item.id)&&!related.length)return;
        if((focus==="quests"||focus==="kappa")&&!related.length)return;
        var area=c.w*c.h,density=c.price/area,quest=related.length*40+(related.some(function(n){return n.kappa;})?20:0);
        var score=(focus==="money"||focus==="density")?density/1000:(focus==="quests"||focus==="kappa")?quest/area+Math.min(2,density/100000):quest/Math.sqrt(area)+Math.min(25,density/50000);
        if(score<=0)return;var pos=slot(c.w,c.h);if(!pos)return;
        if(!best||score>best.score||score===best.score&&c.item.id<best.item.id)best=Object.assign({},c,pos,{score:score,related:related});
      });
      if(!best)break;
      for(var y=best.y;y<best.y+best.h;y++)for(var x=best.x;x<best.x+best.w;x++)used[y][x]=true;
      picked.set(best.item.id,(picked.get(best.item.id)||0)+1);
      // A handed-in physical item cannot pay two different quests at once.
      best.related=best.related.slice(0,1);
      best.related.forEach(function(n){n.remaining--;});
      best.reason=best.related.length?best.related.map(function(n){return n.name;}).join(", "):"ценность на слот";
      out.push(best);
    }return out;
  }
  global.TarkovPrestige={demands:demands,plan:plan,value:value,excluded:excluded,rule:rule,allowed:allowed};
})(typeof window!=="undefined"?window:globalThis);
