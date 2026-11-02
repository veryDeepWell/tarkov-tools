const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const file of ['data-contract-test.cjs','release-audit-repro.cjs','item-media-smoke-test.js'])test('shared core: '+file,()=>{
  const result=spawnSync(process.execPath,[path.join(__dirname,'../scripts',file)],{encoding:'utf8',timeout:60000});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
});
