import type { Asset } from './player.js';

// ── Profession Card ──

export interface ProfessionCard {
  title: string;
  salary: number;
  taxes: number;
  homeMortgagePayment: number;
  homeMortgageBalance: number;
  schoolLoanPayment: number;
  schoolLoanBalance: number;
  carLoanPayment: number;
  carLoanBalance: number;
  creditCardPayment: number;
  creditCardBalance: number;
  otherExpenses: number;
  perChildExpense: number;
  savings: number; // starting cash
}

// ── Deal Cards ──

export type DealType = 'stock' | 'realEstate' | 'business';

export interface StockDeal {
  type: 'stock';
  name: string;
  symbol: string;
  costPerShare: number;
  dividendPerShare: number;
  historicalPriceRange: { low: number; high: number };
  description: string;
  rule: string;
}

export interface RealEstateDeal {
  type: 'realEstate';
  subType: 'house' | 'condo' | 'apartment' | 'duplex' | 'fourplex' | 'eightplex' | 'land' | 'commercial';
  name: string;
  cost: number;
  mortgage: number;
  downPayment: number;
  cashFlow: number;
  description: string;
  rule: string;
}

export interface BusinessDeal {
  type: 'business';
  name: string;
  cost: number;
  mortgage: number;
  downPayment: number;
  cashFlow: number;
  description: string;
  rule: string;
}

export type DealCardData = StockDeal | RealEstateDeal | BusinessDeal;

export interface SmallDealCard {
  id: string;
  title: string;
  deal: DealCardData;
}

export interface BigDealCard {
  id: string;
  title: string;
  deal: DealCardData;
}

// ── Market Card ──

export type MarketEffect =
  | { type: 'stockPriceChange'; symbol: string; newPrice: number; description: string }
  | { type: 'realEstateOffer'; subTypes: string[]; offerMultiplier: number; description: string }
  | { type: 'realEstateOfferFlat'; subTypes: string[]; offerAmount: number; description: string }
  | { type: 'damageToProperty'; subTypes: string[]; cost: number; description: string }
  | { type: 'allPlayersExpense'; amount: number; description: string };

export interface MarketCard {
  id: string;
  title: string;
  description: string;
  effect: MarketEffect;
}

// ── Doodad Card ──

export interface DoodadCard {
  id: string;
  title: string;
  description: string;
  cost: number;
  isPercentOfIncome?: boolean; // if true, cost is percentage (e.g. 10 = 10%)
}

// ── Fast Track Cards ──

export interface FastTrackDealCard {
  id: string;
  title: string;
  description: string;
  cost: number;
  cashFlow: number;
  downPayment: number;
}

// ── Union type ──

export type Card = SmallDealCard | BigDealCard | MarketCard | DoodadCard;
