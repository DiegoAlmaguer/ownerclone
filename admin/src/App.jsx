import React, { useState } from 'react';

const API = import.meta.env.VITE_API || 'http://localhost:8080';

export function App() {
  const [token, setToken] = useState('');
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);

  const req = (path, opts = {}) => fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) }
  }).then(r => r.json());

  return <div style={{fontFamily:'sans-serif', padding:20}}>
    <h2>Onyx Admin MVP</h2>
    <input placeholder='Admin JWT' value={token} onChange={e=>setToken(e.target.value)} style={{width:'100%'}}/>
    <h3>User Search</h3>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder='id/phone/username'/>
    <button onClick={async()=>setUsers(await req(`/v1/admin/users?q=${encodeURIComponent(q)}`))}>Search</button>
    <ul>{users.map(u=><li key={u.id}>{u.name} ({u.phone}) blocked={String(u.is_blocked)} <button onClick={async()=>{await req(`/v1/admin/users/${u.id}/block`,{method:'POST'});}}>Block</button></li>)}</ul>
    <h3>Reports</h3>
    <button onClick={async()=>setReports(await req('/v1/admin/reports'))}>Load reports</button>
    <pre>{JSON.stringify(reports, null, 2)}</pre>
  </div>;
}
