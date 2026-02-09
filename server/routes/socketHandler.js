/**
 * Socket.IO Server - Next.js API Route
 * Handles real-time multiplayer game communication
 */

import { Server } from 'socket.io';
import { setupGameSocket, destroyGame, getGameManager } from '../gameLogic/socketIntegration.js';
import { SOCKET_EVENTS } from '../gameLogic/constants.js';

let io;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('🔧 Initializing Socket.IO server...');

    io = new Server(res.socket.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);

      // Handle room joining
      socket.on('join-room', (data) => {
        const { roomId, name, sessionId } = data;

        if (!roomId) {
          socket.emit('error', { message: 'Room ID required' });
          return;
        }

        // Join socket to room
        socket.join(roomId);
        console.log(`👤 ${name} joined room ${roomId}`);

        // Setup game socket handler for this room (only once per socket)
        if (!socket.data.gameRooms) {
          socket.data.gameRooms = new Set();
        }
        if (!socket.data.gameRooms.has(roomId)) {
          setupGameSocket(io, socket, roomId);
          socket.data.gameRooms.add(roomId);
        }

        const gameManager = getGameManager(roomId);
        if (gameManager) {
          gameManager.addPlayer(socket.id, name || 'Player');
          const state = gameManager.getPublicGameState();
          if (state) {
            io.to(roomId).emit(SOCKET_EVENTS.GAME_STATE_UPDATED, state);
          }
        }

        // Notify room of new player
        io.to(roomId).emit(SOCKET_EVENTS.PLAYER_JOINED, {
          playerId: socket.id,
          playerName: name,
          timestamp: Date.now()
        });
      });

      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
      });

      // Fallback for drawing events (if sent directly to socket)
      socket.on('draw', (data) => {
        const rooms = socket.rooms;
        if (rooms.size > 1) {
          const roomId = Array.from(rooms)[1]; // First element is socket.id
          socket.to(roomId).emit('draw', data);
        }
      });

      // Clear drawing
      socket.on('clear', (data) => {
        const rooms = socket.rooms;
        if (rooms.size > 1) {
          const roomId = Array.from(rooms)[1];
          socket.to(roomId).emit('clear', data);
        }
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
