import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import TeamModeConfig from '../components/TeamModeConfig';
import DrawingBoard from '../components/DrawingBoard';
import GroupChat from '../components/GroupChat';

export default function TeamPage() {
  const router = useRouter();
  const socketRef = useRef(null);
  const [name, setName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  const [brushColor, setBrushColor] = useState('#22d3ee');
  const [brushWidth, setBrushWidth] = useState(8);
  const [drawMode, setDrawMode] = useState('pencil');
  const [stage, setStage] = useState('config');
  const [config, setConfig] = useState(null);
  const [players, setPlayers] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [shareLink, setShareLink] = useState('');
  const { user } = useUser();

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
    setStage('config');
    setConfig(null);
    setPlayers([]);
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (user) {
      const displayName = user.fullName || user.username || user.firstName || name;
      setName(displayName);
    }
  }, [user]);

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

  const accent = ['from-cyan-400 to-blue-500', 'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500', 'from-pink-400 to-rose-500', 'from-indigo-400 to-purple-500'];
  const roster = (players?.length ? players : [name || 'You', 'Atlas', 'Nova', 'Rhea', 'Flux']).map((p, idx) => ({
    name: typeof p === 'string' ? p : p?.name || `Player-${idx + 1}`,
    score: Math.max(0, 1600 - idx * 180),
    accent: accent[idx % accent.length],
    isSelf: (typeof p === 'string' ? p : p?.name) === name,
    rank: idx + 1,
  }));

  const timeLabel = `${config?.timePerGuess ?? 60}s`;
  const roundLabel = `Round 1 of ${config?.rounds ?? 6}`;
  const wordMask = '────────';

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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Team Arena</p>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Skibbly Live
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
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Room</span>
                <span className="font-semibold text-cyan-300">{roomId || 'room-code'}</span>
              </div>
              <div className="mt-1 text-lg font-black text-white">Lobby Preview</div>
              <div className="space-y-2 text-sm text-slate-300">
                <p>Share the link, pick team sizes, then hit Start.</p>
                <p className="text-cyan-300">Players join appear here once connected.</p>
              </div>
              <div className="mt-3 space-y-2">
                {(players?.length ? players : ['Waiting for players…']).map((p, idx) => (
                  <div key={idx} className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-200">
                    {p}
                  </div>
                ))}
              </div>
            </aside>

            <section className="bg-slate-900/60 border border-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-5 overflow-y-auto">
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
            </section>

            <aside className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex flex-col">
              <GroupChat socketRef={socketRef} name={name} title="Team Chat" channel="team" roomId={roomId} className="border-l-0 flex-1" />
            </aside>
          </div>
        ) : (
          <div className="grid grid-cols-[280px_1fr_360px] gap-4 h-[calc(100vh-32px)]">
            <aside className="bg-slate-900/70 border border-slate-800 rounded-3xl p-4 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Room</span>
                <span className="font-semibold text-cyan-300">{roomId || 'room-code'}</span>
              </div>
              <div className="mt-1 text-lg font-black text-white">Scoreboard</div>
              <div className="mt-3 space-y-3 overflow-y-auto pr-1">
                {roster.map((player) => (
                  <div
                    key={player.rank}
                    className={`flex items-center gap-3 px-3 py-2 rounded-2xl border border-slate-800 bg-slate-800/70 shadow-inner`}
                  >
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${player.accent} text-slate-900 font-black flex items-center justify-center`}>#{player.rank}</div>
                    <div className="flex-1">
                      <div className={`text-sm font-bold ${player.isSelf ? 'text-cyan-200' : 'text-slate-100'}`}>{player.name}</div>
                      <div className="text-xs text-slate-400">{player.score} pts</div>
                    </div>
                    {player.isSelf && <span className="text-[11px] px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">You</span>}
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
                  <span className="px-2 py-1 rounded-full bg-slate-700 text-slate-200 border border-slate-600">Difficulty: {config?.difficulty || 'medium'}</span>
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
                    roomId={roomId}
                  />
                </div>
              </div>

              {/* <div className="mt-3 grid grid-cols-3 gap-3 text-xs font-semibold">
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-emerald-200">👍 Correct guesses</div>
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-amber-200">⚡ Speed bonus</div>
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-rose-200">🛑 Pass / Skip</div>
              </div> */}
            </section>

            <aside className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col">
              <GroupChat socketRef={socketRef} name={name} title="Team Chat" channel="team" roomId={roomId} className="border-l-0 flex-1" />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
