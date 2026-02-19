import React, { useEffect, useMemo, useState } from 'react';
import { api, connectWs } from './lib/api';

const THEME_KEY = 'onyx_theme';
const TOKEN_KEY = 'onyx_token';
const OUTBOX_KEY = 'onyx_outbox';

const initials = (name = 'U') => name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

function Avatar({ name }) { return <div className='avatar'>{initials(name)}</div>; }

function Toasts({ toasts }) { return <div className='toasts'>{toasts.map((t) => <div key={t.id} className='toast'>{t.text}</div>)}</div>; }

export function App() {
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'dark');
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [phone, setPhone] = useState('+10000000001');
  const [code, setCode] = useState('123456');
  const [name, setName] = useState('');
  const [step, setStep] = useState(1);
  const [me, setMe] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [conn, setConn] = useState('connecting');
  const [toasts, setToasts] = useState([]);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const showToast = (text) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, text }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2500);
  };

  useEffect(() => { document.body.dataset.theme = theme; localStorage.setItem(THEME_KEY, theme); }, [theme]);

  useEffect(() => {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
    bootstrap(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const ws = connectWs(token, onWsEvent, setConn);
    const i = setInterval(() => flushOutbox(token), 2500);
    return () => { ws.close(); clearInterval(i); };
  }, [token, selectedChatId]);

  async function bootstrap(tk) {
    const [meRes, chatsRes] = await Promise.all([api('/v1/users/me', { token: tk }), api('/v1/chats', { token: tk })]);
    setMe(meRes.user);
    setChats((chatsRes.chats || []).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)));
  }

  async function sendCode() { await api('/v1/auth/otp/send', { method: 'POST', body: { phone } }); setStep(2); showToast('Code sent'); }
  async function login() {
    const r = await api('/v1/auth/otp/verify', { method: 'POST', body: { phone, code, name } });
    setToken(r.accessToken);
  }

  async function searchUsers() {
    const r = await api(`/v1/users/search?q=${encodeURIComponent(query)}`, { token });
    setUsers(r.users || []);
  }

  async function createDirect(peerUserId) {
    const r = await api('/v1/chats/direct', { method: 'POST', token, body: { peerUserId } });
    await bootstrap(token);
    setSelectedChatId(r.chat.id);
    await openChat(r.chat.id);
  }

  async function openChat(chatId) {
    setSelectedChatId(chatId);
    const r = await api(`/v1/messages/${chatId}`, { token });
    setMessages(r.messages || []);
  }

  function onWsEvent(evt) {
    if (evt.event === 'messageCreated') {
      const msg = evt.payload;
      setChats((prev) => prev.map((c) => c.id === msg.chatId ? { ...c, updatedAt: msg.createdAt, lastMessage: msg.body } : c));
      if (msg.chatId === selectedChatId) setMessages((prev) => (prev.some((m) => m.clientMessageId === msg.clientMessageId) ? prev : [...prev, msg]));
    }
    if (evt.event === 'messageDelivered' || evt.event === 'messageRead') {
      setMessages((prev) => prev.map((m) => m.id === evt.payload.id ? { ...m, status: evt.payload.status } : m));
    }
  }

  async function uploadAttachment(file) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await api('/v1/media/upload', { method: 'POST', token, body: fd, isForm: true });
    return r.attachment;
  }

  async function sendMessage(payload, optimistic = true) {
    const local = { ...payload, status: 'sending', createdAt: new Date().toISOString(), senderId: me.id, pending: true };
    if (optimistic) setMessages((p) => [...p, local]);
    try {
      const r = await api('/v1/messages', { method: 'POST', token, body: payload });
      setMessages((p) => p.map((m) => m.clientMessageId === payload.clientMessageId ? r.message : m));
      return true;
    } catch {
      queueOutbox({ ...payload, status: 'failed' });
      setMessages((p) => p.map((m) => m.clientMessageId === payload.clientMessageId ? { ...m, status: 'failed' } : m));
      showToast('Message failed, tap Retry');
      return false;
    }
  }

  function queueOutbox(item) {
    const arr = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    arr.push(item);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr));
  }

  async function flushOutbox(tk = token) {
    const arr = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    if (!arr.length) return;
    const remain = [];
    for (const item of arr) {
      try {
        await api('/v1/messages', { method: 'POST', token: tk, body: item });
      } catch { remain.push(item); }
    }
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(remain));
  }

  async function onSend() {
    if (!selectedChatId || (!draft.trim() && !attachment)) return;
    let attachments = [];
    if (attachment) attachments = [await uploadAttachment(attachment)];
    const payload = { chatId: selectedChatId, clientMessageId: crypto.randomUUID(), body: draft, attachments };
    setDraft(''); setAttachment(null);
    await sendMessage(payload);
  }

  if (!token) return <div className='auth'>
    <h1>Welcome to Onyx</h1>
    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder='+10000000001' />
    {step === 1 ? <button onClick={sendCode}>Send code</button> : <>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder='123456' />
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder='Name (optional)' />
      <button onClick={login}>Continue</button>
    </>}
  </div>;

  return <div className='app'>
    <Toasts toasts={toasts} />
    {conn !== 'online' && <div className='banner'>{conn === 'offline' ? 'Offline' : 'Connecting...'}</div>}
    <aside className='sidebar'>
      <div className='sidebarHeader'>
        <Avatar name={me?.name} />
        <div><div className='title'>Onyx</div><div className='sub'>{me?.phone}</div></div>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '🌙'}</button>
      </div>
      <div className='searchRow'>
        <input placeholder='Search users/chats' value={query} onChange={(e)=>setQuery(e.target.value)} />
        <button onClick={searchUsers}>Search</button>
      </div>
      <div className='results'>{users.map((u) => <button key={u.id} onClick={() => createDirect(u.id)} className='userItem'><Avatar name={u.name}/><span>{u.name}</span></button>)}</div>
      <div className='chatList'>
        {!chats.length ? <div className='empty'>No chats yet</div> : chats.map((c) => <button key={c.id} className={`chatItem ${selectedChatId===c.id?'active':''}`} onClick={() => openChat(c.id)}>
          <Avatar name={c.title || 'Direct'} />
          <div className='chatMeta'><div>{c.title || 'Direct chat'}</div><small>{c.lastMessage || 'No messages yet'}</small></div>
        </button>)}
      </div>
    </aside>
    <main className='pane'>
      {!selectedChat ? <div className='empty big'>Select a chat to start messaging</div> : <>
        <header className='chatHeader'><Avatar name={selectedChat.title || 'Direct'} /><div>{selectedChat.title || 'Direct chat'}</div></header>
        <section className='messages'>
          {messages.map((m) => <div key={m.id || m.clientMessageId} className={`bubble ${m.senderId===me.id?'out':'in'} ${m.status==='failed'?'failed':''}`}>
            <div>{m.body}</div>
            {m.attachments?.map((a) => <a key={a.url} href={a.url} target='_blank'>{a.name || 'attachment'}</a>)}
            <small>{new Date(m.createdAt).toLocaleTimeString()} · {m.status}</small>
          </div>)}
        </section>
        <footer className='composer'>
          <label className='attach'>📎<input type='file' onChange={(e)=>setAttachment(e.target.files?.[0]||null)} /></label>
          <textarea value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder='Write a message...' />
          <button onClick={onSend}>Send</button>
        </footer>
      </>}
    </main>
  </div>;
}
