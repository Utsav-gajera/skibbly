import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import SoloModeConfig from '../components/SoloModeConfig';
import DrawingBoard from '../components/DrawingBoard';
import GroupChat from '../components/GroupChat';
import Modal from '../components/Modal';
import { useGameLogic } from '../hooks/useGameLogic';
import { SOCKET_EVENTS } from '../utils/socketEvents';
import { initSocket, joinRoom } from '../utils/socket';

export default function SoloPage() {
  const router = useRouter();
  const socketRef = useRef(null);
  const nameRef = useRef('');
  const roomIdRef = useRef('');
  const sessionIdRef = useRef('');
  
  const [name, setName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  const [stage, setStage] = useState('config');
  const [roomId, setRoomId] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [config, setConfig] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);
  const [brushColor, setBrushColor] = useState('#22d3ee');
  const [brushWidth, setBrushWidth] = useState(8);
  const [drawMode, setDrawMode] = useState('pencil');
  const [showWordModal, setShowWordModal] = useState(false);
  const hasJoinedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const pendingStartRef = useRef(null);

  const { user } = useUser();

  // Initialize sessionId IMMEDIATELY, not in useEffect
  if (typeof window !== 'undefined' && !sessionIdRef.current) {
    sessionIdRef.current = sessionStorage.getItem('skibbly:tabSessionId') || `tab-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
    sessionStorage.setItem('skibbly:tabSessionId', sessionIdRef.current);
  }

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    if (user) setName(user.fullName || user.username || user.firstName || name);
  }, [user]);

  useEffect(() => {
    const initSock = async () => {
      const sock = await initSocket();
      socketRef.current = sock;
      setMySocketId(sock.id);
      sock.on('socket-id', (data) => setMySocketId(data.id));
      sock.on('connect', () => {
        setMySocketId(sock.id);
        if (pendingStartRef.current) {
          startGameIfReady(pendingStartRef.current);
        }
        // Don't join again on reconnect - the game handles this
      });
      sock.on('disconnect', () => {
        setMySocketId(null);
        hasJoinedRef.current = false;
      });
      // Join room ONCE on initial connection
      if (roomIdRef.current && nameRef.current && sock.connected && !hasJoinedRef.current) {
        console.log('🔌 [SOCKET_INIT] Joining room:', {
          roomId: roomIdRef.current,
          name: nameRef.current,
          sessionId: sessionIdRef.current,
          socketId: sock.id
        });
        joinRoom(roomIdRef.current, nameRef.current, sessionIdRef.current);
        hasJoinedRef.current = true;
      }
    };
    initSock();
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const qRoom = router.query.room || '';
    const id = qRoom || `solo-${Math.random().toString(36).slice(2, 8)}`;
    setRoomId(id);
    roomIdRef.current = id;
    if (typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/solo?room=${id}`);
    }
    setStage(qRoom && router.query.host !== '1' ? 'play' : 'config');
  }, [router.isReady]);

  const startSolo = (cfg) => {
    setConfig(cfg);
    setStage('play');
    pendingStartRef.current = cfg;
    startGameIfReady(cfg);
  };

  const mapConfigToGameConfig = (cfg, minPlayers = 1) => ({
    totalRounds: cfg?.rounds ?? 3,
    drawTime: cfg?.timePerGuess ?? 60,
    wordChooseTime: 8,
    scoreboardDisplayTime: 8,
    minPlayers
  });

  const startGameIfReady = (cfg) => {
    const socket = socketRef.current;
    if (!socket || !roomIdRef.current || !nameRef.current) return;
    if (!hasJoinedRef.current) {
      joinRoom(roomIdRef.current, nameRef.current, sessionIdRef.current);
      hasJoinedRef.current = true;
    }
    if (!hasStartedRef.current) {
      socket.emit('game:start', mapConfigToGameConfig(cfg, 1));
      hasStartedRef.current = true;
    }
  };

  const {
    gamePhase,
    currentRound,
    totalRounds,
    players,
    leaderboard,
    roundScores,
    currentDrawerId,
    drawerName,
    wordOptions,
    selectedWord,
    timeRemaining,
    canSelectWord,
    isDrawer
  } = useGameLogic(socketRef, roomId);

  const amDrawer = isDrawer(mySocketId);
  const wordDisplay = selectedWord
    ? (amDrawer ? selectedWord : '•'.repeat(selectedWord.length))
    : '────────';

  useEffect(() => {
    const hasWordOptions = wordOptions?.length > 0;
    const isDrawer = amDrawer === true;
    const canSelect = canSelectWord?.() === true;
    const shouldShow = hasWordOptions && isDrawer && canSelect;
    
    console.log('🎯 [WORD_MODAL] Modal trigger check:', {
      hasWordOptions: { value: hasWordOptions, wordOptions },
      isDrawer: { value: isDrawer, mySocketId, currentDrawerId },
      canSelect: { value: canSelect, gamePhase },
      shouldShow,
      allTrue: hasWordOptions && isDrawer && canSelect,
      failureReasons: [
        !hasWordOptions && 'Missing wordOptions',
        !isDrawer && 'Not the drawer',
        !canSelect && 'Not in WORD_SELECTION phase'
      ].filter(Boolean)
    });
    setShowWordModal(shouldShow);
  }, [wordOptions, amDrawer, canSelectWord, mySocketId, currentDrawerId, gamePhase]);

  const timeLabel = gamePhase === 'DRAWING' ? `${Math.max(0, timeRemaining)}s` : `${config?.timePerGuess ?? 60}s`;
  const roundLabel = `Round ${currentRound} of ${totalRounds}`;

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
              <div className="text-lg font-black text-white">Players in Room</div>
              {gamePhase === 'SCOREBOARD' && (
                <div className="mt-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                  <div className="text-xs font-semibold text-emerald-200 uppercase tracking-[0.18em]">Turn Scoreboard</div>
                  <div className="mt-2 space-y-2">
                    {leaderboard.length > 0 ? leaderboard.map((entry, idx) => (
                      <div key={entry.id} className="flex items-center justify-between text-sm text-slate-100">
                        <div className="truncate">
                          <span className="text-emerald-300 font-bold mr-2">#{idx + 1}</span>
                          {entry.name}
                        </div>
                        <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-100 text-xs border border-emerald-400/40">{entry.score ?? 0} pts</span>
                      </div>
                    )) : (
                      <div className="text-xs text-emerald-200">No scores yet</div>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-3 overflow-y-auto pr-1">
                {players.length > 0 ? (
                  players.map((player, idx) => {
                    const isCurrentDrawer = player.id === currentDrawerId;
                    const isMe = mySocketId ? player.id === `player-${mySocketId}` : false;
                    return (
                      <div key={player.id} className="flex items-center gap-3 px-3 py-2 rounded-2xl border border-slate-800 bg-slate-800/70 shadow-inner">
                        <div className={`h-10 w-10 rounded-xl text-slate-900 font-black flex items-center justify-center ${isCurrentDrawer ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-cyan-400 to-blue-500'}`}>
                          {isCurrentDrawer ? '✏️' : '#'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${isMe ? 'text-cyan-200' : isCurrentDrawer ? 'text-green-200' : 'text-slate-100'}`}>
                            {player.name}
                          </div>
                          <div className="text-xs text-slate-400">{isCurrentDrawer ? 'Drawing now' : 'Watching'}</div>
                        </div>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-700 text-slate-100 border border-slate-600">{player.score ?? 0} pts</span>
                        {isMe && <span className="text-[11px] px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">You</span>}
                        {isCurrentDrawer && <span className="text-[11px] px-2 py-1 rounded-full bg-green-500/20 text-green-200 border border-green-500/40">🎨</span>}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No players in room yet</p>
                    <p className="text-xs mt-1">Share the link to invite others</p>
                  </div>
                )}
              </div>
            </aside>

            <section className="bg-slate-900/70 border border-slate-800 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] p-2 flex flex-col">
              <div className="grid grid-cols-3 items-center gap-2 px-3 py-2 bg-slate-800/70 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200">
                <span className="text-amber-200 uppercase tracking-[0.12em] text-[11px]">{roundLabel}</span>
                <div className="flex items-center justify-center gap-1.5 text-sm font-black text-white">
                  <span className="text-emerald-300 text-xs">Guess this</span>
                  <span className="tracking-[0.3em] text-slate-200 text-xs">{wordDisplay}</span>
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
                    mySocketId={mySocketId}
                    currentDrawerId={currentDrawerId}
                    drawerName={drawerName}
                    selectedWord={amDrawer ? selectedWord : null}
                    onChangeBrushColor={setBrushColor}
                    onChangeBrushWidth={setBrushWidth}
                    channel="solo"
                    roomId={roomId}
                  />
                </div>

                {gamePhase === 'SCOREBOARD' && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="w-[min(420px,90%)] rounded-3xl border border-emerald-500/40 bg-slate-900/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                      <div className="text-center text-emerald-200 text-xs uppercase tracking-[0.2em]">Turn Scoreboard</div>
                      <div className="mt-1 text-center text-lg font-black text-white">Points Distribution</div>
                      <div className="mt-4 space-y-2">
                        {leaderboard.length > 0 ? leaderboard
                          .map(entry => ({
                            ...entry,
                            roundScore: roundScores[entry.id] || 0
                          }))
                          .sort((a, b) => b.roundScore - a.roundScore)
                          .map((entry, idx) => (
                          <div key={entry.id} className="flex items-center justify-between text-sm text-slate-100">
                            <div className="truncate">
                              <span className="text-emerald-300 font-bold mr-2">#{idx + 1}</span>
                              {entry.name}
                            </div>
                            <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-100 text-xs border border-emerald-400/40">+{entry.roundScore} pts</span>
                          </div>
                        )) : (
                          <div className="text-xs text-emerald-200">No scores yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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

      <Modal isOpen={showWordModal} onClose={() => {}} closeOnOverlay={false}>
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            🎨 Choose Your Word
          </h2>
          <p className="text-slate-600 font-medium">Select one word to draw this round</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {wordOptions.map((word) => (
            <button
              key={word}
              onClick={() => {
                socketRef.current?.emit(SOCKET_EVENTS.WORD_SELECTED, { word });
                setShowWordModal(false);
              }}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-2 border-transparent hover:border-purple-400 rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-purple-400/0 group-hover:from-blue-400/10 group-hover:to-purple-400/10 transition-all duration-300"></div>
              <div className="relative">
                <div className="text-3xl mb-2">✨</div>
                <div className="text-lg font-bold text-slate-800 capitalize">{word}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
