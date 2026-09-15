const http=require('http');
const PORT=Number(process.env.RUNTIME_PORT||process.env.PORT||3000);
const HEARTBEAT_MS=Math.max(15000,Number(process.env.HEARTBEAT_MS||30000));
const BASE_URL=(process.env.SARA_PUBLIC_URL||`http://127.0.0.1:${PORT}`).replace(/\/$/,'');
let lastOk=0,failures=0;
async function heartbeat(){try{const r=await fetch(`${BASE_URL}/api/health`,{headers:{'cache-control':'no-cache'}});if(!r.ok)throw new Error(`health ${r.status}`);const data=await r.json();lastOk=Date.now();failures=0;console.log(JSON.stringify({service:'sara-runtime',event:'heartbeat',ok:true,health:data,time:new Date().toISOString()}));}catch(e){failures++;console.error(JSON.stringify({service:'sara-runtime',event:'heartbeat',ok:false,failures,error:e.message,time:new Date().toISOString()}));}}
const monitor=http.createServer((req,res)=>{if(req.url==='/runtime-health'){const ok=lastOk>0&&Date.now()-lastOk<HEARTBEAT_MS*3;res.writeHead(ok?200:503,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok,lastHeartbeat:lastOk?new Date(lastOk).toISOString():null,failures,uptime:process.uptime()}));}res.writeHead(404);res.end('Not found');});
monitor.listen(Number(process.env.RUNTIME_MONITOR_PORT||9090),()=>console.log('SARA runtime monitor started'));
heartbeat();setInterval(heartbeat,HEARTBEAT_MS).unref();
process.on('SIGTERM',()=>{console.log('SARA runtime stopping');monitor.close(()=>process.exit(0))});
process.on('SIGINT',()=>{console.log('SARA runtime stopping');monitor.close(()=>process.exit(0))});
