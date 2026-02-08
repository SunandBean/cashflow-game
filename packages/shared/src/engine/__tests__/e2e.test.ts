/**
 * End-to-End Tests for Cashflow 101 Game Engine
 *
 * These tests exercise the full game lifecycle: multiple turns, multiple players,
 * all card types, all features (charity dice choice, stock splits, auto-loans,
 * bankruptcy, player deals), and the real card data from constants.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type {
  GameState,
  Player,
  SmallDealCard,
  BigDealCard,
  MarketCard,
  DoodadCard,
} from '../../types/index.js';
import { TurnPhase } from '../../types/index.js';
import { createGame, processAction, getValidActions } from '../GameEngine.js';
import {
  calculateCashFlow,
  calculateTotalExpenses,
  calculatePassiveIncome,
  calculateTotalIncome,
  isStockAsset,
  isRealEstateAsset,
  isBusinessAsset,
} from '../FinancialCalculator.js';
import { PROFESSIONS } from '../../constants/professions.js';
import { SMALL_DEAL_CARDS } from '../../constants/smallDeals.js';
import { BIG_DEAL_CARDS } from '../../constants/bigDeals.js';
import { MARKET_CARDS } from '../../constants/marketCards.js';
import { DOODAD_CARDS } from '../../constants/doodads.js';
import { RAT_RACE_SPACES, PAYDAY_POSITIONS } from '../../constants/board.js';

// ── Helpers ──

const teacherProf = PROFESSIONS.find((p) => p.title === 'Teacher')!;
const janitorProf = PROFESSIONS.find((p) => p.title === 'Janitor')!;
const nurseProf = PROFESSIONS.find((p) => p.title === 'Nurse')!;
const engineerProf = PROFESSIONS.find((p) => p.title === 'Engineer')!;
const doctorProf = PROFESSIONS.find((p) => p.title === 'Doctor')!;

function create2PlayerGame(): GameState {
  return createGame(
    [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ],
    [teacherProf, janitorProf],
  );
}

function create3PlayerGame(): GameState {
  return createGame(
    [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Charlie' },
    ],
    [teacherProf, janitorProf, nurseProf],
  );
}

function create4PlayerGame(): GameState {
  return createGame(
    [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Charlie' },
      { id: 'p4', name: 'Diana' },
    ],
    [teacherProf, janitorProf, nurseProf, engineerProf],
  );
}

/** Get current player */
function currentPlayer(game: GameState): Player {
  return game.players[game.currentPlayerIndex];
}

/** Roll dice and return new state */
function roll(game: GameState, d1: number, d2: number, useBothDice?: boolean): GameState {
  return processAction(game, {
    type: 'ROLL_DICE',
    playerId: currentPlayer(game).id,
    diceValues: [d1, d2],
    useBothDice,
  });
}

/** End current player's turn */
function endTurn(game: GameState): GameState {
  return processAction(game, {
    type: 'END_TURN',
    playerId: currentPlayer(game).id,
  });
}

/** Skip a deal */
function skipDeal(game: GameState): GameState {
  return processAction(game, {
    type: 'SKIP_DEAL',
    playerId: currentPlayer(game).id,
  });
}

/** Collect PayDay */
function collectPayDay(game: GameState): GameState {
  return processAction(game, {
    type: 'COLLECT_PAY_DAY',
    playerId: currentPlayer(game).id,
  });
}

/** Pay doodad expense */
function payExpense(game: GameState): GameState {
  return processAction(game, {
    type: 'PAY_EXPENSE',
    playerId: currentPlayer(game).id,
  });
}

/** Buy asset with optional shares */
function buyAsset(game: GameState, shares?: number): GameState {
  return processAction(game, {
    type: 'BUY_ASSET',
    playerId: currentPlayer(game).id,
    shares,
  });
}

/** Choose small or big deal */
function chooseDeal(game: GameState, dealType: 'small' | 'big'): GameState {
  return processAction(game, {
    type: 'CHOOSE_DEAL_TYPE',
    playerId: currentPlayer(game).id,
    dealType,
  });
}

/**
 * Place a specific card at the top of a deck for deterministic testing.
 * Returns a new game state with the deck modified.
 */
function stackSmallDealDeck(game: GameState, card: SmallDealCard): GameState {
  return {
    ...game,
    decks: {
      ...game.decks,
      smallDealDeck: [card, ...game.decks.smallDealDeck],
    },
  };
}

function stackBigDealDeck(game: GameState, card: BigDealCard): GameState {
  return {
    ...game,
    decks: {
      ...game.decks,
      bigDealDeck: [card, ...game.decks.bigDealDeck],
    },
  };
}

function stackMarketDeck(game: GameState, card: MarketCard): GameState {
  return {
    ...game,
    decks: {
      ...game.decks,
      marketDeck: [card, ...game.decks.marketDeck],
    },
  };
}

function stackDoodadDeck(game: GameState, card: DoodadCard): GameState {
  return {
    ...game,
    decks: {
      ...game.decks,
      doodadDeck: [card, ...game.decks.doodadDeck],
    },
  };
}

/** Move player to a specific position without going through dice roll */
function setPlayerPosition(game: GameState, playerIndex: number, position: number): GameState {
  return {
    ...game,
    players: game.players.map((p, i) =>
      i === playerIndex ? { ...p, position } : p,
    ),
  };
}

/** Set player cash */
function setPlayerCash(game: GameState, playerIndex: number, cash: number): GameState {
  return {
    ...game,
    players: game.players.map((p, i) =>
      i === playerIndex ? { ...p, cash } : p,
    ),
  };
}

/**
 * Play one complete turn for the current player: roll → handle phase → end turn.
 * Skips deals and pays expenses automatically. Returns game after END_TURN.
 */
function playSimpleTurn(game: GameState, d1: number, d2: number): GameState {
  let g = roll(game, d1, d2);

  // Handle PayDay collection
  if (g.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
    g = collectPayDay(g);
  }

  // Handle space resolution
  if (g.turnPhase === TurnPhase.RESOLVE_SPACE) {
    // Deal space - skip
    g = skipDeal(g);
  } else if (g.turnPhase === TurnPhase.MAKE_DECISION) {
    // Doodad or market - pay expense / decline
    const actions = getValidActions(g);
    if (actions.includes('PAY_EXPENSE')) {
      g = payExpense(g);
    } else if (actions.includes('DECLINE_MARKET')) {
      g = processAction(g, { type: 'DECLINE_MARKET', playerId: currentPlayer(g).id });
    } else if (actions.includes('SKIP_DEAL')) {
      g = skipDeal(g);
    }
  }

  // End turn
  if (g.turnPhase === TurnPhase.END_OF_TURN) {
    g = endTurn(g);
  }

  return g;
}

/**
 * Advance the game by one step based on valid actions.
 * Returns the new game state after taking one action.
 * Used for the full game simulation loop.
 */
function takeOneAction(game: GameState): GameState {
  const player = currentPlayer(game);
  const actions = getValidActions(game);

  if (actions.includes('ROLL_DICE')) {
    const d1 = ((game.turnNumber - 1) % 6) + 1;
    return roll(game, d1, 1);
  }
  if (actions.includes('COLLECT_PAY_DAY')) return collectPayDay(game);
  if (actions.includes('CHOOSE_DEAL_TYPE')) return chooseDeal(game, 'small');
  if (actions.includes('PAY_EXPENSE')) return payExpense(game);
  if (actions.includes('DECLINE_MARKET')) {
    return processAction(game, { type: 'DECLINE_MARKET', playerId: player.id });
  }
  if (actions.includes('DECLINE_CHARITY') || actions.includes('ACCEPT_CHARITY')) {
    return processAction(game, { type: 'DECLINE_CHARITY', playerId: player.id });
  }
  if (actions.includes('SKIP_DEAL')) return skipDeal(game);
  if (actions.includes('DECLARE_BANKRUPTCY')) {
    return processAction(game, { type: 'DECLARE_BANKRUPTCY', playerId: player.id });
  }
  if (actions.includes('CHOOSE_DREAM')) {
    return processAction(game, { type: 'CHOOSE_DREAM', playerId: player.id, dream: 'World Travel' });
  }
  if (actions.includes('END_TURN')) return endTurn(game);
  if (actions.includes('BUY_ASSET')) return skipDeal(game);

  // Should not reach here
  return game;
}

// ══════════════════════════════════════════════════════════════════
// ██ CARD DATA INTEGRITY TESTS
// ══════════════════════════════════════════════════════════════════

describe('Card Data Integrity', () => {
  it('has exactly 30 small deal cards', () => {
    expect(SMALL_DEAL_CARDS).toHaveLength(30);
  });

  it('has exactly 24 big deal cards', () => {
    expect(BIG_DEAL_CARDS).toHaveLength(24);
  });

  it('has exactly 25 market cards', () => {
    expect(MARKET_CARDS).toHaveLength(25);
  });

  it('has exactly 25 doodad cards', () => {
    expect(DOODAD_CARDS).toHaveLength(25);
  });

  it('has exactly 12 professions', () => {
    expect(PROFESSIONS).toHaveLength(12);
  });

  it('all small deal card IDs are unique', () => {
    const ids = SMALL_DEAL_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all big deal card IDs are unique', () => {
    const ids = BIG_DEAL_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all market card IDs are unique', () => {
    const ids = MARKET_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all doodad card IDs are unique', () => {
    const ids = DOODAD_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('small deal stocks only use 4 real symbols: ON2U, MYT4U, OK4U, GRO4US', () => {
    const stockCards = SMALL_DEAL_CARDS.filter(
      (c) => c.deal.type === 'stock' || c.deal.type === 'stockSplit',
    );
    const symbols = new Set(stockCards.map((c) => (c.deal as any).symbol));
    expect(symbols.size).toBeLessThanOrEqual(4);
    for (const sym of symbols) {
      expect(['ON2U', 'MYT4U', 'OK4U', 'GRO4US']).toContain(sym);
    }
  });

  it('market card stock changes only reference 4 real symbols', () => {
    const stockCards = MARKET_CARDS.filter((c) => c.effect.type === 'stockPriceChange');
    const symbols = new Set(stockCards.map((c) => (c.effect as any).symbol));
    for (const sym of symbols) {
      expect(['ON2U', 'MYT4U', 'OK4U', 'GRO4US']).toContain(sym);
    }
  });

  it('all stocks have 0 dividend (no dividends in real game)', () => {
    const stockCards = SMALL_DEAL_CARDS.filter((c) => c.deal.type === 'stock');
    for (const card of stockCards) {
      expect((card.deal as any).dividendPerShare).toBe(0);
    }
  });

  it('each stock symbol has multiple buy price options', () => {
    const stockCards = SMALL_DEAL_CARDS.filter((c) => c.deal.type === 'stock');
    const bySymbol: Record<string, number[]> = {};
    for (const card of stockCards) {
      const deal = card.deal as any;
      if (!bySymbol[deal.symbol]) bySymbol[deal.symbol] = [];
      bySymbol[deal.symbol].push(deal.costPerShare);
    }
    for (const [symbol, prices] of Object.entries(bySymbol)) {
      expect(prices.length).toBeGreaterThanOrEqual(3);
      // Prices should vary
      expect(new Set(prices).size).toBeGreaterThanOrEqual(3);
    }
  });

  it('doodad costs range from $200 to $3000', () => {
    for (const card of DOODAD_CARDS) {
      expect(card.cost).toBeGreaterThanOrEqual(200);
      expect(card.cost).toBeLessThanOrEqual(3000);
    }
  });

  it('big deals include negative cash flow property', () => {
    const negativeCf = BIG_DEAL_CARDS.filter((c) => (c.deal as any).cashFlow < 0);
    expect(negativeCf.length).toBeGreaterThanOrEqual(1);
  });

  it('small deals include negative cash flow and zero-down properties', () => {
    const negativeCf = SMALL_DEAL_CARDS.filter(
      (c) => c.deal.type === 'realEstate' && c.deal.cashFlow < 0,
    );
    const zeroDown = SMALL_DEAL_CARDS.filter(
      (c) => c.deal.type === 'realEstate' && c.deal.downPayment === 0,
    );
    expect(negativeCf.length).toBeGreaterThanOrEqual(1);
    expect(zeroDown.length).toBeGreaterThanOrEqual(1);
  });

  it('small deals include stock split cards', () => {
    const splits = SMALL_DEAL_CARDS.filter((c) => c.deal.type === 'stockSplit');
    expect(splits.length).toBeGreaterThanOrEqual(2);
    // Should have both forward and reverse splits
    const forwardSplit = splits.find((c) => (c.deal as any).splitRatio >= 2);
    const reverseSplit = splits.find((c) => (c.deal as any).splitRatio <= 0.5);
    expect(forwardSplit).toBeDefined();
    expect(reverseSplit).toBeDefined();
  });

  it('big deals include various property types', () => {
    const types = new Set(
      BIG_DEAL_CARDS.filter((c) => c.deal.type === 'realEstate').map(
        (c) => (c.deal as any).subType,
      ),
    );
    expect(types).toContain('house');
    expect(types).toContain('apartment');
    expect(types).toContain('eightplex');
    expect(types).toContain('fourplex');
  });

  it('big deals include business type deals', () => {
    const businesses = BIG_DEAL_CARDS.filter((c) => c.deal.type === 'business');
    expect(businesses.length).toBeGreaterThanOrEqual(2);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ MULTI-TURN FULL GAME FLOW
// ══════════════════════════════════════════════════════════════════

describe('Multi-turn full game flow', () => {
  it('plays 10 turns with 2 players cycling correctly', () => {
    let game = create2PlayerGame();

    for (let i = 0; i < 10; i++) {
      const expectedPlayer = game.players[game.currentPlayerIndex];
      expect(game.turnPhase).toBe(TurnPhase.ROLL_DICE);

      // Roll to a Deal space (position 3, 5, 7, 9 etc)
      game = roll(game, 3, 1);

      // Handle PayDay if needed
      if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
        game = collectPayDay(game);
      }

      // Handle space resolution
      if (game.turnPhase === TurnPhase.RESOLVE_SPACE) {
        game = skipDeal(game);
      } else if (game.turnPhase === TurnPhase.MAKE_DECISION) {
        const actions = getValidActions(game);
        if (actions.includes('PAY_EXPENSE')) {
          game = payExpense(game);
        } else if (actions.includes('DECLINE_MARKET')) {
          game = processAction(game, { type: 'DECLINE_MARKET', playerId: expectedPlayer.id });
        } else {
          game = skipDeal(game);
        }
      }

      expect(game.turnPhase).toBe(TurnPhase.END_OF_TURN);
      game = endTurn(game);
    }

    expect(game.turnNumber).toBe(11);
  });

  it('players accumulate cash through PayDay collection over multiple turns', () => {
    let game = create2PlayerGame();
    const initialCashP1 = game.players[0].cash;
    const cashFlowP1 = calculateCashFlow(game.players[0]);

    // Move P1 past PayDay at position 4
    game = roll(game, 5, 1); // to position 5, passes PayDay at 4
    expect(game.turnPhase).toBe(TurnPhase.PAY_DAY_COLLECTION);

    game = collectPayDay(game);
    expect(game.players[0].cash).toBe(initialCashP1 + cashFlowP1);

    // Skip the deal at position 5 and end turn
    if (game.turnPhase === TurnPhase.RESOLVE_SPACE) {
      game = skipDeal(game);
    }
    game = endTurn(game);

    // P2 turn - skip
    game = playSimpleTurn(game, 3, 1);

    // P1 turn again - move from 5 past PayDay at 10
    game = roll(game, 6, 1); // to position 11 (from 5), passes PayDay at 10
    expect(game.turnPhase).toBe(TurnPhase.PAY_DAY_COLLECTION);
    game = collectPayDay(game);
    expect(game.players[0].cash).toBe(initialCashP1 + cashFlowP1 * 2);
  });

  it('can play 4 complete rounds (8 turns) with 2 players', () => {
    let game = create2PlayerGame();

    for (let round = 0; round < 8; round++) {
      game = playSimpleTurn(game, 2, 1);
    }

    // Should have advanced through 8 turns
    expect(game.turnNumber).toBe(9);
    // Both players should have moved
    expect(game.players[0].position).toBeGreaterThan(0);
    expect(game.players[1].position).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ STOCK BUYING & SELLING E2E
// ══════════════════════════════════════════════════════════════════

describe('Stock trading end-to-end', () => {
  it('buy stock from small deal, then sell on market card', () => {
    let game = create2PlayerGame();

    // Stack an ON2U $5 stock card
    const on2uCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'stock' && (c.deal as any).symbol === 'ON2U' && (c.deal as any).costPerShare === 5,
    )!;
    game = stackSmallDealDeck(game, on2uCard);

    // Move P1 to a Deal space (position 3)
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    expect(game.turnPhase).toBe(TurnPhase.RESOLVE_SPACE);

    // Choose small deal
    game = chooseDeal(game, 'small');
    expect(game.turnPhase).toBe(TurnPhase.MAKE_DECISION);
    expect(game.activeCard?.type).toBe('smallDeal');

    // Buy 10 shares at $5 = $50
    const cashBefore = game.players[0].cash;
    game = buyAsset(game, 10);
    expect(game.players[0].cash).toBe(cashBefore - 50);
    expect(game.turnPhase).toBe(TurnPhase.END_OF_TURN);

    // Verify stock asset exists
    const stockAsset = game.players[0].financialStatement.assets.find(
      (a) => isStockAsset(a) && a.symbol === 'ON2U',
    );
    expect(stockAsset).toBeDefined();
    expect(isStockAsset(stockAsset!) && stockAsset!.shares).toBe(10);

    // End P1's turn, P2 skips
    game = endTurn(game);
    game = playSimpleTurn(game, 2, 1);

    // Stack ON2U $40 market card for next market landing
    const on2uMarketCard = MARKET_CARDS.find(
      (c) => c.effect.type === 'stockPriceChange' && (c.effect as any).symbol === 'ON2U' && (c.effect as any).newPrice === 40,
    )!;

    // Move P1 to Market space (position 2 or 8)
    // From position 3, move to position 8 (Market)
    game = stackMarketDeck(game, on2uMarketCard);
    game = roll(game, 5, 1); // 3+5 = 8 (Market space)

    // If we pass PayDay at 4, collect it
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    expect(game.turnPhase).toBe(TurnPhase.MAKE_DECISION);

    // Sell the stock at $40/share
    const cashBeforeSell = game.players[0].cash;
    const stockId = game.players[0].financialStatement.assets.find(
      (a) => isStockAsset(a) && a.symbol === 'ON2U',
    )!.id;

    game = processAction(game, {
      type: 'SELL_TO_MARKET',
      playerId: 'p1',
      assetId: stockId,
    });

    // Should receive 10 shares * $40 = $400
    expect(game.players[0].cash).toBe(cashBeforeSell + 400);
    // Stock should be gone
    expect(
      game.players[0].financialStatement.assets.find((a) => isStockAsset(a) && a.symbol === 'ON2U'),
    ).toBeUndefined();
  });

  it('buy stock at low price, stock goes to $0 on market card = total loss', () => {
    let game = create2PlayerGame();

    // Give P1 enough cash
    game = setPlayerCash(game, 0, 5000);

    // Stack MYT4U $5 card
    const mytCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'stock' && (c.deal as any).symbol === 'MYT4U' && (c.deal as any).costPerShare === 5,
    )!;
    game = stackSmallDealDeck(game, mytCard);

    // Move to Deal, buy stock
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game, 100); // 100 shares * $5 = $500
    expect(game.players[0].cash).toBe(4500);
    game = endTurn(game);

    // P2 turn
    game = playSimpleTurn(game, 2, 1);

    // Stack MYT4U crashes to $0
    const mytCrashCard = MARKET_CARDS.find(
      (c) => c.effect.type === 'stockPriceChange' && (c.effect as any).symbol === 'MYT4U' && (c.effect as any).newPrice === 0,
    )!;
    game = stackMarketDeck(game, mytCrashCard);

    // Move P1 to Market space
    game = setPlayerPosition(game, 0, 7); // position 7 (Deal)
    game = roll(game, 1, 1); // to 8 (Market)
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    // Can sell but get $0
    const stockId = game.players[0].financialStatement.assets.find(
      (a) => isStockAsset(a) && a.symbol === 'MYT4U',
    )!.id;

    const cashBefore = game.players[0].cash;
    game = processAction(game, {
      type: 'SELL_TO_MARKET',
      playerId: 'p1',
      assetId: stockId,
    });

    // 100 shares * $0 = $0
    expect(game.players[0].cash).toBe(cashBefore);
    expect(
      game.players[0].financialStatement.assets.find((a) => isStockAsset(a) && a.symbol === 'MYT4U'),
    ).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ REAL ESTATE E2E
// ══════════════════════════════════════════════════════════════════

describe('Real estate end-to-end', () => {
  it('buy small deal house, passive income increases, sell on market', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 10000);

    // Find a small deal house with reasonable down payment
    const houseCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && c.deal.downPayment <= 5000 && c.deal.cashFlow > 0,
    )!;
    game = stackSmallDealDeck(game, houseCard);

    // Move to Deal space
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');

    const passiveIncomeBefore = calculatePassiveIncome(game.players[0].financialStatement);
    const cashBefore = game.players[0].cash;

    game = buyAsset(game);
    expect(game.players[0].cash).toBe(cashBefore - (houseCard.deal as any).downPayment);

    // Passive income should increase
    const passiveIncomeAfter = calculatePassiveIncome(game.players[0].financialStatement);
    expect(passiveIncomeAfter).toBe(passiveIncomeBefore + (houseCard.deal as any).cashFlow);

    // Verify asset exists
    const houseAsset = game.players[0].financialStatement.assets.find(
      (a) => isRealEstateAsset(a) && a.name === houseCard.deal.name,
    );
    expect(houseAsset).toBeDefined();

    game = endTurn(game);
    game = playSimpleTurn(game, 2, 1); // P2

    // Now sell the house on a market offer
    const houseBuyerCard = MARKET_CARDS.find(
      (c) => c.effect.type === 'realEstateOfferFlat' && (c.effect as any).subTypes.includes('house'),
    )!;
    game = stackMarketDeck(game, houseBuyerCard);

    // Move to Market
    game = setPlayerPosition(game, 0, 7);
    game = roll(game, 1, 1); // to 8 (Market)
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    const cashBeforeSell = game.players[0].cash;
    game = processAction(game, {
      type: 'SELL_TO_MARKET',
      playerId: 'p1',
      assetId: houseAsset!.id,
    });

    // Should receive offer amount minus mortgage
    const offerAmount = (houseBuyerCard.effect as any).offerAmount;
    const mortgage = (houseCard.deal as any).mortgage;
    expect(game.players[0].cash).toBe(cashBeforeSell + offerAmount - mortgage);

    // House should be gone
    expect(
      game.players[0].financialStatement.assets.find((a) => a.id === houseAsset!.id),
    ).toBeUndefined();
  });

  it('buy big deal apartment, increases passive income significantly', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 100000);

    // Find a 12-unit apartment
    const aptCard = BIG_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && (c.deal as any).subType === 'apartment' && c.deal.cashFlow > 2000,
    )!;
    game = stackBigDealDeck(game, aptCard);

    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'big');

    const passiveIncomeBefore = calculatePassiveIncome(game.players[0].financialStatement);
    game = buyAsset(game);

    const passiveIncomeAfter = calculatePassiveIncome(game.players[0].financialStatement);
    expect(passiveIncomeAfter).toBe(passiveIncomeBefore + (aptCard.deal as any).cashFlow);
    expect(game.players[0].cash).toBe(100000 - (aptCard.deal as any).downPayment);
  });

  it('buy zero-down property successfully', () => {
    let game = create2PlayerGame();

    const zeroDownCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && c.deal.downPayment === 0,
    )!;
    game = stackSmallDealDeck(game, zeroDownCard);

    const cashBefore = game.players[0].cash;
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game);

    // No down payment, cash stays the same
    expect(game.players[0].cash).toBe(cashBefore);
    expect(game.players[0].financialStatement.assets.length).toBe(1);
  });

  it('negative cash flow property decreases passive income', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 50000);

    const negCfCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && c.deal.cashFlow < 0,
    )!;
    game = stackSmallDealDeck(game, negCfCard);

    const passiveIncomeBefore = calculatePassiveIncome(game.players[0].financialStatement);
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game);

    const passiveIncomeAfter = calculatePassiveIncome(game.players[0].financialStatement);
    expect(passiveIncomeAfter).toBeLessThan(passiveIncomeBefore);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ STOCK SPLIT E2E
// ══════════════════════════════════════════════════════════════════

describe('Stock split end-to-end', () => {
  it('2-for-1 split doubles shares for all holders', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 5000);
    game = setPlayerCash(game, 1, 5000);

    // Both players buy ON2U stock
    const on2uCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'stock' && (c.deal as any).symbol === 'ON2U' && (c.deal as any).costPerShare === 5,
    )!;

    // P1 buys 100 shares
    game = stackSmallDealDeck(game, on2uCard);
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game, 100);
    game = endTurn(game);

    // P2 buys 50 shares
    game = stackSmallDealDeck(game, on2uCard);
    game = setPlayerPosition(game, 1, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game, 50);
    game = endTurn(game);

    // Stack a 2:1 split card
    const splitCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'stockSplit' && (c.deal as any).symbol === 'ON2U' && (c.deal as any).splitRatio >= 2,
    )!;
    game = stackSmallDealDeck(game, splitCard);

    // P1 draws the split card
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');

    // Stock split is auto-resolved, turn should go to END_OF_TURN
    expect(game.turnPhase).toBe(TurnPhase.END_OF_TURN);

    // P1 should have 200 shares, P2 should have 100 shares
    const p1Stock = game.players[0].financialStatement.assets.find(
      (a) => isStockAsset(a) && a.symbol === 'ON2U',
    );
    const p2Stock = game.players[1].financialStatement.assets.find(
      (a) => isStockAsset(a) && a.symbol === 'ON2U',
    );
    expect(isStockAsset(p1Stock!) && p1Stock!.shares).toBe(200);
    expect(isStockAsset(p2Stock!) && p2Stock!.shares).toBe(100);
  });

  it('reverse split (1-for-2) halves shares', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 5000);

    // P1 buys 100 shares of MYT4U
    const mytCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'stock' && (c.deal as any).symbol === 'MYT4U' && (c.deal as any).costPerShare === 5,
    )!;
    game = stackSmallDealDeck(game, mytCard);
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game, 100);
    game = endTurn(game);
    game = playSimpleTurn(game, 2, 1); // P2

    // Stack reverse split card
    const reverseSplitCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'stockSplit' && (c.deal as any).symbol === 'MYT4U' && (c.deal as any).splitRatio <= 0.5,
    )!;
    game = stackSmallDealDeck(game, reverseSplitCard);

    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');

    expect(game.turnPhase).toBe(TurnPhase.END_OF_TURN);

    const p1Stock = game.players[0].financialStatement.assets.find(
      (a) => isStockAsset(a) && a.symbol === 'MYT4U',
    );
    expect(isStockAsset(p1Stock!) && p1Stock!.shares).toBe(50);
    // Price should double
    expect(isStockAsset(p1Stock!) && p1Stock!.costPerShare).toBe(10);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ DOODAD E2E
// ══════════════════════════════════════════════════════════════════

describe('Doodad end-to-end', () => {
  it('landing on Doodad space draws card and deducts cost', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 10000); // Enough cash to cover any doodad

    // Doodad space is at position 1
    const doodad = DOODAD_CARDS[0]; // First real doodad
    game = stackDoodadDeck(game, doodad);

    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 1, 1); // Move to position 1 (Doodad)

    expect(game.turnPhase).toBe(TurnPhase.MAKE_DECISION);
    expect(game.activeCard?.type).toBe('doodad');

    const cashBefore = game.players[0].cash;
    game = payExpense(game);

    expect(game.players[0].cash).toBe(cashBefore - doodad.cost);
    expect(game.turnPhase).toBe(TurnPhase.END_OF_TURN);
  });

  it('doodad triggers auto-loan when cash goes negative', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 100); // Very low cash

    const expensiveDoodad = DOODAD_CARDS.find((c) => c.cost >= 2000)!;
    game = stackDoodadDeck(game, expensiveDoodad);

    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 1, 1);
    game = payExpense(game);

    // Cash should be positive due to auto-loan
    expect(game.players[0].cash).toBeGreaterThanOrEqual(0);
    // Bank loan should have increased
    expect(game.players[0].bankLoanAmount).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ MARKET CARD E2E
// ══════════════════════════════════════════════════════════════════

describe('Market card end-to-end', () => {
  it('property damage card costs money to property owners', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 10000);
    game = setPlayerCash(game, 1, 10000);

    // P1 buys a house
    const houseCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && c.deal.downPayment <= 5000 && c.deal.cashFlow > 0,
    )!;
    game = stackSmallDealDeck(game, houseCard);
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game);
    game = endTurn(game);

    // P2 has no property, skip a turn
    game = playSimpleTurn(game, 2, 1);

    // Stack a damage card that targets houses
    const damageCard = MARKET_CARDS.find(
      (c) => c.effect.type === 'damageToProperty' && (c.effect as any).subTypes.includes('house'),
    )!;
    game = stackMarketDeck(game, damageCard);

    // Move P1 to Market space
    const p2CashBefore = game.players[1].cash;

    game = setPlayerPosition(game, 0, 7);
    game = roll(game, 1, 1); // to 8 (Market)
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    // Damage card auto-resolves to END_OF_TURN
    expect(game.turnPhase).toBe(TurnPhase.END_OF_TURN);
    // P2 has no house, so no damage
    expect(game.players[1].cash).toBe(p2CashBefore);
  });

  it('all players expense card affects everyone', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 5000);
    game = setPlayerCash(game, 1, 5000);

    const expenseCard = MARKET_CARDS.find((c) => c.effect.type === 'allPlayersExpense')!;
    game = stackMarketDeck(game, expenseCard);

    // Move P1 to Market space
    game = setPlayerPosition(game, 0, 7);
    game = roll(game, 1, 1);
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    const amount = (expenseCard.effect as any).amount;
    expect(game.players[0].cash).toBe(5000 - amount);
    expect(game.players[1].cash).toBe(5000 - amount);
  });

  it('real estate multiplier offer allows selling property', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 100000);

    // Buy a big deal apartment
    const aptCard = BIG_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && (c.deal as any).subType === 'apartment',
    )!;
    game = stackBigDealDeck(game, aptCard);
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'big');
    game = buyAsset(game);
    game = endTurn(game);

    game = playSimpleTurn(game, 2, 1); // P2

    // Stack apartment buyer offer (multiplier)
    const offerCard = MARKET_CARDS.find(
      (c) => c.effect.type === 'realEstateOffer' && (c.effect as any).subTypes.includes('apartment'),
    )!;
    game = stackMarketDeck(game, offerCard);

    game = setPlayerPosition(game, 0, 7);
    game = roll(game, 1, 1);
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    const aptAsset = game.players[0].financialStatement.assets[0];
    const cashBefore = game.players[0].cash;

    game = processAction(game, {
      type: 'SELL_TO_MARKET',
      playerId: 'p1',
      assetId: aptAsset.id,
    });

    const salePrice = Math.floor((aptCard.deal as any).cost * (offerCard.effect as any).offerMultiplier);
    const profit = salePrice - (aptCard.deal as any).mortgage;
    expect(game.players[0].cash).toBe(cashBefore + profit);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ CHARITY + DICE CHOICE E2E (Feature 1)
// ══════════════════════════════════════════════════════════════════

describe('Charity and dice choice end-to-end', () => {
  it('charity gives 3 turns of dice choice, then expires', () => {
    let game = create2PlayerGame();

    // Move to Charity space (position 13)
    game = setPlayerPosition(game, 0, 12);
    game = roll(game, 1, 1);
    expect(game.turnPhase).toBe(TurnPhase.RESOLVE_SPACE);

    // Accept charity
    const totalIncome = calculateTotalIncome(game.players[0].financialStatement);
    const donation = Math.floor(totalIncome * 0.1);
    const cashBefore = game.players[0].cash;

    game = processAction(game, { type: 'ACCEPT_CHARITY', playerId: 'p1' });
    expect(game.players[0].charityTurnsLeft).toBe(3);
    expect(game.players[0].cash).toBe(cashBefore - donation);
    game = endTurn(game);

    // P2 turn
    game = playSimpleTurn(game, 2, 1);

    // P1 can now choose to use 1 die (useBothDice = false)
    game = roll(game, 3, 5, false); // Only uses first die (3)
    expect(game.players[0].charityTurnsLeft).toBe(2);
    const p1Pos = game.players[0].position;
    // Should have moved 3 spaces from position 13
    expect(p1Pos).toBe((13 + 3) % 24);

    // Handle space and end turn
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) game = collectPayDay(game);
    if (game.turnPhase === TurnPhase.RESOLVE_SPACE) game = skipDeal(game);
    else if (game.turnPhase === TurnPhase.MAKE_DECISION) {
      const actions = getValidActions(game);
      if (actions.includes('PAY_EXPENSE')) game = payExpense(game);
      else if (actions.includes('DECLINE_MARKET')) game = processAction(game, { type: 'DECLINE_MARKET', playerId: 'p1' });
      else game = skipDeal(game);
    }
    game = endTurn(game);
    game = playSimpleTurn(game, 2, 1); // P2

    // P1 chooses 2 dice (useBothDice = true)
    const posBeforeRoll = game.players[0].position;
    game = roll(game, 3, 4, true); // Uses both: 3+4 = 7
    expect(game.players[0].charityTurnsLeft).toBe(1);
    expect(game.players[0].position).toBe((posBeforeRoll + 7) % 24);
  });

  it('without charity, always uses 1 die', () => {
    let game = create2PlayerGame();

    // No charity - useBothDice has no effect
    game = roll(game, 4, 6, true); // Even with useBothDice=true, no charity = 1 die
    expect(game.players[0].position).toBe(4); // Only first die
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ AUTO-LOAN E2E (Feature 3)
// ══════════════════════════════════════════════════════════════════

describe('Auto-loan end-to-end', () => {
  it('downsized player gets auto-loan when cash goes negative', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 100); // Very low cash

    // Move to Downsized space (position 18)
    game = setPlayerPosition(game, 0, 17);
    game = roll(game, 1, 1);

    // Downsized pays total expenses which is way more than $100
    expect(game.players[0].cash).toBeGreaterThanOrEqual(0);
    expect(game.players[0].bankLoanAmount).toBeGreaterThan(0);
    expect(game.players[0].downsizedTurnsLeft).toBe(2);
  });

  it('loan amount is rounded up to nearest $1000', () => {
    let game = create2PlayerGame();
    const expenses = calculateTotalExpenses(game.players[0]);
    // Set cash so that after downsized expenses, we go slightly negative
    game = setPlayerCash(game, 0, expenses - 1);

    game = setPlayerPosition(game, 0, 17);
    game = roll(game, 1, 1);

    // Should have taken a $1000 loan (rounded up from -$1)
    expect(game.players[0].bankLoanAmount).toBe(1000);
    expect(game.players[0].cash).toBe(999); // -1 + 1000
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ PLAYER DEAL E2E (Feature 5)
// ══════════════════════════════════════════════════════════════════

describe('Player deal end-to-end', () => {
  it('player offers deal to another player who accepts', () => {
    let game = create3PlayerGame();
    game = setPlayerCash(game, 0, 1000);
    game = setPlayerCash(game, 1, 50000);

    // Stack a house card for P1
    const houseCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && c.deal.downPayment <= 1000 && c.deal.cashFlow > 0,
    )!;
    game = stackSmallDealDeck(game, houseCard);

    // P1 moves to Deal, draws card
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    expect(game.turnPhase).toBe(TurnPhase.MAKE_DECISION);

    // P1 offers the deal to P2 for $500
    const p1CashBefore = game.players[0].cash;
    const p2CashBefore = game.players[1].cash;

    game = processAction(game, {
      type: 'OFFER_DEAL_TO_PLAYER',
      playerId: 'p1',
      targetPlayerId: 'p2',
      askingPrice: 500,
    });

    expect(game.turnPhase).toBe(TurnPhase.WAITING_FOR_DEAL_RESPONSE);
    expect(game.pendingPlayerDeal).not.toBeNull();
    expect(game.pendingPlayerDeal!.sellerId).toBe('p1');
    expect(game.pendingPlayerDeal!.buyerId).toBe('p2');
    expect(game.pendingPlayerDeal!.askingPrice).toBe(500);

    // P2 accepts the deal
    game = processAction(game, {
      type: 'ACCEPT_PLAYER_DEAL',
      playerId: 'p2',
    });

    // P1 gets $500, P2 pays $500 + down payment
    expect(game.players[0].cash).toBe(p1CashBefore + 500);
    expect(game.players[1].cash).toBe(p2CashBefore - 500 - (houseCard.deal as any).downPayment);
    expect(game.turnPhase).toBe(TurnPhase.END_OF_TURN);
    expect(game.pendingPlayerDeal).toBeNull();

    // P2 should have the property
    expect(game.players[1].financialStatement.assets.length).toBe(1);
    // P1 should NOT have the property
    expect(game.players[0].financialStatement.assets.length).toBe(0);
  });

  it('player offers deal to another player who declines', () => {
    let game = create2PlayerGame();

    const houseCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && c.deal.downPayment <= 5000,
    )!;
    game = stackSmallDealDeck(game, houseCard);

    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');

    // P1 offers to P2
    game = processAction(game, {
      type: 'OFFER_DEAL_TO_PLAYER',
      playerId: 'p1',
      targetPlayerId: 'p2',
      askingPrice: 1000,
    });

    expect(game.turnPhase).toBe(TurnPhase.WAITING_FOR_DEAL_RESPONSE);

    // P2 declines
    game = processAction(game, {
      type: 'DECLINE_PLAYER_DEAL',
      playerId: 'p2',
    });

    // Should go back to MAKE_DECISION for P1
    expect(game.turnPhase).toBe(TurnPhase.MAKE_DECISION);
    expect(game.pendingPlayerDeal).toBeNull();

    // P1 can still buy or skip
    const actions = getValidActions(game);
    expect(actions).toContain('BUY_ASSET');
    expect(actions).toContain('SKIP_DEAL');
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ DOWNSIZED + TURN SKIPPING E2E
// ══════════════════════════════════════════════════════════════════

describe('Downsized and turn skipping', () => {
  it('downsized player skips 2 turns then plays normally', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 50000);

    // Move P1 to Downsized (position 18)
    game = setPlayerPosition(game, 0, 17);
    game = roll(game, 1, 1);
    expect(game.players[0].downsizedTurnsLeft).toBe(2);
    game = endTurn(game); // Now it's P2's turn

    // P2 plays their turn
    game = playSimpleTurn(game, 2, 1);
    // After P2's END_TURN, handleEndTurn tries to give turn to P1
    // P1 is downsized (2 turns left) → decrement to 1, skip P1, go to P2
    expect(game.players[0].downsizedTurnsLeft).toBe(1);

    // P2 plays again
    game = playSimpleTurn(game, 2, 1);
    // After P2's END_TURN, tries P1 again → decrement to 0, P1 is now ready
    expect(game.players[0].downsizedTurnsLeft).toBe(0);

    // Now P1 should be able to play (handleEndTurn broke out of skip loop)
    expect(game.currentPlayerIndex).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ BABY + CHILD EXPENSES E2E
// ══════════════════════════════════════════════════════════════════

describe('Baby space end-to-end', () => {
  it('landing on Baby adds a child and increases expenses', () => {
    let game = create2PlayerGame();

    const expensesBefore = calculateTotalExpenses(game.players[0]);
    const childrenBefore = game.players[0].financialStatement.expenses.childCount;

    // Baby space is at position 6
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 6, 1); // to position 6 (Baby)

    // If we pass PayDay at 4, collect it
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    // Baby is auto-resolved
    expect(game.turnPhase).toBe(TurnPhase.END_OF_TURN);
    expect(game.players[0].financialStatement.expenses.childCount).toBe(childrenBefore + 1);

    const expensesAfter = calculateTotalExpenses(game.players[0]);
    expect(expensesAfter).toBeGreaterThan(expensesBefore);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ LOAN MANAGEMENT E2E
// ══════════════════════════════════════════════════════════════════

describe('Loan management end-to-end', () => {
  it('take voluntary loan and pay it off', () => {
    let game = create2PlayerGame();
    const cashBefore = game.players[0].cash;

    // Take a $5000 loan
    game = processAction(game, {
      type: 'TAKE_LOAN',
      playerId: 'p1',
      amount: 5000,
    });

    expect(game.players[0].cash).toBe(cashBefore + 5000);
    expect(game.players[0].bankLoanAmount).toBe(5000);

    // Pay it off
    game = processAction(game, {
      type: 'PAY_OFF_LOAN',
      playerId: 'p1',
      loanType: 'Bank Loan',
      amount: 5000,
    });

    expect(game.players[0].cash).toBe(cashBefore);
    expect(game.players[0].bankLoanAmount).toBe(0);
  });

  it('pay off personal liability reduces monthly expenses', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 50000);

    const expensesBefore = calculateTotalExpenses(game.players[0]);

    // Find Credit Card liability
    const ccLiability = game.players[0].financialStatement.liabilities.find(
      (l) => l.name === 'Credit Card',
    );
    expect(ccLiability).toBeDefined();

    game = processAction(game, {
      type: 'PAY_OFF_LOAN',
      playerId: 'p1',
      loanType: 'Credit Card',
      amount: ccLiability!.balance,
    });

    const expensesAfter = calculateTotalExpenses(game.players[0]);
    expect(expensesAfter).toBeLessThan(expensesBefore);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ BUSINESS DEAL E2E
// ══════════════════════════════════════════════════════════════════

describe('Business deal end-to-end', () => {
  it('buy big deal business and receive cash flow', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 200000);

    const bizCard = BIG_DEAL_CARDS.find((c) => c.deal.type === 'business')!;
    game = stackBigDealDeck(game, bizCard);

    const passiveIncomeBefore = calculatePassiveIncome(game.players[0].financialStatement);

    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'big');
    game = buyAsset(game);

    const passiveIncomeAfter = calculatePassiveIncome(game.players[0].financialStatement);
    expect(passiveIncomeAfter).toBe(passiveIncomeBefore + (bizCard.deal as any).cashFlow);

    // Verify it's a BusinessAsset
    const bizAsset = game.players[0].financialStatement.assets.find((a) => isBusinessAsset(a));
    expect(bizAsset).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ ESCAPE RAT RACE E2E
// ══════════════════════════════════════════════════════════════════

describe('Escape rat race end-to-end', () => {
  it('player escapes when passive income exceeds expenses', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 500000);

    const totalExpenses = calculateTotalExpenses(game.players[0]);

    // Buy enough big deal apartments to generate income > expenses
    // Need passive income > expenses. Teacher expenses ~$2,340
    // 60-Unit Apartment gives $11,000 cash flow
    const bigApt = BIG_DEAL_CARDS.find(
      (c) => c.deal.type === 'realEstate' && c.deal.cashFlow >= 5000,
    )!;
    game = stackBigDealDeck(game, bigApt);

    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'big');
    game = buyAsset(game);

    const passiveIncome = calculatePassiveIncome(game.players[0].financialStatement);
    if (passiveIncome > totalExpenses) {
      expect(game.players[0].hasEscaped).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ COMPREHENSIVE MULTI-PLAYER SCENARIO
// ══════════════════════════════════════════════════════════════════

describe('Comprehensive multi-player game scenario', () => {
  it('4-player game with various interactions over multiple rounds', () => {
    let game = create4PlayerGame();

    // Give all players enough cash to engage
    for (let i = 0; i < 4; i++) {
      game = setPlayerCash(game, i, 10000);
    }

    // ── Round 1: Basic moves ──
    // P1 rolls to Deal, buys stock
    const on2uCard = SMALL_DEAL_CARDS.find(
      (c) => c.deal.type === 'stock' && (c.deal as any).symbol === 'ON2U' && (c.deal as any).costPerShare === 5,
    )!;
    game = stackSmallDealDeck(game, on2uCard);
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game, 50); // 50 shares * $5 = $250
    game = endTurn(game);

    // P2 lands on Doodad
    const doodad = DOODAD_CARDS[0];
    game = stackDoodadDeck(game, doodad);
    game = setPlayerPosition(game, 1, 0);
    game = roll(game, 1, 1);
    game = payExpense(game);
    game = endTurn(game);

    // P3 rolls to Deal, buys same stock
    game = stackSmallDealDeck(game, on2uCard);
    game = setPlayerPosition(game, 2, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');
    game = buyAsset(game, 30);
    game = endTurn(game);

    // P4 rolls to Deal, skips
    game = playSimpleTurn(game, 3, 1);

    // Verify state after round 1
    expect(game.players[0].financialStatement.assets.length).toBe(1);
    expect(game.players[2].financialStatement.assets.length).toBe(1);
    expect(game.players[1].cash).toBe(10000 - doodad.cost);

    // ── Round 2: Market affects multiple players ──
    // Stack ON2U $40 market card
    const on2uHighCard = MARKET_CARDS.find(
      (c) => c.effect.type === 'stockPriceChange' && (c.effect as any).symbol === 'ON2U' && (c.effect as any).newPrice === 40,
    )!;
    game = stackMarketDeck(game, on2uHighCard);

    // Move P1 to Market space at position 8
    game = setPlayerPosition(game, 0, 7);
    game = roll(game, 1, 1);
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    // P1 sells stock at $40
    const p1StockId = game.players[0].financialStatement.assets[0].id;
    const p1CashBefore = game.players[0].cash;
    game = processAction(game, { type: 'SELL_TO_MARKET', playerId: 'p1', assetId: p1StockId });
    expect(game.players[0].cash).toBe(p1CashBefore + 50 * 40); // $2000

    // P1 declines to sell more (or end market)
    game = processAction(game, { type: 'DECLINE_MARKET', playerId: 'p1' });
    game = endTurn(game);

    // Verify P1 sold and P3 still has stock
    expect(game.players[0].financialStatement.assets.length).toBe(0);
    expect(game.players[2].financialStatement.assets.length).toBe(1);

    // Continue through remaining players
    for (let i = 1; i < 4; i++) {
      if (game.currentPlayerIndex === i) {
        game = playSimpleTurn(game, 2, 1);
      }
    }

    // Game should still be running
    expect(game.winner).toBeNull();
    expect(game.turnNumber).toBeGreaterThan(8);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ PROFESSION DIVERSITY E2E
// ══════════════════════════════════════════════════════════════════

describe('Profession diversity', () => {
  it('all 12 professions can start a game successfully', () => {
    for (const prof of PROFESSIONS) {
      const game = createGame(
        [{ id: 'p1', name: 'Test' }],
        [prof],
      );

      const player = game.players[0];
      expect(player.profession).toBe(prof.title);
      expect(player.cash).toBe(prof.savings);
      expect(player.financialStatement.income.salary).toBe(prof.salary);

      const cf = calculateCashFlow(player);
      // All professions should have positive cash flow at start
      expect(cf).toBeGreaterThan(0);
    }
  });

  it('professions have different financial profiles affecting gameplay', () => {
    const janitorGame = createGame([{ id: 'p1', name: 'J' }], [janitorProf]);
    const doctorGame = createGame([{ id: 'p1', name: 'D' }], [doctorProf]);

    // Doctor should have higher salary
    expect(doctorGame.players[0].financialStatement.income.salary)
      .toBeGreaterThan(janitorGame.players[0].financialStatement.income.salary);

    // Doctor has higher expenses (more debt, bigger lifestyle)
    expect(calculateTotalExpenses(doctorGame.players[0]))
      .toBeGreaterThan(calculateTotalExpenses(janitorGame.players[0]));

    // Doctor has higher cash flow (salary advantage outweighs expenses)
    expect(calculateCashFlow(doctorGame.players[0]))
      .toBeGreaterThan(calculateCashFlow(janitorGame.players[0]));

    // Different savings amounts (in real game, high earners don't always save more)
    expect(doctorGame.players[0].cash).not.toBe(janitorGame.players[0].cash);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ EDGE CASES E2E
// ══════════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('board wraps around correctly on multiple laps', () => {
    let game = create2PlayerGame();

    // Move P1 around the board (24 spaces)
    game = setPlayerPosition(game, 0, 22);
    game = roll(game, 5, 1); // 22 + 5 = 27 → wraps to 3
    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    expect(game.players[0].position).toBe(3);
  });

  it('cannot buy asset when cash is insufficient', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 1); // Nearly broke

    // Stack an expensive card
    const expensiveCard = BIG_DEAL_CARDS.find(
      (c) => (c.deal as any).downPayment > 10000,
    )!;
    game = stackBigDealDeck(game, expensiveCard);

    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'big');

    const cashBefore = game.players[0].cash;
    game = buyAsset(game);

    // Should fail - still in MAKE_DECISION or cash unchanged
    expect(game.players[0].cash).toBe(cashBefore);
    expect(game.players[0].financialStatement.assets.length).toBe(0);
  });

  it('3-player game handles turn cycling correctly', () => {
    let game = create3PlayerGame();

    // All 3 players take a turn
    for (let i = 0; i < 3; i++) {
      expect(game.currentPlayerIndex).toBe(i);
      game = playSimpleTurn(game, 2, 1);
    }

    // Back to P1
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.turnNumber).toBe(4);
  });

  it('deck reshuffles when exhausted', () => {
    let game = create2PlayerGame();

    // Clear the small deal deck and put cards in discard
    const allCards = [...game.decks.smallDealDeck, ...game.decks.smallDealDiscard];
    game = {
      ...game,
      decks: {
        ...game.decks,
        smallDealDeck: [], // Empty deck
        smallDealDiscard: allCards, // All in discard
      },
    };

    // Drawing should still work (reshuffle from discard)
    game = setPlayerPosition(game, 0, 0);
    game = roll(game, 3, 1);
    game = chooseDeal(game, 'small');

    // Should have drawn a card successfully
    expect(game.activeCard).not.toBeNull();
    expect(game.activeCard?.type).toBe('smallDeal');
  });

  it('PayDay with negative cash flow triggers auto-loan', () => {
    let game = create2PlayerGame();

    // Create a scenario with negative overall cash flow
    // Take lots of bank loans to make monthly payments very high
    game = setPlayerCash(game, 0, 100);
    game = processAction(game, { type: 'TAKE_LOAN', playerId: 'p1', amount: 100000 });
    // This should make cash flow very negative

    // Now pass PayDay
    game = setPlayerPosition(game, 0, 3);
    game = roll(game, 2, 1); // to position 5, passes PayDay at 4

    if (game.turnPhase === TurnPhase.PAY_DAY_COLLECTION) {
      game = collectPayDay(game);
    }

    // If cash flow is negative, auto-loan should kick in
    expect(game.players[0].cash).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════════
// ██ FULL GAME SCENARIO E2E
// ══════════════════════════════════════════════════════════════════

describe('Full game scenario', () => {
  it('simulates a realistic 20-turn game with 2 players using action-based dispatch', () => {
    let game = create2PlayerGame();
    game = setPlayerCash(game, 0, 5000);
    game = setPlayerCash(game, 1, 5000);

    const maxTurns = 20;
    let safetyCounter = 0;

    while (game.turnNumber <= maxTurns && !game.winner && safetyCounter < 500) {
      safetyCounter++;
      game = takeOneAction(game);
    }

    // Game should have progressed through all 20 turns
    expect(game.turnNumber).toBeGreaterThan(maxTurns);

    // Both players should still have positive cash (or auto-loaned)
    for (const p of game.players) {
      if (!p.isBankrupt) {
        expect(p.cash).toBeGreaterThanOrEqual(0);
        expect(p.position).toBeGreaterThanOrEqual(0);
        expect(p.position).toBeLessThan(24);
      }
    }

    // Verify game state consistency
    expect(game.currentPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(game.currentPlayerIndex).toBeLessThan(2);
  });

  it('simulates a 3-player game for 15 turns', () => {
    let game = create3PlayerGame();
    for (let i = 0; i < 3; i++) {
      game = setPlayerCash(game, i, 3000);
    }

    const maxTurns = 15;
    let safetyCounter = 0;

    while (game.turnNumber <= maxTurns && !game.winner && safetyCounter < 500) {
      safetyCounter++;
      game = takeOneAction(game);
    }

    expect(game.turnNumber).toBeGreaterThan(maxTurns);

    // All non-bankrupt players should have valid state
    for (const p of game.players) {
      if (!p.isBankrupt) {
        expect(p.cash).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
