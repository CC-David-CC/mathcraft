import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {accountFiles} from '../src/files.mjs';
import {defaultSheet,serialize} from '../src/worksheet.mjs';
const sheet=()=>defaultSheet('function y=unbalance(x,p);y=x;end','disp(2)','rpm,amplitude_mm\n1,2');
const sha=x=>createHash('sha256').update(x).digest('hex');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(){
  const state={owner:'david',session:{},store:new Map(),binding:null,confirm:true};
  const control=new AbortController();
  const files={
    async read(path){const s=state.store.get(path);return {data:new TextEncoder().encode(s),sha256:sha(s)};},
    async version(path){if(!state.store.has(path))throw Object.assign(Error('Missing'),{status:404});return {sha256:sha(state.store.get(path))};},
    async write(path,blob,expected){const current=state.store.get(path);if(expected!==(current===undefined?null:sha(current)))throw Error('Revision conflict');const s=await blob.text();state.store.set(path,s);return {sha256:sha(s)};}
  };
  const host={session:()=>state.session,storage:{signedInSubject:()=>state.owner,accountFileContext:async()=>({owner:'david',valid:()=>true,files}),pickAccountFile:async o=>o.foldersOnly?'/':'/lab.mathcraft'},
    desktop:{updateAccountFileBinding(w,info){state.binding=info;}},w:{},ui:{prompt:async()=>'lab',confirm:async()=>state.confirm}};
  return {f:accountFiles(host,control.signal),state,control,host,files};
}
test('account save captures a snapshot before the picker and binds the confirmed revision',async()=>{
  const {f,state,host}=fixture(), gate=deferred();host.storage.pickAccountFile=()=>gate.promise;
  const s=sheet(), save=f.save(s);s.params.mass_kg=20;gate.resolve('/');
  assert.equal(await save,'lab.mathcraft');assert.equal(JSON.parse(state.store.get('lab.mathcraft')).params.mass_kg,1);assert.match(state.binding.sha256,/^[a-f0-9]{64}$/);
});
test('save checks the bound digest and preserves a concurrent remote edit',async()=>{
  const {f,state}=fixture();await f.save(sheet());state.store.set('lab.mathcraft','new revision');
  await assert.rejects(f.save(sheet()),/conflict/);assert.equal(state.store.get('lab.mathcraft'),'new revision');
});
test('save as respects an overwrite cancellation',async()=>{
  const {f,state}=fixture();state.store.set('lab.mathcraft','old');state.confirm=false;assert.equal(await f.save(sheet(),true),undefined);assert.equal(state.store.get('lab.mathcraft'),'old');
});
test('an account change during the picker cannot write under another owner',async()=>{
  const {f,state,host}=fixture(), gate=deferred();host.storage.pickAccountFile=()=>gate.promise;
  const save=f.save(sheet());state.owner='other';gate.resolve('/');await assert.rejects(save,/original account/);assert.equal(state.store.size,0);
});
test('a stale launch hash or intervening edit cannot replace the active worksheet',async()=>{
  const {f,state,host,files}=fixture();state.store.set('lab.mathcraft',serialize(sheet()));let applied=0;
  const args={target:{path:'lab.mathcraft',sha256:'a'.repeat(64)},revision:1,getRevision:()=>1,apply:()=>applied++};
  await assert.rejects(f.open(args),/revision changed/);assert.equal(applied,0);
  host.w.launchContext={storage:'account',owner:'david',path:'lab.mathcraft',restore:true};
  assert.equal(f.launch().path,'lab.mathcraft');let rev=1;
  const initial=files.read;files.read=async p=>{rev++;return initial(p);};
  await assert.rejects(f.open({...args,target:f.launch(),getRevision:()=>rev}),/edited during open/);assert.equal(applied,0);
});
test('dispose and traversal are rejected',async()=>{
  const {f,control,host}=fixture();host.w.launchContext={storage:'account',owner:'david',path:'../bad.mathcraft',restore:true};
  assert.throws(()=>f.launch());control.abort();await assert.rejects(f.save(sheet()),/no longer active/);
});
