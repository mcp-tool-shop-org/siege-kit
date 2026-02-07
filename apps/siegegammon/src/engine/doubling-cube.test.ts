import { describe, it, expect } from 'vitest';
import { createInitialGameState } from './game-state.js';
import { cloneState } from './move-executor.js';
import {
  canOfferDouble,
  offerDouble,
  acceptDouble,
  declineDouble,
} from './doubling-cube.js';

/**
 * Helper: returns a game state in 'playing' / 'pre-roll' phase
 * (the default initial state is 'setup', so we patch it).
 */
function playingState() {
  const state = createInitialGameState();
  state.gamePhase = 'playing';
  state.turnPhase = 'pre-roll';
  state.currentPlayer = 'player1';
  return state;
}

// ── canOfferDouble ─────────────────────────────────────────────────

describe('canOfferDouble', () => {
  it('returns true when cube is centered, pre-roll, and playing', () => {
    const state = playingState();
    expect(canOfferDouble(state, 'player1')).toBe(true);
  });

  it('returns false when turnPhase is not pre-roll', () => {
    const state = playingState();
    state.turnPhase = 'moving';
    expect(canOfferDouble(state, 'player1')).toBe(false);
  });

  it('returns false when cube is owned by opponent', () => {
    const state = playingState();
    state.doublingCube.owner = 'player2';
    // player1 is currentPlayer but player2 owns the cube
    expect(canOfferDouble(state, 'player1')).toBe(false);
  });

  it('returns true when cube is owned by current player', () => {
    const state = playingState();
    state.doublingCube.owner = 'player1';
    expect(canOfferDouble(state, 'player1')).toBe(true);
  });

  it('returns false when cube is already offered', () => {
    const state = playingState();
    state.doublingCube.isOffered = true;
    expect(canOfferDouble(state, 'player1')).toBe(false);
  });
});

// ── offerDouble ────────────────────────────────────────────────────

describe('offerDouble', () => {
  it('sets isOffered to true', () => {
    const state = playingState();
    const next = offerDouble(state);
    expect(next.doublingCube.isOffered).toBe(true);
  });

  it('does not mutate original state', () => {
    const state = playingState();
    offerDouble(state);
    expect(state.doublingCube.isOffered).toBe(false);
  });
});

// ── acceptDouble ───────────────────────────────────────────────────

describe('acceptDouble', () => {
  it('doubles cube value and transfers ownership to acceptor', () => {
    const state = playingState();
    state.doublingCube.isOffered = true;
    // player1 offered, so player2 (opponent) accepts
    const next = acceptDouble(state);
    expect(next.doublingCube.value).toBe(2);
    expect(next.doublingCube.owner).toBe('player2');
    expect(next.doublingCube.isOffered).toBe(false);
  });

  it('cube value progresses 1 -> 2 -> 4 -> 8', () => {
    let state = playingState();

    // First double: 1 -> 2, ownership to player2
    state.doublingCube.isOffered = true;
    state = acceptDouble(state);
    expect(state.doublingCube.value).toBe(2);
    expect(state.doublingCube.owner).toBe('player2');

    // Second double: player2 owns cube, player2 offers (switch current player)
    state.currentPlayer = 'player2';
    state.doublingCube.isOffered = true;
    state = acceptDouble(state);
    expect(state.doublingCube.value).toBe(4);
    expect(state.doublingCube.owner).toBe('player1');

    // Third double: player1 owns cube, player1 offers
    state.currentPlayer = 'player1';
    state.doublingCube.isOffered = true;
    state = acceptDouble(state);
    expect(state.doublingCube.value).toBe(8);
    expect(state.doublingCube.owner).toBe('player2');
  });

  it('does not mutate original state', () => {
    const state = playingState();
    state.doublingCube.isOffered = true;
    const original = cloneState(state);
    acceptDouble(state);
    expect(state.doublingCube.value).toBe(original.doublingCube.value);
    expect(state.doublingCube.owner).toBe(original.doublingCube.owner);
  });
});

// ── declineDouble ──────────────────────────────────────────────────

describe('declineDouble', () => {
  it('ends game with current player as winner', () => {
    const state = playingState();
    state.currentPlayer = 'player1';
    state.doublingCube.isOffered = true;

    const next = declineDouble(state);
    expect(next.gamePhase).toBe('finished');
    expect(next.winner).toBe('player1');
  });

  it('win type is always standard for declined doubles', () => {
    const state = playingState();
    state.doublingCube.isOffered = true;

    const next = declineDouble(state);
    expect(next.winType).toBe('standard');
  });

  it('clears the isOffered flag', () => {
    const state = playingState();
    state.doublingCube.isOffered = true;

    const next = declineDouble(state);
    expect(next.doublingCube.isOffered).toBe(false);
  });

  it('does not mutate original state', () => {
    const state = playingState();
    state.doublingCube.isOffered = true;
    declineDouble(state);
    expect(state.gamePhase).toBe('playing');
    expect(state.winner).toBeNull();
  });
});
