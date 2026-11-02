/* Explicit maintenance command; tests themselves never download or rewrite fixtures. */
const fs=require('node:fs'),path=require('node:path');
const fixture=require('./fixtures/catalog.json');
async function save(url,file){if(fs.existsSync(file))return;const r=await fetch(url);if(!r.ok)throw Error(r.status+' '+url);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));}
(async()=>{
  for(const lang of ['rus','eng'])await save('https://cdn.jsdelivr.net/npm/@tesseract.js-data/'+lang+'/4.0.0_best_int/'+lang+'.traineddata.gz',path.join(__dirname,'fixtures/ocr-models',lang+'.traineddata.gz'));
  const items=fixture.items.filter(i=>!/dogtag/.test(i.normalizedName));let done=0;
  for(let i=0;i<items.length;i+=6)await Promise.all(items.slice(i,i+6).map(async item=>{try{await save(item.iconLink,path.join(__dirname,'fixtures/icons',path.basename(item.iconLink)));done++;}catch(e){console.error(e.message);process.exitCode=1;}}));
  console.log('Saved OCR models and icons:',done);
})().catch(e=>{console.error(e);process.exitCode=1;});
