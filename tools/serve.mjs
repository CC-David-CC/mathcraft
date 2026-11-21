import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=await realpath(fileURLToPath(new URL('../',import.meta.url)));
const port=Number(process.env.PORT??8788);
if (!Number.isInteger(port)||port<1||port>65535) throw Error('PORT must be from 1 to 65535.');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.m':'text/plain','.csv':'text/csv'};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
    const url=new URL(req.url,'http://127.0.0.1'), name=decodeURIComponent(url.pathname);
    if(name.split('/').some(x=>x.startsWith('.')) || name.includes('\\'))throw Error('Invalid path');
    const file=await realpath(path.join(root,name==='/'?'index.html':name));
    if(!file.startsWith(root+path.sep))throw Error('Invalid path');
    const info=await stat(file);if(!info.isFile())throw Error('Invalid file');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
    if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  } catch{res.writeHead(404);res.end('File not found.');}
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('MathCraft is ready at http://127.0.0.1:'+port+'/'));
