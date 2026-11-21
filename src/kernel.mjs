export class Kernel {
  constructor() { this.pending=new Map(); this.serial=0; this.worker=null; this.closed=false; }
  request(kind,payload={},onOutput) {
    if (this.closed) return Promise.reject(Error('Worksheet closed.'));
    if (!this.worker) {
      const w=new Worker(new URL('./octave-worker.js',import.meta.url));
      this.worker=w;
      w.onmessage=({data})=>{
        const p=this.pending.get(data.id);
        if (!p) return;
        if (Object.hasOwn(data,'progress')) { p.onOutput?.(data.progress); return; }
        this.pending.delete(data.id); clearTimeout(p.timer);
        if (data.error) p.reject(Error(data.error+(data.log && !data.log.includes(data.error)?'\n'+data.log:'')));
        else p.resolve(data.data);
      };
      w.onerror=e=>{ if (this.worker===w) this.reset(e.message || 'Could not start the Octave worker.'); };
    }
    return new Promise((resolve,reject)=>{
      const id=++this.serial, timer=setTimeout(()=>this.reset('Calculation timed out. The interpreter was restarted.'),45000);
      this.pending.set(id,{resolve,reject,timer,onOutput});
      this.worker.postMessage({id,kind,payload});
    });
  }
  reset(message='Calculation stopped.') {
    this.worker?.terminate(); this.worker=null;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(Error(message)); }
    this.pending.clear();
  }
  dispose() { this.closed=true; this.reset('Worksheet closed.'); }
}
