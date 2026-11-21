import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL('../vendor/octave/',import.meta.url);
const manifest=await readFile(new URL('SHA256SUMS',base),'utf8');
for(const line of manifest.trim().split('\n')){
  const [,expected,name]=/^([a-f0-9]{64})  ([a-zA-Z0-9.-]+)$/.exec(line)??[];
  if(!name)throw Error('Invalid checksum manifest');
  const digest=createHash('sha256').update(await readFile(new URL(name,base))).digest('hex');
  if(digest!==expected)throw Error('Checksum mismatch: '+name);
  console.log('OK '+name);
}
