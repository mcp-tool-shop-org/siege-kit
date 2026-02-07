import { useState, useCallback, useMemo } from 'react';
import type { Move } from '@mcp-tool-shop/siege-types';
import { useGameState } from '../hooks/useGameState.js';
import { classic } from '../themes/classic.js';
import { Board } from './board/Board.js';
import { GameControls } from './hud/GameControls.js';
import { GameStatus } from './hud/GameStatus.js';

const ROOT_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  background: '#1a1a1a',
};

export function SiegeGammon() {
  const { gameState, dispatch, legalMoves } = useGameState();
  const [selectedCheckerId, setSelectedCheckerId] = useState<string | null>(null);
  const theme = classic;

  const movesForSelected = useMemo(
    () =>
      selectedCheckerId
        ? legalMoves.filter((m) => m.checkerId === selectedCheckerId)
        : [],
    [legalMoves, selectedCheckerId],
  );

  const handleSelectChecker = useCallback((checkerId: string) => {
    setSelectedCheckerId(checkerId);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedCheckerId(null);
  }, []);

  const handleExecuteMove = useCallback(
    (move: Move) => {
      dispatch({ type: 'execute-move', move });
      setSelectedCheckerId(null);
    },
    [dispatch],
  );

  return (
    <div style={ROOT_STYLE}>
      <Board
        gameState={gameState}
        theme={theme}
        selectedCheckerId={selectedCheckerId}
        movesForSelected={movesForSelected}
        onSelectChecker={handleSelectChecker}
        onClearSelection={handleClearSelection}
        onExecuteMove={handleExecuteMove}
      />
      <GameControls gameState={gameState} dispatch={dispatch} />
      <GameStatus gameState={gameState} theme={theme} />
    </div>
  );
}
