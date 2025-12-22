import { Server } from 'socket.io';

// roomId -> { players: [{ id, name }], currentTurnIndex }
const rooms = {};

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { players: [], currentTurnIndex: 0 };
  }
  return rooms[roomId];
}

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      const leaveAllRooms = () => {
        const joined = Array.from(socket.rooms).filter((r) => r !== socket.id);
        joined.forEach((roomId) => {
          const room = rooms[roomId];
          if (!room) return;
          const player = room.players.find((p) => p.id === socket.id);
          const playerName = player?.name || 'Player';
          room.players = room.players.filter((p) => p.id !== socket.id);
          if (room.currentTurnIndex >= room.players.length && room.players.length > 0) {
            room.currentTurnIndex = 0;
          }
          io.to(roomId).emit('room:players', room.players);
          io.to(roomId).emit('message', { user: '', text: `${playerName} left the room`, roomId, channel: 'solo' });
        });
      };

      socket.on('join-room', ({ roomId, name }) => {
        if (!roomId) return;
        socket.join(roomId);
        const room = getRoom(roomId);
        const existing = room.players.find((p) => p.id === socket.id);
        if (existing) {
          existing.name = name;
        } else {
          room.players.push({ id: socket.id, name: name || 'Player' });
        }
        io.to(roomId).emit('room:players', room.players);
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
        console.log('🎨 Draw event received:', { roomId, hasPayload: !!data?.payload, allKeys: Object.keys(data || {}) });
        if (roomId) {
          console.log('📤 Broadcasting draw to room:', roomId);
          io.to(roomId).emit('draw', data);
        } else {
          console.log('📤 Broadcasting draw to all');
          io.emit('draw', data);
        }
      });

      socket.on('clear', (data) => {
        const roomId = data?.roomId;
        if (roomId) {
          io.to(roomId).emit('clear', data);
        } else {
          io.emit('clear');
        }
      });

      socket.on('canvas:json', (payload) => {
        const roomId = payload?.roomId;
        if (roomId) {
          io.to(roomId).emit('canvas:json', payload);
        } else {
          io.emit('canvas:json', payload);
        }
      });
      socket.on('disconnecting', () => {
        leaveAllRooms();
      });

      socket.on('disconnect', () => {
        leaveAllRooms();
      });
    });
  }
  res.end();
}
