import type { MarketCard } from '../types/index.js';

export const MARKET_CARDS: MarketCard[] = [
  // ── Stock Price Changes ──
  // Real game has only 4 stocks: ON2U, MYT4U, OK4U, GRO4US
  {
    id: 'mk-1',
    title: 'ON2U Skyrockets!',
    description: 'ON2U receives major distribution deal. Stock soars to $40 per share!',
    effect: {
      type: 'stockPriceChange',
      symbol: 'ON2U',
      newPrice: 40,
      description: 'ON2U stock rises to $40/share.',
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
    description: 'GRO4US reports record quarterly earnings. Fund reaches $30 per unit.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'GRO4US',
      newPrice: 30,
      description: 'GRO4US fund rises to $30/unit.',
    },
  },
  {
    id: 'mk-5',
    title: 'ON2U Bankrupt!',
    description: 'ON2U fails to secure funding and files for bankruptcy. Stock goes to $0.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'ON2U',
      newPrice: 0,
      description: 'ON2U stock drops to $0. All shares are worthless.',
    },
  },
  {
    id: 'mk-6',
    title: 'MYT4U New Product!',
    description: 'MYT4U releases revolutionary new product. Stock shoots to $30 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'MYT4U',
      newPrice: 30,
      description: 'MYT4U stock rises to $30/share.',
    },
  },
  {
    id: 'mk-7',
    title: 'OK4U Recall',
    description: 'OK4U issues drug recall. Stock drops to $5 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'OK4U',
      newPrice: 5,
      description: 'OK4U stock falls to $5/share.',
    },
  },
  {
    id: 'mk-8',
    title: 'GRO4US Expansion',
    description: 'GRO4US fund announces international expansion. Fund climbs to $20 per unit.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'GRO4US',
      newPrice: 20,
      description: 'GRO4US fund rises to $20/unit.',
    },
  },
  {
    id: 'mk-9',
    title: 'ON2U Moderate Growth',
    description: 'ON2U signs a modest deal. Stock reaches $20 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'ON2U',
      newPrice: 20,
      description: 'ON2U stock rises to $20/share.',
    },
  },
  {
    id: 'mk-10',
    title: 'MYT4U Dips',
    description: 'MYT4U faces supply chain issues. Stock drops to $5 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'MYT4U',
      newPrice: 5,
      description: 'MYT4U stock falls to $5/share.',
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
    title: 'Apartment Complex Buyer',
    description: 'REIT is buying apartment complexes. Offering 1.5x original cost.',
    effect: {
      type: 'realEstateOffer',
      subTypes: ['apartment', 'eightplex', 'fourplex'],
      offerMultiplier: 1.5,
      description: 'Sell any apartment, 8-plex, or 4-plex for 1.5x its original cost.',
    },
  },
  {
    id: 'mk-13',
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
    id: 'mk-14',
    title: 'House Buyer',
    description: 'Relocating company buying houses for employees. Offering $65,000 for any house.',
    effect: {
      type: 'realEstateOfferFlat',
      subTypes: ['house'],
      offerAmount: 65000,
      description: 'Sell any house for $65,000.',
    },
  },
  {
    id: 'mk-15',
    title: 'Duplex Buyer',
    description: 'Investor looking for duplexes. Offering 1.5x original cost.',
    effect: {
      type: 'realEstateOffer',
      subTypes: ['duplex'],
      offerMultiplier: 1.5,
      description: 'Sell any duplex for 1.5x its original cost.',
    },
  },
  {
    id: 'mk-16',
    title: 'Plex Buyer - Premium',
    description: 'Real estate investor paying top dollar for apartment buildings.',
    effect: {
      type: 'realEstateOffer',
      subTypes: ['apartment', 'eightplex', 'fourplex'],
      offerMultiplier: 1.8,
      description: 'Sell any apartment or plex for 1.8x its original cost.',
    },
  },
  {
    id: 'mk-17',
    title: 'House Buyer Frenzy',
    description: 'Bidding war in the housing market! Offering $100,000 for any house.',
    effect: {
      type: 'realEstateOfferFlat',
      subTypes: ['house'],
      offerAmount: 100000,
      description: 'Sell any house for $100,000.',
    },
  },

  // ── Property Damage ──
  {
    id: 'mk-18',
    title: 'Sewer Line Breaks!',
    description: 'Sewer line breaks! If you own rental property, pay $2,000 for repairs.',
    effect: {
      type: 'damageToProperty',
      subTypes: ['house', 'duplex'],
      cost: 2000,
      description: 'Pay $2,000 per house or duplex you own for sewer repairs.',
    },
  },
  {
    id: 'mk-19',
    title: 'Tenant Damages Property',
    description: 'Tenant moved out and trashed the place. Pay $500 for cleanup and repairs.',
    effect: {
      type: 'damageToProperty',
      subTypes: ['house', 'duplex'],
      cost: 500,
      description: 'Pay $500 per house or duplex you own for tenant damage.',
    },
  },
  {
    id: 'mk-20',
    title: 'Roof Damage - Apartments',
    description: 'Major hailstorm! If you own multi-unit property, pay $5,000 for roof repairs.',
    effect: {
      type: 'damageToProperty',
      subTypes: ['apartment', 'eightplex', 'fourplex'],
      cost: 5000,
      description: 'Pay $5,000 per apartment/multi-unit property for roof repairs.',
    },
  },
  {
    id: 'mk-21',
    title: 'Tenant Damages Rental',
    description: 'Another tenant caused damage. Pay $1,000 for repairs per property.',
    effect: {
      type: 'damageToProperty',
      subTypes: ['house', 'duplex'],
      cost: 1000,
      description: 'Pay $1,000 per house or duplex you own for repairs.',
    },
  },

  // ── All Players Expenses ──
  {
    id: 'mk-22',
    title: 'Tax Increase',
    description: 'City passes new tax levy. All players pay $500.',
    effect: {
      type: 'allPlayersExpense',
      amount: 500,
      description: 'All players must pay $500 in additional taxes.',
    },
  },
  {
    id: 'mk-23',
    title: 'GRO4US Dips',
    description: 'GRO4US faces market downturn. Fund drops to $10 per unit.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'GRO4US',
      newPrice: 10,
      description: 'GRO4US fund falls to $10/unit.',
    },
  },
  {
    id: 'mk-24',
    title: 'OK4U Steady Rise',
    description: 'OK4U has a strong quarter. Stock reaches $20 per share.',
    effect: {
      type: 'stockPriceChange',
      symbol: 'OK4U',
      newPrice: 20,
      description: 'OK4U stock rises to $20/share.',
    },
  },
  {
    id: 'mk-25',
    title: 'House Price Surge',
    description: 'Housing market heats up. Buyer offering $135,000 for any 3Br/2Ba house.',
    effect: {
      type: 'realEstateOfferFlat',
      subTypes: ['house'],
      offerAmount: 135000,
      description: 'Sell any house for $135,000.',
    },
  },
];
