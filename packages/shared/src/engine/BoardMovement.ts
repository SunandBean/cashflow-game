import { RAT_RACE_SIZE, FAST_TRACK_SIZE, PAYDAY_POSITIONS, RAT_RACE_SPACES, FAST_TRACK_SPACES } from '../constants/index.js';
import type { RatRaceSpaceType, FastTrackSpaceType } from '../types/index.js';

/** Move player on the rat race track (circular board) */
export function movePlayer(currentPosition: number, diceRoll: number, boardSize: number = RAT_RACE_SIZE): number {
  return (currentPosition + diceRoll) % boardSize;
}

/** Move player on the fast track board (circular, 18 spaces) */
export function moveFastTrackPlayer(position: number, diceRoll: number): number {
  return (position + diceRoll) % FAST_TRACK_SIZE;
}

/** Get the space type at a given position on the rat race track */
export function getSpaceType(position: number): RatRaceSpaceType {
  return RAT_RACE_SPACES[position].type;
}

/** Get the space type at a given position on the fast track */
export function getFastTrackSpaceType(position: number): FastTrackSpaceType {
  return FAST_TRACK_SPACES[position].type;
}

/** Get the fast track space at a given position */
export function getFastTrackSpace(position: number) {
  return FAST_TRACK_SPACES[position];
}

/** Check if the player passed or landed on a PayDay space */
export function passedPayDay(oldPosition: number, newPosition: number): boolean {
  return countPayDaysPassed(oldPosition, newPosition) > 0;
}

/** Count how many PayDay spaces the player passed (including landing on one) */
export function countPayDaysPassed(oldPosition: number, newPosition: number): number {
  let count = 0;
  if (newPosition > oldPosition) {
    // Normal movement (no wraparound)
    for (const payDay of PAYDAY_POSITIONS) {
      if (payDay > oldPosition && payDay <= newPosition) {
        count++;
      }
    }
  } else {
    // Wrapped around the board
    for (const payDay of PAYDAY_POSITIONS) {
      if (payDay > oldPosition || payDay <= newPosition) {
        count++;
      }
    }
  }
  return count;
}

/** Get the dice roll total (sum of two dice, or one die if using single) */
export function getDiceTotal(diceValues: [number, number], useTwoDice: boolean = false): number {
  return useTwoDice ? diceValues[0] + diceValues[1] : diceValues[0];
}
