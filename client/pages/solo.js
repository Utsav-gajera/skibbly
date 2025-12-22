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
  const roomIdRef = useRef('');
  const nameRef = useRef('');
  const [name, setName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  const [brushColor, setBrushColor] = useState('#22d3ee');
  const [brushWidth, setBrushWidth] = useState(8);
  const [drawMode, setDrawMode] = useState('pencil');
  const [stage, setStage] = useState('config');
  const [isGuest, setIsGuest] = useState(false);
  const [config, setConfig] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [shareLink, setShareLink] = useState('');
  const { user } = useUser();

  const createRoomId = () => `solo-${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket');
      const socket = io({ 
        path: '/api/socket',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      socket.on('connect', () => {
        if (roomIdRef.current) {
          socket.emit('join-room', { roomId: roomIdRef.current, name: nameRef.current });
        }
      });
      
      socket.on('disconnect', () => {});
      
      socket.on('room:players', (players) => {
        console.log('Room players updated:', players);
      });
      
      socketRef.current = socket;
    };
    initSocket();
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (user) {
      const displayName = user.fullName || user.username || user.firstName || name;
      setName(displayName);
    }
  }, [user]);

  // Keep refs in sync with state so socket handlers always see latest
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    if (!router.isReady) return;
    const qRoom = typeof router.query.room === 'string' ? router.query.room : '';
    const id = qRoom || createRoomId();
    setRoomId(id);
    if (typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/solo?room=${id}`);
    }
    // If user arrived via a shared link (room in URL), treat as guest
    if (qRoom) {
      setIsGuest(true);
      setStage('play');
    } else {
      setIsGuest(false);
      setStage('config');
    }
  }, [router.isReady, router.query.room]);

  // Join the room when roomId and socket are ready
  useEffect(() => {
    if (!roomId || !socketRef.current) return;
    if (socketRef.current.connected) {
      socketRef.current.emit('join-room', { roomId, name });
    }
  }, [roomId, name]);

  const startSolo = (cfg) => {
    setConfig(cfg);
    setStage('play');
  };

  const soloRoster = [
    { name, score: 1200, accent: 'from-cyan-400 to-blue-500', tag: 'You' },
    { name: 'Robo-Guess', score: 940, accent: 'from-emerald-400 to-teal-500', tag: 'AI' },
    { name: 'Spectator', score: 600, accent: 'from-amber-400 to-orange-500', tag: 'Bot' },
  ];

  const wordMask = '────────';
  const timeLabel = `${config?.timePerGuess ?? 60}s`;
  const roundLabel = `Round 1 of ${config?.rounds ?? 5}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/home')}
            className="px-3 py-2 rounded-xl border border-slate-700 text-slate-200 hover:border-cyan-400 hover:text-white transition-all duration-200 bg-slate-800/70"
          >
            ← Back
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Solo Studio</p>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Skibbly Practice
            </h1>
          </div>
        </div>

        <SignedIn>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-slate-200">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white">🎨</span>
              <span className="font-semibold">Skibbly</span>
            </div>
            <span className="hidden sm:inline text-slate-400 font-semibold">Hi, {name}</span>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-10 w-10',
                  userButtonTrigger: 'h-11 w-11 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg ring-2 ring-slate-700 hover:ring-cyan-400 transition',
                },
              }}
              afterSignOutUrl="/"
            />
          </div>
        </SignedIn>

        <SignedOut>
          <div className="flex items-center gap-3">
            <input
              className="border border-slate-700 rounded-xl px-4 py-2.5 font-semibold text-slate-100 bg-slate-800/70 focus:border-cyan-400 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-slate-800">
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        </SignedOut>
      </header> */}

      <main className="px-4 pb-3 pt-3">
        {stage === 'config' ? (
          <div className="grid grid-cols-[280px_1fr_360px] gap-4 h-[calc(100vh-32px)]">
            <aside className="hidden md:flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Warmup</div>
              <div className="text-lg font-black text-white">Solo run settings</div>
              <p className="text-sm text-slate-300">Tweak difficulty, time and hints before you start.</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <span className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700">🎯 Words</span>
                <span className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700">⏱️ Timers</span>
                <span className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700">💡 Hints</span>
                <span className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700">🧠 Practice</span>
              </div>
            </aside>

            <section className="bg-slate-900/60 border border-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-5 overflow-y-auto">
              <SoloModeConfig
                initialConfig={{ maxPlayers: 1, difficulty: 'medium', rounds: 5, timePerGuess: 60, allowHints: true }}
                onChange={setConfig}
                onStart={startSolo}
                shareLink={shareLink}
                onCopyLink={() => {
                  if (navigator?.clipboard && shareLink) navigator.clipboard.writeText(shareLink);
                }}
              />
            </section>

            <aside className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex flex-col">
              <GroupChat socketRef={socketRef} name={name} title="Solo Chat" channel="solo" roomId={roomId} className="border-l-0 flex-1" />
            </aside>
          </div>
        ) : (
          <div className="grid grid-cols-[280px_1fr_360px] gap-4 h-[calc(100vh-32px)]">
            <aside className="bg-slate-900/70 border border-slate-800 rounded-3xl p-4 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              <div className="text-lg font-black text-white">Scoreboard</div>
              <div className="mt-3 space-y-3 overflow-y-auto pr-1">
                {soloRoster.map((player, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-2xl border border-slate-800 bg-slate-800/70 shadow-inner">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${player.accent} text-slate-900 font-black flex items-center justify-center`}>#{idx + 1}</div>
                    <div className="flex-1">
                      <div className={`text-sm font-bold ${idx === 0 ? 'text-cyan-200' : 'text-slate-100'}`}>{player.name}</div>
                      <div className="text-xs text-slate-400">{player.score} pts</div>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">{player.tag}</span>
                  </div>
                ))}
              </div>
            </aside>

            <section className="bg-slate-900/70 border border-slate-800 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] p-2 flex flex-col">
              <div className="grid grid-cols-3 items-center gap-2 px-3 py-2 bg-slate-800/70 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200">
                <span className="text-amber-200 uppercase tracking-[0.12em] text-[11px]">{roundLabel}</span>
                <div className="flex items-center justify-center gap-1.5 text-sm font-black text-white">
                  <span className="text-emerald-300 text-xs">Guess this</span>
                  <span className="tracking-[0.3em] text-slate-200 text-xs">{wordMask}</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 text-[11px]">
                  <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">{timeLabel}</span>
                  <span className="px-2 py-1 rounded-full bg-slate-700 text-slate-200 border border-slate-600">Hints {config?.allowHints ? 'on' : 'off'}</span>
                </div>
              </div>

              <div className="relative flex-1 mt-2 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 overflow-hidden">
                <div className="absolute inset-3 rounded-xl bg-black/90 border border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
                  <DrawingBoard
                    socketRef={socketRef}
                    brushColor={brushColor}
                    brushWidth={brushWidth}
                    mode={drawMode}
                    setMode={setDrawMode}
                    name={name}
                    onChangeBrushColor={setBrushColor}
                    onChangeBrushWidth={setBrushWidth}
                    channel="solo"
                    roomId={roomId}
                  />
                </div>
              </div>

              {/* <div className="mt-3 grid grid-cols-3 gap-3 text-xs font-semibold">
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-emerald-200">👍 Nailed it</div>
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-amber-200">⚡ Speed chain</div>
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-rose-200">🛑 Skip</div>
              </div> */}
            </section>

            <aside className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col">
              <GroupChat socketRef={socketRef} name={name} title="Solo Chat" channel="solo" roomId={roomId} className="border-l-0 flex-1" />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
