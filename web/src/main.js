const API_BASE = import.meta.env.VITE_API || '';
const LS_TOKEN = 'onyx_token';
const LS_USER = 'onyx_user';
const LS_THEME = 'onyx_theme';
const LS_OUTBOX = 'onyx_outbox';

let token = localStorage.getItem(LS_TOKEN) || '';
let me = JSON.parse(localStorage.getItem(LS_USER) || 'null');
let chats = [];
let currentChatId = null;
let ws;
let attachOpen = false;
let pendingAttachment = null;

const $ = (id) => document.getElementById(id);

function apiRequest(path, { method = 'GET', body, isForm } = {}) {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  }).then(async (r) => {
    const j = await r.json().catch(() => ({ ok: false, error: { message: 'bad json' } }));
    if (!r.ok) throw new Error(j?.error?.message || 'request failed');
    return j;
  });
}

function wsConnect() {
  if (!token) return;
  ws?.close();
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`);
  ws.onmessage = ({ data }) => {
    const evt = JSON.parse(data);
    if (evt.event === 'messageCreated') {
      const msg = evt.payload;
      const c = chats.find((x) => x.id === msg.chatId);
      if (c) { c.lastMessage = msg.body || (msg.attachments?.length ? '📎 Attachment' : ''); c.updatedAt = msg.createdAt; }
      renderChatList();
      if (msg.chatId === currentChatId) appendMessage(msg);
      if (msg.senderId !== me?.id && msg.chatId === currentChatId && msg.id) markRead(msg);
    }
    if (evt.event === 'messageDelivered' || evt.event === 'messageRead') updateMsgStatus(evt.payload.id, evt.payload.status);
  };
  ws.onclose = () => setTimeout(wsConnect, 1500);
}

function initials(name='U'){return name.split(' ').map((x)=>x[0]).join('').slice(0,2).toUpperCase();}
function avatarColor(str='A'){let h=0;for(const c of str)h=(h*31+c.charCodeAt(0))%360;return `linear-gradient(135deg,hsl(${h} 75% 55%),hsl(${(h+60)%360} 75% 45%))`;}

function showAuth() { $('authOv').classList.remove('gone'); }
function hideAuth() { $('authOv').classList.add('gone'); }

async function loadChats() {
  const r = await apiRequest('/v1/chats');
  chats = (r.chats || []).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  renderChatList();
}

function renderChatList() {
  const q = $('chatSearch').value.toLowerCase();
  $('chatList').innerHTML = '';
  chats.filter((c)=>!q || (c.title||'Direct').toLowerCase().includes(q) || (c.lastMessage||'').toLowerCase().includes(q)).forEach((c)=>{
    const el = document.createElement('div');
    el.className = `ci ${c.id===currentChatId?'on':''}`;
    const t = new Date(c.updatedAt || Date.now());
    el.innerHTML = `<div class='avatar' style='background:${avatarColor(c.title||c.id)}'>${initials(c.title||'D')}</div><div class='ci-info'><div class='ci-name'>${c.title||'Direct chat'}</div><div class='ci-prev'>${(c.lastMessage||'No messages').replace(/</g,'&lt;')}</div></div><div class='ci-time'>${t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>`;
    el.onclick = ()=>openChat(c.id);
    $('chatList').appendChild(el);
  });
}

async function openChat(chatId) {
  currentChatId = chatId;
  renderChatList();
  $('welcome').style.display='none'; $('msgsWrap').style.display='block'; $('inpArea').style.display='flex'; $('topbar').style.display='flex';
  const ch = chats.find((c)=>c.id===chatId);
  $('topName').textContent = ch?.title || 'Direct chat'; $('topStatus').textContent='online';
  $('topAv').style.background = avatarColor(ch?.title||'D'); $('topAv').textContent = initials(ch?.title||'D');
  const r = await apiRequest(`/v1/messages/${chatId}`);
  $('msgs').innerHTML = '';
  (r.messages||[]).forEach(appendMessage);
  scrollBot();
}

function messageHtml(m) {
  const isOut = m.senderId === me?.id;
  let content = '';
  if (m.body) content += `<div>${m.body.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>`;
  (m.attachments||[]).forEach((a)=>{
    if ((a.contentType||'').startsWith('image/')) content += `<img class='msg-img' src='${a.url}' onclick='window.openLb(${JSON.stringify(a.url)})'>`;
    else content += `<a class='file-box' href='${a.url}' target='_blank'><div>📄</div><div><div>${a.name||'file'}</div><div>${Math.round((a.size||0)/1024)} KB</div></div></a>`;
  });
  return `<div class='msg ${isOut?'out':'in'}' data-id='${m.id||''}' data-client='${m.clientMessageId||''}'><div><div class='bubble'>${content}</div><div class='msg-foot'><span class='mtime'>${new Date(m.createdAt||Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><span class='mtime status'>${m.status||'sent'}</span>${m.status==='failed'?`<button data-retry='${m.clientMessageId}'>Retry</button>`:''}</div></div></div>`;
}

function appendMessage(m){
  if (m.clientMessageId && $('msgs').querySelector(`[data-client='${m.clientMessageId}']`)) return;
  $('msgs').insertAdjacentHTML('beforeend', messageHtml(m));
  $('msgs').querySelectorAll('button[data-retry]').forEach((b)=>b.onclick=()=>retryMessage(b.dataset.retry));
  scrollBot();
}

function updateMsgStatus(id,status){
  const el = $('msgs').querySelector(`[data-id='${id}'] .status`); if(el) el.textContent=status;
}

async function markRead(msg){ try{ await apiRequest(`/v1/messages/${msg.chatId}/${msg.id}/read`,{method:'POST'});}catch{} }

function queueOutbox(item){ const arr=JSON.parse(localStorage.getItem(LS_OUTBOX)||'[]'); arr.push(item); localStorage.setItem(LS_OUTBOX,JSON.stringify(arr)); }
async function flushOutbox(){
  const arr=JSON.parse(localStorage.getItem(LS_OUTBOX)||'[]'); if(!arr.length) return;
  const next=[];
  for(const m of arr){try{const r=await apiRequest('/v1/messages',{method:'POST',body:m}); updateLocalPending(m.clientMessageId,r.message);}catch{next.push(m)}}
  localStorage.setItem(LS_OUTBOX,JSON.stringify(next));
}
function updateLocalPending(clientId,msg){ const node=$('msgs').querySelector(`[data-client='${clientId}']`); if(node) node.outerHTML=messageHtml(msg); }

async function sendMessage(){
  if(!currentChatId) return;
  const body = $('msgTa').value.trim();
  if(!body && !pendingAttachment) return;
  const payload = { chatId: currentChatId, clientMessageId: crypto.randomUUID(), body, attachments: pendingAttachment?[pendingAttachment]:[] };
  $('msgTa').value=''; pendingAttachment=null;
  appendMessage({ ...payload, senderId: me.id, createdAt:new Date().toISOString(), status:'pending' });
  try {
    const r = await apiRequest('/v1/messages', { method:'POST', body: payload });
    updateLocalPending(payload.clientMessageId,r.message);
  } catch {
    queueOutbox(payload);
    const node=$('msgs').querySelector(`[data-client='${payload.clientMessageId}'] .status`); if(node) node.textContent='failed';
  }
}

async function retryMessage(clientId){
  const arr=JSON.parse(localStorage.getItem(LS_OUTBOX)||'[]'); const idx=arr.findIndex((x)=>x.clientMessageId===clientId); if(idx<0) return;
  try{const r=await apiRequest('/v1/messages',{method:'POST',body:arr[idx]}); arr.splice(idx,1); localStorage.setItem(LS_OUTBOX,JSON.stringify(arr)); updateLocalPending(clientId,r.message);}catch{}
}

async function uploadFile(file){ const fd=new FormData(); fd.append('file',file); const r=await apiRequest('/v1/media/upload',{method:'POST',body:fd,isForm:true}); return r.attachment; }

async function authSendCode(){
  const phone=$('phoneInp').value.trim(); if(!phone) return;
  const r=await apiRequest('/v1/auth/otp/send',{method:'POST',body:{phone}});
  $('authHint').textContent=`Код отправлен. Dev code: ${r.code}`;
  $('stepPhone').style.display='none'; $('stepCode').style.display='block';
}
async function authVerify(){
  const phone=$('phoneInp').value.trim(); const code=$('codeInp').value.trim(); const name=$('nameInp').value.trim()||'User';
  const r=await apiRequest('/v1/auth/otp/verify',{method:'POST',body:{phone,code,name}});
  token=r.accessToken; me=r.user; localStorage.setItem(LS_TOKEN,token); localStorage.setItem(LS_USER,JSON.stringify(me));
  $('myAv').textContent=initials(me.name); $('myAv').style.background=avatarColor(me.name); $('myName').textContent=me.name;
  hideAuth(); await loadChats(); wsConnect();
}

async function searchUsersRemote(){
  const q=$('userSearchInp').value.trim();
  const r=await apiRequest(`/v1/users/search?q=${encodeURIComponent(q)}`);
  $('userResults').innerHTML=(r.users||[]).filter((u)=>u.id!==me.id).map((u)=>`<div class='ci' data-user='${u.id}'><div class='avatar' style='background:${avatarColor(u.name)}'>${initials(u.name)}</div><div class='ci-info'><div class='ci-name'>${u.name}</div><div class='ci-prev'>${u.phone}</div></div></div>`).join('')||"<div class='sec-label'>No results</div>";
  $('userResults').querySelectorAll('[data-user]').forEach((n)=>n.onclick=async()=>{const x=await apiRequest('/v1/chats/direct',{method:'POST',body:{peerUserId:n.dataset.user}}); $('createModal').classList.remove('vis'); await loadChats(); openChat(x.chat.id);});
}

window.openLb = (src)=>{ $('lbImg').src=src; $('lb').classList.add('vis'); };
window.closeLb = ()=> $('lb').classList.remove('vis');

$('sendCodeBtn').onclick=()=>authSendCode().catch(alert);
$('verifyBtn').onclick=()=>authVerify().catch(alert);
$('backBtn').onclick=()=>{ $('stepCode').style.display='none'; $('stepPhone').style.display='block'; };
$('chatSearch').oninput=renderChatList;
$('sendBtn').onclick=()=>sendMessage().catch(()=>{});
$('msgTa').onkeydown=(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}};
$('themeBtn').onclick=()=>{const t=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'; document.documentElement.setAttribute('data-theme',t); localStorage.setItem(LS_THEME,t);};
$('attBtn').onclick=()=>{attachOpen=!attachOpen; $('attPopup').classList.toggle('vis',attachOpen);};
$('imgPick').onclick=()=>$('imgIn').click(); $('filePick').onclick=()=>$('fileIn').click();
$('imgIn').onchange=async(e)=>{const f=e.target.files?.[0]; if(!f) return; pendingAttachment=await uploadFile(f); attachOpen=false; $('attPopup').classList.remove('vis');};
$('fileIn').onchange=async(e)=>{const f=e.target.files?.[0]; if(!f) return; pendingAttachment=await uploadFile(f); attachOpen=false; $('attPopup').classList.remove('vis');};
$('newChatBtn').onclick=()=>{ $('createModal').classList.add('vis'); $('userSearchInp').focus(); };
$('closeCreateBtn').onclick=()=> $('createModal').classList.remove('vis');
$('createModal').onclick=(e)=>{if(e.target===$('createModal')) $('createModal').classList.remove('vis');};
$('userSearchInp').oninput=()=>searchUsersRemote().catch(()=>{});

function scrollBot(){const w=$('msgsWrap'); w.scrollTop=w.scrollHeight;}

const savedTheme = localStorage.getItem(LS_THEME); if(savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
if (token && me) { hideAuth(); $('myAv').textContent=initials(me.name); $('myAv').style.background=avatarColor(me.name); $('myName').textContent=me.name; loadChats().then(wsConnect); }
setInterval(flushOutbox, 3000);
