import { setupGameSocket, getGameManager } from '../gameLogic/socketIntegration.js';
import { SOCKET_EVENTS } from '../gameLogic/constants.js';

/**
 * Initialize socket event handlers for a new connection
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {SocketIO.Socket} socket - Individual socket connection
 */
export function initializeSocketHandlers(io, socket) {
  socket.emit('socket-id', { id: socket.id });

  // Join room handler
  socket.on('join-room', ({ roomId, name, sessionId }) => {
    if (!roomId) return;

    console.log('📥 join-room called:', { socketId: socket.id, name, roomId, sessionId });

    socket.join(roomId);

    if (!socket.data.gameRooms) {
      socket.data.gameRooms = new Set();
    }
    if (!socket.data.gameRooms.has(roomId)) {
      setupGameSocket(io, socket, roomId);
      socket.data.gameRooms.add(roomId);
    }

    const gameManager = getGameManager(roomId);
    if (gameManager) {
      // Check if player with same name or sessionId already exists
      const existingBySocket = gameManager.players.get(socket.id);
      const existingByName = Array.from(gameManager.players.values()).find(p => p.name === name);
      const existingBySession = sessionId ? Array.from(gameManager.players.values()).find(p => p.sessionId === sessionId) : null;
      const isExistingPlayer = Boolean(existingBySocket || (existingByName && existingBySession && existingByName.sessionId === sessionId));

      if (!isExistingPlayer && gameManager.gameState && !gameManager.gameState.isTeamMode) {
        const maxPlayers = gameManager.gameState?.config?.maxPlayers;
        if (Number.isFinite(maxPlayers) && gameManager.players.size >= maxPlayers) {
          socket.emit('game:error', {
            code: 'ROOM_FULL',
            message: `Room is full (max ${maxPlayers} players)`
          });
          socket.leave(roomId);
          return;
        }
      }
      
      if (existingBySocket) {
        console.log('⚠️ Player socket already in room, skipping add:', socket.id);
      } else if (existingByName && existingBySession && existingByName.sessionId === sessionId) {
        console.log('⚠️ Player with same session reconnecting, removing old:', existingByName.socketId);
        gameManager.removePlayer(existingByName.socketId);
        gameManager.addPlayer(socket.id, name || 'Player', sessionId);
        console.log('✅ Player reconnected:', { socketId: socket.id, name, roomId });
      } else if (!existingByName) {
        // Brand new player
        gameManager.addPlayer(socket.id, name || 'Player', sessionId);
        console.log('✅ New player added:', {
          socketId: socket.id,
          name,
          roomId,
          totalPlayers: gameManager.players.size
        });
      } else {
        console.log('⚠️ Player with same name exists, skipping add:', name);
      }
      const state = gameManager.getPublicGameState();
      if (state) {
        io.to(roomId).emit(SOCKET_EVENTS.GAME_STATE_UPDATED, state);
      }
    }
  });

  // Draw handler - relay with authorization check
  socket.on('draw', (data) => {
    const roomId = data?.roomId;
    if (!roomId) return;
    const gameManager = getGameManager(roomId);
    
    if (!gameManager || !gameManager.gameState) {
      console.log('❌ Draw rejected: No active game', { socketId: socket.id, roomId });
      return;
    }

    const state = gameManager.gameState;
    const senderPlayerId = `player-${socket.id}`;

    let authorizedDrawerId = null;
    if (state.isTeamMode) {
      const sender = gameManager.players.get(socket.id);
      if (!sender?.team) {
        console.log('❌ Draw rejected: Team mode sender has no team', {
          socketId: socket.id,
          senderPlayerId,
          roomId
        });
        return;
      }
      authorizedDrawerId = sender.team === 'A'
        ? state.currentTeamADrawer?.id
        : state.currentTeamBDrawer?.id;
    } else {
      authorizedDrawerId = state.currentPlayer?.id;
    }

    // Only allow the active drawer for the sender's mode/team to draw
    if (!authorizedDrawerId || authorizedDrawerId !== senderPlayerId) {
      console.log('❌ Draw rejected: Not the current drawer', {
        socketId: socket.id,
        senderPlayerId,
        authorizedDrawerId,
        isTeamMode: state.isTeamMode
      });
      return;
    }
    
    socket.to(roomId).emit('draw', { ...data, senderId: socket.id });
  });

  // Clear handler - relay with authorization check
  socket.on('clear', (data) => {
    const roomId = data?.roomId;
    if (!roomId) return;
    const gameManager = getGameManager(roomId);
    
    if (!gameManager || !gameManager.gameState) {
      console.log('❌ Clear rejected: No active game', { socketId: socket.id, roomId });
      return;
    }

    const state = gameManager.gameState;
    const senderPlayerId = `player-${socket.id}`;

    let authorizedDrawerId = null;
    if (state.isTeamMode) {
      const sender = gameManager.players.get(socket.id);
      if (!sender?.team) {
        console.log('❌ Clear rejected: Team mode sender has no team', {
          socketId: socket.id,
          senderPlayerId,
          roomId
        });
        return;
      }
      authorizedDrawerId = sender.team === 'A'
        ? state.currentTeamADrawer?.id
        : state.currentTeamBDrawer?.id;
    } else {
      authorizedDrawerId = state.currentPlayer?.id;
    }

    // Only allow the active drawer for the sender's mode/team to clear
    if (!authorizedDrawerId || authorizedDrawerId !== senderPlayerId) {
      console.log('❌ Clear rejected: Not the current drawer', {
        socketId: socket.id,
        senderPlayerId,
        authorizedDrawerId,
        isTeamMode: state.isTeamMode
      });
      return;
    }
    
    socket.to(roomId).emit('clear', { ...data, senderId: socket.id });
  });

  // Canvas JSON sync handler
  socket.on('canvas:json', (data) => {
    if (data?.roomId) {
      socket.to(data.roomId).emit('canvas:json', { ...data, senderId: socket.id });
    }
  });
}
