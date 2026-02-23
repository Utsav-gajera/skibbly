import { GAME_PHASES, DEFAULT_GAME_CONFIG, SCORE_SETTINGS } from './constants.js';

/**
 * GameState - Manages the current state of a game
 * Immutable updates ensure predictable state changes
 */
export class GameState {
  constructor(players = [], config = DEFAULT_GAME_CONFIG) {
    this.players = players; // Array of { id, name, score, hasGuessed, socketId, team }
    this.config = config;
    this.currentPhase = GAME_PHASES.IDLE;
    this.currentRound = 1;
    this.currentPlayerIndex = 0;
    this.selectedWord = null;
    this.wordOptions = [];
    this.startTime = null;
    this.guessedPlayerIds = new Set();
    
    // Team mode
    this.isTeamMode = config?.isTeamMode || false;
    this.teamADrawerIndex = 0;
    this.teamBDrawerIndex = 0;
    this.teamASelectedWord = null;
    this.teamBSelectedWord = null;
    this.teamAGuessedPlayerIds = new Set();
    this.teamBGuessedPlayerIds = new Set();
    this.teamScores = { A: 0, B: 0 };
  }

  // Getters
  get currentPlayer() {
    return this.players[this.currentPlayerIndex] || null;
  }

  get teamAPlayers() {
    return this.players.filter(p => p.team === 'A');
  }

  get teamBPlayers() {
    return this.players.filter(p => p.team === 'B');
  }

  get currentTeamADrawer() {
    const teamA = this.teamAPlayers;
    return teamA[this.teamADrawerIndex % teamA.length] || null;
  }

  get currentTeamBDrawer() {
    const teamB = this.teamBPlayers;
    return teamB[this.teamBDrawerIndex % teamB.length] || null;
  }

  get roundsCompleted() {
    return this.currentRound - 1;
  }

  get isGameFinished() {
    return this.currentRound > this.config.totalRounds;
  }

  get allPlayersGuessed() {
    if (this.isTeamMode) {
      const teamAGuesserCount = this.teamAPlayers.length - 1; // Exclude drawer
      const teamBGuesserCount = this.teamBPlayers.length - 1;
      return (
        this.teamAGuessedPlayerIds.size === teamAGuesserCount &&
        this.teamBGuessedPlayerIds.size === teamBGuesserCount
      );
    }
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

  setTeamASelectedWord(word) {
    this.teamASelectedWord = word;
    this.teamAGuessedPlayerIds.clear();
  }

  setTeamBSelectedWord(word) {
    this.teamBSelectedWord = word;
    this.teamBGuessedPlayerIds.clear();
  }

  addGuess(playerId) {
    this.guessedPlayerIds.add(playerId);
  }

  addTeamAGuess(playerId) {
    this.teamAGuessedPlayerIds.add(playerId);
  }

  addTeamBGuess(playerId) {
    this.teamBGuessedPlayerIds.add(playerId);
  }

  addTeamScore(team, points = 1) {
    if (team !== 'A' && team !== 'B') return;
    if (!Number.isFinite(points)) return;
    this.teamScores[team] = (this.teamScores[team] || 0) + points;
  }

  nextPlayer() {
    if (this.isTeamMode) {
      this.teamADrawerIndex++;
      this.teamBDrawerIndex++;
      
      const teamA = this.teamAPlayers;
      const teamB = this.teamBPlayers;
      
      // If both teams completed all players' turns, move to next round
      if (this.teamADrawerIndex >= teamA.length && this.teamBDrawerIndex >= teamB.length) {
        this.teamADrawerIndex = 0;
        this.teamBDrawerIndex = 0;
        this.currentRound++;
      }
    } else {
      this.currentPlayerIndex++;
      
      // If all players completed a turn, move to next round
      if (this.currentPlayerIndex >= this.players.length) {
        this.currentPlayerIndex = 0;
        this.currentRound++;
      }
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
    
    if (this.isTeamMode) {
      this.teamASelectedWord = null;
      this.teamBSelectedWord = null;
      this.teamAGuessedPlayerIds.clear();
      this.teamBGuessedPlayerIds.clear();
    }
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
    
    if (this.isTeamMode) {
      this.teamADrawerIndex = 0;
      this.teamBDrawerIndex = 0;
      this.teamASelectedWord = null;
      this.teamBSelectedWord = null;
      this.teamAGuessedPlayerIds.clear();
      this.teamBGuessedPlayerIds.clear();
      this.teamScores = { A: 0, B: 0 };
    }
  }
}
