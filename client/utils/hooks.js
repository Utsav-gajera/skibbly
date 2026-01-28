import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from './constants';

// Custom hook for socket connection
export const useSocket = (onConnect, onDisconnect) => {
  const socketRef = useRef(null);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket');
      const socket = io(SOCKET_CONFIG);
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketId(socket.id);
        onConnect?.(socket.id);
      });

      socket.on('disconnect', () => {
        setSocketId(null);
        onDisconnect?.();
      });

      socket.on('socket-id', (data) => setSocketId(data.id));
    };

    initSocket();
    return () => socketRef.current?.disconnect();
  }, []);

  return [socketRef, socketId];
};

// Custom hook for room players
export const useRoomPlayers = (socketRef, onDrawerChanged) => {
  const [players, setPlayers] = useState([]);
  const [currentDrawerId, setCurrentDrawerId] = useState(null);
  const [drawerName, setDrawerName] = useState('');

  useEffect(() => {
    if (!socketRef.current) return;

    const handlePlayers = (list) => setPlayers(list || []);
    const handleDrawer = (data) => {
      setCurrentDrawerId(data.drawerId);
      setDrawerName(data.drawerName);
      onDrawerChanged?.(data);
    };

    socketRef.current.on('room:players', handlePlayers);
    socketRef.current.on('drawer:changed', handleDrawer);

    return () => {
      socketRef.current.off('room:players', handlePlayers);
      socketRef.current.off('drawer:changed', handleDrawer);
    };
  }, [socketRef.current, onDrawerChanged]);

  return { players, currentDrawerId, drawerName };
};
