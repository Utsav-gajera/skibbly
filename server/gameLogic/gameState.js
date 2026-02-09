import { GAME_PHASES, DEFAULT_GAME_CONFIG, SCORE_SETTINGS } from './constants.js';

/**
 * GameState - Manages the current state of a game
 * Immutable updates ensure predictable state changes
 */
export class GameState {
  constructor(players = [], config = DEFAULT_GAME_CONFIG) {
    this.players = players; // Array of { id, name, score, hasGuessed, socketId }
    this.config = config;
    this.currentPhase = GAME_PHASES.IDLE;
    this.currentRound = 1;
    this.currentPlayerIndex = 0;
    this.selectedWord = null;
    this.wordOptions = [];
    this.startTime = null;
    this.guessedPlayerIds = new Set();
  }

  // Getters
  get currentPlayer() {
    return this.players[this.currentPlayerIndex] || null;
  }

  get roundsCompleted() {
    return this.currentRound - 1;
  }

  get isGameFinished() {
    return this.currentRound > this.config.totalRounds;
  }

  get allPlayersGuessed() {
    const nonDrawerCount = this.players.length - 1;
    return this.guessedPlayerIds.size === nonDrawerCount;
  }

  // State updates
  updatePhase(newPhase) {
    this.currentPhase = newPhase;
    this.startTime = Date.now();
  }

  setSelectedWord(word) {
    this.selectedWord = word;
    this.guessedPlayerIds.clear();
  }

  addGuess(playerId) {
    this.guessedPlayerIds.add(playerId);
  }

  nextPlayer() {
    this.currentPlayerIndex++;
    
    // If all players completed a turn, move to next round
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
      this.currentRound++;
    }
  }

  addPlayerScore(playerId, points) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.score += points;
    }
  }

  resetForNewTurn() {
    this.selectedWord = null;
    this.wordOptions = [];
    this.guessedPlayerIds.clear();
    this.startTime = null;
  }

  // Leaderboard
  getLeaderboard() {
    return [...this.players].sort((a, b) => b.score - a.score);
  }

  // Reset entire game state
  reset() {
    this.players.forEach(p => p.score = 0);
    this.currentPhase = GAME_PHASES.IDLE;
    this.currentRound = 1;
    this.currentPlayerIndex = 0;
    this.selectedWord = null;
    this.wordOptions = [];
    this.guessedPlayerIds.clear();
    this.startTime = null;
  }
}
