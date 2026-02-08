import { describe, it, expect } from 'vitest';
import { SMALL_DEAL_CARDS } from '../smallDeals.js';
import { BIG_DEAL_CARDS } from '../bigDeals.js';
import { DOODAD_CARDS } from '../doodads.js';
import { MARKET_CARDS } from '../marketCards.js';
import { PROFESSIONS } from '../professions.js';

const VALID_STOCK_SYMBOLS = ['ON2U', 'MYT4U', 'OK4U', 'GRO4US'];

const VALID_MARKET_EFFECT_TYPES = [
  'stockPriceChange',
  'realEstateOffer',
  'realEstateOfferFlat',
  'damageToProperty',
  'allPlayersExpense',
];

describe('Card Data Consistency', () => {
  // ── ID Uniqueness ──

  describe('ID uniqueness', () => {
    it('all small deal card IDs are unique', () => {
      const ids = SMALL_DEAL_CARDS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all big deal card IDs are unique', () => {
      const ids = BIG_DEAL_CARDS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all doodad card IDs are unique', () => {
      const ids = DOODAD_CARDS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all market card IDs are unique', () => {
      const ids = MARKET_CARDS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all card IDs are unique across ALL decks combined', () => {
      const allIds = [
        ...SMALL_DEAL_CARDS.map((c) => c.id),
        ...BIG_DEAL_CARDS.map((c) => c.id),
        ...DOODAD_CARDS.map((c) => c.id),
        ...MARKET_CARDS.map((c) => c.id),
      ];
      expect(new Set(allIds).size).toBe(allIds.length);
    });
  });

  // ── No Empty Strings ──

  describe('no empty strings', () => {
    it('no card has empty string for id', () => {
      const allCards = [
        ...SMALL_DEAL_CARDS,
        ...BIG_DEAL_CARDS,
        ...DOODAD_CARDS,
        ...MARKET_CARDS,
      ];
      for (const card of allCards) {
        expect(card.id, `card "${card.title}" has empty id`).not.toBe('');
      }
    });

    it('no card has empty string for title', () => {
      const allCards = [
        ...SMALL_DEAL_CARDS,
        ...BIG_DEAL_CARDS,
        ...DOODAD_CARDS,
        ...MARKET_CARDS,
      ];
      for (const card of allCards) {
        expect(card.title, `card "${card.id}" has empty title`).not.toBe('');
      }
    });
  });

  // ── Small Deal Cards ──

  describe('small deal cards', () => {
    it('has expected count of 30 cards', () => {
      expect(SMALL_DEAL_CARDS.length).toBe(30);
    });

    it('each card has id, title, and deal with type/name/description/rule', () => {
      for (const card of SMALL_DEAL_CARDS) {
        expect(card.id).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.deal).toBeDefined();
        expect(card.deal.type).toBeTruthy();
        expect(card.deal.name).toBeTruthy();
        expect(card.deal.description).toBeTruthy();
        expect(card.deal.rule).toBeTruthy();
      }
    });

    describe('stock deals', () => {
      const stockDeals = SMALL_DEAL_CARDS.filter((c) => c.deal.type === 'stock');

      it('all stock symbols are valid', () => {
        for (const card of stockDeals) {
          const deal = card.deal as { symbol: string };
          expect(
            VALID_STOCK_SYMBOLS,
            `card "${card.id}" has invalid symbol "${deal.symbol}"`
          ).toContain(deal.symbol);
        }
      });

      it('all stocks have costPerShare > 0', () => {
        for (const card of stockDeals) {
          const deal = card.deal as { costPerShare: number };
          expect(deal.costPerShare, `card "${card.id}" has invalid costPerShare`).toBeGreaterThan(0);
        }
      });
    });

    describe('real estate deals', () => {
      const reDeals = SMALL_DEAL_CARDS.filter((c) => c.deal.type === 'realEstate');

      it('all have cost > 0', () => {
        for (const card of reDeals) {
          const deal = card.deal as { cost: number };
          expect(deal.cost, `card "${card.id}" has invalid cost`).toBeGreaterThan(0);
        }
      });

      it('all have mortgage >= 0', () => {
        for (const card of reDeals) {
          const deal = card.deal as { mortgage: number };
          expect(deal.mortgage, `card "${card.id}" has negative mortgage`).toBeGreaterThanOrEqual(0);
        }
      });

      it('all have downPayment >= 0', () => {
        for (const card of reDeals) {
          const deal = card.deal as { downPayment: number };
          expect(deal.downPayment, `card "${card.id}" has negative downPayment`).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('stock split deals', () => {
      const splitDeals = SMALL_DEAL_CARDS.filter((c) => c.deal.type === 'stockSplit');

      it('all have a valid symbol', () => {
        for (const card of splitDeals) {
          const deal = card.deal as { symbol: string };
          expect(
            VALID_STOCK_SYMBOLS,
            `card "${card.id}" has invalid symbol "${deal.symbol}"`
          ).toContain(deal.symbol);
        }
      });

      it('all have splitRatio > 0', () => {
        for (const card of splitDeals) {
          const deal = card.deal as { splitRatio: number };
          expect(deal.splitRatio, `card "${card.id}" has invalid splitRatio`).toBeGreaterThan(0);
        }
      });
    });
  });

  // ── Big Deal Cards ──

  describe('big deal cards', () => {
    it('has expected count of 24 cards', () => {
      expect(BIG_DEAL_CARDS.length).toBe(24);
    });

    it('each card has id, title, and deal with type/name/description/rule', () => {
      for (const card of BIG_DEAL_CARDS) {
        expect(card.id).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.deal).toBeDefined();
        expect(card.deal.type).toBeTruthy();
        expect(card.deal.name).toBeTruthy();
        expect(card.deal.description).toBeTruthy();
        expect(card.deal.rule).toBeTruthy();
      }
    });

    describe('real estate deals', () => {
      const reDeals = BIG_DEAL_CARDS.filter((c) => c.deal.type === 'realEstate');

      it('all have cost > 0', () => {
        for (const card of reDeals) {
          const deal = card.deal as { cost: number };
          expect(deal.cost, `card "${card.id}" has invalid cost`).toBeGreaterThan(0);
        }
      });

      it('all have mortgage >= 0', () => {
        for (const card of reDeals) {
          const deal = card.deal as { mortgage: number };
          expect(deal.mortgage, `card "${card.id}" has negative mortgage`).toBeGreaterThanOrEqual(0);
        }
      });

      it('all have downPayment > 0', () => {
        for (const card of reDeals) {
          const deal = card.deal as { downPayment: number };
          expect(deal.downPayment, `card "${card.id}" has invalid downPayment`).toBeGreaterThan(0);
        }
      });
    });

    describe('business deals', () => {
      const bizDeals = BIG_DEAL_CARDS.filter((c) => c.deal.type === 'business');

      it('all have cost > 0', () => {
        for (const card of bizDeals) {
          const deal = card.deal as { cost: number };
          expect(deal.cost, `card "${card.id}" has invalid cost`).toBeGreaterThan(0);
        }
      });

      it('all have downPayment > 0', () => {
        for (const card of bizDeals) {
          const deal = card.deal as { downPayment: number };
          expect(deal.downPayment, `card "${card.id}" has invalid downPayment`).toBeGreaterThan(0);
        }
      });
    });
  });

  // ── Doodad Cards ──

  describe('doodad cards', () => {
    it('has expected count of 25 cards', () => {
      expect(DOODAD_CARDS.length).toBe(25);
    });

    it('each card has id, title, and cost >= 0', () => {
      for (const card of DOODAD_CARDS) {
        expect(card.id).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.cost, `card "${card.id}" has negative cost`).toBeGreaterThanOrEqual(0);
      }
    });

    it('each card has a non-empty description', () => {
      for (const card of DOODAD_CARDS) {
        expect(card.description, `card "${card.id}" has empty description`).toBeTruthy();
      }
    });
  });

  // ── Market Cards ──

  describe('market cards', () => {
    it('has expected count of 25 cards', () => {
      expect(MARKET_CARDS.length).toBe(25);
    });

    it('each card has id, title, and effect with valid type', () => {
      for (const card of MARKET_CARDS) {
        expect(card.id).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.effect).toBeDefined();
        expect(
          VALID_MARKET_EFFECT_TYPES,
          `card "${card.id}" has invalid effect type "${card.effect.type}"`
        ).toContain(card.effect.type);
      }
    });

    it('stock price change effects use valid symbols', () => {
      const stockEffects = MARKET_CARDS.filter((c) => c.effect.type === 'stockPriceChange');
      for (const card of stockEffects) {
        const effect = card.effect as { symbol: string };
        expect(
          VALID_STOCK_SYMBOLS,
          `card "${card.id}" has invalid symbol "${effect.symbol}"`
        ).toContain(effect.symbol);
      }
    });

    it('stock price change effects have newPrice >= 0', () => {
      const stockEffects = MARKET_CARDS.filter((c) => c.effect.type === 'stockPriceChange');
      for (const card of stockEffects) {
        const effect = card.effect as { newPrice: number };
        expect(effect.newPrice, `card "${card.id}" has negative newPrice`).toBeGreaterThanOrEqual(0);
      }
    });

    it('real estate offer effects have offerMultiplier > 0', () => {
      const reOffers = MARKET_CARDS.filter((c) => c.effect.type === 'realEstateOffer');
      for (const card of reOffers) {
        const effect = card.effect as { offerMultiplier: number };
        expect(effect.offerMultiplier, `card "${card.id}" has invalid multiplier`).toBeGreaterThan(0);
      }
    });

    it('real estate flat offer effects have offerAmount > 0', () => {
      const flatOffers = MARKET_CARDS.filter((c) => c.effect.type === 'realEstateOfferFlat');
      for (const card of flatOffers) {
        const effect = card.effect as { offerAmount: number };
        expect(effect.offerAmount, `card "${card.id}" has invalid offerAmount`).toBeGreaterThan(0);
      }
    });

    it('damage to property effects have cost > 0', () => {
      const damageEffects = MARKET_CARDS.filter((c) => c.effect.type === 'damageToProperty');
      for (const card of damageEffects) {
        const effect = card.effect as { cost: number };
        expect(effect.cost, `card "${card.id}" has invalid cost`).toBeGreaterThan(0);
      }
    });

    it('all players expense effects have amount > 0', () => {
      const expenseEffects = MARKET_CARDS.filter((c) => c.effect.type === 'allPlayersExpense');
      for (const card of expenseEffects) {
        const effect = card.effect as { amount: number };
        expect(effect.amount, `card "${card.id}" has invalid amount`).toBeGreaterThan(0);
      }
    });
  });

  // ── Professions ──

  describe('professions', () => {
    it('has expected count of 12 professions', () => {
      expect(PROFESSIONS.length).toBe(12);
    });

    it('all have salary > 0', () => {
      for (const prof of PROFESSIONS) {
        expect(prof.salary, `${prof.title} has invalid salary`).toBeGreaterThan(0);
      }
    });

    it('all have taxes > 0', () => {
      for (const prof of PROFESSIONS) {
        expect(prof.taxes, `${prof.title} has invalid taxes`).toBeGreaterThan(0);
      }
    });

    it('all have complete expense structure', () => {
      for (const prof of PROFESSIONS) {
        expect(prof.homeMortgagePayment, `${prof.title} missing homeMortgagePayment`).toBeGreaterThanOrEqual(0);
        expect(prof.homeMortgageBalance, `${prof.title} missing homeMortgageBalance`).toBeGreaterThanOrEqual(0);
        expect(prof.schoolLoanPayment, `${prof.title} missing schoolLoanPayment`).toBeGreaterThanOrEqual(0);
        expect(prof.schoolLoanBalance, `${prof.title} missing schoolLoanBalance`).toBeGreaterThanOrEqual(0);
        expect(prof.carLoanPayment, `${prof.title} missing carLoanPayment`).toBeGreaterThanOrEqual(0);
        expect(prof.carLoanBalance, `${prof.title} missing carLoanBalance`).toBeGreaterThanOrEqual(0);
        expect(prof.creditCardPayment, `${prof.title} missing creditCardPayment`).toBeGreaterThanOrEqual(0);
        expect(prof.creditCardBalance, `${prof.title} missing creditCardBalance`).toBeGreaterThanOrEqual(0);
        expect(prof.otherExpenses, `${prof.title} missing otherExpenses`).toBeGreaterThanOrEqual(0);
        expect(prof.perChildExpense, `${prof.title} missing perChildExpense`).toBeGreaterThanOrEqual(0);
        expect(prof.savings, `${prof.title} missing savings`).toBeGreaterThanOrEqual(0);
      }
    });

    it('all have non-empty title', () => {
      for (const prof of PROFESSIONS) {
        expect(prof.title).toBeTruthy();
      }
    });

    it('all profession titles are unique', () => {
      const titles = PROFESSIONS.map((p) => p.title);
      expect(new Set(titles).size).toBe(titles.length);
    });

    it('loan payments and balances are consistent (if balance is 0, payment is 0)', () => {
      for (const prof of PROFESSIONS) {
        if (prof.schoolLoanBalance === 0) {
          expect(prof.schoolLoanPayment, `${prof.title} has payment but no school loan balance`).toBe(0);
        }
        if (prof.schoolLoanPayment > 0) {
          expect(prof.schoolLoanBalance, `${prof.title} has school loan payment but no balance`).toBeGreaterThan(0);
        }
      }
    });
  });
});
