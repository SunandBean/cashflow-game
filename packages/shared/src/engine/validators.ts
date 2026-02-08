import type { GameState, GameAction } from '../types/index.js';
import { TurnPhase } from '../types/index.js';
import { calculateTotalIncome } from './FinancialCalculator.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function isPlayerTurn(state: GameState, playerId: string): boolean {
  return state.players[state.currentPlayerIndex]?.id === playerId;
}

export function canAfford(cash: number, amount: number): boolean {
  return cash >= amount;
}

export function validateAction(state: GameState, action: GameAction): ValidationResult {
  // Check game not over
  if (state.turnPhase === TurnPhase.GAME_OVER) {
    return { valid: false, error: 'Game is over' };
  }

  // Check it's the right player's turn (for most actions)
  if (action.type !== 'SELL_TO_MARKET' && action.type !== 'DECLINE_MARKET') {
    if (!isPlayerTurn(state, action.playerId)) {
      return { valid: false, error: 'Not your turn' };
    }
  }

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) {
    return { valid: false, error: 'Player not found' };
  }

  switch (action.type) {
    case 'ROLL_DICE':
      if (state.turnPhase !== TurnPhase.ROLL_DICE) {
        return { valid: false, error: 'Cannot roll dice in current phase' };
      }
      if (player.downsizedTurnsLeft > 0) {
        return { valid: false, error: 'Player is downsized and cannot roll' };
      }
      return { valid: true };

    case 'CHOOSE_DEAL_TYPE':
      if (state.turnPhase !== TurnPhase.RESOLVE_SPACE) {
        return { valid: false, error: 'Cannot choose deal type in current phase' };
      }
      return { valid: true };

    case 'BUY_ASSET':
      if (state.turnPhase !== TurnPhase.MAKE_DECISION) {
        return { valid: false, error: 'Cannot buy asset in current phase' };
      }
      if (!state.activeCard) {
        return { valid: false, error: 'No active card to buy' };
      }
      return { valid: true };

    case 'SKIP_DEAL':
      if (state.turnPhase !== TurnPhase.MAKE_DECISION && state.turnPhase !== TurnPhase.RESOLVE_SPACE) {
        return { valid: false, error: 'Cannot skip deal in current phase' };
      }
      return { valid: true };

    case 'PAY_EXPENSE':
      if (state.turnPhase !== TurnPhase.RESOLVE_SPACE && state.turnPhase !== TurnPhase.MAKE_DECISION) {
        return { valid: false, error: 'Cannot pay expense in current phase' };
      }
      return { valid: true };

    case 'ACCEPT_CHARITY':
    case 'DECLINE_CHARITY':
      if (state.turnPhase !== TurnPhase.RESOLVE_SPACE) {
        return { valid: false, error: 'Cannot handle charity in current phase' };
      }
      return { valid: true };

    case 'TAKE_LOAN':
      if (action.amount <= 0 || action.amount % 1000 !== 0) {
        return { valid: false, error: 'Loan amount must be a positive multiple of $1,000' };
      }
      return { valid: true };

    case 'PAY_OFF_LOAN':
      if (action.amount <= 0 || action.amount % 1000 !== 0) {
        return { valid: false, error: 'Payment must be a positive multiple of $1,000' };
      }
      if (action.amount > player.cash) {
        return { valid: false, error: 'Not enough cash' };
      }
      if (action.loanType === 'Bank Loan' && action.amount > player.bankLoanAmount) {
        return { valid: false, error: 'Payment exceeds loan balance' };
      }
      return { valid: true };

    case 'END_TURN':
      if (state.turnPhase !== TurnPhase.END_OF_TURN && state.turnPhase !== TurnPhase.MAKE_DECISION) {
        return { valid: false, error: 'Cannot end turn in current phase' };
      }
      return { valid: true };

    case 'COLLECT_PAY_DAY':
      if (state.turnPhase !== TurnPhase.PAY_DAY_COLLECTION) {
        return { valid: false, error: 'Cannot collect pay day in current phase' };
      }
      return { valid: true };

    case 'CHOOSE_DREAM':
      if (!player.hasEscaped) {
        return { valid: false, error: 'Player has not escaped rat race' };
      }
      if (player.dream) {
        return { valid: false, error: 'Player has already chosen a dream' };
      }
      return { valid: true };

    case 'SELL_ASSET':
      return { valid: true };

    case 'SELL_TO_MARKET':
    case 'DECLINE_MARKET':
      if (state.turnPhase !== TurnPhase.MAKE_DECISION) {
        return { valid: false, error: 'Cannot handle market action in current phase' };
      }
      return { valid: true };

    default:
      return { valid: false, error: 'Unknown action type' };
  }
}
