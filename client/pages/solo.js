import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import SoloModeConfig from '../components/SoloModeConfig';
import DrawingBoard from '../components/DrawingBoard';
import GroupChat from '../components/GroupChat';

export default function SoloPage() {
  const router = useRouter();
  const socketRef = useRef(null);
  const [name, setName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  const [brushColor, setBrushColor] = useState('#e11d48');
  const [brushWidth, setBrushWidth] = useState(8);
  const [drawMode, setDrawMode] = useState('pencil');
  const [stage, setStage] = useState('config'); // 'config' | 'play'
  const [config, setConfig] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket');
      const socket = io({ path: '/api/socket' });
      socketRef.current = socket;
    };
    initSocket();
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (user) {
      const displayName = user.fullName || user.username || user.firstName || name;
      setName(displayName);
    }
  }, [user]);

  const startSolo = (cfg) => {
    setConfig(cfg);
    setStage('play');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-slate-800">
      <header className="relative flex items-center justify-between px-8 py-5 bg-white/90 backdrop-blur-2xl shadow-2xl border-b-2 overflow-hidden" style={{ borderImage: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b) 1' }}>
        <div className="relative flex items-center gap-4 z-10">
          <button onClick={() => router.push('/home')} className="mr-4 px-4 py-2 rounded-xl font-semibold bg-white/80 text-slate-700 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-md">← Back</button>
          <div className="relative">
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg tracking-tight">skibbly • Solo</h1>
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full shadow-lg"></div>
          </div>
        </div>
        <SignedIn>
          <div className="relative flex items-center gap-3 z-10 ml-auto">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-semibold border border-purple-100">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white">🎨</span>
              <span>Skibbly</span>
            </div>
            <span className="hidden sm:inline text-slate-600 font-semibold">Hi, {name}</span>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-10 w-10',
                  userButtonTrigger: 'h-11 w-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg ring-2 ring-purple-100 hover:ring-purple-200 transition',
                },
              }}
              afterSignOutUrl="/"
            />
          </div>
        </SignedIn>

        <SignedOut>
          <div className="relative flex items-center gap-4 z-10 ml-auto">
            <input
              className="border-2 border-transparent rounded-xl px-5 py-2.5 font-semibold text-slate-700 bg-white shadow-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/50">
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        </SignedOut>
      </header>
                <main className="grid md:grid-cols-[2fr_1fr] grid-cols-1 gap-0 h-[calc(100vh-80px)]">

      {stage === 'config' ? (
          <SoloModeConfig
            initialConfig={{ maxPlayers: 1, difficulty: 'medium', rounds: 5, timePerGuess: 60, allowHints: true }}
            onChange={setConfig}
            onStart={startSolo}
          />

      ) : (
          <DrawingBoard
            socketRef={socketRef}
            brushColor={brushColor}
            brushWidth={brushWidth}
            mode={drawMode}
            setMode={setDrawMode}
            name={name}
            onChangeBrushColor={setBrushColor}
            onChangeBrushWidth={setBrushWidth}
          />
      )}
                <GroupChat socketRef={socketRef} name={name} title="Solo Chat" />

              </main>

    </div>
  );
}
