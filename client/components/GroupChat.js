import { useEffect, useRef, useState } from 'react';

export default function GroupChat({ socketRef, name, title = 'Group Chat', channel, roomId, className = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const onMessage = (msg) => {
      const incomingRoom = msg?.roomId;
      const incomingChannel = msg?.channel;
      
      // Only filter if we have BOTH values to compare
      // If roomId is set and incoming message has a different roomId, skip
      if (roomId && incomingRoom && incomingRoom !== roomId) {
        console.log('Filtered out by roomId:', { expected: roomId, incoming: incomingRoom });
        return;
      }
      
      // If channel is set and incoming message has a different channel, skip
      if (channel && incomingChannel && incomingChannel !== channel) {
        console.log('Filtered out by channel:', { expected: channel, incoming: incomingChannel });
        return;
      }
      
      console.log('Message accepted:', msg);
      
      setMessages((prev) => {
        const isDuplicate = prev.some(
          (m) => m.user === msg.user && m.text === msg.text && m.channel === msg.channel && m.roomId === msg.roomId
        );
        return isDuplicate ? prev : [...prev, msg];
      });
    };

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    // Wait for socket to be available
    const checkSocket = setInterval(() => {
      if (socketRef.current) {
        clearInterval(checkSocket);
        
        socketRef.current.on('message', onMessage);
        socketRef.current.on('connect', onConnect);
        socketRef.current.on('disconnect', onDisconnect);
        
        // Ensure we are in the intended room (idempotent on server)
        if (roomId && name) {
          try {
            socketRef.current.emit('join-room', { roomId, name });
          } catch {}
        }

        // Check if already connected
        if (socketRef.current.connected) {
          setIsConnected(true);
        }
      }
    }, 100);

    return () => {
      clearInterval(checkSocket);
      if (socketRef.current) {
        socketRef.current.off('message', onMessage);
        socketRef.current.off('connect', onConnect);
        socketRef.current.off('disconnect', onDisconnect);
      }
    };
  }, [channel, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = { user: name, text: input.trim(), channel, roomId };
    setMessages((m) => [...m, msg]);
    setInput('');
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('message', msg);
    }
  }

  return (
    <aside className={`h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-l-4 border-transparent relative overflow-hidden ${className}`} style={{ borderImage: 'linear-gradient(180deg, #3b82f6, #8b5cf6, #ec4899) 1' }}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl"></div>
      
      {/* Header */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-lg border-b-2 border-transparent" style={{ backgroundImage: 'linear-gradient(white, white), linear-gradient(90deg, #3b82f6, #8b5cf6)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${isConnected ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
          <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            💬 {title}
          </p>
          <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            {messages.length}
          </span>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative z-10 text-slate-800">
        {messages.map((m, idx) => (
          <div key={idx} className="text-sm break-words leading-6">
            <span className="font-semibold text-blue-700">{m.user} {m.user !== '' ? ':' : ''}</span>
<span
  className={`ml-1 ${
    m.user === ''
      ? 'text-green-300 italic font-bold'
      : 'text-slate-800'
  }`}
>
  {m.text}
</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Form */}
      <form onSubmit={sendMessage} className="relative p-4 bg-white/90 backdrop-blur-lg border-t-2 border-transparent z-10" style={{ backgroundImage: 'linear-gradient(white, white), linear-gradient(90deg, #3b82f6, #8b5cf6)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="w-full border-2 border-transparent rounded-xl px-4 py-3 outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400 bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 focus:shadow-lg"
              placeholder="💭 Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ 
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                backgroundOrigin: 'border-box', 
                backgroundClip: 'padding-box, border-box',
                border: '2px solid transparent'
              }}
            />
          </div>
          <button 
            type="submit"
            className="relative px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl overflow-hidden group"
          >
            <span className="relative z-10">Send 🚀</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-50 transition-opacity"></div>
          </button>
        </div>
      </form>
    </aside>
  );
}
