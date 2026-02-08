import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Player } from '@cashflow/shared';

// Hoisted mocks must be declared before vi.mock calls
const { mockToggle } = vi.hoisted(() => ({
  mockToggle: vi.fn(),
}));

// Mock the shared package calculation functions
vi.mock('@cashflow/shared', async () => {
  const actual = await vi.importActual<typeof import('@cashflow/shared')>('@cashflow/shared');
  return {
    ...actual,
    calculatePassiveIncome: vi.fn(() => 500),
    calculateTotalIncome: vi.fn(() => 4000),
    calculateTotalExpenses: vi.fn(() => 3000),
    calculateCashFlow: vi.fn(() => 1000),
    calculateBankLoanPayment: vi.fn(() => 100),
    canEscapeRatRace: vi.fn(() => false),
  };
});

// Mock the uiStore — path relative to this test file
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn((selector: any) => {
    const store = { toggleFinancialStatement: mockToggle };
    return selector(store);
  }),
}));

import { calculateCashFlow } from '@cashflow/shared';
import { FinancialStatement } from '../FinancialStatement';

function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Test Player',
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

describe('FinancialStatement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the player name in the header', () => {
    render(<FinancialStatement player={createMockPlayer({ name: 'Alice' })} />);
    expect(screen.getByText('Financial Statement - Alice')).toBeInTheDocument();
  });

  it('displays salary', () => {
    render(<FinancialStatement player={createMockPlayer()} />);
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('$3,500')).toBeInTheDocument();
  });

  it('renders expense items', () => {
    render(<FinancialStatement player={createMockPlayer()} />);
    expect(screen.getByText('Taxes')).toBeInTheDocument();
    expect(screen.getByText('Home Mortgage')).toBeInTheDocument();
    expect(screen.getByText('Car Loan')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('Other Expenses')).toBeInTheDocument();
  });

  it('hides school loan row when schoolLoanPayment is 0', () => {
    render(<FinancialStatement player={createMockPlayer()} />);
    expect(screen.queryByText('School Loan')).not.toBeInTheDocument();
  });

  it('shows school loan row when schoolLoanPayment > 0', () => {
    const player = createMockPlayer();
    player.financialStatement.expenses.schoolLoanPayment = 300;
    render(<FinancialStatement player={player} />);
    expect(screen.getByText('School Loan')).toBeInTheDocument();
  });

  it('shows children expense when childCount > 0', () => {
    const player = createMockPlayer();
    player.financialStatement.expenses.childCount = 2;
    player.financialStatement.expenses.perChildExpense = 140;
    render(<FinancialStatement player={player} />);
    expect(screen.getByText(/Children \(2 x \$140\)/)).toBeInTheDocument();
  });

  it('shows bank loan payment when bankLoanAmount > 0', () => {
    const player = createMockPlayer({ bankLoanAmount: 5000 });
    render(<FinancialStatement player={player} />);
    expect(screen.getByText('Bank Loan Payment')).toBeInTheDocument();
  });

  it('shows positive cashflow in green and negative in red', () => {
    render(<FinancialStatement player={createMockPlayer()} />);
    const cashFlowEl = screen.getByText('$1,000');
    expect(cashFlowEl.style.color).toBe('rgb(46, 204, 113)'); // #2ecc71

    // Test negative
    vi.mocked(calculateCashFlow).mockReturnValue(-500);
    render(<FinancialStatement player={createMockPlayer()} />);
    const negEl = screen.getByText('-$500');
    expect(negEl.style.color).toBe('rgb(231, 76, 60)'); // #e74c3c
  });

  it('shows "No assets" when assets are empty', () => {
    render(<FinancialStatement player={createMockPlayer()} />);
    expect(screen.getByText('No assets')).toBeInTheDocument();
  });

  it('calls toggleFinancialStatement when Close is clicked', () => {
    render(<FinancialStatement player={createMockPlayer()} />);
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
