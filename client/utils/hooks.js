// This file is not currently used - all socket logic moved to socket.js and useGameLogic.js
// Kept for potential future use

    socketRef.current.on('room:players', handlePlayers);
    socketRef.current.on('drawer:changed', handleDrawer);

    return () => {
      socketRef.current.off('room:players', handlePlayers);
      socketRef.current.off('drawer:changed', handleDrawer);
    };
  }, [socketRef.current, onDrawerChanged]);

  return { players, currentDrawerId, drawerName };
};
