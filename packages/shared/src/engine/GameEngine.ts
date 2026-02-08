import type {
  GameState,
  GameAction,
  Player,
  DeckState,
  SmallDealCard,
  BigDealCard,
  MarketCard,
  DoodadCard,
  GameLogEntry,
  ProfessionCard,
  PendingPlayerDeal,
} from '../types/index.js';
import { TurnPhase } from '../types/index.js';
import {
  SMALL_DEAL_CARDS,
  BIG_DEAL_CARDS,
  MARKET_CARDS,
  DOODAD_CARDS,
} from '../constants/index.js';
import {
  processPayDay,
  calculateTotalExpenses,
  calculateCashFlow,
  calculatePassiveIncome,
  canEscapeRatRace,
  addChild,
  takeBankLoan,
  payOffBankLoan,
  payOffLiability,
  calculateTotalIncome,
  autoTakeLoanIfNeeded,
  getMaxBankLoan,
  executeBankruptcy,
} from './FinancialCalculator.js';
import { movePlayer, getSpaceType, countPayDaysPassed, getDiceTotal, moveFastTrackPlayer, getFastTrackSpaceType, getFastTrackSpace } from './BoardMovement.js';
import { resolveBuyDeal, resolveMarket, resolveDoodad, resolveStockSplit, sellAssetToMarket, sellStock, resetAssetCounter } from './CardResolver.js';
import { validateAction } from './validators.js';

// ── Deck helpers ──

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawCard<T>(deck: T[], discard: T[]): { card: T; deck: T[]; discard: T[] } {
  if (deck.length === 0) {
    // Reshuffle discard pile
    const reshuffled = shuffle(discard);
    return drawCard(reshuffled, []);
  }
  const [card, ...rest] = deck;
  return { card, deck: rest, discard };
}

function createDecks(): DeckState {
  return {
    smallDealDeck: shuffle([...SMALL_DEAL_CARDS]),
    bigDealDeck: shuffle([...BIG_DEAL_CARDS]),
    marketDeck: shuffle([...MARKET_CARDS]),
    doodadDeck: shuffle([...DOODAD_CARDS]),
    smallDealDiscard: [],
    bigDealDiscard: [],
    marketDiscard: [],
    doodadDiscard: [],
  };
}

// ── Player creation ──

function createPlayer(id: string, name: string, profession: ProfessionCard): Player {
  return {
    id,
    name,
    profession: profession.title,
    financialStatement: {
      income: { salary: profession.salary },
      expenses: {
        taxes: profession.taxes,
        homeMortgagePayment: profession.homeMortgagePayment,
        schoolLoanPayment: profession.schoolLoanPayment,
        carLoanPayment: profession.carLoanPayment,
        creditCardPayment: profession.creditCardPayment,
        otherExpenses: profession.otherExpenses,
        perChildExpense: profession.perChildExpense,
        childCount: 0,
      },
      assets: [],
      liabilities: [
        ...(profession.homeMortgageBalance > 0
          ? [{ name: 'Home Mortgage', balance: profession.homeMortgageBalance, payment: profession.homeMortgagePayment }]
          : []),
        ...(profession.schoolLoanBalance > 0
          ? [{ name: 'School Loan', balance: profession.schoolLoanBalance, payment: profession.schoolLoanPayment }]
          : []),
        ...(profession.carLoanBalance > 0
          ? [{ name: 'Car Loan', balance: profession.carLoanBalance, payment: profession.carLoanPayment }]
          : []),
        ...(profession.creditCardBalance > 0
          ? [{ name: 'Credit Card', balance: profession.creditCardBalance, payment: profession.creditCardPayment }]
          : []),
      ],
    },
    cash: profession.savings,
    position: 0,
    isInFastTrack: false,
    fastTrackPosition: 0,
    fastTrackCashFlow: 0,
    hasEscaped: false,
    hasWon: false,
    dream: null,
    downsizedTurnsLeft: 0,
    charityTurnsLeft: 0,
    bankLoanAmount: 0,
    isBankrupt: false,
    bankruptTurnsLeft: 0,
  };
}

// ── Game creation ──

export function createGame(
  playerInfos: { id: string; name: string }[],
  professions: ProfessionCard[],
): GameState {
  resetAssetCounter();
  const players = playerInfos.map((info, i) => createPlayer(info.id, info.name, professions[i]));

  return {
    id: `game-${Date.now()}`,
    players,
    currentPlayerIndex: 0,
    turnPhase: TurnPhase.ROLL_DICE,
    activeCard: null,
    diceResult: null,
    decks: createDecks(),
    log: [{ timestamp: Date.now(), playerId: 'system', message: 'Game started!' }],
    turnNumber: 1,
    winner: null,
    pendingPlayerDeal: null,
  };
}

// ── Main action processor ──

export function processAction(state: GameState, action: GameAction): GameState {
  const validation = validateAction(state, action);
  if (!validation.valid) {
    return addLog(state, action.playerId, `Invalid action: ${validation.error}`);
  }

  switch (action.type) {
    case 'ROLL_DICE':
      return handleRollDice(state, action);
    case 'CHOOSE_DEAL_TYPE':
      return handleChooseDealType(state, action);
    case 'BUY_ASSET':
      return handleBuyAsset(state, action);
    case 'SKIP_DEAL':
      return handleSkipDeal(state, action);
    case 'PAY_EXPENSE':
      return handlePayExpense(state, action);
    case 'ACCEPT_CHARITY':
      return handleAcceptCharity(state, action);
    case 'DECLINE_CHARITY':
      return handleDeclineCharity(state, action);
    case 'TAKE_LOAN':
      return handleTakeLoan(state, action);
    case 'PAY_OFF_LOAN':
      return handlePayOffLoan(state, action);
    case 'END_TURN':
      return handleEndTurn(state, action);
    case 'COLLECT_PAY_DAY':
      return handleCollectPayDay(state, action);
    case 'SELL_ASSET':
      return handleSellAsset(state, action);
    case 'SELL_TO_MARKET':
      return handleSellToMarket(state, action);
    case 'DECLINE_MARKET':
      return handleDeclineMarket(state, action);
    case 'CHOOSE_DREAM':
      return handleChooseDream(state, action);
    case 'DECLARE_BANKRUPTCY':
      return handleDeclareBank(state, action);
    case 'OFFER_DEAL_TO_PLAYER':
      return handleOfferDealToPlayer(state, action);
    case 'ACCEPT_PLAYER_DEAL':
      return handleAcceptPlayerDeal(state, action);
    case 'DECLINE_PLAYER_DEAL':
      return handleDeclinePlayerDeal(state, action);
    default:
      return state;
  }
}

// ── Action handlers ──

function handleRollDice(
  state: GameState,
  action: Extract<GameAction, { type: 'ROLL_DICE' }>,
): GameState {
  const player = state.players[state.currentPlayerIndex];

  // Fast track players always use both dice
  if (player.isInFastTrack) {
    return handleFastTrackRoll(state, action);
  }

  const useTwoDice = player.charityTurnsLeft > 0 && action.useBothDice === true;
  const total = getDiceTotal(action.diceValues, useTwoDice);

  const oldPosition = player.position;
  const newPosition = movePlayer(oldPosition, total);

  // Check for PayDays passed
  const payDays = countPayDaysPassed(oldPosition, newPosition);

  let updatedPlayer = {
    ...player,
    position: newPosition,
    charityTurnsLeft: Math.max(0, player.charityTurnsLeft - 1),
  };

  let newState: GameState = {
    ...state,
    diceResult: action.diceValues,
    players: state.players.map((p, i) => (i === state.currentPlayerIndex ? updatedPlayer : p)),
  };

  newState = addLog(
    newState,
    player.id,
    `Rolled ${useTwoDice ? `${action.diceValues[0]}+${action.diceValues[1]}=` : ''}${total}, moved to space ${newPosition}`,
  );

  // Process pay days
  if (payDays > 0) {
    newState = {
      ...newState,
      turnPhase: TurnPhase.PAY_DAY_COLLECTION,
    };
    // Store how many paydays to collect
    return addLog(newState, player.id, `Passed ${payDays} PayDay${payDays > 1 ? 's' : ''}!`);
  }

  // Resolve the space the player landed on
  return resolveSpace(newState);
}

function resolveSpace(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const spaceType = getSpaceType(player.position);

  switch (spaceType) {
    case 'Deal':
      return {
        ...state,
        turnPhase: TurnPhase.RESOLVE_SPACE,
      };

    case 'Market': {
      const { card, deck, discard } = drawCard(state.decks.marketDeck, state.decks.marketDiscard);
      const newState: GameState = {
        ...state,
        activeCard: { type: 'market', card },
        decks: { ...state.decks, marketDeck: deck, marketDiscard: discard },
      };
      return resolveMarket(newState, card);
    }

    case 'Doodad': {
      const { card, deck, discard } = drawCard(state.decks.doodadDeck, state.decks.doodadDiscard);
      let newState: GameState = {
        ...state,
        activeCard: { type: 'doodad', card },
        decks: { ...state.decks, doodadDeck: deck, doodadDiscard: [...discard, card] },
        turnPhase: TurnPhase.MAKE_DECISION,
      };
      return newState;
    }

    case 'PayDay': {
      // Already handled in PayDay collection, but if landing exactly on PayDay
      // it was already counted in countPayDaysPassed
      return {
        ...state,
        turnPhase: TurnPhase.END_OF_TURN,
      };
    }

    case 'Charity':
      return {
        ...state,
        turnPhase: TurnPhase.RESOLVE_SPACE,
      };

    case 'Baby': {
      const updatedPlayer = addChild(player);
      const playerIndex = state.currentPlayerIndex;
      const childAdded = updatedPlayer.financialStatement.expenses.childCount > player.financialStatement.expenses.childCount;

      let newState = updatePlayer(state, playerIndex, updatedPlayer);
      if (childAdded) {
        newState = addLog(newState, player.id, `Had a baby! Now has ${updatedPlayer.financialStatement.expenses.childCount} child(ren). Child expenses: $${updatedPlayer.financialStatement.expenses.perChildExpense}/child/month`);
      } else {
        newState = addLog(newState, player.id, 'Already has 3 children, no more babies!');
      }
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }

    case 'Downsized': {
      const totalExpenses = calculateTotalExpenses(player);
      const updatedPlayer = {
        ...player,
        cash: player.cash - totalExpenses,
        downsizedTurnsLeft: 2,
      };
      let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
      newState = addLog(newState, player.id, `Downsized! Paid total expenses $${totalExpenses} and loses 2 turns.`);
      newState = applyAutoLoan(newState, state.currentPlayerIndex);
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }

    default:
      return { ...state, turnPhase: TurnPhase.END_OF_TURN };
  }
}

function handleChooseDealType(
  state: GameState,
  action: Extract<GameAction, { type: 'CHOOSE_DEAL_TYPE' }>,
): GameState {
  if (action.dealType === 'small') {
    const { card, deck, discard } = drawCard(state.decks.smallDealDeck, state.decks.smallDealDiscard);

    // Check if this is a stock split card - auto-resolve without player decision
    if (card.deal.type === 'stockSplit') {
      let newState: GameState = {
        ...state,
        activeCard: { type: 'smallDeal', card },
        decks: { ...state.decks, smallDealDeck: deck, smallDealDiscard: [...discard, card] },
      };
      newState = addLog(newState, action.playerId, `Drew stock split card: ${card.title}`);
      newState = resolveStockSplit(newState, card.deal);
      return {
        ...newState,
        turnPhase: TurnPhase.END_OF_TURN,
      };
    }

    return {
      ...state,
      activeCard: { type: 'smallDeal', card },
      decks: { ...state.decks, smallDealDeck: deck, smallDealDiscard: discard },
      turnPhase: TurnPhase.MAKE_DECISION,
    };
  } else {
    const { card, deck, discard } = drawCard(state.decks.bigDealDeck, state.decks.bigDealDiscard);
    return {
      ...state,
      activeCard: { type: 'bigDeal', card },
      decks: { ...state.decks, bigDealDeck: deck, bigDealDiscard: discard },
      turnPhase: TurnPhase.MAKE_DECISION,
    };
  }
}

function handleBuyAsset(
  state: GameState,
  action: Extract<GameAction, { type: 'BUY_ASSET' }>,
): GameState {
  if (!state.activeCard) return state;

  const card = state.activeCard;
  let newState: GameState;

  if (card.type === 'smallDeal' || card.type === 'bigDeal') {
    newState = resolveBuyDeal(state, card.card, action.playerId, action.shares);
    // Discard the card
    if (card.type === 'smallDeal') {
      newState = {
        ...newState,
        decks: { ...newState.decks, smallDealDiscard: [...newState.decks.smallDealDiscard, card.card] },
      };
    } else {
      newState = {
        ...newState,
        decks: { ...newState.decks, bigDealDiscard: [...newState.decks.bigDealDiscard, card.card] },
      };
    }
  } else {
    return state;
  }

  // For fast track players, buying a big deal increases their fast track cash flow
  const updatedBuyPlayer = newState.players[newState.currentPlayerIndex];
  if (updatedBuyPlayer.isInFastTrack) {
    // Calculate the cash flow from the purchased deal
    if (card.type === 'bigDeal' && card.card.deal.type !== 'stock' && card.card.deal.type !== 'stockSplit') {
      const dealCashFlow = card.card.deal.cashFlow * 100; // Fast track scale
      const ftPlayer = {
        ...updatedBuyPlayer,
        fastTrackCashFlow: updatedBuyPlayer.fastTrackCashFlow + dealCashFlow,
      };
      newState = updatePlayer(newState, newState.currentPlayerIndex, ftPlayer);
      newState = addLog(newState, ftPlayer.id, `[Fast Track] Cash flow increased by $${dealCashFlow.toLocaleString()}/mo (total: $${ftPlayer.fastTrackCashFlow.toLocaleString()}/mo)`);

      // Check win condition: $50,000/mo cash flow
      if (ftPlayer.fastTrackCashFlow >= FAST_TRACK_WIN_CASHFLOW) {
        return checkFastTrackWin(newState, 'cashflow');
      }
    }

    return {
      ...newState,
      activeCard: null,
      turnPhase: TurnPhase.END_OF_TURN,
    };
  }

  // Check if player can now escape rat race
  const player = newState.players[newState.currentPlayerIndex];
  if (!player.hasEscaped && canEscapeRatRace(player)) {
    newState = addLog(newState, player.id, `Passive income ($${calculatePassiveIncome(player.financialStatement)}) exceeds expenses ($${calculateTotalExpenses(player)})! Can escape the rat race!`);
    const escapedPlayer = { ...player, hasEscaped: true };
    newState = updatePlayer(newState, newState.currentPlayerIndex, escapedPlayer);
  }

  return {
    ...newState,
    activeCard: null,
    turnPhase: TurnPhase.END_OF_TURN,
  };
}

function handleSkipDeal(
  state: GameState,
  action: Extract<GameAction, { type: 'SKIP_DEAL' }>,
): GameState {
  // Discard current card if any
  let newState = state;
  if (state.activeCard) {
    const card = state.activeCard;
    if (card.type === 'smallDeal') {
      newState = {
        ...newState,
        decks: { ...newState.decks, smallDealDiscard: [...newState.decks.smallDealDiscard, card.card] },
      };
    } else if (card.type === 'bigDeal') {
      newState = {
        ...newState,
        decks: { ...newState.decks, bigDealDiscard: [...newState.decks.bigDealDiscard, card.card] },
      };
    }
  }

  return {
    ...newState,
    activeCard: null,
    turnPhase: TurnPhase.END_OF_TURN,
  };
}

function handlePayExpense(
  state: GameState,
  action: Extract<GameAction, { type: 'PAY_EXPENSE' }>,
): GameState {
  if (!state.activeCard || state.activeCard.type !== 'doodad') return state;

  let newState = resolveDoodad(state, state.activeCard.card, action.playerId);
  newState = applyAutoLoan(newState, state.currentPlayerIndex);
  return {
    ...newState,
    activeCard: null,
    turnPhase: TurnPhase.END_OF_TURN,
  };
}

function handleAcceptCharity(
  state: GameState,
  action: Extract<GameAction, { type: 'ACCEPT_CHARITY' }>,
): GameState {
  const player = state.players[state.currentPlayerIndex];
  const totalIncome = calculateTotalIncome(player.financialStatement);
  const donation = Math.floor(totalIncome * 0.1);

  const updatedPlayer = {
    ...player,
    cash: player.cash - donation,
    charityTurnsLeft: 3,
  };

  let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
  newState = addLog(newState, player.id, `Donated $${donation} to charity. Can choose 1 or 2 dice for 3 turns.`);
  newState = applyAutoLoan(newState, state.currentPlayerIndex);
  return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
}

function handleDeclineCharity(
  state: GameState,
  action: Extract<GameAction, { type: 'DECLINE_CHARITY' }>,
): GameState {
  return {
    ...addLog(state, action.playerId, 'Declined charity.'),
    turnPhase: TurnPhase.END_OF_TURN,
  };
}

function handleTakeLoan(
  state: GameState,
  action: Extract<GameAction, { type: 'TAKE_LOAN' }>,
): GameState {
  const player = state.players[state.currentPlayerIndex];
  const updatedPlayer = takeBankLoan(player, action.amount);
  let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
  return addLog(newState, player.id, `Took bank loan of $${action.amount}. Monthly payment: $${Math.ceil((updatedPlayer.bankLoanAmount * 0.1) / 12)}`);
}

function handlePayOffLoan(
  state: GameState,
  action: Extract<GameAction, { type: 'PAY_OFF_LOAN' }>,
): GameState {
  const player = state.players[state.currentPlayerIndex];

  if (action.loanType === 'Bank Loan') {
    const updatedPlayer = payOffBankLoan(player, action.amount);
    let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
    return addLog(newState, player.id, `Paid off $${action.amount} of bank loan. Remaining: $${updatedPlayer.bankLoanAmount}`);
  }

  // Pay off other liabilities
  const updatedPlayer = payOffLiability(player, action.loanType, action.amount);
  let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
  return addLog(newState, player.id, `Paid $${action.amount} toward ${action.loanType}`);
}

function handleEndTurn(
  state: GameState,
  action: Extract<GameAction, { type: 'END_TURN' }>,
): GameState {
  let newState: GameState = { ...state, activeCard: null, diceResult: null };

  // Advance to next player
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  let nextPlayer = newState.players[nextIndex];

  // Skip players who are downsized, bankrupt-recovering, or eliminated
  let attempts = 0;
  while (attempts < state.players.length) {
    nextPlayer = newState.players[nextIndex];

    // Skip eliminated (isBankrupt) players entirely
    if (nextPlayer.isBankrupt) {
      nextIndex = (nextIndex + 1) % state.players.length;
      attempts++;
      continue;
    }

    // Handle bankruptcy recovery turns
    if (nextPlayer.bankruptTurnsLeft > 0) {
      const updated = { ...nextPlayer, bankruptTurnsLeft: nextPlayer.bankruptTurnsLeft - 1 };
      newState = updatePlayer(newState, nextIndex, updated);
      if (updated.bankruptTurnsLeft > 0) {
        newState = addLog(newState, nextPlayer.id, `Still recovering from bankruptcy (${updated.bankruptTurnsLeft} turns left)`);
        nextIndex = (nextIndex + 1) % state.players.length;
        attempts++;
        continue;
      } else {
        newState = addLog(newState, nextPlayer.id, 'Recovered from bankruptcy!');
        break;
      }
    }

    // Handle downsized turns
    if (nextPlayer.downsizedTurnsLeft > 0) {
      const updated = { ...nextPlayer, downsizedTurnsLeft: nextPlayer.downsizedTurnsLeft - 1 };
      newState = updatePlayer(newState, nextIndex, updated);
      if (updated.downsizedTurnsLeft > 0) {
        newState = addLog(newState, nextPlayer.id, `Still downsized (${updated.downsizedTurnsLeft} turns left)`);
        nextIndex = (nextIndex + 1) % state.players.length;
        attempts++;
        continue;
      } else {
        newState = addLog(newState, nextPlayer.id, 'Back from being downsized!');
        break;
      }
    }

    // Player is ready to play
    break;
  }

  return {
    ...newState,
    currentPlayerIndex: nextIndex,
    turnPhase: TurnPhase.ROLL_DICE,
    turnNumber: state.turnNumber + 1,
  };
}

function handleCollectPayDay(
  state: GameState,
  action: Extract<GameAction, { type: 'COLLECT_PAY_DAY' }>,
): GameState {
  const player = state.players[state.currentPlayerIndex];
  const updatedPlayer = processPayDay(player);
  const cashFlow = calculateCashFlow(player);

  let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
  newState = addLog(newState, player.id, `PayDay! Collected cash flow: $${cashFlow}. Cash: $${updatedPlayer.cash}`);
  newState = applyAutoLoan(newState, state.currentPlayerIndex);

  // Now resolve the space the player actually landed on
  return resolveSpace({ ...newState, turnPhase: TurnPhase.RESOLVE_SPACE });
}

function handleSellAsset(
  state: GameState,
  action: Extract<GameAction, { type: 'SELL_ASSET' }>,
): GameState {
  if (action.price !== undefined) {
    return sellStock(state, action.playerId, action.assetId, action.price, action.shares);
  }
  // For real estate/business, sell at cost (no market card needed for direct sell)
  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return state;

  const asset = player.financialStatement.assets.find((a) => a.id === action.assetId);
  if (!asset) return state;

  return state; // Direct selling without market card is not typically allowed
}

function handleSellToMarket(
  state: GameState,
  action: Extract<GameAction, { type: 'SELL_TO_MARKET' }>,
): GameState {
  let newState = sellAssetToMarket(state, action.playerId, action.assetId);
  // After selling, stay in MAKE_DECISION so player can sell more assets if applicable
  return newState;
}

function handleDeclineMarket(
  state: GameState,
  action: Extract<GameAction, { type: 'DECLINE_MARKET' }>,
): GameState {
  const card = state.activeCard;
  if (card && card.type === 'market') {
    return {
      ...state,
      activeCard: null,
      decks: { ...state.decks, marketDiscard: [...state.decks.marketDiscard, card.card] },
      turnPhase: TurnPhase.END_OF_TURN,
    };
  }
  return { ...state, activeCard: null, turnPhase: TurnPhase.END_OF_TURN };
}

function handleChooseDream(
  state: GameState,
  action: Extract<GameAction, { type: 'CHOOSE_DREAM' }>,
): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === action.playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const passiveIncome = calculatePassiveIncome(player.financialStatement);
  const fastTrackCashFlow = passiveIncome * 100;

  const updatedPlayer = {
    ...player,
    dream: action.dream,
    isInFastTrack: true,
    fastTrackPosition: 0,
    fastTrackCashFlow,
  };

  let newState = updatePlayer(state, playerIndex, updatedPlayer);
  return addLog(newState, player.id, `Chose dream: "${action.dream}" and moved to the Fast Track! Fast Track cash flow: $${fastTrackCashFlow.toLocaleString()}/mo`);
}

function handleDeclareBank(
  state: GameState,
  action: Extract<GameAction, { type: 'DECLARE_BANKRUPTCY' }>,
): GameState {
  const player = state.players[state.currentPlayerIndex];
  const { player: bankruptPlayer, eliminated } = executeBankruptcy(player);

  let newState = updatePlayer(state, state.currentPlayerIndex, bankruptPlayer);

  if (eliminated) {
    newState = addLog(newState, player.id, `${player.name} is bankrupt and eliminated from the game!`);
    return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
  }

  newState = addLog(newState, player.id, `${player.name} declared bankruptcy! Assets sold, some debts halved. Loses 2 turns.`);
  return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
}

function handleOfferDealToPlayer(
  state: GameState,
  action: Extract<GameAction, { type: 'OFFER_DEAL_TO_PLAYER' }>,
): GameState {
  if (!state.activeCard) return state;
  const card = state.activeCard;
  if (card.type !== 'smallDeal' && card.type !== 'bigDeal') return state;

  const seller = state.players.find((p) => p.id === action.playerId);
  const buyer = state.players.find((p) => p.id === action.targetPlayerId);
  if (!seller || !buyer) return state;

  const pendingPlayerDeal: PendingPlayerDeal = {
    sellerId: action.playerId,
    buyerId: action.targetPlayerId,
    card: card.card.deal,
    askingPrice: action.askingPrice,
  };

  let newState: GameState = {
    ...state,
    pendingPlayerDeal,
    turnPhase: TurnPhase.WAITING_FOR_DEAL_RESPONSE,
  };

  return addLog(newState, action.playerId, `${seller.name} offers deal "${card.card.title}" to ${buyer.name} for $${action.askingPrice}`);
}

function handleAcceptPlayerDeal(
  state: GameState,
  action: Extract<GameAction, { type: 'ACCEPT_PLAYER_DEAL' }>,
): GameState {
  const deal = state.pendingPlayerDeal;
  if (!deal) return state;

  const buyerIndex = state.players.findIndex((p) => p.id === deal.buyerId);
  const sellerIndex = state.players.findIndex((p) => p.id === deal.sellerId);
  if (buyerIndex === -1 || sellerIndex === -1) return state;

  let buyer = state.players[buyerIndex];
  let seller = state.players[sellerIndex];

  // Buyer pays asking price to seller
  buyer = { ...buyer, cash: buyer.cash - deal.askingPrice };
  seller = { ...seller, cash: seller.cash + deal.askingPrice };

  let newState = updatePlayer(state, buyerIndex, buyer);
  newState = updatePlayer(newState, sellerIndex, seller);

  // Buyer acquires the deal card's asset (using resolveBuyDeal for the buyer)
  // We create a temporary card to pass to resolveBuyDeal
  const tempCard = state.activeCard;
  if (tempCard && (tempCard.type === 'smallDeal' || tempCard.type === 'bigDeal')) {
    newState = resolveBuyDeal(newState, tempCard.card, deal.buyerId);

    // Discard the card
    if (tempCard.type === 'smallDeal') {
      newState = {
        ...newState,
        decks: { ...newState.decks, smallDealDiscard: [...newState.decks.smallDealDiscard, tempCard.card] },
      };
    } else {
      newState = {
        ...newState,
        decks: { ...newState.decks, bigDealDiscard: [...newState.decks.bigDealDiscard, tempCard.card] },
      };
    }
  }

  newState = addLog(newState, deal.buyerId, `${buyer.name} accepted the deal for $${deal.askingPrice}!`);

  // Apply auto-loan for buyer if cash went negative
  newState = applyAutoLoan(newState, buyerIndex);

  return {
    ...newState,
    activeCard: null,
    pendingPlayerDeal: null,
    turnPhase: TurnPhase.END_OF_TURN,
  };
}

function handleDeclinePlayerDeal(
  state: GameState,
  action: Extract<GameAction, { type: 'DECLINE_PLAYER_DEAL' }>,
): GameState {
  const deal = state.pendingPlayerDeal;
  if (!deal) return state;

  const buyer = state.players.find((p) => p.id === deal.buyerId);
  let newState: GameState = {
    ...state,
    pendingPlayerDeal: null,
    turnPhase: TurnPhase.MAKE_DECISION, // Return to seller's MAKE_DECISION
  };

  return addLog(newState, deal.buyerId, `${buyer?.name || 'Player'} declined the deal offer.`);
}

// ── Fast Track handlers ──

/** Win condition: $50,000 monthly cash flow on the fast track */
const FAST_TRACK_WIN_CASHFLOW = 50000;

function handleFastTrackRoll(
  state: GameState,
  action: Extract<GameAction, { type: 'ROLL_DICE' }>,
): GameState {
  const player = state.players[state.currentPlayerIndex];
  // Fast track always uses both dice
  const total = action.diceValues[0] + action.diceValues[1];

  const oldPosition = player.fastTrackPosition;
  const newPosition = moveFastTrackPlayer(oldPosition, total);

  let updatedPlayer = {
    ...player,
    fastTrackPosition: newPosition,
  };

  let newState: GameState = {
    ...state,
    diceResult: action.diceValues,
    players: state.players.map((p, i) => (i === state.currentPlayerIndex ? updatedPlayer : p)),
  };

  newState = addLog(
    newState,
    player.id,
    `[Fast Track] Rolled ${action.diceValues[0]}+${action.diceValues[1]}=${total}, moved to space ${newPosition}`,
  );

  // Resolve the fast track space
  return resolveFastTrackSpace(newState);
}

function resolveFastTrackSpace(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const space = getFastTrackSpace(player.fastTrackPosition);
  const spaceType = space.type;

  switch (spaceType) {
    case 'CashFlowDay': {
      // Collect fast track cash flow
      const updatedPlayer = {
        ...player,
        cash: player.cash + player.fastTrackCashFlow,
      };
      let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
      newState = addLog(newState, player.id, `[Fast Track] Cash Flow Day! Collected $${player.fastTrackCashFlow.toLocaleString()}`);

      // Check if they hit the $50,000 cash flow win condition
      if (player.fastTrackCashFlow >= FAST_TRACK_WIN_CASHFLOW) {
        return checkFastTrackWin(newState, 'cashflow');
      }
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }

    case 'BusinessDeal': {
      // Draw a big deal card (fast track scale)
      const { card, deck, discard } = drawCard(state.decks.bigDealDeck, state.decks.bigDealDiscard);
      let newState: GameState = {
        ...state,
        activeCard: { type: 'bigDeal', card },
        decks: { ...state.decks, bigDealDeck: deck, bigDealDiscard: discard },
        turnPhase: TurnPhase.MAKE_DECISION,
      };
      return addLog(newState, player.id, `[Fast Track] Business Deal opportunity: ${card.title}`);
    }

    case 'Charity': {
      // Same as rat race charity
      return {
        ...state,
        turnPhase: TurnPhase.RESOLVE_SPACE,
      };
    }

    case 'Tax': {
      // Pay 50% of cash flow as taxes
      const taxAmount = Math.floor(player.fastTrackCashFlow * 0.5);
      const updatedPlayer = {
        ...player,
        cash: player.cash - taxAmount,
      };
      let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
      newState = addLog(newState, player.id, `[Fast Track] Tax Audit! Paid $${taxAmount.toLocaleString()} in taxes (50% of cash flow)`);
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }

    case 'Lawsuit': {
      // Pay half cash on hand
      const lawsuitCost = Math.floor(player.cash / 2);
      const updatedPlayer = {
        ...player,
        cash: player.cash - lawsuitCost,
      };
      let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
      newState = addLog(newState, player.id, `[Fast Track] Lawsuit! Lost $${lawsuitCost.toLocaleString()} (half of cash on hand)`);
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }

    case 'Divorce': {
      // Lose half cash on hand and half of fast track cash flow (representing lost investments)
      const cashLoss = Math.floor(player.cash / 2);
      const cashFlowLoss = Math.floor(player.fastTrackCashFlow / 2);
      const updatedPlayer = {
        ...player,
        cash: player.cash - cashLoss,
        fastTrackCashFlow: player.fastTrackCashFlow - cashFlowLoss,
      };
      let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
      newState = addLog(newState, player.id, `[Fast Track] Divorce! Lost $${cashLoss.toLocaleString()} cash and $${cashFlowLoss.toLocaleString()}/mo cash flow`);
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }

    case 'Dream': {
      // Check if this is the player's dream
      if (space.dream && space.dream === player.dream) {
        return checkFastTrackWin(state, 'dream');
      }
      let newState = addLog(state, player.id, `[Fast Track] Landed on dream: "${space.dream}" (not your dream: "${player.dream}")`);
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }

    default:
      return { ...state, turnPhase: TurnPhase.END_OF_TURN };
  }
}

function checkFastTrackWin(state: GameState, winType: 'dream' | 'cashflow'): GameState {
  const player = state.players[state.currentPlayerIndex];
  const updatedPlayer = { ...player, hasWon: true };
  let newState = updatePlayer(state, state.currentPlayerIndex, updatedPlayer);

  if (winType === 'dream') {
    newState = addLog(newState, player.id, `WINNER! ${player.name} landed on their dream "${player.dream}" and wins the game!`);
  } else {
    newState = addLog(newState, player.id, `WINNER! ${player.name} reached $${player.fastTrackCashFlow.toLocaleString()}/mo cash flow and wins the game!`);
  }

  return {
    ...newState,
    winner: player.id,
    turnPhase: TurnPhase.GAME_OVER,
  };
}

// ── Get valid actions for current state ──

export function getValidActions(state: GameState): GameAction['type'][] {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return [];

  // If the player has escaped but hasn't chosen a dream yet, they must choose
  if (player.hasEscaped && !player.dream) {
    return ['CHOOSE_DREAM'];
  }

  const actions: GameAction['type'][] = [];

  switch (state.turnPhase) {
    case TurnPhase.ROLL_DICE:
      if (player.downsizedTurnsLeft <= 0) {
        actions.push('ROLL_DICE');
      } else {
        actions.push('END_TURN');
      }
      break;

    case TurnPhase.PAY_DAY_COLLECTION:
      actions.push('COLLECT_PAY_DAY');
      break;

    case TurnPhase.RESOLVE_SPACE: {
      if (player.isInFastTrack) {
        // Fast track resolve space: only Charity uses this phase
        const ftSpaceType = getFastTrackSpaceType(player.fastTrackPosition);
        if (ftSpaceType === 'Charity') {
          actions.push('ACCEPT_CHARITY');
          actions.push('DECLINE_CHARITY');
        }
      } else {
        const spaceType = getSpaceType(player.position);
        if (spaceType === 'Deal') {
          actions.push('CHOOSE_DEAL_TYPE');
          actions.push('SKIP_DEAL');
        } else if (spaceType === 'Charity') {
          actions.push('ACCEPT_CHARITY');
          actions.push('DECLINE_CHARITY');
        }
      }
      break;
    }

    case TurnPhase.MAKE_DECISION:
      if (state.activeCard) {
        if (state.activeCard.type === 'smallDeal' || state.activeCard.type === 'bigDeal') {
          actions.push('BUY_ASSET');
          actions.push('SKIP_DEAL');
          // Can offer to another player if multiplayer
          if (state.players.filter((p) => !p.isBankrupt).length > 1) {
            actions.push('OFFER_DEAL_TO_PLAYER');
          }
        } else if (state.activeCard.type === 'doodad') {
          actions.push('PAY_EXPENSE');
        } else if (state.activeCard.type === 'market') {
          actions.push('SELL_TO_MARKET');
          actions.push('DECLINE_MARKET');
        }
      }
      actions.push('END_TURN');
      break;

    case TurnPhase.WAITING_FOR_DEAL_RESPONSE:
      // Only the target buyer can respond
      if (state.pendingPlayerDeal && state.pendingPlayerDeal.buyerId === player.id) {
        actions.push('ACCEPT_PLAYER_DEAL');
        actions.push('DECLINE_PLAYER_DEAL');
      }
      break;

    case TurnPhase.END_OF_TURN:
      actions.push('END_TURN');
      // Allow financial actions before ending turn (rat race only)
      if (!player.isInFastTrack) {
        actions.push('TAKE_LOAN');
        actions.push('PAY_OFF_LOAN');
      }
      break;

    case TurnPhase.BANKRUPTCY_DECISION:
      actions.push('DECLARE_BANKRUPTCY');
      break;

    case TurnPhase.GAME_OVER:
      break;
  }

  return actions;
}

// ── Helpers ──

/** Apply auto-loan if player has negative cash, and log the event */
function applyAutoLoan(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const { player: updated, amountBorrowed } = autoTakeLoanIfNeeded(player);
  if (amountBorrowed === 0) return state;
  let newState = updatePlayer(state, playerIndex, updated);
  return addLog(newState, player.id, `Forced bank loan of $${amountBorrowed} (cash was negative). Monthly payment: $${Math.ceil((updated.bankLoanAmount * 0.1) / 12)}`);
}

/** Apply auto-loan to all players (for market card effects that affect everyone) */
function applyAutoLoanAllPlayers(state: GameState): GameState {
  let newState = state;
  for (let i = 0; i < newState.players.length; i++) {
    newState = applyAutoLoan(newState, i);
  }
  return newState;
}

function updatePlayer(state: GameState, index: number, player: Player): GameState {
  const players = [...state.players];
  players[index] = player;
  return { ...state, players };
}

function addLog(state: GameState, playerId: string, message: string): GameState {
  return {
    ...state,
    log: [...state.log, { timestamp: Date.now(), playerId, message }],
  };
}
