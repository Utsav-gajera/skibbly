import { Server } from 'socket.io';
import { setupGameSocket, getGameManager } from '../../../../server/gameLogic/socketIntegration.js';
import { SOCKET_EVENTS } from '../../../../server/gameLogic/constants.js';

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      socket.emit('socket-id', { id: socket.id });

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

      socket.on('draw', (data) => {
        const roomId = data?.roomId;
        if (!roomId) return;
        const gameManager = getGameManager(roomId);
        
        // Validate that game state exists and drawer is properly assigned
        if (!gameManager || !gameManager.gameState || !gameManager.gameState.currentPlayer) {
          console.log('❌ Draw rejected: No active game or drawer', { socketId: socket.id, roomId });
          return;
        }
        
        const drawerId = gameManager.gameState.currentPlayer.id;
        const senderPlayerId = `player-${socket.id}`;
        
        // Only allow the current drawer to draw
        if (drawerId !== senderPlayerId) {
          console.log('❌ Draw rejected: Not the current drawer', {
            socketId: socket.id,
            senderPlayerId,
            drawerId
          });
          return;
        }
        
        socket.to(roomId).emit('draw', { ...data, senderId: socket.id });
      });

      socket.on('clear', (data) => {
        const roomId = data?.roomId;
        if (!roomId) return;
        const gameManager = getGameManager(roomId);
        
        // Validate that game state exists and drawer is properly assigned
        if (!gameManager || !gameManager.gameState || !gameManager.gameState.currentPlayer) {
          console.log('❌ Clear rejected: No active game or drawer', { socketId: socket.id, roomId });
          return;
        }
        
        const drawerId = gameManager.gameState.currentPlayer.id;
        const senderPlayerId = `player-${socket.id}`;
        
        // Only allow the current drawer to clear
        if (drawerId !== senderPlayerId) {
          console.log('❌ Clear rejected: Not the current drawer', {
            socketId: socket.id,
            senderPlayerId,
            drawerId
          });
          return;
        }
        
        socket.to(roomId).emit('clear', { ...data, senderId: socket.id });
      });

      socket.on('canvas:json', (data) => {
        if (data?.roomId) socket.to(data.roomId).emit('canvas:json', { ...data, senderId: socket.id });
      });
    });
  }

  res.end();
}
