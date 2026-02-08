import type { MarketCard } from '../types/index.js';

export const MARKET_CARDS: MarketCard[] = [
  // ── Stock Price Changes ──
  {
    id: 'mk-1',
    title: 'ON2U Skyrockets!',
    description: 'ON2U receives FDA approval for new drug. Stock soars to $20 per share!',
    effect: {
      type: 'stockPriceChange',
      symbol: 'ON2U',
      newPrice: 20,
      description: 'ON2U stock rises to $20/share.',
    },
  },
  {
    id: 'mk-2',
    title: 'MYT4U Crashes!',
    description: 'MYT4U caught in accounting scandal. Stock drops to $0!',
    effect: {
      type: 'stockPriceChange',
      symbol: 'MYT4U',
      newPrice: 0,
      description: 'MYT4U stock drops to $0. All shares are worthless.',
    },
  },
  {
    id: 'mk-3',
    title: 'OK4U Surges',
    description: 'OK4U announces blockbuster drug. Stock jumps to $40 per share!',
    effect: {
      type: 'stockPriceChange',
      symbol: 'OK4U',
      newPrice: 40,
      description: 'OK4U stock rises to $40/share.',
    },
  },
  {
    id: 'mk-4',
    title: 'GRO4US Rises',
    description: 'GRO4US reports record quarterly earnings. Stock reaches $50 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'GRO4US',
      newPrice: 50,
      description: 'GRO4US stock rises to $50/share.',
    },
  },
  {
    id: 'mk-5',
    title: 'ON2U Bankrupt!',
    description: 'ON2U fails clinical trial and files for bankruptcy. Stock goes to $0.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'ON2U',
      newPrice: 0,
      description: 'ON2U stock drops to $0. All shares are worthless.',
    },
  },
  {
    id: 'mk-6',
    title: 'CHEAP2GT Gold Strike!',
    description: 'CHEAP2GT discovers major gold deposit. Stock jumps to $15 per share!',
    effect: {
      type: 'stockPriceChange',
      symbol: 'CHEAP2GT',
      newPrice: 15,
      description: 'CHEAP2GT stock rises to $15/share.',
    },
  },
  {
    id: 'mk-7',
    title: 'TOYRU Product Recall',
    description: 'TOYRU issues massive product recall. Stock drops to $1 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'TOYRU',
      newPrice: 1,
      description: 'TOYRU stock falls to $1/share.',
    },
  },
  {
    id: 'mk-8',
    title: 'FRYK Expansion News',
    description: 'FRYK announces international expansion plans. Stock climbs to $35 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'FRYK',
      newPrice: 35,
      description: 'FRYK stock rises to $35/share.',
    },
  },
  {
    id: 'mk-9',
    title: 'SLRP Contract Win',
    description: 'SLRP lands exclusive contract with major automaker. Stock reaches $55.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'SLRP',
      newPrice: 55,
      description: 'SLRP stock rises to $55/share.',
    },
  },
  {
    id: 'mk-10',
    title: 'TOYRU Goes Viral!',
    description: 'TOYRU product becomes viral sensation. Stock shoots to $30 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'TOYRU',
      newPrice: 30,
      description: 'TOYRU stock rises to $30/share.',
    },
  },

  // ── Real Estate Offers ──
  {
    id: 'mk-11',
    title: 'Housing Boom!',
    description: 'Hot housing market! Buyer will pay 2x the original cost for any house you own.',
    effect: {
      type: 'realEstateOffer',
      subTypes: ['house'],
      offerMultiplier: 2,
      description: 'Sell any house for 2x its original cost.',
    },
  },
  {
    id: 'mk-12',
    title: 'Condo Market Heats Up',
    description: 'Investor wants to buy condos. Offering 1.5x original cost for any condo.',
    effect: {
      type: 'realEstateOffer',
      subTypes: ['condo'],
      offerMultiplier: 1.5,
      description: 'Sell any condo for 1.5x its original cost.',
    },
  },
  {
    id: 'mk-13',
    title: 'Apartment Complex Buyer',
    description: 'REIT is buying apartment complexes. Offering 1.8x original cost.',
    effect: {
      type: 'realEstateOffer',
      subTypes: ['apartment', 'eightplex', 'fourplex'],
      offerMultiplier: 1.8,
      description: 'Sell any apartment, 8-plex, or 4-plex for 1.8x its original cost.',
    },
  },
  {
    id: 'mk-14',
    title: 'Commercial Real Estate Boom',
    description: 'Foreign investor buying commercial properties. Paying 2x original cost.',
    effect: {
      type: 'realEstateOffer',
      subTypes: ['commercial'],
      offerMultiplier: 2,
      description: 'Sell any commercial property for 2x its original cost.',
    },
  },
  {
    id: 'mk-15',
    title: 'Land Developer Offer',
    description: 'Developer wants your vacant land for a new subdivision. Offering $250,000.',
    effect: {
      type: 'realEstateOfferFlat',
      subTypes: ['land'],
      offerAmount: 250000,
      description: 'Sell any vacant land for $250,000.',
    },
  },
  {
    id: 'mk-16',
    title: 'Duplex Buyer',
    description: 'Investor looking for duplexes. Offering 1.5x original cost for any duplex.',
    effect: {
      type: 'realEstateOffer',
      subTypes: ['duplex'],
      offerMultiplier: 1.5,
      description: 'Sell any duplex for 1.5x its original cost.',
    },
  },

  // ── Property Damage ──
  {
    id: 'mk-17',
    title: 'Tornado Damage!',
    description: 'Tornado hits the area! If you own a house or duplex, pay $5,000 for repairs.',
    effect: {
      type: 'damageToProperty',
      subTypes: ['house', 'duplex'],
      cost: 5000,
      description: 'Pay $5,000 per house or duplex you own for storm repairs.',
    },
  },
  {
    id: 'mk-18',
    title: 'Roof Damage - Apartments',
    description: 'Major hailstorm! If you own an apartment building, pay $10,000 for roof repairs.',
    effect: {
      type: 'damageToProperty',
      subTypes: ['apartment', 'eightplex', 'fourplex'],
      cost: 10000,
      description: 'Pay $10,000 per apartment/multi-unit property for roof repairs.',
    },
  },

  // ── All Players Expenses ──
  {
    id: 'mk-19',
    title: 'Tax Increase',
    description: 'City passes new tax levy. All players pay $500.',
    effect: {
      type: 'allPlayersExpense',
      amount: 500,
      description: 'All players must pay $500 in additional taxes.',
    },
  },
  {
    id: 'mk-20',
    title: 'Insurance Premium Hike',
    description: 'Insurance rates go up across the board. All players pay $1,000.',
    effect: {
      type: 'allPlayersExpense',
      amount: 1000,
      description: 'All players must pay $1,000 for increased insurance premiums.',
    },
  },
  {
    id: 'mk-21',
    title: 'Utility Rate Increase',
    description: 'Electric company raises rates. All players pay $300.',
    effect: {
      type: 'allPlayersExpense',
      amount: 300,
      description: 'All players must pay $300 for higher utility bills.',
    },
  },
  {
    id: 'mk-22',
    title: 'GRO4US Dips',
    description: 'GRO4US faces supply chain issues. Stock drops to $15 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'GRO4US',
      newPrice: 15,
      description: 'GRO4US stock falls to $15/share.',
    },
  },
  {
    id: 'mk-23',
    title: 'Plumbing Emergency',
    description: 'Burst pipes! If you own any condo, pay $3,000 for plumbing repairs.',
    effect: {
      type: 'damageToProperty',
      subTypes: ['condo'],
      cost: 3000,
      description: 'Pay $3,000 per condo you own for plumbing repairs.',
    },
  },
  {
    id: 'mk-24',
    title: 'House Buyer Frenzy',
    description: 'Relocating company buying houses for employees. Offering $100,000 for any house.',
    effect: {
      type: 'realEstateOfferFlat',
      subTypes: ['house'],
      offerAmount: 100000,
      description: 'Sell any house for $100,000.',
    },
  },
  {
    id: 'mk-25',
    title: 'FRYK Health Scare',
    description: 'Health department investigation at FRYK locations. Stock drops to $5.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'FRYK',
      newPrice: 5,
      description: 'FRYK stock drops to $5/share.',
    },
  },
];
