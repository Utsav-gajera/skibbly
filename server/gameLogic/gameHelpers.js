import { WORD_POOL, SCORE_SETTINGS } from './constants.js';

/**
 * Game helper utilities
 */

/**
 * Select n random words from the word pool
 */
export function selectRandomWords(count = 3) {
  const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, WORD_POOL.length));
}

/**
 * Check if a guess matches the word (case-insensitive, trim whitespace)
 */
export function isCorrectGuess(guess, word) {
  if (!guess || !word) return false;
  return guess.trim().toLowerCase() === word.toLowerCase();
}

/**
 * Calculate score based on remaining time (INVERSE function)
 * Less time remaining (faster guess) = higher score
 * 0 seconds remaining = 450 points
 * 60 seconds remaining = 0 points
 */
export function calculateGuesserScore(remainingTimeMs, maxTimeMs = 60000) {
  const elapsedTime = maxTimeMs - remainingTimeMs;
  const elapsedSeconds = elapsedTime / 1000;
  const maxTimeSeconds = maxTimeMs / 1000;
  const score = Math.floor((elapsedSeconds / maxTimeSeconds) * 450);
  return Math.max(0, Math.min(450, score));
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
