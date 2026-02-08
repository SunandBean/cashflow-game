import type { Player } from './player.js';
import type { SmallDealCard, BigDealCard, MarketCard, DoodadCard } from './cards.js';

// ── Turn Phases ──

export enum TurnPhase {
  ROLL_DICE = 'ROLL_DICE',
  PAY_DAY_COLLECTION = 'PAY_DAY_COLLECTION',
  RESOLVE_SPACE = 'RESOLVE_SPACE',
  MAKE_DECISION = 'MAKE_DECISION',
  END_OF_TURN = 'END_OF_TURN',
  GAME_OVER = 'GAME_OVER',
  BANKRUPTCY_DECISION = 'BANKRUPTCY_DECISION',
  WAITING_FOR_DEAL_RESPONSE = 'WAITING_FOR_DEAL_RESPONSE',
}

// ── Active Card ──

export type ActiveCard =
  | { type: 'smallDeal'; card: SmallDealCard }
  | { type: 'bigDeal'; card: BigDealCard }
  | { type: 'market'; card: MarketCard }
  | { type: 'doodad'; card: DoodadCard }
  | null;

// ── Game Actions ──

export type GameAction =
  | { type: 'ROLL_DICE'; playerId: string; diceValues: [number, number]; useBothDice?: boolean }
  | { type: 'CHOOSE_DEAL_TYPE'; playerId: string; dealType: 'small' | 'big' }
  | { type: 'BUY_ASSET'; playerId: string; shares?: number }
  | { type: 'SELL_ASSET'; playerId: string; assetId: string; shares?: number; price?: number }
  | { type: 'SKIP_DEAL'; playerId: string }
  | { type: 'PAY_EXPENSE'; playerId: string }
  | { type: 'ACCEPT_CHARITY'; playerId: string }
  | { type: 'DECLINE_CHARITY'; playerId: string }
  | { type: 'TAKE_LOAN'; playerId: string; amount: number }
  | { type: 'PAY_OFF_LOAN'; playerId: string; loanType: string; amount: number }
  | { type: 'END_TURN'; playerId: string }
  | { type: 'COLLECT_PAY_DAY'; playerId: string }
  | { type: 'CHOOSE_DREAM'; playerId: string; dream: string }
  | { type: 'SELL_TO_MARKET'; playerId: string; assetId: string }
  | { type: 'DECLINE_MARKET'; playerId: string }
  | { type: 'DECLARE_BANKRUPTCY'; playerId: string }
  | { type: 'OFFER_DEAL_TO_PLAYER'; playerId: string; targetPlayerId: string; askingPrice: number }
  | { type: 'ACCEPT_PLAYER_DEAL'; playerId: string }
  | { type: 'DECLINE_PLAYER_DEAL'; playerId: string }
  ;

// ── Game Log ──

export interface GameLogEntry {
  timestamp: number;
  playerId: string;
  message: string;
}

// ── Deck State ──

export interface DeckState {
  smallDealDeck: SmallDealCard[];
  bigDealDeck: BigDealCard[];
  marketDeck: MarketCard[];
  doodadDeck: DoodadCard[];
  smallDealDiscard: SmallDealCard[];
  bigDealDiscard: BigDealCard[];
  marketDiscard: MarketCard[];
  doodadDiscard: DoodadCard[];
}

// ── Game State ──

export interface PendingPlayerDeal {
  sellerId: string;
  buyerId: string;
  card: import('./cards.js').DealCardData;
  askingPrice: number;
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  activeCard: ActiveCard;
  diceResult: [number, number] | null;
  decks: DeckState;
  log: GameLogEntry[];
  turnNumber: number;
  winner: string | null; // player ID
  pendingPlayerDeal: PendingPlayerDeal | null;
  nextAssetId: number;
  payDaysRemaining: number;
}

// ── Game Settings ──

export interface GameSettings {
  maxPlayers: number;
  enableFastTrack: boolean;
}
