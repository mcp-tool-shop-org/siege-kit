import { describe, it, expect } from 'vitest';
import type { CheckerState } from '@mcp-tool-shop/siege-types';
import { createInitialGameState } from './game-state.js';
import {
  startGame,
  rollPhase,
  rollPhaseDeterministic,
  endTurn,
  switchPlayer,
} from './turn-manager.js';

// ── startGame ──────────────────────────────────────────────────────

describe('startGame', () => {
  it('sets gamePhase to playing', () => {
    const state = createInitialGameState();
    const next = startGame(state, [5, 3]);
    expect(next.gamePhase).toBe('playing');
  });

  it('higher roller goes first (player1 rolls higher)', () => {
    const state = createInitialGameState();
    const next = startGame(state, [6, 2]);
    expect(next.currentPlayer).toBe('player1');
  });

  it('higher roller goes first (player2 rolls higher)', () => {
    const state = createInitialGameState();
    const next = startGame(state, [2, 6]);
    expect(next.currentPlayer).toBe('player2');
  });

  it('creates dice from the opening roll values', () => {
    const state = createInitialGameState();
    const next = startGame(state, [4, 2]);
    expect(next.dice).not.toBeNull();
    expect(next.dice!.values).toEqual([4, 2]);
    expect(next.dice!.isDoubles).toBe(false);
    expect(next.dice!.movesAvailable).toBe(2);
    expect(next.dice!.movesUsed).toBe(0);
  });

  it('sets turnPhase to moving', () => {
    const state = createInitialGameState();
    const next = startGame(state, [5, 3]);
    expect(next.turnPhase).toBe('moving');
  });

  it('does not mutate original state', () => {
    const state = createInitialGameState();
    startGame(state, [5, 3]);
    expect(state.gamePhase).toBe('setup');
    expect(state.dice).toBeNull();
  });
});

// ── rollPhase ──────────────────────────────────────────────────────

describe('rollPhase', () => {
  it('generates dice and sets turnPhase to moving', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.turnPhase = 'pre-roll';

    const next = rollPhase(state);
    expect(next.dice).not.toBeNull();
    expect(next.dice!.values[0]).toBeGreaterThanOrEqual(1);
    expect(next.dice!.values[0]).toBeLessThanOrEqual(6);
    expect(next.dice!.values[1]).toBeGreaterThanOrEqual(1);
    expect(next.dice!.values[1]).toBeLessThanOrEqual(6);
    expect(next.turnPhase).toBe('moving');
  });

  it('does not mutate original state', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.turnPhase = 'pre-roll';
    rollPhase(state);
    expect(state.dice).toBeNull();
    expect(state.turnPhase).toBe('pre-roll');
  });
});

// ── rollPhaseDeterministic ─────────────────────────────────────────

describe('rollPhaseDeterministic', () => {
  it('uses the provided values', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.turnPhase = 'pre-roll';

    const next = rollPhaseDeterministic(state, [3, 5]);
    expect(next.dice!.values).toEqual([3, 5]);
    expect(next.dice!.isDoubles).toBe(false);
    expect(next.dice!.movesAvailable).toBe(2);
    expect(next.turnPhase).toBe('moving');
  });

  it('correctly identifies doubles', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.turnPhase = 'pre-roll';

    const next = rollPhaseDeterministic(state, [4, 4]);
    expect(next.dice!.isDoubles).toBe(true);
    expect(next.dice!.movesAvailable).toBe(4);
  });
});

// ── endTurn ────────────────────────────────────────────────────────

describe('endTurn', () => {
  it('switches current player when no winner', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.currentPlayer = 'player1';
    state.turnPhase = 'moving';

    const next = endTurn(state);
    expect(next.currentPlayer).toBe('player2');
  });

  it('resets turnPhase to pre-roll', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.turnPhase = 'moving';

    const next = endTurn(state);
    expect(next.turnPhase).toBe('pre-roll');
  });

  it('clears dice', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.turnPhase = 'moving';
    state.dice = {
      values: [3, 5],
      isDoubles: false,
      movesAvailable: 2,
      movesUsed: 2,
      usedValues: [3, 5],
    };

    const next = endTurn(state);
    expect(next.dice).toBeNull();
  });

  it('detects winner when a player has 15 locked checkers', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.currentPlayer = 'player1';

    // Move all player1 checkers from reserve to locked
    const lockedCheckers: CheckerState[] = state.reserves.player1.map((c) => ({
      ...c,
      position: { zone: 'locked' as const },
      isLocked: true,
    }));
    state.locked.player1 = lockedCheckers;
    state.reserves.player1 = [];

    const next = endTurn(state);
    expect(next.gamePhase).toBe('finished');
    expect(next.winner).toBe('player1');
    expect(next.winType).not.toBeNull();
  });

  it('does not mutate original state', () => {
    const state = createInitialGameState();
    state.gamePhase = 'playing';
    state.currentPlayer = 'player1';
    endTurn(state);
    expect(state.currentPlayer).toBe('player1');
    expect(state.turnPhase).toBe('pre-roll');
  });
});

// ── switchPlayer ───────────────────────────────────────────────────

describe('switchPlayer', () => {
  it('alternates from player1 to player2', () => {
    const state = createInitialGameState();
    state.currentPlayer = 'player1';
    const next = switchPlayer(state);
    expect(next.currentPlayer).toBe('player2');
  });

  it('alternates from player2 to player1', () => {
    const state = createInitialGameState();
    state.currentPlayer = 'player2';
    const next = switchPlayer(state);
    expect(next.currentPlayer).toBe('player1');
  });

  it('does not mutate original state', () => {
    const state = createInitialGameState();
    state.currentPlayer = 'player1';
    switchPlayer(state);
    expect(state.currentPlayer).toBe('player1');
  });
});
