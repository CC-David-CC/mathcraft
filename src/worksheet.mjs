export const ENGINE = 'GNU Octave 7.2.0 · octave-wasm 0.0.1';
export const LIMIT = 3 * 1024 * 1024;
const defaults = {mass_kg: 1, stiffness_n_m: 10000, unbalance_g_mm: 1000, damping_ratio: 0.05};
const digits = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
function requireValue(test, message) { if (!test) throw Error(message); }
export function boundedText(value, max, label) {
  requireValue(typeof value === 'string' && value.length <= max && new TextEncoder().encode(value).length <= max, label + ' is too large or invalid.');
  return value;
}
function number(value, min, max, label, strict = false) {
  requireValue(Number.isFinite(value) && (strict ? value > min : value >= min) && value <= max, 'Invalid ' + label + '.');
  return value;
}
export function parseCSV(raw) {
  boundedText(raw, 512 * 1024, 'CSV');
  const lines = raw.replace(/^\uFEFF/, '').split(/\r\n?|\n/).map((s,i)=>[s.trim(),i+1]).filter(([s])=>s && !s.startsWith('#'));
  requireValue(lines.length >= 2 && lines.length <= 5001, 'CSV needs a header and 1 to 5,000 measurement rows.');
  const fields = line => line.split(',').map(part => part.trim().replace(/^"([^"]*)"$/, '$1').trim());
  const header = fields(lines[0][0]);
  requireValue(['rpm,amplitude_mm','rpm,amplitude_mm,phase_deg'].includes(header.join(',')), 'Expected rpm,amplitude_mm with optional phase_deg as the third column.');
  return lines.slice(1).map(([line,n]) => {
    const parts = fields(line);
    const check = (s) => digits.test(s) && Number.isFinite(Number(s));
    requireValue(parts.length === header.length && check(parts[0]) && check(parts[1]) && +parts[0] >= 0 && +parts[1] >= 0 &&
      (parts.length === 2 || parts[2] === '' || check(parts[2])), 'Invalid measurement on CSV line ' + n + '.');
    return [+parts[0],+parts[1],parts.length === 3 && parts[2] !== '' ? +parts[2] : null];
  });
}
export function inputsOf(sheet) {
  const {params, maxRPM, source, dataset} = sheet;
  return structuredClone({params, maxRPM, source, dataset});
}
function inputs(obj) {
  requireValue(obj && obj.params, 'Missing worksheet parameters.');
  const p = obj.params;
  const params = {
    mass_kg: number(p.mass_kg,0,1e12,'mass',true),
    stiffness_n_m: number(p.stiffness_n_m,0,1e15,'stiffness',true),
    unbalance_g_mm: number(p.unbalance_g_mm,0,1e12,'unbalance'),
    damping_ratio: number(p.damping_ratio,0,1,'damping ratio')
  };
  const source = boundedText(obj.source, 64*1024, 'Model source');
  requireValue(source.trim(), 'Model source is empty.');
  let dataset = null;
  if (obj.dataset !== null) {
    requireValue(obj.dataset && typeof obj.dataset === 'object', 'Invalid measurement dataset.');
    const name = boundedText(obj.dataset.name,256,'Dataset name');
    parseCSV(obj.dataset.csv);
    dataset = {name, csv:obj.dataset.csv};
  }
  return {params, maxRPM:number(obj.maxRPM,0,1e8,'maximum RPM',true), source, dataset};
}
export function defaultSheet(source, script, csv) {
  return {format:'mathcraft', version:1, engine:ENGINE, ...inputs({params:defaults,maxRPM:2200,source,dataset:{name:'Synthetic run · 15 observations',csv}}),script,reference:null};
}
function table(value, width, limit) {
  requireValue(Array.isArray(value) && value.length <= limit && value.every(row=> Array.isArray(row) && row.length === width &&
    row.every(x=> x === null || Number.isFinite(x))), 'Invalid reference table.');
  return value.map(row=>row.slice());
}
export function readSheet(text) {
  boundedText(text,LIMIT,'Worksheet');
  let s;
  try { s=JSON.parse(text); } catch { throw Error('Invalid worksheet JSON.'); }
  if (s?.format === 'mathcraft' && s.version === 2) return codeSheet(s.title,s.files,s.entry);
  requireValue(s?.format === 'mathcraft' && s.version === 1,'Unsupported MathCraft worksheet format or version.');
  const engine=boundedText(s.engine,256,'Engine identifier');
  let reference=null;
  if (s.reference !== null) {
    const r=s.reference;
    requireValue(r && typeof r==='object','Invalid pinned run.');
    const result=r.result;
    requireValue(result && Array.isArray(result.summary),'Invalid reference output.');
    const curve=table(result.curve,3,482), predictions=table(result.predictions,5,5000), summary=table([result.summary],6,1)[0];
    requireValue(curve.length>1 && curve.every((v,i)=>Number.isFinite(v[0]) && (i===0 || v[0]>curve[i-1][0])),'Invalid reference speed grid.');
    reference={name:boundedText(r.name,120,'Run name'), time:boundedText(r.time,64,'Run timestamp'),engine:boundedText(r.engine,256,'Reference engine'),
      inputs:inputs(r.inputs),result:{curve,predictions,summary}};
  }
  return {format:'mathcraft',version:1,engine,...inputs(s),script:boundedText(s.script,64*1024,'Scratch script'),reference};
}
export function serialize(sheet) {
  const text=JSON.stringify(sheet)+'\n';
  readSheet(text);
  return text;
}
export function pin(sheet,result,name) {
  return {name:boundedText(name.trim() || 'Reference run',120,'Run name'),time:new Date().toISOString(),engine:ENGINE,inputs:inputsOf(sheet),result:structuredClone(result)};
}
export function compareResults(a,b) {
  let values=0, maxDifference=0, match=true;
  for (const key of ['curve','predictions','summary']) {
    const aa=key==='summary'?[a[key]]:a[key], bb=key==='summary'?[b[key]]:b[key];
    if (aa.length!==bb.length) match=false;
    aa.forEach((row,i)=>row.forEach((x,j)=>{
      const y=bb[i]?.[j]; values++;
      if (x===null || y===null || y===undefined) { if (x!==y) match=false; return; }
      const d=Math.abs(x-y); maxDifference=Math.max(maxDifference,d);
      if (d>1e-9+1e-8*Math.max(Math.abs(x),Math.abs(y))) match=false;
    }));
  }
  return {match,values,maxDifference};
}
export function residualCSV(rows) {
  return 'rpm,measured_mm,predicted_mm,residual_mm,predicted_phase_deg\n'+rows.map(row=>row.map(x=>x??'').join(',')).join('\n')+'\n';
}

export function validFilename(name) {
  if (typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,62}\.m$/.test(name))
    throw Error('Use an Octave file name starting with a letter and ending in .m.');
  return name;
}
export function codeSheet(title,files,entry=files[0]?.name) {
  if (!Array.isArray(files) || !files.length || files.length>32) throw Error('A lab can contain 1 to 32 code files.');
  const names=new Set();
  const checked=files.map(file=>{
    const name=validFilename(file?.name);
    if(names.has(name)) throw Error('Duplicate file: '+name);
    names.add(name);
    return {name,source:boundedText(file.source,65536,'Octave code')};
  });
  if(!names.has(entry))throw Error('The entry script is missing.');
  return {format:'mathcraft',version:2,engine:ENGINE,title:boundedText(title,120,'Lab name'),entry,files:checked};
}
