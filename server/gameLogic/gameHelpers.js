import { SCORE_SETTINGS } from './constants.js';
import { getEasyWords } from './words/easyWords.js';
import { getMediumWords } from './words/mediumWords.js';
import { getHardWords } from './words/hardWords.js';

/**
 * Game helper utilities
 */

/**
 * Select n random words from the word pool
 */
export function selectRandomWords(count = 3, difficulty = 'medium') {
  const pool = (() => {
    if (difficulty === 'easy') return getEasyWords();
    if (difficulty === 'hard') return getHardWords();
    return getMediumWords();
  })();

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}

/**
 * Check if a guess matches the word (case-insensitive, trim whitespace)
 */
export function isCorrectGuess(guess, word) {
  if (!guess || !word) return false;
  return guess.trim().toLowerCase() === word.toLowerCase();
}

/**
 * Calculate score based on remaining time (EXPONENTIAL DECAY)
 * Less time elapsed (faster guess) = higher score
 * 0 seconds elapsed (instant guess) = 450 points
 * 60 seconds elapsed (timeout) = ~197 points (minimum 20)
 * Uses exponential curve: maxPoints * (1 + ratio) ^ (-1.2)
 */

export function calculateGuesserScore(remainingTimeMs, maxTimeMs = 60000) {
  const elapsedTime = maxTimeMs - remainingTimeMs;
  const elapsedSeconds = elapsedTime / 1000;
  const maxTimeSeconds = maxTimeMs / 1000;
  const maxPoints = 450;
  
  // Exponential decay curve (moderate steepness)
  // Early guesses worth much more, late guesses still earn something
  const ratio = elapsedSeconds / maxTimeSeconds;
  const score = maxPoints * Math.pow(1 + ratio, -1.2);
  
  return Math.max(20, Math.min(450, Math.floor(score)));
}

/**
 * Calculate drawer score based on number of correct guessers
 */
export function calculateDrawerScore(guessers) {
  const baseScore = SCORE_SETTINGS.DRAWER_BASE_SCORE;
  return baseScore + ((guessers-1) * 50); // +50 points for each correct guesser
}

/**
 * Get remaining time in milliseconds
 */
export function getRemainingTime(startTimeMs, durationMs) {
  const elapsed = Date.now() - startTimeMs;
  return Math.max(0, durationMs - elapsed);
}
