// Minimal production bootstrap for the existing Node server.
// It does not replace server.js; it only adds the headers required when the
// existing GitHub Pages UI talks to the existing backend on Render.
const http=require('http');

const allowed=new Set(String(process.env.SARA_ALLOWED_ORIGINS||'https://muhammadlai.github.io,https://sara-live-3p8n.vercel.app,http://localhost:3000,http://127.0.0.1:3000').split(',').map(x=>x.trim()).filter(Boolean));
const originalCreateServer=http.createServer;

http.createServer=function patchedCreateServer(listener){
  return originalCreateServer.call(http,(req,res)=>{
    const origin=String(req.headers.origin||'');
    const permitted=allowed.has(origin);
    if(permitted){
      res.setHeader('Access-Control-Allow-Origin',origin);
      res.setHeader('Vary','Origin');
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Headers','Content-Type, Accept, Authorization');
      res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    }

    // Cross-site fetches need a credential cookie that browsers will accept.
    const originalSetHeader=res.setHeader.bind(res);
    res.setHeader=(name,value)=>{
      if(String(name).toLowerCase()==='set-cookie'&&permitted){
        const values=Array.isArray(value)?value:[value];
        value=values.map(cookie=>String(cookie).replace(/;\\s*SameSite=Lax/ig,'; SameSite=None; Secure'));
      }
      return originalSetHeader(name,value);
    };

    if(req.method==='OPTIONS'){
      res.statusCode=204;
      return res.end();
    }
    return listener(req,res);
  });
};

require('./server.js');
