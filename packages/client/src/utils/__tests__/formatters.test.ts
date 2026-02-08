import { describe, it, expect } from 'vitest';
import { TurnPhase } from '@cashflow/shared';
import { formatPhase } from '../formatters.js';

describe('formatPhase', () => {
  it.each([
    [TurnPhase.ROLL_DICE, 'Roll the Dice'],
    [TurnPhase.PAY_DAY_COLLECTION, 'Collect Pay Day'],
    [TurnPhase.RESOLVE_SPACE, 'Resolve Space'],
    [TurnPhase.MAKE_DECISION, 'Make a Decision'],
    [TurnPhase.END_OF_TURN, 'End of Turn'],
    [TurnPhase.GAME_OVER, 'Game Over'],
    [TurnPhase.BANKRUPTCY_DECISION, 'Bankruptcy Decision'],
    [TurnPhase.WAITING_FOR_DEAL_RESPONSE, 'Waiting for Deal Response'],
  ])('maps %s to "%s"', (phase, expected) => {
    expect(formatPhase(phase)).toBe(expected);
  });

  it('returns the original string for an unknown phase', () => {
    expect(formatPhase('UNKNOWN_PHASE' as TurnPhase)).toBe('UNKNOWN_PHASE');
  });

  it('returns non-empty strings for all known phases', () => {
    const allPhases = Object.values(TurnPhase);
    for (const phase of allPhases) {
      const result = formatPhase(phase);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    }
  });
});
