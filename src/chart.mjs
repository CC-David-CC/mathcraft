const modes={
  amplitude:{axis:'Peak displacement (mm)',col:1,measured:1},
  phase:{axis:'Phase lag (°)',col:2,measured:2},
  residual:{axis:'Measured − predicted (mm)',col:3}
};
const shown = x => Number.isFinite(x) ? Number(x.toPrecision(5)).toString() : 'undefined';
function step(span,target) {
  const unit=10**Math.floor(Math.log10(span/target));
  return ([1,2,2.5,5,10].find(n=>n*unit>=span/target) || 10)*unit;
}
function nearest(rows,x) {
  let best=null;
  for (const row of rows) if (!best || Math.abs(row[0]-x)<Math.abs(best[0]-x)) best=row;
  return best;
}
export function chartPalette(canvas) {
  const style=getComputedStyle(canvas);
  const theme=style.colorScheme==='dark'?'dark':'light';
  return name=>style.getPropertyValue('--chart-'+name+'-'+theme).trim();
}
export function makeChart(canvas,readout,signal) {
  let data=null, mode='amplitude', focus=null, transform;
  const ctx=canvas.getContext('2d');
  function draw() {
    if (!ctx || !canvas.clientWidth || !canvas.clientHeight) return;
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,3);
    canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    const colorOf=chartPalette(canvas);    const l=w<430?53:66,r=w-16,t=28,b=h-38;
    const label=(s,x,y,align='left',color=colorOf('text'))=>{ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);};
    const line=(x,y,x2,y2,color)=>{ctx.beginPath();ctx.strokeStyle=color;ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
    const info=modes[mode]; ctx.font='12px system-ui';ctx.fillStyle=colorOf('background');ctx.fillRect(0,0,w,h);
    label(info.axis,l,15); label('Speed (rpm)',(l+r)/2,h-4,'center');
    if (!data) {label('Run the model to draw a response.',(l+r)/2,(t+b)/2,'center');return;}
    const {result,reference,measurements,maxRPM,naturalRPM}=data;
    const residual=mode==='residual';
    const live=residual?result.predictions:result.curve;
    const base=residual?reference?.result.predictions:reference?.result.curve;
    const points=residual?[]:measurements;
    const col=info.col;
    let lo=0,hi=mode==='phase'?180:0;
    for (const [rows,k] of [[live,col],[base??[],col],[points,info.measured]]) for(const row of rows){
      if (row[0]<=maxRPM && Number.isFinite(row[k])) { lo=Math.min(lo,row[k]);hi=Math.max(hi,row[k]); }
    }
    if (lo===hi) {if(residual)lo=-1;hi=lo===0?1:Math.max(1,hi);}
    const dy=step(hi-lo,5);
    lo=Math.floor(lo/dy)*dy;hi=Math.ceil(hi/dy)*dy;
    const X=x=>l+(r-l)*x/maxRPM,Y=y=>b-(b-t)*(y-lo)/(hi-lo);
    transform={l,r,maxRPM};
    ctx.lineWidth=1;
    for(let i=0;i<=Math.round((hi-lo)/dy);i++){const y=lo+i*dy;line(l,Y(y),r,Y(y),colorOf('grid-horizontal'));label(shown(Math.abs(y)<dy*1e-8?0:y),l-7,Y(y)+4,'right');}
    const dx=step(maxRPM,w<450?4:7);
    for(let i=0;i*dx<=maxRPM*(1+1e-10);i++){const x=i*dx;line(X(x),t,X(x),b,colorOf('grid-vertical'));label(shown(x),X(x),b+16,'center');}
    ctx.save();ctx.beginPath();ctx.rect(l,t,r-l,b-t);ctx.clip();
    if(naturalRPM<=maxRPM){ctx.setLineDash([2,4]);line(X(naturalRPM),t,X(naturalRPM),b,colorOf('marker'));ctx.setLineDash([]);}
    function series(rows,k,color,dashed,markers) {
      ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.4;ctx.setLineDash(dashed?[6,4]:[]);ctx.beginPath();let pen=false;
      for(const row of rows){const x=X(row[0]),v=row[k]; if(!Number.isFinite(v)){pen=false;continue;}
        if(markers){ctx.moveTo(x+3.4,Y(v));ctx.arc(x,Y(v),3.4,0,2*Math.PI);}
        else {if(pen)ctx.lineTo(x,Y(v));else ctx.moveTo(x,Y(v));pen=true;}}
      if(markers)ctx.fill();else ctx.stroke();ctx.setLineDash([]);
    }
    if(base)series(base,col,colorOf('pinned'),true,residual);
    series(live,col,colorOf('current'),false,residual);
    if(!residual)series(points,info.measured,colorOf('points'),false,true);
    if(focus!==null){
      const x=Math.max(0,Math.min(maxRPM,focus)), model=nearest(live,x), measured=nearest(points,x);
      ctx.lineWidth=1;line(X(x),t,X(x),b,colorOf('focus'));
      if(measured && Math.abs(measured[0]-x)<maxRPM*.025){
        const pred=result.predictions[points.indexOf(measured)];
        readout.textContent=shown(measured[0])+' rpm · measured '+shown(measured[1])+' mm · predicted '+shown(pred?.[2])+' mm · residual '+shown(pred?.[3])+' mm';
      } else if(model)readout.textContent=shown(model[0])+' rpm · '+info.axis+' '+shown(model[col]);
    }
    ctx.restore();
  }
  function select(e){if(!transform || !data)return;const rect=canvas.getBoundingClientRect();focus=(e.clientX-rect.left-transform.l)*transform.maxRPM/(transform.r-transform.l);draw();}
  canvas.addEventListener('pointerdown',select,{signal});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')select(e);},{signal});
  canvas.addEventListener('keydown',e=>{
    if(!data || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const max=data.maxRPM;
    focus=e.key==='Home'?0:e.key==='End'?max:Math.max(0,Math.min(max,(focus??0)+(e.key==='ArrowRight'?1:-1)*max/100));draw();
  },{signal});
  const ro=new ResizeObserver(draw);ro.observe(canvas);signal.addEventListener('abort',()=>ro.disconnect(),{once:true});
  return {set(d,m){data=d;mode=m;readout.textContent=d?'Inspect the curve or a measured point. Use ← and → on the graph.':'Waiting for a calculation.';draw();},draw};
}
