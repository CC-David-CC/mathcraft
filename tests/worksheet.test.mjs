import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaultSheet,parseCSV,readSheet,serialize,pin,compareResults,residualCSV,LIMIT} from '../src/worksheet.mjs';
const read=n=>readFile(new URL(n,import.meta.url),'utf8');
const source=await read('../lab/unbalance.m'),script=await read('../examples/inspect-response.m'),csv=await read('../examples/synthetic-run.csv');
const sheet=()=>defaultSheet(source,script,csv);
const result={curve:[[0,0,null],[100,0.1,12]],predictions:[[100,.12,.1,.02,12]],summary:[15,900,10,90,.02,1]};
test('scientific CSV supports quotes, CRLF, BOM, comments and repeated speeds',()=>{
  assert.deepEqual(parseCSV('\ufeff"rpm","amplitude_mm","phase_deg"\r\n# header note\n10,1e-2,\n10,0,90'),[[10,.01,null],[10,0,90]]);
  assert.equal(parseCSV(csv).length,15);
});
test('CSV rejects a unit mismatch, missing fields, negative amplitude and nonfinite input',()=>{
  for(const s of ['rpm,amplitude_in\n10,1','rpm,amplitude_mm\n3,','rpm,amplitude_mm\n3,-1','rpm,amplitude_mm\nInfinity,1','rpm,amplitude_mm\n2,0x10','rpm,amplitude_mm\n2,1,2'])assert.throws(()=>parseCSV(s));
});
test('worksheet preserves original CSV, source, parameters and pinned outputs',()=>{
  const s=sheet();s.reference=pin(s,result,'Test');s.params.mass_kg=2;s.source='something else';result.curve[0][1]=.25;
  try{
    const r=readSheet(serialize(s));assert.deepEqual(r,s);assert.equal(r.reference.inputs.params.mass_kg,1);
    assert.equal(r.reference.inputs.source,source);assert.equal(r.reference.inputs.dataset.csv,csv);assert.equal(r.reference.result.curve[0][1],0);
  }finally{result.curve[0][1]=0;}
});
test('version, bounds, reference shape and byte limits are validated',()=>{
  for(const update of [s=>s.version++,s=>s.params.mass_kg=0,s=>s.params.damping_ratio=1.1,s=>s.source='',s=>s.dataset.csv='x',s=>s.reference={name:'broken'}]){
    const s=sheet();update(s);assert.throws(()=>readSheet(JSON.stringify(s)));
  }
  assert.throws(()=>readSheet(' '.repeat(LIMIT+1)));
});
test('replay checks finite outputs, missing values and unequal dimensions',()=>{
  const other=structuredClone(result);assert.equal(compareResults(result,other).match,true);
  other.curve[0][2]=0;assert.equal(compareResults(result,other).match,false);
  other.curve.pop();assert.equal(compareResults(result,other).match,false);
});
test('residual CSV preserves signed numbers and leaves undefined results empty',()=>{
  assert.match(residualCSV([[100,1,1.1,-.1,null]]),/100,1,1.1,-0.1,\n$/);
});
test('desktop viewer inventory resolves every runtime asset',async()=>{
  const names=JSON.parse(await read('../webos-files.json'));assert.equal(names.length,new Set(names).size);
  for(const name of names)await readFile(new URL('../'+name,import.meta.url));
  for(const name of ['app.mjs','src/octave-worker.js','vendor/octave/octave.wasm','lab/unbalance.m','src/style.css'])assert.ok(names.includes(name));
});
