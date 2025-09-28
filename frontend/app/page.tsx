// components/ChatRoom.tsx

'use client';

import { useEffect, useRef, useState } from 'react';

type Message = {
  type: 'info' | 'system' | 'message' | 'error';
  params: any;
};

export default function ChatRoom() {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const ws = useRef<WebSocket | null>(null);

  // Connect WebSocket once on mount
  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000');

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    ws.current.onmessage = (event) => {
      const message: Message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);

      if (message.type === 'info' && message.params.room !== 'no room') {
        setRoomCode(message.params.room);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  const send = (type: string, params: any = {}) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, params }));
    }
  };

  const handleCreate = () => send('create');
  const handleJoin = () => {
    const code = prompt('Enter room code:');
    if (code) send('join', { code });
  };
  const handleLeave = () => send('leave');

  const handleSendMessage = () => {
    if (input.trim() !== '') {
      send('message', { message: input });
      setInput('');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>🧩 WebSocket Chat Room</h2>
      <p>Status: {connected ? ' Connected' : ' Disconnected'}</p>
      <p>Current Room: {roomCode || 'None'}</p>

      <div className='flex flex-col gap-2' style={{ marginBottom: 12 }}>
        <button className='bg-green-500' onClick={handleCreate}>Create Room</button>
        <button className='bg-amber-400' onClick={handleJoin}>Join Room</button>
        <button className='bg-red-500' onClick={handleLeave}>Leave Room</button>
      </div>

      <div
        style={{
          border: '1px solid #ccc',
          height: 300,
          overflowY: 'auto',
          padding: 10,
          marginBottom: 12,
          background: '#f9f9f9',
          color:"black"
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} className='text-black'>
            <strong>{msg.type.toUpperCase()}:</strong>{' '}
            {JSON.stringify(msg.params)}
          </div>
        ))}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter a message"
        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        style={{ width: '80%', marginRight: 8 }}
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}
