import { GameManager } from './gameManager.js';
import { SOCKET_EVENTS } from './constants.js';

/**
 * Socket.IO Game Server Integration
 * Handles WebSocket events and delegates to GameManager
 */

const gameManagers = new Map(); // roomId -> GameManager

/**
 * Initialize Socket.IO event handlers for a room
 */
export function setupGameSocket(io, socket, roomId) {
  // Ensure game manager exists for this room
  if (!gameManagers.has(roomId)) {
    gameManagers.set(roomId, new GameManager(io, roomId));
  }

  const gameManager = gameManagers.get(roomId);

  socket.on('disconnect', () => {
    gameManager.removePlayer(socket.id);

    // If only 1 player left or game is running, end game
    if (gameManager.players.size < 2 && gameManager.gameState) {
      gameManager.endGame();
    }

    const state = gameManager.getPublicGameState();
    if (state) {
      io.to(roomId).emit(SOCKET_EVENTS.GAME_STATE_UPDATED, state);
    }
  });

  // ========== HOST ACTIONS ==========

  socket.on('set-host', (data) => {
    gameManager.setHost(socket.id);
  });

  socket.on('game:start', (config) => {
    const result = gameManager.startGame(config);
    
    if (!result.success) {
      socket.emit('game:error', { message: result.error });
    }
  });

  // ========== GAME EVENTS ==========

  socket.on(SOCKET_EVENTS.WORD_SELECTED, (data) => {
    const { word, team } = data;
    console.log('📝 [WORD_SELECTED] Player selected word:', {
      socketId: socket.id,
      word,
      team,
      currentDrawer: gameManager.gameState?.currentPlayer
    });
    
    if (team) {
      // Team mode word selection
      gameManager.handleTeamWordSelection(socket.id, word, team);
    } else {
      // Solo mode word selection
      gameManager.handleWordSelection(socket.id, word);
    }
  });

  socket.on('guess', (data) => {
    const { text } = data;
    gameManager.handleGuess(socket.id, text);
  });

  socket.on('message', (data) => {
    // Chat messages are also guesses in the game context
    const { text } = data;
    
    // Relay message to all players
    io.to(roomId).emit('message', {
      user: data.user,
      text: text,
      channel: data.channel,
      roomId: data.roomId || roomId,
      timestamp: Date.now()
    });

    // Check if it's a guess (when game is drawing)
    if (gameManager.gameState?.currentPhase === 'DRAWING') {
      const player = Array.from(gameManager.players.values()).find(p => p.socketId === socket.id);
      const isTeamMode = gameManager.gameState?.isTeamMode;
      const teamWord = player?.team === 'A' 
        ? gameManager.gameState?.teamASelectedWord 
        : gameManager.gameState?.teamBSelectedWord;
      
      console.log('💬 [MESSAGE] Processing potential guess:', {
        socketId: socket.id,
        playerName: player?.name,
        playerTeam: player?.team,
        text,
        currentPhase: gameManager.gameState?.currentPhase,
        isTeamMode,
        soloWord: gameManager.gameState?.selectedWord,
        teamWord
      });
      gameManager.handleGuess(socket.id, text);
    }
  });

  socket.on(SOCKET_EVENTS.TEAM_SELECTED, (data) => {
    const team = data?.team;
    console.log('🎯 [TEAM_SELECTED] Received:', { socketId: socket.id, team, roomId });
    gameManager.setPlayerTeam(socket.id, team);
    const state = gameManager.getPublicGameState();
    console.log('📤 [TEAM_SELECTED] Broadcasting state update:', {
      playersCount: state?.players?.length,
      players: state?.players?.map(p => ({ id: p.id, name: p.name, team: p.team }))
    });
    if (state) {
      io.to(roomId).emit(SOCKET_EVENTS.GAME_STATE_UPDATED, state);
    }
  });

  // ========== STATE SYNC ==========

  socket.on('request-state', () => {
    const state = gameManager.getPublicGameState();
    socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATED, state);
  });
}

/**
 * Clean up game manager when room is destroyed
 */
export function destroyGame(roomId) {
  const gameManager = gameManagers.get(roomId);
  if (gameManager) {
    gameManager.destroy();
    gameManagers.delete(roomId);
  }
}

/**
 * Get game manager for a room
 */
export function getGameManager(roomId) {
  return gameManagers.get(roomId);
}
