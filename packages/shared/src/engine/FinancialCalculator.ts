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
