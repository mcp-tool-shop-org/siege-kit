import type { GameState, PlayerId } from '@mcp-tool-shop/siege-types';
import { opponent } from './board-utils.js';
import { cloneState } from './move-executor.js';

/**
 * Returns true if the given player is allowed to offer a double in the current state.
 *
 * Conditions:
 * - turnPhase must be 'pre-roll' (doubles happen before rolling)
 * - gamePhase must be 'playing'
 * - cube must not already be offered
 * - cube must be centered OR owned by the offering player
 */
export function canOfferDouble(state: GameState, player: PlayerId): boolean {
  if (state.turnPhase !== 'pre-roll') return false;
  if (state.gamePhase !== 'playing') return false;
  if (state.doublingCube.isOffered) return false;

  const { owner } = state.doublingCube;
  return owner === 'center' || owner === player;
}

/**
 * Offers a double. Sets cube.isOffered = true.
 * Caller is responsible for checking canOfferDouble first.
 * Returns a new immutable state.
 */
export function offerDouble(state: GameState): GameState {
  const next = cloneState(state);
  next.doublingCube.isOffered = true;
  return next;
}

/**
 * Accepts a double. Cube value doubles and ownership transfers to the acceptor.
 * The acceptor is opponent(currentPlayer) because the current player offered.
 * Returns a new immutable state.
 */
export function acceptDouble(state: GameState): GameState {
  const next = cloneState(state);
  next.doublingCube.value *= 2;
  next.doublingCube.owner = opponent(state.currentPlayer);
  next.doublingCube.isOffered = false;
  return next;
}

/**
 * Declines a double. Game ends immediately.
 * The decliner (opponent of currentPlayer) loses at the current (pre-double) stake.
 * Win type is always 'standard' for declined doubles.
 * Returns a new immutable state.
 */
export function declineDouble(state: GameState): GameState {
  const next = cloneState(state);
  next.gamePhase = 'finished';
  next.winner = state.currentPlayer;
  next.winType = 'standard';
  next.doublingCube.isOffered = false;
  return next;
}
