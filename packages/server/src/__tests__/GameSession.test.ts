import { describe, it, expect, beforeEach } from 'vitest';
import { GameSession } from '../game/GameSession.js';
import type { RoomPlayer } from '../storage/InMemoryStore.js';
import type { GameState } from '@cashflow/shared';

const players: RoomPlayer[] = [
  { id: 'p1', name: 'Alice', socketId: 's1', isReady: true },
  { id: 'p2', name: 'Bob', socketId: 's2', isReady: true },
];

describe('GameSession', () => {
  let session: GameSession;

  beforeEach(() => {
    session = new GameSession(players);
  });

  // ── Construction ──

  describe('constructor', () => {
    it('assigns professions to players', () => {
      const state = session.getState();
      expect(state.players).toHaveLength(2);
      // Each player should have a profession (income/expenses)
      for (const p of state.players) {
        expect(p.profession).toBeDefined();
        expect(p.financialStatement.income.salary).toBeGreaterThan(0);
      }
    });

    it('creates a valid initial game state', () => {
      const state = session.getState();
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.turnPhase).toBeDefined();
      expect(state.decks).toBeDefined();
      expect(state.decks.smallDealDeck.length).toBeGreaterThan(0);
      expect(state.decks.bigDealDeck.length).toBeGreaterThan(0);
      expect(state.decks.marketDeck.length).toBeGreaterThan(0);
      expect(state.decks.doodadDeck.length).toBeGreaterThan(0);
    });
  });

  // ── getSanitizedState ──

  describe('getSanitizedState', () => {
    it('replaces deck contents with null arrays of same length', () => {
      const raw = session.getState();
      const sanitized = session.getSanitizedState();

      // Lengths preserved
      expect(sanitized.decks.smallDealDeck).toHaveLength(raw.decks.smallDealDeck.length);
      expect(sanitized.decks.bigDealDeck).toHaveLength(raw.decks.bigDealDeck.length);
      expect(sanitized.decks.marketDeck).toHaveLength(raw.decks.marketDeck.length);
      expect(sanitized.decks.doodadDeck).toHaveLength(raw.decks.doodadDeck.length);

      // Contents are null
      for (const card of sanitized.decks.smallDealDeck) {
        expect(card).toBeNull();
      }
      for (const card of sanitized.decks.bigDealDeck) {
        expect(card).toBeNull();
      }
      for (const card of sanitized.decks.marketDeck) {
        expect(card).toBeNull();
      }
      for (const card of sanitized.decks.doodadDeck) {
        expect(card).toBeNull();
      }
    });

    it('clears discard piles', () => {
      const sanitized = session.getSanitizedState();
      expect(sanitized.decks.smallDealDiscard).toEqual([]);
      expect(sanitized.decks.bigDealDiscard).toEqual([]);
      expect(sanitized.decks.marketDiscard).toEqual([]);
      expect(sanitized.decks.doodadDiscard).toEqual([]);
    });

    it('preserves non-deck game state', () => {
      const raw = session.getState();
      const sanitized = session.getSanitizedState();

      expect(sanitized.players).toEqual(raw.players);
      expect(sanitized.currentPlayerIndex).toBe(raw.currentPlayerIndex);
      expect(sanitized.turnPhase).toBe(raw.turnPhase);
      expect(sanitized.log).toEqual(raw.log);
    });
  });

  // ── processAction ──

  describe('processAction', () => {
    it('processes a valid ROLL_DICE action successfully', () => {
      const state = session.getState();
      const currentPlayer = state.players[state.currentPlayerIndex];

      const result = session.processAction({
        type: 'ROLL_DICE',
        playerId: currentPlayer.id,
        diceValues: [3, 4] as [number, number],
        useBothDice: true,
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns failure for invalid action', () => {
      // Trying to END_TURN when it's not time to end turn
      const state = session.getState();
      const result = session.processAction({
        type: 'END_TURN',
        playerId: state.players[state.currentPlayerIndex].id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid action');
    });

    it('updates internal state on successful action', () => {
      const stateBefore = session.getState();
      const currentPlayer = stateBefore.players[stateBefore.currentPlayerIndex];

      session.processAction({
        type: 'ROLL_DICE',
        playerId: currentPlayer.id,
        diceValues: [1, 1] as [number, number],
        useBothDice: true,
      });

      const stateAfter = session.getState();
      // State should have changed (at minimum, turnPhase or position)
      expect(stateAfter).not.toEqual(stateBefore);
    });
  });

  // ── rollDice ──

  describe('rollDice', () => {
    it('returns a tuple of two numbers in [1, 6]', () => {
      const [d1, d2] = session.rollDice();
      expect(d1).toBeGreaterThanOrEqual(1);
      expect(d1).toBeLessThanOrEqual(6);
      expect(d2).toBeGreaterThanOrEqual(1);
      expect(d2).toBeLessThanOrEqual(6);
    });

    it('produces varied results over multiple calls', () => {
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const [d1, d2] = session.rollDice();
        results.add(`${d1},${d2}`);
      }
      // With 100 rolls, we should see more than 1 unique pair
      expect(results.size).toBeGreaterThan(1);
    });
  });

  // ── getValidActions ──

  describe('getValidActions', () => {
    it('returns an array of action types', () => {
      const actions = session.getValidActions();
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      // Initial state should allow ROLL_DICE
      expect(actions).toContain('ROLL_DICE');
    });
  });
});
