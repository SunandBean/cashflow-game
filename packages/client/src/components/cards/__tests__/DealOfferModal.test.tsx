import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GameState, Player } from '@cashflow/shared';
import { TurnPhase } from '@cashflow/shared';
import { DealOfferModal } from '../DealOfferModal';

function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Alice',
    cash: 5000,
    position: 0,
    hasEscaped: false,
    bankLoanAmount: 0,
    charityTurnsLeft: 0,
    isBankrupt: false,
    bankruptTurnsLeft: 0,
    financialStatement: {
      income: { salary: 3500 },
      expenses: {
        taxes: 700,
        homeMortgagePayment: 500,
        schoolLoanPayment: 0,
        carLoanPayment: 100,
        creditCardPayment: 50,
        otherExpenses: 200,
        childCount: 0,
        perChildExpense: 140,
      },
      assets: [],
      liabilities: [],
    },
    ...overrides,
  } as Player;
}

const realEstateCard = {
  id: 'sd-1',
  title: '3Br/2Ba House',
  deal: {
    type: 'realEstate' as const,
    subType: 'house' as const,
    name: '3Br/2Ba House',
    cost: 65000,
    mortgage: 55000,
    downPayment: 10000,
    cashFlow: 160,
    description: 'Great starter home in a nice neighborhood.',
    rule: '',
  },
};

const stockCard = {
  id: 'sd-2',
  title: 'ON2U Stock',
  deal: {
    type: 'stock' as const,
    name: 'ON2U',
    symbol: 'ON2U',
    costPerShare: 5,
    dividendPerShare: 0,
    historicalPriceRange: { low: 1, high: 30 },
    description: 'ON2U internet stock.',
    rule: '',
  },
};

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'game-1',
    currentPlayerIndex: 0,
    players: [
      createMockPlayer({ id: 'seller-1', name: 'Bob' }),
      createMockPlayer({ id: 'buyer-1', name: 'Alice' }),
    ],
    turnPhase: TurnPhase.WAITING_FOR_DEAL_RESPONSE,
    activeCard: { type: 'smallDeal', card: realEstateCard },
    diceResult: null,
    decks: {} as GameState['decks'],
    log: [],
    turnNumber: 1,
    winner: null,
    pendingPlayerDeal: {
      sellerId: 'seller-1',
      buyerId: 'buyer-1',
      card: realEstateCard.deal,
      askingPrice: 5000,
    },
    ...overrides,
  } as GameState;
}

describe('DealOfferModal', () => {
  let mockDispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch = vi.fn();
  });

  it('renders deal details with seller name, card title, description, and asking price', () => {
    const gameState = createMockGameState();
    render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    expect(screen.getByText('Deal Offer from Bob')).toBeInTheDocument();
    expect(screen.getByText('3Br/2Ba House')).toBeInTheDocument();
    expect(screen.getByText('Great starter home in a nice neighborhood.')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('renders real estate deal details (cost, down payment, cash flow)', () => {
    const gameState = createMockGameState();
    render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    expect(screen.getByText('Cost: $65,000')).toBeInTheDocument();
    expect(screen.getByText('Down Payment: $10,000')).toBeInTheDocument();
    expect(screen.getByText('Cash Flow: $160/mo')).toBeInTheDocument();
  });

  it('renders stock deal details (price per share, dividend)', () => {
    const gameState = createMockGameState({
      activeCard: { type: 'smallDeal', card: stockCard },
      pendingPlayerDeal: {
        sellerId: 'seller-1',
        buyerId: 'buyer-1',
        card: stockCard.deal,
        askingPrice: 200,
      },
    });
    render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    expect(screen.getByText('Price/Share: $5')).toBeInTheDocument();
    expect(screen.getByText('Dividend: $0/share')).toBeInTheDocument();
  });

  it('dispatches ACCEPT_PLAYER_DEAL with localPlayerId when Accept is clicked', () => {
    const gameState = createMockGameState();
    render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    fireEvent.click(screen.getByText(/Accept/));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ACCEPT_PLAYER_DEAL',
      playerId: 'buyer-1',
    });
  });

  it('dispatches DECLINE_PLAYER_DEAL with localPlayerId when Decline is clicked', () => {
    const gameState = createMockGameState();
    render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    fireEvent.click(screen.getByText('Decline'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'DECLINE_PLAYER_DEAL',
      playerId: 'buyer-1',
    });
  });

  it('returns null when pendingPlayerDeal is null', () => {
    const gameState = createMockGameState({ pendingPlayerDeal: null });
    const { container } = render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('returns null when localPlayerId is not the buyer', () => {
    const gameState = createMockGameState();
    const { container } = render(
      <DealOfferModal gameState={gameState} localPlayerId="seller-1" onDispatch={mockDispatch} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('returns null when activeCard is null', () => {
    const gameState = createMockGameState({ activeCard: null });
    const { container } = render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('shows fallback "Player" when seller is not found', () => {
    const gameState = createMockGameState({
      pendingPlayerDeal: {
        sellerId: 'unknown-player',
        buyerId: 'buyer-1',
        card: realEstateCard.deal,
        askingPrice: 5000,
      },
    });
    render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    expect(screen.getByText('Deal Offer from Player')).toBeInTheDocument();
  });

  it('shows asking price in accept button text', () => {
    const gameState = createMockGameState();
    render(
      <DealOfferModal gameState={gameState} localPlayerId="buyer-1" onDispatch={mockDispatch} />
    );

    expect(screen.getByText('Accept (Pay $5,000)')).toBeInTheDocument();
  });
});
