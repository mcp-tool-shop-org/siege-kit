import type { GameState } from '@mcp-tool-shop/siege-types';
import { opponent } from './board-utils.js';
import { rollDice, createDiceRoll } from './dice.js';
import { cloneState } from './move-executor.js';
import { checkWinCondition } from './win-checker.js';

/**
 * Starts the game from setup phase.
 * The higher opening roll goes first:
 *   - openingRoll[0] > openingRoll[1] => player1 goes first
 *   - openingRoll[1] > openingRoll[0] => player2 goes first
 * Creates dice from the opening roll values and sets turnPhase to 'moving'.
 * Returns a new immutable state.
 */
export function startGame(
  state: GameState,
  openingRoll: [number, number],
): GameState {
  const next = cloneState(state);
  next.gamePhase = 'playing';

  if (openingRoll[0] > openingRoll[1]) {
    next.currentPlayer = 'player1';
  } else {
    next.currentPlayer = 'player2';
  }

  next.dice = createDiceRoll(openingRoll[0], openingRoll[1]);
  next.turnPhase = 'moving';
  return next;
}

/**
 * Rolls dice randomly and transitions to 'moving' phase.
 * Returns a new immutable state.
 */
export function rollPhase(state: GameState): GameState {
  const next = cloneState(state);
  next.dice = rollDice();
  next.turnPhase = 'moving';
  return next;
}

/**
 * Rolls dice with specific values (deterministic, for testing).
 * Returns a new immutable state.
 */
export function rollPhaseDeterministic(
  state: GameState,
  values: [number, number],
): GameState {
  const next = cloneState(state);
  next.dice = createDiceRoll(values[0], values[1]);
  next.turnPhase = 'moving';
  return next;
}

/**
 * Ends the current turn.
 * Checks win condition first. If a winner is found, sets gamePhase to 'finished'.
 * Otherwise, switches the current player, resets turnPhase to 'pre-roll', and clears dice.
 * Returns a new immutable state.
 */
export function endTurn(state: GameState): GameState {
  const next = cloneState(state);

  const result = checkWinCondition(next);
  if (result !== null) {
    next.gamePhase = 'finished';
    next.winner = result.winner;
    next.winType = result.winType;
    return next;
  }

  next.currentPlayer = opponent(next.currentPlayer);
  next.turnPhase = 'pre-roll';
  next.dice = null;
  return next;
}

/**
 * Switches the current player without changing any other state.
 * Returns a new immutable state.
 */
export function switchPlayer(state: GameState): GameState {
  const next = cloneState(state);
  next.currentPlayer = opponent(next.currentPlayer);
  return next;
}
