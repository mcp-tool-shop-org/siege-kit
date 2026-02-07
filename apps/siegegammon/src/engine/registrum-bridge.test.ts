import { describe, it, expect } from 'vitest';
import { StructuralRegistrar } from '@mcp-tool-shop/registrum';
import type { GameState } from '@mcp-tool-shop/siege-types';
import { createInitialGameState } from './game-state.js';
import { cloneState } from './move-executor.js';
import {
  toRegistrumStructure,
  toRegistrumState,
  toRegistrumTransition,
  createGameInvariants,
  createRegistrar,
} from './registrum-bridge.js';

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Returns a corrupted copy of the initial state with the specified
 * number of checkers removed from player1's reserves.
 */
function corruptCheckerCount(state: GameState, removeFromP1: number): GameState {
  const next = cloneState(state);
  next.reserves.player1.splice(0, removeFromP1);
  return next;
}

/**
 * Returns a copy of the state with an extra checker added to player2's reserves
 * (breaking per-player invariant while keeping total constant if combined with
 * removing one from player1).
 */
function swapCheckerOwnership(state: GameState): GameState {
  const next = cloneState(state);
  // Move one checker from player1 reserves to player2 reserves
  const stolen = next.reserves.player1.splice(0, 1)[0]!;
  stolen.owner = 'player2';
  next.reserves.player2.push(stolen);
  return next;
}

/**
 * Returns a copy of the state with the given locked counts for testing
 * monotonic invariant.
 */
function withLockedCheckers(
  state: GameState,
  p1Locked: number,
  p2Locked: number,
): GameState {
  const next = cloneState(state);

  // Move checkers from reserves to locked
  for (let i = 0; i < p1Locked; i++) {
    const checker = next.reserves.player1.splice(0, 1)[0]!;
    checker.isLocked = true;
    checker.position = { zone: 'locked' };
    next.locked.player1.push(checker);
  }
  for (let i = 0; i < p2Locked; i++) {
    const checker = next.reserves.player2.splice(0, 1)[0]!;
    checker.isLocked = true;
    checker.position = { zone: 'locked' };
    next.locked.player2.push(checker);
  }

  return next;
}

// ── toRegistrumStructure ────────────────────────────────────────────

describe('toRegistrumStructure', () => {
  it('extracts correct total checker count for initial state', () => {
    const gs = createInitialGameState();
    const structure = toRegistrumStructure(gs, 0);
    expect(structure.totalCheckers).toBe(30);
  });

  it('extracts correct per-player checker count for initial state', () => {
    const gs = createInitialGameState();
    const structure = toRegistrumStructure(gs, 0);
    expect(structure.player1Checkers).toBe(15);
    expect(structure.player2Checkers).toBe(15);
  });

  it('includes moveIndex from parameter', () => {
    const gs = createInitialGameState();
    const structure = toRegistrumStructure(gs, 42);
    expect(structure.moveIndex).toBe(42);
  });

  it('includes game phase and turn phase', () => {
    const gs = createInitialGameState();
    const structure = toRegistrumStructure(gs, 0);
    expect(structure.gamePhase).toBe('setup');
    expect(structure.turnPhase).toBe('pre-roll');
  });

  it('includes cube value', () => {
    const gs = createInitialGameState();
    const structure = toRegistrumStructure(gs, 0);
    expect(structure.cubeValue).toBe(1);
  });

  it('includes currentPlayer', () => {
    const gs = createInitialGameState();
    const structure = toRegistrumStructure(gs, 0);
    expect(structure.currentPlayer).toBe('player1');
  });
});

// ── toRegistrumState ────────────────────────────────────────────────

describe('toRegistrumState', () => {
  it('produces correct id from parameter', () => {
    const gs = createInitialGameState();
    const state = toRegistrumState(gs, 'game-0', 0);
    expect(state.id).toBe('game-0');
  });

  it('structure contains expected structural fields', () => {
    const gs = createInitialGameState();
    const state = toRegistrumState(gs, 'game-0', 0);
    expect(state.structure.totalCheckers).toBe(30);
    expect(state.structure.player1Checkers).toBe(15);
    expect(state.structure.player2Checkers).toBe(15);
    expect(state.structure.player1Locked).toBe(0);
    expect(state.structure.player2Locked).toBe(0);
    expect(state.structure.moveIndex).toBe(0);
  });

  it('data contains the full GameState', () => {
    const gs = createInitialGameState();
    const state = toRegistrumState(gs, 'game-0', 0);
    const data = state.data as GameState;
    expect(data.board).toHaveLength(24);
    expect(data.reserves.player1).toHaveLength(15);
    expect(data.reserves.player2).toHaveLength(15);
    expect(data.currentPlayer).toBe('player1');
  });

  it('totalCheckers is always 30 for initial state', () => {
    const gs = createInitialGameState();
    const state = toRegistrumState(gs, 'test-id', 0);
    expect(state.structure.totalCheckers).toBe(30);
  });

  it('per-player checker count is 15 for initial state', () => {
    const gs = createInitialGameState();
    const state = toRegistrumState(gs, 'test-id', 0);
    expect(state.structure.player1Checkers).toBe(15);
    expect(state.structure.player2Checkers).toBe(15);
  });
});

// ── toRegistrumTransition ───────────────────────────────────────────

describe('toRegistrumTransition', () => {
  it('root transition has from === null', () => {
    const gs = createInitialGameState();
    const transition = toRegistrumTransition(null, gs, 'game-0', 0);
    expect(transition.from).toBeNull();
    expect(transition.to.id).toBe('game-0');
  });

  it('non-root transition has valid from', () => {
    const gs = createInitialGameState();
    const transition = toRegistrumTransition('game-0', gs, 'game-0', 1, gs);
    expect(transition.from).toBe('game-0');
    expect(transition.to.id).toBe('game-0');
  });

  it('metadata includes prev locked counts when prevState is provided', () => {
    const prev = createInitialGameState();
    const next = withLockedCheckers(cloneState(prev), 2, 1);
    const transition = toRegistrumTransition('game-0', next, 'game-0', 1, prev);

    expect(transition.metadata).toBeDefined();
    expect(transition.metadata!.prevPlayer1Locked).toBe(0);
    expect(transition.metadata!.prevPlayer2Locked).toBe(0);
  });

  it('metadata includes prevGamePhase when prevState is provided', () => {
    const prev = createInitialGameState();
    const next = cloneState(prev);
    next.gamePhase = 'playing';
    const transition = toRegistrumTransition('game-0', next, 'game-0', 1, prev);

    expect(transition.metadata!.prevGamePhase).toBe('setup');
  });

  it('metadata is empty object when prevState is not provided', () => {
    const gs = createInitialGameState();
    const transition = toRegistrumTransition('game-0', gs, 'game-0', 1);
    expect(transition.metadata).toEqual({});
  });
});

// ── createGameInvariants ────────────────────────────────────────────

describe('createGameInvariants', () => {
  it('returns exactly 4 invariants', () => {
    const invariants = createGameInvariants();
    expect(invariants).toHaveLength(4);
  });

  it('game.checkers.conservation has correct properties', () => {
    const invariants = createGameInvariants();
    const inv = invariants.find((i) => i.id === 'game.checkers.conservation')!;
    expect(inv.scope).toBe('state');
    expect(inv.failureMode).toBe('halt');
    expect(inv.appliesTo).toContain('totalCheckers');
  });

  it('game.checkers.per_player has correct properties', () => {
    const invariants = createGameInvariants();
    const inv = invariants.find((i) => i.id === 'game.checkers.per_player')!;
    expect(inv.scope).toBe('state');
    expect(inv.failureMode).toBe('halt');
    expect(inv.appliesTo).toContain('player1Checkers');
    expect(inv.appliesTo).toContain('player2Checkers');
  });

  it('game.locked.monotonic has correct properties', () => {
    const invariants = createGameInvariants();
    const inv = invariants.find((i) => i.id === 'game.locked.monotonic')!;
    expect(inv.scope).toBe('transition');
    expect(inv.failureMode).toBe('reject');
    expect(inv.appliesTo).toContain('player1Locked');
    expect(inv.appliesTo).toContain('player2Locked');
  });

  it('game.phase.valid has correct properties', () => {
    const invariants = createGameInvariants();
    const inv = invariants.find((i) => i.id === 'game.phase.valid')!;
    expect(inv.scope).toBe('transition');
    expect(inv.failureMode).toBe('reject');
    expect(inv.appliesTo).toContain('gamePhase');
  });
});

// ── Integration with StructuralRegistrar ────────────────────────────

describe('StructuralRegistrar integration', () => {
  it('initial state registers successfully as root', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();
    const transition = toRegistrumTransition(null, gs, 'game-0', 0);
    // Mark as root for the lineage.explicit invariant
    (transition.to.structure as Record<string, unknown>).isRoot = true;

    const result = registrar.register(transition);
    expect(result.kind).toBe('accepted');
  });

  it('transition with preserved checker count registers successfully', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Register root state
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    const rootResult = registrar.register(rootTransition);
    expect(rootResult.kind).toBe('accepted');

    // Register subsequent state (same id, preserved checkers)
    const next = cloneState(gs);
    next.gamePhase = 'playing';
    const transition = toRegistrumTransition('game-0', next, 'game-0', 1, gs);

    const result = registrar.register(transition);
    expect(result.kind).toBe('accepted');
  });

  it('corrupted state (totalCheckers !== 30) is REJECTED with halt', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Register root
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    registrar.register(rootTransition);

    // Create corrupted state (remove 1 checker)
    const corrupted = corruptCheckerCount(gs, 1);
    const transition = toRegistrumTransition('game-0', corrupted, 'game-0', 1, gs);

    const result = registrar.register(transition);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      const violationIds = result.violations.map((v) => v.invariantId);
      expect(violationIds).toContain('game.checkers.conservation');
    }
  });

  it('corrupted state (per-player !== 15) is REJECTED with halt', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Register root
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    registrar.register(rootTransition);

    // Swap checker ownership (player1: 14, player2: 16, total still 30)
    const swapped = swapCheckerOwnership(gs);
    const transition = toRegistrumTransition('game-0', swapped, 'game-0', 1, gs);

    const result = registrar.register(transition);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      const violationIds = result.violations.map((v) => v.invariantId);
      expect(violationIds).toContain('game.checkers.per_player');
    }
  });

  it('locked count decrease is REJECTED (monotonic violation)', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Register root
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    registrar.register(rootTransition);

    // State with 3 locked checkers
    const prev = withLockedCheckers(cloneState(gs), 3, 0);
    const prevTransition = toRegistrumTransition('game-0', prev, 'game-0', 1, gs);
    registrar.register(prevTransition);

    // Now create a state where locked went DOWN (3 -> 1)
    // We need to build metadata manually to simulate the decrease
    const decreased = withLockedCheckers(cloneState(gs), 1, 0);
    const transition = toRegistrumTransition('game-0', decreased, 'game-0', 2, prev);

    const result = registrar.register(transition);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      const violationIds = result.violations.map((v) => v.invariantId);
      expect(violationIds).toContain('game.locked.monotonic');
    }
  });

  it('invalid phase transition (finished -> playing) is REJECTED', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Register root
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    registrar.register(rootTransition);

    // Move to playing
    const playing = cloneState(gs);
    playing.gamePhase = 'playing';
    const playingTransition = toRegistrumTransition('game-0', playing, 'game-0', 1, gs);
    registrar.register(playingTransition);

    // Move to finished
    const finished = cloneState(playing);
    finished.gamePhase = 'finished';
    const finishedTransition = toRegistrumTransition('game-0', finished, 'game-0', 2, playing);
    registrar.register(finishedTransition);

    // Attempt invalid: finished -> playing
    const backToPlaying = cloneState(finished);
    backToPlaying.gamePhase = 'playing';
    const transition = toRegistrumTransition('game-0', backToPlaying, 'game-0', 3, finished);

    const result = registrar.register(transition);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      const violationIds = result.violations.map((v) => v.invariantId);
      expect(violationIds).toContain('game.phase.valid');
    }
  });

  it('valid game progression: setup -> playing -> finished registers successfully', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Root: setup
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    const r1 = registrar.register(rootTransition);
    expect(r1.kind).toBe('accepted');

    // Transition: setup -> playing
    const playing = cloneState(gs);
    playing.gamePhase = 'playing';
    const t2 = toRegistrumTransition('game-0', playing, 'game-0', 1, gs);
    const r2 = registrar.register(t2);
    expect(r2.kind).toBe('accepted');

    // Transition: playing -> finished
    const finished = cloneState(playing);
    finished.gamePhase = 'finished';
    const t3 = toRegistrumTransition('game-0', finished, 'game-0', 2, playing);
    const r3 = registrar.register(t3);
    expect(r3.kind).toBe('accepted');
  });

  it('multiple transitions in sequence all register successfully', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Root
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    expect(registrar.register(rootTransition).kind).toBe('accepted');

    // Build a series of valid transitions
    let prev = gs;
    for (let i = 1; i <= 5; i++) {
      const next = cloneState(prev);
      if (i === 1) next.gamePhase = 'playing';
      next.currentPlayer = i % 2 === 0 ? 'player1' : 'player2';
      next.turnPhase = 'pre-roll';

      const t = toRegistrumTransition('game-0', next, 'game-0', i, prev);
      const result = registrar.register(t);
      expect(result.kind).toBe('accepted');
      prev = next;
    }
  });
});

// ── createRegistrar ─────────────────────────────────────────────────

describe('createRegistrar', () => {
  it('returns a StructuralRegistrar instance', () => {
    const registrar = createRegistrar();
    expect(registrar).toBeInstanceOf(StructuralRegistrar);
  });

  it('can register an initial state and subsequent transitions', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Initial root
    const rootTransition = toRegistrumTransition(null, gs, 'session-1', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    const r1 = registrar.register(rootTransition);
    expect(r1.kind).toBe('accepted');
    if (r1.kind === 'accepted') {
      expect(r1.stateId).toBe('session-1');
      expect(r1.orderIndex).toBe(0);
    }

    // Subsequent transition
    const next = cloneState(gs);
    next.gamePhase = 'playing';
    const t2 = toRegistrumTransition('session-1', next, 'session-1', 1, gs);
    const r2 = registrar.register(t2);
    expect(r2.kind).toBe('accepted');
    if (r2.kind === 'accepted') {
      expect(r2.stateId).toBe('session-1');
      expect(r2.orderIndex).toBe(1);
    }
  });

  it('lists both built-in and game-specific invariants', () => {
    const registrar = createRegistrar();
    const all = registrar.listInvariants();
    const gameIds = all.filter((d) => d.id.startsWith('game.'));
    expect(gameIds).toHaveLength(4);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────

describe('edge cases', () => {
  it('locked counts increasing is valid', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Root
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    registrar.register(rootTransition);

    // Lock some checkers (0 -> 2 for p1)
    const locked = withLockedCheckers(cloneState(gs), 2, 0);
    locked.gamePhase = 'playing';
    const t = toRegistrumTransition('game-0', locked, 'game-0', 1, gs);
    const result = registrar.register(t);
    expect(result.kind).toBe('accepted');
  });

  it('same phase (setup -> setup) is valid', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Root
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    registrar.register(rootTransition);

    // Same phase transition
    const next = cloneState(gs);
    const t = toRegistrumTransition('game-0', next, 'game-0', 1, gs);
    const result = registrar.register(t);
    expect(result.kind).toBe('accepted');
  });

  it('finished -> finished is valid', () => {
    const registrar = createRegistrar();
    const gs = createInitialGameState();

    // Root -> playing -> finished
    const rootTransition = toRegistrumTransition(null, gs, 'game-0', 0);
    (rootTransition.to.structure as Record<string, unknown>).isRoot = true;
    registrar.register(rootTransition);

    const playing = cloneState(gs);
    playing.gamePhase = 'playing';
    registrar.register(toRegistrumTransition('game-0', playing, 'game-0', 1, gs));

    const finished = cloneState(playing);
    finished.gamePhase = 'finished';
    registrar.register(toRegistrumTransition('game-0', finished, 'game-0', 2, playing));

    // finished -> finished
    const stillFinished = cloneState(finished);
    const t = toRegistrumTransition('game-0', stillFinished, 'game-0', 3, finished);
    const result = registrar.register(t);
    expect(result.kind).toBe('accepted');
  });
});
