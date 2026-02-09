// Game phases
export const GAME_PHASES = {
  IDLE: 'IDLE',
  WORD_SELECTION: 'WORD_SELECTION',
  DRAWING: 'DRAWING',
  SCOREBOARD: 'SCOREBOARD',
  GAME_ENDED: 'GAME_ENDED'
};

// Default game settings
export const DEFAULT_GAME_CONFIG = {
  totalRounds: 3,
  drawTime: 60,
  wordChooseTime: 8,
  scoreboardDisplayTime: 4
};

// Word pool for selection
export const WORD_POOL = [
  'cat', 'dog', 'house', 'tree', 'car', 'sun', 'moon', 'star', 'flower', 'bird',
  'fish', 'boat', 'plane', 'train', 'bike', 'book', 'pen', 'phone', 'computer', 'chair',
  'table', 'cup', 'bottle', 'hat', 'shoe', 'apple', 'banana', 'pizza', 'cake', 'ice cream',
  'guitar', 'piano', 'drum', 'camera', 'clock', 'key', 'door', 'window', 'lamp', 'bed',
  'umbrella', 'rainbow', 'cloud', 'mountain', 'beach', 'ocean', 'river', 'bridge', 'castle', 'rocket',
  'butterfly', 'elephant', 'lion', 'giraffe', 'penguin', 'dolphin', 'turtle', 'frog', 'snake', 'spider'
];

// Score calculation constants
export const SCORE_SETTINGS = {
  DRAWER_BASE_SCORE: 50
};

// Socket events
export const SOCKET_EVENTS = {
  // Game lifecycle
  GAME_STARTED: 'game:started',
  GAME_ENDED: 'game:ended',
  GAME_STATE_UPDATED: 'game:state-updated',
  
  // Turn flow
  TURN_STARTED: 'turn:started',
  TURN_ENDED: 'turn:ended',
  
  // Word selection
  WORD_SELECTION_POPUP: 'word:selection-popup',
  WORD_SELECTED: 'word:selected',
  
  // Drawing phase
  DRAWING_STARTED: 'drawing:started',
  DRAWING_ENDED: 'drawing:ended',
  
  // Guessing
  PLAYER_GUESSED: 'player:guessed',
  CORRECT_GUESS: 'guess:correct',
  INCORRECT_GUESS: 'guess:incorrect',
  
  // Scoreboard
  SCOREBOARD_DISPLAY: 'scoreboard:display',
  
  // Player status
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  
  // Chat/Guess
  MESSAGE: 'message'
};
