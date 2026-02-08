import { describe, it, expect } from 'vitest';
import {
  movePlayer,
  getSpaceType,
  passedPayDay,
  countPayDaysPassed,
  getDiceTotal,
} from '../BoardMovement.js';
import { RAT_RACE_SIZE, PAYDAY_POSITIONS } from '../../constants/index.js';

// ── movePlayer ──

describe('movePlayer', () => {
  it('moves player forward by the dice roll', () => {
    expect(movePlayer(0, 3)).toBe(3);
  });

  it('wraps around the board', () => {
    // Board has 24 spaces (0-23), position 22 + 5 = 27 -> 27 % 24 = 3
    expect(movePlayer(22, 5)).toBe(3);
  });

  it('wraps around exactly to position 0', () => {
    expect(movePlayer(20, 4)).toBe(0);
  });

  it('handles position 0 + small roll', () => {
    expect(movePlayer(0, 1)).toBe(1);
  });

  it('handles large roll at end of board', () => {
    // position 23 + 6 = 29 -> 29 % 24 = 5
    expect(movePlayer(23, 6)).toBe(5);
  });

  it('uses the default board size (RAT_RACE_SIZE = 24)', () => {
    expect(movePlayer(20, 10)).toBe((20 + 10) % RAT_RACE_SIZE);
  });

  it('accepts custom board size', () => {
    expect(movePlayer(8, 5, 10)).toBe(3); // 13 % 10 = 3
  });

  it('roll of 0 keeps same position', () => {
    expect(movePlayer(5, 0)).toBe(5);
  });

  it('full loop (rolling exactly board size) returns to same position', () => {
    expect(movePlayer(7, 24)).toBe(7);
  });
});

// ── getSpaceType ──

describe('getSpaceType', () => {
  it('position 0 is Deal', () => {
    expect(getSpaceType(0)).toBe('Deal');
  });

  it('position 1 is Doodad', () => {
    expect(getSpaceType(1)).toBe('Doodad');
  });

  it('position 2 is Market', () => {
    expect(getSpaceType(2)).toBe('Market');
  });

  it('position 4 is PayDay', () => {
    expect(getSpaceType(4)).toBe('PayDay');
  });

  it('position 6 is Baby', () => {
    expect(getSpaceType(6)).toBe('Baby');
  });

  it('position 10 is PayDay', () => {
    expect(getSpaceType(10)).toBe('PayDay');
  });

  it('position 13 is Charity', () => {
    expect(getSpaceType(13)).toBe('Charity');
  });

  it('position 16 is PayDay', () => {
    expect(getSpaceType(16)).toBe('PayDay');
  });

  it('position 18 is Downsized', () => {
    expect(getSpaceType(18)).toBe('Downsized');
  });

  it('position 22 is PayDay', () => {
    expect(getSpaceType(22)).toBe('PayDay');
  });

  it('position 23 is Market', () => {
    expect(getSpaceType(23)).toBe('Market');
  });
});

// ── passedPayDay ──

describe('passedPayDay', () => {
  it('returns true when moving past a PayDay space', () => {
    // PayDay at position 4: moving from 2 to 6 crosses it
    expect(passedPayDay(2, 6)).toBe(true);
  });

  it('returns true when landing exactly on a PayDay space', () => {
    // PayDay at position 4: moving from 2 to 4
    expect(passedPayDay(2, 4)).toBe(true);
  });

  it('returns false when not crossing any PayDay', () => {
    // Positions 0-3: no PayDay between them (PayDay is at 4)
    expect(passedPayDay(0, 3)).toBe(false);
  });

  it('returns true on wrap-around passing PayDay', () => {
    // Wrapping from 23 to 5: crosses PayDay at 4
    expect(passedPayDay(23, 5)).toBe(true);
  });

  it('returns false on wrap-around not passing PayDay', () => {
    // Wrapping from 23 to 2: PayDay is at 4, and none at 0-2 during wrap
    // Wait: PAYDAY_POSITIONS = [4, 10, 16, 22]. wrap from 23 -> 2 checks payDay > 23 OR payDay <= 2.
    // 4 > 23? no. 10 > 23? no. 16 > 23? no. 22 > 23? no. <= 2? 4 <= 2? no. None match.
    expect(passedPayDay(23, 2)).toBe(false);
  });

  it('returns true when wrapping past PayDay at position 22', () => {
    // Moving from 20 to 1 (wrap). PayDay at 22. payDay > 20 OR payDay <= 1
    // 22 > 20? yes. So count >= 1.
    expect(passedPayDay(20, 1)).toBe(true);
  });
});

// ── countPayDaysPassed ──

describe('countPayDaysPassed', () => {
  it('returns 0 when no PayDays crossed', () => {
    expect(countPayDaysPassed(0, 3)).toBe(0);
  });

  it('returns 1 when exactly one PayDay crossed', () => {
    // From 2 to 6: crosses PayDay at 4
    expect(countPayDaysPassed(2, 6)).toBe(1);
  });

  it('returns 2 when two PayDays crossed', () => {
    // From 2 to 12: crosses PayDay at 4 and 10
    expect(countPayDaysPassed(2, 12)).toBe(2);
  });

  it('returns 3 when three PayDays crossed', () => {
    // From 2 to 20: crosses PayDay at 4, 10, 16
    expect(countPayDaysPassed(2, 20)).toBe(3);
  });

  it('counts PayDay when landing exactly on it', () => {
    expect(countPayDaysPassed(2, 4)).toBe(1);
  });

  it('does not count the starting position as passed', () => {
    // Starting at 4 (PayDay), moving to 6: payDay > 4 && payDay <= 6 -> none of [4,10,16,22] qualify.
    expect(countPayDaysPassed(4, 6)).toBe(0);
  });

  it('handles wrap-around counting', () => {
    // From 20 to 5 (wrap): payDay > 20 OR payDay <= 5
    // 22 > 20? yes (1). 4 <= 5? yes (2). = 2
    expect(countPayDaysPassed(20, 5)).toBe(2);
  });

  it('handles wrap-around with multiple PayDays', () => {
    // From 15 to 5 (wrap): payDay > 15 OR payDay <= 5
    // 16 > 15? yes. 22 > 15? yes. 4 <= 5? yes. = 3
    expect(countPayDaysPassed(15, 5)).toBe(3);
  });

  it('full loop counts all 4 PayDays', () => {
    // PAYDAY_POSITIONS = [4, 10, 16, 22]
    // From 0 to 0 (newPosition <= oldPosition triggers wrap logic)
    // payDay > 0 OR payDay <= 0: all PayDays > 0, so all 4 match
    expect(countPayDaysPassed(0, 0)).toBe(4);
  });
});

// ── getDiceTotal ──

describe('getDiceTotal', () => {
  it('returns first die when using one die', () => {
    expect(getDiceTotal([3, 5], false)).toBe(3);
  });

  it('returns sum of both dice when using two dice', () => {
    expect(getDiceTotal([3, 5], true)).toBe(8);
  });

  it('defaults to one die', () => {
    expect(getDiceTotal([4, 6])).toBe(4);
  });

  it('handles double sixes', () => {
    expect(getDiceTotal([6, 6], true)).toBe(12);
  });

  it('handles snake eyes', () => {
    expect(getDiceTotal([1, 1], true)).toBe(2);
  });
});
