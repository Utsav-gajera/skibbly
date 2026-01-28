// Game constants
export const WORD_POOL = [
  'cat', 'dog', 'house', 'tree', 'car', 'sun', 'moon', 'star', 'flower', 'bird',
  'fish', 'boat', 'plane', 'train', 'bike', 'book', 'pen', 'phone', 'computer', 'chair',
  'table', 'cup', 'bottle', 'hat', 'shoe', 'apple', 'banana', 'pizza', 'cake', 'ice cream',
  'guitar', 'piano', 'drum', 'camera', 'clock', 'key', 'door', 'window', 'lamp', 'bed',
  'umbrella', 'rainbow', 'cloud', 'mountain', 'beach', 'ocean', 'river', 'bridge', 'castle', 'rocket',
  'butterfly', 'elephant', 'lion', 'giraffe', 'penguin', 'dolphin', 'turtle', 'frog', 'snake', 'spider'
];

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

// Socket config
export const SOCKET_CONFIG = {
  path: '/api/socket',
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
};

// Accent colors for players
export const PLAYER_ACCENTS = [
  'from-cyan-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-pink-400 to-rose-500',
  'from-indigo-400 to-purple-500'
];
