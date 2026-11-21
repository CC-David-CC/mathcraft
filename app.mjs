import {markup} from './src/view.mjs';
import {makeChart} from './src/chart.mjs';
import {accountFiles,download} from './src/files.mjs';
import {Kernel} from './src/kernel.mjs';
import {ENGINE,LIMIT,boundedText,compareResults,defaultSheet,inputsOf,parseCSV,pin,readSheet,residualCSV,serialize} from './src/worksheet.mjs';

const fmt=(v,d=4)=>Number.isFinite(v)?Number(v.toFixed(d)).toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const assets=name=>new URL(name,import.meta.url);
async function readAsset(name,signal){
  const r=await fetch(assets(name),{signal});
  if(!r.ok)throw Error('Could not load '+name+' ('+r.status+').');
  return r.text();
}
export function mount(host={}) {
  const doc=host.document??document, element=doc.createElement('div'), controller=new AbortController(), {signal}=controller;
  element.className='window-content mc-app';element.innerHTML=markup;
  const css=doc.createElement('link');css.rel='stylesheet';css.href=assets('./src/style.css');element.prepend(css);
  const el=Object.fromEntries([...element.querySelectorAll('[data-id]')].map(n=>[n.dataset.id,n]));
  const kernel=new Kernel(), files=accountFiles(host,signal), chart=makeChart(el.chart,el.readout,signal);
  let sheet,result=null, observations=[], rev=0, modelRev=0, generation=0, actionTicket=0, timer, mode='amplitude', controlsValid=true, dirty=false;
  const subscribers=new Set();
  let pending=1,paused=false,closeRev=null;
  element.inert=true;
  function changed(){for(const cb of subscribers)cb();}
  async function activity(fn){
    if(paused||signal.aborted)return;
    pending++;changed();
    try{return await fn();}finally{pending--;changed();}
  }
  const via=(node,event,listener)=>node.addEventListener(event,listener,{signal});
  function message(s,level='info'){ if(signal.aborted)return;el.status.textContent=s;el.status.dataset.level=level; }
  function dirtyEdit(){ rev++; dirty=true; changed(); }
  function payload(s){return {...s,measurements:s.dataset?parseCSV(s.dataset.csv):[]};}
  function refresh() {
    const summary=result?.summary??[];
    el.natural.textContent=fmt(summary[1],1);el.hz.textContent=Number.isFinite(summary[0])?'rpm · '+fmt(summary[0],3)+' Hz':'rpm';
    el.amp.textContent=fmt(summary[2]);el.rmse.textContent=fmt(summary[4]);el.count.textContent=result?'mm · '+summary[5]+' of '+observations.length+' points':'mm';
    el.dataset.textContent=sheet?.dataset?sheet.dataset.name+' · '+observations.length+' rows':'No measurements loaded.';
    const ref=sheet?.reference;
    el.reflegend.hidden=!ref;el.reference.textContent=ref?ref.name+' · '+(ref.inputs.params.damping_ratio*100).toLocaleString('en-US',{maximumFractionDigits:3})+'% damping · '+ref.engine+' · '+ref.time:'Pin a run to compare it with later settings.';
    el.reflegend.textContent=mode==='residual'?'Pinned residuals':'Pinned model';
    element.querySelector('.mc-live').textContent=mode==='residual'?'Current residuals':'Current model';
    element.querySelector('.mc-obs').hidden=mode==='residual'||!observations.length;
    el.replay.disabled=!ref;el.unpin.disabled=!ref;el.pin.disabled=!result;el.fit.disabled=!result||!observations.length;el.export.disabled=!result||!observations.length;el.clear.disabled=!observations.length;
    chart.set(result?{result,reference:ref,measurements:observations,maxRPM:sheet.maxRPM,naturalRPM:summary[1]}:null,mode);
    const fragment=doc.createDocumentFragment();
    for(const [i,row] of (result?.predictions??[]).entries()){
      const tr=doc.createElement('tr');
      for(const v of [row[0],row[1],row[2],row[3],observations[i]?.[2],row[4]]) {const td=doc.createElement('td');td.textContent=fmt(v,5);tr.append(td);}
      fragment.append(tr);
    }
    el.rows.replaceChildren(fragment);
  }
  function populate(){
    const p=sheet.params;
    for(const id of ['mass_kg','stiffness_n_m','unbalance_g_mm'])el[id].value=p[id];
    el.damping.value=Number((p.damping_ratio*100).toPrecision(12));el.slider.value=el.damping.value;el.maxRPM.value=sheet.maxRPM;
    el.source.value=sheet.source;el.script.value=sheet.script;
    observations=sheet.dataset?parseCSV(sheet.dataset.csv):[];controlsValid=true;
  }
  function invalidate(){clearTimeout(timer);modelRev++;generation++;actionTicket++;result=null;refresh();}
  async function run(note=''){
    if(!sheet||!controlsValid||signal.aborted)return;
    clearTimeout(timer);const ticket=++generation;
    message('Calculating in GNU Octave…');
    try{
      const next=await kernel.request('run',payload(inputsOf(sheet)));
      if(ticket!==generation||signal.aborted)return;
      result=next;sheet.engine=ENGINE;el.engine.textContent='GNU Octave 7.2.0';refresh();
      message(note || (next.summary[2]===null?'No finite steady-state response at natural speed. The curve has a gap there.':'Worksheet calculated.'));
    } catch(e){if(ticket===generation&&!signal.aborted){result=null;refresh();message(e.message,'error');}}
  }
  function schedule(){timer=setTimeout(()=>run(),120);}
  function apply(next){
    sheet=next;dirty=false;rev++;el.verdict.textContent='';el.stdout.textContent='Script output appears here.';
    populate();invalidate();changed();
  }
  function editControls(origin) {
    if(!sheet)return;
    if(origin==='slider')el.damping.value=el.slider.value;
    if(origin==='damping' && el.damping.value!=='')el.slider.value=el.damping.value;
    dirtyEdit();invalidate();
    const vals=Object.fromEntries(['mass_kg','stiffness_n_m','unbalance_g_mm','damping','maxRPM'].map(k=>[k,el[k].valueAsNumber]));
    const p={mass_kg:vals.mass_kg,stiffness_n_m:vals.stiffness_n_m,unbalance_g_mm:vals.unbalance_g_mm,damping_ratio:vals.damping/100};
    controlsValid=Object.values(vals).every(Number.isFinite) && vals.mass_kg>0&&vals.mass_kg<=1e12&&vals.stiffness_n_m>0&&vals.stiffness_n_m<=1e15&&vals.unbalance_g_mm>=0&&vals.unbalance_g_mm<=1e12&&vals.damping>=0&&vals.damping<=100&&vals.maxRPM>0&&vals.maxRPM<=1e8;
    if(!controlsValid){message('Enter positive mass, stiffness and upper speed, nonnegative unbalance, and damping from 0 to 100%.','error');return;}
    sheet.params=p;sheet.maxRPM=vals.maxRPM;schedule();
  }
  for(const k of ['mass_kg','stiffness_n_m','unbalance_g_mm','damping','slider','maxRPM'])via(el[k],'input',()=>editControls(k));
  for(const node of element.querySelectorAll('[data-tab]'))via(node,'click',()=>{
    for(const t of element.querySelectorAll('[data-tab]'))t.setAttribute('aria-pressed',String(t===node));
    for(const panel of element.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==node.dataset.tab;
    chart.draw();
  });
  for(const node of element.querySelectorAll('[data-mode]'))via(node,'click',()=>{
    mode=node.dataset.mode;for(const n of element.querySelectorAll('[data-mode]'))n.setAttribute('aria-pressed',String(n===node));refresh();
  });
  via(el.source,'input',()=>{if(sheet){sheet.source=el.source.value;dirtyEdit();invalidate();message('Model edited. Run model to recalculate.');}});
  via(el.script,'input',()=>{if(sheet){sheet.script=el.script.value;dirtyEdit();}});
  function click(id,fn){via(el[id],'click',()=>{element.querySelector('details').open=false;activity(()=>{
    if(!sheet)throw Error('Worksheet is still starting.');return fn();
  }).catch(e=>message(e.message,'error'));});}
  function usable(){if(!controlsValid)throw Error('Correct the system parameters first.');}
  function localSave(){usable();download(doc,'rotating-unbalance.mathcraft',serialize(sheet),'application/json');if(!files.hosted){dirty=false;changed();}message('Worksheet download created.');}
  async function save(as=false){
    if(!files.hosted)return localSave();
    usable();const r=rev,path=await files.save(sheet,as);
    if(path){if(r===rev){dirty=false;changed();}message('Saved '+path+(r===rev?' to account Files.':'. Later edits are still unsaved.'));}
  }
  async function allowReplace(){
    if(!dirty)return true;
    const question='Replace the edited worksheet with a file?';
    return host.ui?.confirm?host.ui.confirm(question,{title:'Open worksheet',confirmLabel:'Open',signal}):window.confirm(question);
  }
  async function openAccount(target){
    const before=rev;if(!target && !(await allowReplace()))return;
    if(before!==rev)throw Error('Worksheet changed while choosing a file.');
    const path=await files.open({target,revision:before,getRevision:()=>rev,apply});
    if(path)await run('Opened '+path+' and recalculated.');
  }
  click('open',()=>files.hosted?openAccount():el.picksheet.click());click('save',()=>save());click('as',()=>save(true));click('download',localSave);click('upload',()=>el.picksheet.click());
  click('csv',()=>el.pickcsv.click());click('loadmodel',()=>el.pickmodel.click());click('loadscript',()=>el.pickscript.click());
  click('getmodel',()=>download(doc,'unbalance.m',sheet.source));click('getscript',()=>download(doc,'scratch.m',sheet.script));
  click('clear',()=>{sheet.dataset=null;observations=[];dirtyEdit();invalidate();return run();});
  click('export',()=>{if(result)download(doc,'rotating-unbalance-residuals.csv',residualCSV(result.predictions),'text/csv');});
  click('run',()=>{usable();return run();});
  click('pin',()=>{
    if(!result)return;
    sheet.reference=pin(sheet,result,'Reference at '+fmt(100*sheet.params.damping_ratio,4)+'% damping');dirtyEdit();el.verdict.textContent='';refresh();message('Reference run pinned with its model, inputs and outputs.');
  });
  click('unpin',()=>{sheet.reference=null;dirtyEdit();el.verdict.textContent='';refresh();});
  click('replay',async()=>{
    const ref=sheet.reference;if(!ref)return;message('Replaying the pinned model…');
    const replay=await isolated('run',payload(ref.inputs));
    if(signal.aborted||sheet.reference!==ref)return;
    const c=compareResults(ref.result,replay);
    el.verdict.textContent=(c.match?'Replay matched':'Replay differs')+' · '+c.values+' values checked · maximum difference '+c.maxDifference.toExponential(2)+(ENGINE===ref.engine?'':' · recorded with '+ref.engine);
    message('Reference replay complete.');
  });
  click('fit',async()=>{
    usable();const current=modelRev,job=++actionTicket;
    message('Fitting damping to the measured peak amplitudes…');
    let fit;
    try{fit=await kernel.request('fit',payload(inputsOf(sheet)));}
    catch(e){if(!signal.aborted&&current===modelRev&&job===actionTicket)throw e;return;}
    if(signal.aborted||current!==modelRev||job!==actionTicket)return;
    sheet.params.damping_ratio=fit.zeta;el.damping.value=Number((fit.zeta*100).toPrecision(12));el.slider.value=el.damping.value;
    dirtyEdit();invalidate();await run('Fitted damping '+fmt(100*fit.zeta,4)+'% · amplitude RMSE '+fmt(fit.rmse,6)+' mm.'+(fit.zeta===0||fit.zeta===1?' Fit reached the search boundary.':''));
  });
  click('runscript',async()=>{
    usable();const job=++actionTicket,version=rev;

    try{
      message('Running scratch script…');el.stdout.textContent='Running…';
      const s=await isolated('script',{...payload(inputsOf(sheet)),script:sheet.script},chunk=>{
        if(!signal.aborted&&job===actionTicket&&rev===version)el.stdout.textContent=chunk;
      });
      if(signal.aborted||job!==actionTicket)return;
      if(rev!==version){el.stdout.textContent='Worksheet changed during execution. Run the script again.';return;}
      el.stdout.textContent=s||'(completed without output)';message('Scratch script finished.');
    }catch(e){if(!signal.aborted&&job===actionTicket){el.stdout.textContent=e.message;message(e.message,'error');}}
  });
  const isolatedKernels=new Set();
  async function isolated(kind,inputs,onOutput){
    const worker=new Kernel();isolatedKernels.add(worker);
    try{return await worker.request(kind,inputs,onOutput);}finally{worker.dispose();isolatedKernels.delete(worker);}
  }
  function stop(){clearTimeout(timer);generation++;actionTicket++;kernel.reset();for(const k of isolatedKernels)k.dispose();el.stdout.textContent='Stopped.';message('Interpreter stopped. Run a model or script to restart it.');}
  click('stop',stop);
  async function importFile(kind,file) {
    if(!file||!sheet)return;
    const before=rev,limit=kind==='sheet'?LIMIT:kind==='csv'?512*1024:64*1024;
    if(file.size>limit)throw Error('File exceeds the size limit.');
    const text=boundedText(await file.text(),limit,'File');
    if(signal.aborted||rev!==before)throw Error('Worksheet edited during import. Try again.');
    if(kind==='sheet'){
      const next=readSheet(text);if(!(await allowReplace()))return;
      if(signal.aborted||rev!==before)throw Error('Worksheet edited during open.');
      files.detach();apply(next);await run('Opened worksheet and recalculated.');return;
    }
    if(kind==='csv'){const rows=parseCSV(text);sheet.dataset={name:boundedText(file.name,256,'File name'),csv:text};observations=rows;dirtyEdit();invalidate();await run();return;}
    if(kind==='model'){el.source.value=text;el.source.dispatchEvent(new Event('input'));await run();return;}
    el.script.value=text;el.script.dispatchEvent(new Event('input'));message('Scratch script imported.');
  }
  for(const kind of ['csv','sheet','model','script']){
    const input=el['pick'+kind];via(input,'change',()=>{const f=input.files[0];input.value='';activity(()=>importFile(kind,f)).catch(e=>message(e.message,'error'));});
  }
  via(element,'dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
  via(element,'drop',e=>{if(!e.dataTransfer.files.length)return;e.preventDefault();const f=e.dataTransfer.files[0];if(/\.(csv|mathcraft)$/i.test(f.name))activity(()=>importFile(/\.csv$/i.test(f.name)?'csv':'sheet',f)).catch(err=>message(err.message,'error'));else message('Drop a CSV or .mathcraft worksheet.','error');});
  const ready=(async()=>{
    const [model,script,csv]=await Promise.all(['./lab/unbalance.m','./examples/inspect-response.m','./examples/synthetic-run.csv'].map(n=>readAsset(n,signal)));
    if(signal.aborted)return;apply(defaultSheet(model,script,csv));
    const launch=files.launch();
    if(launch)await openAccount(launch);else await run();
  })().catch(e=>{if(!signal.aborted){element.dataset.state='error';message(e.message,'error');throw e;}}).finally(()=>{
    pending--;element.inert=paused;if(!element.dataset.state)element.dataset.state='ready';changed();
  });
  ready.catch(()=>{});
  function dispose(){if(signal.aborted)return;clearTimeout(timer);subscribers.clear();controller.abort();kernel.dispose();for(const k of isolatedKernels)k.dispose();}
  if(host.signal?.aborted)dispose();else host.signal?.addEventListener('abort',dispose,{once:true,signal});
  host.onDispose?.(dispose);
  const lifecycle={
    snapshot:()=>({revision:rev,dirty,pending:pending>0}),
    subscribe(cb){subscribers.add(cb);return ()=>subscribers.delete(cb);},
    async quiesce(){
      if(pending||paused)throw Error('Finish the current worksheet action first.');
      paused=true;element.inert=true;
      return {release(){paused=false;element.inert=false;}};
    },
    commitClose(){if(closeRev!==null&&closeRev!==rev)throw Error('Worksheet changed during close.');return true;}
  };
  async function requestClose(){
    if(signal.aborted)return true;
    if(pending||paused)return false;
    const before=rev;
    if(dirty){
      const q='Close this worksheet and discard unsaved edits?';
      if(!(await (host.ui?.confirm?host.ui.confirm(q,{title:'Close MathCraft',confirmLabel:'Discard and close',signal}):window.confirm(q))))return false;
    }
    if(before!==rev||pending)return false; closeRev=rev;return true;
  }
  return {element,dispose,ready,lifecycle,requestClose};
}
