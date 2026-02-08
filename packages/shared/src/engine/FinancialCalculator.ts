import type {
  Player,
  FinancialStatement,
  Asset,
  StockAsset,
  RealEstateAsset,
  BusinessAsset,
  Liability,
} from '../types/index.js';

export function isStockAsset(asset: Asset): asset is StockAsset {
  return 'symbol' in asset && 'shares' in asset;
}

export function isRealEstateAsset(asset: Asset): asset is RealEstateAsset {
  return 'type' in asset && 'mortgage' in asset && !('symbol' in asset);
}

export function isBusinessAsset(asset: Asset): asset is BusinessAsset {
  return 'mortgage' in asset && !('type' in asset) && !('symbol' in asset);
}

/** Sum of passive income from all assets (dividends + real estate cash flow + business cash flow) */
export function calculatePassiveIncome(fs: FinancialStatement): number {
  let passive = 0;
  for (const asset of fs.assets) {
    if (isStockAsset(asset)) {
      passive += asset.shares * asset.dividendPerShare;
    } else if (isRealEstateAsset(asset) || isBusinessAsset(asset)) {
      passive += asset.cashFlow;
    }
  }
  return passive;
}

/** Salary + passive income from investments */
export function calculateTotalIncome(fs: FinancialStatement): number {
  return fs.income.salary + calculatePassiveIncome(fs);
}

/** Bank loan interest payment (10% annual → divide by 12 for monthly) */
export function calculateBankLoanPayment(player: Player): number {
  return Math.ceil((player.bankLoanAmount * 0.1) / 12);
}

/** Sum of all monthly expenses including child expenses and bank loan */
export function calculateTotalExpenses(player: Player): number {
  const { expenses } = player.financialStatement;
  return (
    expenses.taxes +
    expenses.homeMortgagePayment +
    expenses.schoolLoanPayment +
    expenses.carLoanPayment +
    expenses.creditCardPayment +
    expenses.otherExpenses +
    expenses.perChildExpense * expenses.childCount +
    calculateBankLoanPayment(player)
  );
}

/** Total income - total expenses */
export function calculateCashFlow(player: Player): number {
  return calculateTotalIncome(player.financialStatement) - calculateTotalExpenses(player);
}

/** Can the player escape the rat race? (passive income > total expenses) */
export function canEscapeRatRace(player: Player): boolean {
  return calculatePassiveIncome(player.financialStatement) > calculateTotalExpenses(player);
}

/** Process PayDay: add cash flow to player's cash */
export function processPayDay(player: Player): Player {
  const cashFlow = calculateCashFlow(player);
  return {
    ...player,
    cash: player.cash + cashFlow,
  };
}

/** Add an asset to the player's financial statement */
export function addAsset(player: Player, asset: Asset): Player {
  return {
    ...player,
    financialStatement: {
      ...player.financialStatement,
      assets: [...player.financialStatement.assets, asset],
    },
  };
}

/** Remove an asset by ID */
export function removeAsset(player: Player, assetId: string): Player {
  return {
    ...player,
    financialStatement: {
      ...player.financialStatement,
      assets: player.financialStatement.assets.filter((a) => a.id !== assetId),
    },
  };
}

/** Add a liability */
export function addLiability(player: Player, liability: Liability): Player {
  return {
    ...player,
    financialStatement: {
      ...player.financialStatement,
      liabilities: [...player.financialStatement.liabilities, liability],
    },
  };
}

/** Remove a liability by name */
export function removeLiability(player: Player, liabilityName: string): Player {
  return {
    ...player,
    financialStatement: {
      ...player.financialStatement,
      liabilities: player.financialStatement.liabilities.filter((l) => l.name !== liabilityName),
    },
  };
}

/** Update shares of an existing stock asset */
export function updateStockShares(player: Player, assetId: string, additionalShares: number): Player {
  return {
    ...player,
    financialStatement: {
      ...player.financialStatement,
      assets: player.financialStatement.assets.map((a) => {
        if (a.id === assetId && isStockAsset(a)) {
          return { ...a, shares: a.shares + additionalShares };
        }
        return a;
      }),
    },
  };
}

/** Find a stock asset by symbol */
export function findStockBySymbol(player: Player, symbol: string): StockAsset | undefined {
  return player.financialStatement.assets.find(
    (a): a is StockAsset => isStockAsset(a) && a.symbol === symbol,
  );
}

/** Add a child to the player (max 3) */
export function addChild(player: Player): Player {
  if (player.financialStatement.expenses.childCount >= 3) {
    return player;
  }
  return {
    ...player,
    financialStatement: {
      ...player.financialStatement,
      expenses: {
        ...player.financialStatement.expenses,
        childCount: player.financialStatement.expenses.childCount + 1,
      },
    },
  };
}

/** Take a bank loan (must be in $1000 increments) */
export function takeBankLoan(player: Player, amount: number): Player {
  if (amount <= 0 || amount % 1000 !== 0) {
    return player;
  }
  return {
    ...player,
    cash: player.cash + amount,
    bankLoanAmount: player.bankLoanAmount + amount,
  };
}

/** Pay off bank loan */
export function payOffBankLoan(player: Player, amount: number): Player {
  if (amount <= 0 || amount > player.bankLoanAmount || amount > player.cash || amount % 1000 !== 0) {
    return player;
  }
  return {
    ...player,
    cash: player.cash - amount,
    bankLoanAmount: player.bankLoanAmount - amount,
  };
}

/** Pay off a specific liability */
export function payOffLiability(player: Player, liabilityName: string, amount: number): Player {
  const liability = player.financialStatement.liabilities.find((l) => l.name === liabilityName);
  if (!liability || amount > player.cash || amount <= 0) {
    return player;
  }

  const newBalance = liability.balance - amount;
  if (newBalance <= 0) {
    // Liability fully paid off - remove it and zero out the corresponding expense
    let updatedPlayer = removeLiability(player, liabilityName);
    updatedPlayer = {
      ...updatedPlayer,
      cash: updatedPlayer.cash - amount,
      financialStatement: {
        ...updatedPlayer.financialStatement,
        expenses: zeroExpenseForLiability(updatedPlayer.financialStatement.expenses, liabilityName),
      },
    };
    return updatedPlayer;
  }

  // Partial payment - reduce balance
  return {
    ...player,
    cash: player.cash - amount,
    financialStatement: {
      ...player.financialStatement,
      liabilities: player.financialStatement.liabilities.map((l) =>
        l.name === liabilityName ? { ...l, balance: newBalance } : l,
      ),
    },
  };
}

/** Auto-take bank loan in $1,000 increments if player cash is negative (forced loan) */
export function autoTakeLoanIfNeeded(player: Player): { player: Player; amountBorrowed: number } {
  if (player.cash >= 0) return { player, amountBorrowed: 0 };
  const loanAmount = Math.ceil(Math.abs(player.cash) / 1000) * 1000;
  return {
    player: {
      ...player,
      cash: player.cash + loanAmount,
      bankLoanAmount: player.bankLoanAmount + loanAmount,
    },
    amountBorrowed: loanAmount,
  };
}

/** Calculate the max voluntary bank loan that keeps monthly cash flow > 0 */
export function getMaxBankLoan(player: Player): number {
  const currentCashFlow = calculateCashFlow(player);
  if (currentCashFlow <= 0) return 0;
  // Each $1,000 of bank loan adds $1,000 * 0.1 / 12 ≈ $8.33 monthly payment
  const monthlyPaymentPer1000 = (1000 * 0.1) / 12;
  // Cash flow must stay > 0 after the new loan payment
  const maxLoans = Math.floor((currentCashFlow - 1) / monthlyPaymentPer1000);
  return Math.max(0, Math.floor(maxLoans) * 1000);
}

/** Execute bankruptcy procedure:
 * 1. Sell all assets at half of down payment
 * 2. Halve car loan, credit card, and retail debt
 * 3. Keep home mortgage and school loan
 * 4. Recalculate cash flow
 * 5. If cash flow still < 0 → eliminated
 * 6. Otherwise → 2 turn skip
 */
export function executeBankruptcy(player: Player): { player: Player; eliminated: boolean } {
  let p = { ...player };
  let fs = { ...p.financialStatement };

  // 1. Sell all assets at half down payment
  for (const asset of fs.assets) {
    if (isRealEstateAsset(asset) || isBusinessAsset(asset)) {
      const salePrice = Math.floor(asset.downPayment / 2);
      p.cash += salePrice;
      // Mortgage on the asset is forgiven (asset removed)
    } else if (isStockAsset(asset)) {
      // Stocks sold at 0 in bankruptcy (worthless forced sale)
      // In real game, stocks have no down payment concept
    }
  }
  fs.assets = [];

  // 2. Halve car loan and credit card balances & payments
  const halvableDebts = ['Car Loan', 'Credit Card'];
  fs.liabilities = fs.liabilities.map((l) => {
    if (halvableDebts.includes(l.name)) {
      const newBalance = Math.floor(l.balance / 2);
      const newPayment = Math.floor(l.payment / 2);
      return { ...l, balance: newBalance, payment: newPayment };
    }
    return l;
  });

  // Update expenses to match halved liabilities
  fs.expenses = {
    ...fs.expenses,
    carLoanPayment: Math.floor(fs.expenses.carLoanPayment / 2),
    creditCardPayment: Math.floor(fs.expenses.creditCardPayment / 2),
  };

  // Remove any liability with 0 balance
  fs.liabilities = fs.liabilities.filter((l) => l.balance > 0);
  // If car loan was fully eliminated, zero the expense
  if (!fs.liabilities.find((l) => l.name === 'Car Loan')) {
    fs.expenses = { ...fs.expenses, carLoanPayment: 0 };
  }
  if (!fs.liabilities.find((l) => l.name === 'Credit Card')) {
    fs.expenses = { ...fs.expenses, creditCardPayment: 0 };
  }

  // 3. Home mortgage and school loan stay as-is
  // 4. Bank loan stays as-is

  p.financialStatement = fs;

  // 5. Recalculate cash flow
  const totalIncome = calculateTotalIncome(p.financialStatement);
  const totalExpenses = calculateTotalExpenses(p);
  const newCashFlow = totalIncome - totalExpenses;

  if (newCashFlow < 0) {
    // Eliminated
    return { player: { ...p, isBankrupt: true, financialStatement: fs }, eliminated: true };
  }

  // 6. Survive with 2 turn skip
  return {
    player: { ...p, bankruptTurnsLeft: 2, financialStatement: fs },
    eliminated: false,
  };
}

function zeroExpenseForLiability(
  expenses: Player['financialStatement']['expenses'],
  liabilityName: string,
): Player['financialStatement']['expenses'] {
  switch (liabilityName) {
    case 'Home Mortgage':
      return { ...expenses, homeMortgagePayment: 0 };
    case 'School Loan':
      return { ...expenses, schoolLoanPayment: 0 };
    case 'Car Loan':
      return { ...expenses, carLoanPayment: 0 };
    case 'Credit Card':
      return { ...expenses, creditCardPayment: 0 };
    default:
      return expenses;
  }
}
