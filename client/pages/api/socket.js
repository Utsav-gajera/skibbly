import { Server } from 'socket.io';

// roomId -> { players: [{ id, name, sessionId? }], currentDrawerId, drawingStartedAt, turnTimer, turnIndex }
const rooms = {};
const TURN_DURATION = 60000; // 60 seconds per turn
const turnTimers = {}; // Track timers per room

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { players: [], currentDrawerId: null, drawingStartedAt: null, turnIndex: 0 };
  }
  return rooms[roomId];
}

function ensureValidDrawer(room) {
  if (!room) return;
  if (room.players.length === 0) {
    room.currentDrawerId = null;
    room.drawingStartedAt = null;
    room.turnIndex = 0;
    return;
  }

  const drawerStillPresent = room.currentDrawerId && room.players.some((p) => p.id === room.currentDrawerId);
  if (!drawerStillPresent) {
    room.turnIndex = Math.min(room.turnIndex, room.players.length - 1);
    if (room.turnIndex < 0) room.turnIndex = 0;
    room.currentDrawerId = room.players[room.turnIndex]?.id || room.players[0].id;
    room.drawingStartedAt = Date.now();
  }
}

function dedupePlayers(players) {
  const map = new Map();
  for (const p of players || []) {
    if (!p?.id) continue;
    const key = p?.sessionId || p.id;
    map.set(key, { id: p.id, name: p?.name || 'Player', sessionId: p?.sessionId });
  }
  return Array.from(map.values());
}

function pruneDisconnectedPlayers(room, io) {
  if (!room || !io) return;
  if (!Array.isArray(room.players) || room.players.length === 0) return;

  const before = room.players.length;
  room.players = room.players.filter((p) => p?.id && io.sockets.sockets.has(p.id));
  room.players = dedupePlayers(room.players);
  const removed = before - room.players.length;

  if (removed !== 0) {
    room.turnIndex = Math.min(room.turnIndex, Math.max(0, room.players.length - 1));
    ensureValidDrawer(room);
  }
}

function rotateTurn(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.players.length === 0) return;

  pruneDisconnectedPlayers(room, io);
  if (!room.players.length) {
    if (turnTimers[roomId]) {
      clearInterval(turnTimers[roomId]);
      delete turnTimers[roomId];
    }
    return;
  }
  ensureValidDrawer(room);
  
  // Clear the canvas for everyone before rotating
  io.to(roomId).emit('clear', { roomId, channel: 'solo', fromServer: true });
  console.log('🗑️ Clearing canvas for turn rotation in room:', roomId);
  
  // Move to next player
  room.turnIndex = (room.turnIndex + 1) % room.players.length;
  room.currentDrawerId = room.players[room.turnIndex].id;
  room.drawingStartedAt = Date.now();
  
  const drawerName = room.players.find(p => p.id === room.currentDrawerId)?.name;
  console.log('🎯 Turn rotated to:', drawerName, '(Player', room.turnIndex + 1, 'of', room.players.length + ')');
  
  // Emit drawer change after a small delay to ensure canvas clears first
  setTimeout(() => {
    io.to(roomId).emit('drawer:changed', { 
      drawerId: room.currentDrawerId, 
      drawerName, 
      turnDuration: TURN_DURATION 
    });
  }, 1000);
}

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      // Send socket ID to client immediately
      socket.emit('socket-id', { id: socket.id });
      console.log('👤 Client connected:', socket.id);
      
      // Handle socket ID request (fallback for timing issues)
      socket.on('request-socket-id', () => {
        socket.emit('socket-id', { id: socket.id });
        console.log('📱 Socket ID requested by client:', socket.id);
      });
      
      let hasLeft = false;
      const leaveAllRooms = () => {
        if (hasLeft) return;
        hasLeft = true;

        const joined = Array.from(socket.rooms).filter((r) => r !== socket.id);
        joined.forEach((roomId) => {
          const room = rooms[roomId];
          if (!room) return;

          // Clean up stale sockets before processing leave.
          pruneDisconnectedPlayers(room, io);

          const player = room.players.find((p) => p.id === socket.id);
          const playerName = player?.name || 'Player';
          
          // Find the index of leaving player
          const leavingIndex = room.players.findIndex((p) => p.id === socket.id);
          room.players = room.players.filter((p) => p.id !== socket.id);
          
          // If the current drawer left
          if (room.currentDrawerId === socket.id) {
            if (room.players.length > 0) {
              // Adjust turn index if needed
              if (leavingIndex < room.turnIndex) {
                room.turnIndex = Math.max(0, room.turnIndex - 1);
              } else {
                room.turnIndex = room.turnIndex % room.players.length;
              }
              room.currentDrawerId = room.players[room.turnIndex].id;
              room.drawingStartedAt = Date.now();
              const drawerName = room.players[room.turnIndex].name;
              io.to(roomId).emit('drawer:changed', { drawerId: room.currentDrawerId, drawerName, turnDuration: TURN_DURATION });
            } else {
              room.currentDrawerId = null;
              room.drawingStartedAt = null;
              // Clear timer if no players left
              if (turnTimers[roomId]) {
                clearInterval(turnTimers[roomId]);
                delete turnTimers[roomId];
              }
            }
          }

          // Safety: ensure currentDrawerId still exists after removal.
          ensureValidDrawer(room);
          if (room.currentDrawerId) {
            const safeDrawerName = room.players.find((p) => p.id === room.currentDrawerId)?.name;
            io.to(roomId).emit('drawer:changed', { drawerId: room.currentDrawerId, drawerName: safeDrawerName, turnDuration: TURN_DURATION });
          }
          
            io.to(roomId).emit('room:players', dedupePlayers(room.players));
          io.to(roomId).emit('message', { user: '', text: `${playerName} left the room`, roomId, channel: 'solo' });
        });
      };

        socket.on('join-room', ({ roomId, name, sessionId }) => {
        if (!roomId || !name) return;
        socket.join(roomId);
        const room = getRoom(roomId);

        // Remove stale/ghost players before adding.
        pruneDisconnectedPlayers(room, io);
        
        // Remove by socket id, and also by sessionId if provided (handles reconnect/refresh in same tab).
        room.players = room.players.filter((p) => p.id !== socket.id && (!sessionId || p.sessionId !== sessionId));
        
        // Add player
        room.players.push({ id: socket.id, name: name || 'Player', sessionId });
        room.players = dedupePlayers(room.players);
        
        console.log(`👤 ${name} joined room ${roomId}. Total players: ${room.players.length}`);
        
        // Set first player as drawer and start timer
        if (!room.currentDrawerId) {
          room.currentDrawerId = socket.id;
          room.turnIndex = 0;
          room.drawingStartedAt = Date.now();
          console.log('🎯 Setting first player as drawer:', socket.id, 'name:', name);
          
          // Clear any existing timer
          if (turnTimers[roomId]) clearInterval(turnTimers[roomId]);
          
          // Set up turn timer - rotate every 60 seconds
          turnTimers[roomId] = setInterval(() => {
            rotateTurn(roomId, io);
          }, TURN_DURATION);
        }

        // Safety: ensure drawer id always points to a current player.
        ensureValidDrawer(room);
        
        // Find drawer name from current players array
        const drawerName = room.players.find(p => p.id === room.currentDrawerId)?.name;
        console.log('📋 Current drawer ID:', room.currentDrawerId, 'Drawer name:', drawerName, 'All players:', room.players.map(p => ({ id: p.id, name: p.name })));
        
        io.to(roomId).emit('room:players', dedupePlayers(room.players));
        
        // Emit drawer status to all clients in room
        io.to(roomId).emit('drawer:changed', { drawerId: room.currentDrawerId, drawerName, turnDuration: TURN_DURATION });
        console.log('📤 Emitted drawer:changed to room:', { drawerId: room.currentDrawerId, drawerName });
        io.to(roomId).emit('message', { user: '', text: `${name || 'Player'} joined the room`, roomId, channel: 'solo' });
      });

      socket.on('message', (msg) => {
        const roomId = msg?.roomId;
        if (roomId) {
          io.to(roomId).emit('message', msg);
        } else {
          io.emit('message', msg);
        }
      });

      socket.on('draw', (data) => {
        const roomId = data?.roomId;
        const channel = data?.channel;
        console.log('🎨 Draw event received:', { roomId, channel, senderId: socket.id, hasPayload: !!data?.payload });
        
        if (roomId) {
          const room = rooms[roomId];
          // Check if sender is the current drawer
          if (room && room.currentDrawerId !== socket.id) {
            console.log('⛔ Draw rejected: Not the current drawer');
            return;
          }
          // Broadcast to all OTHER clients in room (not sender)
          socket.to(roomId).emit('draw', { ...data, senderId: socket.id });
          console.log('📤 Broadcasting draw to room:', roomId);
        } else if (channel) {
          // Broadcast by channel if no room
          socket.broadcast.emit('draw', { ...data, senderId: socket.id, channel });
        }
      });

      socket.on('clear', (data) => {
        const roomId = data?.roomId;
        const channel = data?.channel;
        if (roomId) {
          const room = rooms[roomId];
          // Check if sender is the current drawer
          if (room && room.currentDrawerId !== socket.id) {
            console.log('⛔ Clear rejected: Not the current drawer');
            return;
          }
          socket.to(roomId).emit('clear', { ...data, senderId: socket.id });
          console.log('🗑️ Broadcasting clear to room:', roomId);
        } else if (channel) {
          socket.broadcast.emit('clear', { ...data, senderId: socket.id, channel });
        }
      });

      socket.on('canvas:json', (payload) => {
        const roomId = payload?.roomId;
        const channel = payload?.channel;
        if (roomId) {
          socket.to(roomId).emit('canvas:json', { ...payload, senderId: socket.id });
          console.log('📡 Broadcasting canvas:json to room:', roomId);
        } else if (channel) {
          socket.broadcast.emit('canvas:json', { ...payload, senderId: socket.id, channel });
        }
      });
      socket.on('disconnecting', () => {
        leaveAllRooms();
      });

      socket.on('disconnect', () => {
        // leaveAllRooms already handled in 'disconnecting'
      });
    });
  }
  res.end();
}
