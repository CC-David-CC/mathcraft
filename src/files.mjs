import {LIMIT,readSheet,serialize} from './worksheet.mjs';
const digest = value => typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
function pathOf(path) {
  if (typeof path!=='string' || path.length>2048 || /[\\\x00-\x1f]/.test(path) || path.split('/').some(v=>!v||v==='.'||v==='..') ||
      !path.toLowerCase().endsWith('.mathcraft')) throw Error('Choose a .mathcraft file inside Files.');
  return path;
}
export function sheetName(sheet) {
  if(sheet.version===1)return 'rotating-unbalance.mathcraft';
  return (sheet.title.replace(/[^a-z0-9_ -]/gi,'').trim() || 'Untitled lab')+'.mathcraft';
}
export function accountFiles(host,signal) {
  const storage=host?.storage, session=host?.session?.();
  const temporary=session?.public?.kind==='anonymous';
  const getOwner=temporary ? storage?.workspaceOwner : storage?.signedInSubject;
  const fileContext=temporary ? storage?.workspaceFileContext : storage?.accountFileContext;
  const pickFile=temporary ? storage?.pickWorkspaceFile : storage?.pickAccountFile;
  const owner=getOwner?.call(storage), hosted=Boolean(owner && fileContext && pickFile);
  let bound=null, busy=false;
  function live(ctx) {
    if (signal.aborted || !hosted || getOwner.call(storage)!==owner || host.session?.()!==session ||
        (ctx && (!ctx.valid() || ctx.owner!==owner))) throw Error('The original account window is no longer active.');
  }
  function bind(resource) {
    live();
    host.desktop?.updateAccountFileBinding?.(host.w,{owner,path:resource?.path??null,sha256:resource?.sha256??null});
    bound=resource;
  }
  async function exclusive(action) {
    if (busy) throw Error('A file operation is already in progress.');
    live(); busy=true;
    try { return await action(); } finally {busy=false;}
  }
  function launch() {
    const f=host?.w?.launchContext;
    if (!f) return null;
    if (!hosted || f.storage!=='account' || f.owner!==owner || (!f.restore && !digest(f.sha256))) throw Error('Invalid account file launch.');
    return {path:pathOf(f.path),sha256:f.restore?null:f.sha256};
  }
  async function open({target,revision,getRevision,apply}) {
    return exclusive(async()=>{
      let path=target?.path;
      if (!path) {
        const choice=await pickFile.call(storage,{extensions:['.mathcraft'],signal});
        live(); if (choice==null) return;
        path=choice.replace(/^\//,'');
      }
      path=pathOf(path);
      const ctx=await fileContext.call(storage); live(ctx);
      const file=await ctx.files.read(path,{signal}); live(ctx);
      if (!digest(file.sha256) || (target?.sha256 && target.sha256!==file.sha256)) throw Error('This worksheet revision changed. Reopen it from Files.');
      const raw=file.data;
      if ((raw instanceof Blob?raw.size:raw?.byteLength)>LIMIT) throw Error('Worksheet exceeds 3 MiB.');
      const bytes=raw instanceof Blob?new Uint8Array(await raw.arrayBuffer()):raw;
      if (!(bytes instanceof Uint8Array)) throw Error('Invalid worksheet data.');
      const sheet=readSheet(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
      live(ctx);
      if (getRevision()!==revision) throw Error('Worksheet edited during open. Your current edits were kept.');
      bind({path,sha256:file.sha256}); apply(sheet);
      return path;
    });
  }
  async function save(sheet,as=false) {
    return exclusive(async()=>{
      const content=serialize(sheet);
      let path=as?null:bound?.path, expected=as?null:bound?.sha256;
      if (!path) {
        const folder=await pickFile.call(storage,{foldersOnly:true,signal}); live();
        if (folder==null) return;
        const answer=await host.ui.prompt('File name',{title:'Save worksheet',value:sheetName(sheet),confirmLabel:'Save',signal}); live();
        if (answer==null) return;
        const name=answer.trim();
        if (!name || name.includes('/')) throw Error('Enter a single file name.');
        path=pathOf([folder.replace(/^\/|\/$/g,''),name+(/\.mathcraft$/i.test(name)?'':'.mathcraft')].filter(Boolean).join('/'));
      }
      const ctx=await fileContext.call(storage); live(ctx);
      if (!expected) {
        try {
          const version=await ctx.files.version(path); live(ctx);
          if (!digest(version?.sha256)) throw Error('Could not confirm the existing version.');
          expected=version.sha256;
        } catch (e) { live(ctx); if (e.status!==404) throw e; }
        if (expected) {
          const yes=await host.ui.confirm('Replace '+path+'?',{title:'Replace worksheet',confirmLabel:'Replace',signal});
          live(ctx); if (!yes) return;
        }
      }
      live(ctx);
      const saved=await ctx.files.write(path,new Blob([content],{type:'application/json'}),expected??null,{signal});
      live(ctx);
      if (!digest(saved?.sha256)) throw Error('The server did not confirm this revision.');
      bind({path,sha256:saved.sha256}); return path;
    });
  }
  async function importCode() {
    return exclusive(async()=>{
      const choice=await pickFile.call(storage,{extensions:['.m'],signal});live();
      if(choice==null)return;
      const path=choice.replace(/^\//,'');
      if(!/\.m$/i.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..')||path.includes('\\'))throw Error('Choose an Octave file in Files.');
      const ctx=await fileContext.call(storage);live(ctx);
      const file=await ctx.files.read(path,{signal});live(ctx);
      const data=file.data;
      if((data instanceof Blob?data.size:data?.byteLength)>65536)throw Error('Code file exceeds 64 KiB.');
      const bytes=data instanceof Blob?await data.arrayBuffer():data;live(ctx);
      return {name:path.split('/').pop(),source:new TextDecoder('utf-8',{fatal:true}).decode(bytes)};
    });
  }
  return {hosted,temporary,launch,save,open,importCode,detach(){if(busy)throw Error('Finish the file operation first.');if(hosted)bind(null);}};
}
export function download(doc,name,text,type='text/plain') {
  const a=doc.createElement('a'), url=URL.createObjectURL(new Blob([text],{type}));
  a.href=url; a.download=name; doc.body.append(a);
  try { a.click(); } finally { a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
}
