import { describe, it, expect } from 'vitest';
import type {
  GameState,
  PlayerId,
} from '@mcp-tool-shop/siege-types';
import { createInitialGameState } from './game-state.js';
import { cloneState } from './move-executor.js';
import {
  checkWinCondition,
  determineWinType,
  calculateScore,
} from './win-checker.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeState(): GameState {
  return createInitialGameState();
}

/**
 * Lock N checkers for a player (moves them from reserves to locked).
 */
function lockCheckers(state: GameState, player: PlayerId, count: number): GameState {
  const next = cloneState(state);
  for (let i = 0; i < count; i++) {
    if (next.reserves[player].length > 0) {
      const checker = next.reserves[player].shift()!;
      checker.position = { zone: 'locked' };
      checker.isLocked = true;
      next.locked[player].push(checker);
    }
  }
  return next;
}

/**
 * Move N checkers from reserves to board for a player (deploy without game logic).
 */
function deployCheckers(
  state: GameState,
  player: PlayerId,
  count: number,
  startCanonical: number,
): GameState {
  const next = cloneState(state);
  for (let i = 0; i < count; i++) {
    if (next.reserves[player].length > 0) {
      const checker = next.reserves[player].shift()!;
      const point = startCanonical + i;
      checker.position = { zone: 'board', point };
      next.board[point - 1]!.checkers.push(checker);
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// checkWinCondition tests
// ---------------------------------------------------------------------------

describe('checkWinCondition', () => {
  it('returns null when no player has 15 locked checkers', () => {
    const state = makeState();
    expect(checkWinCondition(state)).toBeNull();
  });

  it('returns null when a player has some but not all checkers locked', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 10);
    expect(checkWinCondition(state)).toBeNull();
  });

  it('detects winner when player1 has 15 locked checkers', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 15);

    const result = checkWinCondition(state);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe('player1');
  });

  it('detects winner when player2 has 15 locked checkers', () => {
    let state = makeState();
    state = lockCheckers(state, 'player2', 15);

    const result = checkWinCondition(state);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe('player2');
  });

  it('returns correct score with default cube value', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 15);
    // Opponent has all in reserve => total-siege => 3 * 1 = 3
    const result = checkWinCondition(state);
    expect(result!.score).toBe(3);
  });

  it('returns correct score with elevated cube value', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 15);
    state.doublingCube.value = 4;
    // total-siege * 4 = 3 * 4 = 12
    const result = checkWinCondition(state);
    expect(result!.score).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// determineWinType tests
// ---------------------------------------------------------------------------

describe('determineWinType', () => {
  it('returns "standard" when opponent has at least one locked checker', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 15);
    state = lockCheckers(state, 'player2', 1);

    expect(determineWinType(state, 'player1')).toBe('standard');
  });

  it('returns "standard" when opponent has many locked checkers', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 15);
    state = lockCheckers(state, 'player2', 10);

    expect(determineWinType(state, 'player1')).toBe('standard');
  });

  it('returns "siege" when opponent has 0 locked and 0 reserves (all on board)', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 15);
    // Deploy all of player2's checkers to the board (0 locked, 0 reserves)
    state = deployCheckers(state, 'player2', 15, 10);

    expect(determineWinType(state, 'player1')).toBe('siege');
    // Verify opponent state
    expect(state.locked.player2).toHaveLength(0);
    expect(state.reserves.player2).toHaveLength(0);
  });

  it('returns "total-siege" when opponent has 0 locked and reserves > 0', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 15);
    // Player2 has all 15 in reserve (initial state) => total-siege

    expect(determineWinType(state, 'player1')).toBe('total-siege');
    expect(state.locked.player2).toHaveLength(0);
    expect(state.reserves.player2.length).toBeGreaterThan(0);
  });

  it('returns "total-siege" when opponent has some on board and some in reserve', () => {
    let state = makeState();
    state = lockCheckers(state, 'player1', 15);
    // Deploy 5 of player2's checkers, leaving 10 in reserve
    state = deployCheckers(state, 'player2', 5, 10);

    expect(determineWinType(state, 'player1')).toBe('total-siege');
    expect(state.locked.player2).toHaveLength(0);
    expect(state.reserves.player2).toHaveLength(10);
  });

  it('works correctly for player2 as winner', () => {
    let state = makeState();
    state = lockCheckers(state, 'player2', 15);
    // Player1 has 0 locked, all in reserve => total-siege

    expect(determineWinType(state, 'player2')).toBe('total-siege');
  });

  it('returns "standard" for player2 winner when player1 has locked', () => {
    let state = makeState();
    state = lockCheckers(state, 'player2', 15);
    state = lockCheckers(state, 'player1', 3);

    expect(determineWinType(state, 'player2')).toBe('standard');
  });
});

// ---------------------------------------------------------------------------
// calculateScore tests
// ---------------------------------------------------------------------------

describe('calculateScore', () => {
  it('standard win with cube = 1 scores 1', () => {
    expect(calculateScore('standard', 1)).toBe(1);
  });

  it('siege win with cube = 1 scores 2', () => {
    expect(calculateScore('siege', 1)).toBe(2);
  });

  it('total-siege win with cube = 1 scores 3', () => {
    expect(calculateScore('total-siege', 1)).toBe(3);
  });

  it('standard win with cube = 2 scores 2', () => {
    expect(calculateScore('standard', 2)).toBe(2);
  });

  it('siege win with cube = 4 scores 8', () => {
    expect(calculateScore('siege', 4)).toBe(8);
  });

  it('total-siege with cube = 8 scores 24', () => {
    expect(calculateScore('total-siege', 8)).toBe(24);
  });

  it('total-siege with cube = 64 scores 192', () => {
    expect(calculateScore('total-siege', 64)).toBe(192);
  });

  it('standard with cube = 32 scores 32', () => {
    expect(calculateScore('standard', 32)).toBe(32);
  });
});
