/* One command for local pre-push and CI. No downloads and no modification of fixtures. */
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
process.env.PATH=path.dirname(process.execPath)+path.delimiter+(process.env.PATH||'');
process.env.PYTHONIOENCODING='utf-8';
function run(command,args){console.log('\n> '+command+' '+args.join(' '));const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:process.env});if(result.error)console.error(result.error.message);if(result.status!==0)process.exit(result.status||1);}
function python(){for(const candidate of [process.env.PYTHON,'python3','python',path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe')].filter(Boolean)){const r=spawnSync(candidate,['--version'],{timeout:5000,encoding:'utf8'});if(r.status===0)return candidate;}throw Error('Python 3 required (or set PYTHON)');}
const py=python();
for(const file of ['lint-architecture.py','static-integrity-check.py','ux-contract-check.py'])run(py,['scripts/'+file]);
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
for(const file of ['domain-contract-check.sh','tool-contract-check.sh'])run(bash,['scripts/'+file]);
const tests=fs.readdirSync(__dirname).filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f);
run(process.execPath,['--test',...tests]);
console.log('\nAll checks passed.');
