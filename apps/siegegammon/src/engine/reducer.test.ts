import { describe, it, expect } from 'vitest';
import type { GameState, Move, CheckerState } from '@mcp-tool-shop/siege-types';
import { createInitialGameState } from './game-state.js';
import { gameReducer } from './reducer.js';
import { createDiceRoll } from './dice.js';
import { cloneState } from './move-executor.js';
import { toCanonical } from './board-utils.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Returns a game state patched to 'playing' / 'pre-roll' phase.
 */
function playingState(): GameState {
  const state = createInitialGameState();
  state.gamePhase = 'playing';
  state.turnPhase = 'pre-roll';
  state.currentPlayer = 'player1';
  return state;
}

/**
 * Returns a playing state with dice set (turnPhase = 'moving').
 */
function movingState(v1: number, v2: number): GameState {
  const state = playingState();
  state.dice = createDiceRoll(v1, v2);
  state.turnPhase = 'moving';
  return state;
}

/**
 * Place a checker on a canonical board point, removing it from reserves.
 */
function placeChecker(
  state: GameState,
  canonical: number,
  owner: 'player1' | 'player2',
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
  next.reserves[owner] = next.reserves[owner].filter(c => c.id !== id);
  return next;
}

// ── reset ────────────────────────────────────────────────────────────

describe('gameReducer - reset', () => {
  it('returns initial game state', () => {
    const state = playingState();
    const result = gameReducer(state, { type: 'reset' });
    expect(result.gamePhase).toBe('setup');
    expect(result.currentPlayer).toBe('player1');
    expect(result.dice).toBeNull();
    expect(result.reserves.player1).toHaveLength(15);
    expect(result.reserves.player2).toHaveLength(15);
  });

  it('works from any state (finished game)', () => {
    const state = playingState();
    state.gamePhase = 'finished';
    state.winner = 'player2';
    state.winType = 'siege';
    const result = gameReducer(state, { type: 'reset' });
    expect(result.gamePhase).toBe('setup');
    expect(result.winner).toBeNull();
    expect(result.winType).toBeNull();
  });
});

// ── start-game ───────────────────────────────────────────────────────

describe('gameReducer - start-game', () => {
  it('sets gamePhase to playing and creates dice', () => {
    const state = createInitialGameState();
    const result = gameReducer(state, { type: 'start-game', openingRoll: [5, 3] });
    expect(result.gamePhase).toBe('playing');
    expect(result.dice).not.toBeNull();
    expect(result.dice!.values).toEqual([5, 3]);
    expect(result.turnPhase).toBe('moving');
  });

  it('higher roller goes first (player1 rolls higher)', () => {
    const state = createInitialGameState();
    const result = gameReducer(state, { type: 'start-game', openingRoll: [6, 2] });
    expect(result.currentPlayer).toBe('player1');
  });

  it('higher roller goes first (player2 rolls higher)', () => {
    const state = createInitialGameState();
    const result = gameReducer(state, { type: 'start-game', openingRoll: [2, 6] });
    expect(result.currentPlayer).toBe('player2');
  });

  it('no-op if gamePhase is not setup', () => {
    const state = playingState();
    const result = gameReducer(state, { type: 'start-game', openingRoll: [5, 3] });
    expect(result).toBe(state);
  });
});

// ── roll-dice ────────────────────────────────────────────────────────

describe('gameReducer - roll-dice', () => {
  it('creates dice and sets turnPhase to moving', () => {
    const state = playingState();
    const result = gameReducer(state, { type: 'roll-dice' });
    expect(result.dice).not.toBeNull();
    expect(result.turnPhase).toBe('moving');
    expect(result.dice!.values[0]).toBeGreaterThanOrEqual(1);
    expect(result.dice!.values[0]).toBeLessThanOrEqual(6);
  });

  it('no-op if turnPhase is not pre-roll', () => {
    const state = movingState(3, 5);
    const result = gameReducer(state, { type: 'roll-dice' });
    expect(result).toBe(state);
  });

  it('no-op if gamePhase is not playing', () => {
    const state = createInitialGameState();
    // gamePhase = 'setup', turnPhase = 'pre-roll'
    const result = gameReducer(state, { type: 'roll-dice' });
    expect(result).toBe(state);
  });
});

// ── roll-dice-deterministic ──────────────────────────────────────────

describe('gameReducer - roll-dice-deterministic', () => {
  it('uses provided values', () => {
    const state = playingState();
    const result = gameReducer(state, { type: 'roll-dice-deterministic', values: [4, 2] });
    expect(result.dice!.values).toEqual([4, 2]);
    expect(result.turnPhase).toBe('moving');
  });

  it('no-op if turnPhase is not pre-roll', () => {
    const state = movingState(3, 5);
    const result = gameReducer(state, { type: 'roll-dice-deterministic', values: [4, 2] });
    expect(result).toBe(state);
  });

  it('no-op if gamePhase is not playing', () => {
    const state = createInitialGameState();
    const result = gameReducer(state, { type: 'roll-dice-deterministic', values: [4, 2] });
    expect(result).toBe(state);
  });
});

// ── execute-move ─────────────────────────────────────────────────────

describe('gameReducer - execute-move', () => {
  it('executes a valid deploy move', () => {
    const state = movingState(3, 5);
    const move: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };
    const result = gameReducer(state, { type: 'execute-move', move });
    // Checker should be on canonical point 3
    expect(result.board[2]!.checkers).toHaveLength(1);
    expect(result.board[2]!.checkers[0]!.id).toBe('player1-0');
    // Reserve should have one fewer
    expect(result.reserves.player1).toHaveLength(14);
  });

  it('executes a valid advance move', () => {
    let state = movingState(3, 5);
    state = placeChecker(state, 5, 'player1', 'player1-0');
    const move: Move = {
      type: 'advance',
      checkerId: 'player1-0',
      from: { zone: 'board', point: 5 },
      to: { zone: 'board', point: 8 },
      dieValue: 3,
    };
    const result = gameReducer(state, { type: 'execute-move', move });
    expect(result.board[4]!.checkers).toHaveLength(0);
    expect(result.board[7]!.checkers).toHaveLength(1);
    expect(result.board[7]!.checkers[0]!.id).toBe('player1-0');
  });

  it('auto-ends turn when all dice used', () => {
    const state = movingState(3, 5);

    // First move: deploy using die value 3
    const move1: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };
    const after1 = gameReducer(state, { type: 'execute-move', move: move1 });
    // Should still be moving (one die left)
    expect(after1.turnPhase).toBe('moving');

    // Second move: deploy using die value 5
    const move2: Move = {
      type: 'deploy',
      checkerId: 'player1-1',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 5 },
      dieValue: 5,
    };
    const after2 = gameReducer(after1, { type: 'execute-move', move: move2 });
    // All dice used => auto end-turn => switches to player2, pre-roll
    expect(after2.currentPlayer).toBe('player2');
    expect(after2.turnPhase).toBe('pre-roll');
    expect(after2.dice).toBeNull();
  });

  it('no-op if turnPhase is not moving', () => {
    const state = playingState(); // turnPhase = 'pre-roll'
    const move: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };
    const result = gameReducer(state, { type: 'execute-move', move });
    expect(result).toBe(state);
  });

  it('no-op if dice is null', () => {
    const state = playingState();
    state.turnPhase = 'moving';
    // dice is still null
    const move: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };
    const result = gameReducer(state, { type: 'execute-move', move });
    expect(result).toBe(state);
  });
});

// ── end-turn ─────────────────────────────────────────────────────────

describe('gameReducer - end-turn', () => {
  it('switches player and resets turnPhase', () => {
    const state = movingState(3, 5);
    state.currentPlayer = 'player1';
    const result = gameReducer(state, { type: 'end-turn' });
    expect(result.currentPlayer).toBe('player2');
    expect(result.turnPhase).toBe('pre-roll');
  });

  it('clears dice', () => {
    const state = movingState(3, 5);
    const result = gameReducer(state, { type: 'end-turn' });
    expect(result.dice).toBeNull();
  });
});

// ── offer-double ─────────────────────────────────────────────────────

describe('gameReducer - offer-double', () => {
  it('sets cube.isOffered when valid', () => {
    const state = playingState();
    const result = gameReducer(state, { type: 'offer-double' });
    expect(result.doublingCube.isOffered).toBe(true);
  });

  it('no-op when canOfferDouble returns false (wrong phase)', () => {
    const state = movingState(3, 5); // turnPhase = 'moving'
    const result = gameReducer(state, { type: 'offer-double' });
    expect(result).toBe(state);
  });

  it('no-op when cube is owned by opponent', () => {
    const state = playingState();
    state.doublingCube.owner = 'player2';
    // player1 is current but player2 owns cube
    const result = gameReducer(state, { type: 'offer-double' });
    expect(result).toBe(state);
  });
});

// ── accept-double ────────────────────────────────────────────────────

describe('gameReducer - accept-double', () => {
  it('doubles cube value and transfers ownership', () => {
    const state = playingState();
    state.doublingCube.isOffered = true;
    const result = gameReducer(state, { type: 'accept-double' });
    expect(result.doublingCube.value).toBe(2);
    expect(result.doublingCube.owner).toBe('player2');
    expect(result.doublingCube.isOffered).toBe(false);
  });

  it('no-op if cube not offered', () => {
    const state = playingState();
    const result = gameReducer(state, { type: 'accept-double' });
    expect(result).toBe(state);
  });
});

// ── decline-double ───────────────────────────────────────────────────

describe('gameReducer - decline-double', () => {
  it('ends game with current player winning', () => {
    const state = playingState();
    state.doublingCube.isOffered = true;
    const result = gameReducer(state, { type: 'decline-double' });
    expect(result.gamePhase).toBe('finished');
    expect(result.winner).toBe('player1');
    expect(result.winType).toBe('standard');
  });

  it('no-op if cube not offered', () => {
    const state = playingState();
    const result = gameReducer(state, { type: 'decline-double' });
    expect(result).toBe(state);
  });
});

// ── Integration ──────────────────────────────────────────────────────

describe('gameReducer - integration', () => {
  it('full game turn: start-game -> execute-move -> execute-move -> end-turn', () => {
    // Start from initial setup state
    let state = createInitialGameState();

    // Start the game - player1 rolls higher
    state = gameReducer(state, { type: 'start-game', openingRoll: [5, 3] });
    expect(state.gamePhase).toBe('playing');
    expect(state.currentPlayer).toBe('player1');
    expect(state.turnPhase).toBe('moving');
    expect(state.dice!.values).toEqual([5, 3]);

    // Deploy a checker using die value 5
    const move1: Move = {
      type: 'deploy',
      checkerId: 'player1-0',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 5 },
      dieValue: 5,
    };
    state = gameReducer(state, { type: 'execute-move', move: move1 });
    expect(state.reserves.player1).toHaveLength(14);
    expect(state.board[4]!.checkers).toHaveLength(1);

    // Deploy another checker using die value 3
    const move2: Move = {
      type: 'deploy',
      checkerId: 'player1-1',
      from: { zone: 'reserve' },
      to: { zone: 'board', point: 3 },
      dieValue: 3,
    };
    state = gameReducer(state, { type: 'execute-move', move: move2 });

    // All dice used => auto end-turn
    expect(state.currentPlayer).toBe('player2');
    expect(state.turnPhase).toBe('pre-roll');
    expect(state.dice).toBeNull();
    expect(state.reserves.player1).toHaveLength(13);
  });

  it('state transitions are consistent across multiple turns', () => {
    let state = createInitialGameState();

    // Start game
    state = gameReducer(state, { type: 'start-game', openingRoll: [4, 2] });
    expect(state.currentPlayer).toBe('player1');

    // Player1 deploys two checkers (using both dice)
    state = gameReducer(state, {
      type: 'execute-move',
      move: {
        type: 'deploy',
        checkerId: 'player1-0',
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 4 },
        dieValue: 4,
      },
    });
    state = gameReducer(state, {
      type: 'execute-move',
      move: {
        type: 'deploy',
        checkerId: 'player1-1',
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 2 },
        dieValue: 2,
      },
    });

    // Auto end-turn should have happened
    expect(state.currentPlayer).toBe('player2');
    expect(state.turnPhase).toBe('pre-roll');

    // Player2 rolls
    state = gameReducer(state, { type: 'roll-dice-deterministic', values: [6, 1] });
    expect(state.currentPlayer).toBe('player2');
    expect(state.turnPhase).toBe('moving');
    expect(state.dice!.values).toEqual([6, 1]);

    // Player2 deploys using die 6 (perspective 6 = canonical 19)
    const p2Canonical6 = toCanonical(6, 'player2');
    state = gameReducer(state, {
      type: 'execute-move',
      move: {
        type: 'deploy',
        checkerId: 'player2-0',
        from: { zone: 'reserve' },
        to: { zone: 'board', point: p2Canonical6 },
        dieValue: 6,
      },
    });

    // One die still remaining
    expect(state.turnPhase).toBe('moving');

    // End turn manually (without using second die)
    state = gameReducer(state, { type: 'end-turn' });
    expect(state.currentPlayer).toBe('player1');
    expect(state.turnPhase).toBe('pre-roll');
    expect(state.dice).toBeNull();
  });
});
