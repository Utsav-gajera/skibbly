import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import TeamModeConfig from '../components/TeamModeConfig';
import DrawingBoard from '../components/DrawingBoard';
import GroupChat from '../components/GroupChat';

export default function TeamPage() {
  const router = useRouter();
  const socketRef = useRef(null);
  const [name, setName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  const [brushColor, setBrushColor] = useState('#e11d48');
  const [brushWidth, setBrushWidth] = useState(8);
  const [drawMode, setDrawMode] = useState('pencil');
  const [stage, setStage] = useState('config'); // 'config' | 'play'
  const [config, setConfig] = useState(null);
  const [players, setPlayers] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [shareLink, setShareLink] = useState('');

  const createRoomId = () => `room-${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket');
      const socket = io({ path: '/api/socket' });
      socketRef.current = socket;

      socket.on('room:players', (list) => {
        setPlayers(list?.map((p) => p.name) || []);
      });
    };
    initSocket();
    // Start from config each mount
    setStage('config');
    setConfig(null);
    setPlayers([]);
    return () => socketRef.current?.disconnect();
  }, []);

  // Initialize / update room id and share link
  useEffect(() => {
    if (!router.isReady) return;
    const qRoom = typeof router.query.room === 'string' ? router.query.room : '';
    const id = qRoom || createRoomId();
    setRoomId(id);
    if (typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/team?room=${id}`);
    }
  }, [router.isReady, router.query.room]);

  const joinRoom = (id) => {
    if (!id || !socketRef.current) return;
    socketRef.current.emit('join-room', { roomId: id, name });
  };

  const startTeam = (cfg) => {
    setConfig(cfg);
    setStage('play');
    joinRoom(roomId);
  };

  const quickJoin = () => {
    const fallback = config || { playersPerTeam: 3, difficulty: 'medium', rounds: 6, timePerGuess: 60 };
    startTeam(fallback);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-slate-800">
      <header className="relative flex items-center justify-between px-8 py-5 bg-white/90 backdrop-blur-2xl shadow-2xl border-b-2 overflow-hidden" style={{ borderImage: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b) 1' }}>
        <div className="relative flex items-center gap-4 z-10">
          <button onClick={() => router.push('/home')} className="mr-4 px-4 py-2 rounded-xl font-semibold bg-white/80 text-slate-700 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-md">← Back</button>
          <div className="relative">
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg tracking-tight">skibbly • Team</h1>
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full shadow-lg"></div>
          </div>
        </div>
        <div className="relative flex items-center gap-4 z-10">
          <input className="border-2 border-transparent rounded-xl px-5 py-2.5 font-semibold text-slate-700 bg-white shadow-lg" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/50">{name.charAt(0).toUpperCase()}</div>
        </div>
      </header>
      <main className="px-4 pb-6">
        <div className="grid md:grid-cols-[2fr_1fr] grid-cols-1 gap-3 h-[calc(100vh-140px)]">
          {/* Left pane: config or canvas */}
          {stage === 'config' ? (
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-4 overflow-y-auto">
              <TeamModeConfig
                initialConfig={{ playersPerTeam: 3, difficulty: 'medium', rounds: 6, timePerGuess: 60 }}
                onChange={setConfig}
                onStart={startTeam}
                shareLink={shareLink}
                onCopyLink={() => {
                  if (navigator?.clipboard && shareLink) navigator.clipboard.writeText(shareLink);
                }}
                onJoinRoom={quickJoin}
              />
            </div>
          ) : (
            <section className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 text-sm font-semibold text-slate-700">
                <div>Round 1 of {config?.rounds ?? 6}</div>
                <div className="uppercase text-blue-600">Draw this: <span className="text-slate-900 font-black">Mystery word</span></div>
                <div>Time: {config?.timePerGuess ?? 60}s</div>
              </div>
              <div className="flex-1 min-h-0 p-2">
                <div className="w-full h-full rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                  <DrawingBoard
                    socketRef={socketRef}
                    brushColor={brushColor}
                    brushWidth={brushWidth}
                    mode={drawMode}
                    setMode={setDrawMode}
                    name={name}
                    onChangeBrushColor={setBrushColor}
                    onChangeBrushWidth={setBrushWidth}
                    roomId={roomId}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Right pane: chat (common) */}
          <aside className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <GroupChat socketRef={socketRef} name={name} title="Team Chat" channel="team" roomId={roomId} className="border-l-0 flex-1" />
          </aside>
        </div>
      </main>
    </div>
  );
}
