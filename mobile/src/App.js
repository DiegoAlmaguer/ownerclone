import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, Button, Text, FlatList, TouchableOpacity } from 'react-native';
import { api, API } from './api/client';

export default function App() {
  const [phone, setPhone] = useState('+10000000001');
  const [code, setCode] = useState('123456');
  const [token, setToken] = useState('');
  const [me, setMe] = useState(null);
  const [peerQuery, setPeerQuery] = useState('+10000000002');
  const [peers, setPeers] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const wsUrl = useMemo(() => `${API.replace('http', 'ws')}/ws?token=${token}`, [token]);

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === 'MessageCreated' && data.payload.chatId === selectedChat?.id) {
        setMessages((prev) => [...prev, data.payload]);
      }
    };
    return () => ws.close();
  }, [wsUrl, token, selectedChat?.id]);

  const login = async () => {
    try {
      setError('');
      const result = await api('/v1/auth/otp/verify', 'POST', { phone, code, name: phone });
      setToken(result.accessToken);
      setMe(result.user);
      await loadChats(result.accessToken);
    } catch (e) {
      setError(e.message);
    }
  };

  const loadChats = async (authToken = token) => {
    const result = await api('/v1/chats', 'GET', undefined, authToken);
    setChats(result.chats);
  };

  const searchPeers = async () => {
    const result = await api(`/v1/users/search?q=${encodeURIComponent(peerQuery)}`, 'GET', undefined, token);
    setPeers(result.users.filter((u) => u.id !== me?.id));
  };

  const startDirect = async (peerUserId) => {
    const result = await api('/v1/chats/direct', 'POST', { peerUserId }, token);
    await loadChats();
    setSelectedChat(result.chat);
    await openChat(result.chat.id);
  };

  const openChat = async (chatId) => {
    const result = await api(`/v1/messages/${chatId}`, 'GET', undefined, token);
    setSelectedChat(chats.find((c) => c.id === chatId) || { id: chatId });
    setMessages(result.messages);
  };

  const send = async () => {
    if (!selectedChat) return;
    const result = await api('/v1/messages', 'POST', {
      chatId: selectedChat.id,
      clientMessageId: String(Date.now()),
      body: text,
      type: 'text'
    }, token);
    setMessages((prev) => [...prev, result.message]);
    setText('');
  };

  if (!token) {
    return <View style={{ padding: 24, maxWidth: 420, marginHorizontal: 'auto', gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Onyx Web/Mobile</Text>
      <TextInput style={{ borderWidth: 1, padding: 8 }} placeholder='Phone' value={phone} onChangeText={setPhone} />
      <Button title='Send OTP' onPress={() => api('/v1/auth/otp/send', 'POST', { phone })} />
      <TextInput style={{ borderWidth: 1, padding: 8 }} placeholder='OTP code' value={code} onChangeText={setCode} />
      <Button title='Login' onPress={login} />
      {!!error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>;
  }

  return <View style={{ flex: 1, padding: 12, flexDirection: 'row', gap: 12 }}>
    <View style={{ width: 320, borderWidth: 1, padding: 10, gap: 8 }}>
      <Text style={{ fontWeight: '700' }}>You: {me?.phone}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TextInput style={{ borderWidth: 1, flex: 1, padding: 6 }} placeholder='Find by phone/name' value={peerQuery} onChangeText={setPeerQuery} />
        <Button title='Find' onPress={searchPeers} />
      </View>
      <FlatList data={peers} keyExtractor={(i) => i.id} renderItem={({ item }) =>
        <TouchableOpacity onPress={() => startDirect(item.id)} style={{ paddingVertical: 6 }}>
          <Text>➕ {item.name} ({item.phone})</Text>
        </TouchableOpacity>
      } />
      <Text style={{ fontWeight: '700' }}>Chats</Text>
      <FlatList data={chats} keyExtractor={(i) => i.id} renderItem={({ item }) =>
        <TouchableOpacity onPress={() => openChat(item.id)} style={{ paddingVertical: 8, backgroundColor: selectedChat?.id === item.id ? '#f0f0f0' : '#fff' }}>
          <Text>{item.type === 'direct' ? 'Direct chat' : item.title}</Text>
        </TouchableOpacity>
      } />
    </View>

    <View style={{ flex: 1, borderWidth: 1, padding: 10 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Chat: {selectedChat?.id || 'Select chat'}</Text>
      <FlatList data={messages} keyExtractor={(i) => i.id} renderItem={({ item }) =>
        <View style={{ padding: 6, marginBottom: 6, backgroundColor: item.senderId === me?.id ? '#d8fdd2' : '#fff' }}>
          <Text>{item.body}</Text>
          <Text style={{ fontSize: 11, color: '#666' }}>{item.status}</Text>
        </View>
      } />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={{ borderWidth: 1, flex: 1, padding: 8 }} value={text} onChangeText={setText} placeholder='Type a message' />
        <Button title='Send' onPress={send} />
      </View>
    </View>
  </View>;
}
