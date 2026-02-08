import type { RatRaceSpace, FastTrackSpace, BoardLayout } from '../types/index.js';

export const RAT_RACE_SPACES: RatRaceSpace[] = [
  { index: 0, type: 'Deal', label: 'Deal' },
  { index: 1, type: 'Doodad', label: 'Doodad' },
  { index: 2, type: 'Market', label: 'Market' },
  { index: 3, type: 'Deal', label: 'Deal' },
  { index: 4, type: 'PayDay', label: 'Pay Day' },
  { index: 5, type: 'Deal', label: 'Deal' },
  { index: 6, type: 'Baby', label: 'Baby' },
  { index: 7, type: 'Deal', label: 'Deal' },
  { index: 8, type: 'Market', label: 'Market' },
  { index: 9, type: 'Deal', label: 'Deal' },
  { index: 10, type: 'PayDay', label: 'Pay Day' },
  { index: 11, type: 'Doodad', label: 'Doodad' },
  { index: 12, type: 'Deal', label: 'Deal' },
  { index: 13, type: 'Charity', label: 'Charity' },
  { index: 14, type: 'Deal', label: 'Deal' },
  { index: 15, type: 'Market', label: 'Market' },
  { index: 16, type: 'PayDay', label: 'Pay Day' },
  { index: 17, type: 'Deal', label: 'Deal' },
  { index: 18, type: 'Downsized', label: 'Downsized' },
  { index: 19, type: 'Deal', label: 'Deal' },
  { index: 20, type: 'Doodad', label: 'Doodad' },
  { index: 21, type: 'Deal', label: 'Deal' },
  { index: 22, type: 'PayDay', label: 'Pay Day' },
  { index: 23, type: 'Market', label: 'Market' },
];

export const FAST_TRACK_SPACES: FastTrackSpace[] = [
  { index: 0, type: 'CashFlowDay', label: 'Cash Flow Day' },
  { index: 1, type: 'Dream', label: 'World Travel', dream: 'World Travel' },
  { index: 2, type: 'BusinessDeal', label: 'Business Deal' },
  { index: 3, type: 'Charity', label: 'Charity' },
  { index: 4, type: 'CashFlowDay', label: 'Cash Flow Day' },
  { index: 5, type: 'Dream', label: 'Private Jet', dream: 'Private Jet' },
  { index: 6, type: 'Tax', label: 'Tax Audit' },
  { index: 7, type: 'BusinessDeal', label: 'Business Deal' },
  { index: 8, type: 'CashFlowDay', label: 'Cash Flow Day' },
  { index: 9, type: 'Dream', label: 'Amazon Rainforest Adventure', dream: 'Amazon Rainforest Adventure' },
  { index: 10, type: 'Lawsuit', label: 'Lawsuit' },
  { index: 11, type: 'BusinessDeal', label: 'Business Deal' },
  { index: 12, type: 'CashFlowDay', label: 'Cash Flow Day' },
  { index: 13, type: 'Dream', label: 'African Safari', dream: 'African Safari' },
  { index: 14, type: 'Divorce', label: 'Divorce' },
  { index: 15, type: 'BusinessDeal', label: 'Business Deal' },
  { index: 16, type: 'CashFlowDay', label: 'Cash Flow Day' },
  { index: 17, type: 'Dream', label: 'Education Foundation', dream: 'Education Foundation' },
];

export const RAT_RACE_SIZE = 24;

export const FAST_TRACK_SIZE = 18;

export const PAYDAY_POSITIONS: number[] = RAT_RACE_SPACES
  .filter((space) => space.type === 'PayDay')
  .map((space) => space.index);

export const BOARD_LAYOUT: BoardLayout = {
  ratRaceSpaces: RAT_RACE_SPACES,
  fastTrackSpaces: FAST_TRACK_SPACES,
};
