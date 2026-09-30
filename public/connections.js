// GitHub Pages is static, so point the existing UI at the deployed Node backend by default.
// This remains overrideable with ?backend=https://... or localStorage.sara_backend_url.
window.SARA_BACKEND_URL=window.SARA_BACKEND_URL||'https://sara-live.onrender.com';

async function refreshConnections(){
  const r=await api('/api/connectors/status');
  const x=await r.json();
  ['openai','elevenlabs','liveavatar'].forEach(p=>{
    const el=document.getElementById(p+'State');
    const c=x[p];
    if(!el)return;
    if(!c||c.status==='not_configured'){el.textContent='Not connected';return}
    const exp=c.expiresAt?new Date(c.expiresAt).toLocaleString():'Expiry information not provided by provider';
    el.textContent='Connected • '+exp;
  });
  const me=await (await api('/api/me')).json();
  const t=document.getElementById('cpTikTokState');
  if(t)t.textContent=me.authenticated?'TikTok connected • Access token: '+(me.accessTokenExpiresAt?new Date(me.accessTokenExpiresAt).toLocaleString():'provider did not provide expiry'):'Not connected';
}
async function saveConnector(provider){
  const apiKey=document.getElementById(provider+'Key').value.trim();
  if(!apiKey){alert('API key required');return}
  const data={provider,apiKey};
  if(provider==='openai')data.model=document.getElementById('openaiModel').value.trim();
  if(provider==='elevenlabs')data.voiceId=document.getElementById('elevenlabsVoice').value.trim();
  if(provider==='liveavatar'){data.avatarId=document.getElementById('liveavatarId').value.trim();data.sandbox=document.getElementById('liveavatarSandbox').checked}
  const r=await api('/api/connectors/configure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const x=await r.json();
  if(!r.ok)throw Error(x.error||'Save failed');
  document.getElementById(provider+'Key').value='';
  await refreshConnections();
}
async function testConnector(provider){
  const r=await api('/api/connectors/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider})});
  const x=await r.json();
  if(!r.ok)throw Error(x.error||'Test failed');
  await refreshConnections();
}
async function disconnectConnector(provider){
  const r=await api('/api/connectors/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider})});
  const x=await r.json();
  if(!r.ok)throw Error(x.error||'Disconnect failed');
  await refreshConnections();
}
function initConnections(){
  const panel=document.getElementById('connectionPanel'), content=document.getElementById('connectionContent');
  if(!panel||!content)return;
  content.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center"><div><h2 style="margin:0 0 5px">SARA Connections</h2><div style="color:#98a2b3;font-size:12px">TikTok OAuth + AI service connectors</div></div><button class="btn" id="cpClose">Close</button></div>
    <div class="connector"><h3>TikTok</h3><div style="color:#98a2b3;font-size:12px">Official OAuth connection.</div><div class="row"><button class="btn primary" id="cpTikTok">Connect TikTok</button><button class="btn" id="cpTikTokRefresh">Refresh</button></div><div id="cpTikTokState">Checking...</div></div>
    <div class="connector"><h3>OpenAI</h3><div style="color:#98a2b3;font-size:12px">Configure the AI model and credential.</div><div class="row"><input id="openaiKey" type="password" placeholder="Credential"><input id="openaiModel" value="gpt-5.6" placeholder="Model"></div><div class="row"><button class="btn primary" data-save="openai">Save</button><button class="btn" data-test="openai">Test</button><button class="btn" data-disconnect="openai">Disconnect</button></div><div id="openaiState">Not connected</div></div>
    <div class="connector"><h3>ElevenLabs</h3><div style="color:#98a2b3;font-size:12px">Configure the voice service and voice ID.</div><div class="row"><input id="elevenlabsKey" type="password" placeholder="Credential"><input id="elevenlabsVoice" placeholder="Voice ID"></div><div class="row"><button class="btn primary" data-save="elevenlabs">Save</button><button class="btn" data-test="elevenlabs">Test</button><button class="btn" data-disconnect="elevenlabs">Disconnect</button></div><div id="elevenlabsState">Not connected</div></div>
    <div class="connector"><h3>LiveAvatar</h3><div style="color:#98a2b3;font-size:12px">Configure avatar session access.</div><div class="row"><input id="liveavatarKey" type="password" placeholder="Credential"><input id="liveavatarId" placeholder="Avatar ID"></div><div class="row"><label style="color:#98a2b3;font-size:12px"><input id="liveavatarSandbox" type="checkbox"> Sandbox</label></div><div class="row"><button class="btn primary" data-save="liveavatar">Save</button><button class="btn" data-test="liveavatar">Test</button><button class="btn" data-disconnect="liveavatar">Disconnect</button></div><div id="liveavatarState">Not connected</div></div>
    <div style="color:#98a2b3;font-size:12px">Expiry is displayed only when a provider supplies it. No artificial expiry is invented for credentials.</div>`;
  document.getElementById('settings').onclick=async()=>{panel.classList.add('open');try{await refreshConnections()}catch(e){alert('SARA backend is not reachable: '+e.message)}};
  document.getElementById('cpClose').onclick=()=>panel.classList.remove('open');
  document.getElementById('cpTikTok').onclick=()=>{if(BACKEND_URL)location.href=BACKEND_URL.replace(/\/$/,'')+'/auth/tiktok';else alert('SARA backend URL is not configured.')};
  document.getElementById('cpTikTokRefresh').onclick=()=>refreshConnections().catch(e=>alert(e.message));
  document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveConnector(b.dataset.save).catch(e=>alert(e.message)));
  document.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>testConnector(b.dataset.test).catch(e=>alert(e.message)));
  document.querySelectorAll('[data-disconnect]').forEach(b=>b.onclick=()=>disconnectConnector(b.dataset.disconnect).catch(e=>alert(e.message)));
}
