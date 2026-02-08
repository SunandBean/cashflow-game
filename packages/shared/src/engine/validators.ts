import type { GameState, GameAction } from '../types/index.js';
import { TurnPhase } from '../types/index.js';
import { calculateTotalIncome, getMaxBankLoan } from './FinancialCalculator.js';

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
  // Some actions can be performed by non-current players
  const nonTurnActions = ['SELL_TO_MARKET', 'DECLINE_MARKET', 'ACCEPT_PLAYER_DEAL', 'DECLINE_PLAYER_DEAL'];
  if (!nonTurnActions.includes(action.type)) {
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
      if (!Array.isArray(action.diceValues) || action.diceValues.length !== 2) {
        return { valid: false, error: 'Dice values must be an array of two numbers' };
      }
      if (!action.diceValues.every((v: number) => Number.isInteger(v) && v >= 1 && v <= 6)) {
        return { valid: false, error: 'Each die value must be an integer between 1 and 6' };
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
      if (state.turnPhase !== TurnPhase.END_OF_TURN) {
        return { valid: false, error: 'Can only take loans during end of turn' };
      }
      if (action.amount <= 0 || action.amount % 1000 !== 0) {
        return { valid: false, error: 'Loan amount must be a positive multiple of $1,000' };
      }
      {
        const maxLoan = getMaxBankLoan(player);
        if (action.amount > maxLoan) {
          return { valid: false, error: `Loan amount exceeds maximum of $${maxLoan} (cash flow must stay positive)` };
        }
      }
      return { valid: true };

    case 'PAY_OFF_LOAN':
      if (state.turnPhase !== TurnPhase.END_OF_TURN) {
        return { valid: false, error: 'Can only pay off loans during end of turn' };
      }
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
        // Allow END_TURN from ROLL_DICE for downsized players (they skip their turn)
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (state.turnPhase === TurnPhase.ROLL_DICE && currentPlayer?.downsizedTurnsLeft > 0) {
          return { valid: true };
        }
        return { valid: false, error: 'Cannot end turn in current phase' };
      }
      // Block END_TURN during MAKE_DECISION if there's a mandatory doodad expense
      if (state.turnPhase === TurnPhase.MAKE_DECISION && state.activeCard?.type === 'doodad') {
        return { valid: false, error: 'Must pay doodad expense before ending turn' };
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
      if (state.turnPhase !== TurnPhase.MAKE_DECISION && state.turnPhase !== TurnPhase.END_OF_TURN) {
        return { valid: false, error: 'Cannot sell asset in current phase' };
      }
      {
        const asset = player.financialStatement.assets.find((a) => a.id === action.assetId);
        if (!asset) {
          return { valid: false, error: 'Asset not found' };
        }
        if (action.price !== undefined && action.price < 0) {
          return { valid: false, error: 'Price must be non-negative' };
        }
        if (action.shares !== undefined && action.shares <= 0) {
          return { valid: false, error: 'Shares must be positive' };
        }
      }
      return { valid: true };

    case 'SELL_TO_MARKET':
    case 'DECLINE_MARKET':
      if (state.turnPhase !== TurnPhase.MAKE_DECISION) {
        return { valid: false, error: 'Cannot handle market action in current phase' };
      }
      return { valid: true };

    case 'DECLARE_BANKRUPTCY':
      if (state.turnPhase !== TurnPhase.BANKRUPTCY_DECISION) {
        return { valid: false, error: 'Cannot declare bankruptcy in current phase' };
      }
      return { valid: true };

    case 'OFFER_DEAL_TO_PLAYER':
      if (state.turnPhase !== TurnPhase.MAKE_DECISION) {
        return { valid: false, error: 'Cannot offer deal in current phase' };
      }
      if (!state.activeCard) {
        return { valid: false, error: 'No active card to offer' };
      }
      if (action.askingPrice <= 0) {
        return { valid: false, error: 'Asking price must be positive' };
      }
      if (action.targetPlayerId === action.playerId) {
        return { valid: false, error: 'Cannot sell to yourself' };
      }
      {
        const target = state.players.find((p) => p.id === action.targetPlayerId);
        if (!target) {
          return { valid: false, error: 'Target player not found' };
        }
        if (target.isBankrupt) {
          return { valid: false, error: 'Cannot sell to a bankrupt player' };
        }
      }
      return { valid: true };

    case 'ACCEPT_PLAYER_DEAL':
      if (state.turnPhase !== TurnPhase.WAITING_FOR_DEAL_RESPONSE) {
        return { valid: false, error: 'No pending deal to accept' };
      }
      if (!state.pendingPlayerDeal || state.pendingPlayerDeal.buyerId !== action.playerId) {
        return { valid: false, error: 'You are not the deal recipient' };
      }
      return { valid: true };

    case 'DECLINE_PLAYER_DEAL':
      if (state.turnPhase !== TurnPhase.WAITING_FOR_DEAL_RESPONSE) {
        return { valid: false, error: 'No pending deal to decline' };
      }
      if (!state.pendingPlayerDeal || state.pendingPlayerDeal.buyerId !== action.playerId) {
        return { valid: false, error: 'You are not the deal recipient' };
      }
      return { valid: true };

    default:
      return { valid: false, error: 'Unknown action type' };
  }
}
