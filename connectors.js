const crypto=require('crypto');

const sessions=new Map();

function now(){return Date.now()}
function get(sessionId){
  if(!sessionId) return {};
  return sessions.get(sessionId)||{};
}
function ensure(sessionId){
  if(!sessions.has(sessionId)) sessions.set(sessionId,{});
  return sessions.get(sessionId);
}
function mask(value){
  const v=String(value||'');
  if(!v) return null;
  if(v.length<=8) return '••••••••';
  return v.slice(0,4)+'••••••••'+v.slice(-4);
}
function publicOne(provider,cfg){
  if(!cfg) return {provider,status:'not_configured'};
  return {
    provider,
    status:cfg.status||'configured',
    configuredAt:cfg.configuredAt||null,
    lastTestAt:cfg.lastTestAt||null,
    lastError:cfg.lastError||null,
    keyPresent:!!cfg.apiKey,
    keyPreview:mask(cfg.apiKey),
    expiresAt:cfg.expiresAt||null,
    expiryKnown:!!cfg.expiresAt,
    model:cfg.model||null,
    voiceId:cfg.voiceId||null,
    avatarId:cfg.avatarId||null,
    sandbox:!!cfg.sandbox
  };
}
function status(sessionId){
  const s=get(sessionId);
  return {
    openai:publicOne('openai',s.openai),
    elevenlabs:publicOne('elevenlabs',s.elevenlabs),
    liveavatar:publicOne('liveavatar',s.liveavatar),
    note:'Provider expiry is shown only when the provider supplies it. API keys without an expiry field are reported as configured/tested, not given a made-up number of days.'
  };
}
function configure(sessionId,provider,input){
  const allowed=['openai','elevenlabs','liveavatar'];
  if(!allowed.includes(provider)) throw Error('Unsupported connector');
  const s=ensure(sessionId);
  const key=String(input.apiKey||'').trim();
  if(!key) throw Error('API key is required');
  const cfg={...(s[provider]||{}),apiKey:key,configuredAt:now(),status:'configured',lastError:null};
  if(provider==='openai') cfg.model=String(input.model||cfg.model||'gpt-5.6').trim();
  if(provider==='elevenlabs') cfg.voiceId=String(input.voiceId||cfg.voiceId||'').trim();
  if(provider==='liveavatar'){
    cfg.avatarId=String(input.avatarId||cfg.avatarId||'').trim();
    cfg.sandbox=!!input.sandbox;
  }
  s[provider]=cfg;
  return publicOne(provider,cfg);
}
function disconnect(sessionId,provider){
  const s=ensure(sessionId);
  delete s[provider];
  return publicOne(provider,null);
}
async function test(sessionId,provider){
  const s=ensure(sessionId),cfg=s[provider];
  if(!cfg?.apiKey) throw Error('Connector is not configured');
  let detail={};
  if(provider==='openai'){
    const rr=await fetch('https://api.openai.com/v1/models',{headers:{Authorization:'Bearer '+cfg.apiKey}});
    const d=await rr.json().catch(()=>({}));
    if(!rr.ok) throw Error(d?.error?.message||`OpenAI connection failed (${rr.status})`);
    detail.modelsAvailable=Array.isArray(d.data)?d.data.length:null;
  }else if(provider==='elevenlabs'){
    const rr=await fetch('https://api.elevenlabs.io/v1/user',{headers:{'xi-api-key':cfg.apiKey}});
    const d=await rr.json().catch(()=>({}));
    if(!rr.ok) throw Error(d?.detail?.message||d?.detail||`ElevenLabs connection failed (${rr.status})`);
    detail.subscription=d?.subscription?.tier||null;
    detail.characterCount=d?.subscription?.character_count||null;
  }else if(provider==='liveavatar'){
    if(!cfg.avatarId) throw Error('LiveAvatar avatar ID is required');
    const rr=await fetch('https://api.liveavatar.com/v1/sessions/token',{
      method:'POST',
      headers:{'X-API-KEY':cfg.apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({mode:'LITE',avatar_id:cfg.avatarId,is_sandbox:!!cfg.sandbox})
    });
    const d=await rr.json().catch(()=>({}));
    if(!rr.ok) throw Error(d?.data?.message||d?.error?.message||`LiveAvatar connection failed (${rr.status})`);
    detail.sessionTokenReceived=!!d?.data?.session_token;
  }else throw Error('Unsupported connector');
  cfg.status='connected';cfg.lastTestAt=now();cfg.lastError=null;
  return {ok:true,provider,status:publicOne(provider,cfg),detail};
}
function runtimeConfig(sessionId,provider,env){
  const cfg=get(sessionId)[provider];
  if(cfg?.apiKey) return cfg;
  return env||null;
}
module.exports={status,configure,disconnect,test,runtimeConfig,get};
