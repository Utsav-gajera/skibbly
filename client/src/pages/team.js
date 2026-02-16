import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import TeamModeConfig from '../components/TeamModeConfig';
import DrawingBoard from '../components/DrawingBoard';
import GroupChat from '../components/GroupChat';
import Modal from '../components/Modal';
import LeaderboardModal from '../components/LeaderboardModal';
import { useGameLogic } from '../hooks/useGameLogic';
import { SOCKET_EVENTS } from '../utils/socketEvents';

export default function TeamPage() {
  const router = useRouter();
  const socketRef = useRef(null);
  const sessionIdRef = useRef('');
  const TAB_SESSION_KEY = 'skibbly:tabSessionId';
  const [name, setName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  const [brushColor, setBrushColor] = useState('#22d3ee');
  const [brushWidth, setBrushWidth] = useState(8);
  const [drawMode, setDrawMode] = useState('pencil');
  const [stage, setStage] = useState('config');
  const [config, setConfig] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [shareLink, setShareLink] = useState('');
  const { user } = useAuth();
  const [mySocketId, setMySocketId] = useState(null);
  const [showWordModal, setShowWordModal] = useState(false);
  const [startError, setStartError] = useState('');
  const hasJoinedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const pendingStartRef = useRef(null);
  const endResetTimerRef = useRef(null);

  const createRoomId = () => `room-${Math.random().toString(36).slice(2, 8)}`;

  // Initialize sessionId IMMEDIATELY, not in useEffect
  if (typeof window !== 'undefined' && !sessionIdRef.current) {
    let sid = sessionStorage.getItem(TAB_SESSION_KEY);
    if (!sid) {
      sid = `tab-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      sessionStorage.setItem(TAB_SESSION_KEY, sid);
    }
    sessionIdRef.current = sid;
  }

  useEffect(() => {
    const setupSocket = async () => {
      const socket = await initSocket();
      socketRef.current = socket;
      setMySocketId(socket.id);

      socket.on('socket-id', (data) => {
        setMySocketId(data.id);
      });

      socket.on('connect', () => {
        setMySocketId(socket.id);
        if (pendingStartRef.current) {
          startGameIfReady(pendingStartRef.current);
        }
      });
      
      socket.on('disconnect', () => {
        setMySocketId(null);
        hasJoinedRef.current = false;
      });
      
      // Join room ONCE if already connected
      if (roomId && name && socket.connected && !hasJoinedRef.current) {
        joinRoom(roomId);
        hasJoinedRef.current = true;
      }
    };
    setupSocket();
    setStage('config');
    setConfig(null);
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!roomId || !name || !socketRef.current?.connected || hasJoinedRef.current) return;
    joinRoom(roomId);
    hasJoinedRef.current = true;
  }, [roomId, name]);

  useEffect(() => {
    if (user) {
      const displayName = user.name || user.email || name;
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
    socketRef.current.emit('join-room', { roomId: id, name, sessionId: sessionIdRef.current });
  };

  const mapConfigToGameConfig = (cfg, minPlayers = 2) => ({
    totalRounds: cfg?.rounds ?? 6,
    drawTime: cfg?.timePerGuess ?? 60,
    difficulty: cfg?.difficulty ?? 'medium',
    wordChooseTime: 8,
    scoreboardDisplayTime: 8,
    minPlayers
  });

  const startGameIfReady = (cfg) => {
    const socket = socketRef.current;
    if (!socket || !roomId || !name) return;
    if (!hasJoinedRef.current) {
      joinRoom(roomId);
      hasJoinedRef.current = true;
    }
    if (!hasStartedRef.current) {
      socket.emit('game:start', mapConfigToGameConfig(cfg, 2));
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
    setShowWordModal(wordOptions?.length > 0 && amDrawer && canSelectWord());
  }, [wordOptions, amDrawer, canSelectWord]);

  useEffect(() => {
    if (endResetTimerRef.current) {
      clearTimeout(endResetTimerRef.current);
      endResetTimerRef.current = null;
    }

    if (gamePhase === 'GAME_ENDED') {
      endResetTimerRef.current = setTimeout(() => {
        setStage('config');
        setConfig(null);
        hasStartedRef.current = false;
        pendingStartRef.current = null;
      }, 12000);
    }

    return () => {
      if (endResetTimerRef.current) {
        clearTimeout(endResetTimerRef.current);
        endResetTimerRef.current = null;
      }
    };
  }, [gamePhase]);

  const startTeam = (cfg) => {
    if ((players?.length ?? 0) < 2) {
      setStartError('Minimum 2 players needed to start game.');
      return;
    }
    setStartError('');
    setConfig(cfg);
    setStage('play');
    pendingStartRef.current = cfg;
    startGameIfReady(cfg);
  };

  const quickJoin = () => {
    const fallback = config || { playersPerTeam: 3, difficulty: 'medium', rounds: 6, timePerGuess: 60 };
    startTeam(fallback);
  };

  const accent = ['from-cyan-400 to-blue-500', 'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500', 'from-pink-400 to-rose-500', 'from-indigo-400 to-purple-500'];
  const rankedPlayers = [...(players || [])].sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));
  const rankMap = new Map(rankedPlayers.map((player, index) => [player.id, index + 1]));
  const roster = (players?.length ? players : []).map((p, idx) => ({
    id: p?.id || `player-${idx}`,
    name: p?.name || `Player-${idx + 1}`,
    score: Math.max(0, p?.score ?? 0),
    accent: accent[idx % accent.length],
    isSelf: mySocketId ? p?.id === `player-${mySocketId}` : false,
    rank: rankMap.get(p?.id) ?? (idx + 1),
  }));

  const timeLabel = gamePhase === 'DRAWING' ? `${Math.max(0, timeRemaining)}s` : `${config?.timePerGuess ?? 60}s`;
  const roundLabel = `Round ${currentRound} of ${totalRounds}`;
  const finalLeaderboard = leaderboard?.length ? leaderboard : players;
  const showLeaderboardModal = gamePhase === 'GAME_ENDED' && stage === 'play';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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
                {(players?.length ? players : [{ name: 'Waiting for players…' }]).map((p, idx) => (
                  <div key={idx} className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-200">
                    {p?.name}
                  </div>
                ))}
              </div>
            </aside>

            <section className="bg-slate-900/60 border border-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-5 overflow-y-auto">
              <TeamModeConfig
                initialConfig={{ playersPerTeam: 3, difficulty: 'medium', rounds: 6, timePerGuess: 60 }}
                onChange={setConfig}
                onStart={startTeam}
                errorMessage={startError}
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
              <div className="mt-1 text-lg font-black text-white">Players</div>
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
                {roster.length > 0 ? (
                  roster.map((player) => {
                    const isCurrentDrawer = player.id === currentDrawerId;
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-2xl border border-slate-800 bg-slate-800/70 shadow-inner`}
                      >
                        <div className={`h-10 w-10 rounded-xl text-slate-900 font-black flex items-center justify-center ${isCurrentDrawer ? 'bg-gradient-to-br from-green-400 to-emerald-500' : `bg-gradient-to-br ${player.accent}`}`}>
                          {isCurrentDrawer ? '✏️' : player.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${player.isSelf ? 'text-cyan-200' : isCurrentDrawer ? 'text-green-200' : 'text-slate-100'}`}>
                            {player.name}
                          </div>
                          <div className="text-xs text-slate-400">{isCurrentDrawer ? 'Drawing now' : 'Ready'}</div>
                        </div>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-700 text-slate-100 border border-slate-600">{player.score ?? 0} pts</span>
                        {player.isSelf && <span className="text-[11px] px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">You</span>}
                        {isCurrentDrawer && !player.isSelf && <span className="text-[11px] px-2 py-1 rounded-full bg-green-500/20 text-green-200 border border-green-500/40">🎨</span>}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No players in room yet</p>
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
                    mySocketId={mySocketId}
                    currentDrawerId={currentDrawerId}
                    drawerName={drawerName}
                    selectedWord={amDrawer ? selectedWord : null}
                    onChangeBrushColor={setBrushColor}
                    onChangeBrushWidth={setBrushWidth}
                    roomId={roomId}
                    channel="team"
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

      <LeaderboardModal
        isOpen={showLeaderboardModal}
        players={finalLeaderboard}
        onClose={() => {}}
      />

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
