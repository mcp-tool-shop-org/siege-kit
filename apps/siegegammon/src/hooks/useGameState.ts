import { useState, useCallback, useMemo } from 'react';
import type { GameState, Move } from '@mcp-tool-shop/siege-types';
import { createInitialGameState } from '../engine/game-state.js';
import { gameReducer, type GameAction } from '../engine/reducer.js';
import { generateAllLegalMoves } from '../engine/move-generator.js';

export { type GameAction } from '../engine/reducer.js';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);

  const dispatch = useCallback((action: GameAction) => {
    setGameState(prev => gameReducer(prev, action));
  }, []);

  const legalMoves = useMemo((): Move[] => {
    if (gameState.turnPhase !== 'moving' || !gameState.dice || gameState.gamePhase !== 'playing') {
      return [];
    }
    return generateAllLegalMoves(gameState, gameState.currentPlayer, gameState.dice);
  }, [gameState]);

  return { gameState, dispatch, legalMoves } as const;
}
