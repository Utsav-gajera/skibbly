import { GameState } from './gameState.js';
import {
  selectRandomWords,
  isCorrectGuess,
  calculateGuesserScore,
  calculateDrawerScore,
  getRemainingTime
} from './gameHelpers.js';
import { GAME_PHASES, DEFAULT_GAME_CONFIG, SOCKET_EVENTS } from './constants.js';

/**
 * GameManager - Core game logic orchestrator
 * Manages game flow, timers, scoring, and state transitions
 */
export class GameManager {
  constructor(io, roomId) {
    this.io = io;
    this.roomId = roomId;
    this.gameState = null;
    this.timers = {}; // Track all active timers for cleanup
    this.hostId = null;
    this.players = new Map(); // socketId -> player info
    this.pendingRoundScores = {};
    this.roundScores = {};
  }

  /**
   * INITIALIZATION
   */

  addPlayer(socketId, playerName, sessionId = null) {
    const playerId = `player-${socketId}`;
    const player = {
      id: playerId,
      socketId,
      name: playerName,
      score: 0,
      hasGuessed: false,
      sessionId
    };
    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  addPendingScore(playerId, points) {
    if (!this.pendingRoundScores[playerId]) this.pendingRoundScores[playerId] = 0;
    this.pendingRoundScores[playerId] += points;
  }

  setHost(socketId) {
    this.hostId = socketId;
  }

  /**
   * START GAME
   */

  startGame(config = DEFAULT_GAME_CONFIG) {
    // Require minimum players (default 2)
    const minPlayers = config?.minPlayers ?? 2;
    if (this.players.size < minPlayers) {
      return {
        success: false,
        error: `Minimum ${minPlayers} players required to start game`
      };
    }

    console.log('🎮 [GAME_START] Game starting:', {
      minPlayers,
      totalPlayers: this.players.size,
      players: Array.from(this.players.entries()).map(([socketId, player]) => ({
        socketId,
        playerId: player.id,
        name: player.name
      }))
    });

    // Initialize game state
    const playerArray = Array.from(this.players.values());
    this.gameState = new GameState(playerArray, config);
    this.gameState.updatePhase(GAME_PHASES.WORD_SELECTION);

    // Broadcast game start
    const publicState = this.getPublicGameState();
    this.io.to(this.roomId).emit(SOCKET_EVENTS.GAME_STARTED, {
      config,
      players: publicState?.players || []
    });

    // Begin first turn
    this.startTurn();

    return { success: true };
  }

  /**
   * TURN MANAGEMENT
   */

  startTurn() {
    if (this.gameState.isGameFinished) {
      this.endGame();
      return;
    }

    this.gameState.resetForNewTurn();
    this.gameState.updatePhase(GAME_PHASES.WORD_SELECTION);

    const currentPlayer = this.gameState.currentPlayer;
    
    // Get the live socketId from GameManager in case player reconnected
    const liveSocketId = this.getLiveSocketIdForPlayer(currentPlayer.id);
    if (!liveSocketId) {
      console.error('❌ [START_TURN] Current drawer not connected:', currentPlayer);
      // Skip to next player if drawer is disconnected
      this.gameState.nextPlayer();
      this.startTurn();
      return;
    }
    
    console.log('🔄 [START_TURN] Turn starting:', {
      round: this.gameState.currentRound,
      totalRounds: this.gameState.config.totalRounds,
      currentPlayer: {
        id: currentPlayer.id,
        staleSocketId: currentPlayer.socketId,
        liveSocketId: liveSocketId,
        name: currentPlayer.name
      },
      allPlayers: this.gameState.players.map(p => ({
        id: p.id,
        socketId: p.socketId,
        name: p.name
      }))
    });

    // Clear canvas for new turn
    this.io.to(this.roomId).emit('clear', {
      roomId: this.roomId,
      fromServer: true,
      reason: 'turn_start'
    });

    // Broadcast turn started
    this.io.to(this.roomId).emit(SOCKET_EVENTS.TURN_STARTED, {
      round: this.gameState.currentRound,
      totalRounds: this.gameState.config.totalRounds,
      drawerId: currentPlayer.id,
      drawerName: currentPlayer.name
    });

    console.log('📣 [START_TURN] Emitted TURN_STARTED to room:', {
      roomId: this.roomId,
      drawerId: currentPlayer.id,
      drawerName: currentPlayer.name
    });

    // Send word selection popup only to current drawer - use live socketId
    this.sendWordSelectionPopup(liveSocketId);
  }

  /**
   * Get the current live socketId for a player from GameManager
   * (GameState may have stale socketIds from reconnections)
   */
  getLiveSocketIdForPlayer(playerId) {
    const player = Array.from(this.players.values()).find(p => p.id === playerId);
    return player?.socketId || null;
  }

  /**
   * WORD SELECTION
   */

  sendWordSelectionPopup(socketId) {
    const wordOptions = selectRandomWords(3);
    this.gameState.wordOptions = wordOptions;

    console.log('📝 [WORD_POPUP] Sending word selection popup to drawer:', {
      socketId,
      playerId: this.gameState.currentPlayer?.id,
      playerName: this.gameState.currentPlayer?.name,
      words: wordOptions,
      allConnectedSockets: Array.from(this.players.keys())
    });

    this.io.to(socketId).emit(SOCKET_EVENTS.WORD_SELECTION_POPUP, {
      words: wordOptions,
      timeLimit: this.gameState.config.wordChooseTime
    });

    // Auto-select word if time expires
    this.clearTimer('wordSelection');
    this.timers['wordSelection'] = setTimeout(() => {
      this.handleWordSelection(
        socketId,
        wordOptions[Math.floor(Math.random() * wordOptions.length)]
      );
    }, this.gameState.config.wordChooseTime * 1000);
  }

  handleWordSelection(socketId, selectedWord) {
    if (!this.gameState || this.gameState.currentPhase !== GAME_PHASES.WORD_SELECTION) {
      return;
    }

    const drawer = this.gameState.currentPlayer;
    if (drawer.socketId !== socketId) {
      return; // Ignore selection from non-drawer
    }

    this.clearTimer('wordSelection');
    this.gameState.setSelectedWord(selectedWord);

    // Broadcast word selected event
    this.io.to(this.roomId).emit(SOCKET_EVENTS.WORD_SELECTED, {
      drawerId: drawer.id,
      wordSelected: true
    });

    // Start drawing phase
    this.startDrawingPhase();
  }

  /**
   * DRAWING PHASE
   */

  startDrawingPhase() {
    this.gameState.updatePhase(GAME_PHASES.DRAWING);

    const drawer = this.gameState.currentPlayer;
    const drawTimeMs = this.gameState.config.drawTime * 1000;

    console.log('🎨 [DRAWING_STARTED] Starting drawing phase:', {
      drawer: {
        id: drawer.id,
        socketId: drawer.socketId,
        name: drawer.name
      },
      word: this.gameState.selectedWord,
      timeLimit: this.gameState.config.drawTime
    });

    // Broadcast drawing started (hide word from guessers)
    this.io.to(this.roomId).emit(SOCKET_EVENTS.DRAWING_STARTED, {
      drawerId: drawer.id,
      drawerName: drawer.name,
      word: this.gameState.selectedWord, // Only drawer sees this on client
      timeLimit: this.gameState.config.drawTime,
      guessableBy: this.gameState.players.map(p => p.id).filter(id => id !== drawer.id)
    });

    // End drawing when timer expires or all players guess
    this.clearTimer('drawing');
    this.timers['drawing'] = setTimeout(() => {
      this.endTurn();
    }, drawTimeMs);
  }

  /**
   * GUESSING LOGIC
   */

  handleGuess(socketId, guessText) {
    if (this.gameState.currentPhase !== GAME_PHASES.DRAWING) {
      console.log('❌ [GUESS] Not in DRAWING phase:', this.gameState.currentPhase);
      return;
    }

    const guesser = Array.from(this.players.values()).find(p => p.socketId === socketId);
    if (!guesser) {
      console.log('❌ [GUESS] Guesser not found:', { socketId });
      return;
    }

    const drawer = this.gameState.currentPlayer;

    console.log('🎯 [GUESS] Processing guess:', {
      guesser: { id: guesser.id, name: guesser.name },
      drawer: { id: drawer.id, name: drawer.name },
      guessText,
      correctWord: this.gameState.selectedWord,
      alreadyGuessed: this.gameState.guessedPlayerIds.has(guesser.id)
    });

    // Prevent drawer from guessing
    if (guesser.id === drawer.id) {
      console.log('❌ [GUESS] Drawer cannot guess');
      return;
    }

    // Prevent duplicate guesses
    if (this.gameState.guessedPlayerIds.has(guesser.id)) {
      console.log('❌ [GUESS] Player already guessed correctly');
      return;
    }

    // Check if guess is correct
    if (isCorrectGuess(guessText, this.gameState.selectedWord)) {
      console.log('✅ [GUESS] Correct guess!');
      this.gameState.addGuess(guesser.id);

      const remainingTimeMs = getRemainingTime(
        this.gameState.startTime,
        this.gameState.config.drawTime * 1000
      );

      // Calculate and award scores
      const maxTimeMs = this.gameState.config.drawTime * 1000;
      const guesserScore = calculateGuesserScore(remainingTimeMs, maxTimeMs);

      // Defer score application until end of turn
      this.addPendingScore(guesser.id, guesserScore);

      // Broadcast correct guess
      this.io.to(this.roomId).emit(SOCKET_EVENTS.CORRECT_GUESS, {
        guesserId: guesser.id,
        guesserName: guesser.name,
        correctWord: this.gameState.selectedWord,
        guesserScore,
        drawerScore: 0,
        totalGuessed: this.gameState.guessedPlayerIds.size,
        totalPlayers: this.gameState.players.length - 1
      });

      // Broadcast system chat message for correct guess
      this.io.to(this.roomId).emit('message', {
        user: '',
        text: `${guesser.name} guessed the word`,
        roomId: this.roomId,
        timestamp: Date.now()
      });

      // Check if all players guessed
      if (this.gameState.allPlayersGuessed) {
        this.clearTimer('drawing');
        this.endTurn();
      }
    } else {
      console.log('❌ [GUESS] Incorrect guess:', {
        guess: guessText,
        correctWord: this.gameState.selectedWord
      });
      // Broadcast incorrect guess (without revealing correct answer)
      this.io.to(this.roomId).emit(SOCKET_EVENTS.INCORRECT_GUESS, {
        guesserId: guesser.id,
        guesserName: guesser.name
      });
    }
  }

  /**
   * TURN END & SCOREBOARD
   */

  endTurn() {
    console.log('🏁 [TURN_END] Ending turn:', {
      correctWord: this.gameState.selectedWord,
      guessedCount: this.gameState.guessedPlayerIds.size,
      totalPlayers: this.gameState.players.length - 1
    });
    
    this.clearTimer('drawing');

    // Award drawer points only if at least one player guessed correctly
    const correctGuesses = this.gameState.guessedPlayerIds.size;
    if (correctGuesses > 0) {
      const drawer = this.gameState.currentPlayer;
      const drawerScore = calculateDrawerScore(correctGuesses);
      this.addPendingScore(drawer.id, drawerScore);
    }

    // Apply pending scores at end of turn
    const pendingScores = this.pendingRoundScores || {};
    Object.entries(pendingScores).forEach(([playerId, points]) => {
      this.gameState.addPlayerScore(playerId, points);
    });
    this.roundScores = { ...pendingScores };
    this.pendingRoundScores = {};

    // Broadcast turn ended
    this.io.to(this.roomId).emit(SOCKET_EVENTS.TURN_ENDED, {
      correctWord: this.gameState.selectedWord,
      guessedCount: this.gameState.guessedPlayerIds.size
    });

    // Show scoreboard
    this.showScoreboard();
  }

  showScoreboard() {
    this.gameState.updatePhase(GAME_PHASES.SCOREBOARD);

    const scoreboard = this.gameState.getLeaderboard();
    const roundScores = this.roundScores || {};

    console.log('🏆 [SCOREBOARD] Showing scoreboard:', {
      scores: scoreboard,
      roundScores,
      round: this.gameState.currentRound,
      totalRounds: this.gameState.config.totalRounds,
      displayTime: this.gameState.config.scoreboardDisplayTime
    });

    this.io.to(this.roomId).emit(SOCKET_EVENTS.SCOREBOARD_DISPLAY, {
      scores: scoreboard,
      roundScores,
      round: this.gameState.currentRound,
      totalRounds: this.gameState.config.totalRounds
    });

    // Reset round scores for next turn
    this.roundScores = {};

    // Move to next turn after scoreboard display time
    this.clearTimer('scoreboard');
    this.timers['scoreboard'] = setTimeout(() => {
      this.gameState.nextPlayer();
      this.startTurn();
    }, this.gameState.config.scoreboardDisplayTime * 1000);
  }

  /**
   * GAME END
   */

  endGame() {
    console.log('🎮 [GAME_END] Game finished:', {
      finalScores: this.gameState.getLeaderboard()
    });
    
    this.clearAllTimers();
    this.gameState.updatePhase(GAME_PHASES.GAME_ENDED);

    const finalLeaderboard = this.gameState.getLeaderboard();

    // Broadcast game ended
    this.io.to(this.roomId).emit(SOCKET_EVENTS.GAME_ENDED, {
      leaderboard: finalLeaderboard,
      winner: finalLeaderboard[0] || null
    });

    // Reset game state
    this.gameState.reset();
  }

  /**
   * TIMER MANAGEMENT
   */

  clearTimer(key) {
    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
      delete this.timers[key];
    }
  }

  clearAllTimers() {
    Object.values(this.timers).forEach(timer => clearTimeout(timer));
    this.timers = {};
  }

  /**
   * STATE QUERIES
   */

  getPublicGameState() {
    if (!this.gameState) {
      return {
        phase: GAME_PHASES.IDLE,
        round: 1,
        totalRounds: 0,
        players: Array.from(this.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          score: p.score
        })),
        currentDrawerId: null,
        currentDrawerName: ''
      };
    }

    // Deduplicate players by name to handle reconnections with different socket IDs
    const playerMap = new Map();
    this.gameState.players.forEach(p => {
      if (!playerMap.has(p.name)) {
        playerMap.set(p.name, {
          id: p.id,
          name: p.name,
          score: p.score
        });
      }
    });

    return {
      phase: this.gameState.currentPhase,
      round: this.gameState.currentRound,
      totalRounds: this.gameState.config.totalRounds,
      players: Array.from(playerMap.values()),
      currentDrawerId: this.gameState.currentPlayer?.id,
      currentDrawerName: this.gameState.currentPlayer?.name
    };
  }

  getFullGameState() {
    if (!this.gameState) return null;

    return {
      ...this.getPublicGameState(),
      selectedWord: this.gameState.selectedWord,
      guessedPlayerIds: Array.from(this.gameState.guessedPlayerIds),
      wordOptions: this.gameState.wordOptions,
      startTime: this.gameState.startTime,
      config: this.gameState.config
    };
  }

  /**
   * CLEANUP
   */

  destroy() {
    this.clearAllTimers();
    this.players.clear();
    this.gameState = null;
  }
}
