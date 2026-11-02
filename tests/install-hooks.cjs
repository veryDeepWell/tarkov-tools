const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const old=spawnSync('git',['config','--get','core.hooksPath'],{cwd:root,encoding:'utf8'}).stdout.trim();
if(old&&old!=='.githooks')throw Error('Existing hooksPath '+old+'; integrate pre-push manually instead of replacing it.');
fs.chmodSync(path.join(root,'.githooks/pre-push'),0o755);
const r=spawnSync('git',['config','--local','core.hooksPath','.githooks'],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
console.log('pre-push installed: node tests/check.cjs');
