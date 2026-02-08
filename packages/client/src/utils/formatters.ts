import { TurnPhase } from '@cashflow/shared';

export function formatPhase(phase: TurnPhase): string {
  switch (phase) {
    case TurnPhase.ROLL_DICE: return 'Roll the Dice';
    case TurnPhase.PAY_DAY_COLLECTION: return 'Collect Pay Day';
    case TurnPhase.RESOLVE_SPACE: return 'Resolve Space';
    case TurnPhase.MAKE_DECISION: return 'Make a Decision';
    case TurnPhase.END_OF_TURN: return 'End of Turn';
    case TurnPhase.GAME_OVER: return 'Game Over';
    default: return phase;
  }
}
