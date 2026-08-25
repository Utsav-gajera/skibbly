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
      sessionId,
      team: null
    };
    this.players.set(socketId, player);

    // If a solo game is already running, allow late joiners to participate.
    // Keep the active game state's player list in sync with the socket map.
    if (this.gameState && !this.gameState.isTeamMode) {
      const existsInState = this.gameState.players.some((p) => p.id === player.id);
      if (!existsInState) {
        this.gameState.players.push({ ...player });
      }
    }

    return player;
  }

  setPlayerTeam(socketId, team) {
    const normalizedTeam = team === 'A' || team === 'B' ? team : null; 
    const player = this.players.get(socketId);
    if (!player) {
      console.log('❌ [SET_TEAM] Player not found:', socketId);
      return null;
    }
    player.team = normalizedTeam;
    
    console.log('🏷️ [SET_TEAM] Player team updated:', {
      socketId,
      playerId: player.id,
      playerName: player.name,
      team: normalizedTeam
    });

    if (this.gameState) {
      const statePlayer = this.gameState.players.find(p => p.id === player.id);
      if (statePlayer) {
        statePlayer.team = normalizedTeam;
        console.log('✅ [SET_TEAM] Updated in gameState too');
      }
    }

    return player;
  }

  removePlayer(socketId) {
    const removed = this.players.get(socketId);
    this.players.delete(socketId);

    if (!removed || !this.gameState) return;

    // Keep active game state in sync for solo mode.
    if (!this.gameState.isTeamMode) {
      const removedIndex = this.gameState.players.findIndex((p) => p.id === removed.id);
      if (removedIndex !== -1) {
        this.gameState.players.splice(removedIndex, 1);

        // Maintain a valid current player index after removals.
        if (this.gameState.players.length === 0) {
          this.gameState.currentPlayerIndex = 0;
        } else if (removedIndex < this.gameState.currentPlayerIndex) {
          this.gameState.currentPlayerIndex -= 1;
        } else if (this.gameState.currentPlayerIndex >= this.gameState.players.length) {
          this.gameState.currentPlayerIndex = 0;
        }
      }

      // Remove disconnected player from in-turn/per-round bookkeeping.
      this.gameState.guessedPlayerIds.delete(removed.id);
      delete this.pendingRoundScores[removed.id];
      delete this.roundScores[removed.id];
    }
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
    const isTeamMode = config?.isTeamMode || false;
    
    // Require minimum players (default 2)
    const minPlayers = config?.minPlayers ?? 2;
    if (this.players.size < minPlayers) {
      return {
        success: false,
        error: `Minimum ${minPlayers} players required to start game`
      };
    }

    // In solo mode, enforce configurable max players
    if (!isTeamMode) {
      const maxPlayers = config?.maxPlayers ?? Infinity;
      if (this.players.size > maxPlayers) {
        return {
          success: false,
          error: `Maximum ${maxPlayers} players allowed in solo mode`
        };
      }
    }

    // In team mode, enforce per-team minimum and maximum
    if (isTeamMode) {
      const minPerTeam = 2;
      const maxPerTeam = Number(config?.playersPerTeam ?? 3);
      const teamACount = Array.from(this.players.values()).filter(p => p.team === 'A').length;
      const teamBCount = Array.from(this.players.values()).filter(p => p.team === 'B').length;
      
      if (teamACount < minPerTeam || teamBCount < minPerTeam) {
        return {
          success: false,
          error: `Each team must have at least ${minPerTeam} players`
        };
      }

      if (teamACount > maxPerTeam || teamBCount > maxPerTeam) {
        return {
          success: false,
          error: `Each team can have at most ${maxPerTeam} players`
        };
      }

      if (teamACount !== teamBCount) {
        return {
          success: false,
          error: 'Both teams must have the same number of players'
        };
      }
    }

    console.log('🎮 [GAME_START] Game starting:', {
      minPlayers,
      totalPlayers: this.players.size,
      isTeamMode,
      players: Array.from(this.players.entries()).map(([socketId, player]) => ({
        socketId,
        playerId: player.id,
        name: player.name,
        team: player.team
      }))
    });

    // Initialize game state
    const playerArray = Array.from(this.players.values());
    this.gameState = new GameState(playerArray, { ...config, isTeamMode });
    this.gameState.updatePhase(GAME_PHASES.WORD_SELECTION);

    // Broadcast game start
    const publicState = this.getPublicGameState();
    this.io.to(this.roomId).emit(SOCKET_EVENTS.GAME_STARTED, {
      config: { ...config, isTeamMode },
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

    if (this.gameState.isTeamMode) {
      this.startTeamTurn();
    } else {
      this.startSoloTurn();
    }
  }

  startSoloTurn() {
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

  startTeamTurn() {
    const teamADrawer = this.gameState.currentTeamADrawer;
    const teamBDrawer = this.gameState.currentTeamBDrawer;

    if (!teamADrawer || !teamBDrawer) {
      console.error('❌ [TEAM_TURN] Missing drawers:', { teamADrawer, teamBDrawer });
      this.endGame();
      return;
    }

    const teamASocketId = this.getLiveSocketIdForPlayer(teamADrawer.id);
    const teamBSocketId = this.getLiveSocketIdForPlayer(teamBDrawer.id);

    console.log('🎯 [TEAM_TURN] Starting team turn:', {
      round: this.gameState.currentRound,
      teamADrawer: { id: teamADrawer.id, name: teamADrawer.name, socketId: teamASocketId },
      teamBDrawer: { id: teamBDrawer.id, name: teamBDrawer.name, socketId: teamBSocketId }
    });

    // Clear both team canvases
    this.io.to(this.roomId).emit('clear', {
      roomId: this.roomId,
      fromServer: true,
      reason: 'team_turn_start'
    });

    // Broadcast team turn started
    this.io.to(this.roomId).emit(SOCKET_EVENTS.TURN_STARTED, {
      round: this.gameState.currentRound,
      totalRounds: this.gameState.config.totalRounds,
      isTeamMode: true,
      teamADrawerId: teamADrawer.id,
      teamADrawerName: teamADrawer.name,
      teamBDrawerId: teamBDrawer.id,
      teamBDrawerName: teamBDrawer.name
    });

    // Send same word options to both drawers
    this.sendTeamWordSelectionPopup(teamASocketId, teamBSocketId);
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
    const wordOptions = selectRandomWords(3, this.gameState?.config?.difficulty || 'medium');
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

  sendTeamWordSelectionPopup(teamASocketId, teamBSocketId) {
    const wordOptions = selectRandomWords(3, this.gameState?.config?.difficulty || 'medium');
    this.gameState.wordOptions = wordOptions;

    console.log('📝 [TEAM_WORD_POPUP] Sending same word options to both team drawers:', {
      teamASocketId,
      teamBSocketId,
      words: wordOptions
    });

    // Send same words to both drawers
    this.io.to(teamASocketId).emit(SOCKET_EVENTS.WORD_SELECTION_POPUP, {
      words: wordOptions,
      timeLimit: this.gameState.config.wordChooseTime,
      team: 'A'
    });

    this.io.to(teamBSocketId).emit(SOCKET_EVENTS.WORD_SELECTION_POPUP, {
      words: wordOptions,
      timeLimit: this.gameState.config.wordChooseTime,
      team: 'B'
    });

    // Auto-select words if time expires
    this.clearTimer('wordSelection');
    this.timers['wordSelection'] = setTimeout(() => {
      const randomWord = wordOptions[Math.floor(Math.random() * wordOptions.length)];
      if (!this.gameState.teamASelectedWord) {
        this.handleTeamWordSelection(teamASocketId, randomWord, 'A');
      }
      if (!this.gameState.teamBSelectedWord) {
        this.handleTeamWordSelection(teamBSocketId, randomWord, 'B');
      }
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

  handleTeamWordSelection(socketId, selectedWord, team) {
    if (!this.gameState || this.gameState.currentPhase !== GAME_PHASES.WORD_SELECTION) {
      console.log('❌ [TEAM_WORD] Not in word selection phase:', this.gameState?.currentPhase);
      return;
    }

    const player = Array.from(this.players.values()).find(p => p.socketId === socketId);
    if (!player || player.team !== team) {
      console.log('❌ [TEAM_WORD] Player team mismatch:', { 
        socketId, 
        playerTeam: player?.team, 
        requestedTeam: team 
      });
      return; // Ignore selection from wrong team
    }

    if (team === 'A') {
      if (this.gameState.teamASelectedWord) {
        console.log('⚠️ [TEAM_A] Word already selected, ignoring duplicate:', selectedWord);
        return; // Already selected
      }
      this.gameState.setTeamASelectedWord(selectedWord);
      console.log('✅ [TEAM_A] Word selected:', selectedWord);
    } else if (team === 'B') {
      if (this.gameState.teamBSelectedWord) {
        console.log('⚠️ [TEAM_B] Word already selected, ignoring duplicate:', selectedWord);
        return; // Already selected
      }
      this.gameState.setTeamBSelectedWord(selectedWord);
      console.log('✅ [TEAM_B] Word selected:', selectedWord);
    }

    // Check if both teams have selected words
    if (this.gameState.teamASelectedWord && this.gameState.teamBSelectedWord) {
      this.clearTimer('wordSelection');
      
      console.log('🎉 [TEAM_WORD] Both teams ready, starting drawing phase');
      
      // Broadcast both teams ready
      this.io.to(this.roomId).emit(SOCKET_EVENTS.WORD_SELECTED, {
        teamAReady: true,
        teamBReady: true
      });

      // Start drawing phase for both teams
      this.startTeamDrawingPhase();
    } else {
      console.log('⏳ [TEAM_WORD] Waiting for other team...', {
        teamA: this.gameState.teamASelectedWord ? 'ready' : 'waiting',
        teamB: this.gameState.teamBSelectedWord ? 'ready' : 'waiting'
      });
    }
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

  startTeamDrawingPhase() {
    this.gameState.updatePhase(GAME_PHASES.DRAWING);

    const teamADrawer = this.gameState.currentTeamADrawer;
    const teamBDrawer = this.gameState.currentTeamBDrawer;
    const drawTimeMs = this.gameState.config.drawTime * 1000;
    
    // Track drawing start time for score calculation
    this.timers['drawingStartTime'] = Date.now();

    console.log('🎨 [TEAM_DRAWING] Both teams start drawing:', {
      teamADrawer: { id: teamADrawer.id, name: teamADrawer.name, word: this.gameState.teamASelectedWord },
      teamBDrawer: { id: teamBDrawer.id, name: teamBDrawer.name, word: this.gameState.teamBSelectedWord }
    });

    // Broadcast to Team A members
    const teamAPlayers = this.gameState.teamAPlayers;
    console.log('\ud83d\udce4 [TEAM_DRAWING] Broadcasting to Team A:', {
      count: teamAPlayers.length,
      players: teamAPlayers.map(p => ({ id: p.id, name: p.name })),
      drawer: teamADrawer.id,
      word: this.gameState.teamASelectedWord
    });
    teamAPlayers.forEach(player => {
      const socketId = this.getLiveSocketIdForPlayer(player.id);
      if (socketId) {
        this.io.to(socketId).emit(SOCKET_EVENTS.DRAWING_STARTED, {
          team: 'A',
          isTeamMode: true,
          drawerId: teamADrawer.id,
          drawerName: teamADrawer.name,
          teamADrawerId: teamADrawer.id,
          teamADrawerName: teamADrawer.name,
          teamBDrawerId: teamBDrawer.id,
          teamBDrawerName: teamBDrawer.name,
          word: player.id === teamADrawer.id ? this.gameState.teamASelectedWord : null,
          timeLimit: this.gameState.config.drawTime,
          isDrawer: player.id === teamADrawer.id
        });
      }
    });

    // Broadcast to Team B members
    const teamBPlayers = this.gameState.teamBPlayers;
    console.log('\ud83d\udce4 [TEAM_DRAWING] Broadcasting to Team B:', {
      count: teamBPlayers.length,
      players: teamBPlayers.map(p => ({ id: p.id, name: p.name })),
      drawer: teamBDrawer.id,
      word: this.gameState.teamBSelectedWord
    });
    teamBPlayers.forEach(player => {
      const socketId = this.getLiveSocketIdForPlayer(player.id);
      if (socketId) {
        this.io.to(socketId).emit(SOCKET_EVENTS.DRAWING_STARTED, {
          team: 'B',
          isTeamMode: true,
          drawerId: teamBDrawer.id,
          drawerName: teamBDrawer.name,
          teamADrawerId: teamADrawer.id,
          teamADrawerName: teamADrawer.name,
          teamBDrawerId: teamBDrawer.id,
          teamBDrawerName: teamBDrawer.name,
          word: player.id === teamBDrawer.id ? this.gameState.teamBSelectedWord : null,
          timeLimit: this.gameState.config.drawTime,
          isDrawer: player.id === teamBDrawer.id
        });
      }
    });

    // End drawing when timer expires
    this.clearTimer('drawing');
    this.timers['drawing'] = setTimeout(() => {
      this.endTeamTurn();
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

    // Route to team guess handler if in team mode
    if (this.gameState.isTeamMode) {
      this.handleTeamGuess(socketId, guessText);
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

  handleTeamGuess(socketId, guessText) {
    const guesser = Array.from(this.players.values()).find(p => p.socketId === socketId);
    if (!guesser || !guesser.team) {
      console.log('❌ [TEAM_GUESS] Guesser has no team:', { socketId, guesser: guesser?.name });
      return;
    }

    const team = guesser.team;
    const isTeamA = team === 'A';
    // Team members guess THEIR OWN team's word, not the opposing team's
    const targetWord = isTeamA ? this.gameState.teamASelectedWord : this.gameState.teamBSelectedWord;
    const guessedSet = isTeamA ? this.gameState.teamAGuessedPlayerIds : this.gameState.teamBGuessedPlayerIds;
    const myTeamDrawer = isTeamA ? this.gameState.currentTeamADrawer : this.gameState.currentTeamBDrawer;

    console.log('🎯 [TEAM_GUESS] Processing:', {
      guesser: guesser.name,
      team,
      guess: guessText,
      targetWord,
      isDrawer: guesser.id === myTeamDrawer.id,
      alreadyGuessed: guessedSet.has(guesser.id)
    });

    // Prevent drawer from guessing
    if (guesser.id === myTeamDrawer.id) {
      console.log('❌ [TEAM_GUESS] Drawer cannot guess');
      return;
    }

    // Prevent duplicate guesses
    if (guessedSet.has(guesser.id)) {
      console.log('❌ [TEAM_GUESS] Already guessed');
      return;
    }

    // Check if guess is correct (guessing own team's word)
    if (isCorrectGuess(guessText, targetWord)) {
      console.log(`✅ [TEAM_${team}] Correct guess!`, { guesser: guesser.name, word: targetWord });
      
      if (isTeamA) {
        this.gameState.addTeamAGuess(guesser.id);
      } else {
        this.gameState.addTeamBGuess(guesser.id);
      }

      // Team mode scoring is team-only: +1 to the winning team.
      this.gameState.addTeamScore(team, 1);

      // Broadcast to team channel
      this.io.to(this.roomId).emit(SOCKET_EVENTS.CORRECT_GUESS, {
        team,
        guesserId: guesser.id,
        guesserName: guesser.name,
        correctWord: targetWord,
        teamRoundPoint: 1,
        winningTeam: team
      });

      // Broadcast system message to team
      this.io.to(this.roomId).emit('message', {
        user: '',
        text: `[Team ${team}] ${guesser.name} guessed correctly. Team ${team} wins the round (+1 point).`,
        roomId: this.roomId,
        channel: isTeamA ? 'teamA' : 'teamB',
        timestamp: Date.now()
      });

      // First correct guess ends the team round immediately.
      this.clearTimer('drawing');
      this.endTeamTurn(team);
    } else {
      console.log(`❌ [TEAM_${team}] Incorrect guess:`, guessText);
      this.io.to(this.roomId).emit(SOCKET_EVENTS.INCORRECT_GUESS, {
        team,
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

  endTeamTurn(winningTeam = null) {
    console.log('🏁 [TEAM_TURN_END] Ending team turn:', {
      teamAWord: this.gameState.teamASelectedWord,
      teamBWord: this.gameState.teamBSelectedWord,
      winningTeam
    });

    this.clearTimer('drawing');

    // Team mode uses team-only round scoring.
    this.roundScores = winningTeam
      ? { 'team-A': winningTeam === 'A' ? 1 : 0, 'team-B': winningTeam === 'B' ? 1 : 0 }
      : { 'team-A': 0, 'team-B': 0 };

    // Broadcast turn ended
    this.io.to(this.roomId).emit(SOCKET_EVENTS.TURN_ENDED, {
      isTeamMode: true,
      teamAWord: this.gameState.teamASelectedWord,
      teamBWord: this.gameState.teamBSelectedWord,
      winningTeam
    });

    // Show team scoreboard
    this.showTeamScoreboard(winningTeam);
  }

  showTeamScoreboard(winningTeam = null) {
    this.gameState.updatePhase(GAME_PHASES.SCOREBOARD);

    const teamAPlayers = this.gameState.teamAPlayers;
    const teamBPlayers = this.gameState.teamBPlayers;
    const teamAScore = this.gameState.teamScores?.A || 0;
    const teamBScore = this.gameState.teamScores?.B || 0;
    const scoreboard = [
      { id: 'team-A', name: 'Team A', score: teamAScore },
      { id: 'team-B', name: 'Team B', score: teamBScore }
    ].sort((a, b) => b.score - a.score);
    const roundScores = this.roundScores || {};

    console.log('🏆 [TEAM_SCOREBOARD] Showing scoreboard:', {
      teamAScore,
      teamBScore,
      round: this.gameState.currentRound
    });

    this.io.to(this.roomId).emit(SOCKET_EVENTS.SCOREBOARD_DISPLAY, {
      isTeamMode: true,
      scores: scoreboard,
      roundScores,
      teamA: { score: teamAScore, players: teamAPlayers },
      teamB: { score: teamBScore, players: teamBPlayers },
      teamScores: { A: teamAScore, B: teamBScore },
      winningTeam,
      round: this.gameState.currentRound,
      totalRounds: this.gameState.config.totalRounds
    });

    // Reset round scores for next turn
    this.roundScores = {};

    // Move to next turn
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
    if (this.gameState?.isTeamMode) {
      const teamAScore = this.gameState.teamScores?.A || 0;
      const teamBScore = this.gameState.teamScores?.B || 0;
      const finalLeaderboard = [
        { id: 'team-A', name: 'Team A', score: teamAScore },
        { id: 'team-B', name: 'Team B', score: teamBScore }
      ].sort((a, b) => b.score - a.score);

      const winner = teamAScore === teamBScore
        ? { id: 'team-tie', name: 'Tie', score: teamAScore }
        : (teamAScore > teamBScore
          ? { id: 'team-A', name: 'Team A', score: teamAScore }
          : { id: 'team-B', name: 'Team B', score: teamBScore });

      console.log('🎮 [GAME_END] Team game finished:', {
        teamScores: { A: teamAScore, B: teamBScore },
        winner
      });

      this.clearAllTimers();
      this.gameState.updatePhase(GAME_PHASES.GAME_ENDED);

      this.io.to(this.roomId).emit(SOCKET_EVENTS.GAME_ENDED, {
        isTeamMode: true,
        leaderboard: finalLeaderboard,
        winner,
        teamScores: { A: teamAScore, B: teamBScore }
      });

      this.gameState.reset();
      return;
    }

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
          score: p.score,
          team: p.team || null
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
          score: p.score,
          team: p.team || null
        });
      }
    });

    return {
      phase: this.gameState.currentPhase,
      round: this.gameState.currentRound,
      totalRounds: this.gameState.config.totalRounds,
      players: Array.from(playerMap.values()),
      teamScores: this.gameState.isTeamMode ? { ...this.gameState.teamScores } : null,
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
