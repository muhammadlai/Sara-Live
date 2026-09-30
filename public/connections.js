async function refreshConnections(){
  const r=await api('/api/connectors/status');
  const x=await r.json();
  ['openai','elevenlabs','liveavatar'].forEach(p=>{
    const el=document.getElementById(p+'State');
    const c=x[p];
    if(!el)return;
    if(!c||c.status==='not_configured'){el.textContent='Not connected';return}
    const exp=c.expiresAt?new Date(c.expiresAt).toLocaleString():'Provider expiry not available';
    el.textContent='Connected • '+exp;
  });
  const me=await (await api('/api/me')).json();
  const t=document.getElementById('cpTikTokState');
  if(t)t.textContent=me.authenticated?'TikTok connected • Access token: '+(me.accessTokenExpiresAt?new Date(me.accessTokenExpiresAt).toLocaleString():'unknown'):'Not connected';
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
  const panel=document.getElementById('connectionPanel');
  if(!panel)return;
  document.getElementById('settings').onclick=async()=>{panel.classList.add('open');await refreshConnections()};
  document.getElementById('cpClose').onclick=()=>panel.classList.remove('open');
  document.getElementById('cpTikTok').onclick=()=>{if(BACKEND_URL)location.href=BACKEND_URL.replace(/\/$/,'')+'/auth/tiktok'};
  document.getElementById('cpTikTokRefresh').onclick=refreshConnections;
  document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveConnector(b.dataset.save).catch(e=>alert(e.message)));
  document.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>testConnector(b.dataset.test).catch(e=>alert(e.message)));
  document.querySelectorAll('[data-disconnect]').forEach(b=>b.onclick=()=>disconnectConnector(b.dataset.disconnect).catch(e=>alert(e.message)));
}
