const DEFAULT_BACKEND=()=>process.env.SARA_PUBLIC_URL||`http://127.0.0.1:${process.env.PORT||3000}`;

let modPromise=null;
let connection=null;
let connectedUsername=null;
let state={connected:false,connecting:false,username:null,roomId:null,lastError:null,startedAt:null};

async function load(){
  if(!modPromise) modPromise=import('tiktok-live-connector');
  return modPromise;
}

function normalizeUser(data){
  return data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'viewer';
}

async function post(path,payload){
  const base=DEFAULT_BACKEND().replace(/\/$/,'');
  try{
    await fetch(base+path,{
      method:'POST',
      headers:{'Content-Type':'application/json','x-sara-event-key':process.env.SARA_EVENT_INGEST_KEY||''},
      body:JSON.stringify(payload)
    });
  }catch(err){
    console.error('[tiktok-live] backend event error:',err.message);
  }
}

async function startTikTokLive(username){
  const uniqueId=String(username||process.env.TIKTOK_LIVE_USERNAME||'').trim().replace(/^@/,'');
  if(!uniqueId) throw new Error('TIKTOK_LIVE_USERNAME is required.');
  if(connection && connectedUsername===uniqueId && state.connected) return state;

  if(connection){
    try{ await connection.disconnect(); }catch{}
    connection=null;
  }

  const {TikTokLiveConnection,WebcastEvent,ControlEvent}=await load();
  state={connected:false,connecting:true,username:uniqueId,roomId:null,lastError:null,startedAt:Date.now()};
  connectedUsername=uniqueId;

  const options={};
  if(process.env.TIKTOK_LIVE_SIGN_API_KEY) options.signApiKey=process.env.TIKTOK_LIVE_SIGN_API_KEY;
  connection=new TikTokLiveConnection(uniqueId,options);

  const event=(type,payload)=>post('/api/sara/event',{type,...payload,source:'tiktok-live-connector'});

  connection.on(ControlEvent.CONNECTED||'connected',(data)=>{
    state.connected=true;state.connecting=false;state.roomId=data?.roomId||null;state.lastError=null;
    event('system',{text:`TikTok LIVE connected: @${uniqueId}`,roomId:state.roomId});
  });
  connection.on(ControlEvent.DISCONNECTED||'disconnected',()=>{
    state.connected=false;state.connecting=false;
    event('system',{text:`TikTok LIVE disconnected: @${uniqueId}`});
  });
  connection.on(ControlEvent.ERROR||'error',(err)=>{
    state.lastError=err?.message||String(err);state.connecting=false;
    event('system',{text:'TikTok LIVE connector error: '+state.lastError});
  });

  connection.on(WebcastEvent.CHAT||'chat',async(data)=>{
    const text=String(data?.comment||'').trim();
    if(!text) return;
    const viewerId=normalizeUser(data);
    await event('comment',{viewerId,text});
    if(String(process.env.SARA_AUTO_REPLY_LIVE||'false').toLowerCase()==='true'){
      await post('/api/sara/message',{text,language:'ur',source:'tiktok-live-comment',viewerId});
    }
  });

  connection.on(WebcastEvent.GIFT||'gift',async(data)=>{
    const giftName=String(data?.giftName||data?.gift?.name||data?.giftId||'Gift');
    const giftCount=Math.max(1,Number(data?.repeatCount||data?.gift?.repeatCount||1));
    await event('gift',{viewerId:normalizeUser(data),giftName,giftCount,text:`${giftName} x${giftCount}`});
  });

  connection.on(WebcastEvent.LIKE||'like',(data)=>event('like',{viewerId:normalizeUser(data),text:String(data?.likeCount||data?.count||'')}));
  connection.on(WebcastEvent.MEMBER||'member',(data)=>event('follow',{viewerId:normalizeUser(data),text:'joined'}));
  connection.on(WebcastEvent.SOCIAL||'social',(data)=>event('share',{viewerId:normalizeUser(data),text:String(data?.displayType||data?.shareType||'share')}));

  try{
    const result=await connection.connect();
    state.connected=true;state.connecting=false;state.roomId=result?.roomId||state.roomId;
    return state;
  }catch(err){
    state.connected=false;state.connecting=false;state.lastError=err?.message||String(err);
    connection=null;
    throw err;
  }
}

async function stopTikTokLive(){
  if(connection){
    try{await connection.disconnect();}catch{}
  }
  connection=null;connectedUsername=null;
  state={connected:false,connecting:false,username:null,roomId:null,lastError:null,startedAt:null};
  return state;
}

function getTikTokLiveState(){return {...state};}

module.exports={startTikTokLive,stopTikTokLive,getTikTokLiveState};
