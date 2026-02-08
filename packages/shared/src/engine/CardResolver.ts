import type {
  GameState,
  SmallDealCard,
  BigDealCard,
  MarketCard,
  DoodadCard,
  Player,
  StockAsset,
  RealEstateAsset,
  BusinessAsset,
  Asset,
} from '../types/index.js';
import { TurnPhase } from '../types/index.js';
import {
  addAsset,
  removeAsset,
  isStockAsset,
  isRealEstateAsset,
  isBusinessAsset,
  findStockBySymbol,
  updateStockShares,
  calculateTotalIncome,
  autoTakeLoanIfNeeded,
} from './FinancialCalculator.js';

function getNextAssetId(state: GameState): { id: string; state: GameState } {
  const id = `asset-${state.nextAssetId}`;
  return { id, state: { ...state, nextAssetId: state.nextAssetId + 1 } };
}

/** Buy a small or big deal card */
export function resolveBuyDeal(
  state: GameState,
  card: SmallDealCard | BigDealCard,
  playerId: string,
  shares?: number,
  skipPayment?: boolean,
): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  let player = state.players[playerIndex];
  const deal = card.deal;

  switch (deal.type) {
    case 'stock': {
      const numShares = shares ?? 1;
      const cost = deal.costPerShare * numShares;
      if (!skipPayment && player.cash < cost) {
        return addLog(state, playerId, `Cannot afford ${numShares} shares of ${deal.symbol} ($${cost})`);
      }

      // Check if player already owns this stock
      const existingStock = findStockBySymbol(player, deal.symbol);
      if (existingStock) {
        player = updateStockShares(player, existingStock.id, numShares);
      } else {
        const { id: assetId, state: stateWithId } = getNextAssetId(state);
        state = stateWithId;
        const asset: StockAsset = {
          kind: 'stock',
          id: assetId,
          name: deal.name,
          symbol: deal.symbol,
          shares: numShares,
          costPerShare: deal.costPerShare,
          dividendPerShare: deal.dividendPerShare,
        };
        player = addAsset(player, asset);
      }
      if (!skipPayment) {
        player = { ...player, cash: player.cash - cost };
      }

      return updatePlayer(
        addLog(state, playerId, `Bought ${numShares} shares of ${deal.symbol} at $${deal.costPerShare}/share`),
        playerIndex,
        player,
      );
    }

    case 'realEstate': {
      if (!skipPayment && player.cash < deal.downPayment) {
        return addLog(state, playerId, `Cannot afford down payment of $${deal.downPayment} for ${deal.name}`);
      }

      const { id: assetId, state: stateWithId } = getNextAssetId(state);
      state = stateWithId;
      const asset: RealEstateAsset = {
        kind: 'realEstate',
        id: assetId,
        name: deal.name,
        type: deal.subType,
        cost: deal.cost,
        mortgage: deal.mortgage,
        downPayment: deal.downPayment,
        cashFlow: deal.cashFlow,
      };
      player = addAsset(player, asset);
      if (!skipPayment) {
        player = { ...player, cash: player.cash - deal.downPayment };
      }

      return updatePlayer(
        addLog(state, playerId, `Bought ${deal.name} for $${deal.downPayment} down (cash flow: $${deal.cashFlow}/mo)`),
        playerIndex,
        player,
      );
    }

    case 'business': {
      if (!skipPayment && player.cash < deal.downPayment) {
        return addLog(state, playerId, `Cannot afford down payment of $${deal.downPayment} for ${deal.name}`);
      }

      const { id: assetId, state: stateWithId } = getNextAssetId(state);
      state = stateWithId;
      const asset: BusinessAsset = {
        kind: 'business',
        id: assetId,
        name: deal.name,
        cost: deal.cost,
        mortgage: deal.mortgage,
        downPayment: deal.downPayment,
        cashFlow: deal.cashFlow,
      };
      player = addAsset(player, asset);
      if (!skipPayment) {
        player = { ...player, cash: player.cash - deal.downPayment };
      }

      return updatePlayer(
        addLog(state, playerId, `Bought ${deal.name} for $${deal.downPayment} down (cash flow: $${deal.cashFlow}/mo)`),
        playerIndex,
        player,
      );
    }

    case 'stockSplit':
      // Stock splits are handled separately via resolveStockSplit, not through buy
      return state;
  }
}

/** Resolve a market card effect */
export function resolveMarket(state: GameState, card: MarketCard): GameState {
  const effect = card.effect;

  switch (effect.type) {
    case 'stockPriceChange': {
      // This just changes the market price - actual selling is a separate action
      return addLog(
        { ...state, turnPhase: TurnPhase.MAKE_DECISION },
        state.players[state.currentPlayerIndex].id,
        `Market: ${card.title} - ${effect.description}`,
      );
    }

    case 'realEstateOffer':
    case 'realEstateOfferFlat': {
      return addLog(
        { ...state, turnPhase: TurnPhase.MAKE_DECISION },
        state.players[state.currentPlayerIndex].id,
        `Market: ${card.title} - ${effect.description}`,
      );
    }

    case 'damageToProperty': {
      // Apply damage cost to all players who own matching property types
      let newState = state;
      for (let i = 0; i < newState.players.length; i++) {
        const p = newState.players[i];
        const hasMatchingProperty = p.financialStatement.assets.some(
          (a) => isRealEstateAsset(a) && effect.subTypes.includes(a.type),
        );
        if (hasMatchingProperty) {
          let updatedPlayer = { ...p, cash: p.cash - effect.cost };
          const { player: loanedPlayer, amountBorrowed } = autoTakeLoanIfNeeded(updatedPlayer);
          updatedPlayer = loanedPlayer;
          newState = updatePlayer(newState, i, updatedPlayer);
          newState = addLog(newState, p.id, `Paid $${effect.cost} for property damage: ${card.title}`);
          if (amountBorrowed > 0) {
            newState = addLog(newState, p.id, `Forced bank loan of $${amountBorrowed} (cash was negative).`);
          }
        }
      }
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }

    case 'allPlayersExpense': {
      let newState = state;
      for (let i = 0; i < newState.players.length; i++) {
        const p = newState.players[i];
        let updatedPlayer = { ...p, cash: p.cash - effect.amount };
        const { player: loanedPlayer, amountBorrowed } = autoTakeLoanIfNeeded(updatedPlayer);
        updatedPlayer = loanedPlayer;
        newState = updatePlayer(newState, i, updatedPlayer);
        newState = addLog(newState, p.id, `Paid $${effect.amount}: ${card.title}`);
        if (amountBorrowed > 0) {
          newState = addLog(newState, p.id, `Forced bank loan of $${amountBorrowed} (cash was negative).`);
        }
      }
      return { ...newState, turnPhase: TurnPhase.END_OF_TURN };
    }
  }
}

/** Sell an asset at market price */
export function sellAssetToMarket(
  state: GameState,
  playerId: string,
  assetId: string,
): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  let player = state.players[playerIndex];
  const asset = player.financialStatement.assets.find((a) => a.id === assetId);
  if (!asset) return state;

  const card = state.activeCard;
  if (!card || card.type !== 'market') return state;

  const effect = card.card.effect;
  let salePrice = 0;

  if (isRealEstateAsset(asset)) {
    if (effect.type === 'realEstateOffer') {
      salePrice = Math.floor(asset.cost * effect.offerMultiplier);
    } else if (effect.type === 'realEstateOfferFlat') {
      salePrice = effect.offerAmount;
    }
    // Pay off mortgage, receive the profit
    const profit = salePrice - asset.mortgage;
    player = removeAsset(player, assetId);
    player = { ...player, cash: player.cash + profit };

    return updatePlayer(
      addLog(state, playerId, `Sold ${asset.name} for $${salePrice} (profit: $${profit})`),
      playerIndex,
      player,
    );
  }

  if (isStockAsset(asset) && effect.type === 'stockPriceChange') {
    salePrice = effect.newPrice * asset.shares;
    player = removeAsset(player, assetId);
    player = { ...player, cash: player.cash + salePrice };

    return updatePlayer(
      addLog(state, playerId, `Sold ${asset.shares} shares of ${asset.symbol} at $${effect.newPrice}/share ($${salePrice})`),
      playerIndex,
      player,
    );
  }

  return state;
}

/** Sell a stock asset directly (not via market card) at a given price */
export function sellStock(
  state: GameState,
  playerId: string,
  assetId: string,
  pricePerShare: number,
  sharesToSell?: number,
): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  let player = state.players[playerIndex];
  const asset = player.financialStatement.assets.find((a) => a.id === assetId);
  if (!asset || !isStockAsset(asset)) return state;

  const numShares = sharesToSell ?? asset.shares;
  if (numShares > asset.shares) return state;

  const salePrice = pricePerShare * numShares;

  if (numShares === asset.shares) {
    player = removeAsset(player, assetId);
  } else {
    player = updateStockShares(player, assetId, -numShares);
  }
  player = { ...player, cash: player.cash + salePrice };

  return updatePlayer(
    addLog(state, playerId, `Sold ${numShares} shares at $${pricePerShare}/share ($${salePrice})`),
    playerIndex,
    player,
  );
}

/** Resolve a doodad card (forced expense) */
/** Resolve a stock split/reverse split for all players */
export function resolveStockSplit(
  state: GameState,
  card: { symbol: string; splitRatio: number },
): GameState {
  let newState = state;

  for (let i = 0; i < newState.players.length; i++) {
    const player = newState.players[i];
    const updatedAssets: Asset[] = [];
    let affected = false;

    for (const asset of player.financialStatement.assets) {
      if (isStockAsset(asset) && asset.symbol === card.symbol) {
        const newShares = Math.floor(asset.shares * card.splitRatio);
        if (newShares <= 0) {
          // Reverse split reduced shares to 0 - remove asset
          affected = true;
          continue;
        }
        updatedAssets.push({
          ...asset,
          shares: newShares,
          costPerShare: asset.costPerShare / card.splitRatio,
          dividendPerShare: asset.dividendPerShare / card.splitRatio,
        });
        affected = true;
      } else {
        updatedAssets.push(asset);
      }
    }

    if (affected) {
      const updatedPlayer = {
        ...player,
        financialStatement: {
          ...player.financialStatement,
          assets: updatedAssets,
        },
      };
      newState = updatePlayer(newState, i, updatedPlayer);
      if (card.splitRatio >= 2) {
        newState = addLog(newState, player.id, `Stock split! ${card.symbol} shares doubled, price halved.`);
      } else if (card.splitRatio <= 0.5) {
        newState = addLog(newState, player.id, `Reverse stock split! ${card.symbol} shares halved, price doubled.`);
      }
    }
  }

  return newState;
}

export function resolveDoodad(state: GameState, card: DoodadCard, playerId: string): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  let player = state.players[playerIndex];
  let cost = card.cost;

  if (card.isPercentOfIncome) {
    cost = Math.floor(calculateTotalIncome(player.financialStatement) * (card.cost / 100));
  }

  player = { ...player, cash: player.cash - cost };

  return updatePlayer(
    addLog(state, playerId, `Paid $${cost} for ${card.title}`),
    playerIndex,
    player,
  );
}

// ── Helpers ──

function updatePlayer(state: GameState, index: number, player: Player): GameState {
  const players = [...state.players];
  players[index] = player;
  return { ...state, players };
}

function addLog(state: GameState, playerId: string, message: string): GameState {
  return {
    ...state,
    log: [
      ...state.log,
      { timestamp: Date.now(), playerId, message },
    ],
  };
}
