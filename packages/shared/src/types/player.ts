// ── Asset types ──

export interface StockAsset {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  costPerShare: number;
  dividendPerShare: number;
}

export interface RealEstateAsset {
  id: string;
  name: string;
  type: 'house' | 'condo' | 'apartment' | 'duplex' | 'fourplex' | 'eightplex' | 'land' | 'commercial';
  cost: number;
  mortgage: number;
  downPayment: number;
  cashFlow: number;
}

export interface BusinessAsset {
  id: string;
  name: string;
  cost: number;
  mortgage: number;
  downPayment: number;
  cashFlow: number;
}

export type Asset = StockAsset | RealEstateAsset | BusinessAsset;

// ── Liability types ──

export interface Liability {
  name: string;
  balance: number;
  payment: number;
}

// ── Financial Statement ──

export interface Income {
  salary: number;
  // Passive income is computed from assets, not stored
}

export interface Expenses {
  taxes: number;
  homeMortgagePayment: number;
  schoolLoanPayment: number;
  carLoanPayment: number;
  creditCardPayment: number;
  otherExpenses: number;
  perChildExpense: number;
  childCount: number;
  // bankLoanPayment is computed from liabilities
}

export interface FinancialStatement {
  income: Income;
  expenses: Expenses;
  assets: Asset[];
  liabilities: Liability[];
}

// ── Player ──

export interface Player {
  id: string;
  name: string;
  profession: string;
  financialStatement: FinancialStatement;
  cash: number;
  position: number;
  isInFastTrack: boolean;
  fastTrackPosition: number;
  fastTrackCashFlow: number;
  hasEscaped: boolean;
  hasWon: boolean;
  dream: string | null;
  downsizedTurnsLeft: number;
  charityTurnsLeft: number;
  bankLoanAmount: number;
  isBankrupt: boolean;
  bankruptTurnsLeft: number;
}
