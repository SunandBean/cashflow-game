import type { GameState, GameAction, ProfessionCard } from '@cashflow/shared';
import { createGame, processAction, getValidActions, PROFESSIONS } from '@cashflow/shared';
import type { RoomPlayer } from '../storage/InMemoryStore.js';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class GameSession {
  private state: GameState;

  constructor(players: RoomPlayer[]) {
    // Randomly assign professions to players
    const shuffledProfessions = shuffle([...PROFESSIONS]);
    const assignedProfessions: ProfessionCard[] = players.map(
      (_, i) => shuffledProfessions[i % shuffledProfessions.length],
    );

    const playerInfos = players.map((p) => ({ id: p.id, name: p.name }));
    this.state = createGame(playerInfos, assignedProfessions);
  }

  getState(): GameState {
    return this.state;
  }

  getSanitizedState(): GameState {
    return {
      ...this.state,
      decks: {
        // Preserve lengths by creating arrays of matching size with empty placeholders,
        // but for type safety we cast. Clients only need to know deck sizes.
        smallDealDeck: new Array(this.state.decks.smallDealDeck.length).fill(null) as GameState['decks']['smallDealDeck'],
        bigDealDeck: new Array(this.state.decks.bigDealDeck.length).fill(null) as GameState['decks']['bigDealDeck'],
        marketDeck: new Array(this.state.decks.marketDeck.length).fill(null) as GameState['decks']['marketDeck'],
        doodadDeck: new Array(this.state.decks.doodadDeck.length).fill(null) as GameState['decks']['doodadDeck'],
        smallDealDiscard: [],
        bigDealDiscard: [],
        marketDiscard: [],
        doodadDiscard: [],
      },
    };
  }

  processAction(action: GameAction): { success: boolean; state: GameState; error?: string } {
    const previousState = this.state;
    const newState = processAction(this.state, action);

    // Check if the state actually changed (if it didn't, the action was invalid)
    // The engine adds a log entry with "Invalid action:" when validation fails
    const lastLog = newState.log[newState.log.length - 1];
    if (
      lastLog &&
      lastLog.message.startsWith('Invalid action:') &&
      newState.log.length > previousState.log.length
    ) {
      return {
        success: false,
        state: newState,
        error: lastLog.message,
      };
    }

    this.state = newState;
    return { success: true, state: newState };
  }

  getValidActions(): GameAction['type'][] {
    return getValidActions(this.state);
  }

  rollDice(): [number, number] {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    return [die1, die2];
  }
}
