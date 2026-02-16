/**
 * Frontend Integration Guide
 * 
 * This file shows how to integrate the game logic events on the client side.
 * Copy patterns from here into your game pages (solo.js, team.js, etc.)
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { SOCKET_EVENTS } from '../utils/socketEvents.js';

// ============================================================================
// GAME STATE SETUP
// ============================================================================

export function useGameLogic(socketRef, roomId) {
  const [gamePhase, setGamePhase] = useState('IDLE');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [players, setPlayers] = useState([]);
  const [currentDrawerId, setCurrentDrawerId] = useState(null);
  const [drawerName, setDrawerName] = useState('');
  const [wordOptions, setWordOptions] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [roundScores, setRoundScores] = useState({});
  const [guessCount, setGuessCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const drawTimerRef = useRef(null);
  const listenersAttachedRef = useRef(false);

  // ========================================================================
  // SETUP SOCKET LISTENERS
  // ========================================================================

  useEffect(() => {
    let cleanup = null;
    let attachInterval = null;

    const attachListeners = () => {
      const socket = socketRef.current;
      if (!socket || listenersAttachedRef.current) return false;
      listenersAttachedRef.current = true;

      // ====================================================================
      // GAME LIFECYCLE EVENTS
      // ====================================================================

      // Game started - initialize UI
      socket.on(SOCKET_EVENTS.GAME_STARTED, (data) => {
        console.log('🎮 Game started!', data);
        setGamePhase('WORD_SELECTION');
        setCurrentRound(1);
        setTotalRounds(data.config.totalRounds);
        setPlayers(data.players);
      });

      // Turn started - new drawer
      socket.on(SOCKET_EVENTS.TURN_STARTED, (data) => {
        console.log('🔄 [TURN_STARTED] New turn started:', {
          data,
          mySocketId: socket.id,
          amIDrawer: socket.id === data.drawerId || `player-${socket.id}` === data.drawerId
        });
        setCurrentRound(data.round);
        setCurrentDrawerId(data.drawerId);
        setDrawerName(data.drawerName);
        setGamePhase('WORD_SELECTION');
        // Reset word options and selected word for new turn
        setWordOptions([]);
        setSelectedWord(null);
      });

      // ====================================================================
      // WORD SELECTION PHASE
      // ====================================================================

      socket.on(SOCKET_EVENTS.WORD_SELECTION_POPUP, (data) => {
        console.log('📝 [WORD_SELECTION_POPUP] Received word selection popup:', {
          words: data.words,
          timeLimit: data.timeLimit,
          mySocketId: socket.id,
          currentDrawerId: currentDrawerId,
          gamePhase: gamePhase
        });
        setGamePhase('WORD_SELECTION');
        setWordOptions(data.words || []);
        
        // Show modal/popup for drawer to select word
        // This should only appear for the drawer (on their client)
      });

      socket.on(SOCKET_EVENTS.WORD_SELECTED, (data) => {
        console.log('✅ Word selected, starting drawing phase');
        setWordOptions([]);
        setSelectedWord(null);
      });

      // ====================================================================
      // DRAWING PHASE
      // ====================================================================

      socket.on(SOCKET_EVENTS.DRAWING_STARTED, (data) => {
        console.log('🎨 Drawing started!', data);
        setGamePhase('DRAWING');
        setCurrentDrawerId(data.drawerId);
        setDrawerName(data.drawerName);
        setSelectedWord(data.word || null);
        setGuessCount(0);
        
        // For drawer: show word they need to draw
        // For guessers: show blank canvas + guess input
        
        // Start draw timer (countdown display)
        startDrawTimer(data.timeLimit);
        
        // Track who can guess
        const canGuess = data.guessableBy && data.guessableBy.length > 0;
        setTotalPlayers(data.guessableBy?.length + 1 || 0);
      });

      // ====================================================================
      // GUESSING EVENTS
      // ====================================================================

      socket.on(SOCKET_EVENTS.CORRECT_GUESS, (data) => {
        console.log('✅ Correct guess!', data);
        
        // Update UI to show correct guess
        displayCorrectGuess(data.guesserName, data.correctWord);
        
        // Update guess count
        setGuessCount(data.totalGuessed);
        
        // Check if all guessed
        if (data.totalGuessed === data.totalPlayers) {
          console.log('🎉 All players guessed! Ending turn...');
        }
      });

      socket.on(SOCKET_EVENTS.INCORRECT_GUESS, (data) => {
        console.log('❌ Incorrect guess', data);
        
        // Show feedback that guess was wrong (without revealing answer)
        displayIncorrectGuess(data.guesserName);
      });

      // ====================================================================
      // TURN & PHASE TRANSITIONS
      // ====================================================================

      socket.on(SOCKET_EVENTS.TURN_ENDED, (data) => {
        console.log('📊 Turn ended', data);
        
        // Reveal word to everyone
        setSelectedWord(data.correctWord);
        
        // Show guesses summary
        console.log(`Word was: ${data.correctWord}`);
        console.log(`${data.guessedCount} players guessed correctly`);
      });

      socket.on(SOCKET_EVENTS.SCOREBOARD_DISPLAY, (data) => {
        console.log('🏆 Scoreboard time!', data);
        setGamePhase('SCOREBOARD');
        setLeaderboard(data.scores);
        setRoundScores(data.roundScores || {});
        setCurrentRound(data.round);
        // Update scores but keep players list order as join order
        setPlayers((prev) => {
          const incoming = data.scores || [];
          if (!prev || prev.length === 0) return incoming;
          const scoreMap = new Map(incoming.map((p) => [p.id, p.score]));
          return prev.map((p) => (scoreMap.has(p.id) ? { ...p, score: scoreMap.get(p.id) } : p));
        });
        
        // Show scoreboard UI for 8 seconds
        // Auto-advance after display time
      });

      // ====================================================================
      // GAME END
      // ====================================================================

      socket.on(SOCKET_EVENTS.GAME_ENDED, (data) => {
        console.log('🎊 Game ended!', data);
        setGamePhase('GAME_ENDED');
        setLeaderboard(data.leaderboard);
        
        // Show final leaderboard and winner
        displayWinner(data.winner);
      });

      // ====================================================================
      // STATE SYNC
      // ====================================================================

      socket.on(SOCKET_EVENTS.GAME_STATE_UPDATED, (data) => {
        console.log('🔄 Game state updated', data);
        
        if (data) {
          setGamePhase(data.phase || 'IDLE');
          setCurrentRound(data.round || 1);
          setTotalRounds(data.totalRounds || 1);
          setPlayers(data.players || []);
          setCurrentDrawerId(data.currentDrawerId || null);
          setDrawerName(data.currentDrawerName || '');
        }
      });

      // ====================================================================
      // PLAYER JOIN/LEAVE
      // ====================================================================

      socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data) => {
        console.log('👤 Player joined:', data.playerName);
      });

      socket.on(SOCKET_EVENTS.PLAYER_LEFT, (data) => {
        console.log('👋 Player left:', data.playerName);
      });

      // Request initial state after listeners are attached
      socket.emit('request-state');

      const handleReconnect = () => {
        socket.emit('request-state');
      };

      socket.on('connect', handleReconnect);

      // Cleanup
      cleanup = () => {
        socket.off(SOCKET_EVENTS.GAME_STARTED);
        socket.off(SOCKET_EVENTS.TURN_STARTED);
        socket.off(SOCKET_EVENTS.WORD_SELECTION_POPUP);
        socket.off(SOCKET_EVENTS.DRAWING_STARTED);
        socket.off(SOCKET_EVENTS.CORRECT_GUESS);
        socket.off(SOCKET_EVENTS.INCORRECT_GUESS);
        socket.off(SOCKET_EVENTS.TURN_ENDED);
        socket.off(SOCKET_EVENTS.SCOREBOARD_DISPLAY);
        socket.off(SOCKET_EVENTS.GAME_ENDED);
        socket.off(SOCKET_EVENTS.GAME_STATE_UPDATED);
        socket.off(SOCKET_EVENTS.PLAYER_JOINED);
        socket.off(SOCKET_EVENTS.PLAYER_LEFT);
        socket.off('connect', handleReconnect);
        listenersAttachedRef.current = false;
      };

      return true;
    };

    if (!attachListeners()) {
      attachInterval = setInterval(() => {
        if (attachListeners() && attachInterval) {
          clearInterval(attachInterval);
          attachInterval = null;
        }
      }, 100);
    }

    return () => {
      if (attachInterval) clearInterval(attachInterval);
      if (cleanup) cleanup();
    };
  }, [socketRef, roomId]);

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  function startDrawTimer(seconds) {
    // Clear any existing timer
    if (drawTimerRef.current) {
      clearInterval(drawTimerRef.current);
    }
    
    // Update timer display every second
    let remaining = seconds;
    setTimeRemaining(remaining);
    
    drawTimerRef.current = setInterval(() => {
      remaining--;
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(drawTimerRef.current);
        drawTimerRef.current = null;
      }
    }, 1000);
  }

  function displayCorrectGuess(playerName, word) {
    // Show banner: "Player1 guessed 'cat' correctly!"
  }

  function displayIncorrectGuess(playerName) {
    // Show message: "Player1's guess was incorrect"
  }

  function updatePlayerScore(playerId, points) {
    // Update player score in leaderboard/roster
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, score: (p.score || 0) + points } : p
    ));
  }

  function displayWinner(winner) {
    // Show modal with winner info and confetti
    console.log(`🥇 Winner: ${winner.name} with ${winner.score} points`);
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  return {
    // State
    gamePhase,
    currentRound,
    totalRounds,
    players,
    currentDrawerId,
    drawerName,
    wordOptions,
    selectedWord,
    leaderboard,
    roundScores,
    guessCount,
    totalPlayers,
    timeRemaining,

    // Helper checks
    isDrawer: (socketId) => {
      if (!socketId || !currentDrawerId) return false;
      return socketId === currentDrawerId || `player-${socketId}` === currentDrawerId;
    },
    canGuess: () => gamePhase === 'DRAWING',
    canSelectWord: () => gamePhase === 'WORD_SELECTION',
  };
}

// ============================================================================
// COMPONENT EXAMPLE: GAME PAGE
// ============================================================================

export function GamePage() {
  const socketRef = useRef(null);
  const [isHost, setIsHost] = useState(false);

  const {
    gamePhase,
    currentRound,
    totalRounds,
    players,
    currentDrawerId,
    wordOptions,
    leaderboard,
    canGuess,
    canSelectWord,
    isDrawer
  } = useGameLogic(socketRef, roomId);

  // ========================================================================
  // START GAME (HOST ONLY)
  // ========================================================================

  const handleStartGame = (config) => {
    socketRef.current?.emit('game:start', config);
  };

  // ========================================================================
  // WORD SELECTION (DRAWER ONLY)
  // ========================================================================

  const handleSelectWord = (word) => {
    socketRef.current?.emit(SOCKET_EVENTS.WORD_SELECTED, { word });
  };

  // ========================================================================
  // GUESS SUBMISSION (DURING DRAWING PHASE)
  // ========================================================================

  const handleGuess = (guessText) => {
    if (canGuess()) {
      socketRef.current?.emit('message', {
        user: playerName,
        text: guessText,
        channel: 'solo',
        roomId: roomId
      });
    }
  };

  // ========================================================================
  // RENDERING
  // ========================================================================

  return (
    <div>
      {/* Status Bar */}
      <div className="status-bar">
        <p>Round {currentRound} of {totalRounds}</p>
        <p>Phase: {gamePhase}</p>
        <p>Drawer: {drawerName}</p>
      </div>

      {/* Main Content */}
      {gamePhase === 'WORD_SELECTION' && canSelectWord() && (
        <WordSelectionModal
          words={wordOptions}
          onSelectWord={handleSelectWord}
        />
      )}

      {gamePhase === 'DRAWING' && (
        <>
          <DrawingBoard
            isDrawer={isDrawer(socketId)}
            selectedWord={selectedWord}
            onDrawStart={startDrawing}
            onDrawEnd={endDrawing}
          />
          <GuessInput
            disabled={!canGuess() || isDrawer(socketId)}
            onSubmit={handleGuess}
          />
        </>
      )}

      {gamePhase === 'SCOREBOARD' && (
        <ScoreboardDisplay scores={leaderboard} />
      )}

      {gamePhase === 'GAME_ENDED' && (
        <GameEndDisplay
          leaderboard={leaderboard}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Player List */}
      <PlayerRoster
        players={players}
        isHost={isHost}
      />
    </div>
  );
}

// ============================================================================
// EVENT EMISSIONS TO SERVER
// ============================================================================

export const GameClientEvents = {
  // Setup
  joinRoom: (socket, { roomId, name, sessionId }) => {
    socket.emit('join-room', { roomId, name, sessionId });
  },

  setHost: (socket) => {
    socket.emit('set-host');
  },

  // Game Control
  startGame: (socket, config) => {
    socket.emit('game:start', config);
  },

  restart: (socket) => {
    socket.emit('game:restart');
  },

  // Gameplay
  selectWord: (socket, word) => {
    socket.emit(SOCKET_EVENTS.WORD_SELECTED, { word });
  },

  sendGuess: (socket, { user, text, channel, roomId }) => {
    socket.emit('message', { user, text, channel, roomId });
  },

  // Drawing
  draw: (socket, payload) => {
    socket.emit('draw', payload);
  },

  clearCanvas: (socket) => {
    socket.emit('clear-canvas');
  },

  undo: (socket) => {
    socket.emit('undo');
  },

  // Debug
  requestState: (socket) => {
    socket.emit('request-state');
  },

  debugState: (socket) => {
    socket.emit('debug:state');
  },

  debugTimers: (socket) => {
    socket.emit('debug:timers');
  }
};

// ============================================================================
// USAGE IN COMPONENT
// ============================================================================

/*
import { useGameLogic, GameClientEvents } from '@/hooks/useGameLogic';

export function SoloGamePage() {
  const socketRef = useRef(null);
  const { gamePhase, wordOptions, canSelectWord } = useGameLogic(socketRef, roomId);

  const handleSelectWord = (word) => {
    GameClientEvents.selectWord(socketRef.current, word);
  };

  return (
    <>
      {canSelectWord() && (
        <WordSelectionModal
          words={wordOptions}
          onSelect={handleSelectWord}
        />
      )}
    </>
  );
}
*/
