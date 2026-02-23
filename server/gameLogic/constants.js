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
  wordChooseTime: 12,
  scoreboardDisplayTime: 8
};

// Word pool for selection
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

  // Team selection
  TEAM_SELECTED: 'team:selected',
  
  // Chat/Guess
  MESSAGE: 'message'
};
