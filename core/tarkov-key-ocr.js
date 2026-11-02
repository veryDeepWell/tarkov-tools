/*! Screenshot preparation for inventory-label OCR. No recognition guesses here. */
(function (global) {
  "use strict";
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function lines(data, w, h, vertical) {
    var length = vertical ? w : h, span = vertical ? h : w, peaks = [];
    for (var i = 1; i < length - 1; i++) {
      var score = 0;
      for (var j = 0; j < span; j++) {
        var at = vertical ? (j * w + i) * 4 : (i * w + j) * 4;
        var r = data[at], g = data[at + 1], b = data[at + 2];
        // Inventory dividers are neutral grey; coloured icons and durability are excluded.
        if (Math.max(r, g, b) - Math.min(r, g, b) < 13 && r >= 54 && r <= 115) score++;
      }
      peaks.push({ at: i, score: score / span });
    }
    return peaks;
  }
  function detectGrid(source) {
    var w = source.width, h = source.height, ctx = source.getContext("2d", { willReadFrequently: true });
    var data = ctx.getImageData(0, 0, w, h).data;
    var xs = lines(data, w, h, true), ys = lines(data, w, h, false), best = null;
    for (var step = 38; step <= Math.min(110, w / 3); step++) {
      for (var origin = 0; origin < Math.min(step, 32); origin++) {
        var positions = [], total = 0;
        for (var x = origin; x < w - 2; x += step) {
          var peak = xs.filter(function (p) { return Math.abs(p.at - x) <= 1; }).sort(function (a,b) { return b.score-a.score; })[0];
          if (peak) { total += peak.score; positions.push(peak.at); }
        }
        var score = positions.length >= 4 ? total / positions.length : 0;
        if (!best || score > best.score) best = { x: origin, step: step, score: score };
      }
    }
    if (!best || best.score < .32) return null;
    var yBest = null;
    for (var y0 = 0; y0 < Math.min(best.step, h / 2); y0++) {
      var n = 0, sum = 0;
      for (var y = y0; y < h - 2; y += best.step) {
        var peak = ys.filter(function (p) { return Math.abs(p.at-y) <= 1; }).sort(function(a,b){return b.score-a.score;})[0];
        if (peak) { sum += peak.score; n++; }
      }
      if (!yBest || sum/n > yBest.score) yBest = { y: y0, score: sum/n };
    }
    if (!yBest || yBest.score < .30) return null;
    return { x: best.x, y: yBest.y, cell: best.step, cols: Math.floor((w-best.x)/best.step), rows: Math.floor((h-yBest.y)/best.step) };
  }
  async function prepare(file) {
    var image = await createImageBitmap(file);
    var source = canvas(image.width, image.height); source.getContext("2d").drawImage(image, 0, 0); image.close();
    var grid = detectGrid(source), strips = [], ctx = source.getContext("2d", { willReadFrequently: true });
    if (grid) {
      for (var row = 0; row < grid.rows; row++) for (var col = 0; col < grid.cols; col++) {
        var x = grid.x + col*grid.cell + 2, y = grid.y + row*grid.cell + 2;
        var width = grid.cell-4, height = Math.ceil(grid.cell*.18);
        var pixels = ctx.getImageData(x,y,width,height).data, ink = 0;
        for (var i=0;i<pixels.length;i+=4) if (Math.min(pixels[i],pixels[i+1],pixels[i+2]) > 125) ink++;
        if (ink > width*.45) strips.push({ x:x, y:y, width:width, height:height, row:row, col:col });
      }
    } else strips.push({ x:0, y:0, width:source.width, height:source.height });
    var scale = grid ? 4 : Math.max(1, Math.min(3, 1800/source.width));
    var padding = 12, widthOut = Math.ceil(Math.max.apply(null,strips.map(function(s){return s.width;}))*scale)+padding*2;
    var heightOut = strips.reduce(function(n,s){return n+Math.ceil(s.height*scale)+padding*2;},0);
    if (!strips.length) throw Error("Не найдены читаемые подписи ячеек. Попробуй более крупный скрин.");
    var out = canvas(widthOut,heightOut), draw = out.getContext("2d",{willReadFrequently:true});
    draw.fillStyle = "white"; draw.fillRect(0,0,out.width,out.height); draw.imageSmoothingEnabled = true; draw.imageSmoothingQuality = "high";
    var dy = 0;
    strips.forEach(function(s){
      draw.drawImage(source,s.x,s.y,s.width,s.height,padding,dy+padding,s.width*scale,s.height*scale);
      var chunk=draw.getImageData(padding,dy+padding,s.width*scale,s.height*scale), d=chunk.data;
      for(var i=0;i<d.length;i+=4){var brightness=Math.min(d[i],d[i+1],d[i+2]); var v=255-Math.max(0,Math.min(255,(brightness-65)*2.1));d[i]=d[i+1]=d[i+2]=v;}
      draw.putImageData(chunk,padding,dy+padding); dy += Math.ceil(s.height*scale)+padding*2;
    });
    return { canvas:out, grid:grid, cells:strips };
  }
  global.TarkovKeyOCR = { prepare:prepare, detectGrid:detectGrid };
})(typeof window !== "undefined" ? window : globalThis);
