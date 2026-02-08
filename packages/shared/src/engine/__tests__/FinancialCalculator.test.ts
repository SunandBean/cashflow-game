import { describe, it, expect } from 'vitest';
import type { Player, FinancialStatement, StockAsset, RealEstateAsset, BusinessAsset } from '../../types/index.js';
import {
  calculatePassiveIncome,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateCashFlow,
  calculateBankLoanPayment,
  canEscapeRatRace,
  processPayDay,
  addAsset,
  removeAsset,
  addChild,
  takeBankLoan,
  payOffBankLoan,
  payOffLiability,
  addLiability,
  removeLiability,
  updateStockShares,
  findStockBySymbol,
  isStockAsset,
  isRealEstateAsset,
  isBusinessAsset,
} from '../FinancialCalculator.js';

// ── Helpers ──

function createBaseFinancialStatement(overrides?: Partial<FinancialStatement>): FinancialStatement {
  return {
    income: { salary: 3300, ...overrides?.income },
    expenses: {
      taxes: 830,
      homeMortgagePayment: 500,
      schoolLoanPayment: 60,
      carLoanPayment: 100,
      creditCardPayment: 90,
      otherExpenses: 760,
      perChildExpense: 180,
      childCount: 0,
      ...overrides?.expenses,
    },
    assets: overrides?.assets ?? [],
    liabilities: overrides?.liabilities ?? [
      { name: 'Home Mortgage', balance: 50000, payment: 500 },
      { name: 'School Loan', balance: 12000, payment: 60 },
      { name: 'Car Loan', balance: 5000, payment: 100 },
      { name: 'Credit Card', balance: 3000, payment: 90 },
    ],
  };
}

function createBasePlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'p1',
    name: 'TestPlayer',
    profession: 'Teacher',
    financialStatement: createBaseFinancialStatement(overrides?.financialStatement),
    cash: 400,
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
    ...overrides,
  };
}

function makeStockAsset(overrides?: Partial<StockAsset>): StockAsset {
  return {
    kind: 'stock',
    id: 'stock-1',
    name: 'Test Stock',
    symbol: 'TST',
    shares: 100,
    costPerShare: 10,
    dividendPerShare: 0.5,
    ...overrides,
  };
}

function makeRealEstateAsset(overrides?: Partial<RealEstateAsset>): RealEstateAsset {
  return {
    kind: 'realEstate',
    id: 're-1',
    name: '3Br/2Ba House',
    type: 'house',
    cost: 65000,
    mortgage: 60000,
    downPayment: 5000,
    cashFlow: 160,
    ...overrides,
  };
}

function makeBusinessAsset(overrides?: Partial<BusinessAsset>): BusinessAsset {
  return {
    kind: 'business',
    id: 'biz-1',
    name: 'Vending Machine Route',
    cost: 6000,
    mortgage: 0,
    downPayment: 6000,
    cashFlow: 100,
    ...overrides,
  };
}

// ── Type guard tests ──

describe('Type guards', () => {
  it('isStockAsset identifies stock assets correctly', () => {
    expect(isStockAsset(makeStockAsset())).toBe(true);
    expect(isStockAsset(makeRealEstateAsset())).toBe(false);
    expect(isStockAsset(makeBusinessAsset())).toBe(false);
  });

  it('isRealEstateAsset identifies real estate assets correctly', () => {
    expect(isRealEstateAsset(makeRealEstateAsset())).toBe(true);
    expect(isRealEstateAsset(makeStockAsset())).toBe(false);
    expect(isRealEstateAsset(makeBusinessAsset())).toBe(false);
  });

  it('isBusinessAsset identifies business assets correctly', () => {
    expect(isBusinessAsset(makeBusinessAsset())).toBe(true);
    expect(isBusinessAsset(makeStockAsset())).toBe(false);
    expect(isBusinessAsset(makeRealEstateAsset())).toBe(false);
  });
});

// ── calculatePassiveIncome ──

describe('calculatePassiveIncome', () => {
  it('returns 0 when there are no assets', () => {
    const fs = createBaseFinancialStatement();
    expect(calculatePassiveIncome(fs)).toBe(0);
  });

  it('calculates stock dividend income (dividendPerShare * shares)', () => {
    const stock = makeStockAsset({ shares: 200, dividendPerShare: 0.5 });
    const fs = createBaseFinancialStatement({ assets: [stock] });
    expect(calculatePassiveIncome(fs)).toBe(100); // 200 * 0.5
  });

  it('calculates real estate cash flow', () => {
    const property = makeRealEstateAsset({ cashFlow: 250 });
    const fs = createBaseFinancialStatement({ assets: [property] });
    expect(calculatePassiveIncome(fs)).toBe(250);
  });

  it('calculates business cash flow', () => {
    const biz = makeBusinessAsset({ cashFlow: 150 });
    const fs = createBaseFinancialStatement({ assets: [biz] });
    expect(calculatePassiveIncome(fs)).toBe(150);
  });

  it('sums income from multiple asset types', () => {
    const stock = makeStockAsset({ shares: 100, dividendPerShare: 0.2 }); // 20
    const property = makeRealEstateAsset({ cashFlow: 160 }); // 160
    const biz = makeBusinessAsset({ cashFlow: 100 }); // 100
    const fs = createBaseFinancialStatement({ assets: [stock, property, biz] });
    expect(calculatePassiveIncome(fs)).toBe(280); // 20 + 160 + 100
  });

  it('handles stocks with zero dividends', () => {
    const stock = makeStockAsset({ shares: 500, dividendPerShare: 0 });
    const fs = createBaseFinancialStatement({ assets: [stock] });
    expect(calculatePassiveIncome(fs)).toBe(0);
  });
});

// ── calculateTotalIncome ──

describe('calculateTotalIncome', () => {
  it('returns salary when there is no passive income', () => {
    const fs = createBaseFinancialStatement();
    expect(calculateTotalIncome(fs)).toBe(3300);
  });

  it('returns salary + passive income', () => {
    const property = makeRealEstateAsset({ cashFlow: 200 });
    const fs = createBaseFinancialStatement({ assets: [property] });
    expect(calculateTotalIncome(fs)).toBe(3500); // 3300 + 200
  });
});

// ── calculateBankLoanPayment ──

describe('calculateBankLoanPayment', () => {
  it('returns 0 when bank loan amount is 0', () => {
    const player = createBasePlayer({ bankLoanAmount: 0 });
    expect(calculateBankLoanPayment(player)).toBe(0);
  });

  it('calculates 10% annual / 12 months for monthly payment', () => {
    const player = createBasePlayer({ bankLoanAmount: 12000 });
    // 12000 * 0.1 / 12 = 100
    expect(calculateBankLoanPayment(player)).toBe(100);
  });

  it('rounds up fractional payments', () => {
    const player = createBasePlayer({ bankLoanAmount: 1000 });
    // 1000 * 0.1 / 12 = 8.333... -> ceil = 9
    expect(calculateBankLoanPayment(player)).toBe(9);
  });
});

// ── calculateTotalExpenses ──

describe('calculateTotalExpenses', () => {
  it('sums all expense fields (no children, no bank loan)', () => {
    const player = createBasePlayer();
    // taxes(830) + mortgage(500) + school(60) + car(100) + credit(90) + other(760) + perChild*count(0) + bankLoan(0)
    expect(calculateTotalExpenses(player)).toBe(2340);
  });

  it('includes per-child expense multiplied by child count', () => {
    const player = createBasePlayer({
      financialStatement: {
        ...createBaseFinancialStatement(),
        expenses: {
          ...createBaseFinancialStatement().expenses,
          childCount: 2,
        },
      },
    });
    // 2340 + 180*2 = 2700
    expect(calculateTotalExpenses(player)).toBe(2700);
  });

  it('includes bank loan payment', () => {
    const player = createBasePlayer({ bankLoanAmount: 12000 });
    // 2340 + 100 (bank loan payment) = 2440
    expect(calculateTotalExpenses(player)).toBe(2440);
  });

  it('includes both child expenses and bank loan payment', () => {
    const player = createBasePlayer({
      bankLoanAmount: 12000,
      financialStatement: {
        ...createBaseFinancialStatement(),
        expenses: {
          ...createBaseFinancialStatement().expenses,
          childCount: 3,
        },
      },
    });
    // 2340 + 180*3 + 100 = 2980
    expect(calculateTotalExpenses(player)).toBe(2980);
  });
});

// ── calculateCashFlow ──

describe('calculateCashFlow', () => {
  it('returns total income minus total expenses', () => {
    const player = createBasePlayer();
    // income: 3300, expenses: 2340
    expect(calculateCashFlow(player)).toBe(960);
  });

  it('can be negative if expenses exceed income', () => {
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({
        income: { salary: 1000 },
      }),
    });
    // income: 1000, expenses: 2340
    expect(calculateCashFlow(player)).toBe(-1340);
  });

  it('includes passive income from assets', () => {
    const property = makeRealEstateAsset({ cashFlow: 500 });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [property] }),
    });
    // income: 3300 + 500 = 3800, expenses: 2340
    expect(calculateCashFlow(player)).toBe(1460);
  });
});

// ── canEscapeRatRace ──

describe('canEscapeRatRace', () => {
  it('returns false when passive income < total expenses', () => {
    const player = createBasePlayer(); // passive: 0, expenses: 2340
    expect(canEscapeRatRace(player)).toBe(false);
  });

  it('returns false when passive income = total expenses (must be strictly greater)', () => {
    // Need passive = 2340 exactly. expenses total = 2340
    const property = makeRealEstateAsset({ cashFlow: 2340 });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [property] }),
    });
    expect(canEscapeRatRace(player)).toBe(false);
  });

  it('returns true when passive income > total expenses', () => {
    const property = makeRealEstateAsset({ cashFlow: 2341 });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [property] }),
    });
    expect(canEscapeRatRace(player)).toBe(true);
  });

  it('accounts for children in expenses when evaluating escape', () => {
    // With 2 children: expenses = 2340 + 180*2 = 2700
    const property = makeRealEstateAsset({ cashFlow: 2700 });
    const player = createBasePlayer({
      financialStatement: {
        ...createBaseFinancialStatement({ assets: [property] }),
        expenses: {
          ...createBaseFinancialStatement().expenses,
          childCount: 2,
        },
      },
    });
    expect(canEscapeRatRace(player)).toBe(false); // exactly equal, not greater

    const property2 = makeRealEstateAsset({ cashFlow: 2701 });
    const player2 = createBasePlayer({
      financialStatement: {
        ...createBaseFinancialStatement({ assets: [property2] }),
        expenses: {
          ...createBaseFinancialStatement().expenses,
          childCount: 2,
        },
      },
    });
    expect(canEscapeRatRace(player2)).toBe(true);
  });
});

// ── processPayDay ──

describe('processPayDay', () => {
  it('adds cash flow amount to player cash', () => {
    const player = createBasePlayer({ cash: 1000 });
    // cashFlow = 3300 - 2340 = 960
    const result = processPayDay(player);
    expect(result.cash).toBe(1960); // 1000 + 960
  });

  it('can reduce cash when cash flow is negative', () => {
    const player = createBasePlayer({
      cash: 1000,
      financialStatement: createBaseFinancialStatement({
        income: { salary: 1000 },
      }),
    });
    // cashFlow = 1000 - 2340 = -1340
    const result = processPayDay(player);
    expect(result.cash).toBe(-340);
  });

  it('does not mutate the original player', () => {
    const player = createBasePlayer({ cash: 1000 });
    const result = processPayDay(player);
    expect(player.cash).toBe(1000); // unchanged
    expect(result.cash).not.toBe(player.cash);
  });
});

// ── addAsset / removeAsset ──

describe('addAsset', () => {
  it('adds an asset to the financial statement', () => {
    const player = createBasePlayer();
    expect(player.financialStatement.assets).toHaveLength(0);

    const stock = makeStockAsset();
    const result = addAsset(player, stock);
    expect(result.financialStatement.assets).toHaveLength(1);
    expect(result.financialStatement.assets[0]).toEqual(stock);
  });

  it('appends to existing assets without replacing', () => {
    const stock1 = makeStockAsset({ id: 'stock-1' });
    const stock2 = makeStockAsset({ id: 'stock-2', symbol: 'ABC' });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [stock1] }),
    });

    const result = addAsset(player, stock2);
    expect(result.financialStatement.assets).toHaveLength(2);
  });

  it('does not mutate the original player', () => {
    const player = createBasePlayer();
    addAsset(player, makeStockAsset());
    expect(player.financialStatement.assets).toHaveLength(0);
  });
});

describe('removeAsset', () => {
  it('removes an asset by ID', () => {
    const stock = makeStockAsset({ id: 'stock-1' });
    const property = makeRealEstateAsset({ id: 're-1' });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [stock, property] }),
    });

    const result = removeAsset(player, 'stock-1');
    expect(result.financialStatement.assets).toHaveLength(1);
    expect(result.financialStatement.assets[0].id).toBe('re-1');
  });

  it('returns unchanged player if asset ID not found', () => {
    const stock = makeStockAsset({ id: 'stock-1' });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [stock] }),
    });

    const result = removeAsset(player, 'nonexistent');
    expect(result.financialStatement.assets).toHaveLength(1);
  });
});

// ── addLiability / removeLiability ──

describe('addLiability', () => {
  it('adds a liability to the financial statement', () => {
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ liabilities: [] }),
    });
    const result = addLiability(player, { name: 'Test Loan', balance: 10000, payment: 200 });
    expect(result.financialStatement.liabilities).toHaveLength(1);
    expect(result.financialStatement.liabilities[0].name).toBe('Test Loan');
  });
});

describe('removeLiability', () => {
  it('removes a liability by name', () => {
    const player = createBasePlayer();
    const result = removeLiability(player, 'Home Mortgage');
    expect(result.financialStatement.liabilities.find((l) => l.name === 'Home Mortgage')).toBeUndefined();
  });
});

// ── updateStockShares / findStockBySymbol ──

describe('updateStockShares', () => {
  it('increases shares of an existing stock', () => {
    const stock = makeStockAsset({ id: 'stock-1', shares: 100 });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [stock] }),
    });

    const result = updateStockShares(player, 'stock-1', 50);
    const updatedStock = result.financialStatement.assets[0] as StockAsset;
    expect(updatedStock.shares).toBe(150);
  });

  it('does not affect other assets', () => {
    const stock = makeStockAsset({ id: 'stock-1', shares: 100 });
    const property = makeRealEstateAsset({ id: 're-1' });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [stock, property] }),
    });

    const result = updateStockShares(player, 'stock-1', 50);
    expect(result.financialStatement.assets).toHaveLength(2);
    expect((result.financialStatement.assets[1] as RealEstateAsset).cashFlow).toBe(160);
  });
});

describe('findStockBySymbol', () => {
  it('finds a stock asset by its symbol', () => {
    const stock = makeStockAsset({ symbol: 'TST' });
    const player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({ assets: [stock] }),
    });

    const found = findStockBySymbol(player, 'TST');
    expect(found).toBeDefined();
    expect(found!.symbol).toBe('TST');
  });

  it('returns undefined when symbol not found', () => {
    const player = createBasePlayer();
    expect(findStockBySymbol(player, 'NOPE')).toBeUndefined();
  });
});

// ── addChild ──

describe('addChild', () => {
  it('increments childCount by 1', () => {
    const player = createBasePlayer();
    expect(player.financialStatement.expenses.childCount).toBe(0);

    const result = addChild(player);
    expect(result.financialStatement.expenses.childCount).toBe(1);
  });

  it('can add up to 3 children', () => {
    let player = createBasePlayer();
    player = addChild(player);
    expect(player.financialStatement.expenses.childCount).toBe(1);
    player = addChild(player);
    expect(player.financialStatement.expenses.childCount).toBe(2);
    player = addChild(player);
    expect(player.financialStatement.expenses.childCount).toBe(3);
  });

  it('does not exceed 3 children (max limit)', () => {
    let player = createBasePlayer({
      financialStatement: createBaseFinancialStatement({
        expenses: { ...createBaseFinancialStatement().expenses, childCount: 3 },
      }),
    });
    const result = addChild(player);
    expect(result.financialStatement.expenses.childCount).toBe(3);
    // Should return exact same reference when at max
    expect(result).toBe(player);
  });

  it('does not mutate the original player', () => {
    const player = createBasePlayer();
    addChild(player);
    expect(player.financialStatement.expenses.childCount).toBe(0);
  });
});

// ── takeBankLoan ──

describe('takeBankLoan', () => {
  it('increases cash and bankLoanAmount by the loan amount', () => {
    const player = createBasePlayer({ cash: 500 });
    const result = takeBankLoan(player, 3000);
    expect(result.cash).toBe(3500);
    expect(result.bankLoanAmount).toBe(3000);
  });

  it('must be in $1000 increments', () => {
    const player = createBasePlayer({ cash: 500 });
    const result = takeBankLoan(player, 1500);
    // Invalid amount - should return original player
    expect(result).toBe(player);
    expect(result.cash).toBe(500);
  });

  it('rejects zero amount', () => {
    const player = createBasePlayer();
    expect(takeBankLoan(player, 0)).toBe(player);
  });

  it('rejects negative amount', () => {
    const player = createBasePlayer();
    expect(takeBankLoan(player, -1000)).toBe(player);
  });

  it('allows multiple loans to stack', () => {
    let player = createBasePlayer({ cash: 500 });
    player = takeBankLoan(player, 2000);
    expect(player.cash).toBe(2500);
    expect(player.bankLoanAmount).toBe(2000);

    player = takeBankLoan(player, 3000);
    expect(player.cash).toBe(5500);
    expect(player.bankLoanAmount).toBe(5000);
  });
});

// ── payOffBankLoan ──

describe('payOffBankLoan', () => {
  it('decreases cash and bankLoanAmount', () => {
    const player = createBasePlayer({ cash: 5000, bankLoanAmount: 3000 });
    const result = payOffBankLoan(player, 2000);
    expect(result.cash).toBe(3000);
    expect(result.bankLoanAmount).toBe(1000);
  });

  it('can fully pay off the loan', () => {
    const player = createBasePlayer({ cash: 5000, bankLoanAmount: 3000 });
    const result = payOffBankLoan(player, 3000);
    expect(result.cash).toBe(2000);
    expect(result.bankLoanAmount).toBe(0);
  });

  it('rejects amount not in $1000 increments', () => {
    const player = createBasePlayer({ cash: 5000, bankLoanAmount: 3000 });
    expect(payOffBankLoan(player, 1500)).toBe(player);
  });

  it('rejects amount exceeding loan balance', () => {
    const player = createBasePlayer({ cash: 5000, bankLoanAmount: 2000 });
    expect(payOffBankLoan(player, 3000)).toBe(player);
  });

  it('rejects amount exceeding available cash', () => {
    const player = createBasePlayer({ cash: 1000, bankLoanAmount: 3000 });
    expect(payOffBankLoan(player, 2000)).toBe(player);
  });

  it('rejects zero amount', () => {
    const player = createBasePlayer({ cash: 5000, bankLoanAmount: 3000 });
    expect(payOffBankLoan(player, 0)).toBe(player);
  });

  it('rejects negative amount', () => {
    const player = createBasePlayer({ cash: 5000, bankLoanAmount: 3000 });
    expect(payOffBankLoan(player, -1000)).toBe(player);
  });
});

// ── payOffLiability ──

describe('payOffLiability', () => {
  it('partially pays off a liability (reduces balance)', () => {
    const player = createBasePlayer({ cash: 10000 });
    const result = payOffLiability(player, 'Home Mortgage', 5000);
    expect(result.cash).toBe(5000);
    const mortgage = result.financialStatement.liabilities.find((l) => l.name === 'Home Mortgage');
    expect(mortgage).toBeDefined();
    expect(mortgage!.balance).toBe(45000); // 50000 - 5000
  });

  it('fully pays off a liability (removes it and zeroes expense)', () => {
    const player = createBasePlayer({ cash: 60000 });
    const result = payOffLiability(player, 'Home Mortgage', 50000);
    expect(result.cash).toBe(10000);
    const mortgage = result.financialStatement.liabilities.find((l) => l.name === 'Home Mortgage');
    expect(mortgage).toBeUndefined();
    expect(result.financialStatement.expenses.homeMortgagePayment).toBe(0);
  });

  it('zeroes the correct expense for School Loan', () => {
    const player = createBasePlayer({ cash: 20000 });
    const result = payOffLiability(player, 'School Loan', 12000);
    expect(result.financialStatement.expenses.schoolLoanPayment).toBe(0);
  });

  it('zeroes the correct expense for Car Loan', () => {
    const player = createBasePlayer({ cash: 10000 });
    const result = payOffLiability(player, 'Car Loan', 5000);
    expect(result.financialStatement.expenses.carLoanPayment).toBe(0);
  });

  it('zeroes the correct expense for Credit Card', () => {
    const player = createBasePlayer({ cash: 10000 });
    const result = payOffLiability(player, 'Credit Card', 3000);
    expect(result.financialStatement.expenses.creditCardPayment).toBe(0);
  });

  it('rejects payment if liability does not exist', () => {
    const player = createBasePlayer({ cash: 10000 });
    expect(payOffLiability(player, 'Nonexistent', 5000)).toBe(player);
  });

  it('rejects payment exceeding available cash', () => {
    const player = createBasePlayer({ cash: 100 });
    expect(payOffLiability(player, 'Home Mortgage', 5000)).toBe(player);
  });

  it('rejects zero amount', () => {
    const player = createBasePlayer({ cash: 10000 });
    expect(payOffLiability(player, 'Home Mortgage', 0)).toBe(player);
  });

  it('rejects negative amount', () => {
    const player = createBasePlayer({ cash: 10000 });
    expect(payOffLiability(player, 'Home Mortgage', -1000)).toBe(player);
  });

  it('overpayment (amount > balance) still fully pays off the liability', () => {
    const player = createBasePlayer({ cash: 60000 });
    // Credit Card balance is 3000; paying 5000 -> newBalance = -2000 (<= 0) -> removes
    const result = payOffLiability(player, 'Credit Card', 5000);
    expect(result.financialStatement.liabilities.find((l) => l.name === 'Credit Card')).toBeUndefined();
    expect(result.financialStatement.expenses.creditCardPayment).toBe(0);
    expect(result.cash).toBe(55000); // 60000 - 5000
  });
});
