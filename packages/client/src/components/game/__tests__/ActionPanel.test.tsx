import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GameState, Player } from '@cashflow/shared';
import { TurnPhase } from '@cashflow/shared';
import { ActionPanel } from '../ActionPanel';

// Mock the shared module
vi.mock('@cashflow/shared', async () => {
  const actual = await vi.importActual<typeof import('@cashflow/shared')>('@cashflow/shared');
  return {
    ...actual,
    getValidActions: vi.fn(() => []),
  };
});

// Mock stores
const mockDispatch = vi.fn();
const mockToggleFinancialStatement = vi.fn();
const mockSetShowDevicePass = vi.fn();

vi.mock('../../../stores/gameStore', () => ({
  useGameStore: (selector: any) => {
    const store = { dispatch: mockDispatch };
    return selector(store);
  },
}));

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: (selector: any) => {
    const store = {
      toggleFinancialStatement: mockToggleFinancialStatement,
      setShowDevicePass: mockSetShowDevicePass,
    };
    return selector(store);
  },
}));

// Mock DiceRoller for simplicity
vi.mock('../../board/DiceRoller', () => ({
  DiceRoller: ({ onRoll, charityActive }: any) => (
    <button
      data-testid="dice-roller"
      onClick={() => onRoll([3, 4], false)}
    >
      {charityActive ? 'MockDice-Charity' : 'MockDice'}
    </button>
  ),
}));

import { getValidActions } from '@cashflow/shared';
const mockGetValidActions = vi.mocked(getValidActions);

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

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    currentPlayerIndex: 0,
    players: [createMockPlayer()],
    turnPhase: TurnPhase.ROLL_DICE,
    ...overrides,
  } as GameState;
}

describe('ActionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValidActions.mockReturnValue([]);
  });

  it('displays the current phase label', () => {
    render(<ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.END_OF_TURN })} />);
    expect(screen.getByText('End of Turn')).toBeInTheDocument();
  });

  it('shows "Your Turn" in online mode when it is my turn', () => {
    render(<ActionPanel gameState={createMockGameState()} isOnline isMyTurn />);
    expect(screen.getByText('Your Turn')).toBeInTheDocument();
  });

  it('shows player name turn indicator when not my turn in online mode', () => {
    render(<ActionPanel gameState={createMockGameState()} isOnline isMyTurn={false} />);
    expect(screen.getByText("Alice's Turn")).toBeInTheDocument();
  });

  it('shows waiting message when online and not my turn', () => {
    render(<ActionPanel gameState={createMockGameState()} isOnline isMyTurn={false} />);
    expect(screen.getByText('Waiting for Alice...')).toBeInTheDocument();
  });

  it('renders DiceRoller when ROLL_DICE is a valid action', () => {
    mockGetValidActions.mockReturnValue(['ROLL_DICE']);
    render(<ActionPanel gameState={createMockGameState()} />);
    expect(screen.getByTestId('dice-roller')).toBeInTheDocument();
  });

  it('DiceRoller triggers dispatch with ROLL_DICE action', () => {
    mockGetValidActions.mockReturnValue(['ROLL_DICE']);
    render(<ActionPanel gameState={createMockGameState()} />);

    fireEvent.click(screen.getByTestId('dice-roller'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ROLL_DICE', playerId: 'p1', diceValues: [3, 4] })
    );
  });

  it('renders Collect Pay Day button and dispatches on click', () => {
    mockGetValidActions.mockReturnValue(['COLLECT_PAY_DAY']);
    render(
      <ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.PAY_DAY_COLLECTION })} />
    );

    const btn = screen.getByRole('button', { name: 'Collect Pay Day' });
    fireEvent.click(btn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'COLLECT_PAY_DAY', playerId: 'p1' })
    );
  });

  it('renders deal choice buttons when CHOOSE_DEAL_TYPE is valid', () => {
    mockGetValidActions.mockReturnValue(['CHOOSE_DEAL_TYPE']);
    render(
      <ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.MAKE_DECISION })} />
    );

    expect(screen.getByText('Small Deal')).toBeInTheDocument();
    expect(screen.getByText('Big Deal')).toBeInTheDocument();
    expect(screen.getByText('Skip Deal')).toBeInTheDocument();
  });

  it('dispatches CHOOSE_DEAL_TYPE when Small Deal is clicked', () => {
    mockGetValidActions.mockReturnValue(['CHOOSE_DEAL_TYPE']);
    render(
      <ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.MAKE_DECISION })} />
    );

    fireEvent.click(screen.getByText('Small Deal'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CHOOSE_DEAL_TYPE', playerId: 'p1', dealType: 'small' })
    );
  });

  it('renders charity buttons when ACCEPT_CHARITY is valid', () => {
    mockGetValidActions.mockReturnValue(['ACCEPT_CHARITY']);
    render(
      <ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.MAKE_DECISION })} />
    );

    expect(screen.getByText('Accept Charity (10% of income)')).toBeInTheDocument();
    expect(screen.getByText('Decline Charity')).toBeInTheDocument();
  });

  it('renders Declare Bankruptcy button when valid', () => {
    mockGetValidActions.mockReturnValue(['DECLARE_BANKRUPTCY']);
    render(
      <ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.BANKRUPTCY_DECISION })} />
    );

    const btn = screen.getByText('Declare Bankruptcy');
    fireEvent.click(btn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DECLARE_BANKRUPTCY', playerId: 'p1' })
    );
  });

  it('renders loan controls and End Turn button in END_OF_TURN phase', () => {
    mockGetValidActions.mockReturnValue([]);
    render(
      <ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.END_OF_TURN })} />
    );

    expect(screen.getByText('Take Loan')).toBeInTheDocument();
    expect(screen.getByText('End Turn')).toBeInTheDocument();
  });

  it('dispatches TAKE_LOAN with the input amount', () => {
    mockGetValidActions.mockReturnValue([]);
    render(
      <ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.END_OF_TURN })} />
    );

    fireEvent.click(screen.getByText('Take Loan'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TAKE_LOAN', playerId: 'p1', amount: 1000 })
    );
  });

  it('End Turn dispatches END_TURN and shows device pass in local mode', () => {
    mockGetValidActions.mockReturnValue([]);
    render(
      <ActionPanel gameState={createMockGameState({ turnPhase: TurnPhase.END_OF_TURN })} />
    );

    fireEvent.click(screen.getByText('End Turn'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'END_TURN', playerId: 'p1' })
    );
    expect(mockSetShowDevicePass).toHaveBeenCalledWith(true);
  });

  it('Financial Statement button calls toggleFinancialStatement', () => {
    render(<ActionPanel gameState={createMockGameState()} />);

    fireEvent.click(screen.getByText('Financial Statement'));
    expect(mockToggleFinancialStatement).toHaveBeenCalledTimes(1);
  });
});
