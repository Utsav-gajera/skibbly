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
