/* Classic worker for the pinned Emscripten build. */
'use strict';
const asset = name => new URL(name, self.location.href).href;
const output=[];
let outputSize=0, truncated=false, runtime, currentSource, streaming=null, lastStream=0;
function log(line) {
  const text=String(line);
  if (outputSize+text.length+1>64000) { if (!truncated) output.push('[output truncated]'); truncated=true; return; }
  output.push(text); outputSize+=text.length+1;
  if (streaming!==null && (lastStream===0 || outputSize-lastStream>=2048)) {
    self.postMessage({id:streaming,progress:output.join('\n')}); lastStream=outputSize;
  }
}
function clearLog() { output.length=0; outputSize=0; truncated=false; }
async function boot() {
  importScripts(asset('../vendor/octave/octave.js'));
  const m=await OCTAVE({locateFile:n=>asset('../vendor/octave/'+n),noInitialRun:true,print:log,printErr:log});
  if (m.execute_interp()!==0) throw Error('GNU Octave initialization failed.');
  m.FS.mkdir('/work');m.FS.mkdir('/stdlib');
  const files=['mc_response','mc_run','mc_fit','mc_script'].map(name=>['../lab/'+name+'.m','/work/'+name+'.m']);
  files.push(['../vendor/octave/assert.m','/stdlib/assert.m']);
  await Promise.all(files.map(async ([url,path])=>{
    const res=await fetch(asset(url));
    if (!res.ok) throw Error('Missing Octave function '+url);
    m.FS.writeFile(path,await res.text());
  }));
  m.eval_string("cd('/work'); addpath('/stdlib','/work');");
  const [version]=call(m,'version',[],1);
  if (version!=='7.2.0') throw Error('Unexpected GNU Octave version '+version);
  return m;
}
function call(m,name,args,count) {
  const values=m.feval(name,args,count);
  if (!Array.isArray(values)) {
    const reason=m.last_error_message?.();
    throw Error(reason || output.slice(-4).join('\n') || 'GNU Octave could not execute '+name);
  }
  return values;
}
function vector(xs) { return {$type:'matrix',rows:xs.length,cols:1,data:xs}; }
function rows(mat) {
  if (typeof mat==='number') return [[Number.isFinite(mat)?mat:null]];
  if (mat?.$type!=='matrix') throw Error('The Octave function returned an unexpected type.');
  return Array.from({length:mat.rows},(_,r)=>Array.from({length:mat.cols},(_,c)=>{
    const x=mat.data[c*mat.rows+r]; return Number.isFinite(x)?x:null;
  }));
}
async function handle({id,kind,payload}) {
  clearLog();
  try {
    const m=await (runtime??=boot());
    clearLog();
    if (kind==='version') { self.postMessage({id,data:'7.2.0'}); return; }
    const {source,params,maxRPM,measurements=[],script}=payload;
    if (kind==='code') {
      m.FS.mkdir('/project');
      for(const file of payload.files)m.FS.writeFile('/project/'+file.name,file.source);
      m.eval_string("cd('/project');");
      streaming=id;lastStream=0;
      call(m,'source',['/project/'+payload.entry],0);
      const text=output.join('\n');
      let points=[];
      if(call(m,'exist',['lab_x','var'],1)[0] && call(m,'exist',['lab_y','var'],1)[0]) {
        call(m,'eval',["assert(isnumeric(lab_x) && isnumeric(lab_y) && isreal(lab_x) && isreal(lab_y) && isvector(lab_x) && isvector(lab_y) && numel(lab_x)==numel(lab_y) && numel(lab_x)<=20000)"],0);
        const [xy]=call(m,'eval',["[lab_x(:),lab_y(:)]"],1);
        points=rows(xy);
      }
      self.postMessage({id,data:{text,points}});return;
    }
    if (currentSource!==source) {
      m.FS.writeFile('/work/unbalance.m',source);
      m.eval_string("clear unbalance; rehash;");
      currentSource=source;
    }
    const speeds=vector(measurements.map(r=>r[0])), amplitudes=vector(measurements.map(r=>r[1]));
    let data;
    if (kind==='run') {
      const [c,p,s]=call(m,'mc_run',[params,maxRPM,speeds,amplitudes],3);
      data={curve:rows(c),predictions:rows(p),summary:rows(s)[0]};
    } else if (kind==='fit') {
      const [zeta,rmse]=call(m,'mc_fit',[params,speeds,amplitudes],2);
      if (!Number.isFinite(zeta)||!Number.isFinite(rmse)) throw Error('Damping fit did not converge.');
      data={zeta,rmse};
    } else if (kind==='script') {
      streaming=id;lastStream=0;
      m.FS.writeFile('/work/scratch.m',script);
      const rpm=vector(Array.from({length:481},(_,i)=>maxRPM*i/480));
      call(m,'mc_script',[params,rpm,speeds,amplitudes],0);
      data=output.join('\n');
    } else throw Error('Unknown calculation.');
    self.postMessage({id,data});
  } catch (e) { self.postMessage({id,error:e.message || String(e),log:output.slice(-8).join('\n')}); }
  finally { streaming=null; }
}
let queue=Promise.resolve();
self.onmessage=e=>{queue=queue.then(()=>handle(e.data));};
