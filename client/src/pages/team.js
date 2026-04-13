import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { initSocket } from '../utils/socket';
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
  const [isHost, setIsHost] = useState(false);
  const [wordSelectionShown, setWordSelectionShown] = useState(false);
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
      
      // Listen for game start to transition all players to play stage
      socket.on(SOCKET_EVENTS.GAME_STARTED, (data) => {
        console.log('🎮 [GAME_STARTED] Transitioning to play stage', data);
        setStage('play');
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
    return () => {
      if (socketRef.current) {
        socketRef.current.off(SOCKET_EVENTS.GAME_STARTED);
        socketRef.current.disconnect();
      }
    };
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
    const isCreatingRoom = !qRoom; // Host creates room, others join via link
    const id = qRoom || createRoomId();
    
    setIsHost(isCreatingRoom);
    setRoomId(id);
    
    // Non-hosts (joining via link) skip config and go to lobby
    if (!isCreatingRoom) {
      setStage('lobby');
    }
    
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
    minPlayers,
    isTeamMode: true
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
    isDrawer,
    winningTeam,
    teamScores,
    teamADrawerId,
    teamADrawerName,
    teamBDrawerId,
    teamBDrawerName
  } = useGameLogic(socketRef, roomId);

  const amDrawer = isDrawer(mySocketId);

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
        setWordSelectionShown(false);
      }, 12000);
    }
    
    if (gamePhase === 'WORD_SELECTION') {
      setWordSelectionShown(false);
    } else {
      setShowWordModal(false);
    }

    return () => {
      if (endResetTimerRef.current) {
        clearTimeout(endResetTimerRef.current);
        endResetTimerRef.current = null;
      }
    };
  }, [gamePhase]);

  const startTeam = (cfg) => {
    const minPerTeam = 2;
    const maxPerTeam = Number(cfg?.playersPerTeam ?? 3);
    const teamACount = teamAPlayers.length;
    const teamBCount = teamBPlayers.length;

    if (teamACount < minPerTeam || teamBCount < minPerTeam) {
      setStartError(`Each team must have at least ${minPerTeam} players.`);
      return;
    }

    if (teamACount > maxPerTeam || teamBCount > maxPerTeam) {
      setStartError(`Each team can have at most ${maxPerTeam} players.`);
      return;
    }

    if (teamACount !== teamBCount) {
      setStartError('Both teams must have the same number of players.');
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
    team: p?.team || null,
    score: Math.max(0, p?.score ?? 0),
    accent: accent[idx % accent.length],
    isSelf: mySocketId ? p?.id === `player-${mySocketId}` : false,
    rank: rankMap.get(p?.id) ?? (idx + 1),
  }));

  const myPlayerId = mySocketId ? `player-${mySocketId}` : null;
  const myTeam = (players || []).find(player => player.id === myPlayerId)?.team || null;
  const teamAPlayers = (players || []).filter(player => player.team === 'A');
  const teamBPlayers = (players || []).filter(player => player.team === 'B');
  const unassignedPlayers = (players || []).filter(player => !player.team);
  const teamAScore = Number(teamScores?.A || 0);
  const teamBScore = Number(teamScores?.B || 0);
  
  // Set team-specific values for drawing board and chat
  const myTeamDrawerId = myTeam === 'A' ? teamADrawerId : myTeam === 'B' ? teamBDrawerId : currentDrawerId;
  const myTeamDrawerName = myTeam === 'A' ? teamADrawerName : myTeam === 'B' ? teamBDrawerName : drawerName;
  const myTeamChannel = myTeam === 'A' ? 'teamA' : myTeam === 'B' ? 'teamB' : 'team';
  
  // Check if I'm the team drawer - be more flexible with ID matching
  const amTeamDrawer = myTeam && myTeamDrawerId && (
    mySocketId === myTeamDrawerId || 
    `player-${mySocketId}` === myTeamDrawerId ||
    mySocketId === myTeamDrawerId?.replace('player-', '')
  );
  
  // Debug logging
  useEffect(() => {
    console.log('🎯 [TEAM_DEBUG]', {
      mySocketId,
      myPlayerId,
      myTeam,
      myTeamChannel,
      myTeamDrawerId,
      myTeamDrawerName,
      amTeamDrawer,
      teamADrawerId,
      teamBDrawerId,
      playersCount: players?.length,
      players: players?.map(p => ({ id: p.id, name: p.name, team: p.team }))
    });
  }, [mySocketId, myPlayerId, myTeam, myTeamChannel, myTeamDrawerId, players, teamADrawerId, teamBDrawerId, amTeamDrawer]);
  
  const wordDisplay = selectedWord
    ? (amTeamDrawer ? selectedWord : '•'.repeat(selectedWord.length))
    : '────────';

  const selectTeam = (team) => {
    console.log('🏷️ [TEAM_SELECT] Selecting team:', { team, roomId, mySocketId });
    socketRef.current?.emit(SOCKET_EVENTS.TEAM_SELECTED, { team, roomId });
  };
  
  useEffect(() => {
    const shouldShow = wordOptions?.length > 0 && amTeamDrawer && canSelectWord() && !wordSelectionShown;
    console.log('👁️ [WORD_MODAL] Should show?', {
      wordOptionsLength: wordOptions?.length,
      wordOptions,
      amTeamDrawer,
      canSelectWord: canSelectWord(),
      wordSelectionShown,
      shouldShow,
      myTeam,
      myTeamDrawerId,
      mySocketId
    });
    if (showWordModal !== shouldShow) {
      setShowWordModal(shouldShow);
    }
  }, [wordOptions, amTeamDrawer, canSelectWord, wordSelectionShown, showWordModal]);

  const timeLabel = gamePhase === 'DRAWING' ? `${Math.max(0, timeRemaining)}s` : `${config?.timePerGuess ?? 60}s`;
  const roundLabel = `Round ${currentRound} of ${totalRounds}`;
  const finalLeaderboard = leaderboard?.length ? leaderboard : players;
  const showLeaderboardModal = gamePhase === 'GAME_ENDED' && stage === 'play';
  const showRoundWinnerBanner = gamePhase === 'SCOREBOARD' && (winningTeam === 'A' || winningTeam === 'B');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="px-4 pb-3 pt-3">
        {stage === 'config' && isHost ? (
          <div className="grid grid-cols-[280px_1fr_360px] gap-4 h-[calc(100vh-32px)]">
            <aside className="hidden md:flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Room</span>
                <span className="font-semibold text-cyan-300">{roomId || 'room-code'}</span>
              </div>

              <div className="mt-1 text-lg font-black text-white">Team Lobby</div>
              <p className="text-sm text-slate-300">Join a side before the host starts the game.</p>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-cyan-200">
                    <span>Team A</span>
                    <span>{teamAPlayers.length}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {teamAPlayers.length > 0 ? teamAPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm text-slate-100">
                        <span className="truncate">{player.name}</span>
                        <span className="text-xs text-cyan-200">{player.score ?? 0} pts</span>
                      </div>
                    )) : (
                      <div className="text-xs text-slate-400">No players yet</div>
                    )}
                  </div>
                  <button
                    onClick={() => selectTeam('A')}
                    className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold border transition-all ${myTeam === 'A' ? 'bg-cyan-500/20 text-cyan-100 border-cyan-500/40' : 'bg-slate-800/70 text-cyan-200 border-slate-700 hover:border-cyan-400'}`}
                  >
                    {myTeam === 'A' ? 'Joined Team A' : 'Join Team A'}
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-amber-200">
                    <span>Team B</span>
                    <span>{teamBPlayers.length}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {teamBPlayers.length > 0 ? teamBPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm text-slate-100">
                        <span className="truncate">{player.name}</span>
                        <span className="text-xs text-amber-200">{player.score ?? 0} pts</span>
                      </div>
                    )) : (
                      <div className="text-xs text-slate-400">No players yet</div>
                    )}
                  </div>
                  <button
                    onClick={() => selectTeam('B')}
                    className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold border transition-all ${myTeam === 'B' ? 'bg-amber-500/20 text-amber-100 border-amber-500/40' : 'bg-slate-800/70 text-amber-200 border-slate-700 hover:border-amber-400'}`}
                  >
                    {myTeam === 'B' ? 'Joined Team B' : 'Join Team B'}
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Unassigned</div>
                  <div className="mt-2 space-y-2">
                    {unassignedPlayers.length > 0 ? unassignedPlayers.map((player) => (
                      <div key={player.id} className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2 text-xs text-slate-200">
                        {player.name}
                      </div>
                    )) : (
                      <div className="text-xs text-slate-500">Everyone joined a team.</div>
                    )}
                  </div>
                </div>
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
              <GroupChat 
                socketRef={socketRef} 
                name={name} 
                title={myTeam === 'A' ? 'Team A Chat' : myTeam === 'B' ? 'Team B Chat' : 'Team Chat'} 
                channel={myTeamChannel} 
                roomId={roomId} 
                className="border-l-0 flex-1" 
              />
            </aside>
          </div>
        ) : stage === 'lobby' || (stage === 'config' && !isHost) ? (
          <div className="grid grid-cols-[280px_1fr_360px] gap-4 h-[calc(100vh-32px)]">
            <aside className="hidden md:flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Room</span>
                <span className="font-semibold text-cyan-300">{roomId || 'room-code'}</span>
              </div>

              <div className="mt-1 text-lg font-black text-white">Team Lobby</div>
              <p className="text-sm text-slate-300">Join a side before the host starts the game.</p>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-cyan-200">
                    <span>Team A</span>
                    <span>{teamAPlayers.length}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {teamAPlayers.length > 0 ? teamAPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm text-slate-100">
                        <span className="truncate">{player.name}</span>
                        <span className="text-xs text-cyan-200">{player.score ?? 0} pts</span>
                      </div>
                    )) : (
                      <div className="text-xs text-slate-400">No players yet</div>
                    )}
                  </div>
                  <button
                    onClick={() => selectTeam('A')}
                    className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold border transition-all ${myTeam === 'A' ? 'bg-cyan-500/20 text-cyan-100 border-cyan-500/40' : 'bg-slate-800/70 text-cyan-200 border-slate-700 hover:border-cyan-400'}`}
                  >
                    {myTeam === 'A' ? 'Joined Team A' : 'Join Team A'}
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-amber-200">
                    <span>Team B</span>
                    <span>{teamBPlayers.length}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {teamBPlayers.length > 0 ? teamBPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm text-slate-100">
                        <span className="truncate">{player.name}</span>
                        <span className="text-xs text-amber-200">{player.score ?? 0} pts</span>
                      </div>
                    )) : (
                      <div className="text-xs text-slate-400">No players yet</div>
                    )}
                  </div>
                  <button
                    onClick={() => selectTeam('B')}
                    className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold border transition-all ${myTeam === 'B' ? 'bg-amber-500/20 text-amber-100 border-amber-500/40' : 'bg-slate-800/70 text-amber-200 border-slate-700 hover:border-amber-400'}`}
                  >
                    {myTeam === 'B' ? 'Joined Team B' : 'Join Team B'}
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Unassigned</div>
                  <div className="mt-2 space-y-2">
                    {unassignedPlayers.length > 0 ? unassignedPlayers.map((player) => (
                      <div key={player.id} className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2 text-xs text-slate-200">
                        {player.name}
                      </div>
                    )) : (
                      <div className="text-xs text-slate-500">Everyone joined a team.</div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <section className="bg-slate-900/60 border border-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-8 flex items-center justify-center">
              <div className="text-center max-w-2xl">
                <div className="text-6xl mb-6">🎮</div>
                <h2 className="text-4xl font-black text-white mb-4">Waiting for Host</h2>
                <p className="text-lg text-slate-300 mb-6">Join your team while waiting for the host to start the game.</p>
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-800/40 p-6">
                  <div className="text-sm font-semibold text-slate-200 mb-2">Room Code</div>
                  <div className="text-2xl font-black text-cyan-300">{roomId}</div>
                </div>
                {isHost && (
                  <div className="mt-6">
                    <p className="text-sm text-slate-400 mb-3">You are the host. Configure settings in the config page to start.</p>
                    <button
                      onClick={() => setStage('config')}
                      className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                    >
                      Go to Config
                    </button>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex flex-col">
              <GroupChat 
                socketRef={socketRef} 
                name={name} 
                title={myTeam === 'A' ? 'Team A Chat' : myTeam === 'B' ? 'Team B Chat' : 'Team Chat'} 
                channel={myTeamChannel} 
                roomId={roomId} 
                className="border-l-0 flex-1" 
              />
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
                  {showRoundWinnerBanner && (
                    <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold border ${winningTeam === 'A' ? 'bg-cyan-500/15 text-cyan-100 border-cyan-400/40' : 'bg-amber-500/15 text-amber-100 border-amber-400/40'}`}>
                      🏆 Team {winningTeam} won this round (+1 point)
                    </div>
                  )}
                  <div className="mt-2 space-y-2">
                    {(leaderboard?.length ?? 0) > 0 ? leaderboard.map((entry, idx) => (
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
                    // In team mode, check if player is their team's drawer
                    const isCurrentDrawer = player.team === 'A' 
                      ? player.id === teamADrawerId 
                      : player.team === 'B' 
                        ? player.id === teamBDrawerId 
                        : player.id === currentDrawerId;
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
                        <span className={`text-[11px] px-2 py-1 rounded-full border ${player.team === 'A' ? 'bg-cyan-500/20 text-cyan-100 border-cyan-500/40' : player.team === 'B' ? 'bg-amber-500/20 text-amber-100 border-amber-500/40' : 'bg-slate-700 text-slate-100 border-slate-600'}`}>
                          {player.team === 'A' ? `Team A: ${teamAScore}` : player.team === 'B' ? `Team B: ${teamBScore}` : 'No team'}
                        </span>
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
                  <span className="px-2 py-1 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">A: {teamAScore}</span>
                  <span className="px-2 py-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30">B: {teamBScore}</span>
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
                    currentDrawerId={myTeamDrawerId}
                    drawerName={myTeamDrawerName}
                    selectedWord={amTeamDrawer ? selectedWord : null}
                    onChangeBrushColor={setBrushColor}
                    onChangeBrushWidth={setBrushWidth}
                    roomId={roomId}
                    channel={myTeamChannel}
                  />
                </div>

                {gamePhase === 'SCOREBOARD' && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="w-[min(420px,90%)] rounded-3xl border border-emerald-500/40 bg-slate-900/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                      <div className="text-center text-emerald-200 text-xs uppercase tracking-[0.2em]">Turn Scoreboard</div>
                      <div className="mt-1 text-center text-lg font-black text-white">Points Distribution</div>
                      <div className="mt-4 space-y-2">
                        {(leaderboard?.length ?? 0) > 0 ? leaderboard
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
              <GroupChat 
                socketRef={socketRef} 
                name={name} 
                title={myTeam === 'A' ? 'Team A Chat' : myTeam === 'B' ? 'Team B Chat' : 'Team Chat'} 
                channel={myTeamChannel} 
                roomId={roomId} 
                className="border-l-0 flex-1" 
              />
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
                if (wordSelectionShown) {
                  console.log('⚠️ [WORD_SELECT] Already selected, ignoring');
                  return;
                }
                console.log('📝 [WORD_SELECT] Selecting word:', { word, team: myTeam, mySocketId });
                setWordSelectionShown(true);
                setShowWordModal(false);
                socketRef.current?.emit(SOCKET_EVENTS.WORD_SELECTED, { word, team: myTeam });
              }}
              disabled={wordSelectionShown}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-2 border-transparent hover:border-purple-400 rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
