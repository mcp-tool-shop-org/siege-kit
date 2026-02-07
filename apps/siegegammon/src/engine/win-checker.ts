import type { GameState, PlayerId, WinType } from '@mcp-tool-shop/siege-types';
import { opponent } from './board-utils.js';

export interface WinResult {
  winner: PlayerId;
  winType: WinType;
  score: number;
}

/**
 * Checks if either player has won.
 * A player wins when all 15 of their checkers are locked.
 *
 * Returns a WinResult if the game is over, null otherwise.
 */
export function checkWinCondition(state: GameState): WinResult | null {
  for (const player of ['player1', 'player2'] as const) {
    if (state.locked[player].length === 15) {
      const winType = determineWinType(state, player);
      const score = calculateScore(winType, state.doublingCube.value);
      return { winner: player, winType, score };
    }
  }

  return null;
}

/**
 * Determine the type of win based on the opponent's state.
 *
 * - standard: opponent has locked >= 1 checker
 * - siege: opponent has locked 0 checkers AND opponent has 0 reserves (all on board)
 * - total-siege: opponent has locked 0 checkers AND opponent has > 0 reserves
 */
export function determineWinType(state: GameState, winner: PlayerId): WinType {
  const opp = opponent(winner);
  const oppLocked = state.locked[opp].length;
  const oppReserves = state.reserves[opp].length;

  if (oppLocked > 0) {
    return 'standard';
  }

  if (oppReserves > 0) {
    return 'total-siege';
  }

  return 'siege';
}

/**
 * Calculate the final score for a win.
 *
 * - standard = 1 point
 * - siege = 2 points
 * - total-siege = 3 points
 *
 * Multiplied by the doubling cube value.
 */
export function calculateScore(winType: WinType, cubeValue: number): number {
  const basePoints: Record<WinType, number> = {
    'standard': 1,
    'siege': 2,
    'total-siege': 3,
  };

  return basePoints[winType] * cubeValue;
}
