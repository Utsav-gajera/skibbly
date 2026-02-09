// Storage keys
export const STORAGE = {
  ROOM: 'skibbly:solo-roomId',
  STAGE: 'skibbly:solo-stage',
  CONFIG: 'skibbly:solo-config',
  TAB_SESSION: 'skibbly:tabSessionId',
  CHAT_PREFIX: 'skibbly:chat:'
};

// Default configurations
export const DEFAULT_CONFIG = {
  SOLO: { maxPlayers: 4, difficulty: 'medium', rounds: 5, timePerGuess: 60, allowHints: true },
  TEAM: { playersPerTeam: 3, difficulty: 'medium', rounds: 6, timePerGuess: 60 }
};
