import { io } from 'socket.io-client';

let socket = null;
let initPromise = null;

export const initSocket = async () => {
  // If socket already exists, return it
  if (socket) return socket;
  
  // If initialization is already in progress, wait for it
  if (initPromise) return initPromise;
  
  // Start initialization
  initPromise = (async () => {
    await fetch('/api/socket');
    socket = io({ path: '/api/socket', transports: ['websocket'], reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000 });
    initPromise = null; // Clear the promise once done
    return socket;
  })();
  
  return initPromise;
};

export const getSocket = () => socket;

export const joinRoom = (roomId, name, sessionId) => {
  if (!socket) return;
  socket.emit('join-room', { roomId, name, sessionId });
};

export const sendMessage = (msg) => socket?.emit('message', msg);
export const draw = (data) => socket?.emit('draw', data);
export const clearCanvas = (data) => socket?.emit('clear', data);
export const canvasJson = (data) => socket?.emit('canvas:json', data);
