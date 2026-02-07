import { describe, it, expect } from 'vitest';
import type {
  GameState,
  PlayerId,
  CheckerState,
  Move,
} from '@mcp-tool-shop/siege-types';
import { createInitialGameState } from './game-state.js';
import { executeMove, cloneState } from './move-executor.js';
import { createDiceRoll } from './dice.js';
import { toCanonical } from './board-utils.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeState(): GameState {
  return createInitialGameState();
}

/**
 * Place a single checker on a canonical board point.
 * Returns a new state (does not mutate input).
 */
function placeChecker(
  state: GameState,
  canonical: number,
  owner: PlayerId,
  id: string,
): GameState {
  const next = cloneState(state);
  const checker: CheckerState = {
    id,
    owner,
    position: { zone: 'board', point: canonical },
    isLocked: false,
  };
  next.board[canonical - 1]!.checkers.push(checker);
  return next;
}

/**
 * Give the state active dice so executeMove can consume a value.
 */
function withDice(state: GameState, v1: number, v2: number): GameState {
  const next = cloneState(state);
  next.dice = createDiceRoll(v1, v2);
  return next;
}

// ---------------------------------------------------------------------------
// Deploy tests
// ---------------------------------------------------------------------------

describe('executeMove - deploy', () => {
  it('moves a checker from reserve to the correct board point', () => {
    let state = makeState();
    state = withDice(state, 3, 5);

    const move: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };

    const result = executeMove(state, move);

    // Checker should be on canonical point 3
    const point3 = result.board[2]!; // index = canonical - 1
    expect(point3.checkers).toHaveLength(1);
    expect(point3.checkers[0]!.id).toBe('player1-0');
    expect(point3.checkers[0]!.position).toEqual({ zone: 'board', point: 3 });
  });

  it('decreases reserve count by 1 after deploy', () => {
    let state = makeState();
    state = withDice(state, 4, 6);

    const move: Move = {
      type: 'deploy',
      checkerId: 'player1-2',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 4 },
      dieValue: 4,
    };

    const result = executeMove(state, move);
    expect(result.reserves.player1).toHaveLength(14);
    expect(result.reserves.player1.find(c => c.id === 'player1-2')).toBeUndefined();
  });

  it('handles deploy with hit: opponent blot returns to reserve', () => {
    let state = makeState();
    // Place a player2 blot on canonical point 3
    state = placeChecker(state, 3, 'player2', 'player2-7');
    // Remove one checker from player2 reserves so counts make sense
    state.reserves.player2 = state.reserves.player2.filter(c => c.id !== 'player2-7');
    state = withDice(state, 3, 5);

    const move: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
      hits: 'player2-7',
    };

    const result = executeMove(state, move);

    // Player1's checker should be on point 3
    const point3 = result.board[2]!;
    expect(point3.checkers).toHaveLength(1);
    expect(point3.checkers[0]!.id).toBe('player1-0');

    // Hit checker should be back in player2's reserves
    const hitChecker = result.reserves.player2.find(c => c.id === 'player2-7');
    expect(hitChecker).toBeDefined();
    expect(hitChecker!.position).toEqual({ zone: 'reserve' });
  });

  it('deploys for player2 correctly (perspective mirroring)', () => {
    let state = makeState();
    state.currentPlayer = 'player2';
    state = withDice(state, 2, 4);

    const move: Move = {
      type: 'deploy',
      checkerId: 'player2-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: toCanonical(2, 'player2') }, // canonical 23
      dieValue: 2,
    };

    const result = executeMove(state, move);

    // Player 2 perspective 2 = canonical 23
    const point23 = result.board[22]!;
    expect(point23.checkers).toHaveLength(1);
    expect(point23.checkers[0]!.id).toBe('player2-0');
    expect(point23.checkers[0]!.position).toEqual({ zone: 'board', point: 23 });
  });
});

// ---------------------------------------------------------------------------
// Advance tests
// ---------------------------------------------------------------------------

describe('executeMove - advance', () => {
  it('moves a checker from one board point to another', () => {
    let state = makeState();
    state = placeChecker(state, 5, 'player1', 'player1-0');
    state.reserves.player1 = state.reserves.player1.filter(c => c.id !== 'player1-0');
    state = withDice(state, 3, 6);

    const move: Move = {
      type: 'advance',
      checkerId: 'player1-0',
      from: { zone: 'board', point: 5 },
      to: { zone: 'board', point: 8 },
      dieValue: 3,
    };

    const result = executeMove(state, move);

    // Source point should be empty
    expect(result.board[4]!.checkers).toHaveLength(0);
    // Target point should have the checker
    expect(result.board[7]!.checkers).toHaveLength(1);
    expect(result.board[7]!.checkers[0]!.id).toBe('player1-0');
  });

  it('locks checker when advancing to siege zone (exact)', () => {
    let state = makeState();
    // Player 1 checker at canonical 16 (perspective 16), advance by 3 => perspective 19 => lock
    state = placeChecker(state, 16, 'player1', 'player1-0');
    state.reserves.player1 = state.reserves.player1.filter(c => c.id !== 'player1-0');
    state = withDice(state, 3, 5);

    const move: Move = {
      type: 'advance',
      checkerId: 'player1-0',
      from: { zone: 'board', point: 16 },
      to: { zone: 'locked' },
      dieValue: 3,
    };

    const result = executeMove(state, move);

    // Checker removed from board
    expect(result.board[15]!.checkers).toHaveLength(0);
    // Checker in locked array
    expect(result.locked.player1).toHaveLength(1);
    expect(result.locked.player1[0]!.id).toBe('player1-0');
    expect(result.locked.player1[0]!.isLocked).toBe(true);
    expect(result.locked.player1[0]!.position).toEqual({ zone: 'locked' });
  });

  it('locks checker when advancing overshoots siege zone', () => {
    let state = makeState();
    // Player 1 checker at canonical 18 (perspective 18), advance by 6 => perspective 24 => lock
    // Actually perspective 24 is exactly the last point, let's do overshoot:
    // canonical 17, perspective 17, advance by 6 => perspective 23 => lock (exact, in siege zone)
    // Let's use: canonical 20 (perspective 20), advance by 6 => perspective 26 => overshoot => lock
    state = placeChecker(state, 20, 'player1', 'player1-0');
    state.reserves.player1 = state.reserves.player1.filter(c => c.id !== 'player1-0');
    state = withDice(state, 6, 3);

    const move: Move = {
      type: 'advance',
      checkerId: 'player1-0',
      from: { zone: 'board', point: 20 },
      to: { zone: 'locked' },
      dieValue: 6,
    };

    const result = executeMove(state, move);

    // Checker removed from board
    expect(result.board[19]!.checkers).toHaveLength(0);
    // Checker in locked array
    expect(result.locked.player1).toHaveLength(1);
    expect(result.locked.player1[0]!.id).toBe('player1-0');
    expect(result.locked.player1[0]!.isLocked).toBe(true);
    expect(result.locked.player1[0]!.position).toEqual({ zone: 'locked' });
  });

  it('handles hit during advance', () => {
    let state = makeState();
    // Player 1 checker at canonical 5, advance by 4 => canonical 9
    // Player 2 blot at canonical 9
    state = placeChecker(state, 5, 'player1', 'player1-0');
    state.reserves.player1 = state.reserves.player1.filter(c => c.id !== 'player1-0');
    state = placeChecker(state, 9, 'player2', 'player2-3');
    state.reserves.player2 = state.reserves.player2.filter(c => c.id !== 'player2-3');
    state = withDice(state, 4, 2);

    const move: Move = {
      type: 'advance',
      checkerId: 'player1-0',
      from: { zone: 'board', point: 5 },
      to: { zone: 'board', point: 9 },
      dieValue: 4,
      hits: 'player2-3',
    };

    const result = executeMove(state, move);

    // Player1 checker on point 9
    expect(result.board[8]!.checkers).toHaveLength(1);
    expect(result.board[8]!.checkers[0]!.id).toBe('player1-0');

    // Player2's hit checker sent to reserves
    const hitChecker = result.reserves.player2.find(c => c.id === 'player2-3');
    expect(hitChecker).toBeDefined();
    expect(hitChecker!.position).toEqual({ zone: 'reserve' });
  });

  it('locks player2 checker correctly (descending canonical)', () => {
    let state = makeState();
    state.currentPlayer = 'player2';
    // Player 2 at canonical 8 (perspective = 25 - 8 = 17), advance by 3 => perspective 20 => lock
    state = placeChecker(state, 8, 'player2', 'player2-0');
    state.reserves.player2 = state.reserves.player2.filter(c => c.id !== 'player2-0');
    state = withDice(state, 3, 5);

    const move: Move = {
      type: 'advance',
      checkerId: 'player2-0',
      from: { zone: 'board', point: 8 },
      to: { zone: 'locked' },
      dieValue: 3,
    };

    const result = executeMove(state, move);

    // Checker locked
    expect(result.locked.player2).toHaveLength(1);
    expect(result.locked.player2[0]!.id).toBe('player2-0');
    expect(result.locked.player2[0]!.isLocked).toBe(true);
    // Removed from board
    expect(result.board[7]!.checkers).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Dice update tests
// ---------------------------------------------------------------------------

describe('executeMove - dice update', () => {
  it('increments movesUsed and tracks usedValues after a move', () => {
    let state = makeState();
    state = withDice(state, 3, 5);

    const move: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };

    const result = executeMove(state, move);

    expect(result.dice!.movesUsed).toBe(1);
    expect(result.dice!.usedValues).toEqual([3]);
  });

  it('tracks multiple die uses across sequential moves', () => {
    let state = makeState();
    state = withDice(state, 3, 5);

    const move1: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };

    const after1 = executeMove(state, move1);

    const move2: Move = {
      type: 'deploy',
      checkerId: 'player1-1',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 5 },
      dieValue: 5,
    };

    const after2 = executeMove(after1, move2);

    expect(after2.dice!.movesUsed).toBe(2);
    expect(after2.dice!.usedValues).toEqual([3, 5]);
  });
});

// ---------------------------------------------------------------------------
// Immutability tests
// ---------------------------------------------------------------------------

describe('executeMove - immutability', () => {
  it('does not mutate the original state', () => {
    let state = makeState();
    state = withDice(state, 3, 5);

    // Snapshot original values
    const originalReserveCount = state.reserves.player1.length;
    const originalBoard2Len = state.board[2]!.checkers.length;
    const originalDiceMovesUsed = state.dice!.movesUsed;

    const move: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };

    executeMove(state, move);

    // Original state should be unchanged
    expect(state.reserves.player1.length).toBe(originalReserveCount);
    expect(state.board[2]!.checkers.length).toBe(originalBoard2Len);
    expect(state.dice!.movesUsed).toBe(originalDiceMovesUsed);
  });
});

// ---------------------------------------------------------------------------
// cloneState tests
// ---------------------------------------------------------------------------

describe('cloneState', () => {
  it('produces an independent deep copy', () => {
    let state = makeState();
    state = withDice(state, 4, 2);
    state = placeChecker(state, 10, 'player1', 'test-checker');

    const cloned = cloneState(state);

    // Structural equality
    expect(cloned.board.length).toBe(state.board.length);
    expect(cloned.reserves.player1.length).toBe(state.reserves.player1.length);
    expect(cloned.dice!.values).toEqual(state.dice!.values);

    // Referential independence
    expect(cloned).not.toBe(state);
    expect(cloned.board).not.toBe(state.board);
    expect(cloned.board[9]).not.toBe(state.board[9]);
    expect(cloned.board[9]!.checkers).not.toBe(state.board[9]!.checkers);
    expect(cloned.reserves.player1).not.toBe(state.reserves.player1);
    expect(cloned.dice).not.toBe(state.dice);

    // Mutating clone does not affect original
    cloned.board[9]!.checkers.pop();
    expect(state.board[9]!.checkers).toHaveLength(1);
    expect(cloned.board[9]!.checkers).toHaveLength(0);
  });

  it('clones locked checkers independently', () => {
    let state = makeState();
    const lockedChecker: CheckerState = {
      id: 'player1-0',
      owner: 'player1',
      position: { zone: 'locked' },
      isLocked: true,
    };
    state.locked.player1.push(lockedChecker);

    const cloned = cloneState(state);
    expect(cloned.locked.player1).toHaveLength(1);
    expect(cloned.locked.player1[0]!).not.toBe(state.locked.player1[0]!);
    expect(cloned.locked.player1[0]!).toEqual(state.locked.player1[0]!);
  });

  it('handles null dice', () => {
    const state = makeState();
    expect(state.dice).toBeNull();

    const cloned = cloneState(state);
    expect(cloned.dice).toBeNull();
  });
});
