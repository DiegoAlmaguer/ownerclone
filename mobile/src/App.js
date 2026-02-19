import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Button, Text, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API } from './api/client';

export default function App() {
  const [phone, setPhone] = useState('+10000000001');
  const [code, setCode] = useState('123456');
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const wsRef = useRef(null);

  useEffect(() => { AsyncStorage.getItem('outbox').then(v => v && setMessages(JSON.parse(v))); }, []);
  useEffect(() => {
    if (!token) return;
    wsRef.current = new WebSocket(`${API.replace('http','ws')}/ws?token=${token}`);
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === 'MessageCreated') setMessages((prev)=>[...prev, msg.payload]);
    };
    return () => wsRef.current?.close();
  }, [token]);

  const flushOutbox = async () => {
    const raw = await AsyncStorage.getItem('outbox');
    if (!raw || !chatId) return;
    const outbox = JSON.parse(raw);
    for (const m of outbox) await api(`/v1/messages/${chatId}`,'POST',m,token);
    await AsyncStorage.removeItem('outbox');
  };

  const send = async () => {
    const payload = { clientMessageId: String(Date.now()), body: text, type: 'text' };
    try {
      const m = await api(`/v1/messages/${chatId}`,'POST',payload,token);
      setMessages((p)=>[...p,m]);
    } catch {
      const raw = await AsyncStorage.getItem('outbox');
      const outbox = raw ? JSON.parse(raw) : [];
      outbox.push(payload);
      await AsyncStorage.setItem('outbox', JSON.stringify(outbox));
    }
    setText('');
  };

  return <View style={{padding:30, gap:8}}>
    <Text>Onyx Mobile MVP</Text>
    <TextInput placeholder='phone' value={phone} onChangeText={setPhone} style={{borderWidth:1,padding:6}}/>
    <Button title='Send OTP' onPress={()=>api('/v1/auth/otp/send','POST',{phone})}/>
    <TextInput placeholder='code' value={code} onChangeText={setCode} style={{borderWidth:1,padding:6}}/>
    <Button title='Login' onPress={async()=>{ const r=await api('/v1/auth/otp/verify','POST',{phone,code,name:'Mobile User'}); setToken(r.accessToken); }}/>
    <TextInput placeholder='chat id' value={chatId} onChangeText={setChatId} style={{borderWidth:1,padding:6}}/>
    <Button title='Flush offline queue' onPress={flushOutbox}/>
    <TextInput placeholder='message' value={text} onChangeText={setText} style={{borderWidth:1,padding:6}}/>
    <Button title='Send message' onPress={send} />
    <FlatList data={messages} keyExtractor={(i,idx)=>i.id||String(idx)} renderItem={({item})=><Text>{item.body} ({item.status})</Text>}/>
  </View>;
}
