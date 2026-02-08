// ── Rat Race Board ──

export type RatRaceSpaceType =
  | 'Deal'       // Draw small or big deal card
  | 'Market'     // Draw market card
  | 'Doodad'     // Draw doodad card
  | 'PayDay'     // Collect cash flow
  | 'Charity'    // Optional: donate 10% of income, roll 1 or 2 dice for 3 turns
  | 'Baby'       // Add a child (if < 3 children)
  | 'Downsized'  // Pay total expenses, lose 2 turns
  ;

export interface RatRaceSpace {
  index: number;
  type: RatRaceSpaceType;
  label: string;
}

// ── Fast Track Board ──

export type FastTrackSpaceType =
  | 'CashFlowDay'   // Collect fast track cash flow
  | 'BusinessDeal'  // Investment opportunity
  | 'Charity'       // Fast track charity
  | 'Tax'           // Pay taxes
  | 'Lawsuit'       // Legal expense
  | 'Divorce'       // Lose assets
  | 'Dream'         // Dream space (specific dream)
  ;

export interface FastTrackSpace {
  index: number;
  type: FastTrackSpaceType;
  label: string;
  dream?: string; // Only for Dream spaces
}

// ── Board Layout ──

export interface BoardLayout {
  ratRaceSpaces: RatRaceSpace[];
  fastTrackSpaces: FastTrackSpace[];
}
