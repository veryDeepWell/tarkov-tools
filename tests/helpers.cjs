const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const root = path.resolve(__dirname,'..');
const runtime = path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
function dependency(name) { try { return require(name); } catch { return require(path.join(runtime,name)); } }
function dependencyRoot(name) { try { return path.dirname(require.resolve(name+'/package.json')); } catch { return path.join(runtime,name); } }
async function browserSession() {
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');let base=root, relative='.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    const deps=url.pathname.match(/^\/__deps\/(tesseract\.js(?:-core)?)\/(.*)$/);
    if(deps){base=dependencyRoot(deps[1]);relative=deps[2];}
    const file=path.resolve(base,relative);
    if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return;}
      const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm'})[ext]||'application/octet-stream');res.end(body);});
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const edge=process.env.PLAYWRIGHT_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  let browser;
  try { browser=await dependency('playwright').chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{})}); }
  catch(error){await new Promise(r=>server.close(r));throw error;}
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ru-RU'});
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const unexpectedRequests=[];
  await context.route('https://**/*',route=>{unexpectedRequests.push(route.request().url());return route.abort();});
  await context.addInitScript(()=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('tarkovLang','ru');localStorage.setItem('tt:settings:lang','ru');});
  const page=await context.newPage();
  return {browser,context,page,errors,unexpectedRequests,base:'http://127.0.0.1:'+server.address().port,
    close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
async function fixtureAPI(context){
  const fixture=require('./fixtures/catalog.json');
  await context.route('https://json.tarkov.dev/**',route=>{
    const kind=new URL(route.request().url()).pathname.split('/').pop();
    return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({data:kind==='items'?{items:fixture.items}:kind==='tasks'?{tasks:fixture.tasks,prestige:fixture.prestige}:[]})});
  });
  await context.route('https://assets.tarkov.dev/**',route=>{
    const name=path.basename(new URL(route.request().url()).pathname),file=path.join(root,'tests/fixtures/icons',name);
    return fs.existsSync(file)?route.fulfill({path:file}):route.abort();
  });
  return fixture;
}
module.exports={root,dependency,dependencyRoot,browserSession,fixtureAPI};
